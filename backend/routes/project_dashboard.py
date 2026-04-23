from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/project-dashboard", tags=["Project Dashboard"])

def get_db(request: Request):
    return request.app.mongodb

async def get_current_user_from_request(request: Request):
    """Extract user from JWT token"""
    from middleware.auth import decode_jwt
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(' ')[1]
    try:
        payload = decode_jwt(token)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_project_manager(request: Request):
    """Middleware to check if user is project manager"""
    user = await get_current_user_from_request(request)
    db = get_db(request)
    
    # Get user details
    user_doc = await db.users.find_one({'id': user['user_id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role
    role = await db.roles.find_one({'id': user_doc['role_id']}, {"_id": 0})
    if not role or role['slug'] not in ['project_manager', 'tenant_admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Access denied. Project Manager role required.")
    
    return {**user, 'role_slug': role['slug'], 'assigned_projects': user_doc.get('assigned_projects', [])}

@router.get("/overview")
async def get_project_dashboard(
    request: Request,
    user: dict = Depends(require_project_manager)
):
    """Get project-level dashboard overview for assigned projects only"""
    db = get_db(request)
    
    # For tenant_admin and super_admin, show all tenant projects
    # For project_manager, show only assigned projects
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if not assigned_projects:
            return {
                "success": True,
                "message": "No projects assigned",
                "overview": {
                    "total_projects": 0,
                    "total_properties": 0,
                    "total_leads": 0,
                    "total_bookings": 0,
                    "total_revenue": 0,
                    "pending_payments": 0
                },
                "projects": []
            }
        
        project_filter = {'id': {'$in': assigned_projects}, 'deleted_at': None}
    else:
        # Tenant admin sees all tenant projects
        project_filter = {'tenant_id': user['tenant_id'], 'deleted_at': None}
    
    # Get projects
    projects = await db.projects.find(project_filter, {"_id": 0}).to_list(length=1000)
    project_ids = [p['id'] for p in projects]
    
    # Get properties count
    properties_count = await db.properties.count_documents({
        'project_id': {'$in': project_ids},
        'deleted_at': None
    })
    
    # Get leads count
    leads_count = await db.leads.count_documents({
        'project_id': {'$in': project_ids},
        'deleted_at': None
    })
    
    # Get bookings count
    bookings_count = await db.bookings.count_documents({
        'project_id': {'$in': project_ids},
        'deleted_at': None
    })
    
    # Calculate total revenue from bookings
    bookings = await db.bookings.find(
        {'project_id': {'$in': project_ids}, 'deleted_at': None},
        {"_id": 0, 'booking_amount': 1}
    ).to_list(length=10000)
    total_revenue = sum(b.get('booking_amount', 0) for b in bookings)
    
    # Get pending payments
    payments = await db.payments.find(
        {
            'project_id': {'$in': project_ids},
            'status': 'pending',
            'deleted_at': None
        },
        {"_id": 0, 'amount': 1}
    ).to_list(length=10000)
    pending_payments = sum(p.get('amount', 0) for p in payments)
    
    # Enrich projects with stats
    for project in projects:
        # Properties
        project['total_properties'] = await db.properties.count_documents({
            'project_id': project['id'],
            'deleted_at': None
        })
        project['available_properties'] = await db.properties.count_documents({
            'project_id': project['id'],
            'status': 'available',
            'deleted_at': None
        })
        
        # Leads
        project['total_leads'] = await db.leads.count_documents({
            'project_id': project['id'],
            'deleted_at': None
        })
        
        # Bookings
        project['total_bookings'] = await db.bookings.count_documents({
            'project_id': project['id'],
            'deleted_at': None
        })
        
        # Revenue
        project_bookings = await db.bookings.find(
            {'project_id': project['id'], 'deleted_at': None},
            {"_id": 0, 'booking_amount': 1}
        ).to_list(length=10000)
        project['total_revenue'] = sum(b.get('booking_amount', 0) for b in project_bookings)
    
    return {
        "success": True,
        "overview": {
            "total_projects": len(projects),
            "total_properties": properties_count,
            "total_leads": leads_count,
            "total_bookings": bookings_count,
            "total_revenue": total_revenue,
            "pending_payments": pending_payments
        },
        "projects": projects,
        "user_role": user['role_slug'],
        "assigned_projects": user.get('assigned_projects', [])
    }

@router.get("/leads")
async def get_project_leads(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_project_manager)
):
    """Get leads for assigned projects only"""
    db = get_db(request)
    
    # Build filter
    lead_filter = {'deleted_at': None}
    
    # Filter by project access
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if project_id:
            if project_id not in assigned_projects:
                raise HTTPException(status_code=403, detail="Access denied to this project")
            lead_filter['project_id'] = project_id
        else:
            lead_filter['project_id'] = {'$in': assigned_projects}
    else:
        # Tenant admin
        lead_filter['tenant_id'] = user['tenant_id']
        if project_id:
            lead_filter['project_id'] = project_id
    
    if status:
        lead_filter['status'] = status
    
    leads = await db.leads.find(lead_filter, {"_id": 0}).sort('created_at', -1).to_list(length=1000)
    
    # Enrich with project names
    for lead in leads:
        if lead.get('project_id'):
            project = await db.projects.find_one({'id': lead['project_id']}, {"_id": 0, 'name': 1})
            lead['project_name'] = project.get('name') if project else None
    
    return {
        "success": True,
        "leads": leads,
        "total": len(leads)
    }

@router.get("/bookings")
async def get_project_bookings(
    request: Request,
    project_id: Optional[str] = None,
    user: dict = Depends(require_project_manager)
):
    """Get bookings for assigned projects only"""
    db = get_db(request)
    
    # Build filter
    booking_filter = {'deleted_at': None}
    
    # Filter by project access
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if project_id:
            if project_id not in assigned_projects:
                raise HTTPException(status_code=403, detail="Access denied to this project")
            booking_filter['project_id'] = project_id
        else:
            booking_filter['project_id'] = {'$in': assigned_projects}
    else:
        booking_filter['tenant_id'] = user['tenant_id']
        if project_id:
            booking_filter['project_id'] = project_id
    
    bookings = await db.bookings.find(booking_filter, {"_id": 0}).sort('created_at', -1).to_list(length=1000)
    
    # Enrich with project and property names
    for booking in bookings:
        if booking.get('project_id'):
            project = await db.projects.find_one({'id': booking['project_id']}, {"_id": 0, 'name': 1})
            booking['project_name'] = project.get('name') if project else None
        
        if booking.get('property_id'):
            prop = await db.properties.find_one({'id': booking['property_id']}, {"_id": 0, 'plot_number': 1})
            booking['property_name'] = prop.get('plot_number') if prop else None
    
    return {
        "success": True,
        "bookings": bookings,
        "total": len(bookings)
    }

@router.get("/properties")
async def get_project_properties(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_project_manager)
):
    """Get properties for assigned projects only"""
    db = get_db(request)
    
    # Build filter
    property_filter = {'deleted_at': None}
    
    # Filter by project access
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if project_id:
            if project_id not in assigned_projects:
                raise HTTPException(status_code=403, detail="Access denied to this project")
            property_filter['project_id'] = project_id
        else:
            property_filter['project_id'] = {'$in': assigned_projects}
    else:
        property_filter['tenant_id'] = user['tenant_id']
        if project_id:
            property_filter['project_id'] = project_id
    
    if status:
        property_filter['status'] = status
    
    properties = await db.properties.find(property_filter, {"_id": 0}).sort('plot_number', 1).to_list(length=10000)
    
    # Enrich with project names
    for prop in properties:
        if prop.get('project_id'):
            project = await db.projects.find_one({'id': prop['project_id']}, {"_id": 0, 'name': 1})
            prop['project_name'] = project.get('name') if project else None
    
    return {
        "success": True,
        "properties": properties,
        "total": len(properties)
    }

@router.get("/resale-requests")
async def get_project_resale_requests(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_project_manager)
):
    """Get resale requests for assigned projects only"""
    db = get_db(request)
    
    # Build filter
    resale_filter = {'deleted_at': None}
    
    # Get properties in assigned projects first
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if project_id:
            if project_id not in assigned_projects:
                raise HTTPException(status_code=403, detail="Access denied to this project")
            properties = await db.properties.find(
                {'project_id': project_id, 'deleted_at': None},
                {"_id": 0, 'id': 1}
            ).to_list(length=10000)
        else:
            properties = await db.properties.find(
                {'project_id': {'$in': assigned_projects}, 'deleted_at': None},
                {"_id": 0, 'id': 1}
            ).to_list(length=10000)
        
        property_ids = [p['id'] for p in properties]
        resale_filter['property_id'] = {'$in': property_ids}
    else:
        resale_filter['tenant_id'] = user['tenant_id']
        if project_id:
            properties = await db.properties.find(
                {'project_id': project_id, 'deleted_at': None},
                {"_id": 0, 'id': 1}
            ).to_list(length=10000)
            property_ids = [p['id'] for p in properties]
            resale_filter['property_id'] = {'$in': property_ids}
    
    if status:
        resale_filter['status'] = status
    
    resale_requests = await db.resale_requests.find(resale_filter, {"_id": 0}).sort('created_at', -1).to_list(length=1000)
    
    # Enrich with property and project names
    for request_doc in resale_requests:
        if request_doc.get('property_id'):
            prop = await db.properties.find_one(
                {'id': request_doc['property_id']},
                {"_id": 0, 'plot_number': 1, 'project_id': 1}
            )
            if prop:
                request_doc['property_name'] = prop.get('plot_number')
                if prop.get('project_id'):
                    project = await db.projects.find_one(
                        {'id': prop['project_id']},
                        {"_id": 0, 'name': 1}
                    )
                    request_doc['project_name'] = project.get('name') if project else None
    
    return {
        "success": True,
        "resale_requests": resale_requests,
        "total": len(resale_requests)
    }

@router.get("/analytics")
async def get_project_analytics(
    request: Request,
    project_id: Optional[str] = None,
    user: dict = Depends(require_project_manager)
):
    """Get analytics for assigned projects"""
    db = get_db(request)
    
    # Determine project IDs
    if user['role_slug'] == 'project_manager':
        assigned_projects = user.get('assigned_projects', [])
        if project_id:
            if project_id not in assigned_projects:
                raise HTTPException(status_code=403, detail="Access denied to this project")
            project_ids = [project_id]
        else:
            project_ids = assigned_projects
    else:
        if project_id:
            project_ids = [project_id]
        else:
            projects = await db.projects.find(
                {'tenant_id': user['tenant_id'], 'deleted_at': None},
                {"_id": 0, 'id': 1}
            ).to_list(length=1000)
            project_ids = [p['id'] for p in projects]
    
    # Leads by status
    leads_by_status = {}
    leads = await db.leads.find(
        {'project_id': {'$in': project_ids}, 'deleted_at': None},
        {"_id": 0, 'status': 1}
    ).to_list(length=10000)
    for lead in leads:
        status = lead.get('status', 'unknown')
        leads_by_status[status] = leads_by_status.get(status, 0) + 1
    
    # Properties by status
    properties_by_status = {}
    properties = await db.properties.find(
        {'project_id': {'$in': project_ids}, 'deleted_at': None},
        {"_id": 0, 'status': 1}
    ).to_list(length=10000)
    for prop in properties:
        status = prop.get('status', 'unknown')
        properties_by_status[status] = properties_by_status.get(status, 0) + 1
    
    # Revenue by project
    revenue_by_project = []
    for pid in project_ids:
        project = await db.projects.find_one({'id': pid}, {"_id": 0, 'name': 1})
        bookings = await db.bookings.find(
            {'project_id': pid, 'deleted_at': None},
            {"_id": 0, 'booking_amount': 1}
        ).to_list(length=10000)
        total_revenue = sum(b.get('booking_amount', 0) for b in bookings)
        revenue_by_project.append({
            'project_id': pid,
            'project_name': project.get('name') if project else 'Unknown',
            'revenue': total_revenue,
            'bookings': len(bookings)
        })
    
    return {
        "success": True,
        "analytics": {
            "leads_by_status": leads_by_status,
            "properties_by_status": properties_by_status,
            "revenue_by_project": revenue_by_project
        }
    }
