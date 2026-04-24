"""MemoraAI Staff Members API — simple tenant-scoped staff management"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/staff", tags=["memoraai-staff"])


def get_db(request: Request):
    return request.app.state.db


class StaffCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    permissions: Optional[List[str]] = None  # content, leads, contacts, inbox, analytics


@router.get("")
async def list_staff(request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    staff = await db.users.find(
        {"tenant_id": tenant_id, "role": {"$in": ["tenant_staff", "tenant_admin"]}},
        {"_id": 0, "password_hash": 0, "otp": 0},
    ).sort("created_at", -1).to_list(100)
    return {"staff": staff, "total": len(staff)}


@router.post("")
async def add_staff(data: StaffCreate, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id or user.get("role") != "tenant_admin":
        raise HTTPException(status_code=403, detail="Only business admins can add staff")

    # Check duplicate phone
    existing = await db.users.find_one({"phone": data.phone.strip()})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this phone already exists")

    default_password = "memora@123"
    import bcrypt
    pw_hash = bcrypt.hashpw(default_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "phone": data.phone.strip(),
        "email": (data.email or "").strip(),
        "role": "tenant_staff",
        "tenant_id": tenant_id,
        "password_hash": pw_hash,
        "permissions": data.permissions or ["content", "leads", "contacts", "inbox"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("user_id"),
    }
    await db.users.insert_one(doc)
    return {
        "success": True,
        "staff_id": doc["id"],
        "default_password": default_password,
        "message": f"{data.name} added. Share this login: phone {data.phone} / password {default_password}",
    }


@router.delete("/{staff_id}")
async def remove_staff(staff_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    if user.get("role") != "tenant_admin":
        raise HTTPException(status_code=403, detail="Only business admins can remove staff")

    staff = await db.users.find_one({"id": staff_id, "tenant_id": user.get("tenant_id")}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if staff.get("role") == "tenant_admin":
        raise HTTPException(status_code=400, detail="Cannot remove the business admin")
    await db.users.delete_one({"id": staff_id})
    return {"success": True}


@router.put("/{staff_id}/permissions")
async def update_permissions(staff_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    if user.get("role") != "tenant_admin":
        raise HTTPException(status_code=403, detail="Only business admins can update permissions")
    body = await request.json()
    perms = body.get("permissions", [])
    r = await db.users.update_one(
        {"id": staff_id, "tenant_id": user.get("tenant_id")},
        {"$set": {"permissions": perms, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"success": True}
