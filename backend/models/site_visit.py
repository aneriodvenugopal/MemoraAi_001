"""
Site Visit Management Models
- Schedule site visits for leads/customers
- Assign staff to conduct visits
- Log visit outcomes
- Track visit history

Simple, accountant-friendly system - NO fancy automation
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class VisitStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class VisitOutcome(str, Enum):
    INTERESTED = "interested"
    NOT_INTERESTED = "not_interested"
    NEEDS_FOLLOWUP = "needs_followup"
    BOOKING_INITIATED = "booking_initiated"
    NEGOTIATING = "negotiating"
    PENDING = "pending"


class SiteVisit(BaseModel):
    """Site visit record"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    
    # Visitor details - can be lead or customer
    visitor_type: str = "lead"  # lead, customer, walk_in
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    
    # Visitor contact (denormalized for quick access)
    visitor_name: str
    visitor_mobile: str
    visitor_email: Optional[str] = None
    
    # Visit scheduling
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM (24hr format)
    duration_minutes: int = 60  # Default 1 hour
    
    # Assignment
    assigned_to: str  # Staff user ID
    assigned_to_name: str  # Denormalized
    
    # Status tracking
    status: VisitStatus = VisitStatus.SCHEDULED
    
    # Outcome (filled after visit)
    outcome: Optional[VisitOutcome] = None
    feedback: Optional[str] = None  # Visitor's feedback
    staff_notes: Optional[str] = None  # Internal notes
    
    # Properties shown during visit
    properties_shown: List[str] = []  # Property IDs
    
    # Follow-up
    followup_required: bool = False
    followup_date: Optional[str] = None
    followup_notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None


class SiteVisitCreate(BaseModel):
    project_id: str
    visitor_type: str = "lead"
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    visitor_name: str
    visitor_mobile: str
    visitor_email: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    duration_minutes: int = 60
    assigned_to: str
    staff_notes: Optional[str] = None


class SiteVisitUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    assigned_to: Optional[str] = None
    status: Optional[VisitStatus] = None
    staff_notes: Optional[str] = None


class SiteVisitComplete(BaseModel):
    """Model for completing a site visit"""
    outcome: VisitOutcome
    feedback: Optional[str] = None
    staff_notes: Optional[str] = None
    properties_shown: List[str] = []
    followup_required: bool = False
    followup_date: Optional[str] = None
    followup_notes: Optional[str] = None


class SiteVisitCancel(BaseModel):
    """Model for cancelling a site visit"""
    cancellation_reason: str
    reschedule_date: Optional[str] = None
    reschedule_time: Optional[str] = None
