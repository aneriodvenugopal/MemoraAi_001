"""
Resale Request Routes
Customers can request property resale, admins can approve/reject
"""
from fastapi import APIRouter, HTTPException, Request
from models.resale import ResaleRequest, ResaleRequestCreate, ResaleRequestReview
from middleware.auth import get_current_user
from services.firebase_notification_service import send_notification_to_user, send_notification_to_multiple_users
from datetime import datetime, timezone
import uuid
from typing import List, Optional

router = APIRouter(prefix="/resale", tags=["resale"])

def get_db(request: Request):
    return request.app.state.db

# ============ CUSTOMER ENDPOINTS ============

@router.post("/request")
async def create_resale_request(request_data: ResaleRequestCreate, request: Request):
    """Customer creates a resale request"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Verify project exists
    project = await db.projects.find_one({'id': request_data.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create resale request
    request_id = str(uuid.uuid4())
    resale_request = {
        'id': request_id,
        'customer_id': user['user_id'],
        'customer_name': user.get('name', 'Customer'),
        'tenant_id': user['tenant_id'],
        'project_id': request_data.project_id,
        'project_name': project.get('name', 'Unknown Project'),
        'property_id': request_data.property_id,
        'plot_number': request_data.plot_number,
        'reason': request_data.reason,
        'expected_price': request_data.expected_price,
        'urgent': request_data.urgent,
        'contact_phone': request_data.contact_phone,
        'contact_email': request_data.contact_email,
        'status': 'pending',
        'reviewed_by': None,
        'reviewed_at': None,
        'review_notes': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Insert the resale request
    result = await db.resale_requests.insert_one(resale_request)
    
    # Remove MongoDB ObjectId from response
    resale_request.pop('_id', None)
    
    # Notify tenant admins
    admins = await db.users.find({
        'tenant_id': user['tenant_id'],
        'role': {'$in': ['super_admin', 'admin', 'frontdesk']}
    }, {"_id": 0}).to_list(length=100)
    
    admin_ids = [admin['id'] for admin in admins]
    
    if admin_ids:
        await send_notification_to_multiple_users(
            db=db,
            user_ids=admin_ids,
            tenant_id=user['tenant_id'],
            title=f"🏠 New Resale Request - {project.get('name')}",
            message=f"{user.get('name')} wants to resell property. {'URGENT!' if request_data.urgent else ''}",
            notification_type='info' if not request_data.urgent else 'warning',
            priority='high' if request_data.urgent else 'normal',
            action_url=f'/admin/resale-requests/{request_id}',
            action_label='Review Request',
            metadata={
                'resale_request_id': request_id,
                'project_id': request_data.project_id
            }
        )
    
    return {
        "success": True,
        "message": "Resale request submitted successfully",
        "request_id": request_id,
        "request": resale_request
    }

@router.get("/my-requests")
async def get_my_resale_requests(request: Request):
    """Get customer's resale requests"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    requests = await db.resale_requests.find({
        'customer_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0}).sort('created_at', -1).to_list(length=100)
    
    return {
        "success": True,
        "requests": requests,
        "total": len(requests)
    }

@router.get("/request/{request_id}")
async def get_resale_request(request_id: str, request: Request):
    """Get single resale request"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    resale_request = await db.resale_requests.find_one({'id': request_id}, {"_id": 0})
    
    if not resale_request:
        raise HTTPException(status_code=404, detail="Resale request not found")
    
    # Check access - customer can see their own, admins can see all
    is_admin = user.get('role') in ['super_admin', 'admin', 'frontdesk']
    is_owner = resale_request['customer_id'] == user['user_id']
    
    if not (is_admin or is_owner):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return resale_request

# ============ ADMIN ENDPOINTS ============

@router.get("/admin/requests")
async def get_all_resale_requests(
    request: Request,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all resale requests (Admin only)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check admin access
    if user.get('role') not in ['super_admin', 'admin', 'frontdesk']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db(request)
    
    # Build query
    query = {'tenant_id': user['tenant_id']}
    if status:
        query['status'] = status
    
    # Get requests
    requests = await db.resale_requests.find(query, {"_id": 0}) \
        .sort('created_at', -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    # Get total count
    total = await db.resale_requests.count_documents(query)
    
    # Count by status
    pending_count = await db.resale_requests.count_documents({
        'tenant_id': user['tenant_id'],
        'status': 'pending'
    })
    approved_count = await db.resale_requests.count_documents({
        'tenant_id': user['tenant_id'],
        'status': 'approved'
    })
    rejected_count = await db.resale_requests.count_documents({
        'tenant_id': user['tenant_id'],
        'status': 'rejected'
    })
    
    return {
        "success": True,
        "requests": requests,
        "total": total,
        "pending_count": pending_count,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "limit": limit,
        "skip": skip
    }

@router.post("/admin/review/{request_id}")
async def review_resale_request(
    request_id: str,
    review_data: ResaleRequestReview,
    request: Request
):
    """Admin approves or rejects resale request"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check admin access
    if user.get('role') not in ['super_admin', 'admin', 'frontdesk']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db(request)
    
    # Get resale request
    resale_request = await db.resale_requests.find_one({'id': request_id}, {"_id": 0})
    
    if not resale_request:
        raise HTTPException(status_code=404, detail="Resale request not found")
    
    if resale_request['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Request already reviewed")
    
    # Validate status
    if review_data.status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    # Update request
    await db.resale_requests.update_one(
        {'id': request_id},
        {
            '$set': {
                'status': review_data.status,
                'reviewed_by': user['user_id'],
                'reviewed_at': datetime.now(timezone.utc).isoformat(),
                'review_notes': review_data.review_notes,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify customer
    await send_notification_to_user(
        db=db,
        user_id=resale_request['customer_id'],
        tenant_id=resale_request['tenant_id'],
        title=f"Resale Request {'Approved' if review_data.status == 'approved' else 'Rejected'}",
        message=f"Your resale request for {resale_request['project_name']} has been {review_data.status}. {review_data.review_notes or ''}",
        notification_type='success' if review_data.status == 'approved' else 'info',
        priority='high',
        action_url='/resale/my-requests',
        action_label='View Request',
        metadata={
            'resale_request_id': request_id,
            'project_id': resale_request['project_id'],
            'status': review_data.status
        }
    )
    
    # If APPROVED, notify all interested users in that project
    if review_data.status == 'approved':
        # Find all users who have bookings or leads in this project
        interested_user_ids = set()
        
        # Users with bookings in this project
        bookings = await db.bookings.find({
            'project_id': resale_request['project_id'],
            'tenant_id': resale_request['tenant_id']
        }, {"_id": 0, "customer_id": 1}).to_list(length=1000)
        
        for booking in bookings:
            interested_user_ids.add(booking['customer_id'])
        
        # Users with leads for this project
        leads = await db.leads.find({
            'project_id': resale_request['project_id'],
            'tenant_id': resale_request['tenant_id']
        }, {"_id": 0, "customer_id": 1}).to_list(length=1000)
        
        for lead in leads:
            if lead.get('customer_id'):
                interested_user_ids.add(lead['customer_id'])
        
        # Remove the requester from interested users
        interested_user_ids.discard(resale_request['customer_id'])
        
        # Send notification to all interested users
        if interested_user_ids:
            await send_notification_to_multiple_users(
                db=db,
                user_ids=list(interested_user_ids),
                tenant_id=resale_request['tenant_id'],
                title=f"🏠 Property Available for Resale - {resale_request['project_name']}",
                message=f"A property is now available for resale in {resale_request['project_name']}. {resale_request.get('plot_number', 'Property')} - Expected Price: ₹{resale_request.get('expected_price', 'Contact for price')}",
                notification_type='info',
                priority='normal',
                action_url=f'/resale/available/{request_id}',
                action_label='View Details',
                metadata={
                    'resale_request_id': request_id,
                    'project_id': resale_request['project_id'],
                    'expected_price': resale_request.get('expected_price')
                }
            )
    
    return {
        "success": True,
        "message": f"Resale request {review_data.status}",
        "status": review_data.status,
        "notified_users": len(interested_user_ids) if review_data.status == 'approved' else 0
    }

@router.get("/available")
async def get_available_resales(request: Request, project_id: Optional[str] = None):
    """Get all approved resale listings (publicly available for logged-in users)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Build query
    query = {
        'tenant_id': user['tenant_id'],
        'status': 'approved'
    }
    
    if project_id:
        query['project_id'] = project_id
    
    # Get available resales
    resales = await db.resale_requests.find(query, {"_id": 0}) \
        .sort('reviewed_at', -1) \
        .to_list(length=100)
    
    return {
        "success": True,
        "resales": resales,
        "total": len(resales)
    }

@router.get("/available/{request_id}")
async def get_resale_details(request_id: str, request: Request):
    """Get details of an available resale listing"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    resale = await db.resale_requests.find_one({
        'id': request_id,
        'tenant_id': user['tenant_id'],
        'status': 'approved'
    }, {"_id": 0})
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale listing not found")
    
    return resale
