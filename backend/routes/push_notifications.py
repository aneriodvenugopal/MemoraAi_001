"""
Push Notification and WhatsApp Auto-Reply Routes
- Web push subscription management
- Notification preferences
- WhatsApp webhook for auto-replies
"""
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from middleware.auth import get_current_user
from services.web_push_service import WebPushService, NotificationPreferences
from services.whatsapp_auto_reply import WhatsAppAutoReplyService
import uuid

router = APIRouter(prefix="/push-notifications", tags=["Push Notifications"])


def get_db(request: Request):
    return request.app.state.db


# ==================== PYDANTIC MODELS ====================

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # p256dh, auth
    device_info: Optional[Dict[str, Any]] = None


class NotificationPrefsUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    sms_fallback_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    payment_reminders: Optional[bool] = None
    booking_updates: Optional[bool] = None
    site_visit_reminders: Optional[bool] = None
    promotional: Optional[bool] = None
    system_updates: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_start: Optional[str] = None
    quiet_end: Optional[str] = None


class SendNotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    icon: Optional[str] = None
    tag: Optional[str] = None
    use_sms_fallback: bool = True


class WhatsAppWebhookPayload(BaseModel):
    sender_phone: str
    message: str
    message_type: str = "text"
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ==================== PUSH SUBSCRIPTION ENDPOINTS ====================

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for frontend subscription"""
    return {
        "success": True,
        "vapid_public_key": WebPushService.get_vapid_public_key()
    }


@router.post("/subscribe")
async def subscribe_to_push(
    subscription: PushSubscription,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    db = get_db(request)
    
    result = await WebPushService.save_subscription(
        db=db,
        user_id=current_user["user_id"],
        subscription_info=subscription.dict(),
        device_info=subscription.device_info
    )
    
    return result


@router.post("/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    db = get_db(request)
    
    result = await WebPushService.remove_subscription(
        db=db,
        user_id=current_user["user_id"],
        endpoint=endpoint
    )
    
    return result


@router.get("/subscriptions")
async def get_my_subscriptions(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get user's push subscriptions"""
    db = get_db(request)
    
    subscriptions = await db.push_subscriptions.find(
        {"user_id": current_user["user_id"], "is_active": True},
        {"_id": 0, "id": 1, "device_info": 1, "created_at": 1, "last_used_at": 1}
    ).to_list(length=10)
    
    return {
        "success": True,
        "subscriptions": subscriptions,
        "count": len(subscriptions)
    }


# ==================== NOTIFICATION PREFERENCES ====================

@router.get("/preferences")
async def get_notification_preferences(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get user's notification preferences"""
    db = get_db(request)
    
    prefs = await NotificationPreferences.get_preferences(
        db=db,
        user_id=current_user["user_id"]
    )
    
    return {
        "success": True,
        "preferences": prefs
    }


@router.put("/preferences")
async def update_notification_preferences(
    prefs: NotificationPrefsUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    db = get_db(request)
    
    # Filter out None values
    prefs_dict = {k: v for k, v in prefs.dict().items() if v is not None}
    
    result = await NotificationPreferences.update_preferences(
        db=db,
        user_id=current_user["user_id"],
        preferences=prefs_dict
    )
    
    return result


# ==================== SEND NOTIFICATIONS ====================

@router.post("/send")
async def send_push_notification(
    notification: SendNotificationRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send push notification to a user (admin only)"""
    db = get_db(request)
    
    # Check if user is admin
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get target user's phone for SMS fallback
    target_user = await db.users.find_one(
        {"id": notification.user_id},
        {"_id": 0, "phone": 1}
    )
    
    phone = target_user.get("phone") if target_user else None
    
    if notification.use_sms_fallback and phone:
        # Use fallback system
        from services.notification_service import NotificationService
        notification_service = NotificationService()
        
        result = await WebPushService.send_notification_with_fallback(
            db=db,
            user_id=notification.user_id,
            title=notification.title,
            body=notification.body,
            phone=phone,
            notification_service=notification_service,
            data=notification.data,
            icon=notification.icon,
            tag=notification.tag
        )
    else:
        # Push only
        result = await WebPushService.send_push_notification(
            db=db,
            user_id=notification.user_id,
            title=notification.title,
            body=notification.body,
            data=notification.data,
            icon=notification.icon,
            tag=notification.tag
        )
    
    return {
        "success": True,
        "result": result
    }


@router.post("/test")
async def test_push_notification(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Send a test push notification to yourself"""
    db = get_db(request)
    
    result = await WebPushService.send_push_notification(
        db=db,
        user_id=current_user["user_id"],
        title="🔔 Test Notification",
        body="Push notifications are working! You'll receive important updates here.",
        data={"type": "test", "timestamp": datetime.now(timezone.utc).isoformat()}
    )
    
    return {
        "success": True,
        "message": "Test notification sent" if result.get("success") else "No push subscription found",
        "result": result
    }


# ==================== WHATSAPP AUTO-REPLY WEBHOOK ====================

whatsapp_router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Integration"])


@whatsapp_router.post("/webhook")
async def whatsapp_webhook(
    payload: WhatsAppWebhookPayload,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Webhook endpoint for incoming WhatsApp messages.
    Generates auto-reply and captures leads.
    
    This endpoint should be configured in your WhatsApp provider (Gupshup/Meta).
    """
    db = get_db(request)
    
    # Get tenant config (for multi-tenant, you'd identify tenant from phone number or webhook config)
    # For now, use default config
    tenant_config = {
        'company_name': 'RealApex',
        'website_url': 'https://realapex.in',
        'emergency_phone': '+91-9999999999',
        'default_project_name': 'Premium Plots',
        'starting_price': '25,00,000',
        'down_payment_percent': '30',
        'project_location': 'Hyderabad',
        'landmark': 'Near ORR',
        'booking_amount': '₹50,000',
        'emi_starting': '25,000',
    }
    
    # Generate auto-reply
    reply_data = await WhatsAppAutoReplyService.generate_auto_reply(
        message=payload.message,
        sender_phone=payload.sender_phone,
        tenant_config=tenant_config,
        db=db
    )
    
    # Log incoming message
    message_log = {
        "id": str(uuid.uuid4()),
        "direction": "incoming",
        "sender_phone": payload.sender_phone,
        "message": payload.message,
        "message_type": payload.message_type,
        "intent_detected": reply_data.get("intent"),
        "auto_reply_sent": True,
        "reply_template": reply_data.get("template_used"),
        "lead_captured": reply_data.get("lead_captured"),
        "lead_id": reply_data.get("lead_id"),
        "timestamp": payload.timestamp or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    background_tasks.add_task(
        db.whatsapp_messages.insert_one,
        message_log
    )
    
    # Return reply to be sent (WhatsApp provider will handle actual sending)
    return {
        "success": True,
        "reply": reply_data.get("reply_message"),
        "quick_replies": WhatsAppAutoReplyService.get_quick_replies(reply_data.get("intent")),
        "intent": reply_data.get("intent"),
        "lead_captured": reply_data.get("lead_captured"),
        "lead_id": reply_data.get("lead_id")
    }


@whatsapp_router.get("/auto-reply/templates")
async def get_auto_reply_templates():
    """Get all auto-reply templates for configuration"""
    return {
        "success": True,
        "templates": WhatsAppAutoReplyService.TEMPLATES,
        "keyword_patterns": WhatsAppAutoReplyService.KEYWORD_PATTERNS
    }


@whatsapp_router.get("/messages")
async def get_whatsapp_messages(
    request: Request,
    phone: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get WhatsApp message history"""
    db = get_db(request)
    
    query = {}
    if phone:
        query["sender_phone"] = phone
    if direction:
        query["direction"] = direction
    
    messages = await db.whatsapp_messages.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.whatsapp_messages.count_documents(query)
    
    return {
        "success": True,
        "messages": messages,
        "total": total
    }


@whatsapp_router.get("/stats")
async def get_whatsapp_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get WhatsApp messaging statistics"""
    db = get_db(request)
    
    total_messages = await db.whatsapp_messages.count_documents({})
    incoming = await db.whatsapp_messages.count_documents({"direction": "incoming"})
    outgoing = await db.whatsapp_messages.count_documents({"direction": "outgoing"})
    leads_captured = await db.whatsapp_messages.count_documents({"lead_captured": True})
    
    # Intent breakdown
    intent_pipeline = [
        {"$match": {"direction": "incoming"}},
        {"$group": {"_id": "$intent_detected", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    intent_stats = await db.whatsapp_messages.aggregate(intent_pipeline).to_list(length=20)
    
    return {
        "success": True,
        "stats": {
            "total_messages": total_messages,
            "incoming": incoming,
            "outgoing": outgoing,
            "leads_captured": leads_captured,
            "by_intent": [{"intent": i["_id"], "count": i["count"]} for i in intent_stats]
        }
    }
