from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class SchemeField(BaseModel):
    """Dynamic field in a payment scheme"""
    field_name: str  # e.g., "Initial Amount", "3rd Month Payment", "6th Month Special"
    field_value: float  # Amount in base currency
    due_month: int  # Month number (0 for initial, 1 for first month, etc.)
    is_percentage: bool = False  # If True, field_value is percentage of total
    description: Optional[str] = None

class PaymentScheme(BaseModel):
    """Payment scheme templates (12 months, 18 months, 24 months, custom)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: Optional[str] = None  # If None, applies to all projects
    
    # Scheme details
    scheme_name: str  # "12 Months Scheme", "18 Months Scheme", "24 Months", "Custom"
    scheme_type: str  # "12_months", "18_months", "24_months", "custom"
    duration_months: int  # Total duration in months
    
    # Dynamic fields
    fields: List[SchemeField]  # List of payment fields with amounts and due dates
    
    # Calculated totals
    total_amount: float  # Sum of all field values (calculated)
    
    # Status
    is_finalized: bool = False  # Once finalized, cannot edit/delete
    is_active: bool = True
    is_template: bool = False  # System templates created by admin
    
    # Metadata
    description: Optional[str] = None
    terms_conditions: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class PaymentSchemeCreate(BaseModel):
    tenant_id: str
    project_id: Optional[str] = None
    scheme_name: str
    scheme_type: str
    duration_months: int
    fields: List[SchemeField]
    description: Optional[str] = None
    terms_conditions: Optional[str] = None
    is_template: bool = False

class PaymentSchemeUpdate(BaseModel):
    scheme_name: Optional[str] = None
    fields: Optional[List[SchemeField]] = None
    description: Optional[str] = None
    terms_conditions: Optional[str] = None
    is_active: Optional[bool] = None
