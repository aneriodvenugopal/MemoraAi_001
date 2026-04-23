"""MemoraAI Business Memory AI Service - Enhanced RAG with vector-like search"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging
import re
import uuid

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> set:
    """Simple tokenizer for keyword-based similarity matching."""
    return set(re.findall(r'\b[a-z]{3,}\b', text.lower()))


def _similarity_score(query_tokens: set, doc_tokens: set) -> float:
    """Jaccard-like similarity between two token sets."""
    if not query_tokens or not doc_tokens:
        return 0.0
    intersection = query_tokens & doc_tokens
    union = query_tokens | doc_tokens
    return len(intersection) / len(union) if union else 0.0


class BusinessMemoryAI:
    """
    Advanced Business Memory AI with RAG-based long-term memory.
    Stores and retrieves customer interaction history, preferences, purchase patterns.
    Uses keyword-based vector-like search for relevant memory recall.
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
        """Store a memory entry for a customer with keyword tokens for search."""
        tokens = list(_tokenize(content))
        memory = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "customer_phone": customer_phone,
            "memory_type": memory_type,
            "content": content,
            "tokens": tokens,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.business_memories.insert_one(memory)
        memory.pop("_id", None)
        return memory

    async def recall_memories(
        self,
        tenant_id: str,
        customer_phone: str,
        memory_type: str = None,
        limit: int = 10,
    ) -> List[Dict]:
        """Recall memories for a customer."""
        query = {"tenant_id": tenant_id, "customer_phone": customer_phone}
        if memory_type:
            query["memory_type"] = memory_type
        memories = await self.db.business_memories.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        return memories

    async def semantic_search(
        self,
        tenant_id: str,
        query_text: str,
        customer_phone: str = None,
        limit: int = 5,
    ) -> List[Dict]:
        """
        Enhanced RAG search: keyword-token based similarity ranking.
        Returns most relevant memories ranked by similarity score.
        """
        query_tokens = _tokenize(query_text)
        if not query_tokens:
            return []

        db_query: Dict[str, Any] = {"tenant_id": tenant_id}
        if customer_phone:
            db_query["customer_phone"] = customer_phone

        # Use token overlap with $in for initial filtering
        token_list = list(query_tokens)
        db_query["tokens"] = {"$in": token_list[:20]}

        candidates = await self.db.business_memories.find(
            db_query, {"_id": 0}
        ).to_list(200)

        if not candidates:
            db_query.pop("tokens", None)
            candidates = await self.db.business_memories.find(
                db_query, {"_id": 0}
            ).sort("created_at", -1).to_list(50)

        scored = []
        for mem in candidates:
            doc_tokens = set(mem.get("tokens", []))
            if not doc_tokens:
                doc_tokens = _tokenize(mem.get("content", ""))
            score = _similarity_score(query_tokens, doc_tokens)
            scored.append((score, mem))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:limit]]

    async def build_customer_context(
        self,
        tenant_id: str,
        customer_phone: str,
    ) -> str:
        """Build a rich context string about a customer for the AI."""
        memories = await self.recall_memories(tenant_id, customer_phone, limit=20)

        if not memories:
            return "New customer - no previous history."

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

        by_type: Dict[str, List[str]] = {}
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

    async def build_rag_context(
        self,
        tenant_id: str,
        customer_phone: str,
        current_message: str,
    ) -> str:
        """
        Build enhanced RAG context using semantic search + recency.
        Combines relevant past memories with current query for rich AI context.
        """
        parts = []

        profile = await self.build_customer_context(tenant_id, customer_phone)
        if profile and profile != "New customer - no previous history.":
            parts.append(f"[CUSTOMER PROFILE]\n{profile}")

        relevant = await self.semantic_search(
            tenant_id=tenant_id,
            query_text=current_message,
            customer_phone=customer_phone,
            limit=3,
        )
        if relevant:
            parts.append("\n[RELEVANT PAST CONTEXT]")
            for mem in relevant:
                parts.append(f"- [{mem.get('memory_type', 'note')}] {mem['content'][:150]}")

        tenant_relevant = await self.semantic_search(
            tenant_id=tenant_id,
            query_text=current_message,
            limit=2,
        )
        if tenant_relevant:
            unique = [m for m in tenant_relevant if m.get("customer_phone") != customer_phone]
            if unique:
                parts.append("\n[SIMILAR ENQUIRIES FROM OTHER CUSTOMERS]")
                for mem in unique[:2]:
                    parts.append(f"- {mem['content'][:100]}")

        return "\n".join(parts) if parts else "New customer - no previous history."

    async def extract_and_store_from_message(
        self,
        tenant_id: str,
        customer_phone: str,
        message: str,
        ai_response: str = None,
    ):
        """Extract key information from a message and store as memories."""
        preference_patterns = [
            (r"(?:i prefer|i like|i want|interested in)\s+(.+?)(?:\.|$)", "preference"),
            (r"(?:my budget|budget is|can spend)\s+(.+?)(?:\.|$)", "preference"),
            (r"(?:looking for|need|require)\s+(.+?)(?:\.|$)", "preference"),
        ]
        for pattern, mtype in preference_patterns:
            match = re.search(pattern, message.lower())
            if match:
                await self.store_memory(tenant_id, customer_phone, mtype, match.group(0).strip())

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
        """Detect abrupt sales discussion and create alert."""
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
