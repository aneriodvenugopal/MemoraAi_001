"""
Booking Queue Routes
- Add customers to waitlist for properties
- Manage queue positions
- Notify when property becomes available
- Process responses
"""
from fastapi import APIRouter, HTTPException, Request
from models.booking_queue import (
    BookingQueue, BookingQueueCreate, BookingQueueUpdate,
    QueueNotify, QueueResponse, QueueStatus
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/booking-queue", tags=["booking-queue"])


def get_db(request: Request):
    return request.app.state.db


# ==================== LIST & GET ====================

@router.get("")
async def get_queue_entries(
    request: Request,
    project_id: Optional[str] = None,
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get queue entries with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        query["project_id"] = project_id
    if property_id:
        query["property_id"] = property_id
    if status:
        query["status"] = status
    
    entries = await db.booking_queue.find(
        query, {"_id": 0}
    ).sort([("property_id", 1), ("position", 1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.booking_queue.count_documents(query)
    
    return {
        "success": True,
        "entries": entries,
        "total": total
    }


@router.get("/property/{property_id}")
async def get_property_queue(property_id: str, request: Request):
    """Get queue for a specific property"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entries = await db.booking_queue.find(
        {
            "tenant_id": user["tenant_id"],
            "property_id": property_id,
            "status": {"$in": ["waiting", "notified"]}
        },
        {"_id": 0}
    ).sort("position", 1).to_list(100)
    
    # Get property details
    property_data = await db.properties.find_one(
        {"id": property_id},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "price": 1}
    )
    
    return {
        "success": True,
        "property": property_data,
        "queue": entries,
        "queue_length": len(entries)
    }


@router.get("/stats")
async def get_queue_stats(
    request: Request,
    project_id: Optional[str] = None
):
    """Get queue statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        query["project_id"] = project_id
    
    total = await db.booking_queue.count_documents(query)
    
    # Count by status
    status_counts = {}
    for status in QueueStatus:
        status_query = {**query, "status": status.value}
        status_counts[status.value] = await db.booking_queue.count_documents(status_query)
    
    # Properties with queues
    pipeline = [
        {"$match": {**query, "status": "waiting"}},
        {"$group": {"_id": "$property_id", "count": {"$sum": 1}}},
        {"$count": "total"}
    ]
    result = await db.booking_queue.aggregate(pipeline).to_list(1)
    properties_with_queue = result[0]["total"] if result else 0
    
    return {
        "success": True,
        "total": total,
        "by_status": status_counts,
        "properties_with_queue": properties_with_queue,
        "conversion_rate": round(
            (status_counts.get("converted", 0) / total * 100) if total > 0 else 0, 1
        )
    }


@router.get("/{entry_id}")
async def get_queue_entry(entry_id: str, request: Request):
    """Get single queue entry"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    return {"success": True, "entry": entry}


# ==================== CREATE ====================

@router.post("")
async def add_to_queue(
    queue_data: BookingQueueCreate,
    request: Request
):
    """Add customer to property waitlist"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate project exists
    project = await db.projects.find_one(
        {"id": queue_data.project_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Property validation is optional - we accept any property_id
    # This allows queuing for plots in project_layouts or properties collection
    
    # Check if already in queue
    existing = await db.booking_queue.find_one({
        "tenant_id": user["tenant_id"],
        "property_id": queue_data.property_id,
        "customer_mobile": queue_data.customer_mobile,
        "status": {"$in": ["waiting", "notified"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already in queue for this property")
    
    # Get next position
    last_entry = await db.booking_queue.find_one(
        {"tenant_id": user["tenant_id"], "property_id": queue_data.property_id},
        {"_id": 0, "position": 1},
        sort=[("position", -1)]
    )
    next_position = (last_entry.get("position", 0) if last_entry else 0) + 1
    
    # Create queue entry
    entry = BookingQueue(
        tenant_id=user["tenant_id"],
        project_id=queue_data.project_id,
        property_id=queue_data.property_id,
        customer_id=queue_data.customer_id,
        lead_id=queue_data.lead_id,
        customer_name=queue_data.customer_name,
        customer_mobile=queue_data.customer_mobile,
        customer_email=queue_data.customer_email,
        position=next_position,
        priority=queue_data.priority,
        max_price=queue_data.max_price,
        notes=queue_data.notes,
        created_by=user["user_id"]
    )
    
    await db.booking_queue.insert_one(entry.model_dump())
    
    return {
        "success": True,
        "entry": entry.model_dump(),
        "message": f"Added to queue at position {next_position}"
    }


# ==================== UPDATE ====================

@router.put("/{entry_id}")
async def update_queue_entry(
    entry_id: str,
    update_data: BookingQueueUpdate,
    request: Request
):
    """Update queue entry"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.max_price is not None:
        update_dict["max_price"] = update_data.max_price
    if update_data.notes is not None:
        update_dict["notes"] = update_data.notes
    if update_data.priority is not None:
        update_dict["priority"] = update_data.priority
    
    result = await db.booking_queue.update_one(
        {"id": entry_id, "tenant_id": user["tenant_id"], "status": "waiting"},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found or cannot be updated")
    
    return {"success": True, "message": "Queue entry updated"}


@router.post("/{entry_id}/move-up")
async def move_up_in_queue(entry_id: str, request: Request):
    """Move entry up in queue (increase priority)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can reorder queue")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry["position"] <= 1:
        return {"success": True, "message": "Already at top of queue"}
    
    # Swap with entry above
    above_entry = await db.booking_queue.find_one({
        "tenant_id": user["tenant_id"],
        "property_id": entry["property_id"],
        "position": entry["position"] - 1,
        "status": "waiting"
    })
    
    if above_entry:
        await db.booking_queue.update_one(
            {"id": above_entry["id"]},
            {"$set": {"position": entry["position"]}}
        )
    
    await db.booking_queue.update_one(
        {"id": entry_id},
        {"$set": {"position": entry["position"] - 1}}
    )
    
    return {"success": True, "message": "Moved up in queue"}


# ==================== NOTIFY & RESPOND ====================

@router.post("/{entry_id}/notify")
async def notify_queue_member(
    entry_id: str,
    notify_data: QueueNotify,
    request: Request
):
    """Notify customer that property is available"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"], "status": "waiting"},
        {"_id": 0}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found or not in waiting status")
    
    # Set response deadline
    deadline = datetime.now(timezone.utc) + timedelta(hours=notify_data.response_hours)
    
    await db.booking_queue.update_one(
        {"id": entry_id},
        {"$set": {
            "status": "notified",
            "notified_at": datetime.now(timezone.utc).isoformat(),
            "response_deadline": deadline.isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # TODO: Send SMS/notification to customer
    
    return {
        "success": True,
        "message": f"Customer notified. Response deadline: {deadline.strftime('%Y-%m-%d %H:%M')}",
        "deadline": deadline.isoformat()
    }


@router.post("/{entry_id}/respond")
async def record_response(
    entry_id: str,
    response_data: QueueResponse,
    request: Request
):
    """Record customer's response"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"], "status": "notified"},
        {"_id": 0}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found or not in notified status")
    
    new_status = "converted" if response_data.response == "interested" else "skipped"
    
    update_dict = {
        "status": new_status,
        "response_received": response_data.response,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if response_data.response == "interested":
        update_dict["converted_at"] = datetime.now(timezone.utc).isoformat()
    
    if response_data.notes:
        existing_notes = entry.get("notes") or ""
        update_dict["notes"] = (existing_notes + "\n" + response_data.notes).strip()
    
    await db.booking_queue.update_one(
        {"id": entry_id},
        {"$set": update_dict}
    )
    
    # If skipped, notify next in queue
    if new_status == "skipped":
        next_entry = await db.booking_queue.find_one({
            "tenant_id": user["tenant_id"],
            "property_id": entry["property_id"],
            "status": "waiting",
            "position": {"$gt": entry["position"]}
        }, sort=[("position", 1)])
        
        if next_entry:
            return {
                "success": True,
                "message": "Response recorded. Next person in queue available.",
                "next_in_queue": {
                    "id": next_entry["id"],
                    "name": next_entry["customer_name"],
                    "position": next_entry["position"]
                }
            }
    
    return {
        "success": True,
        "message": f"Response recorded: {response_data.response}",
        "new_status": new_status
    }


# ==================== CANCEL & EXPIRE ====================

@router.post("/{entry_id}/cancel")
async def cancel_queue_entry(
    entry_id: str,
    request: Request,
    reason: Optional[str] = None
):
    """Cancel queue entry"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry["status"] in ["converted", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Entry already {entry['status']}")
    
    update_dict = {
        "status": "cancelled",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if reason:
        existing_notes = entry.get("notes") or ""
        update_dict["notes"] = (existing_notes + f"\nCancelled: {reason}").strip()
    
    await db.booking_queue.update_one(
        {"id": entry_id},
        {"$set": update_dict}
    )
    
    # Reorder remaining queue
    await db.booking_queue.update_many(
        {
            "tenant_id": user["tenant_id"],
            "property_id": entry["property_id"],
            "position": {"$gt": entry["position"]},
            "status": "waiting"
        },
        {"$inc": {"position": -1}}
    )
    
    return {"success": True, "message": "Queue entry cancelled"}


@router.post("/expire-overdue")
async def expire_overdue_entries(request: Request):
    """Mark overdue notified entries as expired (for cron job)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.booking_queue.update_many(
        {
            "tenant_id": user["tenant_id"],
            "status": "notified",
            "response_deadline": {"$lt": now}
        },
        {"$set": {
            "status": "expired",
            "response_received": "no_response",
            "updated_at": now
        }}
    )
    
    return {
        "success": True,
        "expired_count": result.modified_count,
        "message": f"Expired {result.modified_count} overdue entries"
    }


# ==================== DELETE ====================

@router.delete("/{entry_id}")
async def delete_queue_entry(entry_id: str, request: Request):
    """Delete queue entry (admin only)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    
    entry = await db.booking_queue.find_one(
        {"id": entry_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "property_id": 1, "position": 1}
    )
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    await db.booking_queue.delete_one({"id": entry_id})
    
    # Reorder remaining queue
    await db.booking_queue.update_many(
        {
            "tenant_id": user["tenant_id"],
            "property_id": entry["property_id"],
            "position": {"$gt": entry["position"]},
            "status": "waiting"
        },
        {"$inc": {"position": -1}}
    )
    
    return {"success": True, "message": "Entry deleted"}
