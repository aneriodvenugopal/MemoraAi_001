"""
Customer Self-Service Portal API Routes
Public endpoints for customers to access their property and payment information
"""

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import hashlib
import secrets

router = APIRouter(prefix="/customer-portal", tags=["customer-portal"])


def get_db(request: Request):
    return request.app.state.db


# Models
class CustomerLoginRequest(BaseModel):
    phone: str
    
class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str
    
class CustomerPortalSession(BaseModel):
    session_id: str
    customer_id: str
    phone: str
    tenant_id: str
    expires_at: str


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def hash_otp(otp: str, phone: str) -> str:
    """Hash OTP with phone as salt for storage"""
    return hashlib.sha256(f"{otp}{phone}".encode()).hexdigest()


async def get_portal_session(request: Request) -> Optional[dict]:
    """Extract and validate portal session from header"""
    db = get_db(request)
    session_id = request.headers.get("X-Portal-Session")
    
    if not session_id:
        return None
    
    session = await db.customer_portal_sessions.find_one({
        "session_id": session_id,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    }, {"_id": 0})
    
    return session


@router.post("/login")
async def customer_portal_login(login_data: CustomerLoginRequest, request: Request):
    """
    Step 1: Customer enters phone number to request OTP
    Finds customer by phone and sends OTP
    """
    db = get_db(request)
    phone = login_data.phone.strip()
    
    # Normalize phone number (remove spaces, dashes)
    phone = ''.join(filter(str.isdigit, phone))
    
    # Find customer by phone
    customer = await db.customers.find_one({
        "$or": [
            {"phone": phone},
            {"phone": f"+91{phone}"},
            {"phone": phone[-10:]}  # Last 10 digits
        ],
        "status": {"$ne": "blacklisted"},
        "deleted_at": None
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(
            status_code=404, 
            detail="No account found with this phone number. Please contact support."
        )
    
    # Generate OTP
    otp = generate_otp()
    otp_hash = hash_otp(otp, phone)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    
    # Store OTP
    await db.customer_portal_otps.update_one(
        {"phone": phone},
        {
            "$set": {
                "phone": phone,
                "otp_hash": otp_hash,
                "attempts": 0,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # In production, send OTP via SMS
    # For now, we'll return it in response (MOCK MODE)
    print(f"[CUSTOMER PORTAL] OTP for {phone}: {otp}")
    
    # Try to send SMS if available
    try:
        from services.sms_service import send_sms
        await send_sms(
            phone=phone,
            message=f"Your ExlainERP Customer Portal OTP is: {otp}. Valid for 10 minutes.",
            template_type="otp"
        )
    except Exception as e:
        print(f"[CUSTOMER PORTAL] SMS send failed: {e}")
    
    return {
        "success": True,
        "message": "OTP sent to your phone number",
        "phone_masked": f"******{phone[-4:]}",
        # MOCK MODE: Include OTP in response for testing
        "mock_otp": otp,
        "mock_mode": True
    }


@router.post("/verify-otp")
async def verify_customer_otp(verify_data: OTPVerifyRequest, request: Request):
    """
    Step 2: Verify OTP and create session
    """
    db = get_db(request)
    phone = verify_data.phone.strip()
    phone = ''.join(filter(str.isdigit, phone))
    otp = verify_data.otp.strip()
    
    # Get stored OTP
    otp_record = await db.customer_portal_otps.find_one({
        "phone": phone,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Check attempts
    if otp_record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    otp_hash = hash_otp(otp, phone)
    if otp_hash != otp_record.get("otp_hash"):
        # Increment attempts
        await db.customer_portal_otps.update_one(
            {"phone": phone},
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # OTP valid - find customer
    customer = await db.customers.find_one({
        "$or": [
            {"phone": phone},
            {"phone": f"+91{phone}"},
            {"phone": phone[-10:]}
        ],
        "status": {"$ne": "blacklisted"},
        "deleted_at": None
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Create session
    session_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    session = {
        "session_id": session_id,
        "customer_id": customer["id"],
        "phone": phone,
        "tenant_id": customer["tenant_id"],
        "customer_name": customer.get("name", "Customer"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at
    }
    
    await db.customer_portal_sessions.insert_one(session)
    
    # Delete OTP record
    await db.customer_portal_otps.delete_one({"phone": phone})
    
    return {
        "success": True,
        "session_id": session_id,
        "customer": {
            "id": customer["id"],
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "email": customer.get("email")
        },
        "expires_at": expires_at
    }


@router.post("/logout")
async def customer_portal_logout(request: Request):
    """Logout and invalidate session"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if session:
        await db.customer_portal_sessions.delete_one({"session_id": session["session_id"]})
    
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def get_customer_profile(request: Request):
    """Get current customer profile"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer = await db.customers.find_one({
        "id": session["customer_id"],
        "deleted_at": None
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Remove sensitive fields
    customer.pop("documents", None)
    
    return customer


@router.get("/dashboard")
async def get_portal_dashboard(request: Request):
    """Get customer dashboard overview"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Get customer
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    
    # Find bookings linked to this customer
    bookings = await db.bookings.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    # Also check properties with this customer's phone
    properties_by_phone = await db.properties.find({
        "$or": [
            {"customer_id": customer_id},
            {"booked_by": customer_id}
        ],
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    # Get property IDs from bookings
    property_ids = list(set(
        [b["property_id"] for b in bookings if b.get("property_id")] +
        [p["id"] for p in properties_by_phone]
    ))
    
    # Calculate totals
    total_invested = sum(b.get("total_amount", 0) for b in bookings)
    total_paid = sum(b.get("paid_amount", 0) for b in bookings)
    
    # Get upcoming payments
    booking_ids = [b["id"] for b in bookings]
    today = datetime.now(timezone.utc).date().isoformat()
    
    upcoming_payments = []
    overdue_payments = []
    
    if booking_ids:
        upcoming_payments = await db.payment_schedules.find({
            "booking_id": {"$in": booking_ids},
            "status": {"$in": ["pending", "partial"]},
            "due_date": {"$gte": today},
            "deleted_at": None
        }, {"_id": 0}).sort("due_date", 1).limit(5).to_list(5)
        
        overdue_payments = await db.payment_schedules.find({
            "booking_id": {"$in": booking_ids},
            "status": {"$in": ["pending", "partial"]},
            "due_date": {"$lt": today},
            "deleted_at": None
        }, {"_id": 0}).to_list(100)
    
    # Recent payments
    recent_payments = await db.payments.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).sort("payment_date", -1).limit(5).to_list(5)
    
    return {
        "customer": {
            "id": customer.get("id"),
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "email": customer.get("email"),
            "wallet_balance": customer.get("wallet_balance", 0)
        },
        "overview": {
            "total_properties": len(property_ids),
            "total_invested": round(total_invested, 2),
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_invested - total_paid, 2),
            "overdue_count": len(overdue_payments),
            "overdue_amount": round(sum(p.get("remaining_amount", p.get("due_amount", 0)) for p in overdue_payments), 2)
        },
        "upcoming_payments": upcoming_payments,
        "recent_payments": recent_payments
    }


@router.get("/properties")
async def get_portal_properties(request: Request):
    """Get customer's properties with full details"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Get bookings
    bookings = await db.bookings.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    # Get properties
    property_ids = [b["property_id"] for b in bookings if b.get("property_id")]
    
    if not property_ids:
        return {"properties": []}
    
    properties = await db.properties.find({
        "id": {"$in": property_ids},
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    # Enrich with project and booking details
    enriched = []
    for prop in properties:
        # Get project
        project = None
        if prop.get("project_id"):
            project = await db.projects.find_one({"id": prop["project_id"]}, {"_id": 0})
        
        # Get booking
        booking = next((b for b in bookings if b.get("property_id") == prop["id"]), None)
        
        # Get payment progress
        total_paid = 0
        if booking:
            payments = await db.payments.find({
                "booking_id": booking["id"],
                "status": "completed"
            }, {"_id": 0}).to_list(100)
            total_paid = sum(p.get("amount", 0) for p in payments)
        
        enriched.append({
            "id": prop["id"],
            "property_number": prop.get("property_number"),
            "block": prop.get("block"),
            "floor": prop.get("floor"),
            "area": prop.get("area"),
            "facing": prop.get("facing"),
            "price": prop.get("price", 0),
            "status": prop.get("status_id"),
            "project": {
                "id": project.get("id") if project else None,
                "name": project.get("name") if project else "N/A",
                "location": project.get("location") if project else "N/A"
            } if project else None,
            "booking": {
                "id": booking.get("id") if booking else None,
                "date": booking.get("booking_date") if booking else None,
                "total_amount": booking.get("total_amount", 0) if booking else 0,
                "paid_amount": total_paid,
                "pending_amount": (booking.get("total_amount", 0) - total_paid) if booking else 0
            } if booking else None
        })
    
    return {"properties": enriched}


@router.get("/properties/{property_id}")
async def get_portal_property_detail(property_id: str, request: Request):
    """Get detailed property information"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Verify ownership
    booking = await db.bookings.find_one({
        "customer_id": customer_id,
        "property_id": property_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=403, detail="You don't have access to this property")
    
    # Get property
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get project
    project = None
    if property_doc.get("project_id"):
        project = await db.projects.find_one({"id": property_doc["project_id"]}, {"_id": 0})
    
    # Get all payments
    payments = await db.payments.find({
        "booking_id": booking["id"],
        "deleted_at": None
    }, {"_id": 0}).sort("payment_date", -1).to_list(100)
    
    # Get payment schedule
    schedules = await db.payment_schedules.find({
        "booking_id": booking["id"],
        "deleted_at": None
    }, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    
    return {
        "property": property_doc,
        "project": project,
        "booking": booking,
        "payments": payments,
        "payment_schedule": schedules,
        "summary": {
            "total_amount": booking.get("total_amount", 0),
            "total_paid": total_paid,
            "pending_amount": booking.get("total_amount", 0) - total_paid,
            "payment_progress": round((total_paid / booking.get("total_amount", 1)) * 100, 1)
        }
    }


@router.get("/payments")
async def get_portal_payments(request: Request):
    """Get all payments"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Get payments
    payments = await db.payments.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).sort("payment_date", -1).to_list(100)
    
    # Enrich with property info
    for payment in payments:
        if payment.get("property_id"):
            prop = await db.properties.find_one({"id": payment["property_id"]}, {"_id": 0, "property_number": 1, "project_id": 1})
            if prop:
                payment["property_number"] = prop.get("property_number")
                if prop.get("project_id"):
                    project = await db.projects.find_one({"id": prop["project_id"]}, {"_id": 0, "name": 1})
                    payment["project_name"] = project.get("name") if project else None
    
    return {"payments": payments}


@router.get("/payment-schedule")
async def get_portal_payment_schedule(request: Request, status: Optional[str] = None):
    """Get payment schedule"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Get bookings
    bookings = await db.bookings.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    booking_ids = [b["id"] for b in bookings]
    
    if not booking_ids:
        return {"schedules": []}
    
    # Build query
    query = {
        "booking_id": {"$in": booking_ids},
        "deleted_at": None
    }
    
    if status:
        query["status"] = status
    
    schedules = await db.payment_schedules.find(query, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    # Enrich with property info
    for schedule in schedules:
        booking = next((b for b in bookings if b["id"] == schedule.get("booking_id")), None)
        if booking and booking.get("property_id"):
            prop = await db.properties.find_one({"id": booking["property_id"]}, {"_id": 0, "property_number": 1})
            schedule["property_number"] = prop.get("property_number") if prop else None
    
    return {"schedules": schedules}


@router.get("/documents")
async def get_portal_documents(request: Request):
    """Get available documents for download"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Get bookings
    bookings = await db.bookings.find({
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0}).to_list(100)
    
    documents = []
    
    for booking in bookings:
        property_doc = await db.properties.find_one({"id": booking.get("property_id")}, {"_id": 0})
        property_number = property_doc.get("property_number", "N/A") if property_doc else "N/A"
        
        project = None
        if property_doc and property_doc.get("project_id"):
            project = await db.projects.find_one({"id": property_doc["project_id"]}, {"_id": 0})
        project_name = project.get("name", "N/A") if project else "N/A"
        
        # Add available documents
        documents.append({
            "type": "booking_confirmation",
            "title": "Booking Confirmation Letter",
            "description": f"Booking confirmation for Plot {property_number}",
            "property_number": property_number,
            "project_name": project_name,
            "booking_id": booking["id"],
            "property_id": booking.get("property_id"),
            "download_url": f"/api/customer-portal/download/booking-confirmation/{booking['id']}"
        })
        
        if property_doc:
            documents.append({
                "type": "payment_schedule",
                "title": "Payment Schedule / EMI Statement",
                "description": f"Payment schedule for Plot {property_number}",
                "property_number": property_number,
                "project_name": project_name,
                "booking_id": booking["id"],
                "property_id": property_doc["id"],
                "download_url": f"/api/customer-portal/download/payment-schedule/{property_doc['id']}"
            })
            
            documents.append({
                "type": "allotment_letter",
                "title": "Allotment Letter",
                "description": f"Property allotment letter for Plot {property_number}",
                "property_number": property_number,
                "project_name": project_name,
                "booking_id": booking["id"],
                "property_id": property_doc["id"],
                "download_url": f"/api/customer-portal/download/allotment-letter/{property_doc['id']}"
            })
    
    # Get payment receipts
    payments = await db.payments.find({
        "customer_id": customer_id,
        "status": "completed",
        "deleted_at": None
    }, {"_id": 0}).sort("payment_date", -1).to_list(50)
    
    for payment in payments:
        property_doc = await db.properties.find_one({"id": payment.get("property_id")}, {"_id": 0})
        property_number = property_doc.get("property_number", "N/A") if property_doc else "N/A"
        
        documents.append({
            "type": "payment_receipt",
            "title": f"Payment Receipt - ₹{payment.get('amount', 0):,.0f}",
            "description": f"Receipt for payment on {payment.get('payment_date', '')[:10]}",
            "property_number": property_number,
            "payment_id": payment["id"],
            "download_url": f"/api/customer-portal/download/payment-receipt/{payment['id']}"
        })
    
    return {"documents": documents}


# Document download endpoints (using existing PDF service)
@router.get("/download/booking-confirmation/{booking_id}")
async def download_booking_confirmation(booking_id: str, request: Request):
    """Download booking confirmation PDF"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    # Verify ownership
    booking = await db.bookings.find_one({
        "id": booking_id,
        "customer_id": session["customer_id"]
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Import and use PDF service
    from services.pdf_service import PDFGenerator
    from routes.pdf import get_company_info
    
    # Get all required data
    customer = await db.customers.find_one({"id": session["customer_id"]}, {"_id": 0})
    property_doc = await db.properties.find_one({"id": booking.get("property_id")}, {"_id": 0})
    project = await db.projects.find_one({"id": booking.get("project_id")}, {"_id": 0}) if booking.get("project_id") else None
    
    # Get payment schedule
    payments = await db.payment_schedules.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("due_date", 1).to_list(100)
    
    company_info = await get_company_info(db, session["tenant_id"])
    
    booking_data = {
        "booking_id": booking.get("id", booking_id),
        "booking_date": booking.get("booking_date") or booking.get("created_at"),
        "customer_name": customer.get("name") if customer else "N/A",
        "customer_phone": customer.get("phone") if customer else "N/A",
        "customer_email": customer.get("email") if customer else "N/A",
        "customer_address": customer.get("address", "N/A") if customer else "N/A",
        "project_name": project.get("name", "N/A") if project else "N/A",
        "property_number": property_doc.get("property_number") if property_doc else "N/A",
        "block": property_doc.get("block", "-") if property_doc else "-",
        "area": property_doc.get("area", 0) if property_doc else 0,
        "facing": property_doc.get("facing", "-") if property_doc else "-",
        "total_price": property_doc.get("price", 0) if property_doc else 0,
        "booking_amount": booking.get("booking_amount", 0),
        "balance_amount": (property_doc.get("price", 0) if property_doc else 0) - booking.get("booking_amount", 0),
        "payment_schedule": [
            {
                "installment_name": p.get("installment_name", "EMI"),
                "due_date": p.get("due_date"),
                "amount": p.get("amount", 0),
                "status": p.get("status", "Pending")
            }
            for p in payments
        ]
    }
    
    pdf_generator = PDFGenerator(company_info)
    pdf_buffer = pdf_generator.generate_booking_confirmation(booking_data)
    
    filename = f"Booking_Confirmation_{property_doc.get('property_number', booking_id[:8]) if property_doc else booking_id[:8]}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/payment-schedule/{property_id}")
async def download_payment_schedule(property_id: str, request: Request):
    """Download payment schedule PDF"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    # Verify ownership
    booking = await db.bookings.find_one({
        "property_id": property_id,
        "customer_id": session["customer_id"]
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Import and use PDF service
    from services.pdf_service import PDFGenerator
    from routes.pdf import get_company_info
    
    customer = await db.customers.find_one({"id": session["customer_id"]}, {"_id": 0})
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    project = await db.projects.find_one({"id": property_doc.get("project_id")}, {"_id": 0}) if property_doc else None
    
    # Get schedules and payments
    schedules = await db.payment_schedules.find(
        {"booking_id": booking["id"]},
        {"_id": 0}
    ).sort("due_date", 1).to_list(100)
    
    payments = await db.payments.find(
        {"booking_id": booking["id"]},
        {"_id": 0}
    ).to_list(100)
    
    payment_map = {p.get("schedule_id"): p for p in payments}
    
    total_amount = property_doc.get("price", 0) if property_doc else 0
    paid_amount = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    
    installments = []
    for emi in schedules:
        payment = payment_map.get(emi.get("id"))
        installments.append({
            "name": emi.get("installment_name", "EMI"),
            "due_date": emi.get("due_date"),
            "amount": emi.get("due_amount", emi.get("amount", 0)),
            "status": "Paid" if emi.get("status") == "paid" else ("Overdue" if emi.get("status") == "overdue" else "Pending"),
            "paid_date": payment.get("payment_date") if payment else None
        })
    
    company_info = await get_company_info(db, session["tenant_id"])
    
    schedule_data = {
        "customer_name": customer.get("name") if customer else "N/A",
        "customer_phone": customer.get("phone") if customer else "N/A",
        "project_name": project.get("name", "N/A") if project else "N/A",
        "property_number": property_doc.get("property_number") if property_doc else "N/A",
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "pending_amount": total_amount - paid_amount,
        "installments": installments
    }
    
    pdf_generator = PDFGenerator(company_info)
    pdf_buffer = pdf_generator.generate_payment_schedule(schedule_data)
    
    filename = f"Payment_Schedule_{property_doc.get('property_number', property_id[:8]) if property_doc else property_id[:8]}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/allotment-letter/{property_id}")
async def download_allotment_letter(property_id: str, request: Request):
    """Download allotment letter PDF"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    # Verify ownership
    booking = await db.bookings.find_one({
        "property_id": property_id,
        "customer_id": session["customer_id"]
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Import and use PDF service
    from services.pdf_service import PDFGenerator
    from routes.pdf import get_company_info
    
    customer = await db.customers.find_one({"id": session["customer_id"]}, {"_id": 0})
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    project = await db.projects.find_one({"id": property_doc.get("project_id")}, {"_id": 0}) if property_doc else None
    
    company_info = await get_company_info(db, session["tenant_id"])
    
    allotment_data = {
        "allotment_number": f"ALT-{property_id[:8].upper()}",
        "allotment_date": booking.get("booking_date") or booking.get("created_at"),
        "customer_name": customer.get("name") if customer else "N/A",
        "customer_phone": customer.get("phone") if customer else "N/A",
        "customer_address": customer.get("address", "N/A") if customer else "N/A",
        "project_name": project.get("name", "N/A") if project else "N/A",
        "property_number": property_doc.get("property_number") if property_doc else "N/A",
        "block": property_doc.get("block", "-") if property_doc else "-",
        "floor": property_doc.get("floor", "-") if property_doc else "-",
        "area": property_doc.get("area", 0) if property_doc else 0,
        "facing": property_doc.get("facing", "-") if property_doc else "-",
        "price_per_sqft": property_doc.get("price_per_sqft", 0) if property_doc else 0,
        "total_price": property_doc.get("price", 0) if property_doc else 0
    }
    
    pdf_generator = PDFGenerator(company_info)
    pdf_buffer = pdf_generator.generate_allotment_letter(allotment_data)
    
    filename = f"Allotment_Letter_{property_doc.get('property_number', property_id[:8]) if property_doc else property_id[:8]}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/payment-receipt/{payment_id}")
async def download_payment_receipt(payment_id: str, request: Request):
    """Download payment receipt PDF"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    # Verify ownership
    payment = await db.payments.find_one({
        "id": payment_id,
        "customer_id": session["customer_id"]
    }, {"_id": 0})
    
    if not payment:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Import and use PDF service
    from services.pdf_service import PDFGenerator, number_to_words
    from routes.pdf import get_company_info
    
    customer = await db.customers.find_one({"id": session["customer_id"]}, {"_id": 0})
    property_doc = await db.properties.find_one({"id": payment.get("property_id")}, {"_id": 0})
    project = await db.projects.find_one({"id": property_doc.get("project_id")}, {"_id": 0}) if property_doc else None
    
    company_info = await get_company_info(db, session["tenant_id"])
    
    amount = payment.get("amount", 0)
    payment_data = {
        "receipt_number": f"RCP-{payment_id[:8].upper()}",
        "payment_date": payment.get("payment_date") or payment.get("created_at"),
        "payment_mode": payment.get("payment_mode", "Cash"),
        "customer_name": customer.get("name") if customer else "N/A",
        "customer_phone": customer.get("phone") if customer else "N/A",
        "project_name": project.get("name", "N/A") if project else "N/A",
        "property_number": property_doc.get("property_number") if property_doc else "N/A",
        "amount": amount,
        "amount_in_words": number_to_words(amount),
        "payment_for": payment.get("payment_for") or payment.get("description") or "Property Payment",
        "cheque_number": payment.get("cheque_number") or payment.get("reference_number"),
        "bank_name": payment.get("bank_name")
    }
    
    pdf_generator = PDFGenerator(company_info)
    pdf_buffer = pdf_generator.generate_payment_receipt(payment_data)
    
    filename = f"Receipt_{payment_data['receipt_number']}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# ==================== Resale Request ====================

class ResaleRequestCreate(BaseModel):
    property_id: str
    reason: str
    expected_price: Optional[float] = None


@router.post("/resale-request")
async def create_resale_request(request_data: ResaleRequestCreate, request: Request):
    """Submit a resale request for a property"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    customer_id = session["customer_id"]
    
    # Verify ownership
    booking = await db.bookings.find_one({
        "property_id": request_data.property_id,
        "customer_id": customer_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=403, detail="You don't own this property")
    
    # Check if there's already a pending resale request
    existing = await db.resale_requests.find_one({
        "property_id": request_data.property_id,
        "customer_id": customer_id,
        "status": {"$in": ["pending", "processing"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending resale request for this property")
    
    # Get property and project details
    property_doc = await db.properties.find_one({"id": request_data.property_id}, {"_id": 0})
    
    # Create resale request
    resale_request = {
        "id": str(uuid.uuid4()),
        "tenant_id": session["tenant_id"],
        "customer_id": customer_id,
        "property_id": request_data.property_id,
        "booking_id": booking.get("id"),
        "property_number": property_doc.get("property_number") if property_doc else None,
        "project_id": property_doc.get("project_id") if property_doc else None,
        "reason": request_data.reason,
        "expected_price": request_data.expected_price,
        "current_price": property_doc.get("price") if property_doc else None,
        "paid_amount": booking.get("paid_amount", 0),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.resale_requests.insert_one(resale_request)
    
    # Send notification to admin (mock)
    try:
        from services.notification_service import send_notification
        await send_notification(
            db=db,
            tenant_id=session["tenant_id"],
            title="New Resale Request",
            message=f"Customer requested resale for Plot {property_doc.get('property_number', 'N/A')}",
            notification_type="resale_request",
            reference_id=resale_request["id"]
        )
    except:
        pass  # Notification is optional
    
    return {
        "success": True,
        "message": "Resale request submitted successfully",
        "request_id": resale_request["id"]
    }


@router.get("/resale-requests")
async def get_my_resale_requests(request: Request):
    """Get all resale requests by the customer"""
    db = get_db(request)
    session = await get_portal_session(request)
    
    if not session:
        raise HTTPException(status_code=401, detail="Please login to continue")
    
    requests = await db.resale_requests.find({
        "customer_id": session["customer_id"]
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"requests": requests}
