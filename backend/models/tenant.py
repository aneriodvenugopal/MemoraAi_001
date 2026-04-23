from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class TenantCredits(BaseModel):
    """Tenant communication credits"""
    sms_remaining: int = 0
    email_remaining: int = 0
    whatsapp_remaining: int = 0
    sms_used: int = 0
    email_used: int = 0
    whatsapp_used: int = 0


class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company_name: str
    phone: str
    email: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    base_currency_id: str  # Reference to Currency
    primary_language: str = "en"
    timezone: str = "Asia/Kolkata"
    is_active: bool = True
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    package_id: Optional[str] = None
    
    # SaaS Admin fields
    status: str = Field(default="active", description="active, inactive, suspended")
    billing_cycle: str = Field(default="monthly", description="monthly or yearly")
    next_billing_date: Optional[datetime] = None
    auto_renew: bool = Field(default=True, description="Automatic subscription renewal")
    credits: TenantCredits = Field(default_factory=TenantCredits)
    
    # Module Permissions - List of enabled module IDs
    # Default: Only essential modules for Indian real estate companies
    enabled_modules: List[str] = Field(
        default_factory=lambda: [
            "dashboard",           # Always needed
            "projects",            # Core - manage properties
            "leads",               # Core - track leads
            "bookings_sales",      # Core - track sales
            "billing_subscription", # Core - manage subscription
            "users_staff",         # Core - manage team
        ],
        description="List of module IDs that tenant can access"
    )
    
    # Landing Page / Custom Domain fields
    custom_domain: Optional[str] = Field(None, description="Custom domain for tenant (e.g., abc.com)")
    subdomain: Optional[str] = Field(None, description="Subdomain slug (e.g., 'abc' for abc.realapex.in)")
    logo_url: Optional[str] = Field(None, description="Company logo URL")
    banner_url: Optional[str] = Field(None, description="Banner image URL for landing page")
    tagline: Optional[str] = Field(None, description="Company tagline/slogan")
    description: Optional[str] = Field(None, description="Company description for landing page")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class TenantCreate(BaseModel):
    name: str
    company_name: str
    phone: str
    email: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    base_currency_id: str
    primary_language: str = "en"
    package_id: str  # Required for SaaS
    billing_cycle: str = Field(default="monthly", description="monthly or yearly")
    auto_renew: bool = Field(default=True)


class TenantUpdate(BaseModel):
    """Update tenant"""
    name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    package_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    auto_renew: Optional[bool] = None

class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    price: float
    currency_id: str
    max_projects: int
    max_staff: int
    features: List[str] = []  # List of feature identifiers
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency_id: str
    max_projects: int
    max_staff: int
    features: List[str] = []
