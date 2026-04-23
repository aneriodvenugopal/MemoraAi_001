"""
Vendor Management Routes
- Vendor CRUD
- Bill management
- Payment tracking
- Statistics
"""
from fastapi import APIRouter, HTTPException, Request
from models.vendor_management import (
    Vendor, VendorBill, VendorPayment, VendorStatus, PaymentStatus,
    VendorCreate, VendorUpdate, BillCreate, BillUpdate, PaymentCreate
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/vendor-management", tags=["vendor-management"])


def get_db(request: Request):
    return request.app.state.db


# ==================== Vendor CRUD ====================

@router.post("/vendors")
async def create_vendor(vendor_data: VendorCreate, request: Request):
    """Create a new vendor"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check for duplicate phone
    existing = await db.vendors.find_one({
        "tenant_id": user["tenant_id"],
        "phone": vendor_data.phone
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vendor with this phone already exists")
    
    vendor = Vendor(
        tenant_id=user["tenant_id"],
        created_by=user["user_id"],
        **vendor_data.model_dump()
    )
    
    await db.vendors.insert_one(vendor.model_dump())
    
    return {
        "success": True,
        "message": "Vendor created successfully",
        "vendor": vendor.model_dump()
    }


@router.get("/vendors")
async def get_vendors(
    request: Request,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all vendors with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    if category and category != "all":
        query["category"] = category
    
    if status and status != "all":
        query["status"] = status
    
    vendors = await db.vendors.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendors.count_documents(query)
    
    # Add payment summary for each vendor
    for vendor in vendors:
        bills = await db.vendor_bills.find(
            {"vendor_id": vendor["id"]},
            {"total_amount": 1, "paid_amount": 1, "status": 1}
        ).to_list(1000)
        
        vendor["total_billed"] = sum(b.get("total_amount", 0) for b in bills)
        vendor["total_paid"] = sum(b.get("paid_amount", 0) for b in bills)
        vendor["outstanding"] = vendor["total_billed"] - vendor["total_paid"]
        vendor["pending_bills"] = len([b for b in bills if b.get("status") in ["pending", "partial", "overdue"]])
    
    return {
        "success": True,
        "vendors": vendors,
        "total": total
    }


@router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, request: Request):
    """Get single vendor details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    vendor = await db.vendors.find_one(
        {"id": vendor_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get bills
    bills = await db.vendor_bills.find(
        {"vendor_id": vendor_id},
        {"_id": 0}
    ).sort("bill_date", -1).to_list(100)
    
    # Get payments
    payments = await db.vendor_payments.find(
        {"vendor_id": vendor_id},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    
    # Calculate summary
    summary = {
        "total_billed": sum(b.get("total_amount", 0) for b in bills),
        "total_paid": sum(p.get("amount", 0) for p in payments),
        "pending_bills": len([b for b in bills if b.get("status") in ["pending", "partial", "overdue"]]),
        "overdue_bills": len([b for b in bills if b.get("status") == "overdue"])
    }
    summary["outstanding"] = summary["total_billed"] - summary["total_paid"]
    
    return {
        "success": True,
        "vendor": vendor,
        "bills": bills,
        "payments": payments,
        "summary": summary
    }


@router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, update_data: VendorUpdate, request: Request):
    """Update vendor"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    vendor = await db.vendors.find_one(
        {"id": vendor_id, "tenant_id": user["tenant_id"]}
    )
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": update_dict}
    )
    
    return {
        "success": True,
        "message": "Vendor updated successfully"
    }


@router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, request: Request):
    """Delete vendor (soft delete by setting status to inactive)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check for pending bills
    pending_bills = await db.vendor_bills.count_documents({
        "vendor_id": vendor_id,
        "status": {"$in": ["pending", "partial", "overdue"]}
    })
    
    if pending_bills > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete vendor with {pending_bills} pending bills"
        )
    
    await db.vendors.update_one(
        {"id": vendor_id, "tenant_id": user["tenant_id"]},
        {"$set": {
            "status": "inactive",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Vendor deactivated"
    }


# ==================== Bill Management ====================

@router.post("/bills")
async def create_bill(bill_data: BillCreate, request: Request):
    """Create a new vendor bill"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify vendor exists
    vendor = await db.vendors.find_one({"id": bill_data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Calculate total
    total_amount = bill_data.amount + bill_data.tax_amount
    
    bill = VendorBill(
        tenant_id=user["tenant_id"],
        total_amount=total_amount,
        balance_amount=total_amount,
        created_by=user["user_id"],
        **bill_data.model_dump()
    )
    
    await db.vendor_bills.insert_one(bill.model_dump())
    
    return {
        "success": True,
        "message": "Bill created successfully",
        "bill": bill.model_dump()
    }


@router.get("/bills")
async def get_bills(
    request: Request,
    vendor_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all vendor bills with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if vendor_id:
        query["vendor_id"] = vendor_id
    if project_id:
        query["project_id"] = project_id
    if status and status != "all":
        query["status"] = status
    
    # Update overdue status for pending bills
    now = datetime.now(timezone.utc)
    await db.vendor_bills.update_many(
        {
            "tenant_id": user["tenant_id"],
            "status": {"$in": ["pending", "partial"]},
            "due_date": {"$lt": now}
        },
        {"$set": {"status": "overdue"}}
    )
    
    bills = await db.vendor_bills.find(query, {"_id": 0}).sort("bill_date", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_bills.count_documents(query)
    
    # Add vendor name
    for bill in bills:
        vendor = await db.vendors.find_one({"id": bill["vendor_id"]}, {"_id": 0, "name": 1})
        bill["vendor_name"] = vendor.get("name", "") if vendor else ""
    
    return {
        "success": True,
        "bills": bills,
        "total": total
    }


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str, request: Request):
    """Get single bill details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    bill = await db.vendor_bills.find_one(
        {"id": bill_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Get vendor
    vendor = await db.vendors.find_one({"id": bill["vendor_id"]}, {"_id": 0, "name": 1, "phone": 1})
    
    # Get payments for this bill
    payments = await db.vendor_payments.find(
        {"bill_id": bill_id},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(50)
    
    return {
        "success": True,
        "bill": bill,
        "vendor": vendor,
        "payments": payments
    }


@router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, update_data: BillUpdate, request: Request):
    """Update bill"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    bill = await db.vendor_bills.find_one(
        {"id": bill_id, "tenant_id": user["tenant_id"]}
    )
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Recalculate total if amount changed
    if "amount" in update_dict or "tax_amount" in update_dict:
        amount = update_dict.get("amount", bill.get("amount", 0))
        tax = update_dict.get("tax_amount", bill.get("tax_amount", 0))
        update_dict["total_amount"] = amount + tax
        update_dict["balance_amount"] = update_dict["total_amount"] - bill.get("paid_amount", 0)
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendor_bills.update_one(
        {"id": bill_id},
        {"$set": update_dict}
    )
    
    return {
        "success": True,
        "message": "Bill updated successfully"
    }


# ==================== Payment Management ====================

@router.post("/payments")
async def create_payment(payment_data: PaymentCreate, request: Request):
    """Record payment to vendor"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify vendor
    vendor = await db.vendors.find_one({"id": payment_data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    payment = VendorPayment(
        tenant_id=user["tenant_id"],
        approved_by=user["user_id"],
        created_by=user["user_id"],
        **payment_data.model_dump()
    )
    
    await db.vendor_payments.insert_one(payment.model_dump())
    
    # Update bill if linked
    if payment_data.bill_id:
        bill = await db.vendor_bills.find_one({"id": payment_data.bill_id})
        if bill:
            new_paid = bill.get("paid_amount", 0) + payment_data.amount
            new_balance = bill.get("total_amount", 0) - new_paid
            
            new_status = "paid" if new_balance <= 0 else "partial"
            
            await db.vendor_bills.update_one(
                {"id": payment_data.bill_id},
                {"$set": {
                    "paid_amount": new_paid,
                    "balance_amount": new_balance,
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return {
        "success": True,
        "message": "Payment recorded successfully",
        "payment": payment.model_dump()
    }


@router.get("/payments")
async def get_payments(
    request: Request,
    vendor_id: Optional[str] = None,
    project_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all vendor payments"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if vendor_id:
        query["vendor_id"] = vendor_id
    if project_id:
        query["project_id"] = project_id
    
    payments = await db.vendor_payments.find(query, {"_id": 0}).sort("payment_date", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_payments.count_documents(query)
    
    # Add vendor name
    for payment in payments:
        vendor = await db.vendors.find_one({"id": payment["vendor_id"]}, {"_id": 0, "name": 1})
        payment["vendor_name"] = vendor.get("name", "") if vendor else ""
    
    return {
        "success": True,
        "payments": payments,
        "total": total,
        "total_amount": sum(p.get("amount", 0) for p in payments)
    }


# ==================== Statistics ====================

@router.get("/stats")
async def get_vendor_stats(
    request: Request,
    project_id: Optional[str] = None
):
    """Get vendor management statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    bill_query = {"tenant_id": user["tenant_id"]}
    
    if project_id:
        bill_query["project_id"] = project_id
    
    # Vendor counts
    total_vendors = await db.vendors.count_documents(query)
    active_vendors = await db.vendors.count_documents({**query, "status": "active"})
    
    # By category
    categories = await db.vendors.aggregate([
        {"$match": query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]).to_list(20)
    by_category = {c["_id"]: c["count"] for c in categories}
    
    # Bill statistics
    all_bills = await db.vendor_bills.find(bill_query, {"_id": 0, "total_amount": 1, "paid_amount": 1, "status": 1}).to_list(10000)
    
    total_billed = sum(b.get("total_amount", 0) for b in all_bills)
    total_paid = sum(b.get("paid_amount", 0) for b in all_bills)
    total_outstanding = total_billed - total_paid
    
    # By status
    by_status = {}
    for status in PaymentStatus:
        by_status[status.value] = len([b for b in all_bills if b.get("status") == status.value])
    
    # Overdue amount
    overdue_bills = [b for b in all_bills if b.get("status") == "overdue"]
    overdue_amount = sum(b.get("total_amount", 0) - b.get("paid_amount", 0) for b in overdue_bills)
    
    # This month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    payments_this_month = await db.vendor_payments.find({
        "tenant_id": user["tenant_id"],
        "payment_date": {"$gte": month_start.isoformat()}
    }).to_list(1000)
    paid_this_month = sum(p.get("amount", 0) for p in payments_this_month)
    
    return {
        "success": True,
        "stats": {
            "total_vendors": total_vendors,
            "active_vendors": active_vendors,
            "by_category": by_category,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "total_outstanding": round(total_outstanding, 2),
            "bills_by_status": by_status,
            "overdue_count": len(overdue_bills),
            "overdue_amount": round(overdue_amount, 2),
            "paid_this_month": round(paid_this_month, 2)
        }
    }
