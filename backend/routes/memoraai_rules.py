"""MemoraAI Business Rules API - Custom AI behavior rules per tenant"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/rules", tags=["memoraai-rules"])

def get_db(request: Request):
    return request.app.state.db

DEFAULT_RULES = [
    {"category": "greeting", "title": "Greeting Style", "rule": "Always greet returning customers by name. Use respectful Telugu/Hindi suffixes like garu, ji, mam.", "is_active": True},
    {"category": "language", "title": "Language Preference", "rule": "Respond in the same language the customer uses. Support Telugu, Hindi, and English.", "is_active": True},
    {"category": "pricing", "title": "Price Disclosure", "rule": "Share prices openly when asked. Never hide pricing information.", "is_active": True},
    {"category": "followup", "title": "Follow-up Timing", "rule": "Send follow-up after 24 hours if customer hasn't responded. Maximum 3 follow-ups per lead.", "is_active": True},
    {"category": "escalation", "title": "Human Escalation", "rule": "If customer asks for manager or complains, immediately notify staff. Don't try to resolve complaints alone.", "is_active": True},
    {"category": "booking", "title": "Booking Confirmation", "rule": "Always confirm appointment details (date, time, service, price) before booking. Send reminder 1 hour before.", "is_active": True},
    {"category": "closing", "title": "Closing Hours", "rule": "Between 10 PM and 8 AM, send auto-reply: 'Thank you for your message. Our team will respond first thing in the morning.'", "is_active": True},
    {"category": "sensitive", "title": "Sensitive Topics", "rule": "For legal, financial, or medical advice, always suggest consulting a professional. Don't give direct advice.", "is_active": True},
]


@router.get("")
async def list_rules(request: Request):
    """List all business rules for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    rules = await db.memoraai_rules.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("sort_order", 1).to_list(100)

    if not rules and tenant_id:
        # Seed default rules
        for i, r in enumerate(DEFAULT_RULES):
            doc = {
                "id": str(uuid.uuid4()), "tenant_id": tenant_id,
                **r, "sort_order": i,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.memoraai_rules.insert_one(doc)
        rules = await db.memoraai_rules.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)

    return {"rules": rules, "count": len(rules)}


@router.post("")
async def create_rule(request: Request):
    """Create a new business rule"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    doc = {
        "id": str(uuid.uuid4()), "tenant_id": tenant_id,
        "category": body.get("category", "custom"),
        "title": body.get("title", ""),
        "rule": body.get("rule", ""),
        "is_active": True,
        "sort_order": body.get("sort_order", 99),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_rules.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Rule created", "rule": doc}


@router.put("/{rule_id}")
async def update_rule(rule_id: str, request: Request):
    """Update a business rule"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "tenant_id"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_rules.update_one(
        {"id": rule_id, "tenant_id": tenant_id}, {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    updated = await db.memoraai_rules.find_one({"id": rule_id}, {"_id": 0})
    return {"message": "Rule updated", "rule": updated}


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, request: Request):
    """Delete a business rule"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    result = await db.memoraai_rules.delete_one({"id": rule_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}


@router.post("/{rule_id}/toggle")
async def toggle_rule(rule_id: str, request: Request):
    """Toggle rule active/inactive"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    rule = await db.memoraai_rules.find_one({"id": rule_id, "tenant_id": tenant_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    new_status = not rule.get("is_active", True)
    await db.memoraai_rules.update_one({"id": rule_id}, {"$set": {"is_active": new_status}})
    return {"message": f"Rule {'activated' if new_status else 'deactivated'}", "is_active": new_status}


@router.get("/active")
async def get_active_rules(request: Request):
    """Get all active rules formatted for AI prompt injection"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    rules = await db.memoraai_rules.find(
        {"tenant_id": tenant_id, "is_active": True}, {"_id": 0}
    ).to_list(50)

    rules_text = "\n".join([f"- [{r.get('category','general')}] {r.get('rule','')}" for r in rules])
    return {"rules": rules, "rules_text": rules_text, "count": len(rules)}
