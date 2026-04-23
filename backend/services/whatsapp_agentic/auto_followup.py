"""
Auto Follow-up Service for WhatsApp
Sends personalized follow-up messages to leads who showed interest but didn't reply.

RULES:
- Only sends within 24-hour Customer Service Window (free-form messages, NO templates)
- Triggers when lead showed interest but no reply for configurable hours (default: 2-6 hours)
- ONE follow-up per lead per 24-hour window (no spam)
- Multi-tenant: fetches correct project data per tenant
- Uses Gemini for warm, personalized, low-cost message generation
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from .llm_router import llm_router
from .knowledge_retriever import KnowledgeRetriever

logger = logging.getLogger(__name__)

# States that indicate the lead showed interest
INTEREST_STATES = [
    "project_discussion", "site_visit_offer", "qualification",
    "site_visit_scheduled", "booking_discussion",
]

# Minimum hours after last bot response before sending follow-up
MIN_FOLLOWUP_DELAY_HOURS = 2
# Maximum hours — must be within 24h window from lead's last message
MAX_FOLLOWUP_WINDOW_HOURS = 22

FOLLOWUP_PROMPT = """You are "RealApex Property Expert" — a warm, senior real estate advisor.

A customer showed interest in our properties on WhatsApp but hasn't replied for a while.
Write a single gentle follow-up message to bring them back.

CUSTOMER INFO:
- Name: {lead_name}
- Phone: {phone}
- Interested Location: {location}
- Budget: {budget}
- Property Type: {prop_type}
- Last State: {last_state}

PREVIOUS CONVERSATION SUMMARY:
{conversation_summary}

PROJECT DATA (from our database):
{project_data}

RULES:
- Use the customer's name if available
- Reference what they previously discussed or asked about
- Mention specific project details, pricing, or availability from the data above
- Keep a warm, caring, family-focused tone
- Add subtle urgency (limited availability, price advantage, etc.)
- End with a soft call-to-action (site visit, callback, or question)
- Do NOT sound robotic or pushy
- Keep it 3-5 lines max (WhatsApp message)
- Use natural Telugu-English mix if the customer spoke Telugu
- NO emojis except 1-2 max
- This is a FREE-FORM message, not a template

Write ONLY the follow-up message, nothing else."""


class AutoFollowupService:
    """Handles automatic follow-up messages for interested leads."""

    def __init__(self, db):
        self.db = db
        self.knowledge_retriever = KnowledgeRetriever(db)

    async def find_pending_followups(
        self,
        tenant_id: Optional[str] = None,
        min_delay_hours: float = MIN_FOLLOWUP_DELAY_HOURS,
        max_window_hours: float = MAX_FOLLOWUP_WINDOW_HOURS,
    ) -> List[Dict[str, Any]]:
        """
        Find conversations needing follow-up.

        Criteria:
        1. Conversation state shows interest (project_discussion, site_visit_offer, etc.)
        2. AI is enabled (not human handoff)
        3. Bot sent a response, but lead hasn't replied for min_delay_hours
        4. Still within 24h window from lead's last message
        5. No follow-up already sent in this window
        """
        now = datetime.now(timezone.utc)
        min_delay = now - timedelta(hours=min_delay_hours)
        max_window = now - timedelta(hours=max_window_hours)

        query = {
            "state": {"$in": INTEREST_STATES},
            "ai_enabled": {"$ne": False},
            "status": {"$ne": "closed"},
            # Bot's last response was at least min_delay_hours ago
            "updated_at": {"$lte": min_delay, "$gte": max_window},
        }
        if tenant_id:
            query["tenant_id"] = tenant_id

        conversations = await self.db.whatsapp_conversations.find(
            query, {"_id": 0}
        ).sort("updated_at", 1).limit(50).to_list(50)

        pending = []
        for conv in conversations:
            conv_id = conv.get("id")
            phone = conv.get("phone", "")
            tid = conv.get("tenant_id", "")

            # Check: last message was from the BOT (lead hasn't replied)
            last_msg = await self.db.whatsapp_messages.find_one(
                {"conversation_id": conv_id},
                {"_id": 0, "role": 1, "timestamp": 1, "content": 1},
                sort=[("timestamp", -1)],
            )
            if not last_msg or last_msg.get("role") != "assistant":
                continue  # Lead already replied or no messages

            # Check: within 24h of lead's last inbound message
            session = await self.db.whatsapp_sessions.find_one(
                {"phone": phone, "tenant_id": tid}, {"_id": 0}
            )
            if session:
                expires = session.get("session_expires_at")
                if expires and isinstance(expires, datetime):
                    if expires.tzinfo is None:
                        expires = expires.replace(tzinfo=timezone.utc)
                    if now > expires:
                        continue  # Session expired, can't send free message

            # Check: no follow-up already sent in this window
            existing_followup = await self.db.whatsapp_followups.find_one(
                {
                    "conversation_id": conv_id,
                    "sent_at": {"$gte": now - timedelta(hours=24)},
                },
                {"_id": 0},
            )
            if existing_followup:
                continue  # Already sent a follow-up

            pending.append({
                "conversation": conv,
                "last_message": last_msg,
                "session": session,
                "phone": phone,
                "tenant_id": tid,
            })

        logger.info(f"Found {len(pending)} conversations needing follow-up")
        return pending

    async def generate_followup_message(
        self, conversation: Dict, tenant_id: str, phone: str
    ) -> str:
        """Generate a personalized follow-up message using Gemini."""
        conv_id = conversation.get("id")
        context = conversation.get("context", {})
        state = conversation.get("state", "")

        # Get lead info
        lead = await self.db.leads.find_one(
            {"tenant_id": tenant_id, "id": conversation.get("lead_id")},
            {"_id": 0},
        )
        lead_name = (lead.get("buyer_name") or "") if lead else ""
        location = context.get("location") or (lead.get("preferred_location", "") if lead else "")
        budget = context.get("budget_text", "")
        prop_type = context.get("property_type", "")

        # Get last 5 messages for conversation summary
        messages = await self.db.whatsapp_messages.find(
            {"conversation_id": conv_id},
            {"_id": 0, "role": 1, "content": 1},
        ).sort("timestamp", -1).limit(5).to_list(5)

        summary_lines = []
        for m in reversed(messages):
            role = "Customer" if m["role"] == "user" else "Agent"
            summary_lines.append(f"{role}: {m.get('content', '')[:150]}")
        conversation_summary = "\n".join(summary_lines) if summary_lines else "No previous messages."

        # Get project knowledge
        knowledge = await self.knowledge_retriever.get_project_knowledge(tenant_id)
        project_data = self.knowledge_retriever.format_knowledge_for_llm(knowledge)
        if len(project_data) > 2000:
            project_data = project_data[:2000]

        # If a specific project was matched in context, get its details
        matched_project = context.get("matched_project_name", "")
        if matched_project:
            project_data = f"Customer was interested in: {matched_project}\n\n{project_data}"

        prompt = FOLLOWUP_PROMPT.format(
            lead_name=lead_name or "Customer",
            phone=phone,
            location=location or "Not specified",
            budget=budget or "Not specified",
            prop_type=prop_type or "Not specified",
            last_state=state,
            conversation_summary=conversation_summary,
            project_data=project_data,
        )

        try:
            result = await llm_router.generate(
                system_prompt=prompt,
                user_message="Generate a warm follow-up message for this lead.",
                force_model="gemini",
            )
            if result.get("text"):
                logger.info(
                    f"Follow-up generated for {phone} via {result['model']}, "
                    f"cost~${result['cost_estimate']:.6f}"
                )
                return result["text"].strip()
        except Exception as e:
            logger.error(f"LLM error generating follow-up: {e}")

        # Fallback message
        name_part = f"Hi {lead_name}! " if lead_name else "Hi! "
        return (
            f"{name_part}Just checking in — we noticed you were exploring properties "
            f"{'in ' + location if location else 'with us'}. "
            f"Would you like to schedule a quick site visit? Our team is ready to help!"
        )

    async def send_followup(
        self, conv_data: Dict, meta_client
    ) -> Dict[str, Any]:
        """Send a follow-up message to a single lead."""
        conversation = conv_data["conversation"]
        phone = conv_data["phone"]
        tenant_id = conv_data["tenant_id"]
        conv_id = conversation.get("id")

        # Generate personalized message
        message = await self.generate_followup_message(conversation, tenant_id, phone)

        # Send via WhatsApp (free-form, within 24h window)
        send_result = await meta_client.send_text_message(
            phone=phone,
            message=message,
            tenant_id=tenant_id,
            check_session=True,
            fallback_to_template=False,  # Do NOT fall back to template — free only
        )

        # Record the follow-up
        followup_record = {
            "conversation_id": conv_id,
            "tenant_id": tenant_id,
            "phone": phone,
            "lead_id": conversation.get("lead_id"),
            "message": message,
            "sent_at": datetime.now(timezone.utc),
            "success": send_result.get("success", False),
            "message_id": send_result.get("message_id"),
            "error": send_result.get("error") if not send_result.get("success") else None,
        }
        await self.db.whatsapp_followups.insert_one(followup_record)

        # Store as a conversation message too
        if send_result.get("success"):
            import uuid
            await self.db.whatsapp_messages.insert_one({
                "id": str(uuid.uuid4()),
                "conversation_id": conv_id,
                "tenant_id": tenant_id,
                "lead_id": conversation.get("lead_id"),
                "role": "assistant",
                "content": message,
                "metadata": {"type": "auto_followup"},
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
            })

        status = "sent" if send_result.get("success") else "failed"
        logger.info(f"Follow-up {status} for {phone}: {message[:80]}...")

        return {
            "phone": phone,
            "success": send_result.get("success", False),
            "message": message[:200],
            "message_id": send_result.get("message_id"),
            "error": send_result.get("error"),
        }

    async def run_batch(
        self,
        meta_client,
        tenant_id: Optional[str] = None,
        min_delay_hours: float = MIN_FOLLOWUP_DELAY_HOURS,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Run follow-up batch for all pending conversations.
        Returns summary of actions taken.
        """
        pending = await self.find_pending_followups(
            tenant_id=tenant_id,
            min_delay_hours=min_delay_hours,
        )

        results = []
        for conv_data in pending:
            if dry_run:
                # Generate message but don't send
                msg = await self.generate_followup_message(
                    conv_data["conversation"],
                    conv_data["tenant_id"],
                    conv_data["phone"],
                )
                results.append({
                    "phone": conv_data["phone"],
                    "success": True,
                    "dry_run": True,
                    "message": msg[:300],
                })
            else:
                result = await self.send_followup(conv_data, meta_client)
                results.append(result)

        return {
            "total_pending": len(pending),
            "processed": len(results),
            "successful": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
            "dry_run": dry_run,
            "results": results,
        }
