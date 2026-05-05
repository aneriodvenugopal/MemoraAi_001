from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Depends
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyBlock, PropertyBook
from utils.helpers import serialize_doc, deserialize_doc
from services.audit_log_service import AuditLogService
from services import rag_autosync
from middleware.auth import get_current_user
from middleware.usage_limits import check_property_limit
from typing import List, Optional
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/properties", tags=["properties"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/", response_model=Property)
async def create_property(
    property_create: PropertyCreate, 
    request: Request,
    background: BackgroundTasks,
    user: dict = Depends(check_property_limit)  # Enforce property limit
):
    """Create a new property"""
    db = get_db(request)
    
    # Check if project exists
    project = await db.projects.find_one({'id': property_create.project_id, 'deleted_at': None}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if property number already exists in project
    existing = await db.properties.find_one({
        'project_id': property_create.project_id,
        'property_number': property_create.property_number,
        'deleted_at': None
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Property number already exists in this project")
    
    # Calculate price per sqft
    property_data = property_create.model_dump()
    if property_data['area'] > 0:
        property_data['price_per_sqft'] = property_data['price'] / property_data['area']
    
    # Create property
    property_obj = Property(**property_data)
    property_doc = serialize_doc(property_obj.model_dump())
    
    await db.properties.insert_one(property_doc)
    
    # Update project stats
    await update_project_stats(db, property_create.project_id)
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Property",
        auditable_id=property_obj.id,
        event="created",
        module="property",
        user_id=user.get('user_id'),
        new_values=property_doc,
        tenant_id=property_create.tenant_id,
        project_id=property_create.project_id,
        ip_address=request.client.host
    )
    
    # 🔄 Auto-sync to Gemini File Search (non-blocking)
    background.add_task(
        rag_autosync.sync_property, db, property_create.tenant_id, property_obj.id
    )
    return property_obj

@router.get("/", response_model=List[Property])
async def get_properties(
    request: Request,
    project_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    status_id: Optional[str] = None,
    property_type_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all properties with filters"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {'deleted_at': None}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    if project_id:
        query['project_id'] = project_id
    
    if status_id:
        query['status_id'] = status_id
    
    if property_type_id:
        query['property_type_id'] = property_type_id
    
    properties = await db.properties.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Skip deserialization since Pydantic model expects string datetime fields
    # for prop in properties:
    #     deserialize_doc(prop)
    
    return [Property(**p) for p in properties]

@router.get("/{property_id}", response_model=Property)
async def get_property(property_id: str, request: Request):
    """Get property by ID"""
    db = get_db(request)
    
    property_doc = await db.properties.find_one({'id': property_id, 'deleted_at': None}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Skip deserialization since Pydantic model expects string datetime fields
    # property_doc = deserialize_doc(property_doc)
    return Property(**property_doc)

@router.put("/{property_id}", response_model=Property)
async def update_property(property_id: str, property_update: PropertyUpdate, request: Request, background: BackgroundTasks):
    """Update property"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get existing property
    existing = await db.properties.find_one({'id': property_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Update property
    update_data = property_update.model_dump(exclude_none=True)
    
    # Recalculate price per sqft if area or price changed
    if 'area' in update_data or 'price' in update_data:
        area = update_data.get('area', existing.get('area'))
        price = update_data.get('price', existing.get('price'))
        if area and area > 0:
            update_data['price_per_sqft'] = price / area
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.properties.update_one(
        {'id': property_id},
        {'$set': update_data}
    )
    
    # Update project stats if status changed
    if 'status_id' in update_data:
        await update_project_stats(db, existing['project_id'])
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Property",
        auditable_id=property_id,
        event="updated",
        module="property",
        user_id=user.get('user_id'),
        old_values=existing,
        new_values=update_data,
        tenant_id=existing.get('tenant_id'),
        project_id=existing.get('project_id'),
        ip_address=request.client.host
    )
    
    # Get updated property
    property_doc = await db.properties.find_one({'id': property_id}, {"_id": 0})
    # Skip deserialization since Pydantic model expects string datetime fields
    # property_doc = deserialize_doc(property_doc)
    
    # 🔄 Auto-sync to Gemini File Search (non-blocking)
    background.add_task(
        rag_autosync.sync_property, db, existing.get('tenant_id'), property_id
    )
    return Property(**property_doc)

@router.post("/block")
async def block_property(property_block: PropertyBlock, request: Request):
    """Block a property for 24 hours"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get property
    property_doc = await db.properties.find_one({'id': property_block.property_id, 'deleted_at': None}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if already blocked or sold
    status = await db.master_categories.find_one({'id': property_doc['status_id']}, {"_id": 0})
    if status and status['slug'] in ['blocked', 'booked', 'sold']:
        raise HTTPException(status_code=400, detail=f"Property is already {status['slug']}")
    
    # Get 'blocked' status
    blocked_status = await db.master_categories.find_one({'slug': 'blocked', 'type': 'property_status'}, {"_id": 0})
    if not blocked_status:
        raise HTTPException(status_code=500, detail="Blocked status not found")
    
    # Block property
    blocked_until = datetime.now(timezone.utc) + timedelta(hours=property_block.duration_hours)
    
    await db.properties.update_one(
        {'id': property_block.property_id},
        {'$set': {
            'status_id': blocked_status['id'],
            'blocked_by': property_block.user_id,
            'blocked_at': datetime.now(timezone.utc).isoformat(),
            'blocked_until': blocked_until.isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update project stats
    await update_project_stats(db, property_doc['project_id'])
    
    return {
        "message": "Property blocked successfully",
        "blocked_until": blocked_until
    }

@router.post("/book")
async def book_property(property_book: PropertyBook, request: Request):
    """Book a property (customer purchase)"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get property
    property_doc = await db.properties.find_one({'id': property_book.property_id, 'deleted_at': None}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if available or blocked
    status = await db.master_categories.find_one({'id': property_doc['status_id']}, {"_id": 0})
    if status and status['slug'] not in ['available', 'blocked']:
        raise HTTPException(status_code=400, detail=f"Property is already {status['slug']}")
    
    # Get 'booked' status
    booked_status = await db.master_categories.find_one({'slug': 'booked', 'type': 'property_status'}, {"_id": 0})
    if not booked_status:
        raise HTTPException(status_code=500, detail="Booked status not found")
    
    # Book property
    await db.properties.update_one(
        {'id': property_book.property_id},
        {'$set': {
            'status_id': booked_status['id'],
            'booked_by': property_book.customer_id,
            'booked_at': datetime.now(timezone.utc).isoformat(),
            'blocked_by': None,  # Clear block
            'blocked_at': None,
            'blocked_until': None,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update project stats
    await update_project_stats(db, property_doc['project_id'])
    
    return {"message": "Property booked successfully"}

@router.delete("/{property_id}")
async def delete_property(property_id: str, request: Request, background: BackgroundTasks):
    """Soft delete property"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get existing property
    existing = await db.properties.find_one({'id': property_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Soft delete
    await db.properties.update_one(
        {'id': property_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update project stats
    await update_project_stats(db, existing['project_id'])
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Property",
        auditable_id=property_id,
        event="deleted",
        module="property",
        user_id=user.get('user_id'),
        tenant_id=existing.get('tenant_id'),
        project_id=existing.get('project_id'),
        ip_address=request.client.host
    )
    
    # 🔄 Remove from Gemini File Search (non-blocking)
    background.add_task(
        rag_autosync.delete_doc, db, existing.get('tenant_id'),
        rag_autosync.doc_id_property(property_id),
    )
    return {"message": "Property deleted successfully"}

# Helper function to update project stats
async def update_project_stats(db, project_id: str):
    """Update project statistics based on properties"""
    # Count properties by status
    pipeline = [
        {'$match': {'project_id': project_id, 'deleted_at': None}},
        {'$lookup': {
            'from': 'master_categories',
            'localField': 'status_id',
            'foreignField': 'id',
            'as': 'status_info'
        }},
        {'$unwind': '$status_info'},
        {'$group': {
            '_id': '$status_info.slug',
            'count': {'$sum': 1}
        }}
    ]
    
    status_counts = await db.properties.aggregate(pipeline).to_list(100)
    status_dict = {item['_id']: item['count'] for item in status_counts}
    
    # Total properties
    total = await db.properties.count_documents({
        'project_id': project_id,
        'deleted_at': None
    })
    
    # Update project
    await db.projects.update_one(
        {'id': project_id},
        {'$set': {
            'total_units': total,
            'available_units': status_dict.get('available', 0),
            'sold_units': status_dict.get('sold', 0),
            'blocked_units': status_dict.get('blocked', 0),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
