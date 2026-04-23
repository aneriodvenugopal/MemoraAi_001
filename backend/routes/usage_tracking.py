from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from services.usage_tracking_service import usage_service
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

@router.get("/usage/tenant/{tenant_id}", response_model=dict)
async def get_tenant_usage(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current usage for tenant"""
    
    usage = await usage_service.get_tenant_usage(tenant_id)
    package = await usage_service.get_tenant_package(tenant_id)
    
    if not package:
        raise HTTPException(status_code=404, detail="No active package found")
    
    # Get limits from package
    features = package.get("features", {})
    
    # Calculate percentages
    usage_summary = {
        "projects": {
            "used": usage.get("projects_count", 0),
            "limit": features.get("max_projects", 0),
            "percentage": 0
        },
        "users": {
            "used": usage.get("users_count", 0),
            "limit": features.get("max_users", 0),
            "percentage": 0
        },
        "properties": {
            "used": usage.get("properties_count", 0),
            "limit": features.get("max_properties", 0),
            "percentage": 0
        },
        "sms": {
            "used": usage.get("sms_used_this_month", 0),
            "limit": features.get("sms_credits", 0),
            "percentage": 0
        },
        "email": {
            "used": usage.get("email_used_this_month", 0),
            "limit": features.get("email_credits", 0),
            "percentage": 0
        },
        "whatsapp": {
            "used": usage.get("whatsapp_used_this_month", 0),
            "limit": features.get("whatsapp_credits", 0),
            "percentage": 0
        }
    }
    
    # Calculate percentages
    for resource, data in usage_summary.items():
        if data["limit"] > 0:
            data["percentage"] = round((data["used"] / data["limit"]) * 100, 1)
            data["remaining"] = data["limit"] - data["used"]
        elif data["limit"] == -1:
            data["percentage"] = 0
            data["remaining"] = -1
            data["unlimited"] = True
        else:
            data["percentage"] = 100 if data["used"] > 0 else 0
            data["remaining"] = 0
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "package": package.get("name"),
        "package_id": package.get("id"),
        "usage": usage_summary,
        "period_start": usage.get("current_period_start"),
        "period_end": usage.get("current_period_end"),
        "last_reset": usage.get("last_reset_date")
    }

@router.get("/usage/check/{tenant_id}/{resource_type}", response_model=dict)
async def check_usage_limit(
    tenant_id: str,
    resource_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if tenant can use more of a resource
    
    resource_type: projects, users, properties, sms, email, whatsapp
    """
    
    result = await usage_service.check_limit(tenant_id, resource_type)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        **result
    }

@router.post("/usage/increment/{tenant_id}/{resource_type}", response_model=dict)
async def increment_usage(
    tenant_id: str,
    resource_type: str,
    amount: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Increment usage for a resource"""
    
    success = await usage_service.increment_usage(tenant_id, resource_type, amount)
    
    if not success:
        check_result = await usage_service.check_limit(tenant_id, resource_type)
        raise HTTPException(
            status_code=403,
            detail=check_result["message"]
        )
    
    return {
        "success": True,
        "message": f"Usage incremented for {resource_type}",
        "amount": amount
    }

@router.post("/usage/decrement/{tenant_id}/{resource_type}", response_model=dict)
async def decrement_usage(
    tenant_id: str,
    resource_type: str,
    amount: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Decrement usage when resources are deleted"""
    
    await usage_service.decrement_usage(tenant_id, resource_type, amount)
    
    return {
        "success": True,
        "message": f"Usage decremented for {resource_type}",
        "amount": amount
    }

@router.post("/usage/sync/{tenant_id}", response_model=dict)
async def sync_actual_usage(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Sync actual usage from database counts"""
    
    actual_counts = await usage_service.sync_actual_usage(tenant_id)
    
    return {
        "success": True,
        "message": "Usage synced successfully",
        "actual_counts": actual_counts
    }

@router.post("/usage/reset-monthly/{tenant_id}", response_model=dict)
async def reset_monthly_usage(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset monthly communication credits (admin only)"""
    
    # Check if user is admin
    if current_user.get("phone") != "9948303060":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await usage_service.reset_monthly_usage(tenant_id)
    
    return {
        "success": True,
        "message": "Monthly usage reset successfully"
    }

@router.get("/usage/alerts/{tenant_id}", response_model=dict)
async def get_usage_alerts(
    tenant_id: str,
    is_resolved: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get usage alerts for tenant"""
    
    query = {"tenant_id": tenant_id}
    
    if is_resolved is not None:
        query["is_resolved"] = is_resolved
    
    alerts = await db.usage_alerts.find(query)\
        .sort("created_at", -1)\
        .to_list(length=None)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "count": len(alerts),
        "alerts": alerts
    }

@router.post("/usage/alerts/{alert_id}/resolve", response_model=dict)
async def resolve_usage_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark usage alert as resolved"""
    
    alert = await db.usage_alerts.find_one({"id": alert_id})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.usage_alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_resolved": True}}
    )
    
    return {
        "success": True,
        "message": "Alert resolved"
    }

@router.get("/usage/history/{tenant_id}", response_model=dict)
async def get_usage_history(
    tenant_id: str,
    months: int = 6,
    current_user: dict = Depends(get_current_user)
):
    """Get historical usage data"""
    
    usage = await usage_service.get_tenant_usage(tenant_id)
    usage_history = usage.get("usage_history", {})
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "history": usage_history
    }

@router.get("/usage/dashboard/{tenant_id}", response_model=dict)
async def get_usage_dashboard(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete usage dashboard for tenant"""
    
    usage = await usage_service.get_tenant_usage(tenant_id)
    package = await usage_service.get_tenant_package(tenant_id)
    
    if not package:
        raise HTTPException(status_code=404, detail="No active package found")
    
    # Get all usage checks
    resources = ["projects", "users", "properties", "sms", "email", "whatsapp"]
    usage_checks = {}
    
    for resource in resources:
        usage_checks[resource] = await usage_service.check_limit(tenant_id, resource)
    
    # Get active alerts
    alerts = await db.usage_alerts.find({
        "tenant_id": tenant_id,
        "is_resolved": False
    }).to_list(length=None)
    
    # Get tenant info
    tenant = await db.tenants.find_one({"id": tenant_id})
    
    return {
        "success": True,
        "tenant": {
            "id": tenant_id,
            "name": tenant.get("company_name"),
            "package": package.get("name"),
            "billing_cycle": tenant.get("billing_cycle"),
            "next_billing_date": tenant.get("next_billing_date"),
            "status": tenant.get("status")
        },
        "usage": usage_checks,
        "alerts": alerts,
        "period": {
            "start": usage.get("current_period_start"),
            "end": usage.get("current_period_end"),
            "last_reset": usage.get("last_reset_date")
        }
    }
