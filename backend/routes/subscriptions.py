"""
SaaS Subscription Management with Stripe
Handles subscription creation, management, upgrades/downgrades, and cancellation
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
import os
import uuid
from dotenv import load_dotenv
from middleware.auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# Subscription packages with Stripe price IDs (to be created in Stripe Dashboard or via API)
SUBSCRIPTION_PACKAGES = {
    "starter": {
        "name": "Starter",
        "monthly_price": 999.00,
        "yearly_price": 9990.00,  # 2 months free
        "currency": "inr",
        "description": "Perfect for small real estate businesses",
        "features": {
            "max_projects": 3,
            "max_users": 2,
            "max_properties": 50,
            "max_leads_per_month": 100,
            "storage_gb": 1,
            "sms_credits": 100,
            "email_credits": 500,
            "whatsapp_enabled": False,
            "ai_features": False,
            "custom_branding": False,
            "api_access": False,
            "priority_support": False
        }
    },
    "pro": {
        "name": "Pro",
        "monthly_price": 2999.00,
        "yearly_price": 29990.00,  # 2 months free
        "currency": "inr",
        "description": "Ideal for growing businesses",
        "features": {
            "max_projects": 15,
            "max_users": 10,
            "max_properties": 500,
            "max_leads_per_month": 500,
            "storage_gb": 10,
            "sms_credits": 500,
            "email_credits": 2000,
            "whatsapp_enabled": True,
            "ai_features": False,
            "custom_branding": True,
            "api_access": False,
            "priority_support": True
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "monthly_price": 9999.00,
        "yearly_price": 99990.00,  # 2 months free
        "currency": "inr",
        "description": "For large-scale operations",
        "features": {
            "max_projects": -1,  # Unlimited
            "max_users": -1,  # Unlimited
            "max_properties": -1,  # Unlimited
            "max_leads_per_month": -1,  # Unlimited
            "storage_gb": 100,
            "sms_credits": 2000,
            "email_credits": 10000,
            "whatsapp_enabled": True,
            "ai_features": True,
            "custom_branding": True,
            "api_access": True,
            "priority_support": True
        }
    }
}


def get_db(request: Request):
    return request.app.state.db


class SubscriptionRequest(BaseModel):
    """Request to create/update subscription"""
    package_id: str = Field(..., description="Package ID (starter, pro, enterprise)")
    billing_cycle: str = Field(default="monthly", description="monthly or yearly")
    origin_url: str = Field(..., description="Frontend origin URL for redirects")


class SubscriptionResponse(BaseModel):
    """Response from subscription creation"""
    checkout_url: str
    session_id: str
    subscription_id: str


# ============ PUBLIC ENDPOINTS ============

@router.get("/packages")
async def get_subscription_packages():
    """Get all available subscription packages (public)"""
    packages = []
    for key, pkg in SUBSCRIPTION_PACKAGES.items():
        packages.append({
            "id": key,
            "name": pkg["name"],
            "description": pkg["description"],
            "monthly_price": pkg["monthly_price"],
            "yearly_price": pkg["yearly_price"],
            "currency": pkg["currency"],
            "features": pkg["features"],
            "savings_yearly": (pkg["monthly_price"] * 12) - pkg["yearly_price"]
        })
    return {"packages": packages}


@router.get("/packages/{package_id}")
async def get_package_details(package_id: str):
    """Get details of a specific package"""
    if package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=404, detail="Package not found")
    
    pkg = SUBSCRIPTION_PACKAGES[package_id]
    return {
        "id": package_id,
        "name": pkg["name"],
        "description": pkg["description"],
        "monthly_price": pkg["monthly_price"],
        "yearly_price": pkg["yearly_price"],
        "currency": pkg["currency"],
        "features": pkg["features"],
        "savings_yearly": (pkg["monthly_price"] * 12) - pkg["yearly_price"]
    }


# ============ AUTHENTICATED ENDPOINTS ============

@router.get("/current")
async def get_current_subscription(request: Request, user: dict = Depends(get_current_user)):
    """Get current tenant's subscription status"""
    db = get_db(request)
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Get tenant
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get subscription
    subscription = await db.subscriptions.find_one(
        {"tenant_id": tenant_id, "status": {"$in": ["active", "trialing"]}},
        {"_id": 0}
    )
    
    # Get package info
    package_id = subscription.get("package_id") if subscription else tenant.get("package_id", "starter")
    package = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])
    
    # Calculate usage
    project_count = await db.projects.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    user_count = await db.users.count_documents({"tenant_id": tenant_id})
    property_count = await db.properties.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    
    # Get this month's leads
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    leads_this_month = await db.leads.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_of_month.isoformat()}
    })
    
    # Get credits
    credits = tenant.get("credits", {})
    
    return {
        "subscription": {
            "id": subscription.get("id") if subscription else None,
            "package_id": package_id,
            "package_name": package["name"],
            "status": subscription.get("status", "inactive") if subscription else "inactive",
            "billing_cycle": subscription.get("billing_cycle", "monthly") if subscription else "monthly",
            "current_period_start": subscription.get("current_period_start") if subscription else None,
            "current_period_end": subscription.get("current_period_end") if subscription else None,
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False) if subscription else False
        },
        "package": {
            "id": package_id,
            "name": package["name"],
            "monthly_price": package["monthly_price"],
            "yearly_price": package["yearly_price"],
            "features": package["features"]
        },
        "usage": {
            "projects": {
                "used": project_count,
                "limit": package["features"]["max_projects"],
                "unlimited": package["features"]["max_projects"] == -1
            },
            "users": {
                "used": user_count,
                "limit": package["features"]["max_users"],
                "unlimited": package["features"]["max_users"] == -1
            },
            "properties": {
                "used": property_count,
                "limit": package["features"]["max_properties"],
                "unlimited": package["features"]["max_properties"] == -1
            },
            "leads_this_month": {
                "used": leads_this_month,
                "limit": package["features"]["max_leads_per_month"],
                "unlimited": package["features"]["max_leads_per_month"] == -1
            }
        },
        "credits": {
            "sms": {
                "remaining": credits.get("sms_remaining", 0),
                "used": credits.get("sms_used", 0),
                "monthly_allocation": package["features"]["sms_credits"]
            },
            "email": {
                "remaining": credits.get("email_remaining", 0),
                "used": credits.get("email_used", 0),
                "monthly_allocation": package["features"]["email_credits"]
            }
        }
    }


@router.post("/checkout", response_model=SubscriptionResponse)
async def create_subscription_checkout(
    data: SubscriptionRequest, 
    request: Request, 
    user: dict = Depends(get_current_user)
):
    """Create a checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest, 
        CheckoutSessionResponse
    )
    
    db = get_db(request)
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Validate package
    if data.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid subscription package")
    
    package = SUBSCRIPTION_PACKAGES[data.package_id]
    
    # Determine amount based on billing cycle
    if data.billing_cycle == "yearly":
        amount = package["yearly_price"]
        period_months = 12
    else:
        amount = package["monthly_price"]
        period_months = 1
    
    currency = package["currency"]
    
    # Generate subscription ID
    subscription_id = f"sub_{uuid.uuid4().hex[:16]}"
    
    # Build URLs
    success_url = f"{data.origin_url}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/billing"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Prepare metadata
    metadata = {
        "subscription_id": subscription_id,
        "tenant_id": tenant_id,
        "user_id": user.get("user_id"),
        "package_id": data.package_id,
        "package_name": package["name"],
        "billing_cycle": data.billing_cycle,
        "type": "subscription"
    }
    
    try:
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Calculate period dates
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30 * period_months)
        
        # Create subscription record
        subscription_record = {
            "id": subscription_id,
            "tenant_id": tenant_id,
            "user_id": user.get("user_id"),
            "stripe_session_id": session.session_id,
            "package_id": data.package_id,
            "package_name": package["name"],
            "billing_cycle": data.billing_cycle,
            "amount": amount,
            "currency": currency,
            "status": "pending",  # Will be updated to 'active' on successful payment
            "payment_status": "initiated",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "cancel_at_period_end": False,
            "metadata": metadata,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.subscriptions.insert_one(subscription_record)
        
        return SubscriptionResponse(
            checkout_url=session.url,
            session_id=session.session_id,
            subscription_id=subscription_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@router.get("/checkout/status/{session_id}")
async def get_subscription_checkout_status(
    session_id: str, 
    request: Request, 
    user: dict = Depends(get_current_user)
):
    """Get the status of a subscription checkout session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    db = get_db(request)
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Find subscription
    subscription = await db.subscriptions.find_one(
        {"stripe_session_id": session_id}, 
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Initialize Stripe checkout
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        # Get status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Determine new status
        new_status = subscription.get("status")
        new_payment_status = status_response.payment_status
        
        if status_response.payment_status == "paid":
            new_status = "active"
        elif status_response.status == "expired":
            new_status = "expired"
        
        # Update subscription if payment successful and not already processed
        if new_payment_status == "paid" and subscription.get("payment_status") != "paid":
            now = datetime.now(timezone.utc)
            
            # Calculate period based on billing cycle
            if subscription.get("billing_cycle") == "yearly":
                period_end = now + timedelta(days=365)
            else:
                period_end = now + timedelta(days=30)
            
            await db.subscriptions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": "active",
                    "payment_status": "paid",
                    "current_period_start": now.isoformat(),
                    "current_period_end": period_end.isoformat(),
                    "updated_at": now.isoformat()
                }}
            )
            
            # Update tenant with new package
            package = SUBSCRIPTION_PACKAGES.get(subscription.get("package_id"), SUBSCRIPTION_PACKAGES["starter"])
            
            await db.tenants.update_one(
                {"id": subscription.get("tenant_id")},
                {"$set": {
                    "package_id": subscription.get("package_id"),
                    "subscription_id": subscription.get("id"),
                    "subscription_status": "active",
                    "subscription_start": now.isoformat(),
                    "subscription_end": period_end.isoformat(),
                    "billing_cycle": subscription.get("billing_cycle"),
                    "credits.sms_remaining": package["features"]["sms_credits"],
                    "credits.email_remaining": package["features"]["email_credits"],
                    "credits.sms_used": 0,
                    "credits.email_used": 0,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Create invoice record
            invoice_record = {
                "id": f"inv_{uuid.uuid4().hex[:12]}",
                "subscription_id": subscription.get("id"),
                "tenant_id": subscription.get("tenant_id"),
                "amount": subscription.get("amount"),
                "currency": subscription.get("currency"),
                "status": "paid",
                "stripe_session_id": session_id,
                "package_id": subscription.get("package_id"),
                "package_name": subscription.get("package_name"),
                "billing_cycle": subscription.get("billing_cycle"),
                "period_start": now.isoformat(),
                "period_end": period_end.isoformat(),
                "paid_at": now.isoformat(),
                "created_at": now.isoformat()
            }
            await db.invoices.insert_one(invoice_record)
            
            # Send confirmation email
            try:
                from services.email_service import EmailService
                
                # Get tenant email
                tenant = await db.tenants.find_one({"id": subscription.get("tenant_id")}, {"_id": 0})
                if tenant and tenant.get("email"):
                    await EmailService.send_payment_confirmation_email(
                        to_email=tenant["email"],
                        customer_name=tenant.get("company_name", tenant.get("name", "Customer")),
                        amount=f"{subscription.get('amount'):,.0f}",
                        payment_date=now.strftime("%d %b, %Y"),
                        payment_method="Stripe",
                        receipt_number=invoice_record["id"],
                        project_name=f"{subscription.get('package_name')} Subscription"
                    )
            except Exception as e:
                print(f"Failed to send subscription confirmation email: {e}")
        
        return {
            "status": new_status,
            "payment_status": new_payment_status,
            "subscription_id": subscription.get("id"),
            "package_id": subscription.get("package_id"),
            "package_name": subscription.get("package_name"),
            "amount": status_response.amount_total,
            "currency": status_response.currency
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")


@router.post("/cancel")
async def cancel_subscription(request: Request, user: dict = Depends(get_current_user)):
    """Cancel current subscription at period end"""
    db = get_db(request)
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Find active subscription
    subscription = await db.subscriptions.find_one(
        {"tenant_id": tenant_id, "status": "active"},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Mark for cancellation at period end
    await db.subscriptions.update_one(
        {"id": subscription.get("id")},
        {"$set": {
            "cancel_at_period_end": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Subscription will be cancelled at the end of the current billing period",
        "current_period_end": subscription.get("current_period_end")
    }


@router.post("/reactivate")
async def reactivate_subscription(request: Request, user: dict = Depends(get_current_user)):
    """Reactivate a subscription that was set to cancel"""
    db = get_db(request)
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Find subscription set to cancel
    subscription = await db.subscriptions.find_one(
        {"tenant_id": tenant_id, "status": "active", "cancel_at_period_end": True},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription pending cancellation found")
    
    # Reactivate
    await db.subscriptions.update_one(
        {"id": subscription.get("id")},
        {"$set": {
            "cancel_at_period_end": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Subscription reactivated successfully"
    }


@router.get("/invoices")
async def get_invoices(
    request: Request, 
    user: dict = Depends(get_current_user),
    limit: int = 20,
    skip: int = 0
):
    """Get subscription invoices for tenant"""
    db = get_db(request)
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    invoices = await db.invoices.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.invoices.count_documents({"tenant_id": tenant_id})
    
    return {
        "invoices": invoices,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/usage-check")
async def check_usage_limits(request: Request, user: dict = Depends(get_current_user)):
    """Check if tenant has exceeded any usage limits"""
    db = get_db(request)
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Get tenant
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get package
    package_id = tenant.get("package_id", "starter")
    package = SUBSCRIPTION_PACKAGES.get(package_id, SUBSCRIPTION_PACKAGES["starter"])
    features = package["features"]
    
    # Check limits
    limits_exceeded = []
    warnings = []
    
    # Projects
    project_count = await db.projects.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    if features["max_projects"] != -1:
        if project_count >= features["max_projects"]:
            limits_exceeded.append({
                "type": "projects",
                "limit": features["max_projects"],
                "used": project_count
            })
        elif project_count >= features["max_projects"] * 0.8:
            warnings.append({
                "type": "projects",
                "limit": features["max_projects"],
                "used": project_count,
                "percentage": round(project_count / features["max_projects"] * 100)
            })
    
    # Users
    user_count = await db.users.count_documents({"tenant_id": tenant_id})
    if features["max_users"] != -1:
        if user_count >= features["max_users"]:
            limits_exceeded.append({
                "type": "users",
                "limit": features["max_users"],
                "used": user_count
            })
        elif user_count >= features["max_users"] * 0.8:
            warnings.append({
                "type": "users",
                "limit": features["max_users"],
                "used": user_count,
                "percentage": round(user_count / features["max_users"] * 100)
            })
    
    # Properties
    property_count = await db.properties.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    if features["max_properties"] != -1:
        if property_count >= features["max_properties"]:
            limits_exceeded.append({
                "type": "properties",
                "limit": features["max_properties"],
                "used": property_count
            })
        elif property_count >= features["max_properties"] * 0.8:
            warnings.append({
                "type": "properties",
                "limit": features["max_properties"],
                "used": property_count,
                "percentage": round(property_count / features["max_properties"] * 100)
            })
    
    # SMS Credits
    sms_remaining = tenant.get("credits", {}).get("sms_remaining", 0)
    if sms_remaining <= 0:
        limits_exceeded.append({
            "type": "sms_credits",
            "limit": features["sms_credits"],
            "remaining": sms_remaining
        })
    elif sms_remaining <= features["sms_credits"] * 0.2:
        warnings.append({
            "type": "sms_credits",
            "limit": features["sms_credits"],
            "remaining": sms_remaining,
            "percentage": round(sms_remaining / features["sms_credits"] * 100)
        })
    
    return {
        "package_id": package_id,
        "package_name": package["name"],
        "limits_exceeded": limits_exceeded,
        "warnings": warnings,
        "can_create_project": features["max_projects"] == -1 or project_count < features["max_projects"],
        "can_create_user": features["max_users"] == -1 or user_count < features["max_users"],
        "can_create_property": features["max_properties"] == -1 or property_count < features["max_properties"],
        "can_send_sms": sms_remaining > 0
    }
