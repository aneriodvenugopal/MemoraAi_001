"""
Email Routes for ExlainERP
Handles email sending, testing, and management
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from services.email_service import EmailService, EmailTemplates
from middleware.auth import get_current_user
import uuid

router = APIRouter(prefix="/email", tags=["email"])


# Pydantic Models
class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str


class TestEmailRequest(BaseModel):
    to_email: EmailStr
    template_type: str  # welcome, otp, password_reset, booking_confirmation, payment_confirmation, payment_reminder, site_visit


class SendBulkEmailRequest(BaseModel):
    to_emails: List[EmailStr]
    subject: str
    html_content: str


def get_db(request: Request):
    return request.app.state.db


@router.get("/status")
async def get_email_status():
    """Check if email service is configured"""
    is_configured = EmailService.is_configured()
    return {
        "configured": is_configured,
        "provider": "resend" if is_configured else "mock",
        "message": "Email service is ready" if is_configured else "Email service running in MOCK mode. Configure RESEND_API_KEY to enable real emails."
    }


@router.post("/send")
async def send_email(request_data: SendEmailRequest, request: Request, user: dict = Depends(get_current_user)):
    """Send a custom email (admin only)"""
    db = get_db(request)
    
    # Check if user is admin
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can send custom emails")
    
    result = await EmailService.send_email(
        to_email=request_data.to_email,
        subject=request_data.subject,
        html_content=request_data.html_content
    )
    
    # Log email to database
    email_log = {
        "id": str(uuid.uuid4()),
        "tenant_id": user.get('tenant_id'),
        "to_email": request_data.to_email,
        "subject": request_data.subject,
        "type": "custom",
        "provider": result.get("provider"),
        "message_id": result.get("message_id"),
        "status": result.get("status"),
        "success": result.get("success"),
        "error": result.get("error"),
        "sent_by": user.get('user_id'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.email_logs.insert_one(email_log)
    
    return result


@router.post("/test")
async def send_test_email(request_data: TestEmailRequest, request: Request, user: dict = Depends(get_current_user)):
    """Send a test email with a specific template"""
    db = get_db(request)
    
    # Check if user is admin
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can send test emails")
    
    # Get user details for personalization
    user_doc = await db.users.find_one({"id": user.get('user_id')}, {"_id": 0})
    user_name = user_doc.get('name', 'Test User') if user_doc else 'Test User'
    
    # Generate test content based on template type
    template_type = request_data.template_type.lower()
    
    if template_type == "welcome":
        result = await EmailService.send_welcome_email(
            to_email=request_data.to_email,
            name=user_name,
            tenant_name="ExlainERP Demo"
        )
        subject_sent = "Welcome Email"
    
    elif template_type == "otp":
        result = await EmailService.send_otp_email(
            to_email=request_data.to_email,
            name=user_name,
            otp="123456",
            purpose="login"
        )
        subject_sent = "OTP Email"
    
    elif template_type == "password_reset":
        result = await EmailService.send_password_reset_email(
            to_email=request_data.to_email,
            name=user_name,
            otp="654321"
        )
        subject_sent = "Password Reset Email"
    
    elif template_type == "booking_confirmation":
        result = await EmailService.send_booking_confirmation_email(
            to_email=request_data.to_email,
            customer_name=user_name,
            project_name="Green Valley Villas",
            property_details="Plot #A-15, 1200 sq.ft",
            booking_id="BK-2026-001234",
            booking_date=datetime.now().strftime("%d %b, %Y"),
            total_amount="25,00,000",
            paid_amount="5,00,000"
        )
        subject_sent = "Booking Confirmation Email"
    
    elif template_type == "payment_confirmation":
        result = await EmailService.send_payment_confirmation_email(
            to_email=request_data.to_email,
            customer_name=user_name,
            amount="1,00,000",
            payment_date=datetime.now().strftime("%d %b, %Y"),
            payment_method="Bank Transfer",
            receipt_number="RCP-2026-005678",
            project_name="Green Valley Villas"
        )
        subject_sent = "Payment Confirmation Email"
    
    elif template_type == "payment_reminder":
        result = await EmailService.send_payment_reminder_email(
            to_email=request_data.to_email,
            customer_name=user_name,
            amount="2,50,000",
            due_date=(datetime.now()).strftime("%d %b, %Y"),
            project_name="Green Valley Villas",
            property_details="Plot #A-15",
            days_until_due=3,
            is_overdue=False
        )
        subject_sent = "Payment Reminder Email"
    
    elif template_type == "site_visit":
        result = await EmailService.send_site_visit_confirmation_email(
            to_email=request_data.to_email,
            visitor_name=user_name,
            project_name="Green Valley Villas",
            visit_date=(datetime.now()).strftime("%d %b, %Y"),
            visit_time="10:30 AM",
            location="Survey No. 123, Main Road, Hyderabad",
            assigned_staff="Ramesh Kumar",
            contact_number="+91 98765 43210"
        )
        subject_sent = "Site Visit Email"
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Invalid template type. Available types: welcome, otp, password_reset, booking_confirmation, payment_confirmation, payment_reminder, site_visit"
        )
    
    # Log test email
    email_log = {
        "id": str(uuid.uuid4()),
        "tenant_id": user.get('tenant_id'),
        "to_email": request_data.to_email,
        "subject": subject_sent,
        "type": f"test_{template_type}",
        "provider": result.get("provider"),
        "message_id": result.get("message_id"),
        "status": result.get("status"),
        "success": result.get("success"),
        "is_test": True,
        "sent_by": user.get('user_id'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.email_logs.insert_one(email_log)
    
    return {
        **result,
        "template_type": template_type,
        "message": f"Test {template_type} email sent to {request_data.to_email}"
    }


@router.get("/logs")
async def get_email_logs(
    request: Request,
    user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None
):
    """Get email logs (admin only)"""
    db = get_db(request)
    
    # Check if user is admin
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can view email logs")
    
    # Build query
    query = {}
    if user.get('role') == 'tenant_admin':
        query['tenant_id'] = user.get('tenant_id')
    if status:
        query['status'] = status
    
    # Get total count
    total = await db.email_logs.count_documents(query)
    
    # Get logs
    logs = await db.email_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
    
    return {
        "total": total,
        "logs": logs,
        "limit": limit,
        "offset": offset
    }


@router.get("/stats")
async def get_email_stats(request: Request, user: dict = Depends(get_current_user)):
    """Get email statistics (admin only)"""
    db = get_db(request)
    
    # Check if user is admin
    if user.get('role') not in ['super_admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Only admins can view email stats")
    
    # Build query
    query = {}
    if user.get('role') == 'tenant_admin':
        query['tenant_id'] = user.get('tenant_id')
    
    # Aggregate stats
    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": None,
                "total_sent": {"$sum": 1},
                "successful": {"$sum": {"$cond": [{"$eq": ["$success", True]}, 1, 0]}},
                "failed": {"$sum": {"$cond": [{"$eq": ["$success", False]}, 1, 0]}},
                "mock_mode": {"$sum": {"$cond": [{"$eq": ["$provider", "mock"]}, 1, 0]}},
                "resend": {"$sum": {"$cond": [{"$eq": ["$provider", "resend"]}, 1, 0]}}
            }
        }
    ]
    
    stats_result = await db.email_logs.aggregate(pipeline).to_list(length=1)
    
    if stats_result:
        stats = stats_result[0]
        del stats['_id']
    else:
        stats = {
            "total_sent": 0,
            "successful": 0,
            "failed": 0,
            "mock_mode": 0,
            "resend": 0
        }
    
    # Get email type breakdown
    type_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$type",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]
    
    type_stats = await db.email_logs.aggregate(type_pipeline).to_list(length=20)
    stats["by_type"] = {item["_id"]: item["count"] for item in type_stats if item["_id"]}
    
    # Check service status
    stats["service_configured"] = EmailService.is_configured()
    stats["current_provider"] = "resend" if EmailService.is_configured() else "mock"
    
    return stats


@router.get("/templates")
async def get_available_templates():
    """Get list of available email templates"""
    return {
        "templates": [
            {
                "id": "welcome",
                "name": "Welcome Email",
                "description": "Sent to new users upon registration",
                "variables": ["name", "tenant_name"]
            },
            {
                "id": "otp",
                "name": "OTP Verification",
                "description": "Verification code for login/authentication",
                "variables": ["name", "otp", "purpose"]
            },
            {
                "id": "password_reset",
                "name": "Password Reset",
                "description": "OTP for password reset requests",
                "variables": ["name", "otp"]
            },
            {
                "id": "booking_confirmation",
                "name": "Booking Confirmation",
                "description": "Sent when a booking is confirmed",
                "variables": ["customer_name", "project_name", "property_details", "booking_id", "booking_date", "total_amount", "paid_amount"]
            },
            {
                "id": "payment_confirmation",
                "name": "Payment Confirmation",
                "description": "Sent when a payment is received",
                "variables": ["customer_name", "amount", "payment_date", "payment_method", "receipt_number", "project_name"]
            },
            {
                "id": "payment_reminder",
                "name": "Payment Reminder",
                "description": "Reminder for upcoming or overdue payments",
                "variables": ["customer_name", "amount", "due_date", "project_name", "property_details", "days_until_due", "is_overdue"]
            },
            {
                "id": "site_visit",
                "name": "Site Visit Confirmation",
                "description": "Confirmation for scheduled site visits",
                "variables": ["visitor_name", "project_name", "visit_date", "visit_time", "location", "assigned_staff", "contact_number"]
            },
            {
                "id": "lead_inquiry",
                "name": "Lead Inquiry Notification",
                "description": "Notification to staff about new lead inquiries",
                "variables": ["lead_name", "project_name", "lead_phone", "lead_email", "message", "source"]
            }
        ]
    }


@router.post("/preview")
async def preview_email_template(request_data: dict, user: dict = Depends(get_current_user)):
    """Preview an email template with sample data"""
    template_type = request_data.get("template_type", "").lower()
    
    if template_type == "welcome":
        html = EmailTemplates.welcome_email("John Doe", "ExlainERP Demo")
    elif template_type == "otp":
        html = EmailTemplates.otp_email("John Doe", "123456", "verification")
    elif template_type == "password_reset":
        html = EmailTemplates.password_reset_email("John Doe", "654321")
    elif template_type == "booking_confirmation":
        html = EmailTemplates.booking_confirmation_email(
            "John Doe", "Green Valley Villas", "Plot #A-15, 1200 sq.ft",
            "BK-2026-001234", "15 Jan, 2026", "25,00,000", "5,00,000"
        )
    elif template_type == "payment_confirmation":
        html = EmailTemplates.payment_confirmation_email(
            "John Doe", "1,00,000", "15 Jan, 2026", "Bank Transfer",
            "RCP-2026-005678", "Green Valley Villas"
        )
    elif template_type == "payment_reminder":
        html = EmailTemplates.payment_reminder_email(
            "John Doe", "2,50,000", "20 Jan, 2026", "Green Valley Villas",
            "Plot #A-15", 5, False
        )
    elif template_type == "site_visit":
        html = EmailTemplates.site_visit_confirmation_email(
            "John Doe", "Green Valley Villas", "20 Jan, 2026", "10:30 AM",
            "Survey No. 123, Main Road, Hyderabad", "Ramesh Kumar", "+91 98765 43210"
        )
    elif template_type == "lead_inquiry":
        html = EmailTemplates.lead_inquiry_email(
            "Jane Smith", "Green Valley Villas", "+91 98765 12345",
            "jane@example.com", "I am interested in a 2BHK plot. Please share details.", "Website"
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid template type"
        )
    
    return {
        "template_type": template_type,
        "html": html
    }
