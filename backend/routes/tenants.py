from fastapi import APIRouter, HTTPException, Request, Depends
from models.tenant import Tenant, TenantCreate, Package, PackageCreate
from utils.helpers import serialize_doc, deserialize_doc
from middleware.auth import get_current_user
from typing import List
from datetime import datetime, timezone

router = APIRouter(prefix="/tenants", tags=["tenants"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/", response_model=Tenant)
async def create_tenant(tenant_create: TenantCreate, request: Request):
    """Create a new tenant"""
    # TODO: Add role check - only SuperAdmin can create tenants
    db = get_db(request)
    
    # Check if tenant with email already exists
    existing = await db.tenants.find_one({'email': tenant_create.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Tenant with this email already exists")
    
    # Create tenant
    tenant = Tenant(**tenant_create.model_dump())
    tenant_doc = serialize_doc(tenant.model_dump())
    
    await db.tenants.insert_one(tenant_doc)
    
    return tenant

@router.get("/", response_model=List[Tenant])
async def get_tenants(request: Request, skip: int = 0, limit: int = 100):
    """Get all tenants"""
    # TODO: Add role check - only SuperAdmin
    db = get_db(request)
    
    tenants = await db.tenants.find(
        {'deleted_at': None},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    for tenant in tenants:
        deserialize_doc(tenant)
    
    return [Tenant(**t) for t in tenants]

# My Tenant routes - MUST be before /{tenant_id} to avoid conflict
@router.get("/my-tenant")
async def get_my_tenant(request: Request, current_user: dict = Depends(get_current_user)):
    """Get current user's tenant with settings"""
    db = get_db(request)
    
    tenant_id = current_user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with this user")
    
    tenant = await db.tenants.find_one({'id': tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    deserialize_doc(tenant)
    return tenant


@router.put("/my-tenant/settings")
async def update_my_tenant_settings(request: Request, current_user: dict = Depends(get_current_user)):
    """Update current user's tenant settings"""
    db = get_db(request)
    
    tenant_id = current_user.get('tenant_id')
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with this user")
    
    body = await request.json()
    
    # Separate company info from settings
    company_fields = ['company_name', 'company_email', 'company_phone', 'company_address', 
                      'company_logo', 'company_website', 'gstin', 'pan']
    
    update_data = {
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Update company info at root level
    for field in company_fields:
        if field in body:
            # Map to actual field names
            field_map = {
                'company_name': 'company_name',
                'company_email': 'email',
                'company_phone': 'phone',
                'company_address': 'address',
                'company_logo': 'logo_url',
                'company_website': 'website',
                'gstin': 'gstin',
                'pan': 'pan'
            }
            actual_field = field_map.get(field, field)
            update_data[actual_field] = body[field]
    
    # Store other settings in a 'settings' subdocument
    settings_fields = {k: v for k, v in body.items() if k not in company_fields}
    if settings_fields:
        update_data['settings'] = settings_fields
    
    result = await db.tenants.update_one(
        {'id': tenant_id},
        {'$set': update_data}
    )
    
    # Check if tenant exists (matched_count) - modified_count can be 0 if no actual changes
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {"success": True, "message": "Settings updated successfully"}


@router.get("/{tenant_id}", response_model=Tenant)
async def get_tenant(tenant_id: str, request: Request):
    """Get tenant by ID"""
    db = get_db(request)
    
    tenant_doc = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not tenant_doc:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant_doc = deserialize_doc(tenant_doc)
    return Tenant(**tenant_doc)

@router.put("/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, tenant_update: TenantCreate, request: Request):
    """Update tenant"""
    db = get_db(request)
    
    # Check if tenant exists
    existing = await db.tenants.find_one({'id': tenant_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update tenant
    update_data = tenant_update.model_dump()
    update_data['updated_at'] = serialize_doc({'updated_at': datetime.now(timezone.utc)})['updated_at']
    
    from datetime import datetime, timezone
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one(
        {'id': tenant_id},
        {'$set': update_data}
    )
    
    # Get updated tenant
    tenant_doc = await db.tenants.find_one({'id': tenant_id}, {"_id": 0})
    tenant_doc = deserialize_doc(tenant_doc)
    
    return Tenant(**tenant_doc)

@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, request: Request):
    """Soft delete tenant"""
    db = get_db(request)
    
    from datetime import datetime, timezone
    await db.tenants.update_one(
        {'id': tenant_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Tenant deleted successfully"}

# Package routes
@router.post("/packages/", response_model=Package)
async def create_package(package_create: PackageCreate, request: Request):
    """Create a new package"""
    db = get_db(request)
    
    package = Package(**package_create.model_dump())
    package_doc = serialize_doc(package.model_dump())
    
    await db.packages.insert_one(package_doc)
    
    return package

@router.get("/packages/", response_model=List[Package])
async def get_packages(request: Request):
    """Get all packages"""
    db = get_db(request)
    
    packages = await db.packages.find({'is_active': True}, {"_id": 0}).to_list(100)
    
    for pkg in packages:
        deserialize_doc(pkg)
    
    return [Package(**p) for p in packages]
