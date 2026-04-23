from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import os

from services.google_calendar_service import GoogleCalendarService
from middleware.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar Integration"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class CalendarEventCreate(BaseModel):
    lead_id: str
    followup_type: str  # 'call', 'site_visit', 'meeting', etc.
    scheduled_time: str  # ISO datetime string
    duration_minutes: int = 60
    notes: Optional[str] = None
    client_email: Optional[str] = None  # To send calendar invite to client
    add_video_conference: bool = False

class CalendarEventUpdate(BaseModel):
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None

@router.post("/create-event")
async def create_calendar_event(
    event_data: CalendarEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a calendar event for a lead follow-up/site visit
    Automatically syncs with Google Calendar if connected
    """
    try:
        # Get lead details
        lead = await db.leads.find_one({"id": event_data.lead_id})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Get user details
        user = await db.users.find_one({"id": current_user["user_id"]})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Parse datetime
        start_time = datetime.fromisoformat(event_data.scheduled_time.replace('Z', '+00:00'))
        end_time = start_time + timedelta(minutes=event_data.duration_minutes)
        
        # Prepare event details
        event_type_labels = {
            'call': 'Phone Call',
            'site_visit': 'Site Visit',
            'meeting': 'Meeting',
            'email': 'Email Follow-up',
            'whatsapp': 'WhatsApp Follow-up'
        }
        
        event_title = f"{event_type_labels.get(event_data.followup_type, 'Follow-up')} - {lead['name']}"
        
        # Build description
        description = f"""
Lead: {lead['name']}
Phone: {lead.get('phone', 'N/A')}
Email: {lead.get('email', 'N/A')}

Type: {event_type_labels.get(event_data.followup_type, 'Follow-up')}

Notes: {event_data.notes or 'No additional notes'}

---
Created via ExlainERP Lead Management
        """.strip()
        
        # Get property/project details if available
        location = None
        if lead.get('project_id'):
            project = await db.projects.find_one({"id": lead['project_id']})
            if project:
                location = project.get('address')
                description += f"\n\nProject: {project.get('name')}\nLocation: {location}"
        
        # Prepare attendees list
        attendees = []
        if event_data.client_email:
            attendees.append(event_data.client_email)
        elif lead.get('email'):
            attendees.append(lead['email'])
        
        google_event_id = None
        meet_link = None
        calendar_link = None
        
        # Create Google Calendar event if user has Google connected
        if user.get('google_connected') and user.get('google_tokens'):
            try:
                calendar_result = await GoogleCalendarService.create_calendar_event(
                    google_tokens=user['google_tokens'],
                    summary=event_title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    attendees=attendees if attendees else None,
                    location=location,
                    add_video_conference=event_data.add_video_conference
                )
                
                google_event_id = calendar_result['event_id']
                meet_link = calendar_result.get('meet_link')
                calendar_link = calendar_result.get('event_link')
                
                # Update tokens if refreshed
                if calendar_result.get('updated_tokens'):
                    await db.users.update_one(
                        {"id": user["id"]},
                        {"$set": {"google_tokens": calendar_result['updated_tokens']}}
                    )
                
            except Exception as e:
                print(f"Google Calendar creation failed: {e}")
                # Continue without Google Calendar - save event locally
        
        # Save event to database
        event_doc = {
            "id": f"event_{datetime.now().timestamp()}",
            "lead_id": event_data.lead_id,
            "user_id": current_user["user_id"],
            "tenant_id": user.get("tenant_id"),
            "followup_type": event_data.followup_type,
            "scheduled_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_minutes": event_data.duration_minutes,
            "notes": event_data.notes,
            "google_event_id": google_event_id,
            "meet_link": meet_link,
            "calendar_link": calendar_link,
            "attendees": attendees,
            "status": "scheduled",  # scheduled, completed, cancelled
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.calendar_events.insert_one(event_doc)
        
        # Also create a follow-up record in leads
        followup_doc = {
            "id": f"followup_{datetime.now().timestamp()}",
            "lead_id": event_data.lead_id,
            "user_id": current_user["user_id"],
            "tenant_id": user.get("tenant_id"),
            "followup_type": event_data.followup_type,
            "followup_date": datetime.now(timezone.utc).isoformat(),
            "notes": event_data.notes or f"Scheduled {event_type_labels.get(event_data.followup_type)} for {start_time.strftime('%Y-%m-%d %I:%M %p')}",
            "next_followup_date": start_time.isoformat(),
            "calendar_event_id": event_doc["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.followups.insert_one(followup_doc)
        
        # Clean up MongoDB _id
        event_doc.pop("_id", None)
        
        return {
            "success": True,
            "message": "Calendar event created successfully",
            "event": event_doc,
            "google_synced": google_event_id is not None,
            "meet_link": meet_link,
            "calendar_link": calendar_link
        }
        
    except Exception as e:
        print(f"Create calendar event error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events")
async def get_calendar_events(
    view: str = "all",  # all, today, week, month, past, future
    current_user: dict = Depends(get_current_user)
):
    """Get calendar events for the current user with categorization"""
    try:
        user = await db.users.find_one({"id": current_user["user_id"]})
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        query = {"user_id": current_user["user_id"]}
        
        # Apply time filters
        if view == "today":
            query["scheduled_time"] = {
                "$gte": today_start.isoformat(),
                "$lt": today_end.isoformat()
            }
        elif view == "past":
            query["scheduled_time"] = {"$lt": now.isoformat()}
        elif view == "future":
            query["scheduled_time"] = {"$gte": today_end.isoformat()}
        elif view == "week":
            week_end = today_start + timedelta(days=7)
            query["scheduled_time"] = {
                "$gte": today_start.isoformat(),
                "$lt": week_end.isoformat()
            }
        
        events = await db.calendar_events.find(query).to_list(length=1000)
        
        # Enrich with lead details
        for event in events:
            lead = await db.leads.find_one({"id": event["lead_id"]})
            if lead:
                event["lead_name"] = lead.get("name")
                event["lead_phone"] = lead.get("phone")
                event["lead_email"] = lead.get("email")
            event.pop("_id", None)
        
        # Sort by scheduled time
        events.sort(key=lambda x: x["scheduled_time"])
        
        # Categorize events
        past_events = [e for e in events if datetime.fromisoformat(e["scheduled_time"]) < now]
        today_events = [e for e in events if today_start <= datetime.fromisoformat(e["scheduled_time"]) < today_end]
        future_events = [e for e in events if datetime.fromisoformat(e["scheduled_time"]) >= today_end]
        
        return {
            "success": True,
            "all_events": events,
            "categorized": {
                "past": {
                    "count": len(past_events),
                    "events": past_events
                },
                "today": {
                    "count": len(today_events),
                    "events": today_events
                },
                "future": {
                    "count": len(future_events),
                    "events": future_events
                }
            }
        }
        
    except Exception as e:
        print(f"Get events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/events/{event_id}")
async def update_calendar_event(
    event_id: str,
    update_data: CalendarEventUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a calendar event"""
    try:
        event = await db.calendar_events.find_one({"id": event_id, "user_id": current_user["user_id"]})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        update_fields = {}
        
        if update_data.scheduled_time:
            start_time = datetime.fromisoformat(update_data.scheduled_time.replace('Z', '+00:00'))
            duration = update_data.duration_minutes or event.get('duration_minutes', 60)
            end_time = start_time + timedelta(minutes=duration)
            
            update_fields["scheduled_time"] = start_time.isoformat()
            update_fields["end_time"] = end_time.isoformat()
            
            # Update Google Calendar if synced
            if event.get('google_event_id'):
                user = await db.users.find_one({"id": current_user["user_id"]})
                if user.get('google_tokens'):
                    try:
                        await GoogleCalendarService.update_calendar_event(
                            google_tokens=user['google_tokens'],
                            event_id=event['google_event_id'],
                            start_time=start_time,
                            end_time=end_time
                        )
                    except Exception as e:
                        print(f"Google Calendar update failed: {e}")
        
        if update_data.notes:
            update_fields["notes"] = update_data.notes
        
        if update_data.duration_minutes:
            update_fields["duration_minutes"] = update_data.duration_minutes
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.calendar_events.update_one(
            {"id": event_id},
            {"$set": update_fields}
        )
        
        return {
            "success": True,
            "message": "Event updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a calendar event"""
    try:
        event = await db.calendar_events.find_one({"id": event_id, "user_id": current_user["user_id"]})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Delete from Google Calendar if synced
        if event.get('google_event_id'):
            user = await db.users.find_one({"id": current_user["user_id"]})
            if user.get('google_tokens'):
                try:
                    await GoogleCalendarService.delete_calendar_event(
                        google_tokens=user['google_tokens'],
                        event_id=event['google_event_id']
                    )
                except Exception as e:
                    print(f"Google Calendar deletion failed: {e}")
        
        # Delete from database
        await db.calendar_events.delete_one({"id": event_id})
        
        return {
            "success": True,
            "message": "Event deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
