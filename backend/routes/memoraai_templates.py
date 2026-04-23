"""MemoraAI WhatsApp Template Approval Workflow API"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from models.memoraai import CATEGORY_CONFIGS
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/templates", tags=["memoraai-templates"])


def get_db(request: Request):
    return request.app.state.db


TEMPLATE_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"]
TEMPLATE_STATUSES = ["draft", "pending_review", "submitted", "approved", "rejected"]


@router.get("")
async def list_templates(request: Request, status: str = None):
    """List all WhatsApp templates for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status

    templates = await db.memoraai_wa_templates.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"templates": templates, "count": len(templates)}


@router.post("")
async def create_template(request: Request):
    """Create a new WhatsApp template (draft)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    template = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": body.get("name", ""),
        "category": body.get("category", "MARKETING"),
        "language": body.get("language", "en"),
        "header_text": body.get("header_text", ""),
        "body_text": body.get("body_text", ""),
        "footer_text": body.get("footer_text", ""),
        "buttons": body.get("buttons", []),
        "variables": body.get("variables", []),
        "status": "draft",
        "meta_template_id": None,
        "rejection_reason": None,
        "submitted_at": None,
        "approved_at": None,
        "created_by": user.get("user_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_wa_templates.insert_one(template)
    template.pop("_id", None)
    return {"message": "Template created as draft", "template": template}


@router.put("/{template_id}")
async def update_template(template_id: str, request: Request):
    """Update a template (only drafts can be edited)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    existing = await db.memoraai_wa_templates.find_one(
        {"id": template_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    if existing["status"] not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail="Only draft or rejected templates can be edited")

    update = {}
    for field in ["name", "category", "language", "header_text", "body_text", "footer_text", "buttons", "variables"]:
        if field in body:
            update[field] = body[field]
    update["status"] = "draft"
    update["rejection_reason"] = None
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.memoraai_wa_templates.update_one(
        {"id": template_id, "tenant_id": tenant_id}, {"$set": update}
    )
    updated = await db.memoraai_wa_templates.find_one({"id": template_id}, {"_id": 0})
    return {"message": "Template updated", "template": updated}


@router.post("/{template_id}/submit")
async def submit_template(template_id: str, request: Request):
    """Submit template for Meta approval"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tpl = await db.memoraai_wa_templates.find_one(
        {"id": template_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if not tpl.get("body_text"):
        raise HTTPException(status_code=400, detail="Template body is required")

    # Check WABA config
    waba = await db.waba_configs.find_one({"tenant_id": tenant_id}, {"_id": 0})
    submitted_to_meta = False
    meta_response = None

    if waba and waba.get("access_token") and waba.get("waba_id"):
        # Attempt Meta submission
        import httpx
        try:
            payload = {
                "name": tpl["name"],
                "category": tpl["category"],
                "language": tpl["language"],
                "components": [
                    {"type": "BODY", "text": tpl["body_text"]},
                ]
            }
            if tpl.get("header_text"):
                payload["components"].insert(0, {"type": "HEADER", "format": "TEXT", "text": tpl["header_text"]})
            if tpl.get("footer_text"):
                payload["components"].append({"type": "FOOTER", "text": tpl["footer_text"]})

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://graph.facebook.com/v21.0/{waba['waba_id']}/message_templates",
                    headers={"Authorization": f"Bearer {waba['access_token']}"},
                    json=payload,
                    timeout=15,
                )
                meta_response = resp.json()
                if resp.status_code == 200:
                    submitted_to_meta = True
        except Exception as e:
            meta_response = {"error": str(e)}
            logger.warning(f"Meta template submission failed: {e}")

    new_status = "submitted" if submitted_to_meta else "pending_review"
    await db.memoraai_wa_templates.update_one(
        {"id": template_id, "tenant_id": tenant_id},
        {"$set": {
            "status": new_status,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "meta_template_id": meta_response.get("id") if submitted_to_meta else None,
            "meta_response": meta_response,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {
        "message": f"Template {'submitted to Meta' if submitted_to_meta else 'marked for review'}",
        "status": new_status,
        "submitted_to_meta": submitted_to_meta,
        "meta_response": meta_response,
    }


@router.post("/{template_id}/approve")
async def approve_template(template_id: str, request: Request):
    """Admin: approve a template (internal review)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.memoraai_wa_templates.update_one(
        {"id": template_id, "tenant_id": tenant_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user.get("user_id"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template approved"}


@router.post("/{template_id}/reject")
async def reject_template(template_id: str, request: Request):
    """Admin: reject a template with reason"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    result = await db.memoraai_wa_templates.update_one(
        {"id": template_id, "tenant_id": tenant_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": body.get("reason", "Does not meet guidelines"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template rejected"}


@router.delete("/{template_id}")
async def delete_template(template_id: str, request: Request):
    """Delete a template"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    result = await db.memoraai_wa_templates.delete_one({"id": template_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


@router.post("/auto-generate")
async def auto_generate_templates(request: Request):
    """AI auto-generate category-specific templates"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    cat_slug = (tenant or {}).get("business_category", "real_estate")
    business_name = (tenant or {}).get("company_name", "Business")

    services = await db.business_services.find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}, {"_id": 0}
    ).to_list(10)
    svc_names = [s["name"] for s in services]

    templates_data = [
        {
            "name": f"welcome_{cat_slug}",
            "category": "MARKETING",
            "body_text": f"Hello {{{{1}}}}! Welcome to {business_name}. We offer: {', '.join(svc_names[:4])} and more. How can we help you today?",
            "footer_text": f"{business_name} - Powered by MemoraAI",
        },
        {
            "name": f"appointment_confirm_{cat_slug}",
            "category": "UTILITY",
            "body_text": f"Hi {{{{1}}}}, your {{{{2}}}} at {business_name} is confirmed for {{{{3}}}} at {{{{4}}}}. Reply CANCEL to cancel or RESCHEDULE to change timing.",
            "footer_text": "Appointment Confirmation",
        },
        {
            "name": f"reminder_{cat_slug}",
            "category": "UTILITY",
            "body_text": f"Hi {{{{1}}}}, reminder: your {{{{2}}}} at {business_name} is in {{{{3}}}}. Please be on time. Reply YES to confirm.",
            "footer_text": "Appointment Reminder",
        },
        {
            "name": f"followup_{cat_slug}",
            "category": "MARKETING",
            "body_text": f"Hi {{{{1}}}}, thank you for visiting {business_name}! We'd love your feedback on your {{{{2}}}} experience. How was it? Reply 1-5 (5=best).",
            "footer_text": "We value your feedback",
        },
        {
            "name": f"offer_{cat_slug}",
            "category": "MARKETING",
            "body_text": f"Exclusive offer from {business_name}! {{{{1}}}} on {{{{2}}}}. Valid till {{{{3}}}}. Book now via WhatsApp!",
            "footer_text": "Limited Time Offer",
        },
        {
            "name": f"payment_receipt_{cat_slug}",
            "category": "UTILITY",
            "body_text": f"Payment received! Rs.{{{{1}}}} for {{{{2}}}} at {business_name}. Receipt #{{{{3}}}}. Thank you!",
            "footer_text": "Payment Receipt",
        },
    ]

    created = []
    for tpl_data in templates_data:
        existing = await db.memoraai_wa_templates.find_one(
            {"tenant_id": tenant_id, "name": tpl_data["name"]}, {"_id": 0}
        )
        if existing:
            continue
        template = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": tpl_data["name"],
            "category": tpl_data["category"],
            "language": "en",
            "header_text": "",
            "body_text": tpl_data["body_text"],
            "footer_text": tpl_data.get("footer_text", ""),
            "buttons": [],
            "variables": [],
            "status": "draft",
            "meta_template_id": None,
            "rejection_reason": None,
            "created_by": user.get("user_id", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.memoraai_wa_templates.insert_one(template)
        template.pop("_id", None)
        created.append(template)

    return {"message": f"{len(created)} templates auto-generated", "templates": created}
