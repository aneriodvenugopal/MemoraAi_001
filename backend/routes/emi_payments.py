"""
Strict EMI Payment Module Routes
- Create/manage EMI schedules
- Track payments and late fees
- Overdue detection and reminders
- Statistics and reporting
"""
from fastapi import APIRouter, HTTPException, Request
from models.emi_payment import (
    EMISchedule, EMIPaymentRecord, EMISummary, EMIStatus,
    CreateEMIScheduleRequest, RecordEMIPaymentRequest, WaiveLateFeeRequest
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/emi-payments", tags=["emi-payments"])


def get_db(request: Request):
    return request.app.state.db


def calculate_late_fee(due_amount: float, days_overdue: int, late_fee_percentage: float) -> float:
    """Calculate late fee based on days overdue"""
    if days_overdue <= 0:
        return 0
    # Monthly late fee = due_amount * percentage / 100
    # Daily late fee = monthly / 30
    months_overdue = days_overdue / 30
    late_fee = due_amount * (late_fee_percentage / 100) * months_overdue
    return round(late_fee, 2)


async def update_overdue_status(db, emi: dict) -> dict:
    """Update overdue status and calculate late fee for an EMI"""
    if emi["status"] in ["paid", "waived"]:
        return emi
    
    now = datetime.now(timezone.utc)
    due_date = emi["due_date"]
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
    elif isinstance(due_date, datetime) and due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    
    if now > due_date:
        days_overdue = (now - due_date).days
        late_fee = calculate_late_fee(
            emi["due_amount"] - emi.get("paid_amount", 0),
            days_overdue,
            emi.get("late_fee_percentage", 2.0)
        )
        
        remaining = emi["due_amount"] - emi.get("paid_amount", 0)
        total_due = remaining + late_fee
        
        update_data = {
            "is_overdue": True,
            "days_overdue": days_overdue,
            "late_fee_amount": late_fee,
            "total_due": total_due,
            "remaining_amount": remaining,
            "status": "overdue" if emi.get("paid_amount", 0) == 0 else "partial",
            "updated_at": now.isoformat()
        }
        
        await db.emi_schedules.update_one(
            {"id": emi["id"]},
            {"$set": update_data}
        )
        
        emi.update(update_data)
    
    return emi


# ==================== EMI Schedule Management ====================

@router.post("/schedules/create")
async def create_emi_schedule(
    schedule_request: CreateEMIScheduleRequest,
    request: Request
):
    """Create EMI schedule for a booking"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get booking
    booking = await db.bookings.find_one(
        {"id": schedule_request.booking_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if EMI schedule already exists
    existing = await db.emi_schedules.find_one({
        "booking_id": schedule_request.booking_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="EMI schedule already exists for this booking")
    
    # Calculate EMI details
    remaining_amount = schedule_request.total_amount - schedule_request.down_payment
    monthly_emi = round(remaining_amount / schedule_request.emi_months, 2)
    
    start_date = schedule_request.start_date or datetime.now(timezone.utc)
    schedules_created = []
    
    # Create down payment schedule if applicable
    if schedule_request.down_payment > 0:
        down_payment_schedule = EMISchedule(
            tenant_id=user["tenant_id"],
            project_id=booking["project_id"],
            booking_id=schedule_request.booking_id,
            customer_id=booking.get("customer_id", ""),
            property_id=booking["property_id"],
            installment_number=0,
            due_amount=schedule_request.down_payment,
            due_date=start_date + timedelta(days=7),  # Due in 7 days
            remaining_amount=schedule_request.down_payment,
            total_due=schedule_request.down_payment,
            late_fee_percentage=schedule_request.late_fee_percentage
        )
        await db.emi_schedules.insert_one(down_payment_schedule.model_dump())
        schedules_created.append(down_payment_schedule.model_dump())
    
    # Create monthly EMI schedules
    for i in range(1, schedule_request.emi_months + 1):
        due_date = start_date + timedelta(days=30 * i)
        
        # Last EMI might be slightly different due to rounding
        if i == schedule_request.emi_months:
            calculated_total = schedule_request.down_payment + (monthly_emi * (schedule_request.emi_months - 1))
            monthly_emi = round(schedule_request.total_amount - calculated_total, 2)
        
        emi_schedule = EMISchedule(
            tenant_id=user["tenant_id"],
            project_id=booking["project_id"],
            booking_id=schedule_request.booking_id,
            customer_id=booking.get("customer_id", ""),
            property_id=booking["property_id"],
            installment_number=i,
            due_amount=monthly_emi,
            due_date=due_date,
            remaining_amount=monthly_emi,
            total_due=monthly_emi,
            late_fee_percentage=schedule_request.late_fee_percentage
        )
        await db.emi_schedules.insert_one(emi_schedule.model_dump())
        schedules_created.append(emi_schedule.model_dump())
    
    return {
        "success": True,
        "message": f"Created {len(schedules_created)} EMI schedules",
        "booking_id": schedule_request.booking_id,
        "total_amount": schedule_request.total_amount,
        "down_payment": schedule_request.down_payment,
        "monthly_emi": monthly_emi,
        "emi_months": schedule_request.emi_months,
        "schedules": schedules_created
    }


@router.get("/schedules")
async def get_emi_schedules(
    request: Request,
    booking_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get EMI schedules with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if booking_id:
        query["booking_id"] = booking_id
    if customer_id:
        query["customer_id"] = customer_id
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if is_overdue is not None:
        query["is_overdue"] = is_overdue
    
    schedules = await db.emi_schedules.find(
        query, {"_id": 0}
    ).sort([("booking_id", 1), ("installment_number", 1)]).skip(skip).limit(limit).to_list(limit)
    
    # Update overdue status for each schedule
    updated_schedules = []
    for emi in schedules:
        updated_emi = await update_overdue_status(db, emi)
        updated_schedules.append(updated_emi)
    
    total = await db.emi_schedules.count_documents(query)
    
    return {
        "success": True,
        "schedules": updated_schedules,
        "total": total
    }


@router.get("/schedules/booking/{booking_id}")
async def get_booking_emi_schedule(booking_id: str, request: Request):
    """Get all EMI details for a specific booking"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get booking details
    booking = await db.bookings.find_one(
        {"id": booking_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get property and project
    property_doc = await db.properties.find_one({"id": booking["property_id"]}, {"_id": 0, "display_name": 1, "plot_number": 1})
    project_doc = await db.projects.find_one({"id": booking["project_id"]}, {"_id": 0, "name": 1})
    
    # Get all EMI schedules
    schedules = await db.emi_schedules.find(
        {"booking_id": booking_id},
        {"_id": 0}
    ).sort("installment_number", 1).to_list(100)
    
    # Update overdue status
    updated_schedules = []
    for emi in schedules:
        updated_emi = await update_overdue_status(db, emi)
        updated_schedules.append(updated_emi)
    
    # Calculate summary
    total_emi = sum(s["due_amount"] for s in updated_schedules)
    total_paid = sum(s.get("paid_amount", 0) for s in updated_schedules)
    total_pending = total_emi - total_paid
    total_late_fees = sum(s.get("late_fee_amount", 0) for s in updated_schedules)
    
    paid_count = len([s for s in updated_schedules if s["status"] == "paid"])
    overdue_count = len([s for s in updated_schedules if s.get("is_overdue", False) and s["status"] != "paid"])
    pending_count = len(updated_schedules) - paid_count
    
    # Next due
    pending_schedules = [s for s in updated_schedules if s["status"] not in ["paid", "waived"]]
    next_due = pending_schedules[0] if pending_schedules else None
    
    summary = EMISummary(
        booking_id=booking_id,
        customer_name=booking.get("customer_name", ""),
        property_name=property_doc.get("display_name") or property_doc.get("plot_number", "") if property_doc else "",
        project_name=project_doc.get("name", "") if project_doc else "",
        total_emi_amount=total_emi,
        total_paid=total_paid,
        total_pending=total_pending,
        total_late_fees=total_late_fees,
        total_installments=len(updated_schedules),
        paid_installments=paid_count,
        pending_installments=pending_count,
        overdue_installments=overdue_count,
        next_due_date=next_due["due_date"] if next_due else None,
        next_due_amount=next_due["total_due"] if next_due else None,
        payment_progress=round((total_paid / total_emi * 100), 2) if total_emi > 0 else 0
    )
    
    return {
        "success": True,
        "summary": summary.model_dump(),
        "schedules": updated_schedules,
        "booking": booking
    }


@router.get("/schedules/{emi_id}")
async def get_emi_schedule(emi_id: str, request: Request):
    """Get single EMI schedule details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    emi = await db.emi_schedules.find_one(
        {"id": emi_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI schedule not found")
    
    # Update overdue status
    emi = await update_overdue_status(db, emi)
    
    # Get payment history
    payments = await db.emi_payments.find(
        {"emi_id": emi_id},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(50)
    
    return {
        "success": True,
        "emi": emi,
        "payments": payments
    }


# ==================== Payment Recording ====================

@router.post("/payments/record")
async def record_emi_payment(
    payment_request: RecordEMIPaymentRequest,
    request: Request
):
    """Record payment against an EMI installment"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get EMI schedule
    emi = await db.emi_schedules.find_one(
        {"id": payment_request.emi_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI schedule not found")
    
    if emi["status"] == "paid":
        raise HTTPException(status_code=400, detail="EMI is already fully paid")
    
    # Update overdue status first
    emi = await update_overdue_status(db, emi)
    
    # Calculate payment allocation
    payment_amount = payment_request.amount
    late_fee_paid = 0
    principal_paid = 0
    
    if payment_request.include_late_fee and emi.get("late_fee_amount", 0) > 0:
        # First pay late fee, then principal
        late_fee_due = emi["late_fee_amount"]
        if payment_amount >= late_fee_due:
            late_fee_paid = late_fee_due
            principal_paid = payment_amount - late_fee_due
        else:
            late_fee_paid = payment_amount
            principal_paid = 0
    else:
        principal_paid = payment_amount
    
    # Generate receipt number
    receipt_number = f"EMI-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create payment record
    payment_record = EMIPaymentRecord(
        tenant_id=user["tenant_id"],
        emi_id=payment_request.emi_id,
        booking_id=emi["booking_id"],
        customer_id=emi["customer_id"],
        amount=payment_amount,
        payment_method=payment_request.payment_method,
        transaction_id=payment_request.transaction_id,
        reference_number=payment_request.reference_number,
        receipt_number=receipt_number,
        late_fee_paid=late_fee_paid,
        principal_paid=principal_paid,
        collected_by=user["user_id"],
        notes=payment_request.notes
    )
    
    await db.emi_payments.insert_one(payment_record.model_dump())
    
    # Update EMI schedule
    new_paid_amount = emi.get("paid_amount", 0) + principal_paid
    new_remaining = emi["due_amount"] - new_paid_amount
    new_late_fee = max(0, emi.get("late_fee_amount", 0) - late_fee_paid)
    new_total_due = new_remaining + new_late_fee
    
    # Determine new status
    if new_remaining <= 0:
        new_status = "paid"
        is_overdue = False
    elif new_paid_amount > 0:
        new_status = "partial"
        is_overdue = emi.get("is_overdue", False)
    else:
        new_status = emi["status"]
        is_overdue = emi.get("is_overdue", False)
    
    await db.emi_schedules.update_one(
        {"id": payment_request.emi_id},
        {"$set": {
            "paid_amount": new_paid_amount,
            "remaining_amount": new_remaining,
            "late_fee_amount": new_late_fee,
            "total_due": new_total_due,
            "status": new_status,
            "is_overdue": is_overdue if new_status != "paid" else False,
            "payment_id": payment_record.id,
            "paid_date": datetime.now(timezone.utc).isoformat() if new_status == "paid" else None,
            "payment_method": payment_request.payment_method,
            "receipt_number": receipt_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Payment recorded successfully",
        "receipt_number": receipt_number,
        "payment": payment_record.model_dump(),
        "emi_status": new_status,
        "remaining_amount": new_remaining,
        "late_fee_remaining": new_late_fee
    }


# ==================== Late Fee Management ====================

@router.post("/late-fees/waive")
async def waive_late_fee(
    waive_request: WaiveLateFeeRequest,
    request: Request
):
    """Waive late fee (full or partial)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can waive late fees")
    
    emi = await db.emi_schedules.find_one(
        {"id": waive_request.emi_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI schedule not found")
    
    current_late_fee = emi.get("late_fee_amount", 0)
    if current_late_fee == 0:
        raise HTTPException(status_code=400, detail="No late fee to waive")
    
    waive_amount = waive_request.partial_waive_amount or current_late_fee
    new_late_fee = max(0, current_late_fee - waive_amount)
    new_total_due = emi.get("remaining_amount", emi["due_amount"]) + new_late_fee
    
    await db.emi_schedules.update_one(
        {"id": waive_request.emi_id},
        {"$set": {
            "late_fee_amount": new_late_fee,
            "total_due": new_total_due,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the waiver
    waiver_log = {
        "id": str(uuid.uuid4()),
        "emi_id": waive_request.emi_id,
        "waived_amount": waive_amount,
        "reason": waive_request.reason,
        "waived_by": user["user_id"],
        "waived_at": datetime.now(timezone.utc).isoformat()
    }
    await db.emi_late_fee_waivers.insert_one(waiver_log)
    
    return {
        "success": True,
        "message": f"Late fee of ₹{waive_amount} waived",
        "new_late_fee": new_late_fee,
        "new_total_due": new_total_due
    }


# ==================== Statistics & Reports ====================

@router.get("/stats")
async def get_emi_stats(
    request: Request,
    project_id: Optional[str] = None
):
    """Get EMI statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        query["project_id"] = project_id
    
    # Get all EMIs and update overdue status
    all_emis = await db.emi_schedules.find(query, {"_id": 0}).to_list(10000)
    
    for emi in all_emis:
        await update_overdue_status(db, emi)
    
    # Re-fetch after update
    all_emis = await db.emi_schedules.find(query, {"_id": 0}).to_list(10000)
    
    # Calculate statistics
    total_emis = len(all_emis)
    total_due = sum(e["due_amount"] for e in all_emis)
    total_paid = sum(e.get("paid_amount", 0) for e in all_emis)
    total_pending = total_due - total_paid
    total_late_fees = sum(e.get("late_fee_amount", 0) for e in all_emis)
    
    # By status
    by_status = {}
    for status in EMIStatus:
        count = len([e for e in all_emis if e["status"] == status.value])
        by_status[status.value] = count
    
    overdue_count = len([e for e in all_emis if e.get("is_overdue", False)])
    overdue_amount = sum(e.get("remaining_amount", 0) + e.get("late_fee_amount", 0) for e in all_emis if e.get("is_overdue", False))
    
    # Due this week - helper function to normalize datetime
    def normalize_datetime(dt):
        if isinstance(dt, str):
            return datetime.fromisoformat(dt.replace('Z', '+00:00'))
        elif isinstance(dt, datetime) and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    
    now = datetime.now(timezone.utc)
    week_end = now + timedelta(days=7)
    due_this_week = [e for e in all_emis if e["status"] not in ["paid", "waived"]]
    due_this_week = [e for e in due_this_week if normalize_datetime(e["due_date"]) <= week_end]
    
    return {
        "success": True,
        "stats": {
            "total_emis": total_emis,
            "total_due_amount": round(total_due, 2),
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_pending, 2),
            "total_late_fees": round(total_late_fees, 2),
            "collection_rate": round((total_paid / total_due * 100), 2) if total_due > 0 else 0,
            "by_status": by_status,
            "overdue_count": overdue_count,
            "overdue_amount": round(overdue_amount, 2),
            "due_this_week_count": len(due_this_week),
            "due_this_week_amount": round(sum(e.get("total_due", e["due_amount"]) for e in due_this_week), 2)
        }
    }


@router.get("/overdue")
async def get_overdue_emis(
    request: Request,
    project_id: Optional[str] = None,
    min_days_overdue: int = 1,
    skip: int = 0,
    limit: int = 100
):
    """Get all overdue EMIs"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {
        "tenant_id": user["tenant_id"],
        "status": {"$nin": ["paid", "waived"]}
    }
    if project_id:
        query["project_id"] = project_id
    
    # Get EMIs and update overdue status
    emis = await db.emi_schedules.find(query, {"_id": 0}).to_list(10000)
    
    overdue_emis = []
    for emi in emis:
        updated_emi = await update_overdue_status(db, emi)
        if updated_emi.get("is_overdue", False) and updated_emi.get("days_overdue", 0) >= min_days_overdue:
            # Get customer details
            customer = await db.customers.find_one({"id": updated_emi["customer_id"]}, {"_id": 0, "name": 1, "phone": 1})
            updated_emi["customer_name"] = customer.get("name", "") if customer else ""
            updated_emi["customer_phone"] = customer.get("phone", "") if customer else ""
            overdue_emis.append(updated_emi)
    
    # Sort by days overdue (highest first)
    overdue_emis.sort(key=lambda x: x.get("days_overdue", 0), reverse=True)
    
    # Paginate
    paginated = overdue_emis[skip:skip + limit]
    
    return {
        "success": True,
        "overdue_emis": paginated,
        "total": len(overdue_emis),
        "total_overdue_amount": round(sum(e.get("total_due", 0) for e in overdue_emis), 2)
    }


@router.get("/due-soon")
async def get_emis_due_soon(
    request: Request,
    days: int = 7,
    project_id: Optional[str] = None
):
    """Get EMIs due within specified days"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    now = datetime.now(timezone.utc)
    due_date_limit = now + timedelta(days=days)
    
    query = {
        "tenant_id": user["tenant_id"],
        "status": {"$nin": ["paid", "waived"]},
        "is_overdue": {"$ne": True}
    }
    if project_id:
        query["project_id"] = project_id
    
    emis = await db.emi_schedules.find(query, {"_id": 0}).to_list(1000)
    
    due_soon = []
    for emi in emis:
        due_date = emi["due_date"]
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        elif isinstance(due_date, datetime) and due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if now <= due_date <= due_date_limit:
            # Get customer details
            customer = await db.customers.find_one({"id": emi["customer_id"]}, {"_id": 0, "name": 1, "phone": 1})
            emi["customer_name"] = customer.get("name", "") if customer else ""
            emi["customer_phone"] = customer.get("phone", "") if customer else ""
            emi["days_until_due"] = (due_date - now).days
            due_soon.append(emi)
    
    # Sort by due date
    due_soon.sort(key=lambda x: x["due_date"])
    
    return {
        "success": True,
        "due_soon": due_soon,
        "count": len(due_soon),
        "total_amount": round(sum(e.get("total_due", e["due_amount"]) for e in due_soon), 2)
    }
