from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.staff_hierarchy import StaffHierarchy, StaffHierarchyCreate, StaffHierarchyUpdate
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

@router.post("/staff-hierarchy", response_model=dict)
async def create_staff_hierarchy(
    hierarchy: StaffHierarchyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create staff hierarchy entry with commission configuration"""
    
    # Check if staff already has hierarchy entry
    existing = await db.staff_hierarchy.find_one({
        "staff_id": hierarchy.staff_id,
        "tenant_id": hierarchy.tenant_id,
        "deleted_at": None
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Staff hierarchy entry already exists"
        )
    
    # Build hierarchy path
    hierarchy_path = []
    hierarchy_level = 0
    
    if hierarchy.parent_staff_id:
        # Get parent's hierarchy
        parent = await db.staff_hierarchy.find_one({
            "staff_id": hierarchy.parent_staff_id,
            "tenant_id": hierarchy.tenant_id,
            "deleted_at": None
        })
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent staff not found")
        
        hierarchy_path = parent.get("hierarchy_path", []) + [hierarchy.parent_staff_id]
        hierarchy_level = parent.get("hierarchy_level", 0) + 1
    
    # Create hierarchy entry
    hierarchy_dict = hierarchy.dict()
    hierarchy_dict["id"] = StaffHierarchy().id
    hierarchy_dict["hierarchy_path"] = hierarchy_path
    hierarchy_dict["hierarchy_level"] = hierarchy_level
    hierarchy_dict["is_active"] = True
    hierarchy_dict["joined_date"] = datetime.now(timezone.utc)
    hierarchy_dict["created_at"] = datetime.now(timezone.utc)
    hierarchy_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.staff_hierarchy.insert_one(hierarchy_dict)
    
    return {
        "success": True,
        "message": "Staff hierarchy created successfully",
        "hierarchy_id": hierarchy_dict["id"],
        "hierarchy_level": hierarchy_level
    }

@router.get("/staff-hierarchy", response_model=dict)
async def list_staff_hierarchy(
    tenant_id: Optional[str] = None,
    parent_staff_id: Optional[str] = None,
    hierarchy_level: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """List staff hierarchy with filters"""
    
    query = {"deleted_at": None}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if parent_staff_id:
        query["parent_staff_id"] = parent_staff_id
    if hierarchy_level is not None:
        query["hierarchy_level"] = hierarchy_level
    if is_active is not None:
        query["is_active"] = is_active
    
    hierarchies = await db.staff_hierarchy.find(query)\
        .sort("hierarchy_level", 1)\
        .to_list(length=None)
    
    return {
        "success": True,
        "count": len(hierarchies),
        "hierarchies": hierarchies
    }

@router.get("/staff-hierarchy/{staff_id}", response_model=dict)
async def get_staff_hierarchy(
    staff_id: str,
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get staff hierarchy details"""
    
    hierarchy = await db.staff_hierarchy.find_one({
        "staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Staff hierarchy not found")
    
    # Get subordinates
    subordinates = await db.staff_hierarchy.find({
        "parent_staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None,
        "is_active": True
    }).to_list(length=None)
    
    # Get manager info
    manager = None
    if hierarchy.get("parent_staff_id"):
        manager = await db.staff_hierarchy.find_one({
            "staff_id": hierarchy["parent_staff_id"],
            "deleted_at": None
        })
    
    return {
        "success": True,
        "hierarchy": hierarchy,
        "subordinates_count": len(subordinates),
        "subordinates": subordinates,
        "manager": manager
    }

@router.put("/staff-hierarchy/{staff_id}", response_model=dict)
async def update_staff_hierarchy(
    staff_id: str,
    tenant_id: str,
    update: StaffHierarchyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update staff hierarchy and commission configuration"""
    
    hierarchy = await db.staff_hierarchy.find_one({
        "staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Staff hierarchy not found")
    
    update_data = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}
    
    # If parent is being changed, rebuild hierarchy path
    if "parent_staff_id" in update_data and update_data["parent_staff_id"] != hierarchy.get("parent_staff_id"):
        new_parent_id = update_data["parent_staff_id"]
        
        if new_parent_id:
            # Get new parent's hierarchy
            parent = await db.staff_hierarchy.find_one({
                "staff_id": new_parent_id,
                "tenant_id": tenant_id,
                "deleted_at": None
            })
            
            if not parent:
                raise HTTPException(status_code=404, detail="New parent staff not found")
            
            update_data["hierarchy_path"] = parent.get("hierarchy_path", []) + [new_parent_id]
            update_data["hierarchy_level"] = parent.get("hierarchy_level", 0) + 1
        else:
            # Moving to top level
            update_data["hierarchy_path"] = []
            update_data["hierarchy_level"] = 0
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.staff_hierarchy.update_one(
        {"staff_id": staff_id, "tenant_id": tenant_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Staff hierarchy updated successfully"
    }

@router.delete("/staff-hierarchy/{staff_id}", response_model=dict)
async def delete_staff_hierarchy(
    staff_id: str,
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete staff hierarchy (soft delete)"""
    
    hierarchy = await db.staff_hierarchy.find_one({
        "staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Staff hierarchy not found")
    
    # Check if staff has subordinates
    subordinates_count = await db.staff_hierarchy.count_documents({
        "parent_staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None,
        "is_active": True
    })
    
    if subordinates_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete. Staff has {subordinates_count} active subordinate(s)"
        )
    
    await db.staff_hierarchy.update_one(
        {"staff_id": staff_id, "tenant_id": tenant_id},
        {
            "$set": {
                "deleted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Staff hierarchy deleted successfully"
    }

@router.get("/staff-hierarchy/{staff_id}/tree", response_model=dict)
async def get_staff_tree(
    staff_id: str,
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete hierarchy tree for a staff member"""
    
    async def build_tree(staff_id: str):
        """Recursively build hierarchy tree"""
        hierarchy = await db.staff_hierarchy.find_one({
            "staff_id": staff_id,
            "tenant_id": tenant_id,
            "deleted_at": None
        })
        
        if not hierarchy:
            return None
        
        # Get subordinates
        subordinates = await db.staff_hierarchy.find({
            "parent_staff_id": staff_id,
            "tenant_id": tenant_id,
            "deleted_at": None,
            "is_active": True
        }).to_list(length=None)
        
        # Build tree for each subordinate
        children = []
        for sub in subordinates:
            child_tree = await build_tree(sub["staff_id"])
            if child_tree:
                children.append(child_tree)
        
        hierarchy["children"] = children
        hierarchy["children_count"] = len(children)
        
        return hierarchy
    
    tree = await build_tree(staff_id)
    
    if not tree:
        raise HTTPException(status_code=404, detail="Staff hierarchy not found")
    
    return {
        "success": True,
        "tree": tree
    }

@router.get("/staff-hierarchy/{staff_id}/upline", response_model=dict)
async def get_staff_upline(
    staff_id: str,
    tenant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete upline (all managers above this staff)"""
    
    hierarchy = await db.staff_hierarchy.find_one({
        "staff_id": staff_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    })
    
    if not hierarchy:
        raise HTTPException(status_code=404, detail="Staff hierarchy not found")
    
    upline = []
    hierarchy_path = hierarchy.get("hierarchy_path", [])
    
    for manager_id in hierarchy_path:
        manager = await db.staff_hierarchy.find_one({
            "staff_id": manager_id,
            "tenant_id": tenant_id,
            "deleted_at": None
        })
        if manager:
            upline.append(manager)
    
    return {
        "success": True,
        "upline_count": len(upline),
        "upline": upline
    }
