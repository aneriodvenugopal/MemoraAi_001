"""MemoraAI SaaS Admin Dashboard API"""
from fastapi import APIRouter, HTTPException, Request
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
    """Return MemoraAI supported business categories for the onboarding form."""
    admin = await get_current_user(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    try:
        from models.memoraai import CATEGORY_CONFIGS
        items = [
            {"slug": k, "name": v.get("name", k.replace("_", " ").title()), "icon": v.get("icon", "")}
            for k, v in CATEGORY_CONFIGS.items()
        ]
    except Exception:
        items = []
    return {"categories": items, "total": len(items)}
