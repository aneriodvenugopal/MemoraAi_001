from fastapi import APIRouter, HTTPException, Request, Depends
from models.package import Package, PackageCreate, PackageUpdate
from models.tenant import Tenant, TenantCreate, TenantUpdate, TenantCredits
from datetime import datetime, timedelta, timezone
from utils.helpers import serialize_doc, deserialize_doc
from typing import Optional, List
from middleware.auth import get_current_user

router = APIRouter(prefix="/saas-admin", tags=["saas-admin"])

def get_db(request: Request):
    return request.app.state.db

async def require_saas_admin(request: Request):
    """Verify user is SaaS admin (phone: 9948303060) or has super_admin role"""
    user_payload = await get_current_user(request)
    
    # Get user from database
    db = get_db(request)
    user_doc = await db.users.find_one({'id': user_payload['user_id']}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is SaaS admin (9948303060) or has super_admin role
    is_saas_admin_phone = user_doc.get('phone') == '9948303060'
    is_super_admin = user_doc.get('role') == 'super_admin'
    
    if not (is_saas_admin_phone or is_super_admin):
        raise HTTPException(status_code=403, detail="Access denied. SaaS admin only.")
    
    return user_payload


# ============ PACKAGE MANAGEMENT ============

@router.get("/packages")
async def get_packages(
    request: Request,
    is_active: Optional[bool] = None,
    _: dict = Depends(require_saas_admin)
):
    """Get all packages"""
    db = get_db(request)
    
    query = {}
    if is_active is not None:
        query['is_active'] = is_active
    
    packages = await db.packages.find(query, {"_id": 0}).sort('display_order', 1).to_list(length=100)
    
    return {
        "success": True,
        "packages": packages,
        "total": len(packages)
    }


@router.get("/packages/{package_id}")
async def get_package(
    package_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Get single package"""
    db = get_db(request)
    
    package = await db.packages.find_one({'id': package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Get tenant count using this package
    tenant_count = await db.tenants.count_documents({'package_id': package_id, 'deleted_at': None})
    
    return {
        "success": True,
        "package": package,
        "tenant_count": tenant_count
    }


@router.post("/packages")
async def create_package(
    package_data: PackageCreate,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Create new package"""
    db = get_db(request)
    
    # Create package
    package = Package(**package_data.model_dump())
    package_doc = serialize_doc(package.model_dump())
    
    await db.packages.insert_one(package_doc)
    
    return {
        "success": True,
        "message": "Package created successfully",
        "package": package.model_dump()
    }


@router.put("/packages/{package_id}")
async def update_package(
    package_id: str,
    package_data: PackageUpdate,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Update existing package"""
    db = get_db(request)
    
    # Check if package exists
    existing_package = await db.packages.find_one({'id': package_id}, {"_id": 0})
    if not existing_package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Update package
    update_data = {k: v for k, v in package_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.packages.update_one(
            {'id': package_id},
            {'$set': update_data}
        )
    
    # Get updated package
    updated_package = await db.packages.find_one({'id': package_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Package updated successfully",
        "package": updated_package
    }


@router.delete("/packages/{package_id}")
async def delete_package(
    package_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Delete package (only if no tenants using it)"""
    db = get_db(request)
    
    # Check if any tenants are using this package
    tenant_count = await db.tenants.count_documents({'package_id': package_id, 'deleted_at': None})
    if tenant_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete package. {tenant_count} tenant(s) are using this package."
        )
    
    # Delete package
    result = await db.packages.delete_one({'id': package_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    
    return {
        "success": True,
        "message": "Package deleted successfully"
    }


# ============ TENANT MANAGEMENT ============

@router.get("/tenants")
async def get_tenants(
    request: Request,
    status: Optional[str] = None,
    package_id: Optional[str] = None,
    timeline: Optional[str] = None,  # previous, present, future
    limit: int = 20,
    skip: int = 0,
    _: dict = Depends(require_saas_admin)
):
    """Get all tenants with filtering"""
    db = get_db(request)
    
    query = {'deleted_at': None}
    
    if status:
        query['status'] = status
    
    if package_id:
        query['package_id'] = package_id
    
    # Timeline filtering
    if timeline:
        now = datetime.now(timezone.utc)
        if timeline == 'previous':
            # Subscription ended in the past
            query['subscription_end'] = {'$lt': now.isoformat()}
        elif timeline == 'present':
            # Currently active subscription
            query['subscription_start'] = {'$lte': now.isoformat()}
            query['subscription_end'] = {'$gte': now.isoformat()}
        elif timeline == 'future':
            # Subscription starts in future
            query['subscription_start'] = {'$gt': now.isoformat()}
    
    # Get tenants
    tenants = await db.tenants.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    total = await db.tenants.count_documents(query)
    
    # Enrich with package info
    for tenant in tenants:
        if tenant.get('package_id'):
            package = await db.packages.find_one({'id': tenant['package_id']}, {"_id": 0, 'name': 1, 'monthly_price': 1})
            tenant['package'] = package
        
        # Get project count
        tenant['project_count'] = await db.projects.count_documents({'tenant_id': tenant['id'], 'deleted_at': None})
        
        # Get user count
        tenant['user_count'] = await db.users.count_documents({'tenant_id': tenant['id']})
    
    return {
        "success": True,
        "tenants": tenants,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant(
    tenant_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Get single tenant with detailed info"""
    db = get_db(request)
    
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get package info
    if tenant.get('package_id'):
        package = await db.packages.find_one({'id': tenant['package_id']}, {"_id": 0})
        tenant['package'] = package
    
    # Get projects
    projects = await db.projects.find({'tenant_id': tenant_id, 'deleted_at': None}, {"_id": 0}).to_list(length=100)
    tenant['projects'] = projects
    tenant['project_count'] = len(projects)
    
    # Get users
    users = await db.users.find({'tenant_id': tenant_id}, {"_id": 0, 'id': 1, 'name': 1, 'email': 1, 'phone': 1, 'role_id': 1}).to_list(length=100)
    tenant['users'] = users
    tenant['user_count'] = len(users)
    
    # Get properties count
    property_count = 0
    for project in projects:
        count = await db.properties.count_documents({'project_id': project['id'], 'deleted_at': None})
        property_count += count
    tenant['property_count'] = property_count
    
    return {
        "success": True,
        "tenant": tenant
    }


@router.post("/tenants")
async def create_tenant(
    tenant_data: TenantCreate,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Create new tenant with auto user creation"""
    db = get_db(request)
    
    # If no package specified, assign default "Starter" package
    if not tenant_data.package_id:
        default_package = await db.packages.find_one({'name': 'Starter'}, {"_id": 0})
        if default_package:
            tenant_data.package_id = default_package['id']
        else:
            # Get any active package as fallback
            fallback = await db.packages.find_one({'is_active': True}, {"_id": 0})
            if fallback:
                tenant_data.package_id = fallback['id']
    
    # Validate package exists
    package = await db.packages.find_one({'id': tenant_data.package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check if tenant with email already exists
    existing = await db.tenants.find_one({'email': tenant_data.email, 'deleted_at': None}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Tenant with this email already exists")
    
    # Check if phone number already exists
    if hasattr(tenant_data, 'phone') and tenant_data.phone:
        existing_phone = await db.users.find_one({'phone': tenant_data.phone}, {"_id": 0})
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create tenant with subscription dates and credits
    tenant = Tenant(**tenant_data.model_dump())
    tenant.subscription_start = datetime.now(timezone.utc)
    
    # Calculate subscription end based on billing cycle
    if tenant_data.billing_cycle == 'yearly':
        tenant.subscription_end = tenant.subscription_start + timedelta(days=365)
        tenant.next_billing_date = tenant.subscription_end
    else:  # monthly
        tenant.subscription_end = tenant.subscription_start + timedelta(days=30)
        tenant.next_billing_date = tenant.subscription_end
    
    # Initialize credits from package
    tenant.credits = TenantCredits(
        sms_remaining=package['features']['sms_credits'],
        email_remaining=package['features']['email_credits'],
        whatsapp_remaining=package['features']['whatsapp_credits'],
        sms_used=0,
        email_used=0,
        whatsapp_used=0
    )
    
    tenant_doc = serialize_doc(tenant.model_dump())
    await db.tenants.insert_one(tenant_doc)
    
    # AUTO-CREATE ADMIN USER FOR THIS TENANT
    import uuid
    import bcrypt
    
    # Get tenant_admin role_id
    tenant_admin_role = await db.roles.find_one({'slug': 'tenant_admin'}, {"_id": 0})
    if not tenant_admin_role:
        raise HTTPException(status_code=500, detail="Tenant admin role not found in system")
    
    user_data = {
        'id': str(uuid.uuid4()),
        'name': tenant_data.company_name + ' Admin',
        'phone': tenant_data.phone,
        'email': tenant_data.email,
        'password': bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),  # Default password
        'role': 'tenant_admin',  # Keep for backward compatibility
        'role_id': tenant_admin_role['id'],  # Required for auth
        'tenant_id': tenant.id,
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.users.insert_one(user_data)
    
    return {
        "success": True,
        "message": "Tenant and admin user created successfully",
        "tenant": tenant.model_dump(),
        "user": {
            "phone": user_data['phone'],
            "default_password": "admin123",
            "message": "Please change password after first login"
        }
    }


@router.put("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Update tenant"""
    db = get_db(request)
    
    # Check tenant exists
    existing_tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not existing_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update tenant
    update_data = {k: v for k, v in tenant_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.tenants.update_one(
            {'id': tenant_id},
            {'$set': update_data}
        )
    
    # Get updated tenant
    updated_tenant = await db.tenants.find_one({'id': tenant_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Tenant updated successfully",
        "tenant": updated_tenant
    }


@router.post("/tenants/{tenant_id}/toggle-status")
async def toggle_tenant_status(
    tenant_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Toggle tenant active/inactive status"""
    db = get_db(request)
    
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    new_status = 'inactive' if tenant['status'] == 'active' else 'active'
    new_is_active = new_status == 'active'
    
    await db.tenants.update_one(
        {'id': tenant_id},
        {'$set': {
            'status': new_status,
            'is_active': new_is_active,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Tenant status changed to {new_status}",
        "status": new_status
    }


@router.post("/tenants/{tenant_id}/add-credits")
async def add_credits(
    tenant_id: str,
    credits: dict,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Add communication credits to tenant
    
    credits format: {"sms": 1000, "email": 2000, "whatsapp": 500}
    """
    db = get_db(request)
    
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update credits
    update_data = {}
    if 'sms' in credits:
        current_sms = tenant.get('credits', {}).get('sms_remaining', 0)
        update_data['credits.sms_remaining'] = current_sms + credits['sms']
    
    if 'email' in credits:
        current_email = tenant.get('credits', {}).get('email_remaining', 0)
        update_data['credits.email_remaining'] = current_email + credits['email']
    
    if 'whatsapp' in credits:
        current_whatsapp = tenant.get('credits', {}).get('whatsapp_remaining', 0)
        update_data['credits.whatsapp_remaining'] = current_whatsapp + credits['whatsapp']
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one(
        {'id': tenant_id},
        {'$set': update_data}
    )
    
    return {
        "success": True,
        "message": "Credits added successfully",
        "credits_added": credits
    }


# ============ DASHBOARD ANALYTICS ============

@router.get("/dashboard")
async def get_dashboard(
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Get SaaS admin dashboard overview"""
    db = get_db(request)
    
    # Total tenants
    total_tenants = await db.tenants.count_documents({'deleted_at': None})
    active_tenants = await db.tenants.count_documents({'status': 'active', 'deleted_at': None})
    inactive_tenants = await db.tenants.count_documents({'status': 'inactive', 'deleted_at': None})
    
    # Timeline breakdown
    now = datetime.now(timezone.utc).isoformat()
    previous_tenants = await db.tenants.count_documents({
        'subscription_end': {'$lt': now},
        'deleted_at': None
    })
    present_tenants = await db.tenants.count_documents({
        'subscription_start': {'$lte': now},
        'subscription_end': {'$gte': now},
        'deleted_at': None
    })
    future_tenants = await db.tenants.count_documents({
        'subscription_start': {'$gt': now},
        'deleted_at': None
    })
    
    # Revenue calculations (mock for now)
    tenants = await db.tenants.find({'deleted_at': None}, {"_id": 0}).to_list(length=1000)
    total_revenue = 0
    monthly_recurring_revenue = 0
    
    for tenant in tenants:
        if tenant.get('package_id'):
            package = await db.packages.find_one({'id': tenant['package_id']}, {"_id": 0})
            if package:
                if tenant.get('billing_cycle') == 'yearly':
                    total_revenue += package.get('yearly_price', 0)
                    monthly_recurring_revenue += package.get('monthly_price', 0)
                else:
                    total_revenue += package.get('monthly_price', 0)
                    monthly_recurring_revenue += package.get('monthly_price', 0)
    
    # Package distribution
    packages = await db.packages.find({}, {"_id": 0}).to_list(length=100)
    package_distribution = []
    for package in packages:
        count = await db.tenants.count_documents({'package_id': package['id'], 'deleted_at': None})
        package_distribution.append({
            "package_name": package['name'],
            "tenant_count": count,
            "revenue": count * package.get('monthly_price', 0)
        })
    
    # Recent tenants
    recent_tenants = await db.tenants.find(
        {'deleted_at': None},
        {"_id": 0, 'id': 1, 'name': 1, 'company_name': 1, 'email': 1, 'status': 1, 'created_at': 1}
    ).sort('created_at', -1).limit(5).to_list(length=5)
    
    return {
        "success": True,
        "overview": {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "inactive_tenants": inactive_tenants,
            "total_revenue": total_revenue,
            "monthly_recurring_revenue": monthly_recurring_revenue
        },
        "timeline": {
            "previous": previous_tenants,
            "present": present_tenants,
            "future": future_tenants
        },
        "package_distribution": package_distribution,
        "recent_tenants": recent_tenants
    }


# ============ HIERARCHY VIEW ============

@router.get("/tenants/{tenant_id}/hierarchy")
async def get_tenant_hierarchy(
    tenant_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Get complete tenant hierarchy: Tenant → Projects → Properties → Staff"""
    db = get_db(request)
    
    # Get tenant
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get projects with properties and staff
    projects = await db.projects.find({'tenant_id': tenant_id, 'deleted_at': None}, {"_id": 0}).to_list(length=100)
    
    for project in projects:
        # Get properties
        properties = await db.properties.find({'project_id': project['id'], 'deleted_at': None}, {"_id": 0}).to_list(length=1000)
        project['properties'] = properties
        project['property_count'] = len(properties)
        
        # Get staff (users assigned to this project)
        # This assumes there's a way to link users to projects - adjust as needed
        staff = await db.users.find({
            'tenant_id': tenant_id,
            # Add project-specific filter if available in your schema
        }, {"_id": 0, 'id': 1, 'name': 1, 'email': 1, 'phone': 1, 'role_id': 1}).to_list(length=100)
        
        # Enrich staff with role info
        for staff_member in staff:
            if staff_member.get('role_id'):
                role = await db.roles.find_one({'id': staff_member['role_id']}, {"_id": 0})
                staff_member['role'] = role
        
        project['staff'] = staff
        project['staff_count'] = len(staff)
    
    return {
        "success": True,
        "tenant": {
            "id": tenant['id'],
            "name": tenant['name'],
            "company_name": tenant['company_name'],
            "status": tenant['status']
        },
        "projects": projects,
        "total_projects": len(projects),
        "total_properties": sum(p['property_count'] for p in projects),
        "total_staff": sum(p['staff_count'] for p in projects)
    }



# ============ MODULE PERMISSIONS ============

# List of all available modules (matching Dashboard UI)
AVAILABLE_MODULES = [
    # Main Modules
    {"id": "dashboard", "name": "Dashboard", "description": "Main dashboard overview", "category": "core", "essential": True},
    {"id": "projects", "name": "Projects", "description": "Manage your real estate projects", "category": "core", "essential": True},
    {"id": "leads", "name": "Leads", "description": "Manage and track your leads", "category": "sales", "essential": True},
    {"id": "bookings_sales", "name": "Bookings & Sales", "description": "Track bookings and payments", "category": "sales", "essential": True},
    {"id": "reports_analytics", "name": "Reports & Analytics", "description": "View insights and reports", "category": "core", "essential": False},
    
    # Finance
    {"id": "financial_management", "name": "Financial Management", "description": "Track payments and expenses", "category": "finance", "essential": False},
    {"id": "payments_dashboard", "name": "Payments Dashboard", "description": "Track collections, overdue & targets", "category": "finance", "essential": False},
    {"id": "commission_analytics", "name": "Commission Analytics", "description": "Track earnings, performance & payouts", "category": "finance", "essential": False},
    {"id": "stripe_payments", "name": "Stripe Payments", "description": "Online payments & transaction history", "category": "finance", "essential": False},
    
    # Tools & Automation
    {"id": "ai_agents", "name": "AI Agents", "description": "AI-powered assistants for your business", "category": "tools", "essential": False},
    {"id": "sms_automation", "name": "SMS Automation", "description": "Automated SMS for leads & bookings", "category": "communication", "essential": False},
    {"id": "email_management", "name": "Email Management", "description": "Send and track transactional emails", "category": "communication", "essential": False},
    {"id": "billing_subscription", "name": "Billing & Subscription", "description": "Manage your plan and view invoices", "category": "core", "essential": True},
    {"id": "block_locations", "name": "Block Locations", "description": "Configure GPS locations for property blocks", "category": "tools", "essential": False},
    
    # Settings & Management
    {"id": "users_staff", "name": "Users & Staff", "description": "Manage team members and roles", "category": "settings", "essential": True},
    {"id": "role_assignments", "name": "Role Assignments", "description": "Manage multi-role assignments & permissions", "category": "settings", "essential": False},
    {"id": "bank_accounts", "name": "Bank Accounts", "description": "Project-wise banking & accounts", "category": "finance", "essential": False},
    {"id": "vendors_management", "name": "Vendors Management", "description": "Manage vendors & payment transfers", "category": "finance", "essential": False},
    {"id": "marketing_agents", "name": "Marketing Agents", "description": "Agents, commissions & payouts", "category": "sales", "essential": False},
    {"id": "customer_portal", "name": "Customer Portal", "description": "View customer experience", "category": "sales", "essential": False},
    
    # Category Management
    {"id": "master_categories", "name": "Master Categories", "description": "System-wide property categories", "category": "categories", "essential": False},
    {"id": "master_subcategories", "name": "Master Subcategories", "description": "System-wide property subcategories", "category": "categories", "essential": False},
    {"id": "tenant_categories", "name": "Tenant Categories", "description": "Your custom property categories", "category": "categories", "essential": False},
    {"id": "tenant_subcategories", "name": "Tenant Subcategories", "description": "Your custom property subcategories", "category": "categories", "essential": False},
]

# Default enabled modules for new tenants (essential modules for Indian real estate)
DEFAULT_ENABLED_MODULES = [
    "dashboard",           # Always needed
    "projects",            # Core - manage properties
    "leads",               # Core - track leads
    "bookings_sales",      # Core - track sales
    "billing_subscription", # Core - manage subscription
    "users_staff",         # Core - manage team
]

@router.get("/modules")
async def get_available_modules(_: dict = Depends(require_saas_admin)):
    """Get list of all available modules"""
    return {
        "success": True,
        "modules": AVAILABLE_MODULES
    }

@router.get("/tenants/{tenant_id}/modules")
async def get_tenant_modules(
    tenant_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Get enabled modules for a tenant"""
    db = get_db(request)
    
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get enabled modules (default to essential modules if not set)
    enabled_modules = tenant.get('enabled_modules', DEFAULT_ENABLED_MODULES)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "tenant_name": tenant.get('company_name', tenant.get('name')),
        "enabled_modules": enabled_modules,
        "all_modules": AVAILABLE_MODULES
    }

@router.put("/tenants/{tenant_id}/modules")
async def update_tenant_modules(
    tenant_id: str,
    request: Request,
    _: dict = Depends(require_saas_admin)
):
    """Update enabled modules for a tenant"""
    db = get_db(request)
    
    # Parse request body
    body = await request.json()
    enabled_modules = body.get('enabled_modules', [])
    
    # Validate module IDs
    valid_module_ids = [m['id'] for m in AVAILABLE_MODULES]
    for module_id in enabled_modules:
        if module_id not in valid_module_ids:
            raise HTTPException(status_code=400, detail=f"Invalid module ID: {module_id}")
    
    # Update tenant
    result = await db.tenants.update_one(
        {'id': tenant_id, 'deleted_at': None},
        {'$set': {
            'enabled_modules': enabled_modules,
            'updated_at': datetime.now(timezone.utc)
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found or no changes made")
    
    return {
        "success": True,
        "message": "Modules updated successfully",
        "enabled_modules": enabled_modules
    }


# ============ TENANT MODULE CHECK (For Frontend) ============

@router.get("/my-modules")
async def get_my_modules(request: Request):
    """Get enabled modules for current user's tenant (public endpoint for tenants)"""
    from middleware.auth import get_current_user
    
    try:
        user_payload = await get_current_user(request)
    except Exception:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = get_db(request)
    
    # Get user
    user = await db.users.find_one({'id': user_payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant_id = user.get('tenant_id')
    if not tenant_id:
        # Return all modules for users without tenant (maybe super admin)
        return {
            "success": True,
            "enabled_modules": [m['id'] for m in AVAILABLE_MODULES],
            "is_admin": True
        }
    
    # Get tenant
    tenant = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get enabled modules (default to essential modules if not set)
    enabled_modules = tenant.get('enabled_modules', DEFAULT_ENABLED_MODULES)
    
    return {
        "success": True,
        "tenant_id": tenant_id,
        "enabled_modules": enabled_modules,
        "is_admin": False
    }
