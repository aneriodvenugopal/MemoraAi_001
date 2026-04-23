from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class IncomeLandsUser(BaseModel):
    """IncomeLands User Model"""
    id: str
    mobile: str
    name: Optional[str] = None
    password_hash: Optional[str] = None
    otp: Optional[str] = None
    otp_expires_at: Optional[datetime] = None
    free_credits: int = 20  # Default 20 free credits
    paid_credits: int = 0
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class IncomeLandsUserRegister(BaseModel):
    """Registration request model"""
    mobile: str = Field(..., min_length=10, max_length=10)
    name: Optional[str] = None
    password: str = Field(..., min_length=6)
    referral_code: Optional[str] = None

class IncomeLandsUserLogin(BaseModel):
    """Login request model"""
    mobile: str = Field(..., min_length=10, max_length=10)
    password: str = Field(..., min_length=6)

class IncomeLandsSendOTP(BaseModel):
    """Send OTP request model"""
    mobile: str = Field(..., min_length=10, max_length=10)

class IncomeLandsVerifyOTP(BaseModel):
    """Verify OTP request model"""
    mobile: str = Field(..., min_length=10, max_length=10)
    otp: str = Field(..., min_length=6, max_length=6)
    name: Optional[str] = None  # For new user registration via OTP
    referral_code: Optional[str] = None

class IncomeLandsSetPassword(BaseModel):
    """Set password after OTP verification"""
    mobile: str = Field(..., min_length=10, max_length=10)
    password: str = Field(..., min_length=6)
