"""
Usage Limits Enforcement Middleware
Checks tenant usage limits before allowing resource creation
"""

from fastapi import HTTPException, Request, Depends
from functools import wraps
from datetime import datetime, timezone
from typing import Optional
from middleware.auth import get_current_user

# Subscription packages with limits (copied from subscriptions.py for reference)
SUBSCRIPTION_PACKAGES = {
    "starter": {
        "name": "Starter",
        "features": {
            "max_projects": 3,
            "max_users": 2,
            "max_properties": 50,
            "max_leads_per_month": 100,
            "sms_credits": 100,
            "email_credits": 500,
        }
    },
    "pro": {
        "name": "Pro",
        "features": {
            "max_projects": 15,
            "max_users": 10,
            "max_properties": 500,
            "max_leads_per_month": 500,
            "sms_credits": 500,
            "email_credits": 2000,
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "features": {
            "max_projects": -1,  # Unlimited
            "max_users": -1,  # Unlimited
            "max_properties": -1,  # Unlimited
            "max_leads_per_month": -1,  # Unlimited
            "sms_credits": 2000,
            "email_credits": 10000,
        }
    }
}


async def get_tenant_package_features(db, tenant_id: str) -> dict:
    """Get tenant's subscription package features"""
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "package_id": 1})
    
    if not tenant:
        # Default to starter if tenant not found
        return SUBSCRIPTION_PACKAGES["starter"]["features"]
    
    package_id = tenant.get("package_id", "starter")
    package = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])
    
    return package["features"]


async def check_project_limit(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant can create more projects.
    Raises HTTPException if limit exceeded.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    features = await get_tenant_package_features(db, tenant_id)
    max_projects = features.get("max_projects", 3)
    
    # -1 means unlimited
    if max_projects == -1:
        return user
    
    # Count current projects
    project_count = await db.projects.count_documents({
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if project_count >= max_projects:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "package_id": 1})
        package_id = (tenant.get("package_id") if tenant else None) or "starter"
        package_name = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])["name"]
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": f"Project limit reached. Your {package_name} plan allows {max_projects} projects. Please upgrade to create more.",
                "limit_type": "projects",
                "current_usage": project_count,
                "limit": max_projects,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def check_user_limit(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant can create more users.
    Raises HTTPException if limit exceeded.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    features = await get_tenant_package_features(db, tenant_id)
    max_users = features.get("max_users", 2)
    
    # -1 means unlimited
    if max_users == -1:
        return user
    
    # Count current users
    user_count = await db.users.count_documents({
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if user_count >= max_users:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "package_id": 1})
        package_id = (tenant.get("package_id") if tenant else None) or "starter"
        package_name = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])["name"]
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": f"User limit reached. Your {package_name} plan allows {max_users} users. Please upgrade to add more team members.",
                "limit_type": "users",
                "current_usage": user_count,
                "limit": max_users,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def check_property_limit(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant can create more properties.
    Raises HTTPException if limit exceeded.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    features = await get_tenant_package_features(db, tenant_id)
    max_properties = features.get("max_properties", 50)
    
    # -1 means unlimited
    if max_properties == -1:
        return user
    
    # Count current properties
    property_count = await db.properties.count_documents({
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if property_count >= max_properties:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "package_id": 1})
        package_id = (tenant.get("package_id") if tenant else None) or "starter"
        package_name = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])["name"]
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": f"Property limit reached. Your {package_name} plan allows {max_properties} properties. Please upgrade to add more.",
                "limit_type": "properties",
                "current_usage": property_count,
                "limit": max_properties,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def check_lead_limit(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant can create more leads this month.
    Raises HTTPException if limit exceeded.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    features = await get_tenant_package_features(db, tenant_id)
    max_leads = features.get("max_leads_per_month", 100)
    
    # -1 means unlimited
    if max_leads == -1:
        return user
    
    # Count leads this month
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    lead_count = await db.leads.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_of_month.isoformat()}
    })
    
    if lead_count >= max_leads:
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "package_id": 1})
        package_id = (tenant.get("package_id") if tenant else None) or "starter"
        package_name = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])["name"]
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LIMIT_EXCEEDED",
                "message": f"Monthly lead limit reached. Your {package_name} plan allows {max_leads} leads per month. Please upgrade or wait until next month.",
                "limit_type": "leads_per_month",
                "current_usage": lead_count,
                "limit": max_leads,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def check_sms_credits(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant has SMS credits remaining.
    Raises HTTPException if no credits.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    sms_remaining = tenant.get("credits", {}).get("sms_remaining", 0)
    
    if sms_remaining <= 0:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "CREDITS_EXHAUSTED",
                "message": "SMS credits exhausted. Please upgrade your plan or purchase additional credits.",
                "limit_type": "sms_credits",
                "remaining": 0,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def check_email_credits(request: Request, user: dict = Depends(get_current_user)):
    """
    Dependency to check if tenant has email credits remaining.
    Raises HTTPException if no credits.
    """
    db = request.app.state.db
    tenant_id = user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    email_remaining = tenant.get("credits", {}).get("email_remaining", 0)
    
    if email_remaining <= 0:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "CREDITS_EXHAUSTED",
                "message": "Email credits exhausted. Please upgrade your plan or purchase additional credits.",
                "limit_type": "email_credits",
                "remaining": 0,
                "upgrade_url": "/billing"
            }
        )
    
    return user


async def deduct_sms_credit(db, tenant_id: str, count: int = 1):
    """Deduct SMS credits after sending"""
    await db.tenants.update_one(
        {"id": tenant_id},
        {
            "$inc": {
                "credits.sms_remaining": -count,
                "credits.sms_used": count
            }
        }
    )


async def deduct_email_credit(db, tenant_id: str, count: int = 1):
    """Deduct email credits after sending"""
    await db.tenants.update_one(
        {"id": tenant_id},
        {
            "$inc": {
                "credits.email_remaining": -count,
                "credits.email_used": count
            }
        }
    )
