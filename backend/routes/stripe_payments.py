"""
Stripe Payment Integration Routes
Handles property bookings, EMI payments, and general payments via Stripe
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/payments", tags=["payments"])

# Payment packages - amounts defined server-side for security
PAYMENT_PACKAGES = {
    "booking_token": {"name": "Booking Token", "amount": 50000.00, "currency": "inr"},
    "booking_advance": {"name": "Booking Advance", "amount": 100000.00, "currency": "inr"},
    "emi_standard": {"name": "EMI Payment", "amount": 0.00, "currency": "inr"},  # Dynamic based on EMI
    "custom": {"name": "Custom Payment", "amount": 0.00, "currency": "inr"},  # For custom amounts
}

def get_db(request: Request):
    return request.app.state.db


class CreateCheckoutRequest(BaseModel):
    """Request to create a checkout session"""
    package_id: str = Field(..., description="Package ID (booking_token, booking_advance, emi_standard, custom)")
    origin_url: str = Field(..., description="Frontend origin URL for redirects")
    booking_id: Optional[str] = Field(None, description="Related booking ID")
    emi_id: Optional[str] = Field(None, description="Related EMI payment ID")
    customer_id: Optional[str] = Field(None, description="Customer ID")
    custom_amount: Optional[float] = Field(None, description="Custom amount for custom package (server validated)")
    project_id: Optional[str] = Field(None, description="Related project ID")
    property_id: Optional[str] = Field(None, description="Related property ID")
    description: Optional[str] = Field(None, description="Payment description")


class CheckoutResponse(BaseModel):
    """Response from checkout session creation"""
    checkout_url: str
    session_id: str
    transaction_id: str


@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(data: CreateCheckoutRequest, request: Request):
    """
    Create a Stripe checkout session for payments
    """
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest, 
        CheckoutSessionResponse
    )
    
    db = get_db(request)
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Validate package
    if data.package_id not in PAYMENT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid payment package")
    
    package = PAYMENT_PACKAGES[data.package_id]
    
    # Determine amount based on package type
    if data.package_id == "emi_standard" and data.emi_id:
        # Fetch EMI amount from database
        emi = await db.emi_payments.find_one({"id": data.emi_id}, {"_id": 0})
        if not emi:
            raise HTTPException(status_code=404, detail="EMI payment not found")
        amount = float(emi.get('amount', 0)) + float(emi.get('late_fee', 0))
    elif data.package_id == "custom" and data.custom_amount:
        # Validate custom amount is reasonable (server-side validation)
        if data.custom_amount < 100 or data.custom_amount > 10000000:
            raise HTTPException(status_code=400, detail="Invalid custom amount")
        amount = float(data.custom_amount)
    else:
        amount = package["amount"]
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")
    
    currency = package["currency"]
    
    # Generate transaction ID
    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
    
    # Build URLs from provided origin
    success_url = f"{data.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/payment-cancelled"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Prepare metadata
    metadata = {
        "transaction_id": transaction_id,
        "package_id": data.package_id,
        "package_name": package["name"],
    }
    
    if data.booking_id:
        metadata["booking_id"] = data.booking_id
    if data.emi_id:
        metadata["emi_id"] = data.emi_id
    if data.customer_id:
        metadata["customer_id"] = data.customer_id
    if data.project_id:
        metadata["project_id"] = data.project_id
    if data.property_id:
        metadata["property_id"] = data.property_id
    if data.description:
        metadata["description"] = data.description
    
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
        
        # Create payment transaction record in database
        transaction_record = {
            "id": transaction_id,
            "stripe_session_id": session.session_id,
            "package_id": data.package_id,
            "package_name": package["name"],
            "amount": amount,
            "currency": currency,
            "status": "pending",
            "payment_status": "initiated",
            "booking_id": data.booking_id,
            "emi_id": data.emi_id,
            "customer_id": data.customer_id,
            "project_id": data.project_id,
            "property_id": data.property_id,
            "description": data.description,
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction_record)
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.session_id,
            transaction_id=transaction_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """
    Get the status of a checkout session and update database
    """
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    db = get_db(request)
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Find transaction in database
    transaction = await db.payment_transactions.find_one(
        {"stripe_session_id": session_id}, 
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Initialize Stripe checkout
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        # Get status from Stripe
        status_response = await stripe_checkout.get_checkout_status(session_id)
        
        # Determine new status
        new_status = "pending"
        new_payment_status = status_response.payment_status
        
        if status_response.payment_status == "paid":
            new_status = "completed"
        elif status_response.status == "expired":
            new_status = "expired"
        elif status_response.status == "complete":
            new_status = "completed"
        
        # Only update if status changed and not already processed
        if transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": new_status,
                    "payment_status": new_payment_status,
                    "stripe_amount_total": status_response.amount_total,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # If payment successful, update related records
            if new_payment_status == "paid" and transaction.get("payment_status") != "paid":
                await process_successful_payment(db, transaction)
        
        return {
            "status": new_status,
            "payment_status": new_payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "transaction_id": transaction.get("id"),
            "metadata": status_response.metadata
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")


async def process_successful_payment(db, transaction: dict):
    """
    Process a successful payment - update related records
    """
    # Update EMI payment if applicable
    if transaction.get("emi_id"):
        await db.emi_payments.update_one(
            {"id": transaction["emi_id"]},
            {"$set": {
                "status": "paid",
                "payment_method": "stripe",
                "payment_date": datetime.now(timezone.utc).isoformat(),
                "stripe_transaction_id": transaction["id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Update booking if applicable
    if transaction.get("booking_id"):
        booking = await db.bookings.find_one({"id": transaction["booking_id"]}, {"_id": 0})
        if booking:
            new_amount_paid = float(booking.get("amount_paid", 0)) + transaction["amount"]
            await db.bookings.update_one(
                {"id": transaction["booking_id"]},
                {"$set": {
                    "amount_paid": new_amount_paid,
                    "last_payment_date": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Create payment record
    payment_record = {
        "id": f"pay_{uuid.uuid4().hex[:12]}",
        "transaction_id": transaction["id"],
        "amount": transaction["amount"],
        "currency": transaction["currency"],
        "payment_method": "stripe",
        "status": "completed",
        "booking_id": transaction.get("booking_id"),
        "customer_id": transaction.get("customer_id"),
        "project_id": transaction.get("project_id"),
        "property_id": transaction.get("property_id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_record)


@router.get("/transactions")
async def get_payment_transactions(
    request: Request,
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """
    Get list of payment transactions
    """
    db = get_db(request)
    
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    if booking_id:
        query["booking_id"] = booking_id
    
    transactions = await db.payment_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.payment_transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, request: Request):
    """
    Get a single transaction by ID
    """
    db = get_db(request)
    
    transaction = await db.payment_transactions.find_one(
        {"id": transaction_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction


@router.get("/packages")
async def get_payment_packages():
    """
    Get available payment packages
    """
    packages = []
    for key, value in PAYMENT_PACKAGES.items():
        packages.append({
            "id": key,
            "name": value["name"],
            "amount": value["amount"],
            "currency": value["currency"],
            "is_dynamic": value["amount"] == 0
        })
    
    return {"packages": packages}


@router.get("/stats")
async def get_payment_stats(request: Request):
    """
    Get payment statistics
    """
    db = get_db(request)
    
    # Get counts by status
    pipeline = [
        {"$group": {
            "_id": "$payment_status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    stats_by_status = await db.payment_transactions.aggregate(pipeline).to_list(length=None)
    
    # Get total successful payments
    completed = await db.payment_transactions.count_documents({"payment_status": "paid"})
    pending = await db.payment_transactions.count_documents({"payment_status": {"$in": ["initiated", "pending"]}})
    failed = await db.payment_transactions.count_documents({"status": "expired"})
    
    # Total amount collected
    total_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.payment_transactions.aggregate(total_pipeline).to_list(length=1)
    total_collected = total_result[0]["total"] if total_result else 0
    
    return {
        "total_transactions": completed + pending + failed,
        "completed": completed,
        "pending": pending,
        "failed": failed,
        "total_collected": total_collected,
        "by_status": stats_by_status
    }
