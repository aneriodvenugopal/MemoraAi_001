from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class CommissionEarning(BaseModel):
    """Commission earned by staff on a booking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    booking_id: str
    payment_id: Optional[str] = None  # Customer payment that triggered commission
    
    # Staff who earned
    staff_id: str
    staff_name: str
    
    # Commission type
    commission_type: str  # "direct" (own sale) or "gap" (subordinate's sale)
    
    # Hierarchy info (for gap commission)
    sales_staff_id: Optional[str] = None  # Who made the actual sale (for gap commission)
    sales_staff_name: Optional[str] = None
    hierarchy_level_difference: Optional[int] = None  # Levels between earner and seller
    
    # Commission calculation
    property_value: float
    payment_received: float  # Amount of customer payment
    commission_percentage: float
    commission_amount: float
    currency_id: str
    
    # Configuration used
    project_specific: bool = False  # Was project-specific rate used?
    category_specific: bool = False  # Was category-specific rate used?
    
    # TDS
    tds_percentage: float = 5.0  # Default 5% TDS
    tds_amount: float
    net_commission: float  # commission_amount - tds_amount
    
    # Status
    status: str = "pending"  # "pending", "approved", "paid", "on_hold", "cancelled"
    
    # Approval workflow
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    
    # Payment
    paid_date: Optional[datetime] = None
    payment_mode: Optional[str] = None
    payment_reference: Optional[str] = None
    paid_by: Optional[str] = None  # Admin who processed payment
    
    # Notes
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionPayout(BaseModel):
    """Commission payout record - payment transfer module"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Staff receiving payout
    staff_id: str
    staff_name: str
    staff_phone: str
    staff_bank_account: Optional[str] = None
    staff_bank_ifsc: Optional[str] = None
    staff_upi_id: Optional[str] = None
    
    # Commission earnings included in this payout
    commission_earning_ids: List[str]  # List of CommissionEarning IDs
    
    # Payout amount
    total_commission: float
    total_tds: float
    net_payout: float
    currency_id: str
    
    # Payment details
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_mode: str  # "bank_transfer", "upi", "cheque", "cash"
    payment_reference: str  # UTR number, transaction ID, cheque number
    
    # Bank account used for payment
    company_account_id: Optional[str] = None  # Which company account was used
    
    # Status
    status: str = "completed"  # "pending", "processing", "completed", "failed"
    
    # Processing
    processed_by: str  # Admin/staff who processed payout
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Receipt
    receipt_url: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommissionPayoutCreate(BaseModel):
    tenant_id: str
    staff_id: str
    commission_earning_ids: List[str]
    payment_mode: str
    payment_reference: str
    company_account_id: Optional[str] = None
    processed_by: str
    notes: Optional[str] = None

class CommissionApproval(BaseModel):
    """Approve/reject commission earning"""
    commission_earning_id: str
    action: str  # "approve", "reject", "hold"
    notes: Optional[str] = None
