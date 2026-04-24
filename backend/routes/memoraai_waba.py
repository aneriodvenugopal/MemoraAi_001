"""MemoraAI Self-Service WABA Setup Routes"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from models.memoraai import WABAConfig, WABAConfigUpdate
from services import category_registry
from utils.helpers import serialize_doc
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/waba", tags=["memoraai-waba"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/config")
async def get_waba_config(request: Request):
    """Get current WABA configuration for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant assigned")

    config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        return {"config": None, "message": "WABA not configured yet"}

    # Mask the access token for security
    if config.get("access_token"):
        token = config["access_token"]
        config["access_token_masked"] = f"{token[:10]}...{token[-4:]}" if len(token) > 14 else "****"
        config["has_token"] = True
    else:
        config["has_token"] = False

    return {"config": config}


@router.post("/config")
async def save_waba_config(data: WABAConfigUpdate, request: Request):
    """Save or update WABA configuration"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant assigned")

    existing = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if existing:
        await db.waba_configs.update_one(
            {"tenant_id": tenant_id},
            {"$set": update_data}
        )
        msg = "WABA configuration updated"
    else:
        config = WABAConfig(tenant_id=tenant_id, **update_data)
        config_doc = serialize_doc(config.model_dump())
        await db.waba_configs.insert_one(config_doc)
        msg = "WABA configuration created"

    # Update tenant WABA mapping if phone_number_id provided
    if data.phone_number_id and data.waba_id:
        await db.whatsapp_tenant_mapping.update_one(
            {"waba_id": data.waba_id},
            {"$set": {
                "tenant_id": tenant_id,
                "waba_id": data.waba_id,
                "phone_number_id": data.phone_number_id,
                "phone_number": data.phone_number or "",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    result_config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    return {"message": msg, "config": result_config}


@router.post("/verify")
async def verify_waba_connection(request: Request):
    """Verify WABA connection by sending a test message"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="WABA not configured")

    if not config.get("access_token") or not config.get("phone_number_id"):
        raise HTTPException(status_code=400, detail="Missing access token or phone number ID")

    # Try to verify the connection
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
            else:
                return {"verified": False, "error": resp.text}
    except Exception as e:
        return {"verified": False, "error": str(e)}


@router.post("/generate-templates")
async def generate_templates(request: Request):
    """AI-generate WhatsApp message templates based on business category"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})

    category_slug = tenant.get("business_category", "real_estate") if tenant else "real_estate"
    cat_config = await category_registry.get(db, category_slug)
    if not cat_config:
        # Fallback to real_estate if the tenant's category was never in the registry
        cat_config = await category_registry.get(db, "real_estate") or {"name": category_slug}
    business_name = (config or {}).get("business_name") or (tenant or {}).get("company_name", "Business")

    services = await db.business_services.find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}, {"_id": 0}
    ).to_list(20)

    service_names = [s["name"] for s in services]

    templates = [
        {
            "name": f"welcome_{category_slug}",
            "category": "MARKETING",
            "language": "en",
            "body": f"Hello {{{{1}}}}! Welcome to {business_name}. We offer: {', '.join(service_names[:4])} and more. How can we help you today?",
            "description": "Welcome message for new customers",
        },
        {
            "name": f"appointment_reminder_{category_slug}",
            "category": "UTILITY",
            "language": "en",
            "body": f"Hi {{{{1}}}}, this is a reminder for your {{{{2}}}} appointment at {business_name} on {{{{3}}}}. Reply YES to confirm or RESCHEDULE to change timing.",
            "description": "Appointment/booking reminder",
        },
        {
            "name": f"followup_{category_slug}",
            "category": "MARKETING",
            "language": "en",
            "body": f"Hi {{{{1}}}}, thank you for your interest in {business_name}. We wanted to follow up on your enquiry about {{{{2}}}}. Would you like to schedule a consultation? Reply YES or call us.",
            "description": "Follow-up message for leads",
        },
        {
            "name": f"offer_{category_slug}",
            "category": "MARKETING",
            "language": "en",
            "body": f"Special offer from {business_name}! Get {{{{1}}}} on {{{{2}}}}. Limited time offer valid till {{{{3}}}}. Book now to avail!",
            "description": "Promotional offer template",
        },
    ]

    await db.waba_configs.update_one(
        {"tenant_id": tenant_id},
        {"$set": {
            "templates_generated": [t["name"] for t in templates],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"templates": templates, "count": len(templates), "message": "Templates generated. Submit these to Meta for approval."}


@router.get("/templates")
async def list_generated_templates(request: Request):
    """List previously generated templates"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    config = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        return {"templates": [], "message": "WABA not configured"}

    return {"templates": config.get("templates_generated", []), "config_id": config.get("id")}
