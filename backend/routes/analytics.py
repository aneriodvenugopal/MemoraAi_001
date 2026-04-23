from fastapi import APIRouter, HTTPException, Request, Query
from services.analytics_service import AnalyticsService
from middleware.auth import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_db(request: Request):
    return request.app.state.db

@router.get("/dashboard")
async def get_dashboard_analytics(
    request: Request,
    tenant_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get dashboard analytics and metrics"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Use user's tenant_id if not super admin
    if user.get('role') != 'super_admin':
        tenant_id = user.get('tenant_id')
    
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    metrics = await AnalyticsService.get_dashboard_metrics(
        db=db,
        tenant_id=tenant_id,
        start_date=start,
        end_date=end
    )
    
    # Add project and team counts
    project_query = {"deleted_at": None}
    user_query = {"deleted_at": None, "is_active": True}
    
    if tenant_id:
        project_query["tenant_id"] = tenant_id
        user_query["tenant_id"] = tenant_id
    
    total_projects = await db.projects.count_documents(project_query)
    total_team = await db.users.count_documents(user_query)
    
    # Add to overview
    if "overview" in metrics:
        metrics["overview"]["total_projects"] = total_projects
        metrics["overview"]["total_team"] = total_team
    else:
        metrics["total_projects"] = total_projects
        metrics["total_team"] = total_team
    
    return metrics

@router.get("/leads")
async def get_lead_analytics(
    request: Request,
    tenant_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get lead analytics"""
    db = get_db(request)
    
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    analytics = await AnalyticsService.get_lead_analytics(
        db=db,
        tenant_id=tenant_id,
        project_id=project_id,
        start_date=start,
        end_date=end
    )
    
    return analytics

@router.get("/sales")
async def get_sales_analytics(
    request: Request,
    tenant_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get sales analytics"""
    db = get_db(request)
    
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    analytics = await AnalyticsService.get_sales_analytics(
        db=db,
        tenant_id=tenant_id,
        start_date=start,
        end_date=end
    )
    
    return analytics

@router.get("/payments")
async def get_payment_analytics(
    request: Request,
    tenant_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get payment analytics"""
    db = get_db(request)
    
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    analytics = await AnalyticsService.get_payment_analytics(
        db=db,
        tenant_id=tenant_id,
        start_date=start,
        end_date=end
    )
    
    return analytics

@router.get("/commissions")
async def get_commission_analytics(
    request: Request,
    tenant_id: Optional[str] = Query(None),
    staff_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get commission analytics"""
    db = get_db(request)
    
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    analytics = await AnalyticsService.get_commission_analytics(
        db=db,
        tenant_id=tenant_id,
        staff_id=staff_id,
        start_date=start,
        end_date=end
    )
    
    return analytics
