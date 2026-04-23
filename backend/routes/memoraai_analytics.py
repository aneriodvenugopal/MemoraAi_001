"""MemoraAI Category-Specific Analytics & Reports API"""
from fastapi import APIRouter, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/analytics", tags=["memoraai-analytics"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/overview")
async def get_analytics_overview(request: Request, period: str = "month"):
    """Category-specific analytics overview"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    cat_slug = (tenant or {}).get("business_category", "real_estate")
    cat_name = (tenant or {}).get("business_category_name", "Real Estate")

    now = datetime.now(timezone.utc)
    if period == "week":
        start = (now - timedelta(days=7)).isoformat()
    elif period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    prev_start = (now - timedelta(days=30)).isoformat() if period == "month" else (now - timedelta(days=14)).isoformat()

    # Appointments / Hot Sales metrics
    total_appointments = await db.memoraai_appointments.count_documents({"tenant_id": tenant_id})
    period_appointments = await db.memoraai_appointments.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": start}})
    completed = await db.memoraai_appointments.count_documents({"tenant_id": tenant_id, "status": "completed"})
    cancelled = await db.memoraai_appointments.count_documents({"tenant_id": tenant_id, "status": "cancelled"})
    no_show = await db.memoraai_appointments.count_documents({"tenant_id": tenant_id, "status": "no_show"})

    # Revenue from appointments
    revenue_pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": "completed", "amount": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    rev_cursor = db.memoraai_appointments.aggregate(revenue_pipeline)
    rev_result = await rev_cursor.to_list(1)
    total_revenue = rev_result[0]["total"] if rev_result else 0

    period_rev_pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": "completed", "amount": {"$gt": 0}, "created_at": {"$gte": start}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    prev_cursor = db.memoraai_appointments.aggregate(period_rev_pipeline)
    prev_result = await prev_cursor.to_list(1)
    period_revenue = prev_result[0]["total"] if prev_result else 0

    # Service popularity
    svc_pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$service_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]
    svc_cursor = db.memoraai_appointments.aggregate(svc_pipeline)
    popular_services = [{"name": doc["_id"] or "Unknown", "count": doc["count"]} async for doc in svc_cursor]

    # Daily appointment trend (last 7 days)
    daily_trend = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59).isoformat()
        count = await db.memoraai_appointments.count_documents({
            "tenant_id": tenant_id,
            "appointment_date": {"$gte": day_start, "$lte": day_end}
        })
        daily_trend.append({"date": day.strftime("%b %d"), "count": count})

    # Customer metrics
    unique_customers = len(await db.memoraai_appointments.distinct("customer_phone", {"tenant_id": tenant_id}))
    repeat_pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$customer_phone", "visits": {"$sum": 1}}},
        {"$match": {"visits": {"$gt": 1}}},
        {"$count": "repeat"},
    ]
    rep_cursor = db.memoraai_appointments.aggregate(repeat_pipeline)
    rep_result = await rep_cursor.to_list(1)
    repeat_customers = rep_result[0]["repeat"] if rep_result else 0

    # WhatsApp engagement
    wa_leads = await db.whatsapp_crm_leads.count_documents({"tenant_id": tenant_id})
    wa_period = await db.whatsapp_crm_leads.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": start}})
    memories = await db.business_memories.count_documents({"tenant_id": tenant_id})
    hot_sales = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active"})
    alerts = await db.sales_alerts.count_documents({"tenant_id": tenant_id, "status": "new"})

    return {
        "category": cat_slug,
        "category_name": cat_name,
        "period": period,
        "appointments": {
            "total": total_appointments,
            "this_period": period_appointments,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "completion_rate": round(completed / total_appointments * 100, 1) if total_appointments > 0 else 0,
        },
        "revenue": {
            "total": total_revenue,
            "this_period": period_revenue,
        },
        "popular_services": popular_services,
        "daily_trend": daily_trend,
        "customers": {
            "unique": unique_customers,
            "repeat": repeat_customers,
            "retention_rate": round(repeat_customers / unique_customers * 100, 1) if unique_customers > 0 else 0,
        },
        "whatsapp": {
            "total_leads": wa_leads,
            "new_leads": wa_period,
            "hot_sales": hot_sales,
            "new_alerts": alerts,
            "memories": memories,
        },
    }


@router.get("/services-breakdown")
async def get_services_breakdown(request: Request):
    """Revenue and usage breakdown by service"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": "$service_name",
            "total_bookings": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "revenue": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, {"$ifNull": ["$amount", 0]}, 0]}},
            "cancelled": {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}},
        }},
        {"$sort": {"total_bookings": -1}},
    ]
    cursor = db.memoraai_appointments.aggregate(pipeline)
    breakdown = []
    async for doc in cursor:
        breakdown.append({
            "service": doc["_id"] or "Unknown",
            "total_bookings": doc["total_bookings"],
            "completed": doc["completed"],
            "revenue": doc["revenue"],
            "cancelled": doc["cancelled"],
            "completion_rate": round(doc["completed"] / doc["total_bookings"] * 100, 1) if doc["total_bookings"] > 0 else 0,
        })
    return {"breakdown": breakdown, "count": len(breakdown)}
