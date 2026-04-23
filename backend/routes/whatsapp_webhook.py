"""
WhatsApp Webhook Handler for Meta Cloud API
Handles incoming WhatsApp messages and triggers AI workflow

Features:
- Meta webhook verification (plain text challenge response)
- Duplicate message dedup (in-memory cache)
- Bot loop prevention (ignore own messages)
- Per-phone rate limiting
- 24-hour session management
- Template fallback for expired sessions
- Error handling and logging
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from collections import OrderedDict
import time
import uuid
import os
import asyncio
import logging
from dotenv import load_dotenv

from middleware.auth import get_current_user
from services.whatsapp_agentic.orchestrator import AIOrchestrator
from services.whatsapp_agentic.meta_whatsapp_client import meta_whatsapp_client
from services.whatsapp_agentic.state_machine import ConversationStateMachine, ConversationState
from services.whatsapp_agentic.session_manager import session_manager

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp AI"])

# ============ Dedup & Rate Limit Caches ============

class TTLCache:
    """Simple in-memory TTL cache for dedup and rate limiting"""
    def __init__(self, max_size=10000, ttl_seconds=300):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _evict(self):
        now = time.time()
        keys_to_delete = [k for k, (_, ts) in self._cache.items() if now - ts > self._ttl]
        for k in keys_to_delete:
            del self._cache[k]
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    def has(self, key: str) -> bool:
        self._evict()
        if key in self._cache:
            _, ts = self._cache[key]
            if time.time() - ts <= self._ttl:
                return True
            del self._cache[key]
        return False

    def set(self, key: str, value: Any = True):
        self._evict()
        self._cache[key] = (value, time.time())

    def get_ts(self, key: str) -> float:
        if key in self._cache:
            _, ts = self._cache[key]
            return ts
        return 0.0


# Dedup cache: stores message IDs for 5 minutes
_message_dedup = TTLCache(max_size=10000, ttl_seconds=300)
# Rate limit cache: stores last processing time per phone
_rate_limit = TTLCache(max_size=5000, ttl_seconds=10)

# Our own phone number (to prevent bot loops)
OWN_PHONE_NUMBER_ID = os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", "")


def get_db(request: Request):
    """Get database from app state"""
    return request.app.state.db


# ============ Pydantic Models ============

class IncomingWebhookPayload(BaseModel):
    """Leonas webhook payload structure"""
    phone: Optional[str] = Field(None, alias="from")
    message_id: Optional[str] = Field(None, alias="id")
    text: Optional[Dict[str, str]] = None
    body: Optional[str] = None
    timestamp: Optional[str] = None
    type: Optional[str] = "text"
    
    class Config:
        populate_by_name = True


class ManualMessageRequest(BaseModel):
    """Request for sending manual message"""
    phone: str
    message: str
    lead_id: Optional[str] = None


class AgentTakeoverRequest(BaseModel):
    """Request for agent to take over conversation"""
    conversation_id: str
    agent_id: Optional[str] = None


# ============ Helper Functions ============

def normalize_phone(phone: str) -> str:
    """Normalize phone number"""
    phone = ''.join(filter(str.isdigit, str(phone)))
    if len(phone) == 10:
        phone = f"91{phone}"
    return phone


async def identify_tenant(db, payload: Dict) -> Optional[str]:
    """
    Identify tenant STRICTLY from WABA mapping.
    NEVER falls back to another tenant's data.
    Returns None if tenant cannot be identified → caller must handle safely.
    """
    waba_id = ""
    phone_number_id = ""
    display_phone = ""
    entries = payload.get("entry", [])
    if entries:
        waba_id = str(entries[0].get("id", ""))
        changes = entries[0].get("changes", [])
        if changes:
            metadata = changes[0].get("value", {}).get("metadata", {})
            phone_number_id = metadata.get("phone_number_id", "")
            display_phone = metadata.get("display_phone_number", "")

    to_number = payload.get("to", payload.get("waba_id", waba_id))

    # Step 1: Check explicit WABA → tenant mapping
    if to_number or phone_number_id:
        to_normalized = normalize_phone(str(to_number)) if to_number else ""
        mapping = await db.whatsapp_tenant_mapping.find_one(
            {"$or": [
                {"whatsapp_number": to_normalized},
                {"waba_id": str(to_number)},
                {"phone_number_id": phone_number_id}
            ]},
            {"_id": 0}
        )
        if mapping:
            logger.info(f"Tenant identified via WABA mapping: {mapping['tenant_id']}")
            return mapping["tenant_id"]

    # Step 2: Check if sender phone already has a conversation with a known tenant
    sender_phone = ""
    if entries:
        changes = entries[0].get("changes", [])
        if changes:
            messages = changes[0].get("value", {}).get("messages", [])
            if messages:
                sender_phone = normalize_phone(messages[0].get("from", ""))

    if sender_phone:
        existing_conv = await db.whatsapp_conversations.find_one(
            {"phone": sender_phone}, {"_id": 0, "tenant_id": 1}
        )
        if existing_conv and existing_conv.get("tenant_id"):
            logger.info(f"Tenant identified from existing conversation: {existing_conv['tenant_id']}")
            return existing_conv["tenant_id"]

    # Step 3: NO CROSS-TENANT FALLBACK. Log security event and return None.
    await db.security_logs.insert_one({
        "event": "tenant_identification_failed",
        "waba_id": waba_id,
        "phone_number_id": phone_number_id,
        "display_phone": display_phone,
        "sender_phone": sender_phone,
        "timestamp": datetime.now(timezone.utc),
        "severity": "warning",
    })
    logger.warning(
        f"TENANT NOT IDENTIFIED: waba={waba_id} phone_id={phone_number_id} "
        f"sender={sender_phone}. No WABA mapping configured. "
        f"Use POST /api/whatsapp/tenant-mapping to configure."
    )
    return None


async def find_or_create_lead(db, tenant_id: str, phone: str, message: str = "", contact_name: str = "") -> Dict:
    """Find existing lead or create new one with CRM tracking."""
    phone = normalize_phone(phone)
    
    lead = await db.leads.find_one(
        {
            "tenant_id": tenant_id,
            "$or": [
                {"buyer_phone": phone},
                {"buyer_phone": phone[-10:]},
                {"buyer_phone": f"+{phone}"},
                {"buyer_phone": f"+91{phone[-10:]}"}
            ]
        },
        {"_id": 0}
    )
    
    if lead:
        return lead
    
    new_lead = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "buyer_name": contact_name or "",
        "buyer_phone": phone,
        "source": "whatsapp",
        "status": "new",
        "crm_tracked": True,
        "lead_score": "cold",
        "lead_source": "organic",
        "first_message": message[:500] if message else "",
        "first_contact_at": datetime.now(timezone.utc),
        "last_message_at": datetime.now(timezone.utc),
        "message_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.leads.insert_one(new_lead)
    logger.info(f"New CRM lead created: {phone}")
    return new_lead


async def process_incoming_message(
    db,
    tenant_id: str,
    lead_id: str,
    phone: str,
    message: str,
    message_id: str
):
    """Background task to process incoming message with session management"""
    try:
        logger.info(f"🔄 Processing message from {phone}: '{message}' (tenant={tenant_id}, lead={lead_id})")
        
        # Initialize session manager with db
        session_manager.set_db(db)
        meta_whatsapp_client.set_session_manager(session_manager, db)
        
        # AUTO-FIX: If conversation is in human_handoff but no real agent assigned,
        # re-enable AI so customer gets a response
        existing_conv = await db.whatsapp_conversations.find_one(
            {"phone": phone, "tenant_id": tenant_id},
            {"_id": 0, "id": 1, "ai_enabled": 1, "state": 1, "human_agent_id": 1}
        )
        if existing_conv and not existing_conv.get("ai_enabled", True):
            # Check if a real human agent is actively handling this
            has_active_agent = existing_conv.get("human_agent_id")
            if not has_active_agent:
                # No real agent assigned - re-enable AI and RESET context
                logger.info(f"🔄 Auto-resetting human_handoff for {phone} (no agent assigned)")
                await db.whatsapp_conversations.update_one(
                    {"phone": phone, "tenant_id": tenant_id},
                    {"$set": {
                        "ai_enabled": True,
                        "state": "new_lead",
                        "context.questions_asked": 0,
                        "context.lead_captured": False,
                    }}
                )
        
        # UPDATE SESSION - Customer message opens/refreshes 24-hour window
        session_status = await session_manager.update_session(
            phone=phone,
            tenant_id=tenant_id,
            direction="inbound",
            message_id=message_id
        )
        logger.info(f"📥 Session updated for {phone}: {session_status}")
        
        # Process with AI Orchestrator
        orchestrator = AIOrchestrator(db)
        
        try:
            result = await orchestrator.process_message(
                tenant_id=tenant_id,
                lead_id=lead_id,
                phone=phone,
                message=message,
                message_id=message_id
            )
            logger.info(f"🤖 AI result: success={result.get('success')}, intent={result.get('intent')}, has_response={bool(result.get('response'))}")
        except Exception as ai_error:
            logger.error(f"❌ AI Orchestrator failed: {ai_error}")
            # Fallback: send a basic acknowledgment
            result = {
                "success": True,
                "response": "Thank you for your message! Our team will get back to you shortly.",
                "intent": "fallback",
                "action": "ai_error_fallback"
            }
        
        # Send response with session awareness + typing delay + message splitting
        if result.get("success") and result.get("response"):
            response_text = result["response"]
            logger.info(f"📤 Sending reply to {phone}: '{response_text[:100]}...'")

            # Import enhancer for message splitting
            from services.whatsapp_agentic.conversation_enhancer import split_long_message

            # Split long messages into multiple short ones
            message_parts = split_long_message(response_text, max_chars=500)

            for i, part in enumerate(message_parts):
                # Add typing delay between messages (1-2 seconds)
                if i > 0:
                    await asyncio.sleep(1.5)

                send_result = await meta_whatsapp_client.send_text_message(
                    phone=phone,
                    message=part,
                    tenant_id=tenant_id,
                    check_session=True,
                    fallback_to_template=(i == 0)  # Only first part falls back to template
                )

                if not send_result.get("success"):
                    logger.error(f"❌ Failed to send part {i+1}: {send_result.get('error')}")
                    break

            logger.info(f"✅ Sent {len(message_parts)} message(s) to {phone}")

            # Send quick reply buttons if available
            quick_replies = result.get("quick_replies")
            if quick_replies and isinstance(quick_replies, list) and len(quick_replies) > 0:
                await asyncio.sleep(0.5)
                try:
                    await meta_whatsapp_client.send_interactive_buttons(
                        phone=phone,
                        body_text="Choose an option or type your message:",
                        buttons=quick_replies[:3],
                    )
                    logger.info(f"📱 Quick reply buttons sent to {phone}")
                except Exception as btn_err:
                    logger.warning(f"Quick reply buttons failed: {btn_err}")
        
        if result.get("human_followup_required"):
            await notify_agent_for_followup(db, tenant_id, lead_id, result)
        
        # ── MemoraAI: Business Memory AI + Abrupt Sales Detection ──
        try:
            from services.memory_ai_service import BusinessMemoryAI
            memory_ai = BusinessMemoryAI(db)
            
            # Store interaction memory
            response_text = result.get("response", "")
            await memory_ai.extract_and_store_from_message(
                tenant_id=tenant_id,
                customer_phone=phone,
                message=message,
                ai_response=response_text,
            )
            
            # Detect abrupt sales intent
            alert = await memory_ai.detect_abrupt_sales(
                tenant_id=tenant_id,
                customer_phone=phone,
                message=message,
            )
            if alert:
                logger.info(f"🔥 MemoraAI: Sales alert created for {phone}: {alert.get('detected_intent')}")
        except Exception as mem_err:
            logger.warning(f"MemoraAI memory/alert error (non-blocking): {mem_err}")
        
        logger.info(f"Message processed: intent={result.get('intent')}, action={result.get('action')}")
        
    except Exception as e:
        logger.error(f"❌ Error processing message: {e}")
        import traceback
        traceback.print_exc()


async def notify_agent_for_followup(db, tenant_id: str, lead_id: str, result: Dict):
    """Notify marketing agent about high-priority conversation"""
    try:
        lead = await db.leads.find_one(
            {"tenant_id": tenant_id, "id": lead_id},
            {"_id": 0}
        )
        
        agent_id = lead.get("assigned_to") if lead else None
        
        if not agent_id:
            agent = await db.users.find_one(
                {"tenant_id": tenant_id, "role": {"$in": ["marketing_agent", "admin"]}},
                {"_id": 0, "id": 1}
            )
            agent_id = agent.get("id") if agent else None
        
        if agent_id:
            notification = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "user_id": agent_id,
                "type": "whatsapp_followup",
                "title": "WhatsApp Follow-up Required",
                "message": f"High-intent lead requires follow-up. Action: {result.get('action')}",
                "data": {
                    "lead_id": lead_id,
                    "conversation_id": result.get("conversation_id"),
                    "action": result.get("action")
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            await db.notifications.insert_one(notification)
            
    except Exception as e:
        print(f"Error notifying agent: {e}")


# ============ Webhook Endpoints ============

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Webhook endpoint for Meta WhatsApp Cloud API.
    
    - Returns 200 immediately (Meta requirement)
    - Deduplicates by message ID
    - Prevents bot loops (ignores own messages)
    - Rate limits per phone number
    - Processes messages in background
    """
    db = get_db(request)
    
    try:
        raw_payload = await request.json()
        logger.info(f"WhatsApp Webhook POST received: {raw_payload}")
        
        # Parse the Meta webhook payload format
        parsed = meta_whatsapp_client.parse_webhook_payload(raw_payload)
        
        if parsed.get("error"):
            # Still return 200 to Meta so it doesn't retry
            return {"status": "ok"}
        
        phone = parsed.get("phone", "")
        message_text = parsed.get("text", "")
        message_id = parsed.get("message_id", "")
        
        if not phone or not message_text:
            # Status updates, read receipts, etc. - acknowledge and ignore
            return {"status": "ok"}
        
        logger.info(f"Incoming message from {phone}: '{message_text}' (id={message_id})")
        
        # --- SEND READ RECEIPT (green ticks) ---
        if message_id:
            background_tasks.add_task(meta_whatsapp_client.mark_as_read, message_id)
        
        # --- DUPLICATE MESSAGE PROTECTION ---
        if message_id and _message_dedup.has(message_id):
            logger.info(f"Duplicate message ignored: {message_id}")
            return {"status": "ok"}
        if message_id:
            _message_dedup.set(message_id)
        
        # --- BOT LOOP PREVENTION ---
        # Ignore messages sent from our own WhatsApp numbers
        sender_phone = normalize_phone(phone)
        own_phones = set()
        # Add all known business phone numbers
        for env_key in ["META_WHATSAPP_OWN_PHONE", "META_WHATSAPP_OWN_PHONE_2"]:
            val = os.getenv(env_key, "")
            if val:
                own_phones.add(normalize_phone(val))
        # Known business numbers
        own_phones.add(normalize_phone("6309356590"))
        own_phones.add(normalize_phone("9390893060"))
        
        if sender_phone in own_phones:
            logger.info(f"Bot loop prevented: ignoring message from own number {sender_phone}")
            return {"status": "ok"}
        
        # --- RATE LIMITING (per phone, 5 second cooldown) ---
        rate_key = f"rate_{sender_phone}"
        last_ts = _rate_limit.get_ts(rate_key)
        if last_ts and (time.time() - last_ts) < 5:
            logger.info(f"Rate limited: {sender_phone} (too fast)")
            return {"status": "ok"}
        _rate_limit.set(rate_key)
        
        # --- PROCESS MESSAGE INLINE ---
        phone = sender_phone
        tenant_id = await identify_tenant(db, raw_payload)
        
        if not tenant_id:
            logger.warning(f"TENANT NOT IDENTIFIED for {phone}. Sending safe error. Configure WABA mapping.")
            # Send safe error message — never expose other tenant data
            try:
                await meta_whatsapp_client.send_text_message(
                    phone=phone,
                    message="Thank you for contacting us! Our team will get back to you shortly. Please call our office for immediate assistance.",
                    tenant_id="",
                    check_session=False,
                )
            except Exception:
                pass
            return {"status": "ok"}
        
        contact_name = parsed.get("contact_name", "")
        lead = await find_or_create_lead(db, tenant_id, phone, message_text, contact_name)
        lead_id = lead["id"]
        
        # --- CRM LEAD SCORING (rule-based, zero AI cost) ---
        from services.whatsapp_agentic.crm_lead_engine import CRMLeadEngine
        crm = CRMLeadEngine(db)
        crm_result = await crm.process_first_contact(
            tenant_id=tenant_id,
            phone=phone,
            message=message_text,
            contact_name=contact_name,
            existing_lead=lead,
        )
        logger.info(f"CRM score: {crm_result['intent']} | use_gemini: {crm_result['use_gemini']} | new: {crm_result['is_new_contact']}")
        
        # Process INLINE - not in background task (production background tasks fail silently)
        await process_incoming_message(db, tenant_id, lead_id, phone, message_text, message_id)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        # Always return 200 to Meta to prevent retries
        return {"status": "ok"}


@router.get("/webhook-health")
async def webhook_health():
    """Quick health check that confirms latest code is deployed"""
    from services.whatsapp_agentic.llm_router import llm_router
    stats = llm_router.get_stats()
    return {
        "status": "ok",
        "version": "v10_dual_llm",
        "deployed": True,
        "llm_engine": "gemini-2.5-flash-lite + gpt-4o-mini",
        "llm_stats": stats
    }


@router.post("/reset-conversation/{phone}")
async def public_reset_conversation(phone: str, request: Request):
    """
    PUBLIC: Reset conversation for a phone number - re-enables AI.
    No auth required for automation use.
    """
    db = get_db(request)
    phone = normalize_phone(phone)
    
    # Delete conversations
    del_conv = await db.whatsapp_conversations.delete_many({"phone": phone})
    # Delete messages
    del_msg = await db.whatsapp_messages.delete_many({"phone": phone})
    # Delete sessions
    del_sess = await db.whatsapp_sessions.delete_many({"phone": phone})
    
    return {
        "success": True,
        "phone": phone,
        "deleted": {
            "conversations": del_conv.deleted_count,
            "messages": del_msg.deleted_count,
            "sessions": del_sess.deleted_count
        }
    }



@router.get("/webhook")
async def whatsapp_webhook_verify(request: Request):
    """
    Webhook verification endpoint for Meta Cloud API.
    
    Meta sends: hub.mode, hub.verify_token, hub.challenge
    Must return ONLY the challenge as plain text with HTTP 200.
    Must return HTTP 403 if verification fails.
    """
    params = request.query_params
    
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    verify_token = os.getenv("META_WHATSAPP_VERIFY_TOKEN", os.getenv("WHATSAPP_VERIFY_TOKEN", ""))
    
    logger.info(f"Webhook verify: mode={mode}, token_match={token == verify_token}, challenge={challenge}")
    
    if mode == "subscribe" and token == verify_token:
        logger.info("Webhook verified successfully!")
        return PlainTextResponse(content=str(challenge), status_code=200)
    
    logger.warning(f"Webhook verification FAILED: mode={mode}, token={token}")
    return PlainTextResponse(content="Forbidden", status_code=403)


# ============ API Endpoints ============

@router.post("/send")
async def send_whatsapp_message(
    msg_request: ManualMessageRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Send manual WhatsApp message"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")
    
    result = await meta_whatsapp_client.send_text_message(
        phone=msg_request.phone,
        message=msg_request.message,
        tenant_id=tenant_id
    )
    
    if result.get("success"):
        conversation = await db.whatsapp_conversations.find_one(
            {"tenant_id": tenant_id, "phone": normalize_phone(msg_request.phone)},
            {"_id": 0}
        )
        
        if conversation:
            message_doc = {
                "id": str(uuid.uuid4()),
                "conversation_id": conversation["id"],
                "tenant_id": tenant_id,
                "lead_id": msg_request.lead_id,
                "role": "assistant",
                "content": msg_request.message,
                "sent_by": current_user.get("id"),
                "sent_by_name": current_user.get("name", "Agent"),
                "is_manual": True,
                "external_message_id": result.get("message_id"),
                "timestamp": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            await db.whatsapp_messages.insert_one(message_doc)
    
    return {
        "success": result.get("success", False),
        "message_id": result.get("message_id"),
        "error": result.get("error")
    }


@router.post("/agent-takeover")
async def agent_takeover(
    takeover_request: AgentTakeoverRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Agent takes over conversation from AI"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    agent_id = takeover_request.agent_id or current_user.get("id")
    
    state_machine = ConversationStateMachine(db)
    
    await state_machine.enable_human_handoff(
        conversation_id=takeover_request.conversation_id,
        agent_id=agent_id,
        reason="agent_takeover"
    )
    
    await db.whatsapp_messages.insert_one({
        "id": str(uuid.uuid4()),
        "conversation_id": takeover_request.conversation_id,
        "tenant_id": tenant_id,
        "role": "system",
        "content": f"Agent {current_user.get('name', 'Unknown')} took over the conversation",
        "timestamp": datetime.utcnow(),
        "created_at": datetime.utcnow()
    })
    
    return {"success": True, "message": "Agent takeover successful"}


@router.post("/resume-ai/{conversation_id}")
async def resume_ai_conversation(
    conversation_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Resume AI handling for a conversation"""
    db = get_db(request)
    
    state_machine = ConversationStateMachine(db)
    await state_machine.resume_ai(conversation_id)
    
    return {"success": True, "message": "AI resumed for conversation"}


@router.get("/conversations")
async def get_conversations(
    request: Request,
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    state: Optional[str] = None,
    ai_enabled: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get WhatsApp conversations for tenant"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    query = {"tenant_id": tenant_id}
    
    if status:
        query["status"] = status
    if state:
        query["state"] = state
    if ai_enabled is not None:
        query["ai_enabled"] = ai_enabled
    
    conversations = await db.whatsapp_conversations.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for conv in conversations:
        lead = await db.leads.find_one(
            {"tenant_id": tenant_id, "id": conv.get("lead_id")},
            {"_id": 0, "buyer_name": 1, "buyer_phone": 1, "status": 1}
        )
        conv["lead"] = lead
        
        last_msg = await db.whatsapp_messages.find_one(
            {"conversation_id": conv["id"]},
            {"_id": 0, "content": 1, "role": 1, "timestamp": 1},
            sort=[("timestamp", -1)]
        )
        conv["last_message"] = last_msg
    
    total = await db.whatsapp_conversations.count_documents(query)
    
    return {
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get full conversation with messages"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    orchestrator = AIOrchestrator(db)
    conversation = await orchestrator.get_conversation_for_dashboard(
        tenant_id=tenant_id,
        conversation_id=conversation_id
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.get("/conversations/lead/{lead_id}")
async def get_conversation_by_lead(
    lead_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get conversation by lead ID"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    orchestrator = AIOrchestrator(db)
    conversation = await orchestrator.get_conversation_for_dashboard(
        tenant_id=tenant_id,
        lead_id=lead_id
    )
    
    if not conversation:
        return {"conversation": None, "message": "No WhatsApp conversation found for this lead"}
    
    return conversation


@router.get("/stats")
async def get_whatsapp_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get WhatsApp AI statistics"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    total_conversations = await db.whatsapp_conversations.count_documents(
        {"tenant_id": tenant_id}
    )
    
    active_ai = await db.whatsapp_conversations.count_documents(
        {"tenant_id": tenant_id, "ai_enabled": True, "status": "active"}
    )
    
    human_handoff = await db.whatsapp_conversations.count_documents(
        {"tenant_id": tenant_id, "ai_enabled": False, "status": "active"}
    )
    
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$state", "count": {"$sum": 1}}}
    ]
    state_dist = await db.whatsapp_conversations.aggregate(pipeline).to_list(20)
    
    from datetime import timedelta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = await db.whatsapp_messages.count_documents(
        {"tenant_id": tenant_id, "timestamp": {"$gte": today_start}}
    )
    
    visits_via_wa = await db.site_visits.count_documents(
        {"tenant_id": tenant_id, "source": "whatsapp_ai"}
    )
    
    return {
        "total_conversations": total_conversations,
        "active_ai_conversations": active_ai,
        "human_handoff_conversations": human_handoff,
        "state_distribution": {item["_id"]: item["count"] for item in state_dist},
        "messages_today": messages_today,
        "site_visits_scheduled": visits_via_wa
    }


# ============ TEST/SIMULATOR ENDPOINTS ============

@router.post("/simulate")
async def simulate_whatsapp_message(
    request: Request,
    phone: str,
    message: str,
    current_user: dict = Depends(get_current_user)
):
    """
    SIMULATOR: Test AI workflow without real WhatsApp
    
    Use this to test all 7 AI agents:
    - Send: "Hi" → Greeting Agent
    - Send: "My budget is 50 lakhs" → Qualification Agent  
    - Send: "Show available plots" → Inventory Agent
    - Send: "I want to visit" → Site Visit Agent
    - Send: "I want to book" → Booking Agent
    - Send: "Payment options?" → Payment Agent
    - Send: "What amenities?" → Knowledge Agent
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")
    
    # Normalize phone
    phone = normalize_phone(phone)
    
    # Find or create lead
    lead = await find_or_create_lead(db, tenant_id, phone)
    lead_id = lead["id"]
    
    # Process message through AI orchestrator
    orchestrator = AIOrchestrator(db)
    
    result = await orchestrator.process_message(
        tenant_id=tenant_id,
        lead_id=lead_id,
        phone=phone,
        message=message,
        message_id=f"sim_{uuid.uuid4().hex[:8]}",
        source="simulator"  # Mark as simulator for testing
    )
    
    return {
        "success": result.get("success", False),
        "input_message": message,
        "ai_response": result.get("response"),
        "intent_detected": result.get("intent"),
        "conversation_state": result.get("next_state"),
        "conversation_id": result.get("conversation_id"),
        "action_taken": result.get("action"),
        "metadata": result.get("metadata", {}),
        "human_followup_required": result.get("human_followup_required", False)
    }


@router.get("/simulate/test-all-agents")
async def test_all_agents(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Test all 7 AI agents with sample messages
    Returns example responses from each agent
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")
    
    test_cases = [
        {"agent": "GreetingAgent", "message": "Hi, good morning!", "expected_intent": "greeting"},
        {"agent": "QualificationAgent", "message": "My budget is 50 lakhs, looking for plot in Hyderabad", "expected_intent": "qualification"},
        {"agent": "InventoryAgent", "message": "Show me available plots", "expected_intent": "availability_check"},
        {"agent": "KnowledgeAgent", "message": "What amenities are available in your project?", "expected_intent": "general_question"},
        {"agent": "SiteVisitAgent", "message": "I want to schedule a site visit tomorrow", "expected_intent": "site_visit_request"},
        {"agent": "BookingAgent", "message": "I want to book plot A12", "expected_intent": "booking_interest"},
        {"agent": "PaymentAgent", "message": "What are the payment options and EMI plans?", "expected_intent": "payment_question"},
    ]
    
    results = []
    orchestrator = AIOrchestrator(db)
    
    for i, test in enumerate(test_cases):
        # Create unique phone for each test
        test_phone_unique = f"919999{str(i).zfill(6)}"
        
        # Find or create lead
        lead = await find_or_create_lead(db, tenant_id, test_phone_unique)
        
        try:
            result = await orchestrator.process_message(
                tenant_id=tenant_id,
                lead_id=lead["id"],
                phone=test_phone_unique,
                message=test["message"],
                message_id=f"test_{i}"
            )
            
            results.append({
                "test_number": i + 1,
                "agent": test["agent"],
                "input_message": test["message"],
                "expected_intent": test["expected_intent"],
                "actual_intent": result.get("intent"),
                "ai_response": result.get("response", "")[:500],  # Truncate
                "conversation_state": result.get("next_state"),
                "success": result.get("success", False)
            })
        except Exception as e:
            results.append({
                "test_number": i + 1,
                "agent": test["agent"],
                "input_message": test["message"],
                "error": str(e),
                "success": False
            })
    
    return {
        "total_tests": len(test_cases),
        "results": results,
        "note": "Each test creates a new conversation to show fresh agent responses"
    }


@router.delete("/simulate/cleanup")
async def cleanup_test_conversations(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Cleanup test conversations (phone numbers starting with 919999)
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Delete test conversations
    conv_result = await db.whatsapp_conversations.delete_many({
        "tenant_id": tenant_id,
        "phone": {"$regex": "^919999"}
    })
    
    # Delete test messages
    msg_result = await db.whatsapp_messages.delete_many({
        "tenant_id": tenant_id,
        "external_message_id": {"$regex": "^(sim_|test_)"}
    })
    
    # Delete test leads
    lead_result = await db.leads.delete_many({
        "tenant_id": tenant_id,
        "buyer_phone": {"$regex": "^919999"},
        "source": "whatsapp"
    })
    
    return {
        "conversations_deleted": conv_result.deleted_count,
        "messages_deleted": msg_result.deleted_count,
        "leads_deleted": lead_result.deleted_count
    }


@router.post("/simulate/reset/{phone}")
async def reset_conversation_for_phone(
    phone: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Reset conversation for a specific phone number - re-enables AI
    Use this when conversation is stuck in human_handoff mode
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    phone = normalize_phone(phone)
    
    # Delete the conversation completely so a fresh one is created
    delete_result = await db.whatsapp_conversations.delete_many({
        "tenant_id": tenant_id,
        "phone": phone
    })
    
    # Also delete related messages for clean slate
    await db.whatsapp_messages.delete_many({
        "tenant_id": tenant_id,
        "phone": phone
    })
    
    return {
        "success": True,
        "message": f"Conversation reset for {phone}. {delete_result.deleted_count} conversation(s) deleted. Fresh AI conversation will start.",
        "deleted_count": delete_result.deleted_count
    }




@router.get("/agents-info")
async def get_agents_info():
    """
    Get information about all 7 AI agents
    """
    return {
        "agents": [
            {
                "name": "GreetingAgent",
                "purpose": "Welcome new users and detect language (Telugu/Hindi/English)",
                "triggers": ["hi", "hello", "good morning", "నమస్కారం", "नमस्ते"],
                "example_response": "Hello! Welcome to [Company]. I'm your property assistant. How may I help you today?"
            },
            {
                "name": "QualificationAgent", 
                "purpose": "Collect customer information: budget, property type, location, timeline",
                "triggers": ["budget", "lakhs", "crore", "looking for", "interested in"],
                "example_response": "That's great! What's your preferred location? And are you looking for a plot, flat, or villa?"
            },
            {
                "name": "InventoryAgent",
                "purpose": "Show real-time plot availability from database",
                "triggers": ["available", "show plots", "options", "what do you have"],
                "example_response": "We have 5 plots available:\n• Plot #A12: 267 sqft, East facing, ₹45L\n• Plot #B05: 320 sqft, North, ₹52L"
            },
            {
                "name": "KnowledgeAgent",
                "purpose": "Answer questions about projects, amenities, location using RAG",
                "triggers": ["amenities", "features", "location", "RERA", "about project"],
                "example_response": "Our Green Valley project offers: Club house, Swimming pool, 24/7 Security, Children's park. RERA: AP12345678"
            },
            {
                "name": "SiteVisitAgent",
                "purpose": "Schedule site visits and create calendar entries",
                "triggers": ["visit", "see property", "come there", "schedule", "appointment"],
                "example_response": "I'd be happy to schedule a visit! Available slots:\n• Tomorrow 10 AM\n• Saturday 3 PM\nWhich works for you?"
            },
            {
                "name": "BookingAgent",
                "purpose": "Handle booking interest and add to booking queue",
                "triggers": ["book", "reserve", "take", "finalize", "want this plot"],
                "example_response": "Excellent choice! To reserve Plot #A12, a token amount of ₹50,000 is required. Our sales team will contact you for the paperwork."
            },
            {
                "name": "PaymentAgent",
                "purpose": "Answer payment queries and generate payment links",
                "triggers": ["payment", "EMI", "installment", "pay", "token amount"],
                "example_response": "Payment options:\n• Full payment: 5% discount\n• 50-50: 50% now, 50% on registration\n• EMI: 12-24 months available"
            }
        ],
        "conversation_states": [
            "new_lead", "greeting", "qualification", "project_discussion",
            "site_visit_offer", "site_visit_scheduled", "post_visit_followup",
            "booking_discussion", "payment_pending", "booked", "human_handoff"
        ],
        "supported_languages": ["English", "Telugu", "Hindi"]
    }




# ============ DIRECT SEND ENDPOINTS (For Testing) ============

class DirectSendRequest(BaseModel):
    """Request for direct message sending"""
    phone: str
    message: str
    message_type: str = "text"  # text, template


@router.post("/send-direct")
async def send_direct_message(
    send_request: DirectSendRequest,
    request: Request
):
    """
    Send WhatsApp message directly (for testing)
    No authentication required - use with caution
    
    Example:
    POST /api/whatsapp/send-direct
    {
        "phone": "919948303060",
        "message": "Hello from MemoraAI!"
    }
    """
    try:
        if send_request.message_type == "template":
            # Send hello_world template
            result = await meta_whatsapp_client.send_template_message(
                phone=send_request.phone,
                template_name="hello_world",
                language="en_US"
            )
        else:
            # Send text message
            result = await meta_whatsapp_client.send_text_message(
                phone=send_request.phone,
                message=send_request.message
            )
        
        return {
            "success": result.get("success", False),
            "message_id": result.get("message_id"),
            "phone": send_request.phone,
            "message": send_request.message,
            "response": result.get("response"),
            "error": result.get("error")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/phone-info")
async def get_phone_info():
    """
    Get registered WhatsApp phone number info
    """
    result = await meta_whatsapp_client.get_phone_number_info()
    return result


@router.get("/templates")
async def get_available_templates():
    """
    Get all available message templates
    """
    result = await meta_whatsapp_client.get_templates()
    return result


@router.post("/send-template")
async def send_template_message(
    phone: str,
    template_name: str = "hello_world",
    language: str = "en_US"
):
    """
    Send a template message
    
    Available templates:
    - hello_world (en_US)
    - sample_issue_resolution (en_US) - requires name parameter
    - sample_shipping_confirmation (en_US) - requires days parameter
    """
    result = await meta_whatsapp_client.send_template_message(
        phone=phone,
        template_name=template_name,
        language=language
    )
    return {
        "success": result.get("success", False),
        "message_id": result.get("message_id"),
        "phone": phone,
        "template": template_name,
        "response": result.get("response"),
        "error": result.get("error")
    }



class TemplateSendRequest(BaseModel):
    """Request for sending template message"""
    phone: str
    template_name: str
    language: str = "en_US"
    params: Optional[List[str]] = None


@router.post("/send-template-live")
async def send_template_live(
    request_data: TemplateSendRequest,
    request: Request
):
    """
    Send WhatsApp template message in LIVE mode
    
    This sends REAL messages to actual WhatsApp numbers.
    
    Available templates:
    - hello_world (en_US) - No params
    - sample_issue_resolution (en_US) - params: [name]
    - sample_shipping_confirmation (en_US) - params: [days]
    - sample_purchase_feedback (en_US) - params: [product]
    - sample_happy_hour_announcement (en_US) - params: [venue, time]
    
    Example:
    POST /api/whatsapp/send-template-live
    {
        "phone": "919949376620",
        "template_name": "hello_world",
        "language": "en_US"
    }
    """
    # Normalize phone
    phone = ''.join(filter(str.isdigit, request_data.phone))
    if len(phone) == 10:
        phone = f"91{phone}"
    
    try:
        result = await meta_whatsapp_client.send_template_message(
            phone=phone,
            template_name=request_data.template_name,
            template_params=request_data.params,
            language=request_data.language
        )
        
        return {
            "success": result.get("success", False),
            "message_id": result.get("message_id"),
            "phone": phone,
            "template": request_data.template_name,
            "mode": "LIVE",
            "response": result.get("response"),
            "error": result.get("error") if not result.get("success") else None
        }
    except Exception as e:
        return {
            "success": False,
            "phone": phone,
            "template": request_data.template_name,
            "error": str(e)
        }


@router.get("/status")
async def get_whatsapp_status():
    """
    Get WhatsApp integration status
    """
    import os
    mode = os.getenv("META_WHATSAPP_MODE", "TEST")
    
    phone_info = await meta_whatsapp_client.get_phone_number_info()
    
    return {
        "mode": mode,
        "phone_number_id": os.getenv("META_WHATSAPP_PHONE_NUMBER_ID"),
        "waba_id": os.getenv("META_WHATSAPP_WABA_ID"),
        "phone_info": phone_info.get("phone_info", {}),
        "is_connected": phone_info.get("success", False)
    }



@router.get("/session/{tenant_id}/{phone}")
async def get_session_status(
    tenant_id: str,
    phone: str,
    request: Request
):
    """
    Get WhatsApp session status for a phone number
    
    Returns:
    - status: active | expired | warning | no_session
    - can_send_free_message: bool
    - must_use_template: bool
    - hours_remaining: float
    - session_expires_at: datetime
    """
    db = get_db(request)
    session_manager.set_db(db)
    
    status = await session_manager.check_session(phone, tenant_id)
    return status


@router.post("/session/reopen")
async def reopen_session(
    phone: str,
    tenant_id: str,
    request: Request
):
    """
    Send template message to reopen expired session
    
    Use this when session has expired and you need to re-engage customer
    """
    db = get_db(request)
    session_manager.set_db(db)
    meta_whatsapp_client.set_session_manager(session_manager, db)
    
    # Check current session status
    status = await session_manager.check_session(phone, tenant_id)
    
    if status.get("can_send_free_message"):
        return {
            "success": True,
            "message": "Session is already active",
            "session_status": status
        }
    
    # Send template to reopen session
    result = await meta_whatsapp_client.send_template_message(
        phone=phone,
        template_name="hello_world",
        language="en_US"
    )
    
    if result.get("success"):
        await session_manager.mark_re_engaged(phone, tenant_id)
        return {
            "success": True,
            "message": "Template sent to reopen session",
            "message_id": result.get("message_id"),
            "note": "Session will reopen when customer replies"
        }
    
    return {
        "success": False,
        "error": result.get("error"),
        "message": "Failed to send reopen template"
    }


@router.get("/sessions/expired")
async def get_expired_sessions(
    request: Request,
    tenant_id: Optional[str] = None,
    limit: int = 50
):
    """
    Get list of expired sessions that need re-engagement
    """
    db = get_db(request)
    session_manager.set_db(db)
    
    sessions = await session_manager.get_expired_sessions(tenant_id, limit)
    
    return {
        "count": len(sessions),
        "sessions": sessions
    }


# ============ APPROVED TEMPLATE ENDPOINTS ============

class FollowUpRequest(BaseModel):
    """Request for sending follow-up template"""
    phone: str
    customer_name: str
    agent_name: str
    city: str = "Vijayawada"
    area: str


class LeadIntroRequest(BaseModel):
    """Request for sending lead introduction template"""
    phone: str
    customer_name: str
    agent_name: str
    city: str = "Vijayawada"
    area: str


@router.post("/send-followup")
async def send_followup_template(req: FollowUpRequest):
    """
    Send follow_up_template (4 params: name, agent, city, area)
    
    Body preview:
    Hi {{1}}! This is {{2}} from {{3}}.
    Just checking if you're still interested in properties at {{4}}.
    Reply to continue our conversation.
    """
    result = await meta_whatsapp_client.send_follow_up(
        phone=req.phone,
        customer_name=req.customer_name,
        agent_name=req.agent_name,
        city=req.city,
        area=req.area
    )
    return {
        "success": result.get("success", False),
        "template": "follow_up_template",
        "phone": req.phone,
        "params": {"name": req.customer_name, "agent": req.agent_name, "city": req.city, "area": req.area},
        "message_id": result.get("message_id"),
        "error": result.get("error")
    }


@router.post("/send-introduction")
async def send_introduction_template(req: LeadIntroRequest):
    """
    Send leadintroductiontemplate (4 params: name, agent, city, area)
    
    Body preview:
    Hi {{1}}! I'm {{2}} from {{3}}.
    We have exciting property options in {{4}} area that match your requirements.
    Would you like to know more? Reply YES to continue.
    """
    result = await meta_whatsapp_client.send_lead_introduction(
        phone=req.phone,
        customer_name=req.customer_name,
        agent_name=req.agent_name,
        city=req.city,
        area=req.area
    )
    return {
        "success": result.get("success", False),
        "template": "leadintroductiontemplate",
        "phone": req.phone,
        "params": {"name": req.customer_name, "agent": req.agent_name, "city": req.city, "area": req.area},
        "message_id": result.get("message_id"),
        "error": result.get("error")
    }


@router.get("/approved-templates")
async def get_approved_templates():
    """
    Get list of approved templates with their params
    """
    return {
        "templates": [
            {
                "name": "follow_up_template",
                "category": "Marketing",
                "language": "en",
                "params": {
                    "1": "Customer name",
                    "2": "Agent name",
                    "3": "City",
                    "4": "Area/Project"
                },
                "endpoint": "POST /api/whatsapp/send-followup",
                "body_preview": "Hi {{1}}! This is {{2}} from {{3}}. Just checking if you're still interested in properties at {{4}}. Reply to continue our conversation."
            },
            {
                "name": "leadintroductiontemplate",
                "category": "Marketing",
                "language": "en",
                "params": {
                    "1": "Customer name",
                    "2": "Agent name",
                    "3": "City",
                    "4": "Area/Project"
                },
                "endpoint": "POST /api/whatsapp/send-introduction",
                "body_preview": "Hi {{1}}! I'm {{2}} from {{3}}. We have exciting property options in {{4}} area that match your requirements. Would you like to know more? Reply YES to continue."
            },
            {
                "name": "otp_1",
                "category": "Authentication",
                "language": "en",
                "params": {
                    "1": "OTP code"
                },
                "body_preview": "*{{1}}* is your verification code."
            }
        ],
        "sender": "+91 63093 56590",
        "phone_number_id": "963130426884425"
    }



# ============ TENANT MAPPING MANAGEMENT ============

class TenantMappingRequest(BaseModel):
    """Request for configuring WhatsApp tenant mapping"""
    tenant_id: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    whatsapp_number: Optional[str] = None


@router.get("/tenant-mapping")
async def get_tenant_mapping(request: Request):
    """
    Get current WhatsApp → Tenant mappings.
    Shows which tenant handles incoming WhatsApp messages.
    """
    db = get_db(request)
    mappings = await db.whatsapp_tenant_mapping.find(
        {}, {"_id": 0}
    ).to_list(20)

    # Also show all tenants with their data counts for reference
    tenants = await db.tenants.find(
        {"is_active": {"$ne": False}}, {"_id": 0, "id": 1, "name": 1, "company_name": 1}
    ).to_list(50)

    tenant_stats = []
    for t in tenants:
        tid = t["id"]
        proj_count = await db.projects.count_documents({"tenant_id": tid, "deleted_at": None})
        prop_count = await db.properties.count_documents({"tenant_id": tid, "deleted_at": None})
        tenant_stats.append({
            "tenant_id": tid,
            "name": t.get("name", ""),
            "company": t.get("company_name", ""),
            "projects": proj_count,
            "properties": prop_count
        })

    return {
        "mappings": mappings,
        "tenants": sorted(tenant_stats, key=lambda x: x["projects"], reverse=True),
        "configured_waba": os.getenv("META_WHATSAPP_WABA_ID", ""),
        "configured_phone_id": os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", "")
    }


@router.post("/tenant-mapping")
async def set_tenant_mapping(
    mapping: TenantMappingRequest,
    request: Request
):
    """
    Set WhatsApp → Tenant mapping.
    Maps a WABA ID or phone number to a specific tenant.
    """
    db = get_db(request)

    # Verify tenant exists
    tenant = await db.tenants.find_one({"id": mapping.tenant_id}, {"_id": 0, "id": 1, "name": 1})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Use configured values if not provided
    waba_id = mapping.waba_id or os.getenv("META_WHATSAPP_WABA_ID", "")
    phone_id = mapping.phone_number_id or os.getenv("META_WHATSAPP_PHONE_NUMBER_ID", "")
    wa_number = mapping.whatsapp_number or ""

    await db.whatsapp_tenant_mapping.update_one(
        {"waba_id": waba_id},
        {"$set": {
            "tenant_id": mapping.tenant_id,
            "waba_id": waba_id,
            "phone_number_id": phone_id,
            "whatsapp_number": wa_number,
            "auto_mapped": False,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )

    return {
        "success": True,
        "message": f"Mapped WABA {waba_id} → tenant {mapping.tenant_id} ({tenant.get('name', '')})",
        "mapping": {
            "tenant_id": mapping.tenant_id,
            "waba_id": waba_id,
            "phone_number_id": phone_id
        }
    }



# ============ AUTO FOLLOW-UP ENDPOINTS ============

@router.post("/followup/run")
async def run_auto_followup(
    request: Request,
    tenant_id: Optional[str] = None,
    min_delay_hours: float = 2.0,
    dry_run: bool = False,
):
    """
    Run auto follow-up batch.

    - Finds leads who showed interest but didn't reply
    - Generates personalized follow-up via Gemini
    - Sends as free-form message within 24h window
    - dry_run=true: generates messages without sending

    Query params:
        tenant_id: Optional filter by tenant
        min_delay_hours: Minimum hours since last bot response (default 2)
        dry_run: If true, generate but don't send (default false)
    """
    db = get_db(request)
    from services.whatsapp_agentic.auto_followup import AutoFollowupService

    service = AutoFollowupService(db)
    result = await service.run_batch(
        meta_client=meta_whatsapp_client,
        tenant_id=tenant_id,
        min_delay_hours=min_delay_hours,
        dry_run=dry_run,
    )
    return result


@router.get("/followup/pending")
async def get_pending_followups(
    request: Request,
    tenant_id: Optional[str] = None,
    min_delay_hours: float = 2.0,
):
    """
    Preview which leads are eligible for auto follow-up.
    Does NOT send anything — just shows who would receive a message.
    """
    db = get_db(request)
    from services.whatsapp_agentic.auto_followup import AutoFollowupService

    service = AutoFollowupService(db)
    pending = await service.find_pending_followups(
        tenant_id=tenant_id,
        min_delay_hours=min_delay_hours,
    )

    items = []
    for p in pending:
        conv = p["conversation"]
        items.append({
            "phone": p["phone"],
            "tenant_id": p["tenant_id"],
            "state": conv.get("state"),
            "last_updated": conv.get("updated_at"),
            "context_location": conv.get("context", {}).get("location"),
            "context_project": conv.get("context", {}).get("matched_project_name"),
            "lead_id": conv.get("lead_id"),
        })

    return {"total": len(items), "pending": items}


@router.get("/followup/history")
async def get_followup_history(
    request: Request,
    tenant_id: Optional[str] = None,
    limit: int = 50,
):
    """Get history of sent auto follow-ups."""
    db = get_db(request)
    query = {}
    if tenant_id:
        query["tenant_id"] = tenant_id

    followups = await db.whatsapp_followups.find(
        query, {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)

    return {
        "total": len(followups),
        "followups": followups,
    }


@router.post("/followup/send-one")
async def send_single_followup(
    request: Request,
    phone: str,
    tenant_id: Optional[str] = None,
):
    """
    Manually trigger a follow-up for a specific phone number.
    Useful for testing or manual intervention.
    """
    db = get_db(request)
    from services.whatsapp_agentic.auto_followup import AutoFollowupService

    phone_normalized = normalize_phone(phone)

    # Find the conversation
    query = {"phone": phone_normalized}
    if tenant_id:
        query["tenant_id"] = tenant_id

    conv = await db.whatsapp_conversations.find_one(query, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="No conversation found for this phone")

    tid = conv.get("tenant_id", tenant_id or "")
    service = AutoFollowupService(db)

    # Generate message
    message = await service.generate_followup_message(conv, tid, phone_normalized)

    # Send
    send_result = await meta_whatsapp_client.send_text_message(
        phone=phone_normalized,
        message=message,
        tenant_id=tid,
        check_session=True,
        fallback_to_template=False,
    )

    # Record
    await db.whatsapp_followups.insert_one({
        "conversation_id": conv.get("id"),
        "tenant_id": tid,
        "phone": phone_normalized,
        "lead_id": conv.get("lead_id"),
        "message": message,
        "sent_at": datetime.now(timezone.utc),
        "success": send_result.get("success", False),
        "message_id": send_result.get("message_id"),
        "manual": True,
    })

    return {
        "success": send_result.get("success", False),
        "phone": phone_normalized,
        "message": message,
        "message_id": send_result.get("message_id"),
        "error": send_result.get("error"),
    }



# ============ CRM DASHBOARD & MANAGEMENT ============

@router.get("/crm/dashboard")
async def crm_dashboard(
    request: Request,
    current_user: dict = Depends(get_current_user),
    date: Optional[str] = None,
):
    """
    CRM Dashboard — daily metrics for leads, conversions, and pipeline.

    Returns:
    - new_leads, send_click_contacts, warm/hot counts
    - calls_needed, site_visits, total CRM leads
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")

    from services.whatsapp_agentic.crm_lead_engine import CRMLeadEngine
    crm = CRMLeadEngine(db)
    metrics = await crm.get_dashboard_metrics(tenant_id, date)
    return metrics


@router.get("/crm/leads")
async def get_crm_leads(
    request: Request,
    current_user: dict = Depends(get_current_user),
    score: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
):
    """
    Get CRM-tracked leads with filters.

    Query params:
        score: cold / warm / hot
        status: new / warm / hot / booked
        limit, skip: pagination
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")

    query = {"tenant_id": tenant_id, "crm_tracked": True}
    if score:
        query["lead_score"] = score
    if status:
        query["status"] = status

    leads = await db.leads.find(
        query, {"_id": 0}
    ).sort("last_message_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.leads.count_documents(query)

    return {"total": total, "leads": leads, "limit": limit, "skip": skip}


@router.post("/crm/archive-stale")
async def archive_stale(
    request: Request,
    current_user: dict = Depends(get_current_user),
    days: int = 30,
):
    """Archive conversations with no activity for N days."""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Tenant not identified")

    from services.whatsapp_agentic.crm_lead_engine import CRMLeadEngine
    crm = CRMLeadEngine(db)
    archived = await crm.archive_stale_conversations(tenant_id, days)
    return {"archived": archived, "days_threshold": days}



# ============ CRM LEAD MANAGEMENT ============

class LeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    lead_score: Optional[str] = None
    assigned_to: Optional[str] = None
    next_action: Optional[str] = None
    notes: Optional[str] = None


@router.put("/crm/leads/{lead_id}")
async def update_crm_lead(
    lead_id: str,
    request: Request,
    updates: LeadUpdateRequest = None,
    current_user: dict = Depends(get_current_user),
):
    """Update a CRM lead — assign agent, change status, add notes, set next action."""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")

    # Parse body manually if Pydantic binding failed
    if updates is None:
        try:
            body = await request.json()
            updates = LeadUpdateRequest(**body)
        except Exception:
            updates = LeadUpdateRequest()

    set_fields = {"updated_at": datetime.utcnow()}
    if updates.status:
        set_fields["status"] = updates.status
    if updates.lead_score:
        set_fields["lead_score"] = updates.lead_score
    if updates.assigned_to:
        set_fields["assigned_to"] = updates.assigned_to
    if updates.next_action:
        set_fields["next_action"] = updates.next_action
    if updates.notes is not None:
        set_fields["last_notes"] = updates.notes

    result = await db.leads.update_one(
        {"tenant_id": tenant_id, "id": lead_id},
        {"$set": set_fields}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {"success": True, "updated_fields": list(set_fields.keys())}


@router.post("/crm/leads/{lead_id}/followed-up")
async def mark_followed_up(
    lead_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Mark a lead as followed up."""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")

    await db.leads.update_one(
        {"tenant_id": tenant_id, "id": lead_id},
        {"$set": {
            "last_followed_up_at": datetime.utcnow(),
            "followed_up_by": current_user.get("id"),
            "next_action": "awaiting_response",
            "updated_at": datetime.utcnow(),
        }}
    )
    return {"success": True}


@router.post("/crm/leads/{lead_id}/schedule-visit")
async def schedule_visit_from_crm(
    lead_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    preferred_time: str = "To be confirmed",
):
    """Schedule a site visit for a CRM lead."""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")

    lead = await db.leads.find_one(
        {"tenant_id": tenant_id, "id": lead_id}, {"_id": 0}
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    visit = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "lead_id": lead_id,
        "phone": lead.get("buyer_phone", ""),
        "location": lead.get("preferred_location", ""),
        "preferred_time": preferred_time,
        "status": "scheduled",
        "source": "crm_dashboard",
        "scheduled_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.site_visits.insert_one(visit)

    await db.leads.update_one(
        {"tenant_id": tenant_id, "id": lead_id},
        {"$set": {"status": "hot", "next_action": "site_visit_scheduled", "updated_at": datetime.utcnow()}}
    )

    return {"success": True, "visit_id": visit["id"]}


@router.get("/crm/agents")
async def get_agents_list(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Get list of agents who can be assigned leads."""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")

    agents = await db.users.find(
        {"tenant_id": tenant_id, "role": {"$in": ["marketing_agent", "admin", "tenant_admin", "sales_agent"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "role": 1}
    ).to_list(50)

    return {"agents": agents}



# ============ SECURITY LOGS ============

@router.get("/security/logs")
async def get_security_logs(
    request: Request,
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
):
    """View security audit logs (admin only)."""
    db = get_db(request)
    if current_user.get("role") not in ["admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    logs = await db.security_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    return {"total": len(logs), "logs": logs}
