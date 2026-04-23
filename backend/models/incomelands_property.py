from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class PropertyArea(BaseModel):
    acres: Optional[float] = 0
    guntas: Optional[int] = 0
    value: Optional[float] = None
    unit: Optional[str] = None
    total_sqft: float

class PropertyLocation(BaseModel):
    address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

class PropertyPrice(BaseModel):
    amount: float
    negotiable: bool = False
    margin: Optional[str] = None  # "2%", "5%", "fixed"
    price_per_sqft: Optional[float] = None

class PropertyDetails(BaseModel):
    facing: Optional[str] = None  # East, West, North, South
    features: Optional[List[str]] = []
    description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    floors: Optional[int] = None

class OwnerContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    visible_to: str = "agent_only"  # Only visible to agent who posted

class ConversationMessage(BaseModel):
    bot: str
    user: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class IncomeLandsProperty(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    agent_id: str
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    
    property_type: str  # lands, plot, flat, villa, farmPlot, farmLands, house
    transaction_type: str = "sell"  # sell or buy
    
    location: PropertyLocation
    area: PropertyArea
    price: PropertyPrice
    details: PropertyDetails
    
    photos: List[str] = []
    videos: List[str] = []
    documents: List[str] = []
    
    owner_contact: Optional[OwnerContact] = None
    conversation_history: List[ConversationMessage] = []
    
    # Engagement
    likes: List[str] = []  # user_ids who liked
    views: int = 0
    contact_unlocks: List[Dict] = []  # {user_id, amount, timestamp}
    
    # Meta
    status: str = "active"  # active, sold, inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_featured: bool = False
    is_retoerp_property: bool = False  # Free contact if True

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PropertyCreateRequest(BaseModel):
    property_type: str
    transaction_type: str = "sell"
    location: PropertyLocation
    area: PropertyArea
    price: PropertyPrice
    details: PropertyDetails
    photos: Optional[List[str]] = []
    owner_contact: Optional[OwnerContact] = None
    conversation_history: Optional[List[ConversationMessage]] = []

class PropertyUpdateRequest(BaseModel):
    location: Optional[PropertyLocation] = None
    area: Optional[PropertyArea] = None
    price: Optional[PropertyPrice] = None
    details: Optional[PropertyDetails] = None
    photos: Optional[List[str]] = None
    owner_contact: Optional[OwnerContact] = None
    status: Optional[str] = None

class PropertySearchQuery(BaseModel):
    property_type: Optional[str] = None
    transaction_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: float = 5.0
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    limit: int = 50
    skip: int = 0

class ContactUnlockRequest(BaseModel):
    property_id: str
    amount: int = 10  # Credits to deduct
