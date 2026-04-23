from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class WorkerLocation(BaseModel):
    """Worker location coordinates"""
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    city: Optional[str] = None
    locality: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class WorkforceWorker(BaseModel):
    """Construction workforce worker model"""
    id: str
    name: str
    skill_type: str  # Carpenter, Electrician, Mason, Painter, etc.
    phone: str
    whatsapp: Optional[str] = None
    location: WorkerLocation
    experience_years: Optional[int] = None
    work_type: Optional[str] = None  # Daily, Contract, Both
    daily_rate: Optional[float] = None
    description: Optional[str] = None
    source: Optional[str] = "user_submitted"  # user_submitted, ai_scraped, YouTube, Facebook, JustDial, Google Business, etc.
    status: str = "pending"  # pending, approved, rejected
    added_by: Optional[str] = None  # user_id who added this worker
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None  # admin user_id

class WorkforceWorkerCreate(BaseModel):
    """Request model for creating a worker"""
    name: str
    skill_type: str
    phone: str
    whatsapp: Optional[str] = None
    location: WorkerLocation
    experience_years: Optional[int] = None
    work_type: Optional[str] = None
    daily_rate: Optional[float] = None
    description: Optional[str] = None

class WorkforceWorkerUpdate(BaseModel):
    """Request model for updating a worker"""
    name: Optional[str] = None
    skill_type: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    location: Optional[WorkerLocation] = None
    experience_years: Optional[int] = None
    work_type: Optional[str] = None
    daily_rate: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None

class WorkforceSearchParams(BaseModel):
    """Search parameters for workforce"""
    skill_type: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = 20  # Default 20km radius
    min_experience: Optional[int] = None
    work_type: Optional[str] = None
    limit: int = 100
    skip: int = 0
