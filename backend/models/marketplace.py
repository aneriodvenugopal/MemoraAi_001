from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

# ============================================
# Agent Models (for IncomeLands Agents)
# ============================================

class AgentProfile(BaseModel):
    """IncomeLands Agent Profile for ExlainERP integration"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Agent information
    name: str
    phone: str  # Primary identifier
    email: Optional[EmailStr] = None
    
    # Agent location
    city: Optional[str] = None
    state: Optional[str] = None
    areas_covered: List[str] = []  # Areas/localities they operate in
    
    # Geolocation (current location or primary operation area)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # IncomeLands specific
    incomelands_user_id: Optional[str] = None
    experience_years: Optional[int] = None
    
    # Performance metrics
    total_leads_submitted: int = 0
    converted_leads: int = 0
    total_commission_earned: float = 0.0
    
    # Status
    is_verified: bool = False
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentProfileCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    state: Optional[str] = None
    areas_covered: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    incomelands_user_id: Optional[str] = None
    experience_years: Optional[int] = None

# ============================================
# Buyer Requirement Models (from IncomeLands)
# ============================================

class BuyerRequirement(BaseModel):
    """Buyer requirements posted in IncomeLands"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Requirement details
    requirement_type: str  # buy, rent, invest
    property_type: str  # plot, flat, villa, commercial, agricultural
    
    # Budget
    budget_min: float
    budget_max: float
    currency: str = "INR"
    
    # Location preferences
    preferred_locations: List[str] = []  # Cities/areas
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = 10.0  # Search radius
    
    # Property specifications
    min_area: Optional[float] = None  # in sqft
    max_area: Optional[float] = None
    facing_preference: Optional[str] = None
    
    # Additional preferences
    amenities_required: List[str] = []
    notes: Optional[str] = None
    
    # Contact details
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    
    # Posted by (agent or direct buyer)
    posted_by_agent_id: Optional[str] = None  # If posted by agent
    is_direct_buyer: bool = False  # True if buyer posted directly
    
    # Matching status
    matched_properties_count: int = 0
    viewed_properties: List[str] = []  # Property IDs
    contacted_properties: List[str] = []  # Property IDs where contact was made
    
    # Status
    status: str = "active"  # active, matched, closed
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

class BuyerRequirementCreate(BaseModel):
    requirement_type: str
    property_type: str
    budget_min: float
    budget_max: float
    preferred_locations: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = 10.0
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    facing_preference: Optional[str] = None
    amenities_required: List[str] = []
    notes: Optional[str] = None
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    posted_by_agent_id: Optional[str] = None
    is_direct_buyer: bool = False

# ============================================
# Marketplace Lead Models (from Agents)
# ============================================

class MarketplaceLead(BaseModel):
    """Leads submitted by IncomeLands agents"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # ExlainERP references
    tenant_id: str  # Developer
    project_id: str
    property_id: Optional[str] = None  # Specific property interested in
    
    # Agent who brought the lead
    agent_id: str  # Reference to AgentProfile
    agent_name: str
    agent_phone: str
    
    # Buyer information
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    
    # Lead details
    budget: Optional[float] = None
    interested_area: Optional[float] = None  # Preferred plot/flat size
    notes: Optional[str] = None
    
    # Lead source tracking
    source: str = "incomelands"  # Always from IncomeLands
    source_detail: Optional[str] = None  # Map view, requirement match, search
    
    # Status in ExlainERP
    retoerp_lead_id: Optional[str] = None  # Once created in ExlainERP leads table
    status: str = "new"  # new, contacted, site_visit, negotiation, converted, lost
    
    # Conversion tracking
    is_converted: bool = False
    booking_id: Optional[str] = None
    converted_at: Optional[datetime] = None
    
    # Commission tracking
    commission_eligible: bool = True
    commission_amount: Optional[float] = None
    commission_status: str = "pending"  # pending, calculated, approved, paid
    
    # Developer interaction
    contacted_by_developer: bool = False
    contacted_at: Optional[datetime] = None
    last_updated_by_developer_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MarketplaceLeadCreate(BaseModel):
    tenant_id: str
    project_id: str
    property_id: Optional[str] = None
    agent_id: str
    agent_name: str
    agent_phone: str
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    budget: Optional[float] = None
    interested_area: Optional[float] = None
    notes: Optional[str] = None
    source_detail: Optional[str] = None

class MarketplaceLeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    contacted_by_developer: Optional[bool] = None

# ============================================
# Commission Models (for Agent commissions)
# ============================================

class AgentCommission(BaseModel):
    """Commission tracking for IncomeLands agents"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # References
    agent_id: str  # AgentProfile ID
    agent_name: str
    agent_phone: str
    
    marketplace_lead_id: str  # MarketplaceLead ID
    tenant_id: str  # Developer
    project_id: str
    property_id: str
    booking_id: str  # ExlainERP booking
    
    # Property details
    property_value: float
    currency: str = "INR"
    
    # Commission calculation
    commission_percentage: float  # e.g., 1.0 for 1%
    commission_amount: float
    platform_fee_percentage: float = 0.0  # Platform's cut
    platform_fee_amount: float = 0.0
    agent_net_amount: float  # After platform fee
    
    # Multi-level split (if agent network involved)
    is_multi_level: bool = False
    parent_agent_id: Optional[str] = None
    parent_agent_share: Optional[float] = None
    
    # Status
    status: str = "pending"  # pending, approved, processing, paid, cancelled
    
    # Approval workflow
    approved_by_developer: bool = False
    approved_by_developer_at: Optional[datetime] = None
    approved_by_platform: bool = False
    approved_by_platform_at: Optional[datetime] = None
    
    # Payment
    payment_date: Optional[datetime] = None
    payment_mode: Optional[str] = None  # bank_transfer, upi, wallet
    transaction_reference: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AgentCommissionCreate(BaseModel):
    marketplace_lead_id: str
    booking_id: str
    notes: Optional[str] = None

class AgentCommissionUpdate(BaseModel):
    status: Optional[str] = None
    approved_by_developer: Optional[bool] = None
    approved_by_platform: Optional[bool] = None
    payment_date: Optional[datetime] = None
    payment_mode: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None

# ============================================
# Property Contact Unlock Models
# ============================================

class PropertyContactUnlock(BaseModel):
    """Track when agents unlock property/developer contacts (₹10 per unlock)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    agent_id: str
    agent_phone: str
    tenant_id: str  # Developer whose contact was unlocked
    project_id: str
    property_id: Optional[str] = None
    
    unlock_fee: float = 10.0  # ₹10
    currency: str = "INR"
    
    # What was unlocked
    developer_phone: str
    developer_email: Optional[str] = None
    project_manager_phone: Optional[str] = None
    
    # Payment
    paid: bool = True
    payment_method: str  # credits, upi, wallet
    transaction_id: Optional[str] = None
    
    # Usage tracking
    lead_created: bool = False  # Did agent create lead after unlocking
    lead_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyContactUnlockCreate(BaseModel):
    agent_id: str
    agent_phone: str
    tenant_id: str
    project_id: str
    property_id: Optional[str] = None
    payment_method: str
    transaction_id: Optional[str] = None
