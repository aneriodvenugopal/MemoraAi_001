"""
Coupon Code Model
Track ₹5000 discount coupons given to customers
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CouponCode(BaseModel):
    """Coupon code for property discount"""
    id: str
    code: str  # Unique coupon code (e.g., "RETO5K-ABC123")
    customer_name: Optional[str] = None
    customer_phone: str  # Mobile number
    customer_email: Optional[str] = None
    discount_amount: int = 5000  # Discount in rupees
    status: str = "issued"  # issued, used, expired
    issued_date: str
    used_date: Optional[str] = None
    used_for_project: Optional[str] = None  # Project ID where used
    tenant_id: Optional[str] = None  # If linked to tenant
    notes: Optional[str] = None
    source: str = "advisory"  # Where coupon was generated from

class CouponRequest(BaseModel):
    """Request to generate coupon"""
    customer_name: Optional[str] = None
    customer_phone: str
    customer_email: Optional[str] = None
    advisory_session_id: Optional[str] = None

class CouponUsage(BaseModel):
    """Mark coupon as used"""
    coupon_code: str
    project_id: str
    tenant_id: str
    notes: Optional[str] = None
