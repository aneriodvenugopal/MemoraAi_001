"""
Receipt Generation Routes
- Generate PDF receipts for payments
- Download and email receipts
- Store receipt records
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from middleware.auth import get_current_user
from services.receipt_service import receipt_generator
from datetime import datetime, timezone
from typing import Optional
import uuid
import base64

router = APIRouter(prefix="/receipts", tags=["receipts"])


def get_db(request: Request):
    return request.app.state.db


@router.get("/payment/{payment_id}")
async def generate_payment_receipt(
    payment_id: str,
    request: Request,
    download: bool = False
):
    """Generate receipt for a payment"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Try to find payment in emi_payments first
    payment = await db.emi_payments.find_one(
        {"id": payment_id},
        {"_id": 0}
    )
    payment_type = "emi"
    
    # If not found, try customer_payments
    if not payment:
        payment = await db.customer_payments.find_one(
            {"id": payment_id},
            {"_id": 0}
        )
        payment_type = "customer"
    
    # If still not found, try payments collection
    if not payment:
        payment = await db.payments.find_one(
            {"id": payment_id},
            {"_id": 0}
        )
        payment_type = "general"
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get customer info
    customer_id = payment.get("customer_id")
    customer = None
    if customer_id:
        customer = await db.customers.find_one(
            {"id": customer_id},
            {"_id": 0, "name": 1, "phone": 1, "email": 1, "address": 1}
        )
    
    if not customer:
        # Try to get from booking
        booking_id = payment.get("booking_id")
        if booking_id:
            booking = await db.bookings.find_one(
                {"id": booking_id},
                {"_id": 0, "customer_name": 1, "customer_phone": 1, "customer_email": 1}
            )
            if booking:
                customer = {
                    "name": booking.get("customer_name", "N/A"),
                    "phone": booking.get("customer_phone", "N/A"),
                    "email": booking.get("customer_email", "")
                }
    
    if not customer:
        customer = {"name": "N/A", "phone": "N/A", "email": ""}
    
    # Get property info if available
    property_data = None
    booking_data = None
    
    if payment.get("booking_id"):
        booking = await db.bookings.find_one(
            {"id": payment["booking_id"]},
            {"_id": 0}
        )
        if booking:
            booking_data = booking
            property_doc = await db.properties.find_one(
                {"id": booking["property_id"]},
                {"_id": 0, "display_name": 1, "plot_number": 1, "area": 1, "area_unit": 1}
            )
            project_doc = await db.projects.find_one(
                {"id": booking["project_id"]},
                {"_id": 0, "name": 1}
            )
            if property_doc:
                property_data = property_doc
                property_data["project_name"] = project_doc.get("name", "") if project_doc else ""
    
    # Get tenant company info
    company_info = None
    tenant_id = payment.get("tenant_id") or user.get("tenant_id")
    if tenant_id:
        tenant = await db.tenants.find_one(
            {"id": tenant_id},
            {"_id": 0, "name": 1, "address": 1, "city": 1, "phone": 1, "email": 1, "gst_number": 1}
        )
        if tenant:
            company_info = {
                "name": tenant.get("name", "ExlainERP"),
                "address": tenant.get("address", ""),
                "city": tenant.get("city", ""),
                "phone": tenant.get("phone", ""),
                "email": tenant.get("email", ""),
                "gstin": tenant.get("gst_number", "")
            }
    
    # Prepare payment data
    receipt_number = payment.get("receipt_number") or f"REC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    payment_data = {
        "amount": payment.get("amount", 0),
        "payment_date": payment.get("payment_date") or payment.get("created_at"),
        "payment_method": payment.get("payment_method", ""),
        "transaction_id": payment.get("transaction_id", ""),
        "reference_number": payment.get("reference_number", ""),
        "installment_number": payment.get("installment_number"),
        "late_fee_paid": payment.get("late_fee_paid", 0),
        "description": payment.get("description", "Payment")
    }
    
    # Generate PDF
    pdf_bytes = receipt_generator.generate_payment_receipt(
        receipt_number=receipt_number,
        payment_data=payment_data,
        customer_data=customer,
        property_data=property_data,
        booking_data=booking_data,
        company_info=company_info
    )
    
    # Store receipt record
    receipt_record = {
        "id": str(uuid.uuid4()),
        "receipt_number": receipt_number,
        "payment_id": payment_id,
        "payment_type": payment_type,
        "customer_id": customer_id,
        "tenant_id": tenant_id,
        "amount": payment.get("amount", 0),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user.get("user_id")
    }
    await db.receipts.update_one(
        {"payment_id": payment_id},
        {"$set": receipt_record},
        upsert=True
    )
    
    # Return PDF
    filename = f"Receipt_{receipt_number}.pdf"
    
    if download:
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )


@router.get("/emi-schedule/{booking_id}")
async def generate_emi_schedule_receipt(
    booking_id: str,
    request: Request,
    download: bool = False
):
    """Generate EMI schedule document for a booking"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get booking
    booking = await db.bookings.find_one(
        {"id": booking_id},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get EMI schedules
    schedules = await db.emi_schedules.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("installment_number", 1).to_list(100)
    
    if not schedules:
        raise HTTPException(status_code=404, detail="No EMI schedules found for this booking")
    
    # Get customer
    customer = {"name": booking.get("customer_name", "N/A"), "phone": booking.get("customer_phone", "")}
    if booking.get("customer_id"):
        customer_doc = await db.customers.find_one(
            {"id": booking["customer_id"]},
            {"_id": 0, "name": 1, "phone": 1}
        )
        if customer_doc:
            customer = customer_doc
    
    # Get property
    property_data = {"display_name": "N/A", "project_name": "N/A"}
    if booking.get("property_id"):
        property_doc = await db.properties.find_one(
            {"id": booking["property_id"]},
            {"_id": 0, "display_name": 1, "plot_number": 1}
        )
        if property_doc:
            property_data["display_name"] = property_doc.get("display_name") or property_doc.get("plot_number", "N/A")
    
    if booking.get("project_id"):
        project_doc = await db.projects.find_one(
            {"id": booking["project_id"]},
            {"_id": 0, "name": 1}
        )
        if project_doc:
            property_data["project_name"] = project_doc.get("name", "N/A")
    
    # Get company info
    company_info = None
    tenant_id = booking.get("tenant_id") or user.get("tenant_id")
    if tenant_id:
        tenant = await db.tenants.find_one(
            {"id": tenant_id},
            {"_id": 0, "name": 1, "address": 1}
        )
        if tenant:
            company_info = {
                "name": tenant.get("name", "ExlainERP"),
                "address": tenant.get("address", "")
            }
    
    # Generate PDF
    pdf_bytes = receipt_generator.generate_emi_schedule_pdf(
        booking_data=booking,
        customer_data=customer,
        property_data=property_data,
        schedules=schedules,
        company_info=company_info
    )
    
    # Return PDF
    filename = f"EMI_Schedule_{booking_id[:8]}.pdf"
    
    if download:
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}"
            }
        )


@router.get("/history")
async def get_receipt_history(
    request: Request,
    customer_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get receipt generation history"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user.get("tenant_id")}
    
    if customer_id:
        query["customer_id"] = customer_id
    
    receipts = await db.receipts.find(
        query,
        {"_id": 0}
    ).sort("generated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.receipts.count_documents(query)
    
    return {
        "success": True,
        "receipts": receipts,
        "total": total
    }


@router.post("/regenerate/{payment_id}")
async def regenerate_receipt(
    payment_id: str,
    request: Request
):
    """Regenerate receipt for a payment (creates new receipt number)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Generate new receipt number
    new_receipt_number = f"REC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Update payment with new receipt number
    result = await db.emi_payments.update_one(
        {"id": payment_id},
        {"$set": {"receipt_number": new_receipt_number, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        result = await db.customer_payments.update_one(
            {"id": payment_id},
            {"$set": {"receipt_number": new_receipt_number, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    if result.modified_count == 0:
        result = await db.payments.update_one(
            {"id": payment_id},
            {"$set": {"receipt_number": new_receipt_number, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        "success": True,
        "message": "Receipt number regenerated",
        "new_receipt_number": new_receipt_number
    }
