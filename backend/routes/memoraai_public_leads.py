"""MemoraAI Public Lead Capture API — for marketing site demo requests"""
import logging
import uuid
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/public/leads", tags=["memoraai-public-leads"])


def get_db(request: Request):
    return request.app.state.db


class MarketingLead(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=15)
    business_name: Optional[str] = Field(default=None, max_length=200)
    industry: Optional[str] = Field(default=None, max_length=80)
    message: Optional[str] = Field(default=None, max_length=1000)
    source: Optional[str] = Field(default="homepage")
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


@router.post("")
async def create_marketing_lead(data: MarketingLead, request: Request):
    """Public endpoint — captures a demo request from the marketing site."""
    db = get_db(request)

    # Basic phone sanity
    digits = re.sub(r"\D", "", data.phone)
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid phone number")

    # Rate limit: same phone cannot submit > 3 times in 24h
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=1)
    recent = await db.memoraai_marketing_leads.count_documents({
        "phone_digits": digits,
        "created_at": {"$gte": since.isoformat()},
    })
    if recent >= 3:
        raise HTTPException(status_code=429, detail="Too many requests. We'll reach out shortly.")

    # Extract referrer + UA (best-effort)
    ua = request.headers.get("user-agent", "")[:500]
    referer = request.headers.get("referer", "")[:500]
    ip = request.headers.get("x-forwarded-for", "") or (request.client.host if request.client else "")

    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "phone": data.phone.strip(),
        "phone_digits": digits,
        "business_name": (data.business_name or "").strip(),
        "industry": (data.industry or "").strip().lower(),
        "message": (data.message or "").strip(),
        "source": data.source or "homepage",
        "utm": {
            "source": data.utm_source, "medium": data.utm_medium, "campaign": data.utm_campaign,
        },
        "user_agent": ua,
        "referer": referer,
        "ip": ip.split(",")[0].strip() if ip else "",
        "status": "new",
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_marketing_leads.insert_one(doc)

    # Log for ops — you can wire to Slack/Email/WhatsApp later
    logger.warning(f"[NEW LEAD] {doc['name']} ({doc['phone']}) — industry={doc['industry']} source={doc['source']}")

    doc.pop("_id", None)
    return {
        "success": True,
        "message": "Thanks! Our team will call you within 2 working hours.",
        "lead_id": doc["id"],
    }


# ── Admin endpoints ──
from middleware.auth import get_current_user


@router.get("/admin/list")
async def list_marketing_leads(
    request: Request,
    status: Optional[str] = None,
    industry: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    db = get_db(request)

    query = {}
    if status:
        query["status"] = status
    if industry:
        query["industry"] = industry.lower()

    skip = (page - 1) * limit
    total = await db.memoraai_marketing_leads.count_documents(query)
    items = (
        await db.memoraai_marketing_leads.find(query, {"_id": 0})
        .sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    )
    return {"leads": items, "total": total, "page": page, "limit": limit}


@router.put("/admin/{lead_id}/status")
async def update_lead_status(lead_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    body = await request.json()
    db = get_db(request)
    result = await db.memoraai_marketing_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": body.get("status", "new"),
            "notes": body.get("notes", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}
