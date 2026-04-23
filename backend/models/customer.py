from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Customer(BaseModel):
    """Enhanced Customer Model for Indian Real Estate"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    user_id: Optional[str] = None  # Link to users collection if they have login
    
    # Basic Information
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    # Identity (Indian specific)
    aadhar_number: Optional[str] = None  # 12 digit
    pan_number: Optional[str] = None  # ABCDE1234F format
    
    # NRI Details
    is_nri: bool = False
    passport_number: Optional[str] = None
    country_of_residence: Optional[str] = None
    
    # Joint Buyer Details (Common in Indian real estate)
    is_joint_buyer: bool = False
    joint_buyers: List[dict] = []  # [{name, phone, relation, aadhar, pan}]
    
    # Contact Preference
    preferred_contact_method: str = "phone"  # phone, whatsapp, email
    preferred_contact_time: Optional[str] = None  # morning, afternoon, evening
    
    # Source (How they found us)
    source_slug: Optional[str] = None  # lead_source category slug
    referred_by_customer_id: Optional[str] = None  # If referred
    referred_by_broker_id: Optional[str] = None  # If broker referred
    
    # Documents
    documents: List[dict] = []  # [{type, url, verified, uploaded_at}]
    
    # Wallet (for referral rewards)
    wallet_balance: float = 0.0
    total_wallet_earned: float = 0.0
    total_wallet_used: float = 0.0
    
    # Status
    status: str = "active"  # active, inactive, blacklisted
    notes: Optional[str] = None
    tags: List[str] = []
    
    # Conversion tracking
    converted_from_lead_id: Optional[str] = None
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class CustomerCreate(BaseModel):
    tenant_id: str
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    is_nri: bool = False
    passport_number: Optional[str] = None
    country_of_residence: Optional[str] = None
    is_joint_buyer: bool = False
    joint_buyers: List[dict] = []
    preferred_contact_method: str = "phone"
    preferred_contact_time: Optional[str] = None
    source_slug: Optional[str] = None
    referred_by_customer_id: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    converted_from_lead_id: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
    is_nri: Optional[bool] = None
    passport_number: Optional[str] = None
    country_of_residence: Optional[str] = None
    is_joint_buyer: Optional[bool] = None
    joint_buyers: Optional[List[dict]] = None
    preferred_contact_method: Optional[str] = None
    preferred_contact_time: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class CustomerWalletTransaction(BaseModel):
    """Customer wallet transaction for referral rewards"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    tenant_id: str
    
    # Transaction details
    type: str  # credit, debit
    amount: float
    balance_after: float
    
    # Reason
    reason: str  # referral_reward, booking_discount, expiry, refund
    description: Optional[str] = None
    
    # Reference
    reference_type: Optional[str] = None  # referral, booking
    reference_id: Optional[str] = None
    
    # Validity
    valid_until: Optional[datetime] = None
    is_expired: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JointBuyer(BaseModel):
    """Joint buyer details"""
    name: str
    phone: str
    relation: str  # spouse, parent, child, sibling, other
    email: Optional[EmailStr] = None
    aadhar_number: Optional[str] = None
    pan_number: Optional[str] = None
