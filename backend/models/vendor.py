from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class VendorBase(BaseModel):
    vendor_code: Optional[str] = None
    vendor_name: str
    vendor_type: str  # workforce, goods_supplier, service_provider, others
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    
    # Bank details for payments
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    
    status: str = "contact"  # contact, active_vendor
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    tenant_id: str
    project_id: Optional[str] = None

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    vendor_type: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class Vendor(VendorBase):
    id: str
    tenant_id: str
    project_id: Optional[str] = None
    total_billed: float = 0.0
    total_paid: float = 0.0
    balance_due: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VendorBillBase(BaseModel):
    vendor_id: str
    project_id: str
    bill_number: Optional[str] = None
    bill_date: datetime
    committed_amount: float
    description: str
    work_type: Optional[str] = None  # road_leveling, dozer_work, plantation, etc
    due_date: Optional[datetime] = None
    status: str = "pending"  # pending, partial, paid
    notes: Optional[str] = None

class VendorBillCreate(VendorBillBase):
    tenant_id: str

class VendorBillUpdate(BaseModel):
    bill_number: Optional[str] = None
    bill_date: Optional[datetime] = None
    committed_amount: Optional[float] = None
    description: Optional[str] = None
    work_type: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class VendorBill(VendorBillBase):
    id: str
    tenant_id: str
    paid_amount: float = 0.0
    balance_amount: float
    payment_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
