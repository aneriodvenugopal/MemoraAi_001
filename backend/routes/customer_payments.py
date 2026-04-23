from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from models.customer_payment import (
    CustomerPayment, CustomerPaymentCreate,
    RazorpayPaymentCreate, RazorpayPaymentVerify
)
from services.razorpay_service import razorpay_service
from middleware.auth import get_current_user

router = APIRouter()

# Import commission calculation function
async def trigger_commission_calculation(payment_id: str):
    """Trigger commission calculation for a completed payment"""
    from routes.commission_management import calculate_commissions_for_payment
    await calculate_commissions_for_payment(payment_id)

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

@router.post("/razorpay/create-order", response_model=dict)
async def create_razorpay_order(
    payment_data: RazorpayPaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create Razorpay order for online payment"""
    
    # Validate bookings exist
    bookings = []
    for booking_id in payment_data.booking_ids:
        booking = await db.bookings.find_one({
            "id": booking_id,
            "tenant_id": payment_data.tenant_id,
            "deleted_at": None
        })
        if not booking:
            raise HTTPException(
                status_code=404,
                detail=f"Booking {booking_id} not found"
            )
        bookings.append(booking)
    
    # Generate receipt ID
    receipt = f"rcpt_{str(uuid.uuid4())[:8]}"
    
    # Create Razorpay order
    try:
        order = razorpay_service.create_order(
            amount=payment_data.amount,
            currency=payment_data.currency,
            receipt=receipt,
            notes={
                "tenant_id": payment_data.tenant_id,
                "customer_id": payment_data.customer_id,
                "booking_ids": ",".join(payment_data.booking_ids),
                "notes": payment_data.notes or ""
            }
        )
        
        # Store pending payment record
        payment_record = {
            "id": str(uuid.uuid4()),
            "tenant_id": payment_data.tenant_id,
            "booking_ids": payment_data.booking_ids,
            "project_ids": [b["project_id"] for b in bookings],
            "property_ids": [b["property_id"] for b in bookings],
            "customer_id": payment_data.customer_id,
            "customer_name": bookings[0].get("customer_name", ""),
            "customer_phone": bookings[0].get("customer_phone", ""),
            "customer_email": bookings[0].get("customer_email"),
            "amount": payment_data.amount,
            "currency_id": payment_data.currency,
            "payment_date": datetime.now(timezone.utc),
            "payment_method": "razorpay",
            "payment_mode": "gateway",
            "razorpay_order_id": order["id"],
            "status": "pending",
            "is_cleared": False,
            "exchange_rate": 1.0,
            "base_currency_amount": payment_data.amount,
            "receipt_number": receipt,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.customer_payments.insert_one(payment_record)
        
        return {
            "success": True,
            "order_id": order["id"],
            "amount": payment_data.amount,
            "currency": payment_data.currency,
            "receipt": receipt,
            "key_id": razorpay_service.key_id,
            "payment_id": payment_record["id"],
            "is_mock": order.get("mock", False)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create payment order: {str(e)}"
        )

@router.post("/razorpay/verify", response_model=dict)
async def verify_razorpay_payment(
    verification: RazorpayPaymentVerify,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Verify Razorpay payment after successful payment"""
    
    # Verify signature
    is_valid = razorpay_service.verify_payment_signature(
        verification.razorpay_order_id,
        verification.razorpay_payment_id,
        verification.razorpay_signature
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment signature. Payment verification failed."
        )
    
    # Find payment record
    payment = await db.customer_payments.find_one({
        "razorpay_order_id": verification.razorpay_order_id
    })
    
    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment record not found"
        )
    
    # Update payment status
    await db.customer_payments.update_one(
        {"id": payment["id"]},
        {
            "$set": {
                "razorpay_payment_id": verification.razorpay_payment_id,
                "razorpay_signature": verification.razorpay_signature,
                "status": "completed",
                "is_cleared": True,
                "cleared_date": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update booking paid amounts
    for booking_id in payment["booking_ids"]:
        booking = await db.bookings.find_one({"id": booking_id})
        if booking:
            new_paid = booking.get("paid_amount", 0) + payment["amount"]
            new_balance = booking["total_amount"] - new_paid
            
            await db.bookings.update_one(
                {"id": booking_id},
                {
                    "$set": {
                        "paid_amount": new_paid,
                        "balance_amount": new_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
    
    # Trigger commission calculation in background
    background_tasks.add_task(trigger_commission_calculation, payment["id"])
    
    return {
        "success": True,
        "message": "Payment verified successfully",
        "payment_id": payment["id"],
        "amount": payment["amount"],
        "status": "completed"
    }

@router.post("/manual", response_model=dict)
async def create_manual_payment(
    payment: CustomerPaymentCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create manual payment entry (NEFT, Cheque, Cash, etc.)"""
    
    # Validate bookings exist
    bookings = []
    total_allocation = 0
    
    for booking_id in payment.booking_ids:
        booking = await db.bookings.find_one({
            "id": booking_id,
            "tenant_id": payment.tenant_id,
            "deleted_at": None
        })
        if not booking:
            raise HTTPException(
                status_code=404,
                detail=f"Booking {booking_id} not found"
            )
        bookings.append(booking)
        
        # Check allocation
        if payment.allocation and booking_id in payment.allocation:
            total_allocation += payment.allocation[booking_id]
    
    # Validate allocation matches amount
    if payment.allocation:
        if abs(total_allocation - payment.amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Allocation total ({total_allocation}) must match payment amount ({payment.amount})"
            )
    else:
        # Auto-allocate equally if not provided
        allocation_per_booking = payment.amount / len(payment.booking_ids)
        payment.allocation = {bid: allocation_per_booking for bid in payment.booking_ids}
    
    # Get customer details from first booking
    first_booking = bookings[0]
    
    # Create payment record
    payment_id = str(uuid.uuid4())
    receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_id[:8].upper()}"
    
    payment_dict = {
        "id": payment_id,
        "tenant_id": payment.tenant_id,
        "booking_ids": payment.booking_ids,
        "project_ids": [b["project_id"] for b in bookings],
        "property_ids": [b["property_id"] for b in bookings],
        "customer_id": payment.customer_id,
        "customer_name": first_booking.get("customer_name", ""),
        "customer_phone": first_booking.get("customer_phone", ""),
        "customer_email": first_booking.get("customer_email"),
        "amount": payment.amount,
        "currency_id": payment.currency_id,
        "payment_date": datetime.now(timezone.utc),
        "payment_method": payment.payment_method,
        "payment_mode": payment.payment_mode,
        "transaction_id": payment.transaction_id,
        "reference_number": payment.reference_number,
        "bank_name": payment.bank_name,
        "cheque_date": payment.cheque_date,
        "payment_screenshot_url": payment.payment_screenshot_url,
        "status": "completed" if payment.payment_mode != "cheque" else "pending",
        "is_cleared": payment.payment_mode != "cheque",
        "cleared_date": datetime.now(timezone.utc) if payment.payment_mode != "cheque" else None,
        "allocation": payment.allocation,
        "receipt_number": receipt_number,
        "collected_by": payment.collected_by or current_user.get("id"),
        "approved_by": current_user.get("id"),
        "notes": payment.notes,
        "exchange_rate": 1.0,
        "base_currency_amount": payment.amount,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.customer_payments.insert_one(payment_dict)
    
    # Update booking paid amounts (only for non-cheque or cleared payments)
    if payment.payment_mode != "cheque":
        for booking_id, allocated_amount in payment.allocation.items():
            booking = await db.bookings.find_one({"id": booking_id})
            if booking:
                new_paid = booking.get("paid_amount", 0) + allocated_amount
                new_balance = booking["total_amount"] - new_paid
                
                await db.bookings.update_one(
                    {"id": booking_id},
                    {
                        "$set": {
                            "paid_amount": new_paid,
                            "balance_amount": new_balance,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
        
        # Trigger commission calculation in background (only for non-cheque)
        background_tasks.add_task(trigger_commission_calculation, payment_id)
    
    return {
        "success": True,
        "message": "Payment recorded successfully",
        "payment_id": payment_id,
        "receipt_number": receipt_number,
        "amount": payment.amount,
        "status": payment_dict["status"]
    }

@router.post("/cheque/{payment_id}/clear", response_model=dict)
async def clear_cheque_payment(
    payment_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Mark cheque payment as cleared"""
    
    payment = await db.customer_payments.find_one({
        "id": payment_id,
        "payment_mode": "cheque",
        "deleted_at": None
    })
    
    if not payment:
        raise HTTPException(status_code=404, detail="Cheque payment not found")
    
    if payment.get("is_cleared"):
        raise HTTPException(status_code=400, detail="Cheque is already cleared")
    
    # Update payment status
    await db.customer_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "is_cleared": True,
                "cleared_date": datetime.now(timezone.utc),
                "status": "completed",
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update booking paid amounts
    allocation = payment.get("allocation", {})
    for booking_id, allocated_amount in allocation.items():
        booking = await db.bookings.find_one({"id": booking_id})
        if booking:
            new_paid = booking.get("paid_amount", 0) + allocated_amount
            new_balance = booking["total_amount"] - new_paid
            
            await db.bookings.update_one(
                {"id": booking_id},
                {
                    "$set": {
                        "paid_amount": new_paid,
                        "balance_amount": new_balance,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
    
    # Trigger commission calculation after cheque clearance
    background_tasks.add_task(trigger_commission_calculation, payment_id)
    
    return {
        "success": True,
        "message": "Cheque cleared successfully",
        "payment_id": payment_id,
        "amount": payment["amount"]
    }

@router.get("/payments", response_model=dict)
async def list_payments(
    tenant_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_mode: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List customer payments with filters"""
    
    query = {"deleted_at": None}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if customer_id:
        query["customer_id"] = customer_id
    if booking_id:
        query["booking_ids"] = booking_id
    if project_id:
        query["project_ids"] = project_id
    if status:
        query["status"] = status
    if payment_mode:
        query["payment_mode"] = payment_mode
    
    if from_date or to_date:
        query["payment_date"] = {}
        if from_date:
            query["payment_date"]["$gte"] = datetime.fromisoformat(from_date)
        if to_date:
            query["payment_date"]["$lte"] = datetime.fromisoformat(to_date)
    
    total_count = await db.customer_payments.count_documents(query)
    
    payments = await db.customer_payments.find(query)\
        .sort("payment_date", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=None)
    
    # Calculate totals
    total_amount = sum(p.get("amount", 0) for p in payments)
    
    return {
        "success": True,
        "count": len(payments),
        "total_count": total_count,
        "total_amount": total_amount,
        "payments": payments
    }

@router.get("/payments/{payment_id}", response_model=dict)
async def get_payment_details(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed payment information"""
    
    payment = await db.customer_payments.find_one({
        "id": payment_id,
        "deleted_at": None
    })
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get booking details
    bookings = []
    for booking_id in payment.get("booking_ids", []):
        booking = await db.bookings.find_one({"id": booking_id})
        if booking:
            # Get property details
            property_data = await db.properties.find_one({"id": booking["property_id"]})
            project_data = await db.projects.find_one({"id": booking["project_id"]})
            
            bookings.append({
                "booking_id": booking_id,
                "property_name": property_data.get("display_name") if property_data else None,
                "project_name": project_data.get("name") if project_data else None,
                "total_amount": booking.get("total_amount"),
                "paid_amount": booking.get("paid_amount"),
                "balance_amount": booking.get("balance_amount"),
                "allocated_amount": payment.get("allocation", {}).get(booking_id, 0)
            })
    
    return {
        "success": True,
        "payment": payment,
        "bookings": bookings
    }

@router.get("/customer/{customer_id}/payments", response_model=dict)
async def get_customer_payment_history(
    customer_id: str,
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get payment history for a specific customer"""
    
    query = {
        "customer_id": customer_id,
        "deleted_at": None
    }
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    payments = await db.customer_payments.find(query)\
        .sort("payment_date", -1)\
        .to_list(length=None)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "success": True,
        "customer_id": customer_id,
        "total_payments": len(payments),
        "total_amount_paid": total_paid,
        "payments": payments
    }
