from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class UserExtended(BaseModel):
    """Extended User model with project assignments"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    email: Optional[EmailStr] = None
    name: str
    role_id: str  # Reference to Role
    tenant_id: Optional[str] = None  # None for SuperAdmin
    assigned_projects: List[str] = Field(default_factory=list)  # List of project IDs for project managers
    is_active: bool = True
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class UserProjectAssignment(BaseModel):
    """Model for assigning projects to users"""
    user_id: str
    project_ids: List[str]
