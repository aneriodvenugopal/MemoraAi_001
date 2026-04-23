"""
Resale Request Models
For customers requesting to resell their properties
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ResaleRequest(BaseModel):
    """Customer's request to resell property"""
    id: str
    customer_id: str
    customer_name: str
    tenant_id: str
    project_id: str
    project_name: str
    property_id: Optional[str] = None
    plot_number: Optional[str] = None
    
    # Request details
    reason: str
    expected_price: Optional[float] = None
    urgent: bool = False
    contact_phone: str
    contact_email: Optional[str] = None
    
    # Status
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None  # Admin user ID who reviewed
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ResaleRequestCreate(BaseModel):
    """Create resale request"""
    project_id: str
    property_id: Optional[str] = None
    plot_number: Optional[str] = None
    reason: str
    expected_price: Optional[float] = None
    urgent: bool = False
    contact_phone: str
    contact_email: Optional[str] = None

class ResaleRequestReview(BaseModel):
    """Review resale request (admin action)"""
    status: str  # approved or rejected
    review_notes: Optional[str] = None
