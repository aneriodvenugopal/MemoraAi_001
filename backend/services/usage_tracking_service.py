from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import os
from typing import Optional, Dict

MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

class UsageTrackingService:
    """Service to track and enforce tenant usage limits"""
    
    @staticmethod
    async def get_tenant_usage(tenant_id: str) -> Optional[Dict]:
        """Get current usage for tenant"""
        usage = await db.tenant_usage.find_one({"tenant_id": tenant_id})
        
        if not usage:
            # Initialize usage record
            usage = {
                "id": str(os.urandom(16).hex()),
                "tenant_id": tenant_id,
                "projects_count": 0,
                "properties_count": 0,
                "users_count": 0,
                "sms_used_this_month": 0,
                "email_used_this_month": 0,
                "whatsapp_used_this_month": 0,
                "storage_used_mb": 0.0,
                "current_period_start": datetime.now(timezone.utc),
                "current_period_end": datetime.now(timezone.utc) + relativedelta(months=1),
                "last_reset_date": datetime.now(timezone.utc),
                "usage_history": {},
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.tenant_usage.insert_one(usage)
        
        return usage
    
    @staticmethod
    async def get_tenant_package(tenant_id: str) -> Optional[Dict]:
        """Get tenant's current package"""
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant or not tenant.get("package_id"):
            return None
        
        package = await db.packages.find_one({"id": tenant["package_id"]})
        return package
    
    @staticmethod
    async def check_limit(tenant_id: str, resource_type: str) -> Dict:
        """
        Check if tenant can use more of a resource
        
        Args:
            tenant_id: Tenant ID
            resource_type: "projects", "users", "properties", "sms", "email", "whatsapp", "storage"
        
        Returns:
            Dict with allowed, current_usage, limit, remaining, message
        """
        usage = await UsageTrackingService.get_tenant_usage(tenant_id)
        package = await UsageTrackingService.get_tenant_package(tenant_id)
        
        if not package:
            return {
                "allowed": False,
                "current_usage": 0,
                "limit": 0,
                "remaining": 0,
                "limit_type": resource_type,
                "message": "No active package found"
            }
        
        # Get limits from package features
        features = package.get("features", {})
        
        # Map resource types to usage and limits
        resource_mapping = {
            "projects": {
                "usage": usage.get("projects_count", 0),
                "limit": features.get("max_projects", 0),
                "unit": "projects"
            },
            "users": {
                "usage": usage.get("users_count", 0),
                "limit": features.get("max_users", 0),
                "unit": "users"
            },
            "properties": {
                "usage": usage.get("properties_count", 0),
                "limit": features.get("max_properties", 0),
                "unit": "properties"
            },
            "sms": {
                "usage": usage.get("sms_used_this_month", 0),
                "limit": features.get("sms_credits", 0),
                "unit": "SMS"
            },
            "email": {
                "usage": usage.get("email_used_this_month", 0),
                "limit": features.get("email_credits", 0),
                "unit": "emails"
            },
            "whatsapp": {
                "usage": usage.get("whatsapp_used_this_month", 0),
                "limit": features.get("whatsapp_credits", 0),
                "unit": "WhatsApp messages"
            }
        }
        
        if resource_type not in resource_mapping:
            return {
                "allowed": False,
                "current_usage": 0,
                "limit": 0,
                "remaining": 0,
                "limit_type": resource_type,
                "message": f"Unknown resource type: {resource_type}"
            }
        
        resource_info = resource_mapping[resource_type]
        current_usage = resource_info["usage"]
        limit = resource_info["limit"]
        remaining = max(0, limit - current_usage)
        
        # Check if unlimited (-1 means unlimited)
        if limit == -1:
            return {
                "allowed": True,
                "current_usage": current_usage,
                "limit": -1,
                "remaining": -1,
                "limit_type": resource_type,
                "message": "Unlimited"
            }
        
        allowed = current_usage < limit
        
        if not allowed:
            message = f"Limit reached: {current_usage}/{limit} {resource_info['unit']} used. Please upgrade your plan."
        elif remaining <= limit * 0.1:  # 10% remaining
            message = f"Warning: Only {remaining} {resource_info['unit']} remaining"
        else:
            message = f"{remaining} {resource_info['unit']} remaining"
        
        return {
            "allowed": allowed,
            "current_usage": current_usage,
            "limit": limit,
            "remaining": remaining,
            "limit_type": resource_type,
            "message": message
        }
    
    @staticmethod
    async def increment_usage(tenant_id: str, resource_type: str, amount: int = 1) -> bool:
        """
        Increment usage for a resource
        
        Returns:
            True if incremented successfully, False if limit reached
        """
        # Check limit first
        check_result = await UsageTrackingService.check_limit(tenant_id, resource_type)
        
        if not check_result["allowed"]:
            return False
        
        # Map resource types to field names
        field_mapping = {
            "projects": "projects_count",
            "users": "users_count",
            "properties": "properties_count",
            "sms": "sms_used_this_month",
            "email": "email_used_this_month",
            "whatsapp": "whatsapp_used_this_month"
        }
        
        if resource_type not in field_mapping:
            return False
        
        field_name = field_mapping[resource_type]
        
        # Increment usage
        await db.tenant_usage.update_one(
            {"tenant_id": tenant_id},
            {
                "$inc": {field_name: amount},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        # Check if alert needed (80% usage)
        usage = await UsageTrackingService.get_tenant_usage(tenant_id)
        current_usage = usage.get(field_name, 0)
        limit = check_result["limit"]
        
        if limit > 0:
            percentage_used = (current_usage / limit) * 100
            
            if percentage_used >= 80:
                # Create usage alert
                alert = {
                    "id": str(os.urandom(16).hex()),
                    "tenant_id": tenant_id,
                    "alert_type": "warning" if percentage_used < 100 else "limit_reached",
                    "resource_type": resource_type,
                    "current_usage": current_usage,
                    "limit": limit,
                    "percentage_used": percentage_used,
                    "message": f"{resource_type.upper()} usage at {percentage_used:.1f}%",
                    "is_resolved": False,
                    "created_at": datetime.now(timezone.utc)
                }
                
                # Check if alert already exists
                existing = await db.usage_alerts.find_one({
                    "tenant_id": tenant_id,
                    "resource_type": resource_type,
                    "is_resolved": False
                })
                
                if not existing:
                    await db.usage_alerts.insert_one(alert)
        
        return True
    
    @staticmethod
    async def decrement_usage(tenant_id: str, resource_type: str, amount: int = 1):
        """Decrement usage when resources are deleted"""
        field_mapping = {
            "projects": "projects_count",
            "users": "users_count",
            "properties": "properties_count"
        }
        
        if resource_type not in field_mapping:
            return
        
        field_name = field_mapping[resource_type]
        
        await db.tenant_usage.update_one(
            {"tenant_id": tenant_id},
            {
                "$inc": {field_name: -amount},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    @staticmethod
    async def reset_monthly_usage(tenant_id: str):
        """Reset monthly communication credits"""
        usage = await UsageTrackingService.get_tenant_usage(tenant_id)
        
        # Save to history
        month_key = datetime.now(timezone.utc).strftime("%Y-%m")
        usage_history = usage.get("usage_history", {})
        usage_history[month_key] = {
            "sms": usage.get("sms_used_this_month", 0),
            "email": usage.get("email_used_this_month", 0),
            "whatsapp": usage.get("whatsapp_used_this_month", 0)
        }
        
        # Reset monthly usage
        await db.tenant_usage.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": {
                    "sms_used_this_month": 0,
                    "email_used_this_month": 0,
                    "whatsapp_used_this_month": 0,
                    "last_reset_date": datetime.now(timezone.utc),
                    "usage_history": usage_history,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    async def sync_actual_usage(tenant_id: str):
        """Sync actual counts from database"""
        # Count projects
        projects_count = await db.projects.count_documents({
            "tenant_id": tenant_id,
            "deleted_at": None
        })
        
        # Count users
        users_count = await db.users.count_documents({
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True
        })
        
        # Count properties
        properties_count = await db.properties.count_documents({
            "tenant_id": tenant_id,
            "deleted_at": None
        })
        
        # Update usage
        await db.tenant_usage.update_one(
            {"tenant_id": tenant_id},
            {
                "$set": {
                    "projects_count": projects_count,
                    "users_count": users_count,
                    "properties_count": properties_count,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "projects": projects_count,
            "users": users_count,
            "properties": properties_count
        }

# Singleton instance
usage_service = UsageTrackingService()
