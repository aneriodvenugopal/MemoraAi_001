from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReferralCode(BaseModel):
    """User's referral code"""
    id: str
    user_id: str
    tenant_id: str
    referral_code: str
    referral_link: str
    total_referrals: int = 0
    total_earned: float = 0.0
    created_at: str
    is_active: bool = True

class ReferralCreate(BaseModel):
    """Create referral tracking"""
    referrer_code: str
    referee_phone: str
    referee_name: Optional[str] = None

class Referral(BaseModel):
    """Referral tracking"""
    id: str
    referrer_id: str  # Person who referred
    referrer_name: str
    referee_id: str  # Person who got referred
    referee_name: str
    referee_phone: str
    referral_code: str
    tenant_id: str
    status: str  # pending, completed, rewarded
    referrer_reward: float = 500.0
    referee_reward: float = 500.0
    created_at: str
    completed_at: Optional[str] = None
    rewarded_at: Optional[str] = None

class ReferralStats(BaseModel):
    """Referral statistics"""
    total_referrals: int
    completed_referrals: int
    pending_referrals: int
    total_earned: float
    available_balance: float
    referral_code: str
    referral_link: str

class ShareTemplate(BaseModel):
    """Pre-built share templates"""
    id: str
    template_type: str  # whatsapp, sms, email, social
    title: str
    message: str
    image_url: Optional[str] = None
    language: str = "en"
