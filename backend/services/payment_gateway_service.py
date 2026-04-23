import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import razorpay
import stripe
from motor.motor_asyncio import AsyncIOMotorClient

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class PaymentGatewayService:
    """
    Multi-tenant payment gateway service
    Supports: Razorpay, Stripe, Cashfree
    Routes to tenant credentials if available, else uses system credentials
    """
    
    @staticmethod
    async def get_gateway_config(tenant_id: str, preferred_gateway: str = None) -> Dict[str, Any]:
        """
        Get gateway configuration for tenant
        Priority:
        1. Tenant's own credentials for preferred gateway
        2. Tenant's own credentials for any active gateway
        3. System default credentials
        """
        
        # Try tenant's own credentials first
        if tenant_id:
            # Check if tenant has specific gateway configured
            if preferred_gateway:
                tenant_config = await db.payment_gateway_config.find_one({
                    "tenant_id": tenant_id,
                    "gateway_name": preferred_gateway,
                    "is_active": True
                })
                if tenant_config:
                    return {
                        "gateway": preferred_gateway,
                        "credentials": tenant_config["credentials"],
                        "type": "tenant",
                        "config_id": tenant_config["id"]
                    }
            
            # Check any active gateway for tenant
            tenant_config = await db.payment_gateway_config.find_one({
                "tenant_id": tenant_id,
                "is_active": True
            })
            if tenant_config:
                return {
                    "gateway": tenant_config["gateway_name"],
                    "credentials": tenant_config["credentials"],
                    "type": "tenant",
                    "config_id": tenant_config["id"]
                }
        
        # Fallback to system default
        system_config = await db.payment_gateway_config.find_one({
            "tenant_id": None,
            "is_system_default": True,
            "is_active": True
        })
        
        if system_config:
            return {
                "gateway": system_config["gateway_name"],
                "credentials": system_config["credentials"],
                "type": "system",
                "config_id": system_config["id"]
            }
        
        raise Exception("No payment gateway configured")
    
    @staticmethod
    async def create_razorpay_order(
        amount: float,
        currency: str,
        description: str,
        customer_info: Dict[str, Any],
        credentials: Dict[str, Any],
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create Razorpay order"""
        try:
            client = razorpay.Client(
                auth=(credentials["key_id"], credentials["key_secret"])
            )
            
            # Amount in paise (smallest currency unit)
            amount_paise = int(amount * 100)
            
            order_data = {
                "amount": amount_paise,
                "currency": currency,
                "notes": metadata or {},
                "receipt": f"rcpt_{datetime.now().timestamp()}"
            }
            
            order = client.order.create(data=order_data)
            
            return {
                "success": True,
                "order_id": order["id"],
                "amount": amount,
                "currency": currency,
                "key_id": credentials["key_id"]  # Needed for frontend
            }
        except Exception as e:
            print(f"Razorpay order creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def create_stripe_checkout(
        amount: float,
        currency: str,
        description: str,
        customer_info: Dict[str, Any],
        credentials: Dict[str, Any],
        metadata: Dict[str, Any] = None,
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """Create Stripe checkout session"""
        try:
            stripe.api_key = credentials["key_secret"]
            
            # Amount in smallest currency unit (cents for USD, paise for INR)
            amount_cents = int(amount * 100)
            
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": description,
                        },
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url or "https://your-app.com/success",
                cancel_url=cancel_url or "https://your-app.com/cancel",
                customer_email=customer_info.get("email"),
                metadata=metadata or {}
            )
            
            return {
                "success": True,
                "session_id": session.id,
                "checkout_url": session.url,
                "amount": amount,
                "currency": currency
            }
        except Exception as e:
            print(f"Stripe checkout creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    async def create_payment(
        tenant_id: str,
        amount: float,
        currency: str,
        description: str,
        customer_info: Dict[str, Any],
        payment_type: str,
        metadata: Dict[str, Any] = None,
        preferred_gateway: str = None
    ) -> Dict[str, Any]:
        """
        Create payment order (gateway-agnostic)
        Automatically routes to correct gateway and credentials
        """
        
        # Get appropriate gateway config
        gateway_config = await PaymentGatewayService.get_gateway_config(
            tenant_id, 
            preferred_gateway
        )
        
        gateway = gateway_config["gateway"]
        credentials = gateway_config["credentials"]
        credentials_type = gateway_config["type"]
        
        # Add metadata
        full_metadata = {
            "tenant_id": tenant_id,
            "payment_type": payment_type,
            "credentials_type": credentials_type,
            **(metadata or {})
        }
        
        # Route to appropriate gateway
        if gateway == "razorpay":
            result = await PaymentGatewayService.create_razorpay_order(
                amount=amount,
                currency=currency,
                description=description,
                customer_info=customer_info,
                credentials=credentials,
                metadata=full_metadata
            )
        elif gateway == "stripe":
            result = await PaymentGatewayService.create_stripe_checkout(
                amount=amount,
                currency=currency,
                description=description,
                customer_info=customer_info,
                credentials=credentials,
                metadata=full_metadata
            )
        else:
            return {
                "success": False,
                "error": f"Gateway {gateway} not supported yet"
            }
        
        if result["success"]:
            # Store payment record
            payment_record = {
                "id": f"pay_{datetime.now().timestamp()}",
                "tenant_id": tenant_id,
                "gateway": gateway,
                "credentials_type": credentials_type,
                "amount": amount,
                "currency": currency,
                "description": description,
                "payment_type": payment_type,
                "status": "created",
                "order_id": result.get("order_id") or result.get("session_id"),
                "customer_info": customer_info,
                "metadata": full_metadata,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.payments.insert_one(payment_record)
        
        # Add gateway info to result
        result["gateway_used"] = gateway
        result["credentials_type"] = credentials_type
        
        return result
    
    @staticmethod
    async def verify_razorpay_payment(
        order_id: str,
        payment_id: str,
        signature: str,
        credentials: Dict[str, Any]
    ) -> bool:
        """Verify Razorpay payment signature"""
        try:
            client = razorpay.Client(
                auth=(credentials["key_id"], credentials["key_secret"])
            )
            
            params_dict = {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature
            }
            
            client.utility.verify_payment_signature(params_dict)
            return True
        except:
            return False
    
    @staticmethod
    async def handle_webhook(
        gateway: str,
        payload: Dict[str, Any],
        signature: str,
        credentials: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle payment gateway webhooks"""
        
        if gateway == "razorpay":
            return await PaymentGatewayService.handle_razorpay_webhook(
                payload, signature, credentials
            )
        elif gateway == "stripe":
            return await PaymentGatewayService.handle_stripe_webhook(
                payload, signature, credentials
            )
        else:
            return {"success": False, "error": "Unsupported gateway"}
    
    @staticmethod
    async def handle_razorpay_webhook(
        payload: Dict[str, Any],
        signature: str,
        credentials: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle Razorpay webhook"""
        try:
            # Verify webhook signature
            client = razorpay.Client(
                auth=(credentials["key_id"], credentials["key_secret"])
            )
            
            webhook_secret = credentials.get("webhook_secret")
            if webhook_secret:
                client.utility.verify_webhook_signature(
                    payload, 
                    signature, 
                    webhook_secret
                )
            
            # Process event
            event = payload.get("event")
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")
            status = payment_entity.get("status")
            
            # Update payment record
            await db.payments.update_one(
                {"order_id": order_id},
                {
                    "$set": {
                        "payment_id": payment_id,
                        "status": status,
                        "webhook_data": payload,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return {
                "success": True,
                "event": event,
                "order_id": order_id,
                "status": status
            }
        except Exception as e:
            print(f"Razorpay webhook error: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def handle_stripe_webhook(
        payload: Dict[str, Any],
        signature: str,
        credentials: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle Stripe webhook"""
        try:
            webhook_secret = credentials.get("webhook_secret")
            
            if webhook_secret:
                event = stripe.Webhook.construct_event(
                    payload, signature, webhook_secret
                )
            else:
                event = payload
            
            # Process event
            event_type = event["type"]
            session = event["data"]["object"]
            
            session_id = session.get("id")
            payment_status = session.get("payment_status")
            
            # Update payment record
            await db.payments.update_one(
                {"order_id": session_id},
                {
                    "$set": {
                        "payment_id": session.get("payment_intent"),
                        "status": payment_status,
                        "webhook_data": event,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return {
                "success": True,
                "event": event_type,
                "session_id": session_id,
                "status": payment_status
            }
        except Exception as e:
            print(f"Stripe webhook error: {e}")
            return {"success": False, "error": str(e)}
