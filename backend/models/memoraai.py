"""Business Category model for MemoraAI multi-category SaaS"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


# Pre-defined category configurations
CATEGORY_CONFIGS = {
    "real_estate": {
        "name": "Real Estate",
        "icon": "building",
        "description": "Property sales, rentals, and management",
        "default_services": [
            {"name": "Plot Sale", "description": "Residential/Commercial plot sales", "duration_mins": 60, "price": 0},
            {"name": "Flat Sale", "description": "Apartment/Flat sales", "duration_mins": 60, "price": 0},
            {"name": "Villa Sale", "description": "Independent villa sales", "duration_mins": 60, "price": 0},
            {"name": "Site Visit", "description": "Guided property site visit", "duration_mins": 90, "price": 0},
            {"name": "Layout Tour", "description": "Complete layout walkthrough", "duration_mins": 120, "price": 0},
            {"name": "Investment Advisory", "description": "Real estate investment consultation", "duration_mins": 45, "price": 0},
        ]
    },
    "astrology": {
        "name": "Astrology",
        "icon": "star",
        "description": "Astrological services and spiritual consultation",
        "default_services": [
            {"name": "Horoscope Reading", "description": "Detailed birth chart analysis and predictions", "duration_mins": 45, "price": 500},
            {"name": "Marriage Matching", "description": "Kundli matching for marriage compatibility", "duration_mins": 30, "price": 1000},
            {"name": "Career Prediction", "description": "Career path and business guidance via astrology", "duration_mins": 30, "price": 500},
            {"name": "Pooja Services", "description": "Religious ceremony and pooja arrangements", "duration_mins": 120, "price": 2100},
            {"name": "Gemstone Recommendation", "description": "Personalized gemstone advice based on birth chart", "duration_mins": 20, "price": 300},
            {"name": "Kundli Analysis", "description": "Complete Kundli preparation and life prediction", "duration_mins": 60, "price": 1500},
        ]
    },
    "doctor_clinic": {
        "name": "Doctor / Clinic",
        "icon": "stethoscope",
        "description": "Medical consultations and healthcare services",
        "default_services": [
            {"name": "General Consultation", "description": "General health checkup and consultation", "duration_mins": 15, "price": 500},
            {"name": "Dental Checkup", "description": "Complete dental examination and cleaning", "duration_mins": 30, "price": 800},
            {"name": "Skin Treatment", "description": "Dermatology consultation and treatment", "duration_mins": 20, "price": 700},
            {"name": "Eye Checkup", "description": "Vision test and eye examination", "duration_mins": 20, "price": 600},
            {"name": "Vaccination", "description": "Immunization and vaccine administration", "duration_mins": 15, "price": 300},
            {"name": "Lab Tests", "description": "Blood tests, urine tests, and other diagnostics", "duration_mins": 10, "price": 400},
        ]
    },
    "function_hall": {
        "name": "Function Hall / Banquet",
        "icon": "party-popper",
        "description": "Event venues and banquet services",
        "default_services": [
            {"name": "Marriage Booking", "description": "Wedding ceremony venue booking", "duration_mins": 480, "price": 150000},
            {"name": "Engagement Ceremony", "description": "Engagement function venue booking", "duration_mins": 240, "price": 75000},
            {"name": "Birthday Party", "description": "Birthday celebration venue and decoration", "duration_mins": 180, "price": 25000},
            {"name": "Corporate Event", "description": "Corporate meetings, seminars, and conferences", "duration_mins": 360, "price": 50000},
            {"name": "Reception", "description": "Wedding reception venue booking", "duration_mins": 300, "price": 100000},
            {"name": "Anniversary", "description": "Anniversary celebration arrangements", "duration_mins": 240, "price": 40000},
        ]
    },
    "pesticides_fertilizer": {
        "name": "Pesticides / Fertilizer",
        "icon": "sprout",
        "description": "Agricultural supplies and crop protection (B2B2C)",
        "default_services": [
            {"name": "Crop Protection", "description": "Pest control and crop protection solutions", "duration_mins": 60, "price": 2000},
            {"name": "Fertilizer Supply", "description": "Organic and chemical fertilizer supply", "duration_mins": 30, "price": 1500},
            {"name": "Seed Supply", "description": "Quality seed procurement for all crops", "duration_mins": 20, "price": 500},
            {"name": "Soil Testing", "description": "Complete soil analysis and recommendations", "duration_mins": 45, "price": 800},
            {"name": "Weed Control", "description": "Herbicide solutions and weed management", "duration_mins": 60, "price": 1200},
            {"name": "Pesticide Spraying", "description": "Professional pesticide application service", "duration_mins": 120, "price": 3000},
        ]
    },
    "beauty_salon": {
        "name": "Beauty Salon",
        "icon": "scissors",
        "description": "Beauty, grooming, and personal care services",
        "default_services": [
            {"name": "Haircut", "description": "Professional haircut and styling", "duration_mins": 30, "price": 300},
            {"name": "Hair Treatment", "description": "Hair spa, keratin, smoothening treatments", "duration_mins": 90, "price": 2500},
            {"name": "Facial", "description": "Deep cleansing facial and skincare", "duration_mins": 45, "price": 800},
            {"name": "Bridal Makeup", "description": "Complete bridal makeup and styling package", "duration_mins": 180, "price": 15000},
            {"name": "Skin Treatment", "description": "Advanced skin treatments and peels", "duration_mins": 60, "price": 1500},
            {"name": "Mehendi", "description": "Traditional and Arabic mehendi designs", "duration_mins": 120, "price": 2000},
        ]
    },
    "coaching_center": {
        "name": "Coaching Centers",
        "icon": "graduation-cap",
        "description": "Educational coaching and tutoring services",
        "default_services": [
            {"name": "Entrance Exam Coaching", "description": "IIT/NEET/EAMCET exam preparation", "duration_mins": 120, "price": 5000},
            {"name": "Spoken English", "description": "English communication and fluency course", "duration_mins": 60, "price": 2000},
            {"name": "Competitive Exams", "description": "UPSC/TSPSC/Bank exam preparation", "duration_mins": 120, "price": 4000},
            {"name": "School Tuitions", "description": "Subject-wise tuition for school students", "duration_mins": 90, "price": 1500},
            {"name": "Skill Development", "description": "Computer, programming, and digital skills", "duration_mins": 60, "price": 3000},
            {"name": "Demo Class", "description": "Free trial class for new students", "duration_mins": 45, "price": 0},
        ]
    },
}

SUPPORTED_CATEGORIES = list(CATEGORY_CONFIGS.keys())


class BusinessCategory(BaseModel):
    """Represents a business category assigned to a tenant"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    category_slug: str  # e.g. "astrology", "doctor_clinic"
    category_name: str
    icon: str = "building"
    is_active: bool = True
    is_primary: bool = False  # Primary category for the tenant
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BusinessService(BaseModel):
    """Individual service offered by a business"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    category_slug: str
    name: str
    description: Optional[str] = None
    duration_mins: int = 30
    price: float = 0
    currency: str = "INR"
    is_active: bool = True
    is_bookable: bool = True  # Can be booked via WhatsApp
    sort_order: int = 0
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class BusinessServiceCreate(BaseModel):
    name: str
    category_slug: str
    description: Optional[str] = None
    duration_mins: int = 30
    price: float = 0
    currency: str = "INR"
    is_active: bool = True
    is_bookable: bool = True
    tags: List[str] = Field(default_factory=list)


class BusinessServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_mins: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    is_bookable: Optional[bool] = None
    tags: Optional[List[str]] = None


class WABAConfig(BaseModel):
    """WhatsApp Business API self-service configuration"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    phone_number: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    access_token: Optional[str] = None
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_address: Optional[str] = None
    business_website: Optional[str] = None
    greeting_message: Optional[str] = None
    ai_persona: Optional[str] = None  # Custom AI personality
    is_verified: bool = False
    is_active: bool = False
    templates_generated: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WABAConfigUpdate(BaseModel):
    phone_number: Optional[str] = None
    phone_number_id: Optional[str] = None
    waba_id: Optional[str] = None
    access_token: Optional[str] = None
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_address: Optional[str] = None
    business_website: Optional[str] = None
    greeting_message: Optional[str] = None
    ai_persona: Optional[str] = None


class HotSale(BaseModel):
    """Hot Sales Mode entry - manual override by owner/staff"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_phone: str
    customer_name: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    category_slug: Optional[str] = None
    notes: str = ""
    priority: str = "high"  # high, urgent, normal
    status: str = "active"  # active, converted, expired, cancelled
    amount: Optional[float] = None
    assigned_to: Optional[str] = None  # staff user ID
    created_by: str = ""
    follow_up_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HotSaleCreate(BaseModel):
    customer_phone: str
    customer_name: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    category_slug: Optional[str] = None
    notes: str = ""
    priority: str = "high"
    amount: Optional[float] = None
    assigned_to: Optional[str] = None
    follow_up_at: Optional[str] = None


class SalesAlert(BaseModel):
    """Abrupt Sales Discussion Detection alert"""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_phone: str
    customer_name: Optional[str] = None
    conversation_id: Optional[str] = None
    trigger_type: str = "abrupt_sales"  # abrupt_sales, price_discussion, booking_intent, urgent_request
    trigger_message: str = ""
    confidence: float = 0.0
    detected_intent: Optional[str] = None
    recommended_action: Optional[str] = None
    status: str = "new"  # new, acknowledged, actioned, dismissed
    actioned_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_at: Optional[datetime] = None
