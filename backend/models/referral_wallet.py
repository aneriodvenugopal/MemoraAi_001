"""
Referral & Wallet System Models
- Referral tracking with codes
- Wallet balance and transactions
- Reward payouts
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import random
import string


class ReferralStatus(str, Enum):
    PENDING = "pending"  # Referral link shared but not used
    REGISTERED = "registered"  # Referred person registered
    QUALIFIED = "qualified"  # Referred person met criteria (e.g., site visit)
    REWARDED = "rewarded"  # Reward credited to referrer
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class TransactionType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"
    REFERRAL_REWARD = "referral_reward"
    BOOKING_DISCOUNT = "booking_discount"
    WITHDRAWAL = "withdrawal"
    ADJUSTMENT = "adjustment"


class WithdrawalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


def generate_referral_code(length: int = 8) -> str:
    """Generate unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


class Referral(BaseModel):
    """Referral tracking model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Referrer (existing customer who refers)
    referrer_id: str
    referrer_name: Optional[str] = None
    referrer_phone: Optional[str] = None
    referral_code: str = Field(default_factory=lambda: generate_referral_code())
    
    # Referred person
    referred_id: Optional[str] = None  # Customer ID after registration
    referred_name: Optional[str] = None
    referred_phone: Optional[str] = None
    referred_email: Optional[str] = None
    
    # Status tracking
    status: ReferralStatus = ReferralStatus.PENDING
    
    # Reward details
    reward_amount: float = 0
    reward_type: str = "cash"  # cash, discount, points
    reward_credited: bool = False
    reward_credited_at: Optional[datetime] = None
    
    # Qualification criteria
    qualification_type: str = "site_visit"  # site_visit, booking, registration
    qualification_met: bool = False
    qualification_date: Optional[datetime] = None
    
    # Project specific (optional)
    project_id: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class Wallet(BaseModel):
    """Customer wallet model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_id: str
    
    # Balance
    balance: float = 0
    total_earned: float = 0
    total_withdrawn: float = 0
    total_used: float = 0  # Used for bookings/discounts
    
    # Pending
    pending_rewards: float = 0  # Rewards waiting for qualification
    
    # Status
    is_active: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class WalletTransaction(BaseModel):
    """Wallet transaction record"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    wallet_id: str
    customer_id: str
    
    # Transaction details
    transaction_type: TransactionType
    amount: float
    balance_before: float
    balance_after: float
    
    # Reference
    reference_type: Optional[str] = None  # referral, booking, withdrawal
    reference_id: Optional[str] = None
    
    # Description
    description: str
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class WithdrawalRequest(BaseModel):
    """Wallet withdrawal request"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    wallet_id: str
    customer_id: str
    
    # Amount
    amount: float
    
    # Bank details
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    upi_id: Optional[str] = None
    
    # Status
    status: WithdrawalStatus = WithdrawalStatus.PENDING
    
    # Processing
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    transaction_reference: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


# Request/Response models
class CreateReferralRequest(BaseModel):
    referrer_id: str
    reward_amount: float = 1000  # Default reward
    reward_type: str = "cash"
    qualification_type: str = "site_visit"
    project_id: Optional[str] = None
    expires_days: int = 90  # Referral expires in 90 days


class RegisterReferredRequest(BaseModel):
    referral_code: str
    referred_name: str
    referred_phone: str
    referred_email: Optional[str] = None


class QualifyReferralRequest(BaseModel):
    referral_id: str
    qualification_notes: Optional[str] = None


class WithdrawalRequestCreate(BaseModel):
    amount: float
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    upi_id: Optional[str] = None


class ProcessWithdrawalRequest(BaseModel):
    withdrawal_id: str
    approved: bool
    transaction_reference: Optional[str] = None
    rejection_reason: Optional[str] = None


class WalletAdjustmentRequest(BaseModel):
    customer_id: str
    amount: float  # Positive for credit, negative for debit
    description: str
