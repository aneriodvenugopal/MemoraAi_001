from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, List
from utils.helpers import serialize_doc
from middleware.auth import get_current_user as auth_get_current_user

router = APIRouter(prefix="/customer", tags=["customer"])

def get_db(request: Request):
    return request.app.state.db

async def get_current_user(request: Request):
    """Get current user from JWT token"""
    return await auth_get_current_user(request)

class ResaleRequest(BaseModel):
    property_id: str
    booking_id: str
    asking_price: float
    reason: Optional[str] = None
    notes: Optional[str] = None

@router.get("/dashboard")
async def get_customer_dashboard(request: Request):
    """Get customer dashboard overview"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    
    # If admin/super_admin, show all bookings, else show only user's bookings
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        # For admins: Get all bookings in their tenant
        tenant_id = user.get('tenant_id')
        bookings_filter = {'deleted_at': None}
        if tenant_id:
            bookings_filter['tenant_id'] = tenant_id
    else:
        # For customers: Get only their bookings
        bookings_filter = {'customer_id': user_id, 'deleted_at': None}
    
    # Get customer's bookings
    bookings = await db.bookings.find(
        bookings_filter,
        {'_id': 0}
    ).to_list(length=None)
    
    total_bookings = len(bookings)
    total_invested = sum(b.get('total_amount', 0) for b in bookings)
    total_paid = sum(b.get('paid_amount', 0) for b in bookings)
    total_pending = total_invested - total_paid
    
    # Get active bookings (not cancelled)
    active_bookings = [b for b in bookings if b.get('status') != 'cancelled']
    
    # Get properties for these bookings
    property_ids = [b['property_id'] for b in active_bookings if b.get('property_id')]
    properties = []
    if property_ids:
        properties = await db.properties.find(
            {'id': {'$in': property_ids}, 'deleted_at': None},
            {'_id': 0}
        ).to_list(length=None)
    
    # Get upcoming payment schedules
    today = datetime.now(timezone.utc).date().isoformat()
    future_date = (datetime.now(timezone.utc).date()).isoformat()
    
    upcoming_payments = await db.payment_schedules.find({
        'booking_id': {'$in': [b['id'] for b in active_bookings]},
        'status': 'pending',
        'due_date': {'$gte': today},
        'deleted_at': None
    }, {'_id': 0}).sort('due_date', 1).limit(5).to_list(length=5)
    
    # Get overdue payments
    overdue_payments = await db.payment_schedules.find({
        'booking_id': {'$in': [b['id'] for b in active_bookings]},
        'status': 'pending',
        'due_date': {'$lt': today},
        'deleted_at': None
    }, {'_id': 0}).to_list(length=None)
    
    overdue_amount = sum(p.get('amount', 0) for p in overdue_payments)
    
    # Recent payments
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        # For admins: show all payments in tenant
        payments_filter = {'deleted_at': None}
        if user.get('tenant_id'):
            payments_filter['tenant_id'] = user.get('tenant_id')
    else:
        # For customers: show only their payments
        payments_filter = {'customer_id': user_id, 'deleted_at': None}
    
    recent_payments = await db.payments.find(
        payments_filter,
        {'_id': 0}
    ).sort('payment_date', -1).limit(5).to_list(length=5)
    
    return {
        'overview': {
            'total_bookings': total_bookings,
            'active_bookings': len(active_bookings),
            'total_invested': round(total_invested, 2),
            'total_paid': round(total_paid, 2),
            'total_pending': round(total_pending, 2),
            'overdue_amount': round(overdue_amount, 2),
            'overdue_count': len(overdue_payments)
        },
        'properties': properties,
        'upcoming_payments': upcoming_payments,
        'recent_payments': recent_payments
    }

@router.get("/bookings")
async def get_customer_bookings(request: Request):
    """Get all customer bookings"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    
    # Build filter based on role
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        bookings_filter = {'deleted_at': None}
        if user.get('tenant_id'):
            bookings_filter['tenant_id'] = user.get('tenant_id')
    else:
        bookings_filter = {'customer_id': user_id, 'deleted_at': None}
    
    # Get bookings
    bookings = await db.bookings.find(
        bookings_filter,
        {'_id': 0}
    ).to_list(length=None)
    
    # Enrich with property and project details
    for booking in bookings:
        # Get property
        if booking.get('property_id'):
            property_doc = await db.properties.find_one(
                {'id': booking['property_id']},
                {'_id': 0}
            )
            booking['property'] = property_doc
        
        # Get project
        if booking.get('project_id'):
            project = await db.projects.find_one(
                {'id': booking['project_id']},
                {'_id': 0}
            )
            booking['project'] = project
        
        # Get payment schedules
        schedules = await db.payment_schedules.find(
            {'booking_id': booking['id'], 'deleted_at': None},
            {'_id': 0}
        ).to_list(length=None)
        booking['payment_schedules'] = schedules
    
    return {'bookings': bookings}

@router.get("/bookings/{booking_id}")
async def get_booking_detail(booking_id: str, request: Request):
    """Get detailed booking information"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    # Get booking
    booking = await db.bookings.find_one(
        {'id': booking_id, 'customer_id': user_id, 'deleted_at': None},
        {'_id': 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get property details
    if booking.get('property_id'):
        property_doc = await db.properties.find_one(
            {'id': booking['property_id']},
            {'_id': 0}
        )
        booking['property'] = property_doc
    
    # Get project details
    if booking.get('project_id'):
        project = await db.projects.find_one(
            {'id': booking['project_id']},
            {'_id': 0}
        )
        booking['project'] = project
    
    # Get all payments
    payments = await db.payments.find(
        {'booking_id': booking_id, 'deleted_at': None},
        {'_id': 0}
    ).sort('payment_date', -1).to_list(length=None)
    booking['payments'] = payments
    
    # Get payment schedules
    schedules = await db.payment_schedules.find(
        {'booking_id': booking_id, 'deleted_at': None},
        {'_id': 0}
    ).sort('due_date', 1).to_list(length=None)
    booking['payment_schedules'] = schedules
    
    return booking

@router.get("/payments")
async def get_customer_payments(request: Request):
    """Get all customer payments"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    
    # Build filter based on role
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        payments_filter = {'deleted_at': None}
        if user.get('tenant_id'):
            payments_filter['tenant_id'] = user.get('tenant_id')
    else:
        payments_filter = {'customer_id': user_id, 'deleted_at': None}
    
    # Get payments
    payments = await db.payments.find(
        payments_filter,
        {'_id': 0}
    ).sort('payment_date', -1).to_list(length=None)
    
    # Enrich with booking and property details
    for payment in payments:
        if payment.get('booking_id'):
            booking = await db.bookings.find_one(
                {'id': payment['booking_id']},
                {'_id': 0, 'property_id': 1, 'project_id': 1}
            )
            
            if booking and booking.get('property_id'):
                property_doc = await db.properties.find_one(
                    {'id': booking['property_id']},
                    {'_id': 0, 'property_number': 1}
                )
                payment['property_number'] = property_doc.get('property_number') if property_doc else None
    
    return {'payments': payments}

@router.get("/payment-schedules")
async def get_customer_payment_schedules(request: Request, status: Optional[str] = Query(None)):
    """Get customer's payment schedules"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    
    # Build filter based on role
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        bookings_filter = {'deleted_at': None}
        if user.get('tenant_id'):
            bookings_filter['tenant_id'] = user.get('tenant_id')
    else:
        bookings_filter = {'customer_id': user_id, 'deleted_at': None}
    
    # Get customer's bookings first
    bookings = await db.bookings.find(
        bookings_filter,
        {'_id': 0, 'id': 1}
    ).to_list(length=None)
    
    booking_ids = [b['id'] for b in bookings]
    
    print(f"[SCHEDULES API] User: {user_id}, Role: {user_role}, Status filter: {status}")
    print(f"[SCHEDULES API] Found {len(bookings)} bookings")
    print(f"[SCHEDULES API] Extracted {len(booking_ids)} booking_ids")
    
    if not booking_ids:
        print("[SCHEDULES API] No booking_ids found, returning empty")
        return {'schedules': []}
    
    # Build query
    query = {
        'booking_id': {'$in': booking_ids},
        'deleted_at': None
    }
    
    if status:
        query['status'] = status
    
    # Get schedules
    schedules = await db.payment_schedules.find(query, {'_id': 0}).sort('due_date', 1).to_list(length=None)
    
    print(f"[SCHEDULES API] Found {len(schedules)} payment schedules")
    
    # Enrich with property details
    for schedule in schedules:
        booking = await db.bookings.find_one(
            {'id': schedule['booking_id']},
            {'_id': 0}
        )
        
        if booking:
            schedule['booking'] = booking
            
            if booking.get('property_id'):
                property_doc = await db.properties.find_one(
                    {'id': booking['property_id']},
                    {'_id': 0, 'property_number': 1}
                )
                schedule['property_number'] = property_doc.get('property_number') if property_doc else None
    
    return {'schedules': schedules}

@router.get("/properties")
async def get_customer_properties(request: Request):
    """Get all properties owned by customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    
    # Build filter based on role
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        bookings_filter = {'status': {'$ne': 'cancelled'}, 'deleted_at': None}
        if user.get('tenant_id'):
            bookings_filter['tenant_id'] = user.get('tenant_id')
    else:
        bookings_filter = {'customer_id': user_id, 'status': {'$ne': 'cancelled'}, 'deleted_at': None}
    
    # Get customer's bookings
    bookings = await db.bookings.find(
        bookings_filter,
        {'_id': 0}
    ).to_list(length=None)
    
    property_ids = [b['property_id'] for b in bookings if b.get('property_id')]
    
    print(f"[PROPERTIES API] User: {user_id}, Role: {user_role}")
    print(f"[PROPERTIES API] Found {len(bookings)} bookings")
    print(f"[PROPERTIES API] Extracted {len(property_ids)} property_ids")
    
    if not property_ids:
        print("[PROPERTIES API] No property_ids found, returning empty")
        return {'properties': []}
    
    # Get properties
    properties = await db.properties.find(
        {'id': {'$in': property_ids}, 'deleted_at': None},
        {'_id': 0}
    ).to_list(length=None)
    
    print(f"[PROPERTIES API] Found {len(properties)} properties in database")
    
    # Enrich with project and booking details
    for prop in properties:
        # Get project
        if prop.get('project_id'):
            project = await db.projects.find_one(
                {'id': prop['project_id']},
                {'_id': 0}
            )
            prop['project'] = project
        
        # Find corresponding booking
        booking = next((b for b in bookings if b['property_id'] == prop['id']), None)
        if booking:
            prop['booking_id'] = booking['id']
            prop['booking_date'] = booking.get('booking_date')
            prop['payment_status'] = 'Fully Paid' if booking.get('balance_amount', 0) <= 0 else 'Pending'
    
    print(f"[PROPERTIES API] Returning {len(properties)} properties")
    return {'properties': properties}

@router.post("/resale-request")
async def create_resale_request(resale_data: ResaleRequest, request: Request):
    """Request property resale"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_role = user.get('role', '')
    tenant_id = user.get('tenant_id')
    
    # Get user details
    customer = await db.users.find_one({'id': user_id}, {'_id': 0})
    
    # Verify booking exists and belongs to customer (or admin viewing)
    if user_role in ['super_admin', 'tenant_admin', 'admin']:
        # Admin can create resale request for any booking in their tenant
        booking_filter = {'id': resale_data.booking_id, 'deleted_at': None}
        if tenant_id:
            booking_filter['tenant_id'] = tenant_id
    else:
        # Customer can only create for their own bookings
        booking_filter = {'id': resale_data.booking_id, 'customer_id': user_id, 'deleted_at': None}
    
    booking = await db.bookings.find_one(booking_filter, {'_id': 0})
    
    if not booking:
        print(f"[RESALE REQUEST] Booking not found - ID: {resale_data.booking_id}, User: {user_id}, Role: {user_role}")
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get property details
    property_doc = await db.properties.find_one(
        {'id': resale_data.property_id, 'deleted_at': None},
        {'_id': 0}
    )
    
    # Check if already requested
    existing = await db.resale_requests.find_one({
        'booking_id': resale_data.booking_id,
        'status': {'$in': ['pending', 'approved']},
        'deleted_at': None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Resale request already exists")
    
    # Create resale request
    import uuid
    resale_request = {
        'id': str(uuid.uuid4()),
        'customer_id': user_id,
        'property_id': resale_data.property_id,
        'booking_id': resale_data.booking_id,
        'asking_price': resale_data.asking_price,
        'reason': resale_data.reason,
        'notes': resale_data.notes,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.resale_requests.insert_one(serialize_doc(resale_request))
    
    # Create notification for tenant admin AND project managers
    # Get all roles that should be notified
    tenant_admin_role = await db.roles.find_one({'slug': 'tenant_admin'}, {'_id': 0})
    super_admin_role = await db.roles.find_one({'slug': 'super_admin'}, {'_id': 0})
    project_manager_role = await db.roles.find_one({'slug': 'project_manager'}, {'_id': 0})
    
    # Get tenant admins and super admins
    tenant_admins = await db.users.find({
        'tenant_id': tenant_id,
        'role_id': {'$in': [
            tenant_admin_role['id'] if tenant_admin_role else '',
            super_admin_role['id'] if super_admin_role else ''
        ]},
        'is_active': True,
        'deleted_at': None
    }, {'_id': 0}).to_list(length=100)
    
    # Get project managers assigned to this property's project
    property_obj = await db.properties.find_one({'id': resale_data.property_id}, {'_id': 0})
    project_managers = []
    if property_obj and property_obj.get('project_id') and project_manager_role:
        project_managers = await db.users.find({
            'tenant_id': tenant_id,
            'role_id': project_manager_role['id'],
            'assigned_projects': property_obj['project_id'],  # Project manager assigned to this project
            'is_active': True,
            'deleted_at': None
        }, {'_id': 0}).to_list(length=100)
    
    # Combine all recipients (admins + project managers)
    all_recipients = tenant_admins + project_managers
    
    # Create notification for each recipient
    for recipient in all_recipients:
        notification_doc = {
            'id': str(uuid.uuid4()),
            'user_id': recipient['id'],
            'tenant_id': tenant_id,
            'title': '🏠 New Resale Request',
            'message': f'{customer.get("name", "Customer")} requested to resell {property_doc.get("property_name", "property")} for ₹{resale_data.asking_price:,.0f}',
            'type': 'booking',
            'priority': 'high',
            'read': False,
            'action_url': '/bookings',
            'action_label': 'View Request',
            'metadata': {
                'customer_id': user_id,
                'customer_name': customer.get('name'),
                'property_id': resale_data.property_id,
                'property_name': property_doc.get('property_name'),
                'asking_price': resale_data.asking_price,
                'request_id': resale_request['id'],
                'project_id': property_obj.get('project_id') if property_obj else None
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        }
        await db.in_app_notifications.insert_one(notification_doc)
    
    return {
        'message': 'Resale request submitted successfully',
        'request_id': resale_request['id']
    }

@router.get("/resale-requests")
async def get_customer_resale_requests(request: Request):
    """Get customer's resale requests"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    # Get resale requests
    requests = await db.resale_requests.find(
        {'customer_id': user_id, 'deleted_at': None},
        {'_id': 0}
    ).sort('created_at', -1).to_list(length=None)
    
    # Enrich with property details
    for req in requests:
        if req.get('property_id'):
            property_doc = await db.properties.find_one(
                {'id': req['property_id']},
                {'_id': 0}
            )
            req['property'] = property_doc
    
    return {'requests': requests}
