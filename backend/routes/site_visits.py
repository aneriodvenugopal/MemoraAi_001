"""
Site Visit Management Routes
- Schedule, assign, track site visits
- Simple workflow: Schedule -> Confirm -> Complete/Cancel
- Track outcomes and follow-ups
- Google Calendar integration for scheduling
"""
from fastapi import APIRouter, HTTPException, Request, Query
from models.site_visit import (
    SiteVisit, SiteVisitCreate, SiteVisitUpdate,
    SiteVisitComplete, SiteVisitCancel, VisitStatus, VisitOutcome
)
from middleware.auth import get_current_user
from services.google_calendar_service import GoogleCalendarService
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid

router = APIRouter(prefix="/site-visits", tags=["site-visits"])


def get_db(request: Request):
    return request.app.state.db


async def sync_visit_to_calendar(db, visit: dict, user: dict, project: dict):
    """
    Sync a site visit to Google Calendar if user has Google connected.
    Returns calendar event details or None if not synced.
    """
    try:
        # Check if user has Google Calendar connected
        user_full = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
        
        if not user_full or not user_full.get("google_connected") or not user_full.get("google_tokens"):
            return None
        
        # Parse date and time
        date_str = visit.get("scheduled_date")
        time_str = visit.get("scheduled_time", "10:00")
        duration = visit.get("duration_minutes", 60)
        
        # Create datetime objects
        start_time = datetime.fromisoformat(f"{date_str}T{time_str}:00")
        end_time = start_time + timedelta(minutes=duration)
        
        # Build event details
        summary = f"🏠 Site Visit - {visit.get('visitor_name', 'Customer')}"
        
        description = f"""
Site Visit Details
==================
Visitor: {visit.get('visitor_name', 'N/A')}
Phone: {visit.get('visitor_mobile', 'N/A')}
Email: {visit.get('visitor_email', 'N/A')}

Project: {project.get('name', 'N/A')}
Duration: {duration} minutes

Notes: {visit.get('staff_notes', 'No additional notes')}

---
Created via ExlainERP Site Visit Management
Visit ID: {visit.get('id')}
        """.strip()
        
        # Get project address for location
        location = project.get("address", project.get("name"))
        
        # Attendees - add visitor email if available
        attendees = []
        if visit.get("visitor_email"):
            attendees.append(visit["visitor_email"])
        
        # Create calendar event
        result = await GoogleCalendarService.create_calendar_event(
            google_tokens=user_full["google_tokens"],
            summary=summary,
            description=description,
            start_time=start_time,
            end_time=end_time,
            attendees=attendees if attendees else None,
            location=location,
            add_video_conference=False  # Site visits are in-person
        )
        
        # Update tokens if refreshed
        if result.get("updated_tokens"):
            await db.users.update_one(
                {"id": user["user_id"]},
                {"$set": {"google_tokens": result["updated_tokens"]}}
            )
        
        return {
            "synced": True,
            "google_event_id": result.get("event_id"),
            "calendar_link": result.get("event_link")
        }
        
    except Exception as e:
        print(f"Calendar sync failed: {e}")
        return {"synced": False, "error": str(e)}


# ==================== LIST & GET ====================

@router.get("")
async def get_site_visits(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get site visits with optional filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        query["project_id"] = project_id
    
    if status:
        query["status"] = status
    
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    # Date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["scheduled_date"] = date_query
    
    visits = await db.site_visits.find(
        query, {"_id": 0}
    ).sort([("scheduled_date", 1), ("scheduled_time", 1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.site_visits.count_documents(query)
    
    return {
        "success": True,
        "visits": visits,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/today")
async def get_today_visits(request: Request):
    """Get today's scheduled visits"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    visits = await db.site_visits.find(
        {
            "tenant_id": user["tenant_id"],
            "scheduled_date": today,
            "status": {"$in": ["scheduled", "confirmed", "in_progress"]}
        },
        {"_id": 0}
    ).sort("scheduled_time", 1).to_list(100)
    
    return {
        "success": True,
        "date": today,
        "visits": visits,
        "count": len(visits)
    }


@router.get("/upcoming")
async def get_upcoming_visits(
    request: Request,
    days: int = 7
):
    """Get upcoming visits for next N days"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    today = datetime.now(timezone.utc)
    end_date = today + timedelta(days=days)
    
    visits = await db.site_visits.find(
        {
            "tenant_id": user["tenant_id"],
            "scheduled_date": {
                "$gte": today.strftime("%Y-%m-%d"),
                "$lte": end_date.strftime("%Y-%m-%d")
            },
            "status": {"$in": ["scheduled", "confirmed"]}
        },
        {"_id": 0}
    ).sort([("scheduled_date", 1), ("scheduled_time", 1)]).to_list(200)
    
    return {
        "success": True,
        "from_date": today.strftime("%Y-%m-%d"),
        "to_date": end_date.strftime("%Y-%m-%d"),
        "visits": visits,
        "count": len(visits)
    }


@router.get("/my-visits")
async def get_my_visits(
    request: Request,
    status: Optional[str] = None
):
    """Get visits assigned to current user"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {
        "tenant_id": user["tenant_id"],
        "assigned_to": user["user_id"]
    }
    
    if status:
        query["status"] = status
    else:
        # Default to active visits
        query["status"] = {"$in": ["scheduled", "confirmed", "in_progress"]}
    
    visits = await db.site_visits.find(
        query, {"_id": 0}
    ).sort([("scheduled_date", 1), ("scheduled_time", 1)]).to_list(100)
    
    return {
        "success": True,
        "visits": visits,
        "count": len(visits)
    }


@router.get("/stats")
async def get_visit_stats(
    request: Request,
    project_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get site visit statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        query["project_id"] = project_id
    
    if date_from:
        query["scheduled_date"] = {"$gte": date_from}
    if date_to:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = date_to
        else:
            query["scheduled_date"] = {"$lte": date_to}
    
    # Get counts by status
    total = await db.site_visits.count_documents(query)
    
    status_counts = {}
    for status in VisitStatus:
        status_query = {**query, "status": status.value}
        status_counts[status.value] = await db.site_visits.count_documents(status_query)
    
    # Get outcome counts for completed visits
    outcome_counts = {}
    completed_query = {**query, "status": "completed"}
    for outcome in VisitOutcome:
        outcome_query = {**completed_query, "outcome": outcome.value}
        outcome_counts[outcome.value] = await db.site_visits.count_documents(outcome_query)
    
    # Conversion rate
    completed = status_counts.get("completed", 0)
    booking_initiated = outcome_counts.get("booking_initiated", 0)
    conversion_rate = (booking_initiated / completed * 100) if completed > 0 else 0
    
    return {
        "success": True,
        "total": total,
        "by_status": status_counts,
        "by_outcome": outcome_counts,
        "conversion_rate": round(conversion_rate, 1),
        "followup_required": await db.site_visits.count_documents({**query, "followup_required": True})
    }


@router.get("/{visit_id}")
async def get_site_visit(visit_id: str, request: Request):
    """Get single site visit details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    visit = await db.site_visits.find_one(
        {"id": visit_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Get project details
    project = await db.projects.find_one(
        {"id": visit["project_id"]},
        {"_id": 0, "id": 1, "name": 1}
    )
    
    # Get assigned staff details
    staff = await db.users.find_one(
        {"id": visit["assigned_to"]},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    )
    
    return {
        "success": True,
        "visit": visit,
        "project": project,
        "assigned_staff": staff
    }


# ==================== CREATE ====================

@router.post("")
async def create_site_visit(
    visit_data: SiteVisitCreate,
    request: Request,
    sync_calendar: bool = True  # Optional param to sync with Google Calendar
):
    """
    Schedule a new site visit.
    If user has Google Calendar connected and sync_calendar=True,
    automatically creates a calendar event.
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate project exists
    project = await db.projects.find_one(
        {"id": visit_data.project_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate assigned staff exists
    staff = await db.users.find_one(
        {"id": visit_data.assigned_to, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1}
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Assigned staff not found")
    
    # Create visit
    visit = SiteVisit(
        tenant_id=user["tenant_id"],
        project_id=visit_data.project_id,
        visitor_type=visit_data.visitor_type,
        lead_id=visit_data.lead_id,
        customer_id=visit_data.customer_id,
        visitor_name=visit_data.visitor_name,
        visitor_mobile=visit_data.visitor_mobile,
        visitor_email=visit_data.visitor_email,
        scheduled_date=visit_data.scheduled_date,
        scheduled_time=visit_data.scheduled_time,
        duration_minutes=visit_data.duration_minutes,
        assigned_to=visit_data.assigned_to,
        assigned_to_name=staff["name"],
        staff_notes=visit_data.staff_notes,
        created_by=user["user_id"]
    )
    
    visit_dict = visit.model_dump()
    
    # Sync to Google Calendar if requested
    calendar_result = None
    if sync_calendar:
        calendar_result = await sync_visit_to_calendar(db, visit_dict, user, project)
        
        if calendar_result and calendar_result.get("synced"):
            visit_dict["google_event_id"] = calendar_result.get("google_event_id")
            visit_dict["calendar_link"] = calendar_result.get("calendar_link")
    
    await db.site_visits.insert_one(visit_dict)
    
    # If linked to a lead, update lead status
    if visit_data.lead_id:
        await db.leads.update_one(
            {"id": visit_data.lead_id},
            {"$set": {
                "status": "site_visit_scheduled",
                "last_activity": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # Remove MongoDB _id before returning
    visit_dict.pop("_id", None)
    
    return {
        "success": True,
        "visit": visit_dict,
        "message": f"Site visit scheduled for {visit_data.scheduled_date} at {visit_data.scheduled_time}",
        "calendar_synced": calendar_result.get("synced") if calendar_result else False,
        "calendar_link": calendar_result.get("calendar_link") if calendar_result else None
    }


# ==================== UPDATE ====================

@router.put("/{visit_id}")
async def update_site_visit(
    visit_id: str,
    update_data: SiteVisitUpdate,
    request: Request
):
    """Update site visit details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get existing visit
    visit = await db.site_visits.find_one(
        {"id": visit_id, "tenant_id": user["tenant_id"]}
    )
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Can't update completed/cancelled visits
    if visit["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot update {visit['status']} visit")
    
    # Build update dict
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.scheduled_date:
        update_dict["scheduled_date"] = update_data.scheduled_date
    if update_data.scheduled_time:
        update_dict["scheduled_time"] = update_data.scheduled_time
    if update_data.duration_minutes:
        update_dict["duration_minutes"] = update_data.duration_minutes
    if update_data.staff_notes:
        update_dict["staff_notes"] = update_data.staff_notes
    
    if update_data.assigned_to:
        # Validate new staff
        staff = await db.users.find_one(
            {"id": update_data.assigned_to, "tenant_id": user["tenant_id"]},
            {"_id": 0, "id": 1, "name": 1}
        )
        if not staff:
            raise HTTPException(status_code=404, detail="Assigned staff not found")
        update_dict["assigned_to"] = update_data.assigned_to
        update_dict["assigned_to_name"] = staff["name"]
    
    if update_data.status:
        update_dict["status"] = update_data.status.value
    
    await db.site_visits.update_one(
        {"id": visit_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": "Visit updated"}


@router.post("/{visit_id}/confirm")
async def confirm_site_visit(visit_id: str, request: Request):
    """Confirm a scheduled visit"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.site_visits.update_one(
        {
            "id": visit_id,
            "tenant_id": user["tenant_id"],
            "status": "scheduled"
        },
        {"$set": {
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Visit not found or cannot be confirmed")
    
    return {"success": True, "message": "Visit confirmed"}


@router.post("/{visit_id}/start")
async def start_site_visit(visit_id: str, request: Request):
    """Mark visit as in progress"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.site_visits.update_one(
        {
            "id": visit_id,
            "tenant_id": user["tenant_id"],
            "status": {"$in": ["scheduled", "confirmed"]}
        },
        {"$set": {
            "status": "in_progress",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Visit not found or cannot be started")
    
    return {"success": True, "message": "Visit started"}


@router.post("/{visit_id}/complete")
async def complete_site_visit(
    visit_id: str,
    complete_data: SiteVisitComplete,
    request: Request
):
    """Complete a site visit with outcome"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get visit
    visit = await db.site_visits.find_one(
        {"id": visit_id, "tenant_id": user["tenant_id"]}
    )
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Visit already {visit['status']}")
    
    # Update visit
    update_dict = {
        "status": "completed",
        "outcome": complete_data.outcome.value,
        "feedback": complete_data.feedback,
        "staff_notes": complete_data.staff_notes,
        "properties_shown": complete_data.properties_shown,
        "followup_required": complete_data.followup_required,
        "followup_date": complete_data.followup_date,
        "followup_notes": complete_data.followup_notes,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.site_visits.update_one(
        {"id": visit_id},
        {"$set": update_dict}
    )
    
    # Update lead status based on outcome
    if visit.get("lead_id"):
        lead_status = "site_visit_done"
        if complete_data.outcome == VisitOutcome.BOOKING_INITIATED:
            lead_status = "negotiation"
        elif complete_data.outcome == VisitOutcome.NOT_INTERESTED:
            lead_status = "lost"
        
        await db.leads.update_one(
            {"id": visit["lead_id"]},
            {"$set": {
                "status": lead_status,
                "last_activity": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "message": "Visit completed",
        "outcome": complete_data.outcome.value
    }


@router.post("/{visit_id}/cancel")
async def cancel_site_visit(
    visit_id: str,
    cancel_data: SiteVisitCancel,
    request: Request
):
    """Cancel a site visit"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get visit
    visit = await db.site_visits.find_one(
        {"id": visit_id, "tenant_id": user["tenant_id"]}
    )
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Visit already {visit['status']}")
    
    # If rescheduling, create new visit
    new_visit_id = None
    if cancel_data.reschedule_date and cancel_data.reschedule_time:
        new_visit = SiteVisit(
            tenant_id=user["tenant_id"],
            project_id=visit["project_id"],
            visitor_type=visit["visitor_type"],
            lead_id=visit.get("lead_id"),
            customer_id=visit.get("customer_id"),
            visitor_name=visit["visitor_name"],
            visitor_mobile=visit["visitor_mobile"],
            visitor_email=visit.get("visitor_email"),
            scheduled_date=cancel_data.reschedule_date,
            scheduled_time=cancel_data.reschedule_time,
            duration_minutes=visit["duration_minutes"],
            assigned_to=visit["assigned_to"],
            assigned_to_name=visit["assigned_to_name"],
            staff_notes=f"Rescheduled from {visit['scheduled_date']}. {visit.get('staff_notes', '')}",
            created_by=user["user_id"]
        )
        
        await db.site_visits.insert_one(new_visit.model_dump())
        new_visit_id = new_visit.id
    
    # Update original visit
    update_dict = {
        "status": "rescheduled" if new_visit_id else "cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancellation_reason": cancel_data.cancellation_reason,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.site_visits.update_one(
        {"id": visit_id},
        {"$set": update_dict}
    )
    
    return {
        "success": True,
        "message": "Visit rescheduled" if new_visit_id else "Visit cancelled",
        "new_visit_id": new_visit_id
    }


@router.post("/{visit_id}/no-show")
async def mark_no_show(visit_id: str, request: Request):
    """Mark visitor as no-show"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.site_visits.update_one(
        {
            "id": visit_id,
            "tenant_id": user["tenant_id"],
            "status": {"$in": ["scheduled", "confirmed", "in_progress"]}
        },
        {"$set": {
            "status": "no_show",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Visit not found or invalid status")
    
    return {"success": True, "message": "Marked as no-show"}


# ==================== DELETE ====================

@router.delete("/{visit_id}")
async def delete_site_visit(visit_id: str, request: Request):
    """Delete a site visit (admin only)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can delete visits")
    
    # Get visit to check for Google Calendar event
    visit = await db.site_visits.find_one({"id": visit_id, "tenant_id": user["tenant_id"]})
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # Delete from Google Calendar if synced
    if visit.get("google_event_id"):
        try:
            user_full = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
            if user_full and user_full.get("google_tokens"):
                await GoogleCalendarService.delete_calendar_event(
                    user_full["google_tokens"],
                    visit["google_event_id"]
                )
        except Exception as e:
            print(f"Failed to delete calendar event: {e}")
    
    result = await db.site_visits.delete_one({"id": visit_id})
    
    return {"success": True, "message": "Visit deleted"}


# ==================== CALENDAR INTEGRATION ====================

@router.get("/calendar/status")
async def get_calendar_status(request: Request):
    """Check if current user has Google Calendar connected"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_full = await db.users.find_one({"id": user["user_id"]}, {"_id": 0})
    
    return {
        "success": True,
        "calendar_connected": bool(user_full.get("google_connected")),
        "google_email": user_full.get("google_email"),
        "message": "Google Calendar is connected" if user_full.get("google_connected") else "Google Calendar not connected. Connect in Settings."
    }


@router.post("/{visit_id}/sync-calendar")
async def sync_visit_to_calendar_endpoint(visit_id: str, request: Request):
    """
    Manually sync a site visit to Google Calendar.
    Use this for visits that weren't synced during creation.
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get visit
    visit = await db.site_visits.find_one(
        {"id": visit_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit.get("google_event_id"):
        return {
            "success": True,
            "message": "Visit already synced to calendar",
            "calendar_link": visit.get("calendar_link")
        }
    
    # Get project
    project = await db.projects.find_one(
        {"id": visit["project_id"]},
        {"_id": 0}
    )
    
    if not project:
        project = {"name": "Unknown Project"}
    
    # Sync to calendar
    result = await sync_visit_to_calendar(db, visit, user, project)
    
    if result and result.get("synced"):
        # Update visit with calendar info
        await db.site_visits.update_one(
            {"id": visit_id},
            {"$set": {
                "google_event_id": result.get("google_event_id"),
                "calendar_link": result.get("calendar_link"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Visit synced to Google Calendar",
            "calendar_link": result.get("calendar_link")
        }
    else:
        error_msg = result.get("error") if result else "Google Calendar not connected"
        raise HTTPException(
            status_code=400,
            detail=f"Failed to sync to calendar: {error_msg}"
        )

