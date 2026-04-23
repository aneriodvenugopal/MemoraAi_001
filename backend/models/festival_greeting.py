"""
Festival Greetings Models
- Simple brand recall system
- ONLY Republic Day (Jan 26) and Independence Day (Aug 15)
- NO marketing, NO tracking, NO analytics
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class FestivalGreetingConfig(BaseModel):
    """Tenant-level greeting configuration - just ON/OFF"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Simple ON/OFF - no customization
    is_enabled: bool = False
    
    # Company name for message
    company_name: str
    
    # Last updated
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None


class GreetingRecipient(BaseModel):
    """
    Approved contacts for greetings
    - Existing customers ONLY
    - Past customers ONLY
    - NO leads, NO cold numbers
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Contact details
    name: str
    mobile: str
    
    # Source - must be customer
    source_type: str = "customer"  # customer, past_customer, internal_contact
    source_id: Optional[str] = None  # Reference to customer ID if applicable
    
    # Status
    is_active: bool = True
    opted_out: bool = False  # If contact requested no messages
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class GreetingLog(BaseModel):
    """
    Simple audit log - just records what was sent
    NO analytics, NO tracking, NO engagement metrics
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Which festival
    festival: str  # "republic_day" or "independence_day"
    festival_date: str  # "2026-01-26" or "2026-08-15"
    
    # Who received
    recipient_id: str
    recipient_name: str
    recipient_mobile: str
    
    # Message sent (fixed format)
    message: str
    
    # Status
    status: str = "sent"  # sent, failed
    error_message: Optional[str] = None
    
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GreetingRecipientCreate(BaseModel):
    name: str
    mobile: str
    source_type: str = "customer"
    source_id: Optional[str] = None
