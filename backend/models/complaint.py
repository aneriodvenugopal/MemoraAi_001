"""
Complaint System Models
- Customer complaint registration
- Priority and status tracking
- Staff assignment
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class ComplaintStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    PENDING_CUSTOMER = "pending_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class ComplaintPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplaintCategory(str, Enum):
    CONSTRUCTION = "construction"
    DOCUMENTATION = "documentation"
    PAYMENT = "payment"
    DELIVERY = "delivery"
    QUALITY = "quality"
    STAFF_BEHAVIOR = "staff_behavior"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class Complaint(BaseModel):
    """Customer complaint model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Complaint number (auto-generated)
    complaint_number: str
    
    # Customer info
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    
    # Related entities
    project_id: Optional[str] = None
    property_id: Optional[str] = None
    booking_id: Optional[str] = None
    
    # Complaint details
    category: ComplaintCategory = ComplaintCategory.OTHER
    subject: str
    description: str
    
    # Priority and status
    priority: ComplaintPriority = ComplaintPriority.MEDIUM
    status: ComplaintStatus = ComplaintStatus.OPEN
    
    # Assignment
    assigned_to: Optional[str] = None  # Staff user ID
    assigned_at: Optional[datetime] = None
    
    # Resolution
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    
    # Customer satisfaction
    satisfaction_rating: Optional[int] = None  # 1-5
    feedback: Optional[str] = None
    
    # Attachments
    attachments: List[dict] = []  # [{name, url, type}]
    
    # Escalation
    is_escalated: bool = False
    escalated_to: Optional[str] = None
    escalation_reason: Optional[str] = None
    
    # SLA tracking
    sla_due_date: Optional[datetime] = None
    sla_breached: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class ComplaintComment(BaseModel):
    """Comment/update on a complaint"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    complaint_id: str
    
    # Commenter
    user_id: Optional[str] = None
    user_name: str
    user_type: str = "staff"  # staff, customer
    
    # Content
    comment: str
    is_internal: bool = False  # Internal notes not visible to customer
    
    # Status change
    status_changed_to: Optional[str] = None
    
    # Timestamp
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Request/Response models
class CreateComplaintRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    project_id: Optional[str] = None
    property_id: Optional[str] = None
    booking_id: Optional[str] = None
    category: ComplaintCategory = ComplaintCategory.OTHER
    subject: str
    description: str
    priority: ComplaintPriority = ComplaintPriority.MEDIUM


class UpdateComplaintRequest(BaseModel):
    category: Optional[ComplaintCategory] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[ComplaintPriority] = None
    status: Optional[ComplaintStatus] = None
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None


class AddCommentRequest(BaseModel):
    complaint_id: str
    comment: str
    is_internal: bool = False
    status_change: Optional[ComplaintStatus] = None


class EscalateComplaintRequest(BaseModel):
    complaint_id: str
    escalate_to: str
    reason: str


class ResolveComplaintRequest(BaseModel):
    complaint_id: str
    resolution: str


class CustomerFeedbackRequest(BaseModel):
    complaint_id: str
    satisfaction_rating: int  # 1-5
    feedback: Optional[str] = None
