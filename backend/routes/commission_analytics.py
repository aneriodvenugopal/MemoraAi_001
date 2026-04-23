"""
Commission Analytics API
Comprehensive analytics for Indian real estate commission tracking
- Monthly/Quarterly trends
- Top performers leaderboard
- Project-wise and property-type breakdown
- TDS and GST calculations
- Staff performance metrics
"""
from fastapi import APIRouter, HTTPException, Request, Query
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from dateutil.relativedelta import relativedelta
import calendar

router = APIRouter(prefix="/commission-analytics", tags=["commission-analytics"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/dashboard")
async def get_commission_dashboard(
    request: Request,
    project_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get comprehensive commission dashboard data
    Returns: Overview stats, trends, breakdowns
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Build base query
    base_query = {"tenant_id": tenant_id}
    if project_id:
        base_query["project_id"] = project_id
    
    # For staff role, show only their commissions
    if user.get("role") == "staff":
        base_query["staff_id"] = user.get("user_id")
    elif staff_id:
        base_query["staff_id"] = staff_id
    
    # Date range
    if start_date:
        base_query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in base_query:
            base_query["created_at"]["$lte"] = end_date
        else:
            base_query["created_at"] = {"$lte": end_date}
    
    # Get all commission earnings
    earnings = await db.commission_earnings.find(base_query, {"_id": 0}).to_list(10000)
    
    # If no earnings in commission_earnings, check commissions collection
    if not earnings:
        earnings = await db.commissions.find(base_query, {"_id": 0}).to_list(10000)
    
    # Calculate overview stats
    total_commission = sum(e.get("commission_amount", 0) for e in earnings)
    total_tds = sum(e.get("tds_amount", 0) for e in earnings)
    total_net = sum(e.get("net_commission", e.get("commission_amount", 0) - e.get("tds_amount", 0)) for e in earnings)
    
    # By status
    by_status = {
        "pending": {"count": 0, "amount": 0, "net": 0},
        "approved": {"count": 0, "amount": 0, "net": 0},
        "paid": {"count": 0, "amount": 0, "net": 0},
        "cancelled": {"count": 0, "amount": 0, "net": 0},
        "on_hold": {"count": 0, "amount": 0, "net": 0}
    }
    
    for e in earnings:
        status = e.get("status", "pending")
        if status in by_status:
            by_status[status]["count"] += 1
            by_status[status]["amount"] += e.get("commission_amount", 0)
            by_status[status]["net"] += e.get("net_commission", e.get("commission_amount", 0) * 0.95)
    
    # By type (direct vs gap)
    by_type = {
        "direct": {"count": 0, "amount": 0},
        "gap": {"count": 0, "amount": 0}
    }
    
    for e in earnings:
        comm_type = e.get("commission_type", "direct")
        if comm_type in by_type:
            by_type[comm_type]["count"] += 1
            by_type[comm_type]["amount"] += e.get("commission_amount", 0)
    
    # This month stats
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    this_month_earnings = [e for e in earnings if _parse_date(e.get("created_at")) >= first_of_month]
    this_month_commission = sum(e.get("commission_amount", 0) for e in this_month_earnings)
    this_month_net = sum(e.get("net_commission", e.get("commission_amount", 0) * 0.95) for e in this_month_earnings)
    
    # Last month stats
    first_of_last_month = first_of_month - relativedelta(months=1)
    last_month_earnings = [e for e in earnings if first_of_last_month <= _parse_date(e.get("created_at")) < first_of_month]
    last_month_commission = sum(e.get("commission_amount", 0) for e in last_month_earnings)
    
    # Month-over-month growth
    mom_growth = 0
    if last_month_commission > 0:
        mom_growth = round(((this_month_commission - last_month_commission) / last_month_commission) * 100, 1)
    
    # YTD (Year to Date)
    first_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    ytd_earnings = [e for e in earnings if _parse_date(e.get("created_at")) >= first_of_year]
    ytd_commission = sum(e.get("commission_amount", 0) for e in ytd_earnings)
    ytd_net = sum(e.get("net_commission", e.get("commission_amount", 0) * 0.95) for e in ytd_earnings)
    
    return {
        "success": True,
        "overview": {
            "total_commission": round(total_commission, 2),
            "total_tds": round(total_tds, 2),
            "total_net": round(total_net, 2),
            "total_transactions": len(earnings),
            "average_commission": round(total_commission / len(earnings), 2) if earnings else 0
        },
        "this_month": {
            "commission": round(this_month_commission, 2),
            "net": round(this_month_net, 2),
            "transactions": len(this_month_earnings),
            "mom_growth": mom_growth
        },
        "ytd": {
            "commission": round(ytd_commission, 2),
            "net": round(ytd_net, 2),
            "transactions": len(ytd_earnings)
        },
        "by_status": by_status,
        "by_type": by_type
    }


@router.get("/trends")
async def get_commission_trends(
    request: Request,
    period: str = "monthly",  # monthly, quarterly, yearly
    months: int = 12,
    project_id: Optional[str] = None,
    staff_id: Optional[str] = None
):
    """
    Get commission trends over time
    Returns: Time series data for charts
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "monthly":
        start_date = now - relativedelta(months=months)
    elif period == "quarterly":
        start_date = now - relativedelta(months=months * 3)
    else:
        start_date = now - relativedelta(years=months)
    
    # Build query
    query = {
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_date.isoformat()}
    }
    if project_id:
        query["project_id"] = project_id
    if user.get("role") == "staff":
        query["staff_id"] = user.get("user_id")
    elif staff_id:
        query["staff_id"] = staff_id
    
    # Get earnings
    earnings = await db.commission_earnings.find(query, {"_id": 0}).to_list(10000)
    if not earnings:
        earnings = await db.commissions.find(query, {"_id": 0}).to_list(10000)
    
    # Group by period
    trends = {}
    
    for e in earnings:
        created_at = _parse_date(e.get("created_at"))
        if not created_at:
            continue
        
        if period == "monthly":
            key = created_at.strftime("%Y-%m")
            label = created_at.strftime("%b %Y")
        elif period == "quarterly":
            quarter = (created_at.month - 1) // 3 + 1
            key = f"{created_at.year}-Q{quarter}"
            label = f"Q{quarter} {created_at.year}"
        else:
            key = str(created_at.year)
            label = str(created_at.year)
        
        if key not in trends:
            trends[key] = {
                "period": key,
                "label": label,
                "commission": 0,
                "net": 0,
                "tds": 0,
                "count": 0,
                "direct": 0,
                "gap": 0
            }
        
        trends[key]["commission"] += e.get("commission_amount", 0)
        trends[key]["net"] += e.get("net_commission", e.get("commission_amount", 0) * 0.95)
        trends[key]["tds"] += e.get("tds_amount", e.get("commission_amount", 0) * 0.05)
        trends[key]["count"] += 1
        
        if e.get("commission_type") == "direct":
            trends[key]["direct"] += e.get("commission_amount", 0)
        else:
            trends[key]["gap"] += e.get("commission_amount", 0)
    
    # Sort by period and convert to list
    sorted_trends = sorted(trends.values(), key=lambda x: x["period"])
    
    # Round values
    for t in sorted_trends:
        t["commission"] = round(t["commission"], 2)
        t["net"] = round(t["net"], 2)
        t["tds"] = round(t["tds"], 2)
        t["direct"] = round(t["direct"], 2)
        t["gap"] = round(t["gap"], 2)
    
    return {
        "success": True,
        "period": period,
        "trends": sorted_trends
    }


@router.get("/top-performers")
async def get_top_performers(
    request: Request,
    limit: int = 10,
    period: Optional[str] = None,  # this_month, last_month, this_quarter, this_year, all_time
    project_id: Optional[str] = None
):
    """
    Get top commission earners (leaderboard)
    Returns: Staff ranked by commission earned
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Build date filter
    now = datetime.now(timezone.utc)
    date_filter = None
    
    if period == "this_month":
        date_filter = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "last_month":
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = first_of_month - relativedelta(months=1)
    elif period == "this_quarter":
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        date_filter = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "this_year":
        date_filter = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Build query
    query = {"tenant_id": tenant_id}
    if project_id:
        query["project_id"] = project_id
    if date_filter:
        query["created_at"] = {"$gte": date_filter.isoformat()}
    
    # Aggregate by staff
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$staff_id",
            "staff_name": {"$first": "$staff_name"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_net": {"$sum": {"$ifNull": ["$net_commission", {"$multiply": ["$commission_amount", 0.95]}]}},
            "total_tds": {"$sum": {"$ifNull": ["$tds_amount", {"$multiply": ["$commission_amount", 0.05]}]}},
            "transaction_count": {"$sum": 1},
            "direct_count": {"$sum": {"$cond": [{"$eq": ["$commission_type", "direct"]}, 1, 0]}},
            "gap_count": {"$sum": {"$cond": [{"$eq": ["$commission_type", "gap"]}, 1, 0]}}
        }},
        {"$sort": {"total_commission": -1}},
        {"$limit": limit}
    ]
    
    # Try commission_earnings first
    performers = await db.commission_earnings.aggregate(pipeline).to_list(limit)
    
    if not performers:
        performers = await db.commissions.aggregate(pipeline).to_list(limit)
    
    # Add rank and format
    leaderboard = []
    for rank, p in enumerate(performers, 1):
        leaderboard.append({
            "rank": rank,
            "staff_id": p["_id"],
            "staff_name": p.get("staff_name") or "Unknown",
            "total_commission": round(p["total_commission"], 2),
            "total_net": round(p["total_net"], 2),
            "total_tds": round(p["total_tds"], 2),
            "transaction_count": p["transaction_count"],
            "direct_count": p["direct_count"],
            "gap_count": p["gap_count"],
            "avg_commission": round(p["total_commission"] / p["transaction_count"], 2) if p["transaction_count"] > 0 else 0
        })
    
    return {
        "success": True,
        "period": period or "all_time",
        "leaderboard": leaderboard
    }


@router.get("/project-breakdown")
async def get_project_breakdown(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get commission breakdown by project
    Returns: Project-wise commission statistics
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Build query
    query = {"tenant_id": tenant_id}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    # Aggregate by project
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$project_id",
            "total_commission": {"$sum": "$commission_amount"},
            "total_net": {"$sum": {"$ifNull": ["$net_commission", {"$multiply": ["$commission_amount", 0.95]}]}},
            "transaction_count": {"$sum": 1},
            "unique_staff": {"$addToSet": "$staff_id"}
        }},
        {"$sort": {"total_commission": -1}}
    ]
    
    results = await db.commission_earnings.aggregate(pipeline).to_list(100)
    if not results:
        results = await db.commissions.aggregate(pipeline).to_list(100)
    
    # Get project details
    breakdown = []
    total_all_projects = sum(r["total_commission"] for r in results)
    
    for r in results:
        project = await db.projects.find_one({"id": r["_id"]}, {"_id": 0, "name": 1})
        project_name = project.get("name") if project else "Unknown Project"
        
        percentage = round((r["total_commission"] / total_all_projects * 100), 1) if total_all_projects > 0 else 0
        
        breakdown.append({
            "project_id": r["_id"],
            "project_name": project_name,
            "total_commission": round(r["total_commission"], 2),
            "total_net": round(r["total_net"], 2),
            "transaction_count": r["transaction_count"],
            "unique_staff_count": len(r["unique_staff"]),
            "percentage_of_total": percentage
        })
    
    return {
        "success": True,
        "total_commission": round(total_all_projects, 2),
        "project_count": len(breakdown),
        "breakdown": breakdown
    }


@router.get("/staff-performance/{staff_id}")
async def get_staff_performance(
    request: Request,
    staff_id: str,
    months: int = 6
):
    """
    Get detailed performance metrics for a staff member
    Returns: Comprehensive staff performance data
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Get staff details
    staff = await db.users.find_one({"id": staff_id, "tenant_id": tenant_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Get staff hierarchy
    hierarchy = await db.staff_hierarchy.find_one(
        {"staff_id": staff_id, "tenant_id": tenant_id, "deleted_at": None},
        {"_id": 0}
    )
    
    # Date range
    now = datetime.now(timezone.utc)
    start_date = now - relativedelta(months=months)
    
    # Get all earnings for staff
    query = {
        "tenant_id": tenant_id,
        "staff_id": staff_id,
        "created_at": {"$gte": start_date.isoformat()}
    }
    
    earnings = await db.commission_earnings.find(query, {"_id": 0}).to_list(1000)
    if not earnings:
        earnings = await db.commissions.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    total_commission = sum(e.get("commission_amount", 0) for e in earnings)
    total_net = sum(e.get("net_commission", e.get("commission_amount", 0) * 0.95) for e in earnings)
    total_tds = sum(e.get("tds_amount", e.get("commission_amount", 0) * 0.05) for e in earnings)
    
    # By status
    by_status = {}
    for e in earnings:
        status = e.get("status", "pending")
        if status not in by_status:
            by_status[status] = {"count": 0, "amount": 0}
        by_status[status]["count"] += 1
        by_status[status]["amount"] += e.get("commission_amount", 0)
    
    # By type
    direct_earnings = [e for e in earnings if e.get("commission_type") == "direct"]
    gap_earnings = [e for e in earnings if e.get("commission_type") == "gap"]
    
    # Monthly breakdown
    monthly_data = {}
    for e in earnings:
        created_at = _parse_date(e.get("created_at"))
        if created_at:
            month_key = created_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"commission": 0, "count": 0}
            monthly_data[month_key]["commission"] += e.get("commission_amount", 0)
            monthly_data[month_key]["count"] += 1
    
    # Average monthly commission
    avg_monthly = total_commission / months if months > 0 else 0
    
    return {
        "success": True,
        "staff": {
            "id": staff_id,
            "name": staff.get("name"),
            "email": staff.get("email"),
            "phone": staff.get("phone"),
            "role": staff.get("role")
        },
        "hierarchy": {
            "level": hierarchy.get("level") if hierarchy else None,
            "direct_commission_pct": hierarchy.get("direct_commission_percentage") if hierarchy else None,
            "gap_commission_pct": hierarchy.get("gap_commission_percentage") if hierarchy else None
        },
        "summary": {
            "total_commission": round(total_commission, 2),
            "total_net": round(total_net, 2),
            "total_tds": round(total_tds, 2),
            "transaction_count": len(earnings),
            "average_per_transaction": round(total_commission / len(earnings), 2) if earnings else 0,
            "average_monthly": round(avg_monthly, 2)
        },
        "by_status": {k: {"count": v["count"], "amount": round(v["amount"], 2)} for k, v in by_status.items()},
        "by_type": {
            "direct": {
                "count": len(direct_earnings),
                "amount": round(sum(e.get("commission_amount", 0) for e in direct_earnings), 2)
            },
            "gap": {
                "count": len(gap_earnings),
                "amount": round(sum(e.get("commission_amount", 0) for e in gap_earnings), 2)
            }
        },
        "monthly_trend": [
            {"month": k, "commission": round(v["commission"], 2), "count": v["count"]}
            for k, v in sorted(monthly_data.items())
        ]
    }


@router.get("/payout-summary")
async def get_payout_summary(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get commission payout summary
    Returns: Payout statistics and pending amounts
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    # Build query
    query = {"tenant_id": tenant_id}
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    # Get payouts
    payouts = await db.commission_payouts.find(query, {"_id": 0}).to_list(1000)
    
    total_paid = sum(p.get("net_payout", 0) for p in payouts)
    total_tds_deducted = sum(p.get("total_tds", 0) for p in payouts)
    
    # By payment mode
    by_mode = {}
    for p in payouts:
        mode = p.get("payment_mode", "unknown")
        if mode not in by_mode:
            by_mode[mode] = {"count": 0, "amount": 0}
        by_mode[mode]["count"] += 1
        by_mode[mode]["amount"] += p.get("net_payout", 0)
    
    # Get pending payouts (approved but not paid)
    pending_query = {"tenant_id": tenant_id, "status": "approved"}
    pending_earnings = await db.commission_earnings.find(pending_query, {"_id": 0}).to_list(1000)
    pending_amount = sum(e.get("net_commission", 0) for e in pending_earnings)
    
    return {
        "success": True,
        "payouts": {
            "total_paid": round(total_paid, 2),
            "total_tds_deducted": round(total_tds_deducted, 2),
            "payout_count": len(payouts)
        },
        "pending": {
            "amount": round(pending_amount, 2),
            "count": len(pending_earnings)
        },
        "by_payment_mode": {k: {"count": v["count"], "amount": round(v["amount"], 2)} for k, v in by_mode.items()}
    }


def _parse_date(date_val) -> Optional[datetime]:
    """Parse date from various formats"""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, str):
        try:
            return datetime.fromisoformat(date_val.replace("Z", "+00:00"))
        except:
            return None
    return None
