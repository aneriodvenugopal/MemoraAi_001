"""MemoraAI Follow-up Config + Emotional Intelligence + Lead Funnel API"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/engine", tags=["memoraai-engine"])

def get_db(request: Request):
    return request.app.state.db


# ═══════════ FOLLOW-UP CONFIG ═══════════

DEFAULT_FOLLOWUP_CONFIG = {
    "enabled": True,
    "timing": [
        {"delay_hours": 1, "label": "1 Hour After", "enabled": True, "message_type": "gentle_reminder"},
        {"delay_hours": 24, "label": "Next Day", "enabled": True, "message_type": "value_add"},
        {"delay_hours": 72, "label": "3 Days Later", "enabled": True, "message_type": "last_chance"},
        {"delay_hours": 168, "label": "1 Week Later", "enabled": False, "message_type": "re_engage"},
    ],
    "max_followups": 3,
    "stop_on_reply": True,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00",
}


@router.get("/followup-config")
async def get_followup_config(request: Request):
    """Get follow-up configuration for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    config = await db.memoraai_followup_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        config = {"id": str(uuid.uuid4()), "tenant_id": tenant_id, **DEFAULT_FOLLOWUP_CONFIG,
                  "created_at": datetime.now(timezone.utc).isoformat()}
        await db.memoraai_followup_config.insert_one(config)
        config.pop("_id", None)
    return {"config": config}


@router.put("/followup-config")
async def update_followup_config(request: Request):
    """Update follow-up timing configuration"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "tenant_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_followup_config.update_one(
        {"tenant_id": tenant_id}, {"$set": update}, upsert=True
    )
    config = await db.memoraai_followup_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return {"message": "Follow-up config updated", "config": config}


# ═══════════ EMOTIONAL INTELLIGENCE ═══════════

EMOTION_KEYWORDS = {
    "angry": ["angry", "upset", "frustrated", "terrible", "worst", "useless", "waste", "cheat", "fraud",
              "complaint", "unacceptable", "disgusting", "horrible", "pathetic", "sick of"],
    "urgent": ["urgent", "emergency", "asap", "immediately", "now", "today itself", "very important",
               "life death", "cannot wait", "hurry", "running out"],
    "happy": ["thank", "great", "wonderful", "amazing", "excellent", "perfect", "love it", "awesome",
              "happy", "satisfied", "best", "superb", "fantastic"],
    "confused": ["confused", "don't understand", "not clear", "explain", "what do you mean", "unclear",
                 "which one", "not sure", "help me understand"],
    "bargaining": ["discount", "reduce", "lower", "negotiate", "best price", "final price",
                   "too expensive", "costly", "cheaper", "budget tight"],
}


@router.post("/detect-emotion")
async def detect_emotion(request: Request):
    """Detect emotional tone from a message"""
    body = await request.json()
    message = body.get("message", "").lower()

    scores = {}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in message]
        if matches:
            scores[emotion] = min(1.0, len(matches) * 0.3 + 0.2)

    primary = max(scores, key=scores.get) if scores else "neutral"
    confidence = scores.get(primary, 0)

    response_style = {
        "angry": "empathetic_calm", "urgent": "quick_action", "happy": "appreciative",
        "confused": "explanatory", "bargaining": "value_justification", "neutral": "friendly_professional",
    }

    return {
        "primary_emotion": primary,
        "confidence": confidence,
        "all_scores": scores,
        "recommended_style": response_style.get(primary, "friendly_professional"),
    }


# ═══════════ LEAD CAPTURE FUNNEL ═══════════

CATEGORY_LEAD_FIELDS = {
    "real_estate": [
        {"field": "name", "label": "Customer Name", "required": True, "type": "text"},
        {"field": "budget", "label": "Budget Range", "required": True, "type": "text"},
        {"field": "location", "label": "Preferred Location", "required": True, "type": "text"},
        {"field": "property_type", "label": "Property Type", "required": False, "type": "select", "options": ["Plot", "Flat", "Villa", "Commercial"]},
        {"field": "timeline", "label": "Purchase Timeline", "required": False, "type": "select", "options": ["Immediate", "1-3 months", "3-6 months", "6+ months"]},
    ],
    "doctor_clinic": [
        {"field": "name", "label": "Patient Name", "required": True, "type": "text"},
        {"field": "concern", "label": "Health Concern", "required": True, "type": "text"},
        {"field": "doctor_preference", "label": "Preferred Doctor", "required": False, "type": "text"},
        {"field": "preferred_date", "label": "Preferred Date", "required": False, "type": "date"},
        {"field": "insurance", "label": "Insurance Provider", "required": False, "type": "text"},
    ],
    "astrology": [
        {"field": "name", "label": "Client Name", "required": True, "type": "text"},
        {"field": "birth_date", "label": "Date of Birth", "required": True, "type": "date"},
        {"field": "birth_time", "label": "Birth Time", "required": False, "type": "text"},
        {"field": "birth_place", "label": "Birth Place", "required": False, "type": "text"},
        {"field": "concern", "label": "Consultation Topic", "required": True, "type": "select", "options": ["Marriage", "Career", "Health", "Finance", "General"]},
    ],
    "beauty_salon": [
        {"field": "name", "label": "Client Name", "required": True, "type": "text"},
        {"field": "service", "label": "Service Interested", "required": True, "type": "text"},
        {"field": "preferred_date", "label": "Preferred Date", "required": False, "type": "date"},
        {"field": "skin_type", "label": "Skin/Hair Type", "required": False, "type": "text"},
        {"field": "budget", "label": "Budget", "required": False, "type": "text"},
    ],
    "function_hall": [
        {"field": "name", "label": "Client Name", "required": True, "type": "text"},
        {"field": "event_type", "label": "Event Type", "required": True, "type": "select", "options": ["Marriage", "Engagement", "Birthday", "Corporate", "Reception", "Other"]},
        {"field": "event_date", "label": "Event Date", "required": True, "type": "date"},
        {"field": "guest_count", "label": "Expected Guests", "required": True, "type": "number"},
        {"field": "budget", "label": "Budget Range", "required": False, "type": "text"},
    ],
    "default": [
        {"field": "name", "label": "Customer Name", "required": True, "type": "text"},
        {"field": "need", "label": "What do you need?", "required": True, "type": "text"},
        {"field": "budget", "label": "Budget", "required": False, "type": "text"},
        {"field": "timeline", "label": "When do you need it?", "required": False, "type": "text"},
    ],
}


@router.get("/lead-fields")
async def get_lead_fields(request: Request, category: str = None):
    """Get lead capture fields for a category"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    if not category:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        category = (tenant or {}).get("business_category", "default")

    fields = CATEGORY_LEAD_FIELDS.get(category, CATEGORY_LEAD_FIELDS["default"])
    return {"category": category, "fields": fields}


@router.post("/capture-lead")
async def capture_lead(request: Request):
    """Capture a structured lead from WhatsApp conversation"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    lead = {
        "id": str(uuid.uuid4()), "tenant_id": tenant_id,
        "phone": body.get("phone", ""),
        "name": body.get("name", ""),
        "category_slug": body.get("category_slug", ""),
        "captured_fields": body.get("fields", {}),
        "source": body.get("source", "whatsapp"),
        "score": body.get("score", "warm"),
        "tags": body.get("tags", []),
        "conversation_id": body.get("conversation_id"),
        "status": "new",
        "created_by": user.get("user_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_leads.insert_one(lead)
    lead.pop("_id", None)
    return {"message": "Lead captured", "lead": lead}


@router.get("/leads")
async def list_leads(request: Request, score: str = None, status: str = None):
    """List captured leads with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if score:
        query["score"] = score
    if status:
        query["status"] = status

    leads = await db.memoraai_leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"leads": leads, "count": len(leads)}


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, request: Request):
    """Update lead score/status/tags"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "tenant_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.memoraai_leads.update_one({"id": lead_id, "tenant_id": tenant_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    updated = await db.memoraai_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"message": "Lead updated", "lead": updated}


@router.get("/leads/stats")
async def lead_stats(request: Request):
    """Lead funnel statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    total = await db.memoraai_leads.count_documents({"tenant_id": tenant_id})
    hot = await db.memoraai_leads.count_documents({"tenant_id": tenant_id, "score": "hot"})
    warm = await db.memoraai_leads.count_documents({"tenant_id": tenant_id, "score": "warm"})
    cold = await db.memoraai_leads.count_documents({"tenant_id": tenant_id, "score": "cold"})

    return {"total": total, "hot": hot, "warm": warm, "cold": cold}
