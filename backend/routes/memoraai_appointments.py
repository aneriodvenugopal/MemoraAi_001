"""MemoraAI Appointment/Booking Management API (Multi-Category)"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from utils.helpers import serialize_doc
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from services.memoraai_calendar_sync import sync_appointment_to_calendar, delete_synced_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/appointments", tags=["memoraai-appointments"])


def get_db(request: Request):
    return request.app.state.db


class AppointmentCreate(BaseModel):
    customer_phone: str
    customer_name: Optional[str] = None
    service_id: Optional[str] = None
    service_name: str
    category_slug: Optional[str] = None
    appointment_date: str  # ISO date string
    appointment_time: Optional[str] = None  # e.g., "14:30"
    duration_mins: int = 30
    amount: float = 0
    notes: Optional[str] = None
    assigned_to: Optional[str] = None  # staff user ID
    source: str = "manual"  # manual, whatsapp, online


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    amount: Optional[float] = None


@router.get("")
async def list_appointments(
    request: Request,
    status: str = None,
    date: str = None,
    service: str = None,
    page: int = 1,
    limit: int = 50,
):
    """List appointments with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if date:
        query["appointment_date"] = {"$regex": f"^{date}"}
    if service:
        query["service_name"] = {"$regex": service, "$options": "i"}

    skip = (page - 1) * limit
    total = await db.memoraai_appointments.count_documents(query)
    appointments = await db.memoraai_appointments.find(
        query, {"_id": 0}
    ).sort("appointment_date", -1).skip(skip).limit(limit).to_list(limit)

    return {"appointments": appointments, "total": total, "page": page, "limit": limit}


@router.post("")
async def create_appointment(data: AppointmentCreate, request: Request):
    """Create a new appointment/booking"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    cat_slug = data.category_slug or (tenant or {}).get("business_category", "real_estate")

    appointment = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "customer_phone": data.customer_phone,
        "customer_name": data.customer_name or "",
        "service_id": data.service_id,
        "service_name": data.service_name,
        "category_slug": cat_slug,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time or "",
        "duration_mins": data.duration_mins,
        "amount": data.amount,
        "notes": data.notes or "",
        "assigned_to": data.assigned_to,
        "source": data.source,
        "status": "scheduled",
        "created_by": user.get("user_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_appointments.insert_one(appointment)
    appointment.pop("_id", None)

    # Auto-sync to Google Calendar (no-op if not configured / tenant not connected)
    calendar_result = await sync_appointment_to_calendar(db, tenant_id, appointment)
    if calendar_result.get("synced"):
        appointment["google_event_id"] = calendar_result.get("event_id")
        appointment["google_event_link"] = calendar_result.get("event_link")

    return {
        "message": "Appointment created",
        "appointment": appointment,
        "calendar_sync": calendar_result,
    }


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, request: Request):
    """Get appointment details"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    apt = await db.memoraai_appointments.find_one(
        {"id": appointment_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"appointment": apt}


@router.put("/{appointment_id}")
async def update_appointment(appointment_id: str, data: AppointmentUpdate, request: Request):
    """Update appointment"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    if data.status == "completed":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif data.status == "cancelled":
        update["cancelled_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_appointments.update_one(
        {"id": appointment_id, "tenant_id": tenant_id}, {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")

    updated = await db.memoraai_appointments.find_one({"id": appointment_id}, {"_id": 0})
    return {"message": "Appointment updated", "appointment": updated}


@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, request: Request):
    """Delete appointment"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    existing = await db.memoraai_appointments.find_one(
        {"id": appointment_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Best-effort remove from Google Calendar if it was synced
    if existing.get("google_event_id"):
        await delete_synced_event(db, tenant_id, existing["google_event_id"])

    await db.memoraai_appointments.delete_one({"id": appointment_id, "tenant_id": tenant_id})
    return {"message": "Appointment deleted"}


@router.get("/today/summary")
async def today_summary(request: Request):
    """Get today's appointment summary"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"tenant_id": tenant_id, "appointment_date": {"$regex": f"^{today}"}}

    total = await db.memoraai_appointments.count_documents(query)
    scheduled = await db.memoraai_appointments.count_documents({**query, "status": "scheduled"})
    completed = await db.memoraai_appointments.count_documents({**query, "status": "completed"})
    cancelled = await db.memoraai_appointments.count_documents({**query, "status": "cancelled"})
    no_show = await db.memoraai_appointments.count_documents({**query, "status": "no_show"})

    upcoming = await db.memoraai_appointments.find(
        {**query, "status": "scheduled"}, {"_id": 0}
    ).sort("appointment_time", 1).to_list(20)

    return {
        "date": today,
        "total": total,
        "scheduled": scheduled,
        "completed": completed,
        "cancelled": cancelled,
        "no_show": no_show,
        "upcoming": upcoming,
    }


@router.post("/{appointment_id}/complete")
async def mark_completed(appointment_id: str, request: Request):
    """Quick action: mark appointment as completed"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}

    result = await db.memoraai_appointments.update_one(
        {"id": appointment_id, "tenant_id": tenant_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "amount": body.get("amount") if body.get("amount") else None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment marked as completed"}


@router.post("/{appointment_id}/no-show")
async def mark_no_show(appointment_id: str, request: Request):
    """Quick action: mark appointment as no-show"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.memoraai_appointments.update_one(
        {"id": appointment_id, "tenant_id": tenant_id},
        {"$set": {"status": "no_show", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment marked as no-show"}
