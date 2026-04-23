from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BankAccountBase(BaseModel):
    account_number: str
    account_name: str
    account_type: str  # cash, current, savings, fd
    bank_name: Optional[str] = None
    branch: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    opening_balance: float = 0.0
    is_primary_online: bool = False  # For payment gateway
    is_active: bool = True
    notes: Optional[str] = None

class BankAccountCreate(BankAccountBase):
    tenant_id: str
    project_id: str  # REQUIRED: Bank accounts are now project-specific

class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    account_type: Optional[str] = None
    bank_name: Optional[str] = None
    branch: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    is_primary_online: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class BankAccount(BankAccountBase):
    id: str
    tenant_id: str
    project_id: str  # Project-specific bank account
    current_balance: float
    available_balance: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
