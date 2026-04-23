"""
Vendor Management Module Models
- Vendor directory
- Vendor payments tracking
- Bill management
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class VendorCategory(str, Enum):
    CONSTRUCTION = "construction"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    INTERIOR = "interior"
    LANDSCAPING = "landscaping"
    LEGAL = "legal"
    MARKETING = "marketing"
    SECURITY = "security"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class VendorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLACKLISTED = "blacklisted"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Vendor(BaseModel):
    """Vendor/Supplier model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Basic info
    name: str
    company_name: Optional[str] = None
    category: VendorCategory = VendorCategory.OTHER
    
    # Contact
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    # Business details
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    
    # Status
    status: VendorStatus = VendorStatus.ACTIVE
    rating: Optional[float] = None  # 1-5 rating
    
    # Documents
    documents: List[dict] = []  # [{name, url, type}]
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class VendorBill(BaseModel):
    """Vendor bill/invoice model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    vendor_id: str
    project_id: Optional[str] = None
    
    # Bill details
    bill_number: str
    bill_date: datetime
    due_date: datetime
    
    # Amount
    amount: float
    tax_amount: float = 0
    total_amount: float = 0
    paid_amount: float = 0
    balance_amount: Optional[float] = None
    
    # Description
    description: str
    items: List[dict] = []  # [{description, quantity, rate, amount}]
    
    # Payment
    status: PaymentStatus = PaymentStatus.PENDING
    
    # Documents
    bill_document_url: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None


class VendorPayment(BaseModel):
    """Payment made to vendor"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    vendor_id: str
    bill_id: Optional[str] = None
    project_id: Optional[str] = None
    
    # Payment details
    amount: float
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_method: str  # cash, bank_transfer, upi, cheque
    
    # Reference
    reference_number: Optional[str] = None
    transaction_id: Optional[str] = None
    cheque_number: Optional[str] = None
    
    # Tracking
    description: Optional[str] = None
    approved_by: Optional[str] = None
    
    # Documents
    payment_proof_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


# Request/Response models
class VendorCreate(BaseModel):
    name: str
    company_name: Optional[str] = None
    category: VendorCategory = VendorCategory.OTHER
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    category: Optional[VendorCategory] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    status: Optional[VendorStatus] = None
    rating: Optional[float] = None
    notes: Optional[str] = None


class BillCreate(BaseModel):
    vendor_id: str
    project_id: Optional[str] = None
    bill_number: str
    bill_date: datetime
    due_date: datetime
    amount: float
    tax_amount: float = 0
    description: str
    items: List[dict] = []
    notes: Optional[str] = None


class BillUpdate(BaseModel):
    bill_number: Optional[str] = None
    bill_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    description: Optional[str] = None
    items: Optional[List[dict]] = None
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    vendor_id: str
    bill_id: Optional[str] = None
    project_id: Optional[str] = None
    amount: float
    payment_method: str
    reference_number: Optional[str] = None
    transaction_id: Optional[str] = None
    cheque_number: Optional[str] = None
    description: Optional[str] = None
