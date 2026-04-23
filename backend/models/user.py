from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    email: Optional[EmailStr] = None
    name: str
    role_id: str  # Reference to Role
    tenant_id: Optional[str] = None  # None for SuperAdmin
    is_active: bool = True
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class UserCreate(BaseModel):
    phone: str
    email: Optional[EmailStr] = None
    name: str
    role_id: str
    tenant_id: Optional[str] = None

class UserLogin(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: Optional[bool] = None
