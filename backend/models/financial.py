"""
Financial System Models
Handles payment schedules, transactions, and expenses
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# ============= PAYMENT SCHEDULES =============

class PaymentSchedule(BaseModel):
    """Payment schedule for customer bookings (EMI/Installments)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    customer_id: str
    project_id: str
    tenant_id: str
    
    # Schedule details
    schedule_number: int  # 1, 2, 3... (installment number)
    due_date: datetime
    amount: float
    description: Optional[str] = None  # "Down Payment", "1st EMI", etc.
    
    # Payment status
    status: str = "pending"  # pending, paid, partially_paid, overdue, cancelled
    paid_amount: float = 0.0
    balance_amount: Optional[float] = None
    paid_date: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class PaymentScheduleCreate(BaseModel):
    """Create payment schedule"""
    booking_id: str
    customer_id: str
    project_id: str
    schedule_number: int
    due_date: datetime
    amount: float
    description: Optional[str] = None


# ============= TRANSACTIONS =============

class Transaction(BaseModel):
    """Unified transaction model for all payments (incoming & outgoing)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str  # Auto-generated unique number
    tenant_id: str
    project_id: str
    
    # Transaction type
    type: str  # receivable, payment, commission
    category: Optional[str] = None  # For expenses: construction, marketing, legal, admin, etc.
    
    # Parties involved
    from_party: Optional[str] = None  # Customer name for receivables
    to_party: Optional[str] = None  # Vendor name for payments
    from_party_id: Optional[str] = None  # User/Customer ID
    to_party_id: Optional[str] = None  # Vendor/Staff ID
    
    # Amount details
    amount: float
    currency_id: str
    payment_method: str  # cash, bank_transfer, cheque, upi, online
    
    # Bank details (if applicable)
    bank_account_id: Optional[str] = None
    reference_number: Optional[str] = None  # Cheque no, transaction ID, etc.
    
    # Related entities
    booking_id: Optional[str] = None  # For customer payments
    payment_schedule_id: Optional[str] = None  # Link to schedule
    commission_id: Optional[str] = None  # For commission payouts
    
    # Status
    status: str = "completed"  # pending, completed, failed, cancelled
    payment_date: datetime
    
    # Approval workflow
    requires_approval: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    
    # Additional details
    description: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class TransactionCreate(BaseModel):
    """Create transaction"""
    project_id: str
    type: str
    category: Optional[str] = None
    from_party: Optional[str] = None
    to_party: Optional[str] = None
    from_party_id: Optional[str] = None
    to_party_id: Optional[str] = None
    amount: float
    currency_id: str
    payment_method: str
    bank_account_id: Optional[str] = None
    reference_number: Optional[str] = None
    booking_id: Optional[str] = None
    payment_schedule_id: Optional[str] = None
    commission_id: Optional[str] = None
    payment_date: datetime
    description: Optional[str] = None
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    """Update transaction"""
    status: Optional[str] = None
    notes: Optional[str] = None
    receipt_url: Optional[str] = None


# ============= EXPENSE CATEGORIES =============

class ExpenseCategory(BaseModel):
    """Expense categories for better financial tracking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    name: str  # Construction, Marketing, Legal, Admin, Utilities, etc.
    slug: str
    description: Optional[str] = None
    color: Optional[str] = None  # For UI display
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExpenseCategoryCreate(BaseModel):
    """Create expense category"""
    name: str
    slug: str
    description: Optional[str] = None
    color: Optional[str] = None
