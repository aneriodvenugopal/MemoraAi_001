"""
Share-based Referral Models
Connects content sharing with referral rewards system
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ShareReferral(BaseModel):
    """Track shares with referral codes for reward calculation"""
    id: str
    article_id: str
    sharer_id: str  # User who shared
    sharer_name: str
    share_code: str  # Unique tracking code for this share
    share_link: str  # Full tracking link
    platform: str  # whatsapp, facebook, linkedin, email, etc.
    
    # Tracking
    view_count: int = 0  # How many people viewed via this link
    click_count: int = 0  # How many clicked CTA
    lead_count: int = 0  # How many converted to leads
    
    # Rewards
    credits_earned: float = 0.0
    reward_status: str = "pending"  # pending, earned, paid
    
    # Metadata
    tenant_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_activity_at: Optional[str] = None

class ShareReward(BaseModel):
    """Reward configuration for viral sharing"""
    id: str
    tenant_id: Optional[str] = None  # None = global config
    
    # Reward tiers
    reward_per_view: float = 1.0  # Credits per view
    reward_per_share: float = 10.0  # Credits when someone re-shares
    reward_per_lead: float = 100.0  # Credits per lead captured
    reward_per_conversion: float = 500.0  # Credits per paid conversion
    
    # Thresholds
    min_payout_threshold: float = 500.0  # Minimum to withdraw
    viral_threshold: int = 100  # Views to qualify as "viral"
    viral_bonus: float = 1000.0  # Bonus for viral content
    
    # Status
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ShareLeadCapture(BaseModel):
    """Lead captured from shared content"""
    id: str
    article_id: str
    share_code: str  # Which share link brought this lead
    sharer_id: str  # Person who shared and will get credit
    
    # Lead info
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None
    
    # Source tracking
    referrer_url: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Status
    status: str = "new"  # new, contacted, converted, lost
    conversion_value: float = 0.0
    
    # Reward tracking
    credit_awarded: float = 0.0
    credit_status: str = "pending"  # pending, awarded, paid
    
    tenant_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    converted_at: Optional[str] = None

class ShareAnalytics(BaseModel):
    """Analytics for share performance"""
    user_id: str
    total_shares: int = 0
    total_views: int = 0
    total_leads: int = 0
    total_credits_earned: float = 0.0
    available_credits: float = 0.0
    pending_credits: float = 0.0
    
    # Top performing shares
    top_article_id: Optional[str] = None
    top_article_views: int = 0
    
    # Platform breakdown
    platform_stats: dict = {}  # {platform: count}

class CreateShareLinkRequest(BaseModel):
    """Request to create a trackable share link"""
    article_id: str
    platform: str  # whatsapp, facebook, linkedin, email, sms
    message: Optional[str] = None

class TrackShareActivityRequest(BaseModel):
    """Track activity on a share link"""
    share_code: str
    activity_type: str  # view, click, share, lead
    metadata: Optional[dict] = None
