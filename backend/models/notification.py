from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class InAppNotification(BaseModel):
    """In-app notification model"""
    id: str
    user_id: str
    tenant_id: str
    title: str
    message: str
    type: str  # info, success, warning, error, payment, booking, lead, system
    priority: str = "normal"  # low, normal, high, urgent
    read: bool = False
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str
    read_at: Optional[str] = None

class InAppNotificationCreate(BaseModel):
    """Create in-app notification"""
    user_id: str
    tenant_id: str
    title: str
    message: str
    type: str
    priority: str = "normal"
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata: Optional[dict] = None

class NotificationMarkRead(BaseModel):
    """Mark notification as read"""
    notification_ids: List[str]

class NotificationPreferences(BaseModel):
    """User notification preferences"""
    user_id: str
    tenant_id: str
    email_enabled: bool = True
    sms_enabled: bool = True
    whatsapp_enabled: bool = False
    push_enabled: bool = True
    
    # Notification types
    booking_notifications: bool = True
    payment_notifications: bool = True
    lead_notifications: bool = True
    system_notifications: bool = True
    marketing_notifications: bool = False
    
    # Frequency
    instant_notifications: bool = True
    daily_digest: bool = False
    weekly_digest: bool = False
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = None  # HH:MM
    quiet_hours_end: Optional[str] = None  # HH:MM
