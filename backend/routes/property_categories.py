from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from models.property_category import (
    MasterPropertyCategory, MasterPropertySubcategory,
    TenantPropertyCategory, TenantPropertySubcategory,
    PropertyCategoryCreate, TenantPropertyCategoryCreate
)
from middleware.auth import get_current_user

router = APIRouter(prefix="/property-categories", tags=["Property Categories"])

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

# ============= MASTER CATEGORIES (System Level) =============

@router.get("/categories/master", response_model=dict)
async def get_master_categories(
    current_user: dict = Depends(get_current_user)
):
    """Get all master property categories"""
    
    categories = await db.master_property_categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    return {
        "success": True,
        "count": len(categories),
        "categories": categories
    }

@router.get("/categories/master/{category_id}/subcategories", response_model=dict)
async def get_master_subcategories(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all subcategories for a master category"""
    
    subcategories = await db.master_property_subcategories.find(
        {"master_category_id": category_id, "is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    return {
        "success": True,
        "category_id": category_id,
        "count": len(subcategories),
        "subcategories": subcategories
    }

@router.get("/categories/master/all-with-subcategories", response_model=dict)
async def get_all_master_categories_with_subcategories(
    current_user: dict = Depends(get_current_user)
):
    """Get all master categories with their subcategories"""
    
    categories = await db.master_property_categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    result = []
    for category in categories:
        subcategories = await db.master_property_subcategories.find(
            {"master_category_id": category["id"], "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(length=None)
        
        category["subcategories"] = subcategories
        category["subcategories_count"] = len(subcategories)
        result.append(category)
    
    return {
        "success": True,
        "count": len(result),
        "categories": result
    }

# ============= MASTER CATEGORY CRUD (Super Admin) =============

@router.post("/categories/master", response_model=dict)
async def create_master_category(
    category: PropertyCategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a master property category (Super Admin only)"""
    
    # Check if already exists
    existing = await db.master_property_categories.find_one({
        "slug": category.slug,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")
    
    # Get max sort order
    max_sort = await db.master_property_categories.find_one(
        sort=[("sort_order", -1)]
    )
    next_sort = (max_sort.get("sort_order", 0) + 1) if max_sort else 1
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "icon": category.icon,
        "sort_order": next_sort,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.master_property_categories.insert_one(category_doc)
    category_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "Master category created successfully",
        "category": category_doc
    }

@router.post("/subcategories/master", response_model=dict)
async def create_master_subcategory(
    subcategory: PropertyCategoryCreate,
    master_category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Create a master property subcategory (Super Admin only)"""
    
    # Verify master category exists
    master = await db.master_property_categories.find_one({
        "id": master_category_id,
        "is_active": True
    })
    
    if not master:
        raise HTTPException(status_code=404, detail="Master category not found")
    
    # Check if already exists
    existing = await db.master_property_subcategories.find_one({
        "master_category_id": master_category_id,
        "slug": subcategory.slug,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Subcategory with this slug already exists")
    
    # Get max sort order for this category
    max_sort = await db.master_property_subcategories.find_one(
        {"master_category_id": master_category_id},
        sort=[("sort_order", -1)]
    )
    next_sort = (max_sort.get("sort_order", 0) + 1) if max_sort else 1
    
    subcategory_doc = {
        "id": str(uuid.uuid4()),
        "master_category_id": master_category_id,
        "name": subcategory.name,
        "slug": subcategory.slug,
        "description": subcategory.description,
        "icon": subcategory.icon,
        "sort_order": next_sort,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.master_property_subcategories.insert_one(subcategory_doc)
    subcategory_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "Master subcategory created successfully",
        "subcategory": subcategory_doc
    }

@router.delete("/categories/master/{category_id}", response_model=dict)
async def delete_master_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a master category"""
    
    result = await db.master_property_categories.update_one(
        {"id": category_id},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Also deactivate subcategories
    await db.master_property_subcategories.update_many(
        {"master_category_id": category_id},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Master category deleted successfully"
    }

@router.delete("/subcategories/master/{subcategory_id}", response_model=dict)
async def delete_master_subcategory(
    subcategory_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a master subcategory"""
    
    result = await db.master_property_subcategories.update_one(
        {"id": subcategory_id},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    return {
        "success": True,
        "message": "Master subcategory deleted successfully"
    }

# ============= TENANT CATEGORIES =============

@router.get("/categories/tenant", response_model=dict)
async def get_tenant_categories(
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all tenant-specific property categories"""
    
    query = {"deleted_at": None}
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    categories = await db.tenant_property_categories.find(
        query,
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    return {
        "success": True,
        "count": len(categories),
        "categories": categories
    }

@router.post("/categories/tenant", response_model=dict)
async def create_tenant_category(
    category: TenantPropertyCategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create tenant-specific property category"""
    
    # Check if already exists
    existing = await db.tenant_property_categories.find_one({
        "tenant_id": category.tenant_id,
        "slug": category.slug,
        "deleted_at": None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Category with this slug already exists for this tenant")
    
    # Get max sort order
    max_sort = await db.tenant_property_categories.find_one(
        {"tenant_id": category.tenant_id},
        sort=[("sort_order", -1)]
    )
    next_sort = (max_sort.get("sort_order", 0) + 1) if max_sort else 1
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": category.tenant_id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "icon": category.icon,
        "sort_order": next_sort,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    
    await db.tenant_property_categories.insert_one(category_doc)
    category_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "Tenant category created successfully",
        "category": category_doc
    }

@router.delete("/categories/tenant/{category_id}", response_model=dict)
async def delete_tenant_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a tenant category"""
    
    result = await db.tenant_property_categories.update_one(
        {"id": category_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Also delete subcategories
    await db.tenant_property_subcategories.update_many(
        {"tenant_category_id": category_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Tenant category deleted successfully"
    }

# ============= TENANT SUBCATEGORIES =============

@router.get("/subcategories/tenant", response_model=dict)
async def get_tenant_subcategories(
    tenant_id: Optional[str] = None,
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all tenant-specific property subcategories"""
    
    query = {"deleted_at": None}
    if tenant_id:
        query["tenant_id"] = tenant_id
    if category_id:
        query["tenant_category_id"] = category_id
    
    subcategories = await db.tenant_property_subcategories.find(
        query,
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    return {
        "success": True,
        "count": len(subcategories),
        "subcategories": subcategories
    }

@router.post("/subcategories/tenant", response_model=dict)
async def create_tenant_subcategory(
    subcategory: TenantPropertyCategoryCreate,
    tenant_category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Create tenant-specific property subcategory"""
    
    # Verify tenant category exists
    parent = await db.tenant_property_categories.find_one({
        "id": tenant_category_id,
        "deleted_at": None
    })
    
    if not parent:
        raise HTTPException(status_code=404, detail="Tenant category not found")
    
    # Check if already exists
    existing = await db.tenant_property_subcategories.find_one({
        "tenant_category_id": tenant_category_id,
        "slug": subcategory.slug,
        "deleted_at": None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Subcategory with this slug already exists")
    
    # Get max sort order
    max_sort = await db.tenant_property_subcategories.find_one(
        {"tenant_category_id": tenant_category_id},
        sort=[("sort_order", -1)]
    )
    next_sort = (max_sort.get("sort_order", 0) + 1) if max_sort else 1
    
    subcategory_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": subcategory.tenant_id,
        "tenant_category_id": tenant_category_id,
        "name": subcategory.name,
        "slug": subcategory.slug,
        "description": subcategory.description,
        "icon": subcategory.icon,
        "sort_order": next_sort,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    
    await db.tenant_property_subcategories.insert_one(subcategory_doc)
    subcategory_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "Tenant subcategory created successfully",
        "subcategory": subcategory_doc
    }

@router.delete("/subcategories/tenant/{subcategory_id}", response_model=dict)
async def delete_tenant_subcategory(
    subcategory_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a tenant subcategory"""
    
    result = await db.tenant_property_subcategories.update_one(
        {"id": subcategory_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    return {
        "success": True,
        "message": "Tenant subcategory deleted successfully"
    }

# ============= COMBINED VIEW =============

@router.get("/all", response_model=dict)
async def get_all_categories_for_tenant(
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all categories available for a tenant.
    Includes both master categories and tenant-specific categories.
    """
    
    # Get master categories with subcategories
    master_categories = await db.master_property_categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    for cat in master_categories:
        subs = await db.master_property_subcategories.find(
            {"master_category_id": cat["id"], "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(length=None)
        cat["subcategories"] = subs
        cat["source"] = "master"
    
    # Get tenant categories with subcategories
    tenant_categories = await db.tenant_property_categories.find(
        {"tenant_id": tenant_id, "deleted_at": None},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(length=None)
    
    for cat in tenant_categories:
        subs = await db.tenant_property_subcategories.find(
            {"tenant_category_id": cat["id"], "deleted_at": None},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(length=None)
        cat["subcategories"] = subs
        cat["source"] = "tenant"
    
    return {
        "success": True,
        "master_categories": master_categories,
        "tenant_categories": tenant_categories,
        "total_master": len(master_categories),
        "total_tenant": len(tenant_categories)
    }
