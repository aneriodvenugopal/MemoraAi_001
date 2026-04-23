from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime
from uuid import uuid4

class PackageFeatures(BaseModel):
    """Features enabled in a package"""
    max_projects: int = Field(..., description="Maximum number of projects allowed")
    max_users: int = Field(..., description="Maximum number of users allowed")
    max_properties: int = Field(..., description="Maximum number of properties allowed")
    
    # Feature flags
    advanced_analytics: bool = Field(default=False, description="Advanced analytics and reports")
    ai_advisory: bool = Field(default=True, description="AI-powered property advisory")
    multi_language: bool = Field(default=True, description="Multi-language support")
    custom_branding: bool = Field(default=False, description="Custom branding and white-labeling")
    api_access: bool = Field(default=False, description="API access for integrations")
    priority_support: bool = Field(default=False, description="Priority customer support")
    payment_gateway: bool = Field(default=True, description="Payment gateway integration")
    referral_system: bool = Field(default=True, description="Referral and commission system")
    resale_marketplace: bool = Field(default=False, description="Resale marketplace access")
    mobile_app: bool = Field(default=True, description="Mobile PWA app")
    
    # Communication credits per month
    sms_credits: int = Field(..., description="SMS credits per month")
    email_credits: int = Field(..., description="Email credits per month")
    whatsapp_credits: int = Field(..., description="WhatsApp credits per month")


class PackageCreate(BaseModel):
    """Create new package"""
    name: str = Field(..., description="Package name (Starter, Professional, Enterprise)")
    description: Optional[str] = Field(None, description="Package description")
    monthly_price: float = Field(..., description="Monthly price in local currency")
    yearly_price: float = Field(..., description="Yearly price in local currency")
    features: PackageFeatures
    is_active: bool = Field(default=True, description="Is package currently available")
    display_order: int = Field(default=0, description="Display order on pricing page")


class Package(PackageCreate):
    """Package model"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "pkg_123",
                "name": "Professional",
                "description": "Perfect for growing real estate businesses",
                "monthly_price": 15000,
                "yearly_price": 153000,
                "features": {
                    "max_projects": 10,
                    "max_users": 25,
                    "max_properties": 1000,
                    "advanced_analytics": True,
                    "ai_advisory": True,
                    "multi_language": True,
                    "custom_branding": False,
                    "api_access": False,
                    "priority_support": True,
                    "payment_gateway": True,
                    "referral_system": True,
                    "resale_marketplace": True,
                    "mobile_app": True,
                    "sms_credits": 2000,
                    "email_credits": 5000,
                    "whatsapp_credits": 1000
                },
                "is_active": True,
                "display_order": 2
            }
        }


class PackageUpdate(BaseModel):
    """Update existing package"""
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    features: Optional[PackageFeatures] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
