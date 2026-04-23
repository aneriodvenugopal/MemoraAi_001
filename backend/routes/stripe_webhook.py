"""
Stripe Webhook Handler
Handles Stripe payment events
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["webhooks"])


@router.post("/webhook/stripe")
async def handle_stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    """
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    db = request.app.state.db
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Get webhook data
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Initialize Stripe checkout for webhook handling
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response:
            # Update transaction based on event
            session_id = webhook_response.session_id
            
            if session_id:
                # Find and update transaction
                transaction = await db.payment_transactions.find_one(
                    {"stripe_session_id": session_id},
                    {"_id": 0}
                )
                
                if transaction:
                    new_status = "pending"
                    if webhook_response.payment_status == "paid":
                        new_status = "completed"
                    elif webhook_response.event_type in ["checkout.session.expired"]:
                        new_status = "expired"
                    
                    # Only update if not already processed
                    if transaction.get("payment_status") != "paid":
                        await db.payment_transactions.update_one(
                            {"stripe_session_id": session_id},
                            {"$set": {
                                "status": new_status,
                                "payment_status": webhook_response.payment_status,
                                "webhook_event_id": webhook_response.event_id,
                                "webhook_event_type": webhook_response.event_type,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        # Process successful payment
                        if webhook_response.payment_status == "paid":
                            await process_webhook_payment(db, transaction)
        
        return {"status": "received"}
        
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        # Return 200 to acknowledge receipt even on error
        return {"status": "error", "message": str(e)}


async def process_webhook_payment(db, transaction: dict):
    """
    Process a successful payment from webhook
    """
    import uuid
    
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
    
    # Check if payment record already exists
    existing_payment = await db.payments.find_one({"transaction_id": transaction["id"]}, {"_id": 0})
    
    if not existing_payment:
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
            "source": "webhook",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payments.insert_one(payment_record)
