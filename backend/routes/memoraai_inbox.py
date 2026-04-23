"""MemoraAI Team Inbox + Human Handover API"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/inbox", tags=["memoraai-inbox"])

def get_db(request: Request):
    return request.app.state.db


@router.get("/conversations")
async def list_conversations(request: Request, status: str = None, assigned_to: str = None):
    """List all WhatsApp conversations for the tenant (Team Inbox)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to

    convos = await db.whatsapp_conversations.find(
        query, {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)

    # Enrich with last message and customer memory count
    for c in convos:
        phone = c.get("phone", "")
        last_msg = await db.whatsapp_messages.find_one(
            {"conversation_id": c.get("id"), "tenant_id": tenant_id},
            {"_id": 0}
        , sort=[("timestamp", -1)])
        c["last_message"] = last_msg.get("content", "") if last_msg else ""
        c["last_message_from"] = last_msg.get("direction", "") if last_msg else ""
        mem_count = await db.business_memories.count_documents({"tenant_id": tenant_id, "customer_phone": phone})
        c["memory_count"] = mem_count

    return {"conversations": convos, "count": len(convos)}


@router.get("/conversations/{convo_id}/messages")
async def get_conversation_messages(convo_id: str, request: Request):
    """Get all messages in a conversation"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    convo = await db.whatsapp_conversations.find_one(
        {"id": convo_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await db.whatsapp_messages.find(
        {"conversation_id": convo_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(500)

    # Get customer memory
    phone = convo.get("phone", "")
    from services.memory_ai_service import BusinessMemoryAI
    memory_ai = BusinessMemoryAI(db)
    memories = await memory_ai.recall_memories(tenant_id, phone, limit=10)
    context = await memory_ai.build_customer_context(tenant_id, phone)

    return {
        "conversation": convo,
        "messages": messages,
        "customer_memory": {"memories": memories, "context": context, "count": len(memories)},
    }


@router.post("/conversations/{convo_id}/handover")
async def human_handover(convo_id: str, request: Request):
    """Take over conversation from AI (Human Handover)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}

    result = await db.whatsapp_conversations.update_one(
        {"id": convo_id, "tenant_id": tenant_id},
        {"$set": {
            "mode": "human",
            "assigned_to": body.get("staff_id") or user.get("user_id"),
            "assigned_name": body.get("staff_name") or user.get("name", "Staff"),
            "handover_at": datetime.now(timezone.utc).isoformat(),
            "handover_reason": body.get("reason", "Manual takeover"),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Log handover event
    await db.whatsapp_messages.insert_one({
        "id": str(uuid.uuid4()), "conversation_id": convo_id, "tenant_id": tenant_id,
        "direction": "system", "content": f"Chat handed over to {user.get('name', 'Staff')}",
        "message_type": "system", "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Conversation handed over to human agent", "mode": "human"}


@router.post("/conversations/{convo_id}/resume-ai")
async def resume_ai(convo_id: str, request: Request):
    """Resume AI handling for a conversation"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    await db.whatsapp_conversations.update_one(
        {"id": convo_id, "tenant_id": tenant_id},
        {"$set": {"mode": "ai", "assigned_to": None, "resumed_ai_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.whatsapp_messages.insert_one({
        "id": str(uuid.uuid4()), "conversation_id": convo_id, "tenant_id": tenant_id,
        "direction": "system", "content": "AI resumed handling this conversation",
        "message_type": "system", "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": "AI resumed", "mode": "ai"}


@router.post("/conversations/{convo_id}/send")
async def send_manual_message(convo_id: str, request: Request):
    """Send a manual message in a conversation (human agent reply)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()
    message_text = body.get("message", "")
    if not message_text:
        raise HTTPException(status_code=400, detail="Message is required")

    convo = await db.whatsapp_conversations.find_one({"id": convo_id, "tenant_id": tenant_id}, {"_id": 0})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Store the message
    msg = {
        "id": str(uuid.uuid4()), "conversation_id": convo_id, "tenant_id": tenant_id,
        "direction": "outgoing", "content": message_text,
        "message_type": "text", "sent_by": user.get("user_id"),
        "sent_by_name": user.get("name", "Staff"), "is_manual": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.whatsapp_messages.insert_one(msg)

    # Try to send via WhatsApp API
    waba = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    wa_sent = False
    if waba and waba.get("access_token") and waba.get("phone_number_id"):
        import httpx
        try:
            phone = convo.get("phone", "")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://graph.facebook.com/v21.0/{waba['phone_number_id']}/messages",
                    headers={"Authorization": f"Bearer {waba['access_token']}"},
                    json={"messaging_product": "whatsapp", "to": phone, "type": "text", "text": {"body": message_text}},
                    timeout=10,
                )
                wa_sent = resp.status_code == 200
        except Exception as e:
            logger.warning(f"WhatsApp send failed: {e}")

    # Update conversation
    await db.whatsapp_conversations.update_one(
        {"id": convo_id},
        {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
    )

    msg.pop("_id", None)
    return {"message": "Message sent", "wa_sent": wa_sent, "msg": msg}


@router.post("/conversations/{convo_id}/tag")
async def tag_conversation(convo_id: str, request: Request):
    """Tag a conversation (hot/warm/cold/vip)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    await db.whatsapp_conversations.update_one(
        {"id": convo_id, "tenant_id": tenant_id},
        {"$set": {"tags": body.get("tags", []), "lead_score": body.get("lead_score", "")}}
    )
    return {"message": "Tags updated"}


@router.get("/stats")
async def inbox_stats(request: Request):
    """Team inbox statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    total = await db.whatsapp_conversations.count_documents({"tenant_id": tenant_id})
    active = await db.whatsapp_conversations.count_documents({"tenant_id": tenant_id, "status": "active"})
    human_mode = await db.whatsapp_conversations.count_documents({"tenant_id": tenant_id, "mode": "human"})
    ai_mode = await db.whatsapp_conversations.count_documents({"tenant_id": tenant_id, "mode": {"$ne": "human"}})

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    msgs_today = await db.whatsapp_messages.count_documents({"tenant_id": tenant_id, "timestamp": {"$gte": today}})

    unread = await db.whatsapp_conversations.count_documents({
        "tenant_id": tenant_id, "has_unread": True
    })

    return {
        "total_conversations": total, "active": active,
        "human_mode": human_mode, "ai_mode": ai_mode,
        "messages_today": msgs_today, "unread": unread,
    }
