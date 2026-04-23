"""
Festival Greetings Routes
- Simple ON/OFF configuration
- Recipient management (customers only, NO leads)
- Manual trigger for testing
- ONLY Republic Day (Jan 26) and Independence Day (Aug 15)
"""
from fastapi import APIRouter, HTTPException, Request
from models.festival_greeting import (
    FestivalGreetingConfig, GreetingRecipient, GreetingRecipientCreate, GreetingLog
)
from middleware.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional
import uuid

router = APIRouter(prefix="/festival-greetings", tags=["festival-greetings"])


def get_db(request: Request):
    return request.app.state.db


# Fixed message templates - NO customization
GREETING_MESSAGES = {
    "republic_day": "Warm wishes on Republic Day 🇮🇳\n– {company_name}",
    "independence_day": "Warm wishes on Independence Day 🇮🇳\n– {company_name}"
}

# Fixed dates - ONLY these two
GREETING_DATES = {
    "republic_day": "01-26",  # January 26
    "independence_day": "08-15"  # August 15
}


# ==================== CONFIGURATION ====================

@router.get("/config")
async def get_greeting_config(request: Request):
    """Get greeting configuration for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    config = await db.festival_greeting_configs.find_one(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not config:
        # Return default config
        return {
            "success": True,
            "config": {
                "is_enabled": False,
                "company_name": None,
                "greeting_dates": GREETING_DATES,
                "message_preview": {
                    "republic_day": GREETING_MESSAGES["republic_day"].format(company_name="Your Company"),
                    "independence_day": GREETING_MESSAGES["independence_day"].format(company_name="Your Company")
                }
            }
        }
    
    return {
        "success": True,
        "config": config,
        "greeting_dates": GREETING_DATES,
        "message_preview": {
            "republic_day": GREETING_MESSAGES["republic_day"].format(company_name=config.get("company_name", "Your Company")),
            "independence_day": GREETING_MESSAGES["independence_day"].format(company_name=config.get("company_name", "Your Company"))
        }
    }


@router.post("/config")
async def update_greeting_config(
    request: Request,
    is_enabled: bool,
    company_name: str
):
    """
    Update greeting configuration (Admin only)
    - Just ON/OFF toggle
    - Company name for message
    - NO other customization
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only Admin can configure greetings")
    
    if not company_name or not company_name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")
    
    config = FestivalGreetingConfig(
        tenant_id=user["tenant_id"],
        is_enabled=is_enabled,
        company_name=company_name.strip(),
        updated_by=user["user_id"]
    )
    
    # Upsert config
    await db.festival_greeting_configs.update_one(
        {"tenant_id": user["tenant_id"]},
        {"$set": config.model_dump()},
        upsert=True
    )
    
    return {
        "success": True,
        "config": config.model_dump(),
        "message": f"Greetings {'enabled' if is_enabled else 'disabled'}"
    }


# ==================== RECIPIENTS ====================

@router.get("/recipients")
async def get_recipients(
    request: Request,
    skip: int = 0,
    limit: int = 100
):
    """Get all greeting recipients"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    recipients = await db.greeting_recipients.find(
        {"tenant_id": user["tenant_id"], "is_active": True},
        {"_id": 0}
    ).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.greeting_recipients.count_documents(
        {"tenant_id": user["tenant_id"], "is_active": True}
    )
    
    return {
        "success": True,
        "recipients": recipients,
        "total": total
    }


@router.post("/recipients")
async def add_recipient(
    recipient_data: GreetingRecipientCreate,
    request: Request
):
    """
    Add a greeting recipient
    - ONLY customers, past customers, or internal contacts
    - NO leads, NO cold numbers
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate source type - NO leads
    if recipient_data.source_type not in ["customer", "past_customer", "internal_contact"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid source type. Only customer, past_customer, or internal_contact allowed. NO leads."
        )
    
    # Check for duplicate mobile
    existing = await db.greeting_recipients.find_one({
        "tenant_id": user["tenant_id"],
        "mobile": recipient_data.mobile,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Recipient with this mobile already exists")
    
    recipient = GreetingRecipient(
        tenant_id=user["tenant_id"],
        name=recipient_data.name,
        mobile=recipient_data.mobile,
        source_type=recipient_data.source_type,
        source_id=recipient_data.source_id,
        created_by=user["user_id"]
    )
    
    await db.greeting_recipients.insert_one(recipient.model_dump())
    
    return {"success": True, "recipient": recipient.model_dump()}


@router.post("/recipients/import-customers")
async def import_customers_as_recipients(request: Request):
    """
    Import existing customers as greeting recipients
    - Only imports customers with mobile numbers
    - Skips duplicates
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only Admin can import customers")
    
    # Get all customers for tenant
    customers = await db.customers.find(
        {"tenant_id": user["tenant_id"], "is_active": True},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "mobile": 1}
    ).to_list(1000)
    
    imported = 0
    skipped = 0
    
    for customer in customers:
        mobile = customer.get("mobile") or customer.get("phone")
        if not mobile:
            skipped += 1
            continue
        
        # Check if already exists
        existing = await db.greeting_recipients.find_one({
            "tenant_id": user["tenant_id"],
            "mobile": mobile,
            "is_active": True
        })
        
        if existing:
            skipped += 1
            continue
        
        recipient = GreetingRecipient(
            tenant_id=user["tenant_id"],
            name=customer.get("name", "Customer"),
            mobile=mobile,
            source_type="customer",
            source_id=customer["id"],
            created_by=user["user_id"]
        )
        
        await db.greeting_recipients.insert_one(recipient.model_dump())
        imported += 1
    
    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "message": f"Imported {imported} customers, skipped {skipped} (no mobile or duplicate)"
    }


@router.delete("/recipients/{recipient_id}")
async def remove_recipient(recipient_id: str, request: Request):
    """Remove a recipient from greeting list"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.greeting_recipients.update_one(
        {"id": recipient_id, "tenant_id": user["tenant_id"]},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    return {"success": True, "message": "Recipient removed"}


@router.post("/recipients/{recipient_id}/opt-out")
async def opt_out_recipient(recipient_id: str, request: Request):
    """Mark recipient as opted out"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.greeting_recipients.update_one(
        {"id": recipient_id, "tenant_id": user["tenant_id"]},
        {"$set": {"opted_out": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    return {"success": True, "message": "Recipient opted out"}


# ==================== GREETING LOGS ====================

@router.get("/logs")
async def get_greeting_logs(
    request: Request,
    festival: Optional[str] = None,
    limit: int = 100
):
    """Get greeting send logs (audit only, NO analytics)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    if festival:
        query["festival"] = festival
    
    logs = await db.greeting_logs.find(
        query, {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {"success": True, "logs": logs}


# ==================== SEND GREETINGS (Internal/Cron) ====================

@router.post("/send")
async def send_greetings(
    request: Request,
    festival: str
):
    """
    Send greetings for a festival (called by cron or manual trigger)
    - ONLY republic_day or independence_day
    - Sends to all active, non-opted-out recipients
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only Admin can trigger greetings")
    
    if festival not in ["republic_day", "independence_day"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid festival. Only republic_day or independence_day allowed."
        )
    
    # Get config
    config = await db.festival_greeting_configs.find_one(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not config or not config.get("is_enabled"):
        raise HTTPException(status_code=400, detail="Greetings are disabled for this tenant")
    
    # Get active recipients
    recipients = await db.greeting_recipients.find(
        {
            "tenant_id": user["tenant_id"],
            "is_active": True,
            "opted_out": False
        },
        {"_id": 0}
    ).to_list(10000)
    
    if not recipients:
        return {"success": True, "message": "No recipients to send", "sent": 0}
    
    # Prepare message
    message = GREETING_MESSAGES[festival].format(company_name=config["company_name"])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    sent_count = 0
    failed_count = 0
    
    # Import SMS service
    try:
        from services.sms_service import send_sms
    except ImportError:
        send_sms = None
    
    for recipient in recipients:
        # Create log entry
        log = GreetingLog(
            tenant_id=user["tenant_id"],
            festival=festival,
            festival_date=today,
            recipient_id=recipient["id"],
            recipient_name=recipient["name"],
            recipient_mobile=recipient["mobile"],
            message=message
        )
        
        # Try to send SMS
        try:
            if send_sms:
                await send_sms(recipient["mobile"], message)
            log.status = "sent"
            sent_count += 1
        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            failed_count += 1
        
        # Save log
        await db.greeting_logs.insert_one(log.model_dump())
    
    return {
        "success": True,
        "message": f"Greetings sent: {sent_count}, failed: {failed_count}",
        "sent": sent_count,
        "failed": failed_count,
        "total_recipients": len(recipients)
    }


# ==================== CRON TRIGGER CHECK ====================

@router.get("/check-today")
async def check_today_greetings():
    """
    Called by cron to check if today is a greeting day
    Returns list of tenants that need greetings sent
    """
    from fastapi import Request as FastAPIRequest
    
    today = datetime.now(timezone.utc).strftime("%m-%d")
    
    festival = None
    if today == "01-26":
        festival = "republic_day"
    elif today == "08-15":
        festival = "independence_day"
    
    if not festival:
        return {
            "is_greeting_day": False,
            "today": today,
            "next_greeting": "republic_day (01-26)" if today < "01-26" or today > "08-15" else "independence_day (08-15)"
        }
    
    return {
        "is_greeting_day": True,
        "festival": festival,
        "today": today,
        "message_template": GREETING_MESSAGES[festival]
    }
