from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # Reference to Tenant
    project_id: Optional[str] = None  # Reference to Project (interested in)
    
    # Lead information - Made optional for backward compatibility with old data
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    
    # Alternative fields that might be used in old data
    buyer_name: Optional[str] = None  # Legacy field
    buyer_phone: Optional[str] = None  # Legacy field
    
    # Lead details
    source_id: Optional[str] = None  # Reference to MasterCategory (lead_source)
    status_id: Optional[str] = None  # Reference to MasterCategory (lead_status)
    
    # Assignment
    assigned_to: Optional[str] = None  # User ID (staff)
    assigned_at: Optional[datetime] = None
    
    # Interest details
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    property_type_id: Optional[str] = None  # Interested property type
    preferred_location: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Follow-up
    next_followup_date: Optional[datetime] = None
    last_followup_date: Optional[datetime] = None
    followup_count: int = 0
    
    # Conversion
    is_converted: bool = False
    converted_to_customer_id: Optional[str] = None
    converted_at: Optional[datetime] = None
    
    # Rating (1-5 stars, lead quality)
    rating: Optional[int] = None
    
    # Tags
    tags: List[str] = []
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class LeadCreate(BaseModel):
    tenant_id: str
    project_id: Optional[str] = None
    name: str  # Required for new leads
    phone: str  # Required for new leads
    email: Optional[EmailStr] = None
    source_id: Optional[str] = None
    status_id: Optional[str] = None  # Made optional - will use default if not provided
    assigned_to: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    property_type_id: Optional[str] = None
    preferred_location: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    tags: List[str] = []

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    source_id: Optional[str] = None
    status_id: Optional[str] = None
    assigned_to: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    property_type_id: Optional[str] = None
    preferred_location: Optional[str] = None
    notes: Optional[str] = None
    next_followup_date: Optional[datetime] = None
    rating: Optional[int] = None
    tags: Optional[List[str]] = None

class LeadFollowup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str  # Reference to Lead
    tenant_id: str
    project_id: Optional[str] = None
    
    # Followup details
    followup_type: str  # call, email, sms, whatsapp, site_visit, meeting
    followup_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Who did the follow-up
    followed_by: str  # User ID (staff)
    
    # Notes from follow-up
    notes: str
    outcome: Optional[str] = None  # interested, not_interested, callback_later, site_visit_scheduled
    
    # Next follow-up
    next_followup_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadFollowupCreate(BaseModel):
    lead_id: str
    followup_type: str
    followed_by: str
    notes: str
    outcome: Optional[str] = None
    next_followup_date: Optional[datetime] = None

class LeadConvert(BaseModel):
    lead_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
