"""
WhatsApp CRM Lead Engine — Low-cost, high-conversion lead management.

Every first WhatsApp message → instant lead creation.
Rule-based intent scoring (Cold/Warm/Hot) — zero AI cost for cold leads.
Gemini used ONLY for Warm/Hot leads.
Last 5 messages to LLM (not full history) for cost optimization.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ──── PROPERTY CATEGORIES ────
PROPERTY_TYPES = [
    "plot", "flat", "apartment", "villa", "farm land",
    "commercial", "house", "agricultural land", "venture unit", "other",
]

# ──── INTENT SCORING KEYWORDS ────
COLD_KEYWORDS = {
    "hi", "hello", "hey", "ok", "okay", "thanks", "thank you", "good morning",
    "good evening", "good afternoon", "bye", "namaste", "namaskar",
}

WARM_KEYWORDS = {
    "property", "properties", "investment", "invest", "plot", "plots", "flat",
    "apartment", "villa", "price", "pricing", "rate", "details", "budget",
    "area", "location", "project", "projects", "available", "sqft", "sq ft",
    "facing", "rera", "amenities", "layout", "brochure", "acres", "guntas",
    "cents", "yards", "dimensions", "emi", "loan", "bank", "registration",
}

HOT_KEYWORDS = {
    "call me", "call back", "callback", "site visit", "visit", "ready to buy",
    "book", "booking", "token", "advance", "today", "tomorrow", "meeting",
    "schedule", "urgent", "immediately", "right now", "finalize", "confirm",
    "payment", "pay now", "reserve", "registration date", "agreement",
}

# ──── SOURCE DETECTION ────
AD_INDICATORS = {"fb", "facebook", "ad", "meta", "campaign", "offer", "discount", "promo"}


def score_lead_intent(message: str) -> str:
    """Rule-based intent scoring. Returns 'cold', 'warm', or 'hot'."""
    msg_lower = message.lower().strip()

    # Check hot first (highest priority)
    for kw in HOT_KEYWORDS:
        if kw in msg_lower:
            return "hot"

    # Check warm
    for kw in WARM_KEYWORDS:
        if kw in msg_lower:
            return "warm"

    # Default cold
    return "cold"


def detect_source(message: str, contact_name: str = "") -> str:
    """Detect lead source from first message context."""
    combined = (message + " " + contact_name).lower()
    if any(ind in combined for ind in AD_INDICATORS):
        return "whatsapp_ad"
    return "organic"


def detect_property_type(message: str) -> Optional[str]:
    """Detect property type from message."""
    msg_lower = message.lower()
    type_map = {
        "plot": ["plot", "plots", "site", "sites", "open plot"],
        "flat": ["flat", "flats", "2bhk", "3bhk", "1bhk", "4bhk"],
        "apartment": ["apartment", "apartments", "apt"],
        "villa": ["villa", "villas", "duplex", "independent house"],
        "farm land": ["farm", "farm land", "farmland"],
        "commercial": ["commercial", "shop", "office", "warehouse", "godown"],
        "house": ["house", "individual house", "row house"],
        "agricultural land": ["agricultural", "agriculture", "agri land"],
        "venture unit": ["venture", "venture unit"],
    }
    for ptype, keywords in type_map.items():
        if any(kw in msg_lower for kw in keywords):
            return ptype
    return None


def extract_name_from_message(message: str) -> Optional[str]:
    """Try to extract customer name from message."""
    patterns = [
        r"(?:my name is|i am|i'm|this is|myself)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"(?:name|naam)\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pat in patterns:
        match = re.search(pat, message, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extract_budget_text(message: str) -> Optional[str]:
    """Extract budget from message as text."""
    msg_lower = message.lower()
    patterns = [
        (r'(\d+\.?\d*)\s*(?:to|-)\s*(\d+\.?\d*)\s*(?:lakhs?|lacs?|l\b)', '{0}-{1} Lakhs'),
        (r'(\d+\.?\d*)\s*(?:to|-)\s*(\d+\.?\d*)\s*(?:crores?|cr\b)', '{0}-{1} Crores'),
        (r'(\d+\.?\d*)\s*(?:lakhs?|lacs?|l\b)', '{0} Lakhs'),
        (r'(\d+\.?\d*)\s*(?:crores?|cr\b)', '{0} Crores'),
    ]
    for pattern, fmt in patterns:
        match = re.search(pattern, msg_lower)
        if match:
            groups = match.groups()
            return fmt.format(*groups)
    return None


def extract_purpose(message: str) -> Optional[str]:
    """Detect purpose: investment or self use."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["invest", "investment", "returns", "roi", "appreciation", "rental"]):
        return "investment"
    if any(w in msg_lower for w in ["self use", "own use", "family", "stay", "live", "settle", "home"]):
        return "self_use"
    return None


def extract_timeline(message: str) -> Optional[str]:
    """Detect purchase timeline."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["today", "tomorrow", "this week", "urgent", "immediately", "asap"]):
        return "immediate"
    if any(w in msg_lower for w in ["this month", "soon", "next week"]):
        return "1_month"
    if any(w in msg_lower for w in ["next month", "2 months", "3 months"]):
        return "1_3_months"
    if any(w in msg_lower for w in ["6 months", "next year", "planning"]):
        return "6_months_plus"
    return None


class CRMLeadEngine:
    """
    Low-cost CRM lead engine.
    Rule-based scoring first, Gemini only for Warm/Hot.
    """

    def __init__(self, db):
        self.db = db

    async def process_first_contact(
        self,
        tenant_id: str,
        phone: str,
        message: str,
        contact_name: str = "",
        existing_lead: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Process first contact from a new WhatsApp number.
        Creates/updates CRM lead with all extracted data.
        Returns the lead data and intent score.
        """
        # Score intent
        intent = score_lead_intent(message)
        source = detect_source(message, contact_name)
        prop_type = detect_property_type(message)
        name = extract_name_from_message(message) or contact_name or ""
        budget = extract_budget_text(message)
        purpose = extract_purpose(message)
        timeline = extract_timeline(message)

        is_new = existing_lead is None or not existing_lead.get("crm_tracked")

        # Build CRM data
        crm_data = {
            "crm_tracked": True,
            "lead_score": intent,
            "lead_source": source if is_new else existing_lead.get("lead_source", source),
            "first_contact_at": existing_lead.get("first_contact_at", datetime.now(timezone.utc)) if existing_lead else datetime.now(timezone.utc),
            "first_message": message[:500] if is_new else existing_lead.get("first_message", message[:500]),
            "last_message_at": datetime.now(timezone.utc),
            "message_count": (existing_lead.get("message_count", 0) if existing_lead else 0) + 1,
            "updated_at": datetime.now(timezone.utc),
        }

        # Update fields only if newly detected (don't overwrite with None)
        if name:
            crm_data["buyer_name"] = name
        if prop_type:
            crm_data["interested_property_type"] = prop_type
        if budget:
            crm_data["budget_text"] = budget
        if purpose:
            crm_data["purpose"] = purpose
        if timeline:
            crm_data["timeline"] = timeline

        # Map intent to status
        status_map = {"cold": "new", "warm": "warm", "hot": "hot"}
        # Only upgrade status, never downgrade
        current_status = existing_lead.get("status", "new") if existing_lead else "new"
        new_status = status_map.get(intent, "new")
        status_priority = {"new": 0, "cold": 0, "warm": 1, "hot": 2, "booked": 3}
        if status_priority.get(new_status, 0) >= status_priority.get(current_status, 0):
            crm_data["status"] = new_status

        # Update lead in DB
        lead_id = existing_lead.get("id") if existing_lead else None
        if lead_id:
            await self.db.leads.update_one(
                {"tenant_id": tenant_id, "id": lead_id},
                {"$set": crm_data}
            )
        else:
            # Lead should already exist from find_or_create_lead
            await self.db.leads.update_one(
                {"tenant_id": tenant_id, "buyer_phone": phone},
                {"$set": crm_data}
            )

        # Track as "Send Click Contact Lead" metric
        await self._track_metric(tenant_id, phone, intent, is_new)

        # Create admin alert for hot leads
        if intent == "hot":
            await self._create_hot_lead_alert(tenant_id, lead_id or "", phone, name, message)

        logger.info(
            f"CRM Lead: phone={phone} intent={intent} source={source} "
            f"type={prop_type} budget={budget} new={is_new}"
        )

        return {
            "intent": intent,
            "source": source,
            "property_type": prop_type,
            "name": name,
            "budget": budget,
            "purpose": purpose,
            "timeline": timeline,
            "is_new_contact": is_new,
            "use_gemini": intent in ("warm", "hot"),
        }

    async def get_recent_messages(
        self, conversation_id: str, limit: int = 5
    ) -> List[Dict[str, str]]:
        """Load only last N messages for LLM context (cost optimization)."""
        messages = await self.db.whatsapp_messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0, "role": 1, "content": 1}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return [
            {"role": m["role"], "content": m["content"]}
            for m in reversed(messages)
            if m.get("role") in ("user", "assistant") and m.get("content")
        ]

    async def extract_crm_fields(
        self, tenant_id: str, lead_id: str, message: str
    ) -> Dict[str, Any]:
        """
        Extract structured CRM fields from incoming message.
        Updates lead with any new data found. Pure rule-based, zero AI cost.
        """
        updates = {}
        name = extract_name_from_message(message)
        if name:
            updates["buyer_name"] = name
        prop_type = detect_property_type(message)
        if prop_type:
            updates["interested_property_type"] = prop_type
        budget = extract_budget_text(message)
        if budget:
            updates["budget_text"] = budget
        purpose = extract_purpose(message)
        if purpose:
            updates["purpose"] = purpose
        timeline = extract_timeline(message)
        if timeline:
            updates["timeline"] = timeline

        # Re-score intent
        intent = score_lead_intent(message)
        updates["lead_score"] = intent
        updates["last_message_at"] = datetime.now(timezone.utc)

        if updates:
            updates["updated_at"] = datetime.now(timezone.utc)
            await self.db.leads.update_one(
                {"tenant_id": tenant_id, "id": lead_id},
                {"$set": updates, "$inc": {"message_count": 1}}
            )

        return {"intent": intent, "use_gemini": intent in ("warm", "hot"), **updates}

    async def _track_metric(
        self, tenant_id: str, phone: str, intent: str, is_new: bool
    ):
        """Track CRM metrics for dashboard."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        metric_key = f"{tenant_id}:{today}"

        inc_fields = {"total_messages": 1}
        if is_new:
            inc_fields["new_leads"] = 1
            inc_fields["send_click_contacts"] = 1
        if intent == "warm":
            inc_fields["warm_leads"] = 1
        elif intent == "hot":
            inc_fields["hot_leads"] = 1

        await self.db.crm_daily_metrics.update_one(
            {"key": metric_key},
            {
                "$set": {"tenant_id": tenant_id, "date": today, "updated_at": datetime.now(timezone.utc)},
                "$inc": inc_fields,
            },
            upsert=True,
        )

    async def _create_hot_lead_alert(
        self, tenant_id: str, lead_id: str, phone: str, name: str, message: str
    ):
        """Create an immediate alert for hot leads."""
        import uuid
        alert = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "type": "hot_lead_alert",
            "title": f"🔥 HOT LEAD: {name or phone}",
            "message": f"High-intent message: \"{message[:150]}\"",
            "data": {"lead_id": lead_id, "phone": phone, "intent": "hot"},
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        await self.db.notifications.insert_one(alert)
        logger.info(f"🔥 HOT LEAD ALERT created for {phone}")

    async def get_dashboard_metrics(
        self, tenant_id: str, date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get CRM dashboard metrics for a given date."""
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        metric_key = f"{tenant_id}:{date}"
        metrics = await self.db.crm_daily_metrics.find_one(
            {"key": metric_key}, {"_id": 0}
        )

        if not metrics:
            metrics = {}

        # Also get live counts from leads collection
        total_leads = await self.db.leads.count_documents({"tenant_id": tenant_id, "crm_tracked": True})
        hot_total = await self.db.leads.count_documents({"tenant_id": tenant_id, "status": "hot"})
        warm_total = await self.db.leads.count_documents({"tenant_id": tenant_id, "status": "warm"})

        visits_today = await self.db.site_visits.count_documents({
            "tenant_id": tenant_id,
            "created_at": {"$gte": datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)}
        })

        return {
            "date": date,
            "new_leads": metrics.get("new_leads", 0),
            "send_click_contacts": metrics.get("send_click_contacts", 0),
            "warm_leads_today": metrics.get("warm_leads", 0),
            "hot_leads_today": metrics.get("hot_leads", 0),
            "total_messages": metrics.get("total_messages", 0),
            "calls_needed": hot_total,
            "site_visits_today": visits_today,
            "total_crm_leads": total_leads,
            "total_hot": hot_total,
            "total_warm": warm_total,
        }

    async def archive_stale_conversations(self, tenant_id: str, days: int = 30) -> int:
        """Archive conversations with no activity for N days. Keep CRM summary only."""
        cutoff = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=days)

        # Find stale conversations
        stale = await self.db.whatsapp_conversations.find(
            {"tenant_id": tenant_id, "updated_at": {"$lt": cutoff}, "archived": {"$ne": True}},
            {"_id": 0, "id": 1, "phone": 1}
        ).to_list(100)

        archived = 0
        for conv in stale:
            conv_id = conv["id"]
            # Delete old messages (keep CRM lead data)
            await self.db.whatsapp_messages.delete_many({"conversation_id": conv_id})
            # Mark conversation as archived
            await self.db.whatsapp_conversations.update_one(
                {"id": conv_id},
                {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc)}}
            )
            archived += 1

        if archived:
            logger.info(f"Archived {archived} stale conversations for tenant {tenant_id}")
        return archived
