from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class CustomerPayment(BaseModel):
    """Payment receive module - customers paying to company"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Booking references (can be multiple properties/projects)
    booking_ids: List[str]  # List of booking IDs this payment covers
    project_ids: List[str]  # Projects involved
    property_ids: List[str]  # Properties involved
    
    # Customer details
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    
    # Payment details
    amount: float
    currency_id: str
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Payment method
    payment_method: str  # "razorpay", "manual", "gateway"
    payment_mode: str  # "upi", "card", "netbanking", "neft", "rtgs", "imps", "cheque", "dd", "cash"
    
    # Transaction details
    transaction_id: Optional[str] = None  # From Razorpay or other gateway
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    
    # Manual payment details
    reference_number: Optional[str] = None  # Cheque number, UTR number, etc.
    bank_name: Optional[str] = None
    cheque_date: Optional[datetime] = None
    payment_screenshot_url: Optional[str] = None  # Customer uploaded screenshot
    
    # Status
    status: str = "pending"  # "pending", "completed", "failed", "refunded"
    gateway_status: Optional[str] = None  # Gateway-specific status
    
    # Clearance (for cheques)
    is_cleared: bool = True  # True for digital, False for cheques initially
    cleared_date: Optional[datetime] = None
    
    # Payment allocation (how amount is distributed across bookings)
    allocation: Dict[str, float] = {}  # {booking_id: amount}
    
    # Receipt
    receipt_number: Optional[str] = None
    receipt_url: Optional[str] = None
    
    # Staff who recorded/collected
    collected_by: Optional[str] = None  # User ID (staff)
    approved_by: Optional[str] = None  # For manual entry approval
    
    # Notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None  # Not visible to customer
    
    # Multi-currency
    exchange_rate: float = 1.0  # If paid in different currency
    base_currency_amount: float  # Amount in tenant's base currency
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class CustomerPaymentCreate(BaseModel):
    tenant_id: str
    booking_ids: List[str]
    customer_id: str
    amount: float
    currency_id: str
    payment_method: str
    payment_mode: str
    transaction_id: Optional[str] = None
    reference_number: Optional[str] = None
    bank_name: Optional[str] = None
    cheque_date: Optional[datetime] = None
    payment_screenshot_url: Optional[str] = None
    allocation: Dict[str, float] = {}
    collected_by: Optional[str] = None
    notes: Optional[str] = None

class RazorpayPaymentCreate(BaseModel):
    """Create Razorpay order"""
    tenant_id: str
    booking_ids: List[str]
    customer_id: str
    amount: float
    currency: str = "INR"
    notes: Optional[str] = None

class RazorpayPaymentVerify(BaseModel):
    """Verify Razorpay payment"""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
