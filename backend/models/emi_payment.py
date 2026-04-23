"""
Strict EMI Payment Module Models
- EMI schedules with due dates
- Late payment tracking with penalties
- Payment status: pending, paid, overdue, partial
- Automated overdue detection
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class EMIStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    WAIVED = "waived"


class EMISchedule(BaseModel):
    """EMI installment schedule"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    booking_id: str
    customer_id: str
    property_id: str
    
    # Installment details
    installment_number: int  # 1, 2, 3... (0 = down payment)
    due_amount: float
    due_date: datetime
    
    # Payment tracking
    paid_amount: float = 0
    remaining_amount: Optional[float] = None
    status: EMIStatus = EMIStatus.PENDING
    
    # Late fee tracking
    is_overdue: bool = False
    days_overdue: int = 0
    late_fee_percentage: float = 2.0  # Default 2% per month
    late_fee_amount: float = 0
    total_due: float = 0  # due_amount + late_fee
    
    # Payment details
    payment_id: Optional[str] = None
    paid_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    receipt_number: Optional[str] = None
    
    # Reminder tracking
    reminder_sent: bool = False
    reminder_count: int = 0
    last_reminder_date: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class EMIPaymentRecord(BaseModel):
    """Record of payment against an EMI"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    emi_id: str
    booking_id: str
    customer_id: str
    
    amount: float
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_method: str  # cash, bank_transfer, upi, cheque, razorpay
    
    # Reference details
    transaction_id: Optional[str] = None
    reference_number: Optional[str] = None
    receipt_number: Optional[str] = None
    
    # Late fee handling
    late_fee_paid: float = 0
    principal_paid: float = 0
    
    # Staff tracking
    collected_by: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EMISummary(BaseModel):
    """Summary of EMI status for a booking"""
    booking_id: str
    customer_name: str
    property_name: str
    project_name: str
    
    total_emi_amount: float
    total_paid: float
    total_pending: float
    total_late_fees: float
    
    total_installments: int
    paid_installments: int
    pending_installments: int
    overdue_installments: int
    
    next_due_date: Optional[datetime] = None
    next_due_amount: Optional[float] = None
    
    payment_progress: float = 0  # Percentage


class CreateEMIScheduleRequest(BaseModel):
    booking_id: str
    total_amount: float
    down_payment: float = 0
    emi_months: int
    start_date: Optional[datetime] = None
    late_fee_percentage: float = 2.0


class RecordEMIPaymentRequest(BaseModel):
    emi_id: str
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    include_late_fee: bool = True  # Whether to deduct late fee from payment


class WaiveLateFeeRequest(BaseModel):
    emi_id: str
    reason: str
    partial_waive_amount: Optional[float] = None  # If None, waive full late fee


class BulkReminderRequest(BaseModel):
    days_before_due: int = 7  # Send reminder X days before due
    include_overdue: bool = True
