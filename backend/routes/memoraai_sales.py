"""MemoraAI Hot Sales Mode + Abrupt Sales Detection Routes"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from models.memoraai import HotSale, HotSaleCreate, SalesAlert
from utils.helpers import serialize_doc
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/sales", tags=["memoraai-sales"])


def get_db(request: Request):
    return request.app.state.db


# ─── Hot Sales Mode ─────────────────────────────────────────────

@router.get("/hot")
async def list_hot_sales(request: Request, status: str = "active"):
    """List hot sales entries for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if status != "all":
        query["status"] = status

    sales = await db.hot_sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"hot_sales": sales, "count": len(sales)}


@router.post("/hot")
async def create_hot_sale(data: HotSaleCreate, request: Request):
    """Create a hot sale entry (manual override by owner/staff)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    follow_up_dt = None
    if data.follow_up_at:
        try:
            follow_up_dt = datetime.fromisoformat(data.follow_up_at)
        except Exception:
            pass

    sale = HotSale(
        tenant_id=tenant_id,
        customer_phone=data.customer_phone,
        customer_name=data.customer_name,
        service_id=data.service_id,
        service_name=data.service_name,
        category_slug=data.category_slug,
        notes=data.notes,
        priority=data.priority,
        amount=data.amount,
        assigned_to=data.assigned_to,
        created_by=user.get("user_id", ""),
        follow_up_at=follow_up_dt,
    )
    sale_doc = serialize_doc(sale.model_dump())
    await db.hot_sales.insert_one(sale_doc)
    del sale_doc["_id"]
    return {"message": "Hot sale created", "hot_sale": sale_doc}


@router.put("/hot/{sale_id}")
async def update_hot_sale(sale_id: str, request: Request):
    """Update a hot sale entry"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "tenant_id", "created_at"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    if body.get("status") == "converted":
        update["converted_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.hot_sales.update_one(
        {"id": sale_id, "tenant_id": tenant_id},
        {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Hot sale not found")

    updated = await db.hot_sales.find_one({"id": sale_id}, {"_id": 0})
    return {"message": "Hot sale updated", "hot_sale": updated}


@router.delete("/hot/{sale_id}")
async def delete_hot_sale(sale_id: str, request: Request):
    """Delete a hot sale entry"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.hot_sales.delete_one({"id": sale_id, "tenant_id": tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hot sale not found")
    return {"message": "Hot sale deleted"}


@router.get("/hot/stats")
async def hot_sales_stats(request: Request):
    """Get hot sales statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    active = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active"})
    converted = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "converted"})
    urgent = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "priority": "urgent"})

    return {
        "active": active,
        "converted": converted,
        "urgent": urgent,
        "total": active + converted,
    }


# ─── Abrupt Sales Discussion Detection ──────────────────────────

ABRUPT_SALES_KEYWORDS = [
    "buy now", "book now", "i want to buy", "ready to pay", "final price",
    "give me discount", "best price", "confirm booking", "done deal",
    "let's close", "i'll take it", "payment ready", "advance payment",
    "send payment link", "booking amount", "token amount", "ready",
    "naku kavali", "book cheyandi", "rate cheppandi", "entha price",
    "discount ivvandi", "final rate", "cheyyandi", "payment chesthanu",
]


@router.get("/alerts")
async def list_sales_alerts(request: Request, status: str = "new"):
    """List abrupt sales detection alerts"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if status != "all":
        query["status"] = status

    alerts = await db.sales_alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"alerts": alerts, "count": len(alerts)}


@router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, request: Request):
    """Acknowledge a sales alert"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.sales_alerts.update_one(
        {"id": alert_id, "tenant_id": tenant_id},
        {"$set": {
            "status": "acknowledged",
            "actioned_by": user.get("user_id"),
            "acknowledged_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}


@router.put("/alerts/{alert_id}/action")
async def action_alert(alert_id: str, request: Request):
    """Mark alert as actioned"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    result = await db.sales_alerts.update_one(
        {"id": alert_id, "tenant_id": tenant_id},
        {"$set": {
            "status": "actioned",
            "actioned_by": user.get("user_id"),
            "action_note": body.get("action_note", ""),
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert actioned"}


@router.get("/alerts/stats")
async def alert_stats(request: Request):
    """Get alert statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    new_count = await db.sales_alerts.count_documents({"tenant_id": tenant_id, "status": "new"})
    ack = await db.sales_alerts.count_documents({"tenant_id": tenant_id, "status": "acknowledged"})
    actioned = await db.sales_alerts.count_documents({"tenant_id": tenant_id, "status": "actioned"})

    return {"new": new_count, "acknowledged": ack, "actioned": actioned, "total": new_count + ack + actioned}
