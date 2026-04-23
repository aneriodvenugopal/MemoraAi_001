from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class CommissionRule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: Optional[str] = None  # If None, applies to all projects
    
    # Rule name
    name: str
    description: Optional[str] = None
    
    # Commission type
    commission_type: str  # percentage, flat_amount
    
    # Commission value
    commission_value: float  # 2.5 (for 2.5%) or 50000 (for flat amount)
    
    # Role-based (which role this applies to)
    role_id: Optional[str] = None  # If None, applies to all staff
    
    # Conditions
    min_property_value: Optional[float] = None
    max_property_value: Optional[float] = None
    property_type_id: Optional[str] = None  # Specific property type
    
    # Priority (higher number = higher priority)
    priority: int = 0
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionRuleCreate(BaseModel):
    tenant_id: str
    project_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    commission_type: str
    commission_value: float
    role_id: Optional[str] = None
    min_property_value: Optional[float] = None
    max_property_value: Optional[float] = None
    property_type_id: Optional[str] = None
    priority: int = 0

class Commission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    booking_id: str
    
    # Staff who earned commission
    staff_id: str  # User ID
    staff_name: str
    
    # Commission calculation
    property_value: float
    commission_rule_id: str
    commission_type: str  # percentage, flat_amount
    commission_percentage: Optional[float] = None
    commission_amount: float
    currency_id: str
    
    # Payment status
    status: str = "pending"  # pending, approved, paid, cancelled
    
    # Payment details
    payment_date: Optional[datetime] = None
    payment_mode: Optional[str] = None
    transaction_reference: Optional[str] = None
    
    # Approval
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    
    # Notes
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionCreate(BaseModel):
    booking_id: str
    staff_id: str
    notes: Optional[str] = None

class CommissionPayout(BaseModel):
    commission_id: str
    payment_mode: str
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
