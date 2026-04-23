"""
Certified Property Routes
Public endpoints for certified property pages - shareable, permanent digital identity
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
from middleware.auth import get_current_user

router = APIRouter(prefix="/certified", tags=["certified-property"])


def get_db(request: Request):
    return request.app.state.db


# ============ PUBLIC ENDPOINTS (No Auth Required) ============

@router.get("/property/{property_id}")
async def get_certified_property(property_id: str, request: Request):
    """
    Get certified property details for public viewing
    This is the main endpoint for the shareable certified property page
    """
    db = get_db(request)
    
    # Get property
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get project
    project = await db.projects.find_one(
        {"id": property_doc.get("project_id")},
        {"_id": 0}
    )
    
    # Get tenant (company info for branding)
    tenant = await db.tenants.find_one(
        {"id": property_doc.get("tenant_id")},
        {"_id": 0, "company_name": 1, "company_logo": 1, "contact_email": 1, 
         "contact_phone": 1, "website": 1, "address": 1, "city": 1, "state": 1}
    )
    
    # Get layout info if available
    layout = None
    if project:
        layout = await db.layouts.find_one(
            {"project_id": project.get("id")},
            {"_id": 0, "svg_url": 1, "layout_name": 1}
        )
    
    # Get block location if property has a block
    block_location = None
    if property_doc.get("block") and project:
        block_locations = project.get("block_locations", [])
        for bl in block_locations:
            if bl.get("block_name") == property_doc.get("block"):
                block_location = bl
                break
    
    # Determine location (property > block > project)
    location = {
        "latitude": None,
        "longitude": None,
        "google_address": None,
        "source": None
    }
    
    if property_doc.get("latitude") and property_doc.get("longitude"):
        location = {
            "latitude": property_doc.get("latitude"),
            "longitude": property_doc.get("longitude"),
            "google_address": property_doc.get("google_address"),
            "source": "property"
        }
    elif block_location:
        location = {
            "latitude": block_location.get("latitude"),
            "longitude": block_location.get("longitude"),
            "google_address": block_location.get("google_address"),
            "source": "block"
        }
    elif project and project.get("latitude"):
        location = {
            "latitude": project.get("latitude"),
            "longitude": project.get("longitude"),
            "google_address": project.get("google_address") or f"{project.get('location', '')}, {project.get('city', '')}, {project.get('state', '')}",
            "source": "project"
        }
    
    # Determine images (property > project)
    images = []
    if property_doc.get("property_images") and len(property_doc.get("property_images", [])) > 0:
        images = property_doc.get("property_images", [])
    elif property_doc.get("images") and len(property_doc.get("images", [])) > 0:
        images = [{"url": img, "is_cover": i == 0} for i, img in enumerate(property_doc.get("images", []))]
    elif project and project.get("images"):
        images = [{"url": img, "is_cover": i == 0, "source": "project"} for i, img in enumerate(project.get("images", []))]
    
    # Determine videos (property > project)
    videos = []
    if property_doc.get("property_videos") and len(property_doc.get("property_videos", [])) > 0:
        videos = property_doc.get("property_videos", [])
    elif project and project.get("videos"):
        videos = project.get("videos", [])
    elif project and project.get("video_url"):
        videos = [{"url": project.get("video_url"), "title": "Project Overview", "is_youtube": "youtube" in project.get("video_url", "").lower()}]
    
    # Build company branding
    company = {
        "name": tenant.get("company_name", "Real Estate Company") if tenant else "Real Estate Company",
        "logo": tenant.get("company_logo") if tenant else None,
        "contact_email": tenant.get("contact_email") if tenant else None,
        "contact_phone": tenant.get("contact_phone") if tenant else None,
        "website": tenant.get("website") if tenant else None,
        "address": f"{tenant.get('address', '')}, {tenant.get('city', '')}, {tenant.get('state', '')}" if tenant else None
    }
    
    # Generate initials for logo fallback
    if not company["logo"]:
        name_parts = company["name"].split()
        if len(name_parts) >= 2:
            company["initials"] = (name_parts[0][0] + name_parts[1][0]).upper()
        else:
            company["initials"] = company["name"][:2].upper()
    
    # Build certified response
    certified_data = {
        "property": {
            "id": property_doc.get("id"),
            "property_number": property_doc.get("property_number"),
            "block": property_doc.get("block"),
            "area": property_doc.get("area"),
            "unit": property_doc.get("unit", "sqft"),
            "facing": property_doc.get("facing"),
            "length": property_doc.get("length"),
            "width": property_doc.get("width"),
            "price": property_doc.get("price"),
            "price_per_sqft": property_doc.get("price_per_sqft"),
            "features": property_doc.get("features", []),
            "status": property_doc.get("status_id", "available"),
            # Certification
            "is_certified": property_doc.get("is_certified", False),
            "certified_at": property_doc.get("certified_at"),
            # Legal
            "survey_number": property_doc.get("survey_number"),
            "registration_number": property_doc.get("registration_number"),
            "approval_number": property_doc.get("approval_number"),
            # Timestamps
            "created_at": property_doc.get("created_at"),
            "updated_at": property_doc.get("updated_at")
        },
        "project": {
            "id": project.get("id") if project else None,
            "name": project.get("name") if project else None,
            "description": project.get("description") if project else None,
            "project_type": project.get("project_type") if project else None,
            "total_area": project.get("total_area") if project else None,
            "location": project.get("location") if project else None,
            "city": project.get("city") if project else None,
            "state": project.get("state") if project else None,
            "pincode": project.get("pincode") if project else None,
            # Approvals
            "rera_number": project.get("rera_number") if project else None,
            "approvals": project.get("approvals", []) if project else []
        },
        "location": location,
        "media": {
            "images": images,
            "videos": videos,
            "layout_image": layout.get("svg_url") if layout else None
        },
        "company": company,
        "meta": {
            "page_title": f"Plot {property_doc.get('property_number')} - {project.get('name') if project else 'Property'} | Certified",
            "share_url": f"/property/{property_id}/certified",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    return certified_data


@router.get("/property/{property_id}/qr")
async def get_property_qr_data(property_id: str, request: Request):
    """Get minimal data for QR code generation"""
    db = get_db(request)
    
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0, "id": 1, "property_number": 1, "project_id": 1, "tenant_id": 1}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    project = await db.projects.find_one(
        {"id": property_doc.get("project_id")},
        {"_id": 0, "name": 1}
    )
    
    return {
        "property_id": property_id,
        "property_number": property_doc.get("property_number"),
        "project_name": project.get("name") if project else None,
        "certified_url": f"/property/{property_id}/certified"
    }


# ============ AUTHENTICATED ENDPOINTS ============

class CertifyPropertyRequest(BaseModel):
    property_id: str
    certification_note: Optional[str] = None


class BlockLocationUpdate(BaseModel):
    block_name: str
    latitude: float
    longitude: float
    google_address: Optional[str] = None


class ProjectBlockLocationsUpdate(BaseModel):
    project_id: str
    block_locations: List[BlockLocationUpdate]


@router.post("/property/{property_id}/certify")
async def certify_property(
    property_id: str, 
    data: Optional[CertifyPropertyRequest] = None,
    request: Request = None, 
    user: dict = Depends(get_current_user)
):
    """Mark a property as certified (admin only)"""
    db = get_db(request)
    
    # Check permissions
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can certify properties")
    
    # Get property
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check tenant access
    if user.get('role') == 'tenant_admin' and property_doc.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Access denied to this property")
    
    now = datetime.now(timezone.utc)
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "is_certified": True,
            "certified_at": now.isoformat(),
            "certified_by": user.get("user_id"),
            "certification_note": data.certification_note if data else None,
            "updated_at": now.isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Property {property_doc.get('property_number')} has been certified",
        "certified_at": now.isoformat()
    }


@router.post("/property/{property_id}/uncertify")
async def uncertify_property(
    property_id: str, 
    request: Request, 
    user: dict = Depends(get_current_user)
):
    """Remove certification from a property (admin only)"""
    db = get_db(request)
    
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can modify certification")
    
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if user.get('role') == 'tenant_admin' and property_doc.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "is_certified": False,
            "certified_at": None,
            "certified_by": None,
            "certification_note": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Certification removed"}


@router.put("/projects/{project_id}/block-locations")
async def update_block_locations(
    project_id: str,
    data: ProjectBlockLocationsUpdate,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Update block-wise locations for a project (admin only)"""
    db = get_db(request)
    
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can update block locations")
    
    project = await db.projects.find_one(
        {"id": project_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if user.get('role') == 'tenant_admin' and project.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Format block locations
    block_locations = [
        {
            "block_name": bl.block_name,
            "latitude": bl.latitude,
            "longitude": bl.longitude,
            "google_address": bl.google_address,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        for bl in data.block_locations
    ]
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "block_locations": block_locations,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Updated {len(block_locations)} block locations",
        "block_locations": block_locations
    }


@router.get("/projects/{project_id}/block-locations")
async def get_block_locations(
    project_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get block locations for a project"""
    db = get_db(request)
    
    project = await db.projects.find_one(
        {"id": project_id, "deleted_at": None},
        {"_id": 0, "block_locations": 1, "name": 1}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get unique blocks from properties
    properties = await db.properties.find(
        {"project_id": project_id, "deleted_at": None, "block": {"$ne": None}},
        {"_id": 0, "block": 1}
    ).to_list(length=1000)
    
    unique_blocks = list(set(p.get("block") for p in properties if p.get("block")))
    
    # Merge with existing block locations
    existing_locations = {bl.get("block_name"): bl for bl in project.get("block_locations", [])}
    
    blocks_with_locations = []
    for block in sorted(unique_blocks):
        if block in existing_locations:
            blocks_with_locations.append(existing_locations[block])
        else:
            blocks_with_locations.append({
                "block_name": block,
                "latitude": None,
                "longitude": None,
                "google_address": None
            })
    
    return {
        "project_id": project_id,
        "project_name": project.get("name"),
        "blocks": blocks_with_locations
    }


@router.put("/property/{property_id}/media")
async def update_property_media(
    property_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Update property images and videos"""
    db = get_db(request)
    
    body = await request.json()
    
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if user.get('role') == 'tenant_admin' and property_doc.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "property_images" in body:
        update_data["property_images"] = body["property_images"]
    
    if "property_videos" in body:
        update_data["property_videos"] = body["property_videos"]
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Media updated"}


@router.put("/property/{property_id}/location")
async def update_property_location(
    property_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Update property-specific location"""
    db = get_db(request)
    
    body = await request.json()
    
    property_doc = await db.properties.find_one(
        {"id": property_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if user.get('role') == 'tenant_admin' and property_doc.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "location_source": "property"
    }
    
    if "latitude" in body:
        update_data["latitude"] = body["latitude"]
    if "longitude" in body:
        update_data["longitude"] = body["longitude"]
    if "google_address" in body:
        update_data["google_address"] = body["google_address"]
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Location updated"}
