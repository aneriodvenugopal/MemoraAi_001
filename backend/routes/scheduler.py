from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from services.scheduler_service import SchedulerService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/scheduler", tags=["scheduler"])

def get_db(request: Request):
    return request.app.state.db

class SchedulerSettings(BaseModel):
    payment_reminder_days: int = 3
    follow_up_reminder_enabled: bool = True
    overdue_alert_enabled: bool = True
    auto_booking_confirmation: bool = True

@router.post("/run/payment-reminders")
async def run_payment_reminders(request: Request, background_tasks: BackgroundTasks):
    """Manually trigger payment reminders"""
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    
    # Run in background
    background_tasks.add_task(scheduler.send_payment_reminders)
    
    return {
        "message": "Payment reminders task started",
        "status": "running"
    }

@router.post("/run/overdue-alerts")
async def run_overdue_alerts(request: Request, background_tasks: BackgroundTasks):
    """Manually trigger overdue payment alerts"""
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    
    # Run in background
    background_tasks.add_task(scheduler.send_overdue_alerts)
    
    return {
        "message": "Overdue alerts task started",
        "status": "running"
    }

@router.post("/run/follow-up-reminders")
async def run_follow_up_reminders(request: Request, background_tasks: BackgroundTasks):
    """Manually trigger follow-up reminders"""
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    
    # Run in background
    background_tasks.add_task(scheduler.send_follow_up_reminders)
    
    return {
        "message": "Follow-up reminders task started",
        "status": "running"
    }


@router.post("/run/festival-greetings")
async def run_festival_greetings(request: Request, background_tasks: BackgroundTasks):
    """
    Manually trigger festival greetings check.
    Only sends greetings if today is Jan 26 (Republic Day) or Aug 15 (Independence Day).
    """
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    
    # Run synchronously to return results
    results = await scheduler.send_festival_greetings()
    
    return {
        "message": "Festival greetings task completed",
        "status": "completed",
        "results": results
    }


@router.post("/run/site-visit-reminders")
async def run_site_visit_reminders(request: Request):
    """
    Manually trigger site visit reminders.
    Sends SMS/WhatsApp/Email reminders for visits scheduled tomorrow.
    """
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    
    # Run synchronously to return results
    results = await scheduler.send_site_visit_reminders()
    
    return {
        "message": "Site visit reminders task completed",
        "status": "completed",
        "results": results
    }


@router.post("/run/all")
async def run_all_tasks(request: Request):
    """Run all scheduled tasks (synchronous for testing)"""
    db = get_db(request)
    
    scheduler = SchedulerService(db)
    results = await scheduler.run_all_tasks()
    
    return {
        "message": "All tasks completed",
        "results": results
    }

@router.get("/settings")
async def get_scheduler_settings(request: Request):
    """Get current scheduler settings"""
    db = get_db(request)
    
    settings = await db.scheduler_settings.find_one({}, {'_id': 0})
    
    if not settings:
        # Return default settings
        return {
            "payment_reminder_days": 3,
            "follow_up_reminder_enabled": True,
            "overdue_alert_enabled": True,
            "auto_booking_confirmation": True
        }
    
    return settings

@router.put("/settings")
async def update_scheduler_settings(settings: SchedulerSettings, request: Request):
    """Update scheduler settings"""
    db = get_db(request)
    
    # Update or insert settings
    await db.scheduler_settings.update_one(
        {},
        {'$set': settings.model_dump()},
        upsert=True
    )
    
    return {
        "message": "Scheduler settings updated",
        "settings": settings.model_dump()
    }

@router.get("/status")
async def get_scheduler_status(request: Request):
    """Get scheduler status and last run times"""
    db = get_db(request)
    
    # Get last notification logs
    last_payment_reminder = await db.notification_logs.find_one(
        {'type': 'payment_reminder'},
        {'_id': 0}
    ) or {}
    
    last_overdue_alert = await db.notification_logs.find_one(
        {'type': 'overdue_alert'},
        {'_id': 0}
    ) or {}
    
    last_follow_up = await db.notification_logs.find_one(
        {'type': 'follow_up_reminder'},
        {'_id': 0}
    ) or {}
    
    # Count pending tasks
    from datetime import datetime, timezone, timedelta
    
    today = datetime.now(timezone.utc).date().isoformat()
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=3)).isoformat()
    
    pending_reminders = await db.payment_schedules.count_documents({
        'due_date': {'$lte': tomorrow, '$gte': today},
        'status': 'pending',
        'deleted_at': None
    })
    
    overdue_count = await db.payment_schedules.count_documents({
        'due_date': {'$lt': today},
        'status': 'pending',
        'deleted_at': None
    })
    
    follow_ups_today = await db.follow_ups.count_documents({
        'scheduled_date': {
            '$gte': today,
            '$lt': (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
        },
        'completed': False,
        'deleted_at': None
    })
    
    return {
        "status": "active",
        "pending_tasks": {
            "payment_reminders": pending_reminders,
            "overdue_alerts": overdue_count,
            "follow_up_reminders": follow_ups_today
        },
        "last_run": {
            "payment_reminders": last_payment_reminder.get('created_at'),
            "overdue_alerts": last_overdue_alert.get('created_at'),
            "follow_up_reminders": last_follow_up.get('created_at')
        }
    }
