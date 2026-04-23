from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # SuperAdmin, TenantAdmin, Staff, Customer
    slug: str  # super_admin, tenant_admin, staff, customer
    description: Optional[str] = None
    is_system: bool = True  # System roles cannot be deleted
    permissions: List[str] = []  # List of permission slugs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoleCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    permissions: List[str] = []

class Permission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str  # view_projects, create_property, manage_leads, etc.
    module: str  # project, property, lead, payment, etc.
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PermissionCreate(BaseModel):
    name: str
    slug: str
    module: str
    description: Optional[str] = None

# ============= MULTI-ROLE ACCESS CONTROL MODELS =============

class RoleAssignment(BaseModel):
    """User role assignment for specific context (tenant + project + role)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tenant_id: str
    project_id: Optional[str] = None  # None for tenant-level roles (e.g., Tenant Admin)
    role_id: str
    
    # Assignment tracking
    assigned_by: str
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Status
    is_active: bool = True
    
    # Optional: Time-based roles
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    # Optional: Context metadata
    metadata: Optional[dict] = None  # reporting_to, team_id, commission_percentage, target_monthly, etc.

class RoleAssignmentCreate(BaseModel):
    """Create role assignment request"""
    user_id: str
    tenant_id: str
    project_id: Optional[str] = None
    role_id: str
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    metadata: Optional[dict] = None

class RoleAssignmentUpdate(BaseModel):
    """Update role assignment"""
    is_active: Optional[bool] = None
    valid_until: Optional[datetime] = None
    metadata: Optional[dict] = None

class UserSession(BaseModel):
    """User session with active role context"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    
    # Current active context
    active_tenant_id: str
    active_project_id: Optional[str] = None
    active_role_id: str
    
    # Cached permissions for quick access
    permissions: List[str] = []
    
    # Session metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class ContextSelection(BaseModel):
    """User context selection on login"""
    tenant_id: str
    project_id: Optional[str] = None
    role_id: str

class UserContext(BaseModel):
    """User's available context (role in a project/tenant)"""
    tenant_id: str
    tenant_name: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    role_id: str
    role_name: str
    role_slug: str
    level: int  # Role power level
    permissions: List[str]
