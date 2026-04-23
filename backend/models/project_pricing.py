"""
Project Pricing Configuration Models
Handles unit pricing, additional charges, and booking amount settings
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


class AdditionalCharge(BaseModel):
    """Individual additional charge configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str  # e.g., "Registration Charges", "GST", "Documentation Fee"
    charge_type: Literal["fixed", "percentage"] = "fixed"
    value: float  # Amount in rupees or percentage
    is_taxable: bool = False  # Whether this charge is taxable
    is_mandatory: bool = True  # Whether this charge is required
    description: Optional[str] = None
    order: int = 0  # Display order


class ProjectPricingConfig(BaseModel):
    """Complete pricing configuration for a project"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    tenant_id: str
    
    # Unit Configuration
    unit_type: str = "sq.yard"  # sq.yard, sq.ft, acre, plot, unit
    unit_label: str = "Sq. Yard"  # Display label
    base_price_per_unit: float = 0  # Price per unit (e.g., ₹10,000 per sq.yard)
    
    # Booking Amount Configuration
    booking_amount_type: Literal["fixed", "percentage"] = "fixed"
    booking_amount_value: float = 5000  # Default ₹5,000 or percentage
    min_booking_amount: Optional[float] = None  # Minimum booking amount if percentage
    max_booking_amount: Optional[float] = None  # Maximum booking amount if percentage
    
    # Additional Charges
    additional_charges: List[AdditionalCharge] = []
    
    # Tax Configuration
    apply_gst: bool = False
    gst_percentage: float = 0  # Default GST percentage if applicable
    gst_included_in_price: bool = False  # Whether base price includes GST
    
    # Property Override Settings
    allow_property_override: bool = True  # Allow individual properties to override pricing
    
    # Metadata
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class ProjectPricingConfigCreate(BaseModel):
    """Create pricing configuration"""
    project_id: Optional[str] = None  # Optional since we get from URL
    unit_type: str = "sq.yard"
    unit_label: str = "Sq. Yard"
    base_price_per_unit: float = 0
    booking_amount_type: Literal["fixed", "percentage"] = "fixed"
    booking_amount_value: float = 5000
    min_booking_amount: Optional[float] = None
    max_booking_amount: Optional[float] = None
    additional_charges: List[AdditionalCharge] = []
    apply_gst: bool = False
    gst_percentage: float = 0
    gst_included_in_price: bool = False
    allow_property_override: bool = True


class ProjectPricingConfigUpdate(BaseModel):
    """Update pricing configuration"""
    unit_type: Optional[str] = None
    unit_label: Optional[str] = None
    base_price_per_unit: Optional[float] = None
    booking_amount_type: Optional[Literal["fixed", "percentage"]] = None
    booking_amount_value: Optional[float] = None
    min_booking_amount: Optional[float] = None
    max_booking_amount: Optional[float] = None
    additional_charges: Optional[List[AdditionalCharge]] = None
    apply_gst: Optional[bool] = None
    gst_percentage: Optional[float] = None
    gst_included_in_price: Optional[bool] = None
    allow_property_override: Optional[bool] = None


class PropertyPricingOverride(BaseModel):
    """Property-level pricing override"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    project_id: str
    tenant_id: str
    
    # Override flags - only override if True
    override_base_price: bool = False
    custom_base_price_per_unit: Optional[float] = None  # Custom price for this property
    
    override_booking_amount: bool = False
    custom_booking_amount_type: Optional[Literal["fixed", "percentage"]] = None
    custom_booking_amount_value: Optional[float] = None
    
    # Additional charges for this property (can add property-specific charges)
    override_additional_charges: bool = False
    custom_additional_charges: List[AdditionalCharge] = []
    
    # Premium/Discount
    price_adjustment_type: Optional[Literal["premium", "discount", "none"]] = "none"
    price_adjustment_value: float = 0  # Percentage or fixed amount
    price_adjustment_reason: Optional[str] = None  # e.g., "Corner plot", "Road facing"
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PriceBreakdown(BaseModel):
    """Calculated price breakdown for a property"""
    property_id: str
    project_id: str
    
    # Base Calculation
    area: float
    unit_type: str
    unit_label: str
    base_price_per_unit: float
    base_cost: float  # area × base_price_per_unit
    
    # Adjustments
    has_price_adjustment: bool = False
    price_adjustment_type: Optional[str] = None
    price_adjustment_value: float = 0
    price_adjustment_amount: float = 0
    adjusted_base_cost: float = 0
    
    # Additional Charges
    additional_charges: List[dict] = []  # [{label, type, value, amount}]
    total_additional_charges: float = 0
    
    # Tax
    gst_percentage: float = 0
    gst_amount: float = 0
    
    # Final
    total_property_cost: float = 0
    
    # Booking
    booking_amount_type: str = "fixed"
    booking_amount_value: float = 5000
    calculated_booking_amount: float = 5000
    balance_amount: float = 0


# Common unit types for Indian real estate
UNIT_TYPES = [
    {"value": "sq.yard", "label": "Sq. Yard", "description": "Square Yard (commonly used for plots)"},
    {"value": "sq.ft", "label": "Sq. Ft", "description": "Square Feet (commonly used for apartments)"},
    {"value": "sq.m", "label": "Sq. Meter", "description": "Square Meter"},
    {"value": "acre", "label": "Acre", "description": "Acre (for large land parcels)"},
    {"value": "gunta", "label": "Gunta", "description": "Gunta (traditional unit in South India)"},
    {"value": "cent", "label": "Cent", "description": "Cent (1/100th of an acre, used in Kerala/TN)"},
    {"value": "bigha", "label": "Bigha", "description": "Bigha (traditional unit in North India)"},
    {"value": "marla", "label": "Marla", "description": "Marla (used in Punjab, Haryana)"},
    {"value": "kanal", "label": "Kanal", "description": "Kanal (used in Punjab, J&K)"},
    {"value": "plot", "label": "Plot", "description": "Fixed price per plot"},
    {"value": "unit", "label": "Unit", "description": "Fixed price per unit"},
]

# Common additional charge presets for Indian real estate
ADDITIONAL_CHARGE_PRESETS = [
    {"label": "Registration Charges", "charge_type": "percentage", "value": 6, "description": "State registration fee"},
    {"label": "Stamp Duty", "charge_type": "percentage", "value": 5, "description": "Government stamp duty"},
    {"label": "GST", "charge_type": "percentage", "value": 5, "description": "Goods and Services Tax"},
    {"label": "Documentation Fee", "charge_type": "fixed", "value": 5000, "description": "Legal documentation charges"},
    {"label": "Development Charges", "charge_type": "fixed", "value": 50000, "description": "Infrastructure development"},
    {"label": "Maintenance Deposit", "charge_type": "fixed", "value": 25000, "description": "Advance maintenance"},
    {"label": "Club Membership", "charge_type": "fixed", "value": 50000, "description": "Club house membership"},
    {"label": "Car Parking", "charge_type": "fixed", "value": 300000, "description": "Covered car parking"},
    {"label": "Legal Charges", "charge_type": "fixed", "value": 10000, "description": "Legal verification"},
    {"label": "Transfer Fee", "charge_type": "percentage", "value": 1, "description": "Property transfer charges"},
]
