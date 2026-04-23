from fastapi import APIRouter, HTTPException, Request
from models.payment import Booking, BookingCreate, Payment, PaymentCreate, PaymentSchedule, PaymentScheduleCreate
from models.property import Property
from utils.helpers import serialize_doc, deserialize_doc
from services.audit_log_service import AuditLogService
from middleware.auth import get_current_user
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter(prefix="/bookings", tags=["bookings"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/", response_model=Booking)
async def create_booking(booking_create: BookingCreate, request: Request):
    """Create a new booking"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Check if property exists and is available
    property_doc = await db.properties.find_one({'id': booking_create.property_id, 'deleted_at': None}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get booked status
    booked_status = await db.master_categories.find_one({'slug': 'booked', 'type': 'property_status'}, {"_id": 0})
    if not booked_status:
        raise HTTPException(status_code=500, detail="Booked status not found")
    
    # Check property status
    current_status = await db.master_categories.find_one({'id': property_doc['status_id']}, {"_id": 0})
    if current_status and current_status['slug'] not in ['available', 'blocked']:
        raise HTTPException(status_code=400, detail=f"Property is already {current_status['name']}")
    
    # Auto-create or find customer if customer_id not provided
    customer_id = booking_create.customer_id
    if not customer_id:
        # Check if customer exists by phone
        existing_customer = await db.customers.find_one({
            'phone': booking_create.customer_phone,
            'tenant_id': booking_create.tenant_id,
            'deleted_at': None
        }, {"_id": 0})
        
        if existing_customer:
            customer_id = existing_customer['id']
        else:
            # Create new customer
            customer_id = str(uuid.uuid4())
            new_customer = {
                'id': customer_id,
                'tenant_id': booking_create.tenant_id,
                'name': booking_create.customer_name,
                'phone': booking_create.customer_phone,
                'email': booking_create.customer_email,
                'status': 'active',
                'source': 'booking',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            }
            await db.customers.insert_one(new_customer)
    
    # Create booking with customer_id
    booking_data = booking_create.model_dump()
    booking_data['customer_id'] = customer_id
    if not booking_data.get('currency_id'):
        booking_data['currency_id'] = 'INR'
    
    booking = Booking(**booking_data)
    booking_doc = serialize_doc(booking.model_dump())
    
    await db.bookings.insert_one(booking_doc)
    
    # Update property status to booked
    await db.properties.update_one(
        {'id': booking_create.property_id},
        {'$set': {
            'status_id': booked_status['id'],
            'booked_by': customer_id,
            'booked_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update project stats
    from routes.properties import update_project_stats
    await update_project_stats(db, booking_create.project_id)
    
    # Create payment schedules if EMI
    if booking.payment_plan_type == 'emi' and booking.emi_months:
        await create_payment_schedules(db, booking)
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Booking",
        auditable_id=booking.id,
        event="created",
        module="booking",
        user_id=user.get('user_id'),
        new_values=booking_doc,
        tenant_id=booking.tenant_id,
        project_id=booking.project_id,
        ip_address=request.client.host
    )
    
    return booking

async def create_payment_schedules(db, booking: Booking):
    """Create payment schedules for EMI bookings"""
    remaining_amount = booking.total_amount - (booking.down_payment or booking.booking_amount)
    monthly_amount = remaining_amount / booking.emi_months
    
    # First schedule is for down payment (if any)
    if booking.down_payment and booking.down_payment > booking.booking_amount:
        schedule = PaymentSchedule(
            tenant_id=booking.tenant_id,
            project_id=booking.project_id,
            booking_id=booking.id,
            installment_number=0,
            due_amount=booking.down_payment - booking.booking_amount,
            due_date=datetime.now(timezone.utc) + timedelta(days=7),
            currency_id=booking.currency_id,
            remaining_amount=booking.down_payment - booking.booking_amount
        )
        schedule_doc = serialize_doc(schedule.model_dump())
        await db.payment_schedules.insert_one(schedule_doc)
    
    # Create monthly installment schedules
    for i in range(1, booking.emi_months + 1):
        due_date = datetime.now(timezone.utc) + timedelta(days=30 * i)
        schedule = PaymentSchedule(
            tenant_id=booking.tenant_id,
            project_id=booking.project_id,
            booking_id=booking.id,
            installment_number=i,
            due_amount=monthly_amount,
            due_date=due_date,
            currency_id=booking.currency_id,
            remaining_amount=monthly_amount
        )
        schedule_doc = serialize_doc(schedule.model_dump())
        await db.payment_schedules.insert_one(schedule_doc)

@router.get("/", response_model=List[Booking])
async def get_bookings(
    request: Request,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all bookings with filters"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {'deleted_at': None}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    # If customer, show only their bookings
    if user.get('role') == 'customer':
        query['customer_id'] = user.get('user_id')
    elif customer_id:
        query['customer_id'] = customer_id
    
    if project_id:
        query['project_id'] = project_id
    
    if status:
        query['status'] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    # Skip deserialization since Pydantic model expects string datetime fields
    # for booking in bookings:
    #     deserialize_doc(booking)
    
    return [Booking(**b) for b in bookings]

@router.get("/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, request: Request):
    """Get booking by ID"""
    db = get_db(request)
    
    booking_doc = await db.bookings.find_one({'id': booking_id, 'deleted_at': None}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Skip deserialization since Pydantic model expects string datetime fields
    # booking_doc = deserialize_doc(booking_doc)
    return Booking(**booking_doc)

@router.get("/{booking_id}/details")
async def get_booking_details(booking_id: str, request: Request):
    """Get booking with all related information"""
    db = get_db(request)
    
    booking_doc = await db.bookings.find_one({'id': booking_id, 'deleted_at': None}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Skip deserialization since Pydantic model expects string datetime fields
    # booking_doc = deserialize_doc(booking_doc)
    
    # Get property
    property_doc = await db.properties.find_one({'id': booking_doc['property_id']}, {"_id": 0})
    
    # Get project
    project_doc = await db.projects.find_one({'id': booking_doc['project_id']}, {"_id": 0})
    
    # Get payments
    payments = await db.payments.find({'booking_id': booking_id}, {"_id": 0}).sort('payment_date', -1).to_list(100)
    for payment in payments:
        deserialize_doc(payment)
    
    # Get payment schedules
    schedules = await db.payment_schedules.find({'booking_id': booking_id}, {"_id": 0}).sort('installment_number', 1).to_list(100)
    for schedule in schedules:
        deserialize_doc(schedule)
    
    # Calculate totals
    total_paid = sum(p['amount'] for p in payments if p['status'] == 'completed')
    total_pending = booking_doc['total_amount'] - total_paid
    
    return {
        'booking': Booking(**booking_doc),
        'property': property_doc,
        'project': project_doc,
        'payments': payments,
        'payment_schedules': schedules,
        'total_paid': total_paid,
        'total_pending': total_pending,
        'payment_progress': (total_paid / booking_doc['total_amount'] * 100) if booking_doc['total_amount'] > 0 else 0
    }

# Payment routes
@router.post("/{booking_id}/payments", response_model=Payment)
async def create_payment(booking_id: str, payment_create: PaymentCreate, request: Request):
    """Create a payment for a booking"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get booking
    booking_doc = await db.bookings.find_one({'id': booking_id, 'deleted_at': None}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Validate bank account if provided
    bank_account = None
    if payment_create.bank_account_id:
        bank_account = await db.bank_accounts.find_one({
            'id': payment_create.bank_account_id,
            'deleted_at': None,
            'is_active': True
        }, {"_id": 0})
        if not bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found or inactive")
    
    # Create payment
    payment_data = payment_create.model_dump()
    payment_data['tenant_id'] = booking_doc['tenant_id']
    payment_data['project_id'] = booking_doc['project_id']
    payment_data['property_id'] = booking_doc['property_id']
    payment_data['currency_id'] = booking_doc.get('currency_id')
    
    # Generate receipt number
    payment_data['receipt_number'] = f"REC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    payment = Payment(**payment_data)
    payment_doc = serialize_doc(payment.model_dump())
    
    await db.payments.insert_one(payment_doc)
    
    # Update bank account balance if bank account is specified
    if bank_account and payment_create.bank_account_id:
        new_balance = bank_account.get('current_balance', 0) + payment.amount
        new_available = bank_account.get('available_balance', 0) + payment.amount
        await db.bank_accounts.update_one(
            {'id': payment_create.bank_account_id},
            {'$set': {
                'current_balance': new_balance,
                'available_balance': new_available,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create a transaction record for audit trail
        transaction_doc = {
            'id': str(uuid.uuid4()),
            'tenant_id': booking_doc['tenant_id'],
            'project_id': booking_doc['project_id'],
            'to_account_id': payment_create.bank_account_id,
            'amount': payment.amount,
            'transaction_type': 'credit',
            'category': 'payment_received',
            'description': f"Payment received for booking {booking_id}",
            'reference_type': 'payment',
            'reference_id': payment.id,
            'booking_id': booking_id,
            'transaction_date': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': user.get('user_id'),
            'deleted_at': None
        }
        await db.transactions.insert_one(transaction_doc)
    
    # Update payment schedule if installment
    if payment.installment_number is not None:
        schedule = await db.payment_schedules.find_one({
            'booking_id': booking_id,
            'installment_number': payment.installment_number
        }, {"_id": 0})
        
        if schedule:
            paid_amount = schedule.get('paid_amount', 0) + payment.amount
            remaining_amount = schedule['due_amount'] - paid_amount
            status = 'paid' if remaining_amount <= 0 else 'partial'
            
            await db.payment_schedules.update_one(
                {'id': schedule['id']},
                {'$set': {
                    'paid_amount': paid_amount,
                    'remaining_amount': remaining_amount,
                    'status': status,
                    'payment_id': payment.id,
                    'paid_date': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Check if booking is fully paid
    total_paid = await db.payments.aggregate([
        {'$match': {'booking_id': booking_id, 'status': 'completed'}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]).to_list(1)
    
    total_paid_amount = total_paid[0]['total'] if total_paid else 0
    
    if total_paid_amount >= booking_doc['total_amount']:
        # Update booking status to completed
        await db.bookings.update_one(
            {'id': booking_id},
            {'$set': {'status': 'completed', 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
        
        # Update property status to sold
        sold_status = await db.master_categories.find_one({'slug': 'sold', 'type': 'property_status'}, {"_id": 0})
        if sold_status:
            await db.properties.update_one(
                {'id': booking_doc['property_id']},
                {'$set': {'status_id': sold_status['id'], 'updated_at': datetime.now(timezone.utc).isoformat()}}
            )
            
            # Update project stats
            from routes.properties import update_project_stats
            await update_project_stats(db, booking_doc['project_id'])
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Payment",
        auditable_id=payment.id,
        event="created",
        module="payment",
        user_id=user.get('user_id'),
        new_values=payment_doc,
        tenant_id=booking_doc['tenant_id'],
        project_id=booking_doc['project_id'],
        ip_address=request.client.host
    )
    
    return payment

@router.get("/{booking_id}/payments", response_model=List[Payment])
async def get_booking_payments(booking_id: str, request: Request):
    """Get all payments for a booking"""
    db = get_db(request)
    
    payments = await db.payments.find({'booking_id': booking_id}, {"_id": 0}).sort('payment_date', -1).to_list(100)
    
    for payment in payments:
        deserialize_doc(payment)
    
    return [Payment(**p) for p in payments]

@router.get("/{booking_id}/schedules", response_model=List[PaymentSchedule])
async def get_payment_schedules(booking_id: str, request: Request):
    """Get payment schedules for a booking"""
    db = get_db(request)
    
    schedules = await db.payment_schedules.find({'booking_id': booking_id}, {"_id": 0}).sort('installment_number', 1).to_list(100)
    
    for schedule in schedules:
        deserialize_doc(schedule)
    
    return [PaymentSchedule(**s) for s in schedules]


# ==================== PAY NOW FEATURE ====================
from pydantic import BaseModel

class PayNowRequest(BaseModel):
    """Request model for Pay Now feature"""
    schedule_id: str
    origin_url: str
    payment_method: str = "stripe"  # stripe, payu, razorpay

class PayNowResponse(BaseModel):
    """Response model for Pay Now"""
    success: bool
    checkout_url: Optional[str] = None
    session_id: Optional[str] = None
    transaction_id: Optional[str] = None
    message: str = ""

@router.post("/pay-now", response_model=PayNowResponse)
async def initiate_pay_now(pay_request: PayNowRequest, request: Request):
    """
    Initiate online payment for a payment schedule item.
    Creates a Stripe checkout session for the customer to pay.
    """
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest
    )
    import os
    
    db = get_db(request)
    
    # Get the payment schedule
    schedule = await db.payment_schedules.find_one({
        'id': pay_request.schedule_id
    }, {"_id": 0})
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    
    # Check if already paid
    if schedule.get('status') == 'paid':
        raise HTTPException(status_code=400, detail="This installment has already been paid")
    
    # Get booking details
    booking = await db.bookings.find_one({
        'id': schedule.get('booking_id')
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get customer details
    customer = await db.customers.find_one({
        'id': booking.get('customer_id')
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get property details
    property_doc = await db.properties.find_one({
        'id': booking.get('property_id')
    }, {"_id": 0})
    
    property_number = property_doc.get('property_number', 'Property') if property_doc else 'Property'
    
    # Calculate amount to pay
    remaining_amount = schedule.get('remaining_amount') or schedule.get('due_amount', 0)
    
    if remaining_amount <= 0:
        raise HTTPException(status_code=400, detail="No amount pending for this installment")
    
    # Generate transaction ID
    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
    
    # Build URLs
    success_url = f"{pay_request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&schedule_id={pay_request.schedule_id}"
    cancel_url = f"{pay_request.origin_url}/payment-cancelled"
    
    # Get Stripe API key
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    try:
        # Initialize Stripe checkout
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        
        # Prepare metadata
        metadata = {
            "transaction_id": transaction_id,
            "schedule_id": pay_request.schedule_id,
            "booking_id": schedule.get('booking_id'),
            "property_id": booking.get('property_id'),
            "customer_id": booking.get('customer_id'),
            "installment_number": str(schedule.get('installment_number', 0)),
            "payment_type": "emi_payment"
        }
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=remaining_amount,
            currency="inr",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create pending payment transaction record
        payment_record = {
            "id": transaction_id,
            "stripe_session_id": session.session_id,
            "schedule_id": pay_request.schedule_id,
            "booking_id": schedule.get('booking_id'),
            "tenant_id": schedule.get('tenant_id'),
            "project_id": schedule.get('project_id'),
            "property_id": booking.get('property_id'),
            "customer_id": booking.get('customer_id'),
            "amount": remaining_amount,
            "currency": "INR",
            "status": "pending",
            "payment_method": "stripe",
            "installment_number": schedule.get('installment_number'),
            "description": f"EMI Payment #{schedule.get('installment_number', 0)} for {property_number}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.payment_transactions.insert_one(payment_record)
        
        # Update schedule to mark as processing
        await db.payment_schedules.update_one(
            {'id': pay_request.schedule_id},
            {'$set': {
                'payment_initiated': True,
                'pending_transaction_id': transaction_id,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return PayNowResponse(
            success=True,
            checkout_url=session.checkout_url,
            session_id=session.session_id,
            transaction_id=transaction_id,
            message="Payment session created successfully"
        )
        
    except Exception as e:
        print(f"Pay Now error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment session: {str(e)}")


@router.get("/schedule/{schedule_id}/pay-status")
async def get_pay_status(schedule_id: str, request: Request):
    """
    Get payment status for a specific schedule.
    Useful to check if payment was successful after redirect.
    """
    db = get_db(request)
    
    schedule = await db.payment_schedules.find_one({
        'id': schedule_id
    }, {"_id": 0})
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    
    # Check for any pending transactions
    pending_txn = await db.payment_transactions.find_one({
        'schedule_id': schedule_id,
        'status': {'$in': ['pending', 'processing']}
    }, {"_id": 0})
    
    return {
        "schedule_id": schedule_id,
        "status": schedule.get('status', 'pending'),
        "due_amount": schedule.get('due_amount', 0),
        "paid_amount": schedule.get('paid_amount', 0),
        "remaining_amount": schedule.get('remaining_amount', schedule.get('due_amount', 0)),
        "has_pending_payment": pending_txn is not None,
        "pending_transaction_id": pending_txn.get('id') if pending_txn else None
    }
