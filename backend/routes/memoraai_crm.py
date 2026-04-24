"""MemoraAI Tenant Leads & Contacts Management"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/crm", tags=["memoraai-crm"])


def get_db(request: Request):
    return request.app.state.db


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    source: Optional[str] = "manual"  # manual, whatsapp, website, walkin, facebook, google_ads, referral, other
    service_interest: Optional[str] = None
    description: Optional[str] = None  # long info — budget, timing, history, etc.
    status: Optional[str] = "new"
    tags: Optional[List[str]] = None


class ContactCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None  # separate if different from phone
    address: Optional[str] = None
    description: Optional[str] = None  # long info — preferences, past purchases, notes
    tags: Optional[List[str]] = None


# ═══════════════════ LEADS ═══════════════════
@router.post("/leads")
async def create_lead(data: LeadCreate, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": data.name.strip(),
        "phone": data.phone.strip(),
        "email": (data.email or "").strip(),
        "source": data.source or "manual",
        "service_interest": (data.service_interest or "").strip(),
        "description": (data.description or "").strip(),
        "status": data.status or "new",
        "tags": data.tags or [],
        "created_by": user.get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_leads.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "lead": doc}


@router.get("/leads")
async def list_leads(
    request: Request, status: Optional[str] = None, source: Optional[str] = None,
    page: int = 1, limit: int = 100,
):
    user = await get_current_user(request)
    db = get_db(request)
    q = {"tenant_id": user.get("tenant_id")}
    if status: q["status"] = status
    if source: q["source"] = source

    total = await db.memoraai_leads.count_documents(q)
    skip = (page - 1) * limit
    items = await db.memoraai_leads.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"leads": items, "total": total}


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    db = get_db(request)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.memoraai_leads.update_one(
        {"id": lead_id, "tenant_id": user.get("tenant_id")},
        {"$set": body},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    r = await db.memoraai_leads.delete_one({"id": lead_id, "tenant_id": user.get("tenant_id")})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}


# ═══════════════════ CONTACTS ═══════════════════
@router.post("/contacts")
async def create_contact(data: ContactCreate, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": data.name.strip(),
        "phone": data.phone.strip(),
        "email": (data.email or "").strip(),
        "whatsapp": (data.whatsapp or data.phone or "").strip(),
        "address": (data.address or "").strip(),
        "description": (data.description or "").strip(),
        "tags": data.tags or [],
        "source": "manual",
        "created_by": user.get("user_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_contacts.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "contact": doc}


@router.get("/contacts")
async def list_contacts(request: Request, limit: int = 200):
    user = await get_current_user(request)
    db = get_db(request)
    items = await db.memoraai_contacts.find(
        {"tenant_id": user.get("tenant_id")}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"contacts": items, "total": len(items)}


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    r = await db.memoraai_contacts.delete_one(
        {"id": contact_id, "tenant_id": user.get("tenant_id")}
    )
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}
