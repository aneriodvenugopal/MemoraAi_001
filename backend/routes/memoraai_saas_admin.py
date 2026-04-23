"""MemoraAI SaaS Admin Dashboard API"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
import logging

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
