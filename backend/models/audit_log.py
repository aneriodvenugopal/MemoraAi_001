from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    auditable_type: str  # Model name (e.g., "Property", "Lead")
    auditable_id: str  # Record ID
    user_id: Optional[str] = None  # Who made the change
    event: str  # created, updated, deleted, restored, viewed, exported
    module: str  # property, lead, payment, commission, booking
    old_values: Optional[Dict] = None  # Before change (field-wise)
    new_values: Optional[Dict] = None  # After change (field-wise)
    changed_fields: Optional[List[str]] = None  # Array of changed field names
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    description: Optional[str] = None  # Human-readable description
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLogCreate(BaseModel):
    auditable_type: str
    auditable_id: str
    user_id: Optional[str] = None
    event: str
    module: str
    old_values: Optional[Dict] = None
    new_values: Optional[Dict] = None
    changed_fields: Optional[List[str]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None
    description: Optional[str] = None
