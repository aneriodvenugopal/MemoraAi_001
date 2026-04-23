from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class MasterCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Display name
    slug: str  # URL-friendly identifier
    type: str  # property_type, lead_status, payment_mode, amenity, etc.
    parent_id: Optional[str] = None  # For hierarchy
    level: int = 0  # 0=system/tenant-level, 1=project-level
    is_system: bool = False  # System-defined (cannot delete)
    tenant_id: Optional[str] = None  # If tenant-specific
    project_id: Optional[str] = None  # If project-specific
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class MasterCategoryCreate(BaseModel):
    name: str
    slug: str
    type: str
    parent_id: Optional[str] = None
    level: int = 0
    is_system: bool = False
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    sort_order: int = 0
