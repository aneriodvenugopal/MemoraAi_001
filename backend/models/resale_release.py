"""
Resale/Release System Models
- Release: Property returned to inventory (booking cancelled/failed)
- Resale: Customer wants to sell their property
- Auto-notify interested parties in booking queue
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class ReleaseReason(str, Enum):
    BOOKING_CANCELLED = "booking_cancelled"
    PAYMENT_DEFAULT = "payment_default"
    CUSTOMER_REQUEST = "customer_request"
    LEGAL_ISSUE = "legal_issue"
    OTHER = "other"


class ResaleStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    LISTED = "listed"
    UNDER_NEGOTIATION = "under_negotiation"
    SOLD = "sold"
    WITHDRAWN = "withdrawn"
    REJECTED = "rejected"


class PropertyRelease(BaseModel):
    """Record when a property is released back to inventory"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    
    # Previous owner details
    previous_customer_id: Optional[str] = None
    previous_customer_name: Optional[str] = None
    previous_booking_id: Optional[str] = None
    
    # Release details
    release_reason: ReleaseReason
    release_notes: Optional[str] = None
    
    # Financial
    refund_amount: float = 0
    deduction_amount: float = 0
    deduction_reason: Optional[str] = None
    
    # Status
    is_processed: bool = False
    notification_sent: bool = False
    notified_count: int = 0
    
    # Timestamps
    released_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    released_by: str
    processed_at: Optional[datetime] = None


class PropertyResale(BaseModel):
    """Record when a customer wants to resell their property"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    booking_id: str
    
    # Seller details
    seller_customer_id: str
    seller_name: str
    seller_phone: str
    
    # Property details (denormalized)
    property_number: Optional[str] = None
    property_area: Optional[float] = None
    property_area_unit: Optional[str] = None
    
    # Pricing
    original_price: float
    asking_price: float
    minimum_price: Optional[float] = None  # Lowest acceptable
    
    # Commission (tenant gets commission on resale)
    commission_percentage: float = 2.0  # Default 2%
    commission_amount: Optional[float] = None
    
    # Status
    status: ResaleStatus = ResaleStatus.PENDING_APPROVAL
    
    # Listing
    is_listed: bool = False
    listed_at: Optional[datetime] = None
    listing_expiry: Optional[datetime] = None
    
    # Buyer (when sold)
    buyer_customer_id: Optional[str] = None
    buyer_name: Optional[str] = None
    final_price: Optional[float] = None
    
    # Notes
    seller_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Notifications
    interested_parties_notified: bool = False
    notified_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    created_by: str


class ResaleInquiry(BaseModel):
    """Inquiry from interested buyer for resale property"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    resale_id: str
    
    # Inquirer details
    inquirer_name: str
    inquirer_phone: str
    inquirer_email: Optional[str] = None
    
    # Offer
    offered_price: Optional[float] = None
    message: Optional[str] = None
    
    # Status
    status: str = "new"  # new, contacted, negotiating, rejected, accepted
    
    # Notes
    staff_notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PropertyReleaseCreate(BaseModel):
    project_id: str
    property_id: str
    previous_customer_id: Optional[str] = None
    previous_customer_name: Optional[str] = None
    previous_booking_id: Optional[str] = None
    release_reason: ReleaseReason
    release_notes: Optional[str] = None
    refund_amount: float = 0
    deduction_amount: float = 0
    deduction_reason: Optional[str] = None


class PropertyResaleCreate(BaseModel):
    project_id: str
    property_id: str
    booking_id: str
    seller_customer_id: str
    seller_name: str
    seller_phone: str
    property_number: Optional[str] = None
    property_area: Optional[float] = None
    property_area_unit: Optional[str] = None
    original_price: float
    asking_price: float
    minimum_price: Optional[float] = None
    commission_percentage: float = 2.0
    seller_notes: Optional[str] = None


class ResaleApproval(BaseModel):
    approved: bool
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    commission_percentage: Optional[float] = None


class ResaleInquiryCreate(BaseModel):
    resale_id: str
    inquirer_name: str
    inquirer_phone: str
    inquirer_email: Optional[str] = None
    offered_price: Optional[float] = None
    message: Optional[str] = None
