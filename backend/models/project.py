from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Any
from datetime import datetime, timezone
import uuid


def empty_to_none(v: Any) -> Any:
    """Convert empty strings to None for optional fields"""
    if v == "" or v == "null" or v == "undefined":
        return None
    return v


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # Reference to Tenant
    name: str
    description: Optional[str] = None
    project_type: Optional[str] = None  # Make optional for backward compatibility
    location: str
    address: Optional[str] = None
    city: Optional[str] = None  # Make optional for backward compatibility
    state: Optional[str] = None  # Make optional for backward compatibility
    country: str = "India"
    pincode: Optional[str] = None
    
    # Geolocation (for map)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Project details
    total_area: Optional[float] = None  # in sq ft or acres
    total_units: int = 0  # Total properties in project
    
    # Status
    status: str = "active"  # active, completed, upcoming, on_hold
    start_date: Optional[str] = None  # Match database field name
    expected_completion: Optional[str] = None  # Match database field name
    launch_date: Optional[datetime] = None  # Keep for backward compatibility
    completion_date: Optional[datetime] = None  # Keep for backward compatibility
    
    # Additional fields from database
    rera_number: Optional[str] = None
    
    # Pricing
    price_per_unit: Optional[float] = None  # Base price
    currency_id: Optional[str] = None  # Make optional for backward compatibility
    
    # Media
    images: list[str] = []  # Image URLs
    brochure_url: Optional[str] = None
    video_url: Optional[str] = None
    
    # Features & Amenities
    amenities: list[str] = []  # Category IDs
    features: list[str] = []
    
    # Stats (computed)
    available_units: int = 0
    sold_units: int = 0
    blocked_units: int = 0
    
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # Match database format
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())  # Match database format
    deleted_at: Optional[str] = None  # Match database format


class ProjectCreate(BaseModel):
    tenant_id: str
    name: str
    description: Optional[str] = None
    project_type: Optional[str] = None
    location: Optional[str] = ""
    address: Optional[str] = None
    city: Optional[str] = ""
    state: Optional[str] = ""
    country: str = "India"
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_area: Optional[float] = None
    currency_id: Optional[str] = None
    price_per_unit: Optional[float] = None
    launch_date: Optional[datetime] = None
    images: list[str] = []
    amenities: list[str] = []
    features: list[str] = []
    
    # Validator to convert empty strings to None for numeric fields
    @field_validator('latitude', 'longitude', 'total_area', 'price_per_unit', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v == "null" or v == "undefined" or v is None:
            return None
        return v
    
    # Validator to convert empty strings to None for optional string fields
    @field_validator('currency_id', 'pincode', 'address', 'description', mode='before')
    @classmethod
    def empty_str_to_none_str(cls, v):
        if v == "" or v == "null" or v == "undefined":
            return None
        return v

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    price_per_unit: Optional[float] = None
    images: Optional[list[str]] = None
    amenities: Optional[list[str]] = None
    features: Optional[list[str]] = None
