"""
Resale/Release System Routes
- Release properties back to inventory
- List properties for resale
- Auto-notify booking queue when property available
- Track inquiries and negotiations
"""
from fastapi import APIRouter, HTTPException, Request
from models.resale_release import (
    PropertyRelease, PropertyReleaseCreate, PropertyResale, PropertyResaleCreate,
    ResaleApproval, ResaleInquiry, ResaleInquiryCreate, ReleaseReason, ResaleStatus
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/resale-release", tags=["resale-release"])


def get_db(request: Request):
    return request.app.state.db


# ==================== RELEASE (Return to Inventory) ====================

@router.get("/releases")
async def get_releases(
    request: Request,
    project_id: Optional[str] = None,
    is_processed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get property releases"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        query["project_id"] = project_id
    if is_processed is not None:
        query["is_processed"] = is_processed
    
    releases = await db.property_releases.find(
        query, {"_id": 0}
    ).sort("released_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.property_releases.count_documents(query)
    
    return {
        "success": True,
        "releases": releases,
        "total": total
    }


@router.post("/releases")
async def create_release(
    release_data: PropertyReleaseCreate,
    request: Request
):
    """Release a property back to inventory"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate project exists
    project = await db.projects.find_one(
        {"id": release_data.project_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create release record
    release = PropertyRelease(
        tenant_id=user["tenant_id"],
        project_id=release_data.project_id,
        property_id=release_data.property_id,
        previous_customer_id=release_data.previous_customer_id,
        previous_customer_name=release_data.previous_customer_name,
        previous_booking_id=release_data.previous_booking_id,
        release_reason=release_data.release_reason,
        release_notes=release_data.release_notes,
        refund_amount=release_data.refund_amount,
        deduction_amount=release_data.deduction_amount,
        deduction_reason=release_data.deduction_reason,
        released_by=user["user_id"]
    )
    
    await db.property_releases.insert_one(release.model_dump())
    
    # Update property status in project_layouts
    await db.project_layouts.update_one(
        {"project_id": release_data.project_id, "plots.id": release_data.property_id},
        {"$set": {"plots.$.status": "available"}}
    )
    
    # Update property in properties collection if exists
    await db.properties.update_one(
        {"id": release_data.property_id},
        {"$set": {"status": "available", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "release": release.model_dump(),
        "message": "Property released back to inventory"
    }


@router.post("/releases/{release_id}/notify-queue")
async def notify_queue_for_release(release_id: str, request: Request):
    """Notify booking queue that property is available"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    release = await db.property_releases.find_one(
        {"id": release_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Get waiting queue for this property
    queue_entries = await db.booking_queue.find(
        {
            "tenant_id": user["tenant_id"],
            "property_id": release["property_id"],
            "status": "waiting"
        },
        {"_id": 0}
    ).sort("position", 1).to_list(100)
    
    if not queue_entries:
        return {
            "success": True,
            "message": "No one in queue for this property",
            "notified": 0
        }
    
    # Notify first person in queue
    first_in_queue = queue_entries[0]
    
    # Update queue entry status
    await db.booking_queue.update_one(
        {"id": first_in_queue["id"]},
        {"$set": {
            "status": "notified",
            "notified_at": datetime.now(timezone.utc).isoformat(),
            "response_deadline": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()
        }}
    )
    
    # Update release record
    await db.property_releases.update_one(
        {"id": release_id},
        {"$set": {
            "notification_sent": True,
            "notified_count": 1,
            "is_processed": True,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # TODO: Send SMS notification to customer
    
    return {
        "success": True,
        "message": f"Notified {first_in_queue['customer_name']} ({first_in_queue['customer_mobile']})",
        "notified": 1,
        "queue_entry_id": first_in_queue["id"]
    }


# ==================== RESALE (Customer Selling) ====================

@router.get("/resales")
async def get_resales(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    is_listed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get resale listings"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if is_listed is not None:
        query["is_listed"] = is_listed
    
    resales = await db.property_resales.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.property_resales.count_documents(query)
    
    return {
        "success": True,
        "resales": resales,
        "total": total
    }


@router.get("/resales/listed")
async def get_listed_resales(
    request: Request,
    project_id: Optional[str] = None
):
    """Get publicly listed resale properties"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {
        "tenant_id": user["tenant_id"],
        "is_listed": True,
        "status": "listed"
    }
    
    if project_id:
        query["project_id"] = project_id
    
    resales = await db.property_resales.find(
        query, {"_id": 0}
    ).sort("listed_at", -1).to_list(100)
    
    return {
        "success": True,
        "resales": resales,
        "count": len(resales)
    }


@router.get("/resales/stats")
async def get_resale_stats(request: Request):
    """Get resale statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    total = await db.property_resales.count_documents(query)
    
    # By status
    status_counts = {}
    for status in ResaleStatus:
        status_counts[status.value] = await db.property_resales.count_documents(
            {**query, "status": status.value}
        )
    
    # Total commission earned
    pipeline = [
        {"$match": {**query, "status": "sold"}},
        {"$group": {"_id": None, "total_commission": {"$sum": "$commission_amount"}}}
    ]
    commission_result = await db.property_resales.aggregate(pipeline).to_list(1)
    total_commission = commission_result[0]["total_commission"] if commission_result else 0
    
    return {
        "success": True,
        "total": total,
        "by_status": status_counts,
        "total_commission_earned": round(total_commission, 2)
    }


@router.get("/resales/{resale_id}")
async def get_resale(resale_id: str, request: Request):
    """Get single resale details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found")
    
    # Get inquiries
    inquiries = await db.resale_inquiries.find(
        {"resale_id": resale_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "success": True,
        "resale": resale,
        "inquiries": inquiries,
        "inquiry_count": len(inquiries)
    }


@router.post("/resales")
async def create_resale(
    resale_data: PropertyResaleCreate,
    request: Request
):
    """Create a resale listing request"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate booking exists
    booking = await db.bookings.find_one(
        {"id": resale_data.booking_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if resale already exists for this property
    existing = await db.property_resales.find_one({
        "tenant_id": user["tenant_id"],
        "property_id": resale_data.property_id,
        "status": {"$nin": ["sold", "withdrawn", "rejected"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Resale already exists for this property")
    
    resale = PropertyResale(
        tenant_id=user["tenant_id"],
        project_id=resale_data.project_id,
        property_id=resale_data.property_id,
        booking_id=resale_data.booking_id,
        seller_customer_id=resale_data.seller_customer_id,
        seller_name=resale_data.seller_name,
        seller_phone=resale_data.seller_phone,
        property_number=resale_data.property_number,
        property_area=resale_data.property_area,
        property_area_unit=resale_data.property_area_unit,
        original_price=resale_data.original_price,
        asking_price=resale_data.asking_price,
        minimum_price=resale_data.minimum_price,
        commission_percentage=resale_data.commission_percentage,
        seller_notes=resale_data.seller_notes,
        created_by=user["user_id"]
    )
    
    await db.property_resales.insert_one(resale.model_dump())
    
    return {
        "success": True,
        "resale": resale.model_dump(),
        "message": "Resale request submitted for approval"
    }


@router.post("/resales/{resale_id}/approve")
async def approve_resale(
    resale_id: str,
    approval_data: ResaleApproval,
    request: Request
):
    """Approve or reject resale listing"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can approve resales")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"], "status": "pending_approval"},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found or already processed")
    
    if approval_data.approved:
        update_dict = {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "admin_notes": approval_data.admin_notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if approval_data.commission_percentage:
            update_dict["commission_percentage"] = approval_data.commission_percentage
        
        message = "Resale approved"
    else:
        update_dict = {
            "status": "rejected",
            "rejection_reason": approval_data.rejection_reason,
            "admin_notes": approval_data.admin_notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        message = "Resale rejected"
    
    await db.property_resales.update_one(
        {"id": resale_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": message}


@router.post("/resales/{resale_id}/list")
async def list_resale(resale_id: str, request: Request):
    """Make resale publicly visible"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"], "status": "approved"},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found or not approved")
    
    # Update property status
    await db.project_layouts.update_one(
        {"project_id": resale["project_id"], "plots.id": resale["property_id"]},
        {"$set": {"plots.$.status": "resale"}}
    )
    
    # List the resale
    await db.property_resales.update_one(
        {"id": resale_id},
        {"$set": {
            "status": "listed",
            "is_listed": True,
            "listed_at": datetime.now(timezone.utc).isoformat(),
            "listing_expiry": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Property listed for resale"}


@router.post("/resales/{resale_id}/notify-interested")
async def notify_interested_parties(resale_id: str, request: Request):
    """Notify booking queue and interested parties about resale"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"], "is_listed": True},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found or not listed")
    
    # Get people in queue for this property or project
    queue_entries = await db.booking_queue.find(
        {
            "tenant_id": user["tenant_id"],
            "$or": [
                {"property_id": resale["property_id"]},
                {"project_id": resale["project_id"]}
            ],
            "status": "waiting"
        },
        {"_id": 0, "id": 1, "customer_name": 1, "customer_mobile": 1}
    ).to_list(100)
    
    notified_count = len(queue_entries)
    
    # TODO: Send SMS to each interested party
    
    await db.property_resales.update_one(
        {"id": resale_id},
        {"$set": {
            "interested_parties_notified": True,
            "notified_count": notified_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Notified {notified_count} interested parties",
        "notified": notified_count
    }


@router.post("/resales/{resale_id}/mark-sold")
async def mark_resale_sold(
    resale_id: str,
    request: Request,
    buyer_customer_id: Optional[str] = None,
    buyer_name: str = "",
    final_price: float = 0
):
    """Mark resale as sold"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found")
    
    if resale["status"] == "sold":
        raise HTTPException(status_code=400, detail="Already marked as sold")
    
    # Calculate commission
    commission_amount = final_price * (resale["commission_percentage"] / 100)
    
    await db.property_resales.update_one(
        {"id": resale_id},
        {"$set": {
            "status": "sold",
            "buyer_customer_id": buyer_customer_id,
            "buyer_name": buyer_name,
            "final_price": final_price,
            "commission_amount": commission_amount,
            "sold_at": datetime.now(timezone.utc).isoformat(),
            "is_listed": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update property status
    await db.project_layouts.update_one(
        {"project_id": resale["project_id"], "plots.id": resale["property_id"]},
        {"$set": {"plots.$.status": "sold"}}
    )
    
    return {
        "success": True,
        "message": "Resale marked as sold",
        "commission_earned": round(commission_amount, 2)
    }


@router.post("/resales/{resale_id}/withdraw")
async def withdraw_resale(resale_id: str, request: Request):
    """Withdraw resale listing"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    resale = await db.property_resales.find_one(
        {"id": resale_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found")
    
    if resale["status"] == "sold":
        raise HTTPException(status_code=400, detail="Cannot withdraw sold property")
    
    await db.property_resales.update_one(
        {"id": resale_id},
        {"$set": {
            "status": "withdrawn",
            "is_listed": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Restore property status
    await db.project_layouts.update_one(
        {"project_id": resale["project_id"], "plots.id": resale["property_id"]},
        {"$set": {"plots.$.status": "sold"}}  # Back to sold (owner still owns it)
    )
    
    return {"success": True, "message": "Resale listing withdrawn"}


# ==================== INQUIRIES ====================

@router.get("/resales/{resale_id}/inquiries")
async def get_resale_inquiries(resale_id: str, request: Request):
    """Get inquiries for a resale"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    inquiries = await db.resale_inquiries.find(
        {"resale_id": resale_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"success": True, "inquiries": inquiries}


@router.post("/inquiries")
async def create_inquiry(
    inquiry_data: ResaleInquiryCreate,
    request: Request
):
    """Create inquiry for resale property"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate resale exists and is listed
    resale = await db.property_resales.find_one(
        {"id": inquiry_data.resale_id, "is_listed": True},
        {"_id": 0}
    )
    
    if not resale:
        raise HTTPException(status_code=404, detail="Resale not found or not listed")
    
    inquiry = ResaleInquiry(
        tenant_id=user["tenant_id"],
        resale_id=inquiry_data.resale_id,
        inquirer_name=inquiry_data.inquirer_name,
        inquirer_phone=inquiry_data.inquirer_phone,
        inquirer_email=inquiry_data.inquirer_email,
        offered_price=inquiry_data.offered_price,
        message=inquiry_data.message
    )
    
    await db.resale_inquiries.insert_one(inquiry.model_dump())
    
    return {
        "success": True,
        "inquiry": inquiry.model_dump(),
        "message": "Inquiry submitted"
    }


@router.put("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(
    inquiry_id: str,
    request: Request,
    status: str,
    staff_notes: Optional[str] = None
):
    """Update inquiry status"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    valid_statuses = ["new", "contacted", "negotiating", "rejected", "accepted"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.resale_inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {"status": status, "staff_notes": staff_notes}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    
    return {"success": True, "message": "Inquiry status updated"}
