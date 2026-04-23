from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class StaffHierarchy(BaseModel):
    """Hierarchical staff structure with gap commissions"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Staff member
    staff_id: str  # User ID
    staff_name: str
    staff_phone: str
    role_id: str  # Role reference
    role_name: str  # For quick access
    
    # Hierarchy
    parent_staff_id: Optional[str] = None  # Reports to (manager/team leader)
    hierarchy_level: int = 0  # 0=Regional Manager, 1=Team Leader, 2=Senior Agent, 3=Junior Agent
    hierarchy_path: List[str] = []  # [regional_manager_id, team_leader_id, senior_agent_id]
    
    # Commission configuration
    direct_commission_percentage: float = 0.0  # Direct commission on own sales
    gap_commission_percentage: float = 0.0  # Gap commission on subordinates' sales
    
    # Project-wise commission overrides
    project_commissions: Dict[str, Dict[str, float]] = {}  # {project_id: {"direct": 1.5, "gap": 0.5}}
    
    # Category-wise commission overrides
    category_commissions: Dict[str, Dict[str, float]] = {}  # {category_id: {"direct": 2.0, "gap": 0.3}}
    
    # Status
    is_active: bool = True
    joined_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    left_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class StaffHierarchyCreate(BaseModel):
    tenant_id: str
    staff_id: str
    staff_name: str
    staff_phone: str
    role_id: str
    role_name: str
    parent_staff_id: Optional[str] = None
    direct_commission_percentage: float = 0.0
    gap_commission_percentage: float = 0.0
    project_commissions: Dict[str, Dict[str, float]] = {}
    category_commissions: Dict[str, Dict[str, float]] = {}

class StaffHierarchyUpdate(BaseModel):
    parent_staff_id: Optional[str] = None
    direct_commission_percentage: Optional[float] = None
    gap_commission_percentage: Optional[float] = None
    project_commissions: Optional[Dict[str, Dict[str, float]]] = None
    category_commissions: Optional[Dict[str, Dict[str, float]]] = None
    is_active: Optional[bool] = None
