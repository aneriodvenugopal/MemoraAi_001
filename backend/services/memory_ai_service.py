"""MemoraAI Business Memory AI Service - RAG-based long-term memory"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging
import os
import uuid

logger = logging.getLogger(__name__)


class BusinessMemoryAI:
    """
    Advanced Business Memory AI with RAG-based long-term memory.
    Stores and retrieves customer interaction history, preferences, purchase patterns.
    Used by WhatsApp AI to personalize conversations.
    """

    def __init__(self, db):
        self.db = db

    async def store_memory(
        self,
        tenant_id: str,
        customer_phone: str,
        memory_type: str,
        content: str,
        metadata: Dict[str, Any] = None,
    ):
        """Store a memory entry for a customer"""
        memory = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "customer_phone": customer_phone,
            "memory_type": memory_type,  # preference, purchase, interaction, complaint, feedback
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.business_memories.insert_one(memory)
        # Remove MongoDB _id before returning
        memory.pop("_id", None)
        return memory

    async def recall_memories(
        self,
        tenant_id: str,
        customer_phone: str,
        memory_type: str = None,
        limit: int = 10,
    ) -> List[Dict]:
        """Recall memories for a customer"""
        query = {"tenant_id": tenant_id, "customer_phone": customer_phone}
        if memory_type:
            query["memory_type"] = memory_type

        memories = await self.db.business_memories.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        return memories

    async def build_customer_context(
        self,
        tenant_id: str,
        customer_phone: str,
    ) -> str:
        """Build a rich context string about a customer for the AI"""
        memories = await self.recall_memories(tenant_id, customer_phone, limit=20)

        if not memories:
            return "New customer - no previous history."

        # Get customer profile from CRM
        customer = await self.db.whatsapp_crm_leads.find_one(
            {"tenant_id": tenant_id, "phone": {"$regex": customer_phone[-10:]}},
            {"_id": 0}
        )

        context_parts = []

        if customer:
            name = customer.get("name", "")
            score = customer.get("score", "unknown")
            context_parts.append(f"Customer: {name} | Lead Score: {score}")
            if customer.get("interested_in"):
                context_parts.append(f"Interested in: {customer['interested_in']}")
            if customer.get("budget"):
                context_parts.append(f"Budget: {customer['budget']}")

        # Group memories by type
        by_type = {}
        for m in memories:
            t = m.get("memory_type", "other")
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(m["content"])

        for mtype, contents in by_type.items():
            context_parts.append(f"\n[{mtype.upper()}]")
            for c in contents[:5]:
                context_parts.append(f"- {c}")

        return "\n".join(context_parts)

    async def extract_and_store_from_message(
        self,
        tenant_id: str,
        customer_phone: str,
        message: str,
        ai_response: str = None,
    ):
        """Extract key information from a message and store as memories"""
        import re

        # Detect preferences
        preference_patterns = [
            (r"(?:i prefer|i like|i want|interested in)\s+(.+?)(?:\.|$)", "preference"),
            (r"(?:my budget|budget is|can spend)\s+(.+?)(?:\.|$)", "preference"),
            (r"(?:looking for|need|require)\s+(.+?)(?:\.|$)", "preference"),
        ]
        for pattern, mtype in preference_patterns:
            match = re.search(pattern, message.lower())
            if match:
                await self.store_memory(tenant_id, customer_phone, mtype, match.group(0).strip())

        # Store interaction summary if AI responded
        if ai_response:
            summary = f"Customer: {message[:100]} | AI: {ai_response[:100]}"
            await self.store_memory(
                tenant_id, customer_phone, "interaction", summary,
                metadata={"full_message": message, "full_response": ai_response}
            )

    async def detect_abrupt_sales(
        self,
        tenant_id: str,
        customer_phone: str,
        message: str,
    ) -> Optional[Dict]:
        """Detect abrupt sales discussion and create alert"""
        from routes.memoraai_sales import ABRUPT_SALES_KEYWORDS

        message_lower = message.lower()
        triggered = [kw for kw in ABRUPT_SALES_KEYWORDS if kw in message_lower]

        if len(triggered) >= 1:
            confidence = min(1.0, len(triggered) * 0.3 + 0.2)

            if confidence >= 0.3:
                alert = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "customer_phone": customer_phone,
                    "trigger_type": "abrupt_sales",
                    "trigger_message": message[:200],
                    "confidence": confidence,
                    "detected_intent": ", ".join(triggered[:3]),
                    "recommended_action": "Immediate follow-up call recommended" if confidence > 0.6 else "Monitor conversation",
                    "status": "new",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await self.db.sales_alerts.insert_one(alert)

                # Also create notification for tenant admin
                notification = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "type": "sales_alert",
                    "title": "Hot Lead Detected!",
                    "message": f"Customer {customer_phone} shows buying intent: {', '.join(triggered[:2])}",
                    "data": {"alert_id": alert["id"], "phone": customer_phone},
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await self.db.in_app_notifications.insert_one(notification)

                return alert

        return None
