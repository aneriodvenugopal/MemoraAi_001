"""
Public Landing Pages - Tenant & Project Detail Pages
These are public pages that can be accessed without authentication
Can be linked with custom domains
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/public", tags=["public-pages"])

def get_db(request: Request):
    return request.app.state.db


class DemoRequest(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = None
    message: Optional[str] = None


class ContactInquiry(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    tenant_id: Optional[str] = None
    project_id: Optional[str] = None


@router.get("/tenant/{tenant_id}")
async def get_tenant_landing_page(tenant_id: str, request: Request):
    """
    Public Tenant Landing Page
    Shows: Company info, projects, statistics
    Can be accessed via custom domain or memoraai.in/public/tenant/{id}
    """
    db = get_db(request)
    
    # Get tenant info
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get all projects for this tenant
    projects = await db.projects.find(
        {'tenant_id': tenant_id, 'deleted_at': None},
        {"_id": 0}
    ).to_list(length=100)
    
    # Group projects by category
    projects_by_category = {}
    total_properties = 0
    
    for project in projects:
        # Get property count for each project
        property_count = await db.properties.count_documents({
            'project_id': project['id'],
            'deleted_at': None
        })
        project['property_count'] = property_count
        total_properties += property_count
        
        # Get available properties count
        available_count = await db.properties.count_documents({
            'project_id': project['id'],
            'status': 'available',
            'deleted_at': None
        })
        project['available_count'] = available_count
        
        # Group by category
        category = project.get('category', 'Other')
        if category not in projects_by_category:
            projects_by_category[category] = []
        projects_by_category[category].append(project)
    
    # Get tenant statistics
    total_bookings = await db.bookings.count_documents({'tenant_id': tenant_id})
    total_leads = await db.leads.count_documents({'tenant_id': tenant_id})
    
    # Calculate years of experience (from created_at)
    years_in_business = 0
    if tenant.get('created_at'):
        try:
            created_date = datetime.fromisoformat(tenant['created_at'].replace('Z', '+00:00'))
            years_in_business = (datetime.now() - created_date).days // 365
        except:
            years_in_business = 0
    
    return {
        "success": True,
        "tenant": tenant,
        "projects": projects,
        "projects_by_category": projects_by_category,
        "statistics": {
            "total_projects": len(projects),
            "total_properties": total_properties,
            "total_bookings": total_bookings,
            "total_leads": total_leads,
            "years_in_business": max(years_in_business, 1)
        }
    }


@router.get("/project/{project_id}")
async def get_project_landing_page(project_id: str, request: Request):
    """
    Public Project Landing Page
    Shows: Project details, layout, properties, amenities
    Can be accessed via custom domain or memoraai.in/public/project/{id}
    """
    db = get_db(request)
    
    # Get project info
    project = await db.projects.find_one({'id': project_id, 'deleted_at': None}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get tenant info
    tenant = await db.tenants.find_one({'id': project['tenant_id']}, {"_id": 0})
    
    # Get layout info
    layout = await db.layouts.find_one({'project_id': project_id}, {"_id": 0})
    
    # Get all properties with details
    properties = await db.properties.find(
        {'project_id': project_id, 'deleted_at': None},
        {"_id": 0}
    ).to_list(length=1000)
    
    # Group properties by status
    properties_by_status = {
        'available': [],
        'booked': [],
        'reserved': [],
        'sold': []
    }
    
    for prop in properties:
        status = prop.get('status', 'available')
        if status in properties_by_status:
            properties_by_status[status].append(prop)
    
    # Calculate statistics
    stats = {
        'total_properties': len(properties),
        'available': len(properties_by_status['available']),
        'booked': len(properties_by_status['booked']),
        'reserved': len(properties_by_status['reserved']),
        'sold': len(properties_by_status['sold'])
    }
    
    # Get price range
    prices = [p.get('price', 0) for p in properties if p.get('price')]
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    
    return {
        "success": True,
        "project": project,
        "tenant": tenant,
        "layout": layout,
        "properties": properties,
        "properties_by_status": properties_by_status,
        "statistics": stats,
        "price_range": {
            "min": min_price,
            "max": max_price
        }
    }


@router.get("/tenant/by-domain/{domain}")
async def get_tenant_by_domain(domain: str, request: Request):
    """
    Get tenant by custom domain or subdomain
    Used for domain-based routing
    """
    db = get_db(request)
    
    # Try to find by custom domain
    tenant = await db.tenants.find_one({
        '$or': [
            {'custom_domain': domain},
            {'subdomain': domain}
        ],
        'deleted_at': None
    }, {"_id": 0})
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found for this domain")
    
    return {
        "success": True,
        "tenant_id": tenant['id'],
        "tenant": tenant
    }


@router.get("/project/by-domain/{domain}")
async def get_project_by_domain(domain: str, request: Request):
    """
    Get project by custom domain
    Used for domain-based routing
    """
    db = get_db(request)
    
    # Try to find project by custom domain or subdomain
    project = await db.projects.find_one({
        '$or': [
            {'custom_domain': domain},
            {'subdomain': domain}
        ],
        'deleted_at': None
    }, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for this domain")
    
    return {
        "success": True,
        "project_id": project['id'],
        "project": project
    }


@router.get("/tenants")
async def get_all_tenants(
    request: Request,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Get all active tenants for directory/discovery
    Used on marketing pages and tenants directory
    """
    db = get_db(request)
    
    # Build query
    query = {'deleted_at': None, 'status': 'active'}
    
    # Add search filter if provided
    if search:
        query['$or'] = [
            {'company_name': {'$regex': search, '$options': 'i'}},
            {'city': {'$regex': search, '$options': 'i'}},
            {'state': {'$regex': search, '$options': 'i'}}
        ]
    
    # Get tenants
    tenants = await db.tenants.find(
        query,
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with statistics for each tenant
    for tenant in tenants:
        # Get project count
        project_count = await db.projects.count_documents({
            'tenant_id': tenant['id'],
            'deleted_at': None
        })
        tenant['project_count'] = project_count
        
        # Get total properties count
        projects = await db.projects.find(
            {'tenant_id': tenant['id'], 'deleted_at': None},
            {"id": 1}
        ).to_list(length=100)
        
        project_ids = [p['id'] for p in projects]
        property_count = await db.properties.count_documents({
            'project_id': {'$in': project_ids},
            'deleted_at': None
        })
        tenant['property_count'] = property_count
        
        # Get bookings count
        booking_count = await db.bookings.count_documents({'tenant_id': tenant['id']})
        tenant['booking_count'] = booking_count
    
    # Get total count for pagination
    total = await db.tenants.count_documents(query)
    
    return {
        "success": True,
        "tenants": tenants,
        "total": total,
        "limit": limit,
        "skip": skip
    }



@router.get("/layouts")
async def get_all_public_layouts(
    request: Request,
    limit: int = 50,
    skip: int = 0
):
    """
    Get all public layouts for homepage display
    Shows layouts that are marked as templates or public
    """
    db = get_db(request)
    
    # Get layouts that are templates or have is_public=True
    query = {
        'deleted_at': None,
        '$or': [
            {'is_template': True},
            {'is_public': True}
        ]
    }
    
    # Get layouts with basic info
    layouts = await db.master_layouts.find(
        query,
        {
            "_id": 0,
            "id": 1,
            "layout_name": 1,
            "layout_type": 1,
            "svg_url": 1,
            "thumbnail_url": 1,
            "created_at": 1,
            "tenant_id": 1,
            "plots": 1
        }
    ).sort('created_at', -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with plot count and tenant info
    for layout in layouts:
        # Count plots
        layout['plot_count'] = len(layout.get('plots', []))
        
        # Get available plots count
        available_count = sum(1 for p in layout.get('plots', []) if p.get('status') == 'available')
        layout['available_plots'] = available_count
        
        # Get tenant name if exists
        if layout.get('tenant_id'):
            tenant = await db.tenants.find_one(
                {'id': layout['tenant_id']},
                {'company_name': 1, '_id': 0}
            )
            if tenant:
                layout['tenant_name'] = tenant.get('company_name')
        
        # Remove plots array to reduce payload size
        layout.pop('plots', None)
    
    # Get total count
    total = await db.master_layouts.count_documents(query)
    
    return {
        "success": True,
        "layouts": layouts,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/layouts/{layout_id}")
async def get_public_layout_by_id(
    layout_id: str,
    request: Request
):
    """
    Get a single public layout by ID for public viewing
    No authentication required
    """
    db = get_db(request)
    
    # Find layout
    layout = await db.master_layouts.find_one(
        {
            'id': layout_id,
            'deleted_at': None,
            '$or': [
                {'is_template': True},
                {'is_public': True}
            ]
        },
        {'_id': 0}
    )
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found or not public")
    
    # Get tenant/project info if exists
    project_data = None
    if layout.get('tenant_id'):
        tenant = await db.tenants.find_one(
            {'id': layout['tenant_id']},
            {'_id': 0, 'company_name': 1, 'website': 1, 'contact_email': 1}
        )
        if tenant:
            project_data = {
                'name': tenant.get('company_name'),
                'website': tenant.get('website'),
                'contact_email': tenant.get('contact_email')
            }
    
    return {
        "success": True,
        "layout": layout,
        "project": project_data
    }


# ==================== DEMO REQUESTS & CONTACT ====================

@router.post("/demo-request")
async def submit_demo_request(demo_data: DemoRequest, request: Request):
    """
    Submit a demo request from the SaaS landing page.
    Stores the request and can trigger email notifications.
    """
    db = get_db(request)
    
    # Create demo request record
    demo_request = {
        "id": str(uuid.uuid4()),
        "name": demo_data.name,
        "email": demo_data.email,
        "phone": demo_data.phone,
        "company": demo_data.company,
        "message": demo_data.message,
        "source": "saas_landing_page",
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.demo_requests.insert_one(demo_request)
    
    # TODO: Send email notification to sales team
    # await send_demo_request_notification(demo_request)
    
    return {
        "success": True,
        "message": "Demo request submitted successfully. Our team will contact you within 24 hours.",
        "request_id": demo_request["id"]
    }


@router.post("/contact-inquiry")
async def submit_contact_inquiry(inquiry: ContactInquiry, request: Request):
    """
    Submit a contact inquiry from tenant public pages or project pages.
    Can be associated with a specific tenant or project.
    """
    db = get_db(request)
    
    # Create inquiry record
    inquiry_record = {
        "id": str(uuid.uuid4()),
        "name": inquiry.name,
        "email": inquiry.email,
        "phone": inquiry.phone,
        "subject": inquiry.subject,
        "message": inquiry.message,
        "tenant_id": inquiry.tenant_id,
        "project_id": inquiry.project_id,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contact_inquiries.insert_one(inquiry_record)
    
    # If tenant_id is provided, also create a lead for that tenant
    if inquiry.tenant_id:
        lead = {
            "id": str(uuid.uuid4()),
            "tenant_id": inquiry.tenant_id,
            "name": inquiry.name,
            "email": inquiry.email,
            "phone": inquiry.phone or "",
            "source": "website_inquiry",
            "source_id": None,
            "notes": f"Subject: {inquiry.subject}\n\n{inquiry.message}",
            "status_id": None,
            "rating": 3,
            "is_converted": False,
            "project_id": inquiry.project_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.leads.insert_one(lead)
    
    return {
        "success": True,
        "message": "Thank you for your inquiry. We'll get back to you soon.",
        "inquiry_id": inquiry_record["id"]
    }


@router.get("/demo-requests")
async def get_demo_requests(
    request: Request,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """
    Get all demo requests (for admin dashboard).
    Requires authentication in production.
    """
    db = get_db(request)
    
    query = {}
    if status:
        query["status"] = status
    
    requests_list = await db.demo_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.demo_requests.count_documents(query)
    
    return {
        "success": True,
        "requests": requests_list,
        "total": total
    }


