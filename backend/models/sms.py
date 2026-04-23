"""
SMS Automation Models
For SMS tracking and templates
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class SMSMessage(BaseModel):
    """SMS message record"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Recipient details
    recipient_phone: str
    recipient_name: Optional[str] = None
    recipient_id: Optional[str] = None  # User/Lead/Customer ID
    
    # Message details
    message_type: str  # lead_ack, follow_up, payment_reminder, booking_confirm, site_visit, otp
    message_body: str
    template_id: Optional[str] = None
    
    # Related entities
    lead_id: Optional[str] = None
    booking_id: Optional[str] = None
    project_id: Optional[str] = None
    
    # SMS status
    status: str = "pending"  # pending, sent, delivered, failed
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    # Provider details (for real SMS later)
    provider: str = "mock"  # mock, twilio, msg91
    provider_message_id: Optional[str] = None
    cost: float = 0.0
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SMSTemplate(BaseModel):
    """SMS template for different scenarios"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Template details
    name: str
    message_type: str
    template_body: str  # With placeholders like {customer_name}, {project_name}
    language: str = "english"  # english, hindi, hinglish
    
    # Status
    is_active: bool = True
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SMSSendRequest(BaseModel):
    """Request to send SMS"""
    recipient_phone: str
    recipient_name: Optional[str] = None
    recipient_id: Optional[str] = None
    message_type: str
    template_id: Optional[str] = None
    custom_message: Optional[str] = None
    variables: Optional[Dict[str, Any]] = None  # Template variables
    lead_id: Optional[str] = None
    booking_id: Optional[str] = None
    project_id: Optional[str] = None


class SMSTemplateCreate(BaseModel):
    """Create SMS template"""
    name: str
    message_type: str
    template_body: str
    language: str = "english"
