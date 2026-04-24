"""MemoraAI Business Categories & Services Routes"""
from fastapi import APIRouter, HTTPException, Request
from middleware.auth import get_current_user
from models.memoraai import (
    BusinessCategory, BusinessService, BusinessServiceCreate, BusinessServiceUpdate,
)
from services import category_registry
from utils.helpers import serialize_doc
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai", tags=["memoraai-categories"])


def get_db(request: Request):
    return request.app.state.db


# ─── Category Management ───────────────────────────────────────

@router.get("/categories/available")
async def list_available_categories(request: Request):
    """List all supported business categories (from DB registry) with their default services."""
    db = get_db(request)
    cats = await category_registry.get_all(db, active_only=True)
    result = []
    for c in cats:
        services = c.get("default_services") or []
        result.append({
            "slug": c["slug"],
            "name": c["name"],
            "icon": c.get("icon", ""),
            "description": c.get("description", ""),
            "default_services_count": len(services),
            "default_services": services,
        })
    return {"categories": result}


@router.get("/categories/my")
async def get_my_categories(request: Request):
    """Get categories assigned to current tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant assigned")

    cats = await db.business_categories.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(50)
    return {"categories": cats}


@router.post("/categories/select")
async def select_category(request: Request):
    """Select a business category for tenant + auto-populate default services"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant assigned")

    body = await request.json()
    category_slug = body.get("category_slug")
    if not await category_registry.is_supported(db, category_slug):
        raise HTTPException(status_code=400, detail=f"Unsupported category: {category_slug}")

    cfg = await category_registry.get(db, category_slug)

    # Check if already selected
    existing = await db.business_categories.find_one(
        {"tenant_id": tenant_id, "category_slug": category_slug}, {"_id": 0}
    )
    if existing:
        return {"message": "Category already selected", "category": existing}

    # Count existing categories to set primary
    count = await db.business_categories.count_documents({"tenant_id": tenant_id})

    cat = BusinessCategory(
        tenant_id=tenant_id,
        category_slug=category_slug,
        category_name=cfg["name"],
        icon=cfg["icon"],
        is_primary=count == 0,
    )
    cat_doc = serialize_doc(cat.model_dump())
    await db.business_categories.insert_one(cat_doc)
    # Remove MongoDB _id before returning
    cat_doc.pop("_id", None)

    # Auto-populate default services
    services_created = []
    default_services = cfg.get("default_services") or []
    for idx, svc in enumerate(default_services):
        service = BusinessService(
            tenant_id=tenant_id,
            category_slug=category_slug,
            name=svc["name"],
            description=svc.get("description", ""),
            duration_mins=svc.get("duration_mins", 0),
            price=svc.get("price", 0),
            sort_order=idx,
        )
        svc_doc = serialize_doc(service.model_dump())
        await db.business_services.insert_one(svc_doc)
        # Remove MongoDB _id before adding to list
        svc_doc.pop("_id", None)
        services_created.append(svc_doc)

    # Update tenant record with business category
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "business_category": category_slug,
            "business_category_name": cfg["name"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {
        "message": f"Category '{cfg['name']}' selected with {len(services_created)} default services",
        "category": cat_doc,
        "services": services_created,
    }


@router.post("/categories/set-primary")
async def set_primary_category(request: Request):
    """Set primary business category for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()
    category_slug = body.get("category_slug")

    # Reset all to non-primary
    await db.business_categories.update_many(
        {"tenant_id": tenant_id},
        {"$set": {"is_primary": False}}
    )
    # Set selected as primary
    result = await db.business_categories.update_one(
        {"tenant_id": tenant_id, "category_slug": category_slug},
        {"$set": {"is_primary": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found for this tenant")

    primary_cat = await category_registry.get(db, category_slug)
    primary_name = primary_cat.get("name", category_slug) if primary_cat else category_slug
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "business_category": category_slug,
            "business_category_name": primary_name,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"message": f"Primary category set to {category_slug}"}


@router.delete("/categories/{category_slug}")
async def remove_category(category_slug: str, request: Request):
    """Remove a category from tenant (also deactivates services)"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.business_categories.delete_one(
        {"tenant_id": tenant_id, "category_slug": category_slug}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")

    await db.business_services.update_many(
        {"tenant_id": tenant_id, "category_slug": category_slug},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Category {category_slug} removed"}


# ─── Services CRUD ──────────────────────────────────────────────

@router.get("/services")
async def list_services(request: Request, category: str = None, active_only: bool = True):
    """List services for tenant, optionally filtered by category"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id, "deleted_at": None}
    if category:
        query["category_slug"] = category
    if active_only:
        query["is_active"] = True

    services = await db.business_services.find(query, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return {"services": services, "count": len(services)}


@router.post("/services")
async def create_service(data: BusinessServiceCreate, request: Request):
    """Create a new service"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    service = BusinessService(
        tenant_id=tenant_id,
        **data.model_dump()
    )
    svc_doc = serialize_doc(service.model_dump())
    await db.business_services.insert_one(svc_doc)
    del svc_doc["_id"]
    return {"message": "Service created", "service": svc_doc}


@router.put("/services/{service_id}")
async def update_service(service_id: str, data: BusinessServiceUpdate, request: Request):
    """Update a service"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.business_services.update_one(
        {"id": service_id, "tenant_id": tenant_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")

    updated = await db.business_services.find_one(
        {"id": service_id}, {"_id": 0}
    )
    return {"message": "Service updated", "service": updated}


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, request: Request):
    """Soft-delete a service"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    result = await db.business_services.update_one(
        {"id": service_id, "tenant_id": tenant_id},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat(), "is_active": False}}
    )
    if result.deleted_count == 0 and result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}


@router.post("/services/{service_id}/toggle")
async def toggle_service(service_id: str, request: Request):
    """Toggle service active/inactive"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    svc = await db.business_services.find_one(
        {"id": service_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    new_status = not svc.get("is_active", True)
    await db.business_services.update_one(
        {"id": service_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Service {'activated' if new_status else 'deactivated'}", "is_active": new_status}
