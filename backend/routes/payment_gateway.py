from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import os
import uuid

from services.payment_gateway_service import PaymentGatewayService
from middleware.auth import get_current_user

router = APIRouter(prefix="/payment", tags=["Payment Gateway"])

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Request Models
class CreatePaymentRequest(BaseModel):
    amount: float
    description: str
    customer_email: str
    customer_name: str
    customer_phone: Optional[str] = None
    payment_type: str = "one_time"  # subscription, one_time, credit_purchase
    preferred_gateway: Optional[str] = None  # razorpay, stripe
    metadata: Optional[Dict[str, Any]] = None

class SubscriptionPlanRequest(BaseModel):
    name: str
    description: str
    amount: float
    billing_period: str  # monthly, yearly, quarterly
    features: List[str]
    max_users: Optional[int] = None
    max_leads: Optional[int] = None

class GatewayCredentialsRequest(BaseModel):
    gateway_name: str  # razorpay, stripe, cashfree
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = None

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    gateway: str = "razorpay"

# Routes
@router.post("/create-order")
async def create_payment_order(
    payment_request: CreatePaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create payment order
    Automatically routes to tenant's gateway if configured, else uses system gateway
    """
    try:
        tenant_id = current_user.get("tenant_id")
        
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant ID required")
        
        # Get tenant info for pricing
        tenant = await db.tenants.find_one({"id": tenant_id})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        customer_info = {
            "email": payment_request.customer_email,
            "name": payment_request.customer_name,
            "phone": payment_request.customer_phone
        }
        
        metadata = payment_request.metadata or {}
        metadata.update({
            "user_id": current_user.get("user_id"),
            "tenant_name": tenant.get("name")
        })
        
        # Create payment
        result = await PaymentGatewayService.create_payment(
            tenant_id=tenant_id,
            amount=payment_request.amount,
            currency="INR",
            description=payment_request.description,
            customer_info=customer_info,
            payment_type=payment_request.payment_type,
            metadata=metadata,
            preferred_gateway=payment_request.preferred_gateway
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Payment creation failed"))
        
        return {
            "success": True,
            "message": f"Payment order created using {result['credentials_type']} {result['gateway_used']} credentials",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment(
    verify_request: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Verify payment after successful transaction"""
    try:
        tenant_id = current_user.get("tenant_id")
        
        # Get payment record
        payment = await db.payments.find_one({"order_id": verify_request.order_id})
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Get gateway credentials
        gateway_config = await PaymentGatewayService.get_gateway_config(
            tenant_id, 
            verify_request.gateway
        )
        
        # Verify signature
        if verify_request.gateway == "razorpay":
            is_valid = await PaymentGatewayService.verify_razorpay_payment(
                verify_request.order_id,
                verify_request.payment_id,
                verify_request.signature,
                gateway_config["credentials"]
            )
        else:
            is_valid = True  # Other gateways verified via webhooks
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Update payment status
        await db.payments.update_one(
            {"order_id": verify_request.order_id},
            {
                "$set": {
                    "payment_id": verify_request.payment_id,
                    "status": "paid",
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Payment verified successfully",
            "payment_id": verify_request.payment_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Verify payment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plans")
async def get_subscription_plans(current_user: dict = Depends(get_current_user)):
    """Get subscription plans for tenant"""
    try:
        tenant_id = current_user.get("tenant_id")
        
        # Get tenant-specific plans or default plans
        plans = await db.subscription_plans.find({
            "$or": [
                {"tenant_id": tenant_id},
                {"is_default": True}
            ],
            "is_active": True
        }).to_list(length=100)
        
        for plan in plans:
            plan.pop("_id", None)
        
        return {
            "success": True,
            "plans": plans
        }
        
    except Exception as e:
        print(f"Get plans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plans")
async def create_subscription_plan(
    plan_request: SubscriptionPlanRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create subscription plan (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        tenant_id = current_user.get("tenant_id")
        
        plan = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": plan_request.name,
            "description": plan_request.description,
            "amount": plan_request.amount,
            "currency": "INR",
            "billing_period": plan_request.billing_period,
            "features": plan_request.features,
            "max_users": plan_request.max_users,
            "max_leads": plan_request.max_leads,
            "is_active": True,
            "is_default": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.subscription_plans.insert_one(plan)
        plan.pop("_id", None)
        
        return {
            "success": True,
            "message": "Subscription plan created",
            "plan": plan
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gateway/configure")
async def configure_gateway(
    gateway_request: GatewayCredentialsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Configure payment gateway credentials for tenant
    Tenant can add their own Razorpay/Stripe credentials
    """
    try:
        tenant_id = current_user.get("tenant_id")
        
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant ID required")
        
        # Check if configuration already exists
        existing = await db.payment_gateway_config.find_one({
            "tenant_id": tenant_id,
            "gateway_name": gateway_request.gateway_name
        })
        
        if existing:
            # Update existing
            await db.payment_gateway_config.update_one(
                {"id": existing["id"]},
                {
                    "$set": {
                        "credentials": {
                            "key_id": gateway_request.key_id,
                            "key_secret": gateway_request.key_secret,
                            "webhook_secret": gateway_request.webhook_secret
                        },
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            message = "Gateway credentials updated"
        else:
            # Create new
            config = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "gateway_name": gateway_request.gateway_name,
                "credentials": {
                    "key_id": gateway_request.key_id,
                    "key_secret": gateway_request.key_secret,
                    "webhook_secret": gateway_request.webhook_secret
                },
                "is_active": True,
                "is_system_default": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payment_gateway_config.insert_one(config)
            message = "Gateway credentials configured"
        
        return {
            "success": True,
            "message": message,
            "gateway": gateway_request.gateway_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Configure gateway error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gateway/status")
async def get_gateway_status(current_user: dict = Depends(get_current_user)):
    """Get payment gateway status for tenant"""
    try:
        tenant_id = current_user.get("tenant_id")
        
        # Get tenant's gateway config
        tenant_gateways = await db.payment_gateway_config.find({
            "tenant_id": tenant_id,
            "is_active": True
        }).to_list(length=10)
        
        # Get system default
        system_gateway = await db.payment_gateway_config.find_one({
            "tenant_id": None,
            "is_system_default": True,
            "is_active": True
        })
        
        has_own_gateway = len(tenant_gateways) > 0
        
        gateway_info = {
            "has_own_gateway": has_own_gateway,
            "using_system_gateway": not has_own_gateway,
            "configured_gateways": []
        }
        
        if has_own_gateway:
            for gw in tenant_gateways:
                gateway_info["configured_gateways"].append({
                    "gateway": gw["gateway_name"],
                    "status": "active",
                    "type": "tenant"
                })
        else:
            if system_gateway:
                gateway_info["configured_gateways"].append({
                    "gateway": system_gateway["gateway_name"],
                    "status": "active",
                    "type": "system"
                })
        
        return {
            "success": True,
            "gateway_info": gateway_info
        }
        
    except Exception as e:
        print(f"Get gateway status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/{gateway}")
async def payment_webhook(gateway: str, request: Request):
    """
    Handle payment gateway webhooks
    Routes to correct credentials based on metadata
    """
    try:
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature") or request.headers.get("Stripe-Signature")
        
        # Parse payload
        import json
        payload = json.loads(body)
        
        # Get tenant_id from payload metadata
        if gateway == "razorpay":
            notes = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
            tenant_id = notes.get("tenant_id")
        elif gateway == "stripe":
            metadata = payload.get("data", {}).get("object", {}).get("metadata", {})
            tenant_id = metadata.get("tenant_id")
        else:
            tenant_id = None
        
        # Get appropriate credentials
        gateway_config = await PaymentGatewayService.get_gateway_config(tenant_id, gateway)
        
        # Handle webhook
        result = await PaymentGatewayService.handle_webhook(
            gateway=gateway,
            payload=payload,
            signature=signature,
            credentials=gateway_config["credentials"]
        )
        
        return result
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}

@router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get payment transactions for tenant"""
    try:
        tenant_id = current_user.get("tenant_id")
        
        payments = await db.payments.find({
            "tenant_id": tenant_id
        }).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        for payment in payments:
            payment.pop("_id", None)
        
        return {
            "success": True,
            "count": len(payments),
            "transactions": payments
        }
        
    except Exception as e:
        print(f"Get transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
