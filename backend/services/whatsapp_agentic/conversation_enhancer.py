"""
Conversation Enhancer — Makes WhatsApp bot feel human.

Features:
1. Telugu auto-detection
2. Time-aware greetings (IST)
3. Customer name memory
4. Message splitting for long responses
5. Price negotiation detection
6. Urgency data from DB (real scarcity)
"""

import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Tuple

logger = logging.getLogger(__name__)

# IST offset
IST = timedelta(hours=5, minutes=30)

# Telugu word patterns
TELUGU_WORDS = {
    "unda", "undi", "undhi", "kavali", "cheppu", "cheppandi", "ento",
    "entha", "ela", "emiti", "enduku", "ikkada", "akkada", "chestha",
    "chestharu", "avunu", "ledu", "ledhu", "ante", "ayithe", "maaku",
    "naku", "naaku", "meeku", "meeru", "nenu", "amma", "anna",
    "sir", "garu", "babu", "ayya", "madam", "andi", "ra", "raa",
    "inka", "mari", "eppudu", "elantidi", "bagundi", "bagundhaa",
    "vastaru", "vasthara", "paduthundi", "paduthundhi", "istara",
    "isthara", "cheyandi", "ivvandi", "pampandi", "pampinchandi",
    "kanukoni", "kanukondaam", "chuddaam", "chuddam", "vellali",
    "veldaam", "potham", "raandi", "randi", "osari", "okasari",
    "thaggisthara", "thakkuva", "ekkuva", "manchidi", "baguntundi",
    "kaadu", "kadhu", "kaadhu", "lo", "ki", "ni", "tho", "kosam",
    "daggara", "paakana", "vaipu", "meeda", "kinda", "lopala",
    "bayata", "mundu", "tarvata", "eenadu", "repu", "ninna",
    "dhanyavaadaalu", "thanks", "namaskaram", "namaskar",
}

# Price negotiation keywords
NEGOTIATION_KEYWORDS = {
    "discount", "thaggisthara", "thakkuva", "reduce", "rate thaggisthara",
    "too expensive", "costly", "ekkuva", "high price", "rate thakkuva",
    "negotiate", "bargain", "offer", "best price", "final price",
    "ekkuva undi", "rate ekkuva", "budget lo ledu", "afford",
    "emi", "installment", "monthly", "payment plan", "loan",
}


def detect_telugu(message: str) -> bool:
    """Detect if message contains Telugu words."""
    words = set(message.lower().split())
    telugu_count = len(words & TELUGU_WORDS)
    # Also check for Telugu script characters (Unicode range)
    has_telugu_script = bool(re.search(r'[\u0C00-\u0C7F]', message))
    return telugu_count >= 1 or has_telugu_script


def get_ist_greeting() -> str:
    """Get time-aware greeting in IST."""
    now_ist = datetime.now(timezone.utc) + IST
    hour = now_ist.hour
    if 5 <= hour < 12:
        return "Good morning"
    elif 12 <= hour < 17:
        return "Good afternoon"
    elif 17 <= hour < 21:
        return "Good evening"
    return ""


def get_ist_time_context() -> str:
    """Get current IST time context for the LLM."""
    now_ist = datetime.now(timezone.utc) + IST
    return now_ist.strftime("%I:%M %p IST, %A")


def is_price_negotiation(message: str) -> bool:
    """Detect if customer is asking for discount or negotiating price."""
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in NEGOTIATION_KEYWORDS)


def split_long_message(message: str, max_chars: int = 500) -> List[str]:
    """
    Split a long message into multiple short WhatsApp messages.
    Splits at natural breakpoints: double newlines, section headers, option lists.
    """
    if len(message) <= max_chars:
        return [message]

    parts = []
    # Split at double newlines first
    sections = re.split(r'\n\n+', message)

    current = ""
    for section in sections:
        if len(current) + len(section) + 2 > max_chars and current:
            parts.append(current.strip())
            current = section
        else:
            current = current + "\n\n" + section if current else section

    if current.strip():
        parts.append(current.strip())

    # If still too long, split at single newlines
    final_parts = []
    for part in parts:
        if len(part) <= max_chars:
            final_parts.append(part)
        else:
            lines = part.split("\n")
            chunk = ""
            for line in lines:
                if len(chunk) + len(line) + 1 > max_chars and chunk:
                    final_parts.append(chunk.strip())
                    chunk = line
                else:
                    chunk = chunk + "\n" + line if chunk else line
            if chunk.strip():
                final_parts.append(chunk.strip())

    return final_parts if final_parts else [message]


async def get_urgency_data(db, tenant_id: str, project_id: str = "") -> Dict:
    """
    Get real scarcity data from DB for urgency messaging.
    Returns available count, recently sold count, etc.
    """
    query = {"tenant_id": tenant_id, "deleted_at": None}
    if project_id:
        query["project_id"] = project_id

    available = await db.properties.count_documents({
        **query, "status": {"$in": ["available", "Available", "AVAILABLE"]}
    })
    sold = await db.properties.count_documents({
        **query, "status": {"$in": ["sold", "Sold", "SOLD", "booked", "Booked"]}
    })
    total = await db.properties.count_documents(query)

    # Recently sold (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recently_sold = await db.properties.count_documents({
        **query,
        "status": {"$in": ["sold", "Sold", "booked", "Booked"]},
        "updated_at": {"$gte": thirty_days_ago}
    })

    return {
        "available": available,
        "sold": sold,
        "total": total,
        "recently_sold": recently_sold,
        "scarcity_level": "high" if available <= 5 else "medium" if available <= 15 else "low",
    }


async def get_negotiation_data(db, tenant_id: str, project_id: str = "") -> Dict:
    """Get EMI/offer/pricing data from DB for negotiation responses."""
    query = {"tenant_id": tenant_id, "deleted_at": None}
    if project_id:
        query["id"] = project_id

    project = await db.projects.find_one(query, {"_id": 0})
    if not project:
        return {}

    return {
        "has_emi": bool(project.get("emi_available") or project.get("payment_plan")),
        "emi_details": project.get("emi_details", ""),
        "offers": project.get("current_offers", project.get("promotional_text", "")),
        "min_price": project.get("min_price", ""),
        "max_price": project.get("max_price", ""),
        "price_per_sqft": project.get("price_per_sqft", ""),
    }


def build_enhanced_system_context(
    customer_name: str = "",
    is_telugu: bool = False,
    time_greeting: str = "",
    urgency: Optional[Dict] = None,
    negotiation: Optional[Dict] = None,
    current_time: str = "",
) -> str:
    """Build additional context to inject into the system prompt."""
    parts = []

    if current_time:
        parts.append(f"CURRENT TIME: {current_time}")

    if time_greeting:
        parts.append(f"USE GREETING: Start with '{time_greeting}' if this is first message")

    if customer_name:
        parts.append(f"CUSTOMER NAME: {customer_name} — use their name naturally (e.g., '{customer_name} garu' or 'Hi {customer_name}')")

    if is_telugu:
        parts.append("LANGUAGE: Customer speaks Telugu. Reply in natural Telugu-English mix. Use Telugu words like 'undi', 'kavali', 'garu', 'sir', 'cheppandi'.")
    else:
        parts.append("LANGUAGE: Reply in English. Keep it simple and professional.")

    if urgency and urgency.get("scarcity_level") in ("high", "medium"):
        avail = urgency.get("available", 0)
        recent = urgency.get("recently_sold", 0)
        if avail <= 5:
            parts.append(f"URGENCY: Only {avail} units remaining! Mention this naturally. '{avail} plots only left sir.'")
        elif recent > 0:
            parts.append(f"URGENCY: {recent} units sold recently. Mention demand is high.")

    if negotiation:
        if negotiation.get("has_emi"):
            parts.append(f"EMI AVAILABLE: {negotiation.get('emi_details', 'EMI facility available')}. Mention this when customer asks about price/affordability.")
        if negotiation.get("offers"):
            parts.append(f"CURRENT OFFER: {negotiation['offers']}. Share this naturally.")

    return "\n".join(parts)
