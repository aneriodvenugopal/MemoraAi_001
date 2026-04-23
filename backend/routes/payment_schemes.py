from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.payment_scheme import PaymentScheme, PaymentSchemeCreate, PaymentSchemeUpdate, SchemeField
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

@router.post("/schemes", response_model=dict)
async def create_payment_scheme(
    scheme: PaymentSchemeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new payment scheme"""
    
    # Calculate total amount from fields
    total_amount = sum(field.field_value for field in scheme.fields)
    
    # Create scheme
    scheme_dict = scheme.dict()
    scheme_dict["id"] = PaymentScheme().id
    scheme_dict["total_amount"] = total_amount
    scheme_dict["is_finalized"] = False
    scheme_dict["is_active"] = True
    scheme_dict["created_at"] = datetime.now(timezone.utc)
    scheme_dict["updated_at"] = datetime.now(timezone.utc)
    
    # Convert fields to dict
    scheme_dict["fields"] = [field.dict() for field in scheme.fields]
    
    await db.payment_schemes.insert_one(scheme_dict)
    
    return {
        "success": True,
        "message": "Payment scheme created successfully",
        "scheme_id": scheme_dict["id"],
        "total_amount": total_amount
    }

@router.get("/schemes", response_model=dict)
async def list_payment_schemes(
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    scheme_type: Optional[str] = None,
    is_template: Optional[bool] = None,
    is_finalized: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """List payment schemes with filters"""
    
    query = {"deleted_at": None}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if project_id:
        query["project_id"] = project_id
    if scheme_type:
        query["scheme_type"] = scheme_type
    if is_template is not None:
        query["is_template"] = is_template
    if is_finalized is not None:
        query["is_finalized"] = is_finalized
    
    schemes = await db.payment_schemes.find(query).to_list(length=None)
    
    return {
        "success": True,
        "count": len(schemes),
        "schemes": schemes
    }

@router.get("/schemes/{scheme_id}", response_model=dict)
async def get_payment_scheme(
    scheme_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single payment scheme details"""
    
    scheme = await db.payment_schemes.find_one({
        "id": scheme_id,
        "deleted_at": None
    })
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Payment scheme not found")
    
    return {
        "success": True,
        "scheme": scheme
    }

@router.put("/schemes/{scheme_id}", response_model=dict)
async def update_payment_scheme(
    scheme_id: str,
    update: PaymentSchemeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update payment scheme (only if not finalized)"""
    
    # Check if scheme exists and is not finalized
    scheme = await db.payment_schemes.find_one({
        "id": scheme_id,
        "deleted_at": None
    })
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Payment scheme not found")
    
    if scheme.get("is_finalized"):
        raise HTTPException(
            status_code=400,
            detail="Cannot update finalized scheme. Create a new scheme instead."
        )
    
    # Prepare update data
    update_data = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}
    
    # If fields are updated, recalculate total
    if "fields" in update_data:
        update_data["fields"] = [field.dict() for field in update.fields]
        total_amount = sum(field["field_value"] for field in update_data["fields"])
        update_data["total_amount"] = total_amount
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.payment_schemes.update_one(
        {"id": scheme_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Payment scheme updated successfully"
    }

@router.post("/schemes/{scheme_id}/finalize", response_model=dict)
async def finalize_payment_scheme(
    scheme_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Finalize a payment scheme (locks it from editing/deletion)"""
    
    scheme = await db.payment_schemes.find_one({
        "id": scheme_id,
        "deleted_at": None
    })
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Payment scheme not found")
    
    if scheme.get("is_finalized"):
        raise HTTPException(status_code=400, detail="Scheme is already finalized")
    
    await db.payment_schemes.update_one(
        {"id": scheme_id},
        {
            "$set": {
                "is_finalized": True,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Payment scheme finalized successfully. It can no longer be edited or deleted."
    }

@router.delete("/schemes/{scheme_id}", response_model=dict)
async def delete_payment_scheme(
    scheme_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete payment scheme (soft delete, only if not finalized)"""
    
    scheme = await db.payment_schemes.find_one({
        "id": scheme_id,
        "deleted_at": None
    })
    
    if not scheme:
        raise HTTPException(status_code=404, detail="Payment scheme not found")
    
    if scheme.get("is_finalized"):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete finalized scheme"
        )
    
    # Check if scheme is used in any bookings
    booking_count = await db.bookings.count_documents({
        "payment_scheme_id": scheme_id,
        "deleted_at": None
    })
    
    if booking_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete scheme. It is used in {booking_count} booking(s)"
        )
    
    await db.payment_schemes.update_one(
        {"id": scheme_id},
        {
            "$set": {
                "deleted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Payment scheme deleted successfully"
    }

@router.get("/schemes/templates/system", response_model=dict)
async def get_system_templates(
    current_user: dict = Depends(get_current_user)
):
    """Get system-level payment scheme templates"""
    
    templates = await db.payment_schemes.find({
        "is_template": True,
        "deleted_at": None,
        "is_active": True
    }).to_list(length=None)
    
    return {
        "success": True,
        "count": len(templates),
        "templates": templates
    }

@router.post("/schemes/{scheme_id}/clone", response_model=dict)
async def clone_payment_scheme(
    scheme_id: str,
    tenant_id: str,
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Clone an existing scheme to create a new one"""
    
    original = await db.payment_schemes.find_one({
        "id": scheme_id,
        "deleted_at": None
    })
    
    if not original:
        raise HTTPException(status_code=404, detail="Payment scheme not found")
    
    # Create new scheme from original
    new_scheme = {
        "id": PaymentScheme().id,
        "tenant_id": tenant_id,
        "project_id": project_id,
        "scheme_name": f"{original['scheme_name']} (Copy)",
        "scheme_type": original["scheme_type"],
        "duration_months": original["duration_months"],
        "fields": original["fields"],
        "total_amount": original["total_amount"],
        "is_finalized": False,
        "is_active": True,
        "is_template": False,
        "description": original.get("description"),
        "terms_conditions": original.get("terms_conditions"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.payment_schemes.insert_one(new_scheme)
    
    return {
        "success": True,
        "message": "Payment scheme cloned successfully",
        "new_scheme_id": new_scheme["id"]
    }
