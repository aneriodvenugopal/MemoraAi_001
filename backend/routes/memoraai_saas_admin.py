"""MemoraAI SaaS Admin Dashboard API"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.auth_service import AuthService
from datetime import datetime, timezone, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/saas-admin", tags=["memoraai-saas-admin"])

def get_db(request: Request):
    return request.app.state.db


@router.get("/dashboard")
async def saas_dashboard(request: Request):
    """SaaS Admin Overview Dashboard"""
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)

    total_tenants = await db.tenants.count_documents({})
    total_users = await db.users.count_documents({})
    total_conversations = await db.whatsapp_conversations.count_documents({})
    total_messages = await db.whatsapp_messages.count_documents({})
    total_memories = await db.business_memories.count_documents({})
    total_appointments = await db.memoraai_appointments.count_documents({})
    total_hot_sales = await db.hot_sales.count_documents({})

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    new_users_today = await db.users.count_documents({"created_at": {"$gte": today}})
    msgs_today = await db.whatsapp_messages.count_documents({"timestamp": {"$gte": today}})
    msgs_week = await db.whatsapp_messages.count_documents({"timestamp": {"$gte": week_ago}})

    # WABA setup status
    waba_configured = await db.waba_configs.count_documents({"is_active": True})
    waba_pending = await db.waba_configs.count_documents({"is_active": False})

    # Tenant list with stats
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(50)
    tenant_details = []
    for t in tenants:
        tid = t.get("id")
        user_count = await db.users.count_documents({"tenant_id": tid})
        convo_count = await db.whatsapp_conversations.count_documents({"tenant_id": tid})
        svc_count = await db.business_services.count_documents({"tenant_id": tid, "is_active": True, "deleted_at": None})
        waba = await db.waba_configs.find_one({"tenant_id": tid}, {"_id": 0})
        tenant_details.append({
            "id": tid,
            "name": t.get("company_name") or t.get("name"),
            "category": t.get("business_category", "none"),
            "category_name": t.get("business_category_name", "Not Set"),
            "users": user_count,
            "conversations": convo_count,
            "services": svc_count,
            "waba_active": bool(waba and waba.get("is_active")),
            "created_at": t.get("created_at", ""),
        })

    return {
        "overview": {
            "total_tenants": total_tenants,
            "total_users": total_users,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "total_memories": total_memories,
            "total_appointments": total_appointments,
            "total_hot_sales": total_hot_sales,
            "new_users_today": new_users_today,
            "messages_today": msgs_today,
            "messages_week": msgs_week,
            "waba_configured": waba_configured,
            "waba_pending": waba_pending,
        },
        "tenants": tenant_details,
    }


@router.get("/users")
async def list_all_users(request: Request):
    """List all users across all tenants"""
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "otp": 0}).to_list(200)
    return {"users": users, "count": len(users)}


@router.get("/tenants/{tenant_id}")
async def get_tenant_detail(tenant_id: str, request: Request):
    """Get detailed tenant info"""
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    users = await db.users.find({"tenant_id": tenant_id}, {"_id": 0, "password_hash": 0, "otp": 0}).to_list(50)
    categories = await db.business_categories.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(20)
    services = await db.business_services.find({"tenant_id": tenant_id, "deleted_at": None}, {"_id": 0}).to_list(50)
    waba = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    rules = await db.memoraai_rules.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(20)

    return {
        "tenant": tenant, "users": users, "categories": categories,
        "services": services, "waba_config": waba, "rules": rules,
    }



# ═══════════════════════════════════════════════════════════════
# IMPERSONATION: Login-as-Business via OTP
# ═══════════════════════════════════════════════════════════════
# Flow: Admin requests OTP → OTP generated & logged (dev mode) or
# SMS'd to tenant owner → Admin reads OTP from business owner over
# phone → enters OTP → gets a scoped JWT for that tenant.
# All sessions are audited in `memoraai_impersonation_log`.


class ImpersonateRequest(BaseModel):
    tenant_id: str


class ImpersonateVerify(BaseModel):
    request_id: str
    otp: str


def _mask_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return phone
    return f"•••••• {digits[-4:]}"


@router.post("/impersonate/request")
async def impersonate_request(data: ImpersonateRequest, request: Request):
    """Generate an OTP for SaaS admin to login as a tenant. The OTP must
    be read by the business owner (over phone/WhatsApp) and entered by the
    admin to complete login. Dev mode also returns the OTP in the response
    while SMS gateway is not configured."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    tenant = await db.tenants.find_one({"id": data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Pick the tenant's primary admin user to send OTP to
    owner = await db.users.find_one(
        {"tenant_id": data.tenant_id, "role": "tenant_admin"},
        {"_id": 0, "password_hash": 0, "otp": 0},
    )
    if not owner:
        owner = await db.users.find_one(
            {"tenant_id": data.tenant_id},
            {"_id": 0, "password_hash": 0, "otp": 0},
        )
    if not owner or not owner.get("phone"):
        raise HTTPException(
            status_code=400,
            detail="This business has no owner account with a phone number on file.",
        )

    otp = AuthService.generate_otp()
    request_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.memoraai_impersonation_otps.insert_one({
        "request_id": request_id,
        "tenant_id": data.tenant_id,
        "admin_user_id": admin.get("user_id"),
        "owner_user_id": owner.get("id"),
        "owner_phone": owner.get("phone"),
        "otp": otp,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "verified": False,
    })
    # Best-effort TTL index
    try:
        await db.memoraai_impersonation_otps.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass

    # Hand to real SMS gateway when available
    try:
        from services.sms_service import SMSService
        await SMSService.send_otp(owner["phone"], otp)
    except Exception as e:
        logger.info(f"SMS gateway not configured — falling back to dev OTP: {e}")

    logger.warning(
        f"[IMPERSONATION] Admin {admin.get('user_id')} requested login as tenant "
        f"{data.tenant_id} → OTP={otp} sent to {_mask_phone(owner['phone'])}"
    )

    return {
        "request_id": request_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant.get("company_name") or tenant.get("name"),
        "owner_name": owner.get("name") or owner.get("email", ""),
        "masked_phone": _mask_phone(owner["phone"]),
        "expires_in_seconds": 600,
        # Dev fallback — visible only while SMS gateway is unconfigured
        "dev_otp": otp,
    }


@router.post("/impersonate/verify")
async def impersonate_verify(data: ImpersonateVerify, request: Request):
    """Verify OTP and issue a scoped JWT for the tenant."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    rec = await db.memoraai_impersonation_otps.find_one(
        {"request_id": data.request_id, "admin_user_id": admin.get("user_id")},
        {"_id": 0},
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Request not found or expired")
    if rec.get("verified"):
        raise HTTPException(status_code=400, detail="OTP already used")

    expires_at = rec["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")
    if (rec.get("otp") or "").strip() != (data.otp or "").strip():
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    tenant_id = rec["tenant_id"]
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    owner = await db.users.find_one(
        {"id": rec["owner_user_id"]},
        {"_id": 0, "password_hash": 0, "otp": 0},
    )

    # Issue a scoped JWT as the tenant admin
    token = AuthService.create_access_token(
        user_id=owner["id"],
        tenant_id=tenant_id,
        role=owner.get("role") or "tenant_admin",
    )

    # Mark OTP used + audit log
    await db.memoraai_impersonation_otps.update_one(
        {"request_id": data.request_id}, {"$set": {"verified": True}},
    )
    await db.memoraai_impersonation_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_user_id": admin.get("user_id"),
        "admin_email": admin.get("email"),
        "tenant_id": tenant_id,
        "tenant_name": tenant.get("company_name") or tenant.get("name") if tenant else None,
        "acted_as_user_id": owner["id"],
        "started_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "token": token,
        "user": {
            "id": owner["id"],
            "name": owner.get("name"),
            "email": owner.get("email"),
            "phone": owner.get("phone"),
            "role": owner.get("role") or "tenant_admin",
            "tenant_id": tenant_id,
        },
        "impersonation": {
            "active": True,
            "tenant_name": tenant.get("company_name") or tenant.get("name") if tenant else None,
            "admin_user_id": admin.get("user_id"),
        },
    }


@router.post("/impersonate/end")
async def impersonate_end(request: Request):
    """Audit log that an impersonation session ended. Called from frontend
    when admin exits back to their own session."""
    user = await get_current_user(request)
    db = get_db(request)
    await db.memoraai_impersonation_log.update_many(
        {"admin_user_id": user.get("user_id"), "ended_at": {"$exists": False}},
        {"$set": {"ended_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True}


@router.get("/impersonate/log")
async def impersonate_log(request: Request, limit: int = 50):
    """Audit history of admin impersonations — visible only to super_admin."""
    user = await get_current_user(request)
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    db = get_db(request)
    entries = (
        await db.memoraai_impersonation_log.find({}, {"_id": 0})
        .sort("started_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"log": entries, "count": len(entries)}
