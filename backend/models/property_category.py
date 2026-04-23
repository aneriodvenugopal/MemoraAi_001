from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class MasterPropertyCategory(BaseModel):
    """Master categories for property types (system-level)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # "Residential", "Commercial", "Industrial", "Agricultural"
    slug: str  # "residential", "commercial", "industrial", "agricultural"
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon name or emoji
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MasterPropertySubcategory(BaseModel):
    """Master subcategories under each master category (system-level)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    master_category_id: str  # Reference to MasterPropertyCategory
    name: str  # "Apartments", "Villas", "Plots", "Office Spaces", etc.
    slug: str  # "apartments", "villas", "plots", "office_spaces"
    description: Optional[str] = None
    icon: Optional[str] = None
    # Additional fields that can be configured for this subcategory
    additional_fields: List[str] = []  # ["balcony_count", "parking_slots", "floor_number"]
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TenantPropertyCategory(BaseModel):
    """Tenant-specific categories (can customize or create new)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    master_category_id: Optional[str] = None  # If based on master category
    name: str  # "Premium Apartments", "Budget Homes", "Luxury Villas"
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class TenantPropertySubcategory(BaseModel):
    """Tenant-specific subcategories"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    tenant_category_id: str  # Reference to TenantPropertyCategory
    master_subcategory_id: Optional[str] = None  # If based on master subcategory
    name: str  # "2BHK", "3BHK", "Penthouse", "Studio Apartment"
    slug: str
    description: Optional[str] = None
    additional_fields: List[str] = []  # Custom fields for this subcategory
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class PropertyCategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0

class TenantPropertyCategoryCreate(BaseModel):
    tenant_id: str
    master_category_id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
