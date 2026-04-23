from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class PropertyImage(BaseModel):
    """Property image with metadata"""
    url: str
    caption: Optional[str] = None
    is_cover: bool = False
    uploaded_at: Optional[str] = None

class PropertyVideo(BaseModel):
    """Property video with metadata"""
    url: str  # YouTube URL or direct video URL
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    is_youtube: bool = False

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str  # Reference to Project
    tenant_id: str  # Reference to Tenant (denormalized for easy querying)
    
    # Property identification
    property_number: str  # Plot 101, Flat A-201, etc.
    property_type_id: Optional[str] = None  # Reference to MasterCategory (plot, flat, villa)
    
    # Details
    area: float  # in sq ft or sq yards
    unit: str = "sqft"  # sqft, sqyards, sqm
    facing: Optional[str] = None  # North, South, East, West
    floor: Optional[int] = None  # For flats
    block: Optional[str] = None  # Block A, B, C
    
    # Pricing
    price: float
    currency_id: Optional[str] = None
    price_per_sqft: Optional[float] = None
    booking_amount: Optional[float] = None  # Token amount to book/block
    contact_for_price: bool = False  # Hide price, show "Contact for Price"
    
    # Status
    status_id: Optional[str] = None  # Reference to MasterCategory (available, blocked, booked, sold, resale)
    
    # Layout link
    layout_plot_id: Optional[str] = None  # Link to layout plot
    layout_coordinates: Optional[list] = None  # Polygon coordinates from layout
    
    # Blocking (24-hour hold)
    blocked_by: Optional[str] = None  # User ID
    blocked_at: Optional[datetime] = None
    blocked_until: Optional[datetime] = None
    
    # Booking
    booked_by: Optional[str] = None  # Customer ID
    booked_at: Optional[datetime] = None
    
    # Layout position (for visual representation)
    layout_x: Optional[float] = None
    layout_y: Optional[float] = None
    
    # Features
    features: list[str] = []  # Corner plot, park facing, etc.
    
    # Media - Enhanced with property-wise images and videos
    images: List[str] = []  # Legacy: simple URL list
    property_images: List[Dict[str, Any]] = []  # New: images with metadata
    property_videos: List[Dict[str, Any]] = []  # New: videos with metadata
    
    # Dimensions (for plots)
    length: Optional[float] = None
    width: Optional[float] = None
    
    # Resale
    is_resale: bool = False
    resale_requested_at: Optional[datetime] = None
    resale_approved_at: Optional[datetime] = None
    original_owner_id: Optional[str] = None
    
    # ========== NEW: Certification & Location Fields ==========
    # Location (property-wise or inherited from block)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_address: Optional[str] = None  # Full address from Google Places
    location_source: Optional[str] = None  # 'property', 'block', 'project'
    
    # Certification
    is_certified: bool = False
    certified_at: Optional[datetime] = None
    certified_by: Optional[str] = None  # User ID who certified
    certification_note: Optional[str] = None
    
    # Legal Info (optional)
    survey_number: Optional[str] = None
    registration_number: Optional[str] = None
    approval_number: Optional[str] = None
    legal_documents: List[str] = []  # Document URLs
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

class PropertyCreate(BaseModel):
    project_id: str
    tenant_id: str
    property_number: str
    property_type_id: str
    area: float
    unit: str = "sqft"
    facing: Optional[str] = None
    floor: Optional[int] = None
    block: Optional[str] = None
    price: float
    currency_id: str
    status_id: str
    features: list[str] = []
    images: list[str] = []
    length: Optional[float] = None
    width: Optional[float] = None
    layout_x: Optional[float] = None
    layout_y: Optional[float] = None

class PropertyUpdate(BaseModel):
    property_number: Optional[str] = None
    area: Optional[float] = None
    unit: Optional[str] = None
    facing: Optional[str] = None
    floor: Optional[int] = None
    block: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    price: Optional[float] = None
    price_per_sqft: Optional[float] = None
    booking_amount: Optional[float] = None
    contact_for_price: Optional[bool] = None
    status_id: Optional[str] = None
    features: Optional[list[str]] = None
    images: Optional[list[str]] = None
    property_images: Optional[List[Dict[str, Any]]] = None
    property_videos: Optional[List[Dict[str, Any]]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_address: Optional[str] = None
    is_certified: Optional[bool] = None
    certification_note: Optional[str] = None
    survey_number: Optional[str] = None
    registration_number: Optional[str] = None

class PropertyBlock(BaseModel):
    property_id: str
    user_id: str
    duration_hours: int = 24

class PropertyBook(BaseModel):
    property_id: str
    customer_id: str
