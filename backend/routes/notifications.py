from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from services.notification_service import NotificationService, NotificationChannel
from services.notification_templates import NotificationTemplates
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["notifications"])

def get_db(request: Request):
    return request.app.state.db

# Pydantic Models
class SendSMSRequest(BaseModel):
    phone: str
    message: str

class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str
    html: bool = True

class SendWhatsAppRequest(BaseModel):
    phone: str
    message: str

class SendBookingConfirmationRequest(BaseModel):
    customer_email: EmailStr
    customer_phone: str
    customer_name: str
    property_name: str
    booking_id: str
    booking_date: str
    total_amount: float
    booking_amount: float
    payment_plan: str
    send_sms: bool = True
    send_email: bool = True
    send_whatsapp: bool = False

class SendPaymentReminderRequest(BaseModel):
    customer_email: Optional[EmailStr] = None
    customer_phone: str
    customer_name: str
    property_name: str
    amount: float
    due_date: str
    overdue_days: int = 0
    send_sms: bool = True
    send_email: bool = True
    send_whatsapp: bool = False

class SendPaymentReceiptRequest(BaseModel):
    customer_email: EmailStr
    customer_name: str
    property_name: str
    payment_date: str
    amount: float
    payment_mode: str
    receipt_no: str
    balance_amount: float

class NotificationConfigUpdate(BaseModel):
    sms_enabled: bool = True
    email_enabled: bool = True
    whatsapp_enabled: bool = False
    auto_payment_reminders: bool = True
    auto_follow_up_reminders: bool = True
    reminder_days_before: int = 3


# Initialize notification service
notification_service = NotificationService()

@router.post("/send-sms")
async def send_sms(request: SendSMSRequest, background_tasks: BackgroundTasks, req: Request):
    """Send a custom SMS"""
    db = get_db(req)
    
    try:
        response = await notification_service.send_sms(request.phone, request.message)
        
        # Log notification in background
        background_tasks.add_task(
            notification_service.log_notification,
            db,
            request.phone,
            NotificationChannel.SMS.value,
            "custom",
            request.message,
            response
        )
        
        return {
            "success": response.get('success'),
            "message": "SMS sent successfully" if response.get('success') else "Failed to send SMS",
            "details": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-email")
async def send_email(request: SendEmailRequest, background_tasks: BackgroundTasks, req: Request):
    """Send a custom email"""
    db = get_db(req)
    
    try:
        response = await notification_service.send_email(
            request.to,
            request.subject,
            request.body,
            request.html
        )
        
        # Log notification in background
        background_tasks.add_task(
            notification_service.log_notification,
            db,
            request.to,
            NotificationChannel.EMAIL.value,
            "custom",
            f"Subject: {request.subject}",
            response
        )
        
        return {
            "success": response.get('success'),
            "message": "Email sent successfully" if response.get('success') else "Failed to send email",
            "details": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-booking-confirmation")
async def send_booking_confirmation(
    request: SendBookingConfirmationRequest,
    background_tasks: BackgroundTasks,
    req: Request
):
    """Send booking confirmation via multiple channels"""
    db = get_db(req)
    results = []
    
    try:
        # Send SMS
        if request.send_sms:
            sms_message = NotificationTemplates.get_booking_confirmation_sms(
                request.customer_name,
                request.property_name,
                request.booking_id
            )
            sms_response = await notification_service.send_sms(request.customer_phone, sms_message)
            results.append({"channel": "sms", "success": sms_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_phone,
                NotificationChannel.SMS.value,
                "booking_confirmation",
                sms_message,
                sms_response
            )
        
        # Send Email
        if request.send_email:
            email_html = NotificationTemplates.get_booking_confirmation_email_html(
                request.customer_name,
                request.property_name,
                request.booking_id,
                request.booking_date,
                request.total_amount,
                request.booking_amount,
                request.payment_plan
            )
            email_response = await notification_service.send_email(
                request.customer_email,
                f"Booking Confirmed - {request.property_name}",
                email_html,
                html=True
            )
            results.append({"channel": "email", "success": email_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_email,
                NotificationChannel.EMAIL.value,
                "booking_confirmation",
                f"Booking ID: {request.booking_id}",
                email_response
            )
        
        # Send WhatsApp
        if request.send_whatsapp:
            wa_message = f"Dear {request.customer_name}, your booking for {request.property_name} is confirmed! Booking ID: {request.booking_id}"
            wa_response = await notification_service.send_whatsapp(request.customer_phone, wa_message)
            results.append({"channel": "whatsapp", "success": wa_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_phone,
                NotificationChannel.WHATSAPP.value,
                "booking_confirmation",
                wa_message,
                wa_response
            )
        
        return {
            "success": all(r.get('success', False) for r in results),
            "message": "Booking confirmation sent",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-payment-reminder")
async def send_payment_reminder(
    request: SendPaymentReminderRequest,
    background_tasks: BackgroundTasks,
    req: Request
):
    """Send payment reminder via multiple channels"""
    db = get_db(req)
    results = []
    
    try:
        # Send SMS
        if request.send_sms:
            sms_message = NotificationTemplates.get_payment_reminder_sms(
                request.customer_name,
                request.amount,
                request.due_date,
                request.property_name
            )
            sms_response = await notification_service.send_sms(request.customer_phone, sms_message)
            results.append({"channel": "sms", "success": sms_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_phone,
                NotificationChannel.SMS.value,
                "payment_reminder",
                sms_message,
                sms_response
            )
        
        # Send Email
        if request.send_email and request.customer_email:
            email_html = NotificationTemplates.get_payment_reminder_email_html(
                request.customer_name,
                request.property_name,
                request.due_date,
                request.amount,
                request.overdue_days
            )
            email_response = await notification_service.send_email(
                request.customer_email,
                f"{'URGENT: ' if request.overdue_days > 0 else ''}Payment Reminder - {request.property_name}",
                email_html,
                html=True
            )
            results.append({"channel": "email", "success": email_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_email,
                NotificationChannel.EMAIL.value,
                "payment_reminder",
                f"Amount: ₹{request.amount}",
                email_response
            )
        
        # Send WhatsApp
        if request.send_whatsapp:
            wa_message = f"Dear {request.customer_name}, reminder: Payment of ₹{request.amount:,.2f} for {request.property_name} is due on {request.due_date}."
            wa_response = await notification_service.send_whatsapp(request.customer_phone, wa_message)
            results.append({"channel": "whatsapp", "success": wa_response.get('success')})
            
            background_tasks.add_task(
                notification_service.log_notification,
                db,
                request.customer_phone,
                NotificationChannel.WHATSAPP.value,
                "payment_reminder",
                wa_message,
                wa_response
            )
        
        return {
            "success": all(r.get('success', False) for r in results),
            "message": "Payment reminder sent",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-payment-receipt")
async def send_payment_receipt(
    request: SendPaymentReceiptRequest,
    background_tasks: BackgroundTasks,
    req: Request
):
    """Send payment receipt via email"""
    db = get_db(req)
    
    try:
        email_html = NotificationTemplates.get_payment_receipt_email_html(
            request.customer_name,
            request.property_name,
            request.payment_date,
            request.amount,
            request.payment_mode,
            request.receipt_no,
            request.balance_amount
        )
        
        response = await notification_service.send_email(
            request.customer_email,
            f"Payment Receipt - {request.receipt_no}",
            email_html,
            html=True
        )
        
        background_tasks.add_task(
            notification_service.log_notification,
            db,
            request.customer_email,
            NotificationChannel.EMAIL.value,
            "payment_receipt",
            f"Receipt: {request.receipt_no}, Amount: ₹{request.amount}",
            response
        )
        
        return {
            "success": response.get('success'),
            "message": "Payment receipt sent successfully" if response.get('success') else "Failed to send receipt",
            "details": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_notification_logs(
    request: Request,
    limit: int = 50,
    channel: Optional[str] = None,
    status: Optional[str] = None
):
    """Get notification logs"""
    db = get_db(request)
    
    query = {}
    if channel:
        query['channel'] = channel
    if status:
        query['status'] = status
    
    logs = await db.notification_logs.find(query, {"_id": 0}) \
        .sort('created_at', -1) \
        .limit(limit) \
        .to_list(length=limit)
    
    return {
        "logs": logs,
        "count": len(logs)
    }

@router.get("/stats")
async def get_notification_stats(request: Request):
    """Get notification statistics"""
    db = get_db(request)
    
    # Get counts by channel
    channels = ['sms', 'email', 'whatsapp']
    stats_by_channel = {}
    
    for channel in channels:
        total = await db.notification_logs.count_documents({'channel': channel})
        success = await db.notification_logs.count_documents({'channel': channel, 'status': 'sent'})
        failed = await db.notification_logs.count_documents({'channel': channel, 'status': 'failed'})
        
        stats_by_channel[channel] = {
            'total': total,
            'success': success,
            'failed': failed,
            'success_rate': round((success / total * 100) if total > 0 else 0, 2)
        }
    
    # Get counts by type
    types = await db.notification_logs.distinct('type')
    stats_by_type = {}
    
    for ntype in types:
        count = await db.notification_logs.count_documents({'type': ntype})
        stats_by_type[ntype] = count
    
    return {
        "by_channel": stats_by_channel,
        "by_type": stats_by_type,
        "total_notifications": sum(s['total'] for s in stats_by_channel.values())
    }

@router.post("/test-connection")
async def test_notification_connection():
    """Test notification provider connections"""
    results = {
        "sms": {"configured": False, "provider": "mock"},
        "email": {"configured": False, "provider": "mock"},
        "whatsapp": {"configured": False, "provider": "mock"}
    }
    
    # Check SMS provider
    import os
    if os.getenv('SMS_PROVIDER') == 'msg91' and os.getenv('MSG91_AUTH_KEY'):
        results["sms"]["configured"] = True
        results["sms"]["provider"] = "msg91"
    
    # Check Email provider
    if os.getenv('EMAIL_PROVIDER') == 'sendgrid' and os.getenv('SENDGRID_API_KEY'):
        results["email"]["configured"] = True
        results["email"]["provider"] = "sendgrid"
    elif os.getenv('EMAIL_PROVIDER') == 'aws_ses' and os.getenv('AWS_ACCESS_KEY_ID'):
        results["email"]["configured"] = True
        results["email"]["provider"] = "aws_ses"
    
    # WhatsApp is always mock for now
    results["whatsapp"]["configured"] = False
    results["whatsapp"]["provider"] = "mock"
    
    return results
