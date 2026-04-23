from fastapi import APIRouter, HTTPException, Request
from models.category import MasterCategory, MasterCategoryCreate
from utils.helpers import serialize_doc, deserialize_doc
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/categories", tags=["categories"])

def get_db(request: Request):
    return request.app.state.db

@router.get("/", response_model=List[MasterCategory])
async def get_categories(
    request: Request,
    type: Optional[str] = None,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None
):
    """Get categories with filters (cascading: system -> tenant -> project)"""
    db = get_db(request)
    
    query = {'deleted_at': None, 'is_active': True}
    
    if type:
        query['type'] = type
    
    # Cascading logic: get system + tenant + project categories
    if project_id:
        query['$or'] = [
            {'project_id': project_id},
            {'tenant_id': tenant_id, 'project_id': None},
            {'is_system': True}
        ]
    elif tenant_id:
        query['$or'] = [
            {'tenant_id': tenant_id, 'project_id': None},
            {'is_system': True}
        ]
    else:
        query['$or'] = [{'is_system': True}]
    
    categories = await db.master_categories.find(query, {"_id": 0}).sort('sort_order', 1).to_list(500)
    
    for cat in categories:
        deserialize_doc(cat)
    
    return [MasterCategory(**c) for c in categories]

@router.post("/", response_model=MasterCategory)
async def create_category(category_create: MasterCategoryCreate, request: Request):
    """Create a new category"""
    db = get_db(request)
    
    # Check if slug already exists at this level
    existing = await db.master_categories.find_one({
        'slug': category_create.slug,
        'type': category_create.type,
        'tenant_id': category_create.tenant_id,
        'project_id': category_create.project_id,
        'deleted_at': None
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")
    
    category = MasterCategory(**category_create.model_dump())
    category_doc = serialize_doc(category.model_dump())
    
    await db.master_categories.insert_one(category_doc)
    
    return category

@router.put("/{category_id}", response_model=MasterCategory)
async def update_category(category_id: str, category_update: MasterCategoryCreate, request: Request):
    """Update category (cannot update system categories)"""
    db = get_db(request)
    
    # Check if category exists
    existing = await db.master_categories.find_one({'id': category_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if it's a system category
    if existing.get('is_system'):
        raise HTTPException(status_code=403, detail="Cannot modify system categories")
    
    # Update category
    update_data = category_update.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.master_categories.update_one(
        {'id': category_id},
        {'$set': update_data}
    )
    
    # Get updated category
    category_doc = await db.master_categories.find_one({'id': category_id}, {"_id": 0})
    category_doc = deserialize_doc(category_doc)
    
    return MasterCategory(**category_doc)

@router.delete("/{category_id}")
async def delete_category(category_id: str, request: Request):
    """Soft delete category (cannot delete system categories)"""
    db = get_db(request)
    
    # Check if category exists
    existing = await db.master_categories.find_one({'id': category_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if it's a system category
    if existing.get('is_system'):
        raise HTTPException(status_code=403, detail="Cannot delete system categories")
    
    # Soft delete
    await db.master_categories.update_one(
        {'id': category_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Category deleted successfully"}


# ==================== PROJECT CATEGORIES DUMP ====================

@router.post("/dump-to-project/{project_id}")
async def dump_categories_to_project(
    project_id: str,
    request: Request,
    category_ids: Optional[List[str]] = None
):
    """Dump master categories to project level"""
    db = get_db(request)
    
    try:
        # Get project
        project = await db.projects.find_one({"id": project_id, "deleted_at": None}, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # If no specific categories provided, dump all
        if not category_ids:
            master_categories = await db.master_categories.find(
                {"is_system": True, "is_active": True, "deleted_at": None},
                {"_id": 0}
            ).to_list(1000)
            category_ids = [cat["id"] for cat in master_categories]
        
        dumped_count = 0
        
        for cat_id in category_ids:
            # Get master category
            master_cat = await db.master_categories.find_one(
                {"id": cat_id, "deleted_at": None},
                {"_id": 0}
            )
            
            if not master_cat:
                continue
            
            # Check if already exists
            existing = await db.project_categories.find_one({
                "project_id": project_id,
                "master_category_id": cat_id
            })
            
            if existing:
                continue  # Skip if already dumped
            
            # Create project category
            from uuid import uuid4
            project_cat = {
                "id": str(uuid4()),
                "project_id": project_id,
                "tenant_id": project["tenant_id"],
                "master_category_id": cat_id,
                "name": master_cat["name"],
                "slug": master_cat["slug"],
                "type": master_cat.get("type"),
                "is_system": False,
                "is_active": True,
                "level": master_cat.get("level", 0),
                "sort_order": master_cat.get("sort_order", 0),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_from": "master_dump"
            }
            
            await db.project_categories.insert_one(project_cat)
            dumped_count += 1
            
            # Dump subcategories
            master_subcats = await db.master_subcategories.find(
                {"master_category_id": cat_id, "is_active": True},
                {"_id": 0}
            ).to_list(1000)
            
            for subcat in master_subcats:
                project_subcat = {
                    "id": str(uuid4()),
                    "project_id": project_id,
                    "tenant_id": project["tenant_id"],
                    "project_category_id": project_cat["id"],
                    "master_subcategory_id": subcat["id"],
                    "name": subcat["name"],
                    "slug": subcat["slug"],
                    "is_active": True,
                    "sort_order": subcat.get("sort_order", 0),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_from": "master_dump"
                }
                await db.project_subcategories.insert_one(project_subcat)
        
        return {
            "success": True,
            "message": f"Dumped {dumped_count} categories to project",
            "project_id": project_id,
            "dumped_count": dumped_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error dumping categories: {str(e)}")


@router.get("/project/{project_id}")
async def get_project_categories(project_id: str, request: Request):
    """Get all categories for a project"""
    db = get_db(request)
    
    try:
        categories = await db.project_categories.find(
            {"project_id": project_id, "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(1000)
        
        # Get subcategories for each
        for cat in categories:
            subcats = await db.project_subcategories.find(
                {"project_category_id": cat["id"], "is_active": True},
                {"_id": 0}
            ).sort("sort_order", 1).to_list(1000)
            cat["subcategories"] = subcats
        
        return {
            "success": True,
            "project_id": project_id,
            "categories": categories,
            "count": len(categories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project categories: {str(e)}")


# ==================== CUSTOM FIELDS ====================

@router.post("/custom-fields")
async def create_custom_field(request: Request, field_data: dict):
    """Create a custom field"""
    db = get_db(request)
    
    try:
        from uuid import uuid4
        
        field = {
            "id": str(uuid4()),
            "tenant_id": field_data.get("tenant_id"),
            "project_id": field_data.get("project_id"),
            "field_name": field_data["field_name"],
            "field_slug": field_data["field_slug"],
            "field_type": field_data["field_type"],
            "applies_to": field_data.get("applies_to", "property"),
            "is_required": field_data.get("is_required", False),
            "options": field_data.get("options", []),
            "default_value": field_data.get("default_value"),
            "placeholder": field_data.get("placeholder"),
            "help_text": field_data.get("help_text"),
            "display_order": field_data.get("display_order", 0),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.custom_fields.insert_one(field)
        
        return {
            "success": True,
            "message": "Custom field created",
            "field": field
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating custom field: {str(e)}")


@router.get("/custom-fields/project/{project_id}")
async def get_project_custom_fields(
    project_id: str,
    request: Request,
    applies_to: Optional[str] = None
):
    """Get custom fields for a project"""
    db = get_db(request)
    
    try:
        query = {"project_id": project_id, "is_active": True}
        if applies_to:
            query["applies_to"] = applies_to
        
        fields = await db.custom_fields.find(query, {"_id": 0}).sort("display_order", 1).to_list(1000)
        
        return {
            "success": True,
            "project_id": project_id,
            "fields": fields,
            "count": len(fields)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching custom fields: {str(e)}")

