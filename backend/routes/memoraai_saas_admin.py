"""MemoraAI SaaS Admin Dashboard API"""
import os
import io
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from middleware.auth import get_current_user
from services.auth_service import AuthService
from datetime import datetime, timezone, timedelta
import logging
import uuid
import secrets
import string

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
    if waba and waba.get("access_token"):
        tok = waba["access_token"]
        waba["access_token_masked"] = f"{tok[:10]}...{tok[-4:]}" if len(tok) > 14 else "****"
        waba.pop("access_token", None)  # never expose raw token even to admin UI
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


class OnboardBusinessRequest(BaseModel):
    business_name: str
    category: Optional[str] = ""
    city: Optional[str] = ""
    logo_url: Optional[str] = ""
    owner_name: str
    owner_phone: str
    owner_email: Optional[str] = ""
    plan: Optional[str] = "trial"
    # Optional WABA creds — if provided, save immediately
    waba_id: Optional[str] = ""
    phone_number_id: Optional[str] = ""
    phone_number: Optional[str] = ""
    access_token: Optional[str] = ""
    business_name_on_wa: Optional[str] = ""


class UpdateBusinessRequest(BaseModel):
    business_name: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None


class WABACredsRequest(BaseModel):
    waba_id: str
    phone_number_id: str
    phone_number: Optional[str] = ""
    access_token: str
    business_name_on_wa: Optional[str] = ""


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


# ═══════════════════════════════════════════════════════
# ONBOARDING — SaaS Admin creates a new business in one call
# ═══════════════════════════════════════════════════════
def _gen_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/tenants")
async def onboard_new_business(data: OnboardBusinessRequest, request: Request):
    """One-shot onboarding: create tenant + owner user + optional WABA config.
    Only super_admin can call this.
    Returns the generated password for the admin to share with the new business owner."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)

    # Normalise inputs
    phone = (data.owner_phone or "").strip().replace(" ", "")
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid 10+ digit owner phone required")
    business_name = (data.business_name or "").strip()
    if not business_name:
        raise HTTPException(status_code=400, detail="Business name is required")
    owner_name = (data.owner_name or "").strip() or business_name

    # Prevent duplicates
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(status_code=400, detail="A user with this phone already exists")

    # Resolve tenant_admin role
    role_doc = await db.roles.find_one({"slug": "tenant_admin"}, {"_id": 0})
    role_id = role_doc["id"] if role_doc else None

    now = datetime.now(timezone.utc).isoformat()

    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant_doc = {
        "id": tenant_id,
        "name": business_name,
        "company_name": business_name,
        "business_category": data.category or "",
        "business_category_name": data.category or "",
        "city": data.city or "",
        "logo_url": data.logo_url or "",
        "owner_name": owner_name,
        "owner_phone": phone,
        "owner_email": (data.owner_email or "").strip(),
        "is_active": True,
        "subscription_status": data.plan or "trial",
        "onboarding_step": "onboarded_by_admin",
        "onboarded_by_admin_id": admin.get("user_id") or admin.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.tenants.insert_one(tenant_doc)

    # Create owner user with generated password
    password = _gen_password(10)
    import bcrypt
    pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": owner_name,
        "phone": phone,
        "email": (data.owner_email or "").strip(),
        "role_id": role_id,
        "role": "tenant_admin",
        "tenant_id": tenant_id,
        "password_hash": pw_hash,
        "is_active": True,
        "created_at": now,
        "onboarded_by_admin_id": admin.get("user_id") or admin.get("id"),
    }
    await db.users.insert_one(user_doc)

    # Optional: save WABA creds if provided
    waba_saved = False
    if data.access_token and data.phone_number_id:
        await db.waba_configs.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "waba_id": data.waba_id or "",
            "phone_number_id": data.phone_number_id,
            "phone_number": data.phone_number or "",
            "access_token": data.access_token,
            "business_name": data.business_name_on_wa or business_name,
            "is_active": False,
            "is_verified": False,
            "created_at": now,
            "updated_at": now,
        })
        if data.waba_id:
            await db.whatsapp_tenant_mapping.update_one(
                {"waba_id": data.waba_id},
                {"$set": {
                    "tenant_id": tenant_id,
                    "waba_id": data.waba_id,
                    "phone_number_id": data.phone_number_id,
                    "phone_number": data.phone_number or "",
                    "updated_at": now,
                }},
                upsert=True,
            )
        waba_saved = True

    return {
        "success": True,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "business_name": business_name,
        "login": {
            "phone": phone,
            "password": password,
            "login_url": "https://memoraai.in/login",
        },
        "waba_saved": waba_saved,
        "message": f"{business_name} onboarded. Share login: phone {phone} / password {password}",
    }


@router.put("/tenants/{tenant_id}")
async def update_business(tenant_id: str, data: UpdateBusinessRequest, request: Request):
    """SaaS admin updates a business's profile (name, category, logo, plan, etc.)."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business not found")

    update = {}
    if data.business_name is not None:
        update["company_name"] = data.business_name.strip()
        update["name"] = data.business_name.strip()
    if data.category is not None:
        update["business_category"] = data.category
    if data.city is not None:
        update["city"] = data.city
    if data.logo_url is not None:
        update["logo_url"] = data.logo_url
    if data.owner_name is not None:
        update["owner_name"] = data.owner_name
    if data.owner_email is not None:
        update["owner_email"] = data.owner_email
    if data.plan is not None:
        update["subscription_status"] = data.plan
    if data.is_active is not None:
        update["is_active"] = data.is_active
    if not update:
        return {"success": True, "message": "Nothing to update"}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.tenants.update_one({"id": tenant_id}, {"$set": update})
    if data.owner_name is not None or data.owner_email is not None:
        user_update = {}
        if data.owner_name is not None:
            user_update["name"] = data.owner_name
        if data.owner_email is not None:
            user_update["email"] = data.owner_email
        if user_update:
            await db.users.update_one(
                {"tenant_id": tenant_id, "role": "tenant_admin"},
                {"$set": user_update},
            )

    updated = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    return {"success": True, "tenant": updated}


@router.post("/tenants/{tenant_id}/waba")
async def save_tenant_waba(tenant_id: str, data: WABACredsRequest, request: Request):
    """SaaS admin saves/updates Meta WABA credentials for a tenant."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Business not found")

    now = datetime.now(timezone.utc).isoformat()
    update_fields = {
        "waba_id": data.waba_id.strip(),
        "phone_number_id": data.phone_number_id.strip(),
        "phone_number": (data.phone_number or "").strip(),
        "access_token": data.access_token.strip(),
        "business_name": (data.business_name_on_wa or tenant.get("company_name") or "").strip(),
        "updated_at": now,
    }
    existing = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if existing:
        await db.waba_configs.update_one({"tenant_id": tenant_id}, {"$set": update_fields})
    else:
        update_fields.update({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "is_active": False,
            "is_verified": False,
            "created_at": now,
        })
        await db.waba_configs.insert_one(update_fields)

    await db.whatsapp_tenant_mapping.update_one(
        {"waba_id": data.waba_id.strip()},
        {"$set": {
            "tenant_id": tenant_id,
            "waba_id": data.waba_id.strip(),
            "phone_number_id": data.phone_number_id.strip(),
            "phone_number": (data.phone_number or "").strip(),
            "updated_at": now,
        }},
        upsert=True,
    )

    return {"success": True, "message": "WABA credentials saved"}


@router.post("/tenants/{tenant_id}/waba/verify")
async def verify_tenant_waba(tenant_id: str, request: Request):
    """SaaS admin calls Meta Graph to verify tenant WABA creds."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="WABA not configured for this business")
    if not config.get("access_token") or not config.get("phone_number_id"):
        raise HTTPException(status_code=400, detail="Missing access token or phone number ID")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://graph.facebook.com/v21.0/{config['phone_number_id']}",
                headers={"Authorization": f"Bearer {config['access_token']}"},
                timeout=10,
            )
            if resp.status_code == 200:
                phone_data = resp.json()
                await db.waba_configs.update_one(
                    {"tenant_id": tenant_id},
                    {"$set": {
                        "is_verified": True,
                        "is_active": True,
                        "verified_phone_name": phone_data.get("verified_name", ""),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                return {"verified": True, "phone_data": phone_data}
            return {"verified": False, "error": resp.text}
    except Exception as e:
        return {"verified": False, "error": str(e)}


@router.post("/tenants/{tenant_id}/reset-password")
async def reset_owner_password(tenant_id: str, request: Request):
    """Generate a fresh password for the business owner. Useful when client loses access."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    db = get_db(request)
    owner = await db.users.find_one(
        {"tenant_id": tenant_id, "role": "tenant_admin"}, {"_id": 0}
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    new_password = _gen_password(10)
    import bcrypt
    pw_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.users.update_one(
        {"id": owner["id"]},
        {"$set": {"password_hash": pw_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {
        "success": True,
        "phone": owner.get("phone"),
        "new_password": new_password,
    }


@router.get("/business-categories")
async def list_business_categories(request: Request):
    """Return MemoraAI supported business categories (from dynamic DB registry) for the onboarding form."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    from services import category_registry
    db = get_db(request)
    cats = await category_registry.get_all(db, active_only=True)
    items = [{"slug": c["slug"], "name": c["name"], "icon": c.get("icon", "")} for c in cats]
    return {"categories": items, "total": len(items)}


# ═══════════════════════════════════════════════════════
# CATEGORY REGISTRY — admin CRUD
# ═══════════════════════════════════════════════════════
class CategoryCreate(BaseModel):
    slug: str
    name: str
    icon: Optional[str] = "briefcase"
    description: Optional[str] = ""
    default_services: Optional[list] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ServicePayload(BaseModel):
    name: str
    description: Optional[str] = ""
    duration_mins: Optional[int] = 0
    price: Optional[float] = 0


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_mins: Optional[int] = None
    price: Optional[float] = None


def _require_super_admin(user):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")


@router.get("/categories")
async def admin_list_categories(request: Request, include_inactive: bool = False):
    """List all categories (active by default). Set include_inactive=1 to see soft-deleted too."""
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    cats = await category_registry.get_all(db, active_only=not include_inactive)
    return {"categories": cats, "total": len(cats)}


@router.post("/categories")
async def admin_create_category(data: CategoryCreate, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    try:
        cat = await category_registry.create(db, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "category": cat}


@router.put("/categories/{slug}")
async def admin_update_category(slug: str, data: CategoryUpdate, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    try:
        cat = await category_registry.update(db, slug, data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"success": True, "category": cat}


@router.delete("/categories/{slug}")
async def admin_delete_category(slug: str, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    ok = await category_registry.delete(db, slug)
    if not ok:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True, "message": f"Category '{slug}' removed"}


@router.post("/categories/{slug}/services")
async def admin_add_service(slug: str, data: ServicePayload, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    try:
        svc = await category_registry.add_service(db, slug, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"success": True, "service": svc}


@router.put("/categories/{slug}/services/{service_id}")
async def admin_update_service(slug: str, service_id: str, data: ServiceUpdate, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    try:
        svc = await category_registry.update_service(db, slug, service_id, data.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True, "service": svc}


@router.delete("/categories/{slug}/services/{service_id}")
async def admin_delete_service(slug: str, service_id: str, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    from services import category_registry
    db = get_db(request)
    ok = await category_registry.delete_service(db, slug, service_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True}


# ═══════════════════════════════════════════════════════
# ANALYTICS — aggregated platform-wide metrics
# ═══════════════════════════════════════════════════════
@router.get("/analytics")
async def saas_analytics(request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    db = get_db(request)

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # --- Tenant distribution by plan ---
    plans = {}
    async for t in db.tenants.find({}, {"_id": 0, "subscription_status": 1}):
        key = t.get("subscription_status") or "trial"
        plans[key] = plans.get(key, 0) + 1

    # --- Tenant distribution by category ---
    by_category = {}
    async for t in db.tenants.find({}, {"_id": 0, "business_category_name": 1, "business_category": 1}):
        key = t.get("business_category_name") or (t.get("business_category") or "Not Set")
        by_category[key] = by_category.get(key, 0) + 1
    category_dist = sorted(
        [{"name": k, "count": v} for k, v in by_category.items()],
        key=lambda x: x["count"], reverse=True
    )[:15]

    # --- Tenants by activity (top 10 by conversations this month) ---
    pipeline = [
        {"$match": {"created_at": {"$gte": month_ago}} if False else {}},
        {"$group": {"_id": "$tenant_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_convs = []
    async for row in db.whatsapp_conversations.aggregate(pipeline):
        tid = row["_id"]
        if not tid:
            continue
        t = await db.tenants.find_one({"id": tid}, {"_id": 0, "company_name": 1, "name": 1})
        top_convs.append({
            "tenant_id": tid,
            "name": (t or {}).get("company_name") or (t or {}).get("name") or "Unknown",
            "conversations": row["count"],
        })

    # --- Growth (tenants created per week, last 8 weeks) ---
    growth = []
    for w in range(8, 0, -1):
        start = (now - timedelta(days=w * 7)).isoformat()
        end = (now - timedelta(days=(w - 1) * 7)).isoformat()
        c = await db.tenants.count_documents({"created_at": {"$gte": start, "$lt": end}})
        growth.append({"label": f"W-{w - 1}" if w > 1 else "This week", "count": c})

    # --- Activation funnel ---
    total_tenants = await db.tenants.count_documents({})
    with_waba = await db.waba_configs.count_documents({"is_active": True})
    with_content = len(await db.memoraai_content.distinct("tenant_id"))
    with_chats = len(await db.whatsapp_conversations.distinct("tenant_id"))
    funnel = [
        {"label": "Signed up", "count": total_tenants, "pct": 100},
        {"label": "WABA connected", "count": with_waba, "pct": round((with_waba / max(1, total_tenants)) * 100)},
        {"label": "Uploaded content", "count": with_content, "pct": round((with_content / max(1, total_tenants)) * 100)},
        {"label": "Got first chat", "count": with_chats, "pct": round((with_chats / max(1, total_tenants)) * 100)},
    ]

    # --- Message volume (today / week / month) ---
    msgs_today = await db.whatsapp_messages.count_documents({"timestamp": {"$gte": today}})
    msgs_week = await db.whatsapp_messages.count_documents({"timestamp": {"$gte": week_ago}})
    msgs_month = await db.whatsapp_messages.count_documents({"timestamp": {"$gte": month_ago}})

    # --- Revenue proxy (plan price x count) ---
    plan_price = {"trial": 0, "starter": 1500, "business": 5000, "premium": 9000}
    mrr = sum(plans.get(p, 0) * price for p, price in plan_price.items())

    return {
        "generated_at": now.isoformat(),
        "totals": {
            "tenants": total_tenants,
            "active_tenants": total_tenants - plans.get("paused", 0),
            "waba_active": with_waba,
            "msgs_today": msgs_today,
            "msgs_week": msgs_week,
            "msgs_month": msgs_month,
            "estimated_mrr": mrr,
        },
        "plan_distribution": [
            {"plan": k, "count": v, "price": plan_price.get(k, 0)} for k, v in plans.items()
        ],
        "category_distribution": category_dist,
        "top_tenants": top_convs,
        "growth": growth,
        "activation_funnel": funnel,
    }


# ═══════════════════════════════════════════════════════
# PLATFORM SETTINGS — single-doc configuration
# ═══════════════════════════════════════════════════════
_SETTINGS_ID = "platform-settings"


async def _get_platform_settings(db):
    """Return current settings doc, filling in defaults on first read."""
    doc = await db.platform_settings.find_one({"id": _SETTINGS_ID}, {"_id": 0})
    if not doc:
        public_base = (
            os.environ.get("PUBLIC_SITE_URL")
            or os.environ.get("FRONTEND_URL")
            or "https://memoraai.in"
        ).rstrip("/")
        doc = {
            "id": _SETTINGS_ID,
            "platform_name": "MemoraAI",
            "support_whatsapp": "+916309356590",
            "support_email": "support@memoraai.in",
            "marketing_tagline": "Own Business GPT on WhatsApp",
            "default_trial_days": 14,
            "plan_prices": {"trial": 0, "starter": 1500, "business": 5000, "premium": 9000},
            "signups_open": True,
            "impersonate_require_otp": True,
            "ai_default_model": "gpt-4o-mini",
            "sms_provider": "sms_login",
            "webhook_callback_url": f"{public_base}/api/whatsapp/webhook",
            "webhook_verify_token": os.environ.get("META_WHATSAPP_VERIFY_TOKEN", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.platform_settings.insert_one(doc)
    return doc


@router.get("/settings")
async def get_settings(request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    db = get_db(request)
    doc = await _get_platform_settings(db)
    # Hide id field from response
    doc.pop("id", None)
    # Expose integration statuses (masked)
    env_status = {
        "meta_whatsapp": bool(os.environ.get("META_WHATSAPP_ACCESS_TOKEN")),
        "meta_whatsapp_mode": os.environ.get("META_WHATSAPP_MODE", "TEST"),
        "gemini": bool(os.environ.get("GEMINI_API_KEY")),
        "openai": bool(os.environ.get("OPENAI_API_KEY")),
        "emergent_llm": bool(os.environ.get("EMERGENT_LLM_KEY")),
        "razorpay": bool(os.environ.get("RAZORPAY_KEY_ID")),
        "stripe": bool(os.environ.get("STRIPE_API_KEY")),
        "payu": bool(os.environ.get("PAYU_CLIENT_ID")),
        "msg91_sms": bool(os.environ.get("MSG91_AUTH_KEY")),
        "sms_login": bool(os.environ.get("SMS_LOGIN_API_KEY")),
        "resend_email": bool(os.environ.get("RESEND_API_KEY")),
        "firebase": bool(os.environ.get("FIREBASE_CREDENTIALS")),
        "heygen": bool(os.environ.get("HEYGEN_API_KEY")),
        "google_auth": bool(os.environ.get("GOOGLE_CLIENT_ID")),
    }
    return {"settings": doc, "integrations": env_status}


class PlatformSettingsUpdate(BaseModel):
    platform_name: Optional[str] = None
    support_whatsapp: Optional[str] = None
    support_email: Optional[str] = None
    marketing_tagline: Optional[str] = None
    default_trial_days: Optional[int] = None
    plan_prices: Optional[dict] = None
    signups_open: Optional[bool] = None
    impersonate_require_otp: Optional[bool] = None
    ai_default_model: Optional[str] = None
    sms_provider: Optional[str] = None
    webhook_callback_url: Optional[str] = None
    webhook_verify_token: Optional[str] = None


@router.put("/settings")
async def update_settings(data: PlatformSettingsUpdate, request: Request):
    admin = await get_current_user(request)
    _require_super_admin(admin)
    db = get_db(request)
    await _get_platform_settings(db)  # ensure exists

    update = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        return {"success": True, "message": "Nothing to update"}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one({"id": _SETTINGS_ID}, {"$set": update})
    fresh = await db.platform_settings.find_one({"id": _SETTINGS_ID}, {"_id": 0})
    fresh.pop("id", None)
    return {"success": True, "settings": fresh}


# ═══════════════════════════════════════════════════════
# LOGO UPLOAD — replaces /memoraai-logo.png and /memoraai-icon.png
# ═══════════════════════════════════════════════════════

_PUBLIC_DIR = Path("/app/frontend/public")
_LOGO_PATH = _PUBLIC_DIR / "memoraai-logo.png"
_ICON_PATH = _PUBLIC_DIR / "memoraai-icon.png"


def _process_logo_image(raw_bytes: bytes, remove_dark_bg: bool = True) -> tuple[bytes, bytes]:
    """
    Process uploaded logo:
      - if remove_dark_bg: detect bright (logo) pixels and make near-black background transparent
      - tightly crop to logo bounds
      - return (full_logo_png_bytes, square_icon_png_bytes)
    """
    from PIL import Image
    import numpy as np

    im = Image.open(io.BytesIO(raw_bytes)).convert("RGBA")
    arr = np.array(im).astype(np.int32)

    if remove_dark_bg:
        bright = arr[:, :, :3].max(axis=2)
        # Locate the actual logo glyph area (bright pixels) for cropping
        bright_mask = bright > 200
        if not bright_mask.any():
            # fallback: trust the image as-is, just crop on alpha
            cropped = im
        else:
            ys, xs = np.where(bright_mask)
            x1, y1 = max(0, int(xs.min()) - 10), max(0, int(ys.min()) - 10)
            x2, y2 = int(xs.max()) + 10, int(ys.max()) + 10
            cropped_im = im.crop((x1, y1, x2 + 1, y2 + 1))

            # Apply alpha gradient: dark background -> transparent, bright glyph -> opaque
            arr2 = np.array(cropped_im).astype(np.int32)
            bright2 = arr2[:, :, :3].max(axis=2)
            alpha = np.clip((bright2 - 130) * 255.0 / (180 - 130), 0, 255).astype(np.uint8)
            arr2[:, :, 3] = alpha
            cropped = Image.fromarray(arr2.astype(np.uint8), "RGBA")

            # Trim by alpha
            ar = np.array(cropped)
            amask = ar[:, :, 3] > 30
            if amask.any():
                ys, xs = np.where(amask)
                cropped = cropped.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    else:
        # Keep existing alpha; trim by alpha if present
        ar = np.array(im)
        amask = ar[:, :, 3] > 10
        if amask.any():
            ys, xs = np.where(amask)
            cropped = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        else:
            cropped = im

    # Add small margin
    margin = 20
    w, h = cropped.size
    canvas = Image.new("RGBA", (w + 2 * margin, h + 2 * margin), (0, 0, 0, 0))
    canvas.paste(cropped, (margin, margin), cropped)

    logo_buf = io.BytesIO()
    canvas.save(logo_buf, "PNG", optimize=True)

    # Build square icon: assume left ~32% is the icon mark; if not, fall back to centered crop
    cw, ch = cropped.size
    mark = cropped.crop((0, 0, max(1, int(cw * 0.32)), ch))
    ma = np.array(mark)
    amask = ma[:, :, 3] > 30
    if amask.any():
        ys, xs = np.where(amask)
        mark = mark.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    mw, mh = mark.size
    side = max(mw, mh) + 30
    icon_canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    icon_canvas.paste(mark, ((side - mw) // 2, (side - mh) // 2), mark)
    icon_canvas = icon_canvas.resize((512, 512), Image.LANCZOS)
    icon_buf = io.BytesIO()
    icon_canvas.save(icon_buf, "PNG", optimize=True)

    return logo_buf.getvalue(), icon_buf.getvalue()


@router.post("/upload-logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    remove_dark_bg: bool = Form(True),
):
    """
    Upload a new MemoraAI logo. Replaces:
      - /app/frontend/public/memoraai-logo.png  (full wordmark)
      - /app/frontend/public/memoraai-icon.png  (512x512 square mark)

    If `remove_dark_bg` is true, near-black pixels are converted to transparent
    and the image is auto-cropped tightly around the bright glyph.
    """
    admin = await get_current_user(request)
    _require_super_admin(admin)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file (PNG/JPG)")

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo file too large (max 10MB)")

    try:
        logo_bytes, icon_bytes = _process_logo_image(raw, remove_dark_bg=bool(remove_dark_bg))
    except Exception as e:
        logger.exception("Logo processing failed")
        raise HTTPException(status_code=400, detail=f"Could not process image: {e}")

    _PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    _LOGO_PATH.write_bytes(logo_bytes)
    _ICON_PATH.write_bytes(icon_bytes)

    return {
        "success": True,
        "logo_url": "/memoraai-logo.png",
        "icon_url": "/memoraai-icon.png",
        "logo_size_kb": round(len(logo_bytes) / 1024, 1),
        "icon_size_kb": round(len(icon_bytes) / 1024, 1),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
