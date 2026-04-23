"""
SMS Automation API Routes
Automated SMS sending for leads, bookings, payments, etc.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from datetime import datetime, timezone

from middleware.auth import get_current_user
from services.sms_service import SMSService
from models.sms import SMSSendRequest, SMSTemplateCreate

router = APIRouter(prefix="/sms", tags=["sms"])


def get_db(request: Request):
    return request.app.state.db


# ============= SMS SENDING =============

@router.post("/send")
async def send_sms(
    sms_data: SMSSendRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send SMS manually.
    
    Can use template or custom message.
    """
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Determine message body
    if sms_data.custom_message:
        message_body = sms_data.custom_message
    elif sms_data.template_id:
        # Get template from database
        db = get_db(request)
        template = await db.sms_templates.find_one({
            "id": sms_data.template_id,
            "tenant_id": tenant_id
        }, {"_id": 0})
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        message_body = SMSService.fill_template(
            template["template_body"],
            sms_data.variables or {}
        )
    else:
        # Use default template
        language = sms_data.variables.get("language", "hinglish") if sms_data.variables else "hinglish"
        template = SMSService.get_template(sms_data.message_type, language)
        message_body = SMSService.fill_template(template, sms_data.variables or {})
    
    # Send SMS
    result = await SMSService.send_sms(
        tenant_id=tenant_id,
        recipient_phone=sms_data.recipient_phone,
        message_body=message_body,
        message_type=sms_data.message_type,
        created_by=user_id,
        recipient_name=sms_data.recipient_name,
        recipient_id=sms_data.recipient_id,
        lead_id=sms_data.lead_id,
        booking_id=sms_data.booking_id,
        project_id=sms_data.project_id,
        template_id=sms_data.template_id
    )
    
    return {
        "success": True,
        "message": "SMS sent successfully",
        "sms_id": result["id"],
        "provider_message_id": result["provider_message_id"],
        "status": result["status"]
    }


@router.post("/send-lead-acknowledgment/{lead_id}")
async def send_lead_acknowledgment(
    lead_id: str,
    language: str = "hinglish",
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Send lead acknowledgment SMS automatically.
    
    Triggered when a new lead is created.
    """
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    try:
        result = await SMSService.send_lead_acknowledgment(
            tenant_id=tenant_id,
            lead_id=lead_id,
            created_by=user_id,
            language=language
        )
        
        return {
            "success": True,
            "message": "Lead acknowledgment SMS sent",
            "sms_id": result["id"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/send-booking-confirmation/{booking_id}")
async def send_booking_confirmation(
    booking_id: str,
    language: str = "hinglish",
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Send booking confirmation SMS"""
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    try:
        result = await SMSService.send_booking_confirmation(
            tenant_id=tenant_id,
            booking_id=booking_id,
            created_by=user_id,
            language=language
        )
        
        return {
            "success": True,
            "message": "Booking confirmation SMS sent",
            "sms_id": result["id"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/send-payment-reminder/{payment_schedule_id}")
async def send_payment_reminder(
    payment_schedule_id: str,
    language: str = "hinglish",
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Send payment reminder SMS"""
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    try:
        result = await SMSService.send_payment_reminder(
            tenant_id=tenant_id,
            payment_schedule_id=payment_schedule_id,
            created_by=user_id,
            language=language
        )
        
        return {
            "success": True,
            "message": "Payment reminder SMS sent",
            "sms_id": result["id"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============= SMS HISTORY =============

@router.get("/history")
async def get_sms_history(
    message_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS history with filters"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    query = {
        "tenant_id": tenant_id
    }
    
    if message_type:
        query["message_type"] = message_type
    
    if status:
        query["status"] = status
    
    messages = await db.sms_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calculate stats
    total_sent = len([m for m in messages if m.get("status") == "sent"])
    total_delivered = len([m for m in messages if m.get("status") == "delivered"])
    total_failed = len([m for m in messages if m.get("status") == "failed"])
    total_cost = sum(m.get("cost", 0) for m in messages)
    
    return {
        "success": True,
        "total": len(messages),
        "stats": {
            "sent": total_sent,
            "delivered": total_delivered,
            "failed": total_failed,
            "total_cost": round(total_cost, 2)
        },
        "messages": messages
    }


@router.get("/stats")
async def get_sms_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS statistics"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Get all messages
    all_messages = await db.sms_messages.find({
        "tenant_id": tenant_id
    }, {"_id": 0}).to_list(1000)
    
    # Calculate stats by type
    stats_by_type = {}
    for msg in all_messages:
        msg_type = msg.get("message_type", "unknown")
        if msg_type not in stats_by_type:
            stats_by_type[msg_type] = {
                "count": 0,
                "sent": 0,
                "delivered": 0,
                "failed": 0,
                "cost": 0.0
            }
        
        stats_by_type[msg_type]["count"] += 1
        
        if msg.get("status") == "sent":
            stats_by_type[msg_type]["sent"] += 1
        elif msg.get("status") == "delivered":
            stats_by_type[msg_type]["delivered"] += 1
        elif msg.get("status") == "failed":
            stats_by_type[msg_type]["failed"] += 1
        
        stats_by_type[msg_type]["cost"] += msg.get("cost", 0)
    
    return {
        "success": True,
        "total_messages": len(all_messages),
        "total_cost": round(sum(m.get("cost", 0) for m in all_messages), 2),
        "stats_by_type": stats_by_type
    }


# ============= TEMPLATES =============

@router.post("/templates")
async def create_sms_template(
    template_data: SMSTemplateCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create custom SMS template"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    import uuid
    template = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": template_data.name,
        "message_type": template_data.message_type,
        "template_body": template_data.template_body,
        "language": template_data.language,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sms_templates.insert_one(template)
    
    return {
        "success": True,
        "message": "Template created successfully",
        "template": template
    }


@router.get("/templates")
async def get_sms_templates(
    message_type: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS templates"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    query = {
        "tenant_id": tenant_id,
        "is_active": True
    }
    
    if message_type:
        query["message_type"] = message_type
    
    templates = await db.sms_templates.find(query, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "total": len(templates),
        "templates": templates
    }


@router.get("/default-templates")
async def get_default_templates(
    message_type: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get default SMS templates"""
    
    if message_type:
        templates = {
            message_type: SMSService.DEFAULT_TEMPLATES.get(message_type, {})
        }
    else:
        templates = SMSService.DEFAULT_TEMPLATES
    
    return {
        "success": True,
        "templates": templates
    }



# ============= SMS LOGIN API (Real SMS Provider with DLT Templates) =============

@router.get("/balance")
async def get_sms_balance(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS credit balance from SMS Login API"""
    from services.sms_login_service import SMSLoginService
    
    result = await SMSLoginService.get_credit_balance()
    return result


@router.get("/dlt-templates")
async def get_dlt_templates(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all DLT approved templates"""
    from services.sms_templates import DLT_TEMPLATES, get_templates_by_type
    
    return {
        "success": True,
        "total": len(DLT_TEMPLATES),
        "templates": DLT_TEMPLATES,
        "by_type": {
            "transactional": get_templates_by_type("transactional"),
            "service": get_templates_by_type("service")
        }
    }


@router.post("/check-delivery/{message_id}")
async def check_delivery_status(
    message_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Check delivery status of a sent SMS"""
    from services.sms_login_service import SMSLoginService
    
    result = await SMSLoginService.check_delivery_status(message_id)
    return result


@router.post("/send-bulk")
async def send_bulk_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send bulk SMS to multiple numbers (up to 500)
    
    Body: {
        "phone_numbers": ["9876543210", "9123456789"],
        "message": "Your message here",
        "template_id": "your_dlt_template_id"
    }
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    phone_numbers = body.get("phone_numbers", [])
    message = body.get("message", "")
    template_id = body.get("template_id", "")
    
    if not phone_numbers or not message or not template_id:
        raise HTTPException(status_code=400, detail="phone_numbers, message, and template_id are required")
    
    if len(phone_numbers) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 numbers allowed per request")
    
    result = await SMSLoginService.send_bulk_sms(phone_numbers, message, template_id)
    return result


@router.post("/test-otp")
async def test_otp_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Test OTP SMS sending (Admin only)
    
    Body: {
        "phone": "9876543210"
    }
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    phone = body.get("phone", "")
    
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    # Generate and send OTP
    result = await SMSLoginService.generate_and_send_otp(phone)
    return result


# ============= DLT Template-Based SMS Endpoints =============

@router.post("/send/payment-received")
async def send_payment_received_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Payment Received SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "amount": "50000", "receipt_no": "RCP123"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_payment_received(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        amount=body.get("amount"),
        receipt_no=body.get("receipt_no")
    )
    return result


@router.post("/send/token-received")
async def send_token_received_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Token Received SMS
    Body: {"phone": "9876543210", "amount": "50000"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_token_received(
        phone=body.get("phone"),
        amount=body.get("amount")
    )
    return result


@router.post("/send/booking-confirmed")
async def send_booking_confirmed_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Booking Confirmed SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "booking_id": "BK123", "total_amount": "500000"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_booking_confirmed(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        booking_id=body.get("booking_id"),
        total_amount=body.get("total_amount")
    )
    return result


@router.post("/send/emi-due")
async def send_emi_due_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send EMI Due Reminder SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "amount": "25000", "due_date": "15-Feb-2026", "installment_no": "3"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_emi_due(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        amount=body.get("amount"),
        due_date=body.get("due_date"),
        installment_no=body.get("installment_no")
    )
    return result


@router.post("/send/payment-reminder")
async def send_payment_reminder_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Payment Reminder SMS
    Body: {"phone": "9876543210", "amount": "150000", "due_date": "15-Feb-2026"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_payment_reminder(
        phone=body.get("phone"),
        amount=body.get("amount"),
        due_date=body.get("due_date")
    )
    return result


@router.post("/send/payment-link")
async def send_payment_link_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Payment Link SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "amount": "50000", "payment_link": "https://pay.realapex.in/xyz"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_payment_link(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        amount=body.get("amount"),
        payment_link=body.get("payment_link")
    )
    return result


@router.post("/send/visit-confirmed")
async def send_visit_confirmed_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Site Visit Confirmed SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "visit_date": "10-Feb-2026", "visit_time": "11:00 AM"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_visit_confirmed(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        visit_date=body.get("visit_date"),
        visit_time=body.get("visit_time")
    )
    return result


@router.post("/send/visit-reminder")
async def send_visit_reminder_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Site Visit Reminder SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "visit_time": "11:00 AM"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_visit_reminder(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        visit_time=body.get("visit_time")
    )
    return result


@router.post("/send/visit-rescheduled")
async def send_visit_rescheduled_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Site Visit Rescheduled SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "new_date": "12-Feb-2026", "new_time": "3:00 PM"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_visit_rescheduled(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        new_date=body.get("new_date"),
        new_time=body.get("new_time")
    )
    return result


@router.post("/send/document-ready")
async def send_document_ready_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Document Ready SMS
    Body: {"phone": "9876543210"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_document_ready(phone=body.get("phone"))
    return result


@router.post("/send/agreement-ready")
async def send_agreement_ready_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Agreement Ready SMS
    Body: {"phone": "9876543210", "customer_name": "Raju"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_agreement_ready(
        phone=body.get("phone"),
        customer_name=body.get("customer_name")
    )
    return result


@router.post("/send/registration-done")
async def send_registration_done_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Registration Done SMS
    Body: {"phone": "9876543210", "customer_name": "Raju", "registration_no": "REG2026001"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_registration_done(
        phone=body.get("phone"),
        customer_name=body.get("customer_name"),
        registration_no=body.get("registration_no")
    )
    return result


@router.post("/send/welcome")
async def send_welcome_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Welcome SMS to new customer
    Body: {"phone": "9876543210", "customer_name": "Raju"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_welcome(
        phone=body.get("phone"),
        customer_name=body.get("customer_name")
    )
    return result


@router.post("/send/new-lead-assigned")
async def send_new_lead_assigned_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send New Lead Assigned SMS to Staff
    Body: {"phone": "9876543210", "staff_name": "Ramesh", "lead_name": "Suresh Kumar"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_new_lead_assigned(
        phone=body.get("phone"),
        staff_name=body.get("staff_name"),
        lead_name=body.get("lead_name")
    )
    return result


@router.post("/send/follow-up-reminder")
async def send_follow_up_reminder_sms(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Send Follow-up Reminder SMS to Staff
    Body: {"phone": "9876543210", "staff_name": "Ramesh", "lead_name": "Suresh Kumar"}
    """
    from services.sms_login_service import SMSLoginService
    
    body = await request.json()
    result = await SMSLoginService.send_follow_up_reminder(
        phone=body.get("phone"),
        staff_name=body.get("staff_name"),
        lead_name=body.get("lead_name")
    )
    return result
