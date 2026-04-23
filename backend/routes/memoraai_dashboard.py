"""MemoraAI Category-Specific Dashboard Stats API"""
from fastapi import APIRouter, Request
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/dashboard", tags=["memoraai-dashboard"])


def get_db(request: Request):
    return request.app.state.db


CATEGORY_STAT_CONFIGS = {
    "real_estate": {
        "widgets": [
            {"key": "active_projects", "label": "Active Projects", "icon": "building", "color": "blue"},
            {"key": "total_leads", "label": "Total Leads", "icon": "users", "color": "cyan"},
            {"key": "site_visits_week", "label": "Site Visits (Week)", "icon": "map-pin", "color": "green"},
            {"key": "bookings_month", "label": "Bookings (Month)", "icon": "calendar-check", "color": "emerald"},
        ]
    },
    "astrology": {
        "widgets": [
            {"key": "consultations_today", "label": "Consultations Today", "icon": "star", "color": "purple"},
            {"key": "pending_readings", "label": "Pending Readings", "icon": "clock", "color": "violet"},
            {"key": "total_customers", "label": "Total Customers", "icon": "users", "color": "indigo"},
            {"key": "revenue_month", "label": "Revenue (Month)", "icon": "indian-rupee", "color": "amber"},
        ]
    },
    "doctor_clinic": {
        "widgets": [
            {"key": "appointments_today", "label": "Appointments Today", "icon": "stethoscope", "color": "emerald"},
            {"key": "patients_queue", "label": "Patient Queue", "icon": "users", "color": "blue"},
            {"key": "lab_tests_pending", "label": "Lab Tests Pending", "icon": "flask-conical", "color": "orange"},
            {"key": "consultations_week", "label": "Consultations (Week)", "icon": "activity", "color": "teal"},
        ]
    },
    "function_hall": {
        "widgets": [
            {"key": "bookings_this_month", "label": "Bookings This Month", "icon": "party-popper", "color": "amber"},
            {"key": "upcoming_events", "label": "Upcoming Events", "icon": "calendar", "color": "orange"},
            {"key": "enquiries_new", "label": "New Enquiries", "icon": "message-square", "color": "blue"},
            {"key": "revenue_month", "label": "Revenue (Month)", "icon": "indian-rupee", "color": "green"},
        ]
    },
    "pesticides_fertilizer": {
        "widgets": [
            {"key": "orders_today", "label": "Orders Today", "icon": "package", "color": "lime"},
            {"key": "deliveries_pending", "label": "Deliveries Pending", "icon": "truck", "color": "orange"},
            {"key": "b2b_clients", "label": "B2B Clients", "icon": "building-2", "color": "green"},
            {"key": "soil_tests_pending", "label": "Soil Tests Pending", "icon": "flask-conical", "color": "amber"},
        ]
    },
    "beauty_salon": {
        "widgets": [
            {"key": "appointments_today", "label": "Appointments Today", "icon": "scissors", "color": "pink"},
            {"key": "walkins_today", "label": "Walk-ins Today", "icon": "footprints", "color": "rose"},
            {"key": "bridal_bookings", "label": "Bridal Bookings", "icon": "heart", "color": "red"},
            {"key": "revenue_today", "label": "Revenue Today", "icon": "indian-rupee", "color": "emerald"},
        ]
    },
    "coaching_center": {
        "widgets": [
            {"key": "classes_today", "label": "Classes Today", "icon": "graduation-cap", "color": "indigo"},
            {"key": "students_active", "label": "Active Students", "icon": "users", "color": "blue"},
            {"key": "demo_requests", "label": "Demo Requests", "icon": "presentation", "color": "purple"},
            {"key": "attendance_rate", "label": "Attendance Rate", "icon": "check-circle", "color": "green"},
        ]
    },
}


@router.get("/category-stats")
async def get_category_dashboard_stats(request: Request):
    """Get category-specific dashboard stats for the tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        return {"widgets": [], "category": None}

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    cat_slug = (tenant or {}).get("business_category", "real_estate")
    cat_name = (tenant or {}).get("business_category_name", "Real Estate")

    config = CATEGORY_STAT_CONFIGS.get(cat_slug, CATEGORY_STAT_CONFIGS["real_estate"])

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Compute actual stats from DB
    stats = {}

    # Common stats
    total_leads = await db.leads.count_documents({"tenant_id": tenant_id})
    hot_sales_active = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active"})
    total_services = await db.business_services.count_documents({"tenant_id": tenant_id, "is_active": True, "deleted_at": None})
    alerts_new = await db.sales_alerts.count_documents({"tenant_id": tenant_id, "status": "new"})
    memories_count = await db.business_memories.count_documents({"tenant_id": tenant_id})

    # Category-specific stat computation
    if cat_slug == "real_estate":
        stats["active_projects"] = await db.projects.count_documents({"tenant_id": tenant_id, "status": {"$ne": "archived"}})
        stats["total_leads"] = total_leads
        stats["site_visits_week"] = await db.site_visits.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": week_start}})
        stats["bookings_month"] = await db.bookings.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": month_start}})

    elif cat_slug == "doctor_clinic":
        stats["appointments_today"] = hot_sales_active
        stats["patients_queue"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "priority": "urgent"})
        stats["lab_tests_pending"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "service_name": {"$regex": "lab|test", "$options": "i"}})
        stats["consultations_week"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": week_start}})

    elif cat_slug == "astrology":
        stats["consultations_today"] = hot_sales_active
        stats["pending_readings"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "service_name": {"$regex": "reading|horoscope|kundli", "$options": "i"}})
        stats["total_customers"] = len(await db.business_memories.distinct("customer_phone", {"tenant_id": tenant_id}))
        stats["revenue_month"] = 0  # Placeholder

    elif cat_slug == "function_hall":
        stats["bookings_this_month"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "created_at": {"$gte": month_start}})
        stats["upcoming_events"] = hot_sales_active
        stats["enquiries_new"] = alerts_new + total_leads
        stats["revenue_month"] = 0

    elif cat_slug == "pesticides_fertilizer":
        stats["orders_today"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "created_at": {"$gte": today_start}})
        stats["deliveries_pending"] = hot_sales_active
        stats["b2b_clients"] = len(await db.business_memories.distinct("customer_phone", {"tenant_id": tenant_id}))
        stats["soil_tests_pending"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "service_name": {"$regex": "soil|test", "$options": "i"}})

    elif cat_slug == "beauty_salon":
        stats["appointments_today"] = hot_sales_active
        stats["walkins_today"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "status": "active", "created_at": {"$gte": today_start}})
        stats["bridal_bookings"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "service_name": {"$regex": "bridal|wedding", "$options": "i"}})
        stats["revenue_today"] = 0

    elif cat_slug == "coaching_center":
        stats["classes_today"] = total_services
        stats["students_active"] = len(await db.business_memories.distinct("customer_phone", {"tenant_id": tenant_id}))
        stats["demo_requests"] = await db.hot_sales.count_documents({"tenant_id": tenant_id, "service_name": {"$regex": "demo|trial", "$options": "i"}})
        stats["attendance_rate"] = 0

    # Build widget response with values
    widgets = []
    for w in config["widgets"]:
        widgets.append({
            **w,
            "value": stats.get(w["key"], 0),
        })

    return {
        "category": cat_slug,
        "category_name": cat_name,
        "widgets": widgets,
        "summary": {
            "total_services": total_services,
            "hot_sales": hot_sales_active,
            "new_alerts": alerts_new,
            "memories": memories_count,
        }
    }
