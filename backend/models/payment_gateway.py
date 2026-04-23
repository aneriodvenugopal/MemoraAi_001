from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class PaymentGatewayCredentials(BaseModel):
    """Payment gateway credentials"""
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = None
    additional_config: Optional[Dict[str, Any]] = None

class PaymentGatewayConfig(BaseModel):
    """Payment gateway configuration for system or tenant"""
    id: str
    tenant_id: Optional[str] = None  # None = system-level
    gateway_name: str  # razorpay, stripe, cashfree, payu
    credentials: PaymentGatewayCredentials
    is_active: bool = True
    is_system_default: bool = False
    created_at: datetime
    updated_at: datetime

class SubscriptionPlan(BaseModel):
    """Subscription plan configuration"""
    id: str
    tenant_id: str
    name: str
    description: str
    amount: float  # Amount in rupees
    currency: str = "INR"
    billing_period: str  # monthly, yearly, quarterly
    features: List[str]
    max_users: Optional[int] = None
    max_leads: Optional[int] = None
    is_active: bool = True
    created_at: datetime

class PaymentRequest(BaseModel):
    """Payment request model"""
    tenant_id: str
    amount: float
    currency: str = "INR"
    description: str
    customer_email: str
    customer_name: str
    customer_phone: Optional[str] = None
    payment_type: str  # subscription, one_time, credit_purchase
    metadata: Optional[Dict[str, Any]] = None
    
class PaymentResponse(BaseModel):
    """Payment response model"""
    success: bool
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    payment_link: Optional[str] = None
    gateway_used: str
    credentials_type: str  # system, tenant
    message: str

class WebhookPayload(BaseModel):
    """Webhook payload"""
    gateway_name: str
    event_type: str
    payment_id: str
    order_id: str
    status: str
    amount: float
    metadata: Dict[str, Any]
    raw_payload: Dict[str, Any]
