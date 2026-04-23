"""
Complaint System Routes
- Register and track complaints
- Assignment and escalation
- Resolution and feedback
"""
from fastapi import APIRouter, HTTPException, Request
from models.complaint import (
    Complaint, ComplaintComment, ComplaintStatus, ComplaintPriority, ComplaintCategory,
    CreateComplaintRequest, UpdateComplaintRequest, AddCommentRequest,
    EscalateComplaintRequest, ResolveComplaintRequest, CustomerFeedbackRequest
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/complaints", tags=["complaints"])


def get_db(request: Request):
    return request.app.state.db


async def generate_complaint_number(db, tenant_id: str) -> str:
    """Generate unique complaint number"""
    today = datetime.now().strftime("%Y%m%d")
    count = await db.complaints.count_documents({
        "tenant_id": tenant_id,
        "complaint_number": {"$regex": f"^CMP-{today}"}
    })
    return f"CMP-{today}-{count + 1:04d}"


def get_sla_hours(priority: str) -> int:
    """Get SLA hours based on priority"""
    sla_map = {
        "critical": 4,
        "high": 24,
        "medium": 48,
        "low": 72
    }
    return sla_map.get(priority, 48)


# ==================== Complaint CRUD ====================

@router.post("/create")
async def create_complaint(
    complaint_data: CreateComplaintRequest,
    request: Request
):
    """Create a new complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Generate complaint number
    complaint_number = await generate_complaint_number(db, user["tenant_id"])
    
    # Calculate SLA due date
    sla_hours = get_sla_hours(complaint_data.priority.value)
    sla_due_date = datetime.now(timezone.utc) + timedelta(hours=sla_hours)
    
    complaint = Complaint(
        tenant_id=user["tenant_id"],
        complaint_number=complaint_number,
        sla_due_date=sla_due_date,
        **complaint_data.model_dump()
    )
    
    await db.complaints.insert_one(complaint.model_dump())
    
    # Create initial comment
    initial_comment = ComplaintComment(
        complaint_id=complaint.id,
        user_id=user["user_id"],
        user_name=user.get("name", "System"),
        comment="Complaint registered",
        status_changed_to="open"
    )
    await db.complaint_comments.insert_one(initial_comment.model_dump())
    
    return {
        "success": True,
        "message": f"Complaint registered: {complaint_number}",
        "complaint": complaint.model_dump(),
        "complaint_number": complaint_number
    }


@router.get("")
async def get_complaints(
    request: Request,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    customer_phone: Optional[str] = None,
    project_id: Optional[str] = None,
    is_escalated: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all complaints with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if status and status != "all":
        query["status"] = status
    if priority and priority != "all":
        query["priority"] = priority
    if category and category != "all":
        query["category"] = category
    if assigned_to:
        query["assigned_to"] = assigned_to
    if customer_phone:
        query["customer_phone"] = {"$regex": customer_phone}
    if project_id:
        query["project_id"] = project_id
    if is_escalated is not None:
        query["is_escalated"] = is_escalated
    if search:
        query["$or"] = [
            {"complaint_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}}
        ]
    
    # Check and update SLA breach status
    now = datetime.now(timezone.utc)
    await db.complaints.update_many(
        {
            "tenant_id": user["tenant_id"],
            "status": {"$nin": ["resolved", "closed"]},
            "sla_due_date": {"$lt": now},
            "sla_breached": {"$ne": True}
        },
        {"$set": {"sla_breached": True}}
    )
    
    complaints = await db.complaints.find(
        query, {"_id": 0}
    ).sort([("priority_order", 1), ("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    
    # Add priority order for sorting
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    for c in complaints:
        c["priority_order"] = priority_order.get(c.get("priority", "medium"), 2)
    
    complaints.sort(key=lambda x: (x["priority_order"], x.get("created_at", "")), reverse=False)
    
    total = await db.complaints.count_documents(query)
    
    return {
        "success": True,
        "complaints": complaints,
        "total": total
    }


@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str, request: Request):
    """Get single complaint with comments"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": complaint_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get comments
    comments = await db.complaint_comments.find(
        {"complaint_id": complaint_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Get assigned user info
    assigned_user = None
    if complaint.get("assigned_to"):
        assigned_user = await db.users.find_one(
            {"id": complaint["assigned_to"]},
            {"_id": 0, "name": 1, "email": 1, "phone": 1}
        )
    
    return {
        "success": True,
        "complaint": complaint,
        "comments": comments,
        "assigned_user": assigned_user
    }


@router.put("/{complaint_id}")
async def update_complaint(
    complaint_id: str,
    update_data: UpdateComplaintRequest,
    request: Request
):
    """Update complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": complaint_id, "tenant_id": user["tenant_id"]}
    )
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track status change
    old_status = complaint.get("status")
    new_status = update_dict.get("status")
    
    # Handle assignment
    if "assigned_to" in update_dict and update_dict["assigned_to"] != complaint.get("assigned_to"):
        update_dict["assigned_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate SLA if priority changes
    if "priority" in update_dict and update_dict["priority"] != complaint.get("priority"):
        sla_hours = get_sla_hours(update_dict["priority"])
        update_dict["sla_due_date"] = (datetime.now(timezone.utc) + timedelta(hours=sla_hours)).isoformat()
    
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": update_dict}
    )
    
    # Add comment for status change
    if new_status and new_status != old_status:
        comment = ComplaintComment(
            complaint_id=complaint_id,
            user_id=user["user_id"],
            user_name=user.get("name", "Staff"),
            comment=f"Status changed to {new_status}",
            status_changed_to=new_status
        )
        await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": "Complaint updated"
    }


# ==================== Comments ====================

@router.post("/comments/add")
async def add_comment(
    comment_data: AddCommentRequest,
    request: Request
):
    """Add comment to complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one({"id": comment_data.complaint_id})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    comment = ComplaintComment(
        complaint_id=comment_data.complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment=comment_data.comment,
        is_internal=comment_data.is_internal,
        status_changed_to=comment_data.status_change.value if comment_data.status_change else None
    )
    
    await db.complaint_comments.insert_one(comment.model_dump())
    
    # Update status if changed
    if comment_data.status_change:
        await db.complaints.update_one(
            {"id": comment_data.complaint_id},
            {"$set": {
                "status": comment_data.status_change.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "message": "Comment added",
        "comment": comment.model_dump()
    }


# ==================== Assignment & Escalation ====================

@router.post("/assign")
async def assign_complaint(
    request: Request,
    complaint_id: str,
    assign_to: str
):
    """Assign complaint to staff member"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": complaint_id, "tenant_id": user["tenant_id"]}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get assignee name
    assignee = await db.users.find_one({"id": assign_to}, {"_id": 0, "name": 1})
    assignee_name = assignee.get("name", "Staff") if assignee else "Staff"
    
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "assigned_to": assign_to,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "status": "acknowledged" if complaint["status"] == "open" else complaint["status"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add comment
    comment = ComplaintComment(
        complaint_id=complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment=f"Complaint assigned to {assignee_name}",
        status_changed_to="acknowledged" if complaint["status"] == "open" else None
    )
    await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": f"Complaint assigned to {assignee_name}"
    }


@router.post("/escalate")
async def escalate_complaint(
    escalate_data: EscalateComplaintRequest,
    request: Request
):
    """Escalate complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": escalate_data.complaint_id, "tenant_id": user["tenant_id"]}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Get escalation target name
    escalate_to_user = await db.users.find_one({"id": escalate_data.escalate_to}, {"_id": 0, "name": 1})
    escalate_to_name = escalate_to_user.get("name", "Manager") if escalate_to_user else "Manager"
    
    await db.complaints.update_one(
        {"id": escalate_data.complaint_id},
        {"$set": {
            "is_escalated": True,
            "escalated_to": escalate_data.escalate_to,
            "escalation_reason": escalate_data.reason,
            "assigned_to": escalate_data.escalate_to,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add comment
    comment = ComplaintComment(
        complaint_id=escalate_data.complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment=f"Escalated to {escalate_to_name}. Reason: {escalate_data.reason}",
        is_internal=True
    )
    await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": f"Complaint escalated to {escalate_to_name}"
    }


# ==================== Resolution ====================

@router.post("/resolve")
async def resolve_complaint(
    resolve_data: ResolveComplaintRequest,
    request: Request
):
    """Resolve complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": resolve_data.complaint_id, "tenant_id": user["tenant_id"]}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if complaint["status"] in ["resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Complaint is already resolved/closed")
    
    await db.complaints.update_one(
        {"id": resolve_data.complaint_id},
        {"$set": {
            "status": "resolved",
            "resolution": resolve_data.resolution,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": user["user_id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add comment
    comment = ComplaintComment(
        complaint_id=resolve_data.complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment=f"Resolution: {resolve_data.resolution}",
        status_changed_to="resolved"
    )
    await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": "Complaint resolved"
    }


@router.post("/{complaint_id}/close")
async def close_complaint(complaint_id: str, request: Request):
    """Close complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": complaint_id, "tenant_id": user["tenant_id"]}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "status": "closed",
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add comment
    comment = ComplaintComment(
        complaint_id=complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment="Complaint closed",
        status_changed_to="closed"
    )
    await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": "Complaint closed"
    }


@router.post("/{complaint_id}/reopen")
async def reopen_complaint(complaint_id: str, request: Request, reason: str = ""):
    """Reopen a resolved/closed complaint"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    complaint = await db.complaints.find_one(
        {"id": complaint_id, "tenant_id": user["tenant_id"]}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if complaint["status"] not in ["resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Only resolved/closed complaints can be reopened")
    
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "status": "reopened",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add comment
    comment = ComplaintComment(
        complaint_id=complaint_id,
        user_id=user["user_id"],
        user_name=user.get("name", "Staff"),
        comment=f"Complaint reopened. {reason}" if reason else "Complaint reopened",
        status_changed_to="reopened"
    )
    await db.complaint_comments.insert_one(comment.model_dump())
    
    return {
        "success": True,
        "message": "Complaint reopened"
    }


# ==================== Customer Feedback ====================

@router.post("/feedback")
async def submit_feedback(
    feedback_data: CustomerFeedbackRequest,
    request: Request
):
    """Submit customer satisfaction feedback"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if feedback_data.satisfaction_rating < 1 or feedback_data.satisfaction_rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    complaint = await db.complaints.find_one(
        {"id": feedback_data.complaint_id}
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    await db.complaints.update_one(
        {"id": feedback_data.complaint_id},
        {"$set": {
            "satisfaction_rating": feedback_data.satisfaction_rating,
            "feedback": feedback_data.feedback,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Feedback submitted"
    }


# ==================== Statistics ====================

@router.get("/stats/summary")
async def get_complaint_stats(
    request: Request,
    project_id: Optional[str] = None
):
    """Get complaint statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        query["project_id"] = project_id
    
    all_complaints = await db.complaints.find(query, {"_id": 0}).to_list(10000)
    
    total = len(all_complaints)
    
    # By status
    by_status = {}
    for status in ComplaintStatus:
        by_status[status.value] = len([c for c in all_complaints if c.get("status") == status.value])
    
    # By priority
    by_priority = {}
    for priority in ComplaintPriority:
        by_priority[priority.value] = len([c for c in all_complaints if c.get("priority") == priority.value])
    
    # By category
    by_category = {}
    for category in ComplaintCategory:
        by_category[category.value] = len([c for c in all_complaints if c.get("category") == category.value])
    
    # Open complaints (not resolved or closed)
    open_statuses = ["open", "acknowledged", "in_progress", "pending_customer", "reopened"]
    open_complaints = len([c for c in all_complaints if c.get("status") in open_statuses])
    
    # SLA breached
    sla_breached = len([c for c in all_complaints if c.get("sla_breached")])
    
    # Escalated
    escalated = len([c for c in all_complaints if c.get("is_escalated")])
    
    # Average resolution time (for resolved complaints)
    resolved_complaints = [c for c in all_complaints if c.get("resolved_at") and c.get("created_at")]
    avg_resolution_hours = 0
    if resolved_complaints:
        total_hours = 0
        for c in resolved_complaints:
            try:
                if isinstance(c["created_at"], str):
                    created = datetime.fromisoformat(c["created_at"].replace('Z', '+00:00'))
                else:
                    created = c["created_at"]
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                
                if isinstance(c["resolved_at"], str):
                    resolved = datetime.fromisoformat(c["resolved_at"].replace('Z', '+00:00'))
                else:
                    resolved = c["resolved_at"]
                    if resolved.tzinfo is None:
                        resolved = resolved.replace(tzinfo=timezone.utc)
                
                total_hours += (resolved - created).total_seconds() / 3600
            except Exception:
                continue  # Skip invalid datetime entries
        if total_hours > 0:
            avg_resolution_hours = round(total_hours / len(resolved_complaints), 2)
    
    # Satisfaction score
    rated = [c for c in all_complaints if c.get("satisfaction_rating")]
    avg_satisfaction = 0
    if rated:
        avg_satisfaction = round(sum(c["satisfaction_rating"] for c in rated) / len(rated), 2)
    
    return {
        "success": True,
        "stats": {
            "total": total,
            "open": open_complaints,
            "by_status": by_status,
            "by_priority": by_priority,
            "by_category": by_category,
            "sla_breached": sla_breached,
            "escalated": escalated,
            "avg_resolution_hours": avg_resolution_hours,
            "avg_satisfaction": avg_satisfaction
        }
    }
