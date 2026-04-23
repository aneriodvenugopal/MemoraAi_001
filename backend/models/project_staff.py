from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class ProjectStaffBase(BaseModel):
    """
    Base model for flexible role assignment system.
    Supports: one-one, one-many, many-many, many-one relationships.
    Same user can have multiple roles in same/different projects and tenants.
    """
    user_id: str
    tenant_id: str  # Which tenant this role assignment belongs to
    project_id: Optional[str] = None  # NULL = tenant-level role, otherwise project-specific
    role_id: str  # Reference to roles collection (agent, customer, staff, vendor, supervisor, project_admin, etc.)
    role_name: Optional[str] = None  # Cached role name for quick access (agent, customer, etc.)
    
    # Context-specific metadata (different for each role assignment)
    context_metadata: Dict[str, Any] = Field(default_factory=dict)  # {commission_percentage: 5.0, permissions: [...], etc.}
    
    # Legacy fields for backward compatibility
    commission_rate: float = 0.0  # Deprecated: use context_metadata.commission_percentage
    can_create_staff: bool = False  
    can_view_all_projects: bool = False  # True for tenant-level roles like tenant_admin
    
    status: str = "active"  # active, inactive, suspended
    
class ProjectStaff(ProjectStaffBase):
    """
    Flexible role assignment with all fields.
    Examples:
    - Ramu as agent in Tenant1-ProjectA: {user_id: "ramu", tenant_id: "t1", project_id: "pA", role_id: "agent", context_metadata: {commission_percentage: 5.0}}
    - Ramu as customer in Tenant1-ProjectA: {user_id: "ramu", tenant_id: "t1", project_id: "pA", role_id: "customer", context_metadata: {property_ids: ["p1"]}}
    - Ramu as supervisor in Tenant1-ProjectB: {user_id: "ramu", tenant_id: "t1", project_id: "pB", role_id: "supervisor", context_metadata: {commission_percentage: 7.0}}
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_by: Optional[str] = None  # User ID who assigned this role
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ProjectStaffCreate(ProjectStaffBase):
    """Create project staff assignment"""
    pass

class ProjectStaffUpdate(BaseModel):
    """Update project staff assignment"""
    role: Optional[str] = None
    commission_rate: Optional[float] = None
    can_create_staff: Optional[bool] = None
    can_view_all_projects: Optional[bool] = None
    status: Optional[str] = None
    project_id: Optional[str] = None  # Allow project transfer

class QuickStaffCreate(BaseModel):
    """Quickly create new staff during project creation"""
    phone: str
    name: str
    email: Optional[str] = None
    role: str = "sales"
    commission_rate: float = 0.0
    password: str = "staff123"  # Default password
