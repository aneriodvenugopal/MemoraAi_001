"""
Booking Queue System Models
- Waitlist for booked/blocked plots
- Queue management when properties become available
- Priority-based allocation

Simple system - NO complex automation
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class QueueStatus(str, Enum):
    WAITING = "waiting"
    NOTIFIED = "notified"  # Property became available, customer notified
    CONVERTED = "converted"  # Customer booked the property
    EXPIRED = "expired"  # Customer didn't respond in time
    CANCELLED = "cancelled"  # Customer cancelled
    SKIPPED = "skipped"  # Skipped to next in queue


class BookingQueue(BaseModel):
    """Queue entry for a property"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str  # Property/plot they're waiting for
    
    # Customer details
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    
    # Contact details (denormalized)
    customer_name: str
    customer_mobile: str
    customer_email: Optional[str] = None
    
    # Queue position
    position: int  # 1, 2, 3... (1 = first in queue)
    priority: int = 0  # Higher priority gets first chance (0 = normal)
    
    # Interest details
    max_price: Optional[float] = None  # Max budget
    notes: Optional[str] = None
    
    # Status
    status: QueueStatus = QueueStatus.WAITING
    
    # Notification tracking
    notified_at: Optional[datetime] = None
    response_deadline: Optional[datetime] = None
    response_received: Optional[str] = None  # interested, not_interested, no_response
    
    # Timestamps
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    
    created_by: str


class BookingQueueCreate(BaseModel):
    project_id: str
    property_id: str
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    customer_name: str
    customer_mobile: str
    customer_email: Optional[str] = None
    max_price: Optional[float] = None
    notes: Optional[str] = None
    priority: int = 0


class BookingQueueUpdate(BaseModel):
    max_price: Optional[float] = None
    notes: Optional[str] = None
    priority: Optional[int] = None


class QueueNotify(BaseModel):
    """Model for notifying queue member"""
    message: Optional[str] = None
    response_hours: int = 48  # Hours to respond


class QueueResponse(BaseModel):
    """Model for customer response"""
    response: str  # interested, not_interested
    notes: Optional[str] = None
