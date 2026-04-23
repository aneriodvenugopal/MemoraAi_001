from fastapi import APIRouter, HTTPException, Request
from models.notification import (
    InAppNotification, 
    InAppNotificationCreate, 
    NotificationMarkRead,
    NotificationPreferences
)
from middleware.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional
import uuid

router = APIRouter(prefix="/in-app-notifications", tags=["in_app_notifications"])

def get_db(request: Request):
    return request.app.state.db

@router.post("")
async def create_notification(
    notification: InAppNotificationCreate,
    request: Request
):
    """Create a new in-app notification"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Only admins can create notifications for other users
    if user.get('role') not in ['super_admin', 'tenant_admin', 'staff']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    notification_id = str(uuid.uuid4())
    notification_doc = {
        'id': notification_id,
        'user_id': notification.user_id,
        'tenant_id': notification.tenant_id,
        'title': notification.title,
        'message': notification.message,
        'type': notification.type,
        'priority': notification.priority,
        'read': False,
        'action_url': notification.action_url,
        'action_label': notification.action_label,
        'metadata': notification.metadata,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'read_at': None
    }
    
    await db.in_app_notifications.insert_one(notification_doc)
    
    return {
        "success": True,
        "notification_id": notification_id,
        "message": "Notification created successfully"
    }

@router.get("")
async def get_user_notifications(
    request: Request,
    limit: int = 50,
    unread_only: bool = False,
    notification_type: Optional[str] = None
):
    """Get notifications for current user"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Handle both 'user_id' and 'id' fields from JWT token
    user_id = user.get('user_id') or user.get('id')
    
    query = {
        'user_id': user_id,
        'tenant_id': user['tenant_id']
    }
    
    if unread_only:
        query['read'] = False
    
    if notification_type:
        query['type'] = notification_type
    
    notifications = await db.in_app_notifications.find(query, {"_id": 0}) \
        .sort('created_at', -1) \
        .limit(limit) \
        .to_list(length=limit)
    
    # Get unread count
    unread_count = await db.in_app_notifications.count_documents({
        'user_id': user_id,
        'tenant_id': user['tenant_id'],
        'read': False
    })
    
    return {
        "success": True,
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": unread_count
    }

@router.get("/unread-count")
async def get_unread_count(request: Request):
    """Get count of unread notifications"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Handle both 'user_id' and 'id' fields from JWT token
    user_id = user.get('user_id') or user.get('id')
    
    count = await db.in_app_notifications.count_documents({
        'user_id': user_id,
        'tenant_id': user['tenant_id'],
        'read': False
    })
    
    return {
        "success": True,
        "unread_count": count
    }

@router.post("/mark-read")
async def mark_notifications_read(
    mark_read: NotificationMarkRead,
    request: Request
):
    """Mark notifications as read"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.in_app_notifications.update_many(
        {
            'id': {'$in': mark_read.notification_ids},
            'user_id': user['user_id'],
            'tenant_id': user['tenant_id']
        },
        {
            '$set': {
                'read': True,
                'read_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "marked_read": result.modified_count
    }

@router.post("/mark-all-read")
async def mark_all_read(request: Request):
    """Mark all notifications as read for current user"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.in_app_notifications.update_many(
        {
            'user_id': user['user_id'],
            'tenant_id': user['tenant_id'],
            'read': False
        },
        {
            '$set': {
                'read': True,
                'read_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "marked_read": result.modified_count
    }

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    request: Request
):
    """Delete a notification"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.in_app_notifications.delete_one({
        'id': notification_id,
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {
        "success": True,
        "message": "Notification deleted"
    }

@router.get("/preferences")
async def get_notification_preferences(request: Request):
    """Get user notification preferences"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    prefs = await db.notification_preferences.find_one({
        'user_id': user['user_id'],
        'tenant_id': user['tenant_id']
    }, {"_id": 0})
    
    if not prefs:
        # Return default preferences
        prefs = {
            'user_id': user['user_id'],
            'tenant_id': user['tenant_id'],
            'email_enabled': True,
            'sms_enabled': True,
            'whatsapp_enabled': False,
            'push_enabled': True,
            'booking_notifications': True,
            'payment_notifications': True,
            'lead_notifications': True,
            'system_notifications': True,
            'marketing_notifications': False,
            'instant_notifications': True,
            'daily_digest': False,
            'weekly_digest': False,
            'quiet_hours_enabled': False,
            'quiet_hours_start': None,
            'quiet_hours_end': None
        }
    
    return {
        "success": True,
        "preferences": prefs
    }

@router.put("/preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    request: Request
):
    """Update user notification preferences"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Ensure user can only update their own preferences
    if preferences.user_id != user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    prefs_dict = preferences.dict()
    prefs_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.notification_preferences.update_one(
        {
            'user_id': user['user_id'],
            'tenant_id': user['tenant_id']
        },
        {'$set': prefs_dict},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Preferences updated successfully"
    }
