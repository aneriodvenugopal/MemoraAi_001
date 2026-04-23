from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    
    # Customer information
    customer_id: str  # User ID (customer role)
    customer_name: Optional[str] = None  # Make optional for backward compatibility
    customer_phone: Optional[str] = None  # Make optional for backward compatibility
    customer_email: Optional[str] = None
    
    # Booking details
    booking_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # Match database format
    booking_amount: Optional[float] = None  # Make optional for backward compatibility
    total_amount: float  # Total property price (can be int or float in database)
    currency_id: Optional[str] = None  # Make optional for backward compatibility
    
    # Additional fields from database
    paid_amount: Optional[float] = None
    balance_amount: Optional[float] = None
    payment_plan: Optional[str] = None  # Database field name
    agreement_number: Optional[str] = None
    is_active: Optional[bool] = True
    
    # Payment plan
    payment_plan_type: Optional[str] = "full_payment"  # full_payment, emi, custom - Made optional for backward compatibility
    emi_months: Optional[int] = None  # If EMI
    down_payment: Optional[float] = None
    
    # Status
    status: str = "active"  # active, completed, cancelled
    
    # Lead reference (if converted from lead)
    lead_id: Optional[str] = None
    
    # Sales agent/staff who closed the deal
    closed_by: Optional[str] = None  # User ID (staff)
    
    # Documents
    agreement_url: Optional[str] = None
    documents: List[str] = []  # Document URLs
    
    # Notes
    notes: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # Match database format
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # Match database format
    deleted_at: Optional[str] = None  # Match database format

class BookingCreate(BaseModel):
    tenant_id: str
    project_id: str
    property_id: str
    customer_id: Optional[str] = None  # Auto-created if not provided
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    booking_amount: float
    total_amount: float
    currency_id: Optional[str] = None
    payment_plan_type: str
    emi_months: Optional[int] = None
    down_payment: Optional[float] = None
    lead_id: Optional[str] = None
    closed_by: Optional[str] = None
    notes: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    property_id: str
    booking_id: str
    
    # Payment details
    amount: float
    currency_id: str
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_mode_id: str  # Reference to MasterCategory (payment_mode)
    
    # Bank account for receiving payment
    bank_account_id: Optional[str] = None  # Reference to bank_accounts collection
    
    # Transaction details
    transaction_id: Optional[str] = None
    reference_number: Optional[str] = None
    
    # Status
    status: str = "completed"  # pending, completed, failed, refunded
    
    # Payment type
    payment_type: str  # booking, installment, full_payment, additional
    installment_number: Optional[int] = None  # If installment
    
    # Receipt
    receipt_number: Optional[str] = None
    receipt_url: Optional[str] = None
    
    # Collected by
    collected_by: Optional[str] = None  # User ID (staff)
    
    # Notes
    notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    booking_id: str
    amount: float
    payment_mode_id: str
    bank_account_id: Optional[str] = None  # Bank account to receive payment
    transaction_id: Optional[str] = None
    reference_number: Optional[str] = None
    payment_type: str
    installment_number: Optional[int] = None
    collected_by: Optional[str] = None
    notes: Optional[str] = None

class PaymentSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    project_id: str
    booking_id: str
    
    # Schedule details
    installment_number: int
    due_amount: float
    due_date: datetime
    currency_id: str
    
    # Payment status
    paid_amount: float = 0.0
    remaining_amount: float = 0.0
    status: str = "pending"  # pending, partial, paid, overdue
    
    # Payment reference
    payment_id: Optional[str] = None
    paid_date: Optional[datetime] = None
    
    # Reminders
    reminder_sent: bool = False
    reminder_count: int = 0
    last_reminder_date: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentScheduleCreate(BaseModel):
    booking_id: str
    installment_number: int
    due_amount: float
    due_date: datetime
