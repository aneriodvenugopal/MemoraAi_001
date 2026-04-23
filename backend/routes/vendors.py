from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from models.vendor import VendorCreate, VendorUpdate, Vendor, VendorBillCreate, VendorBillUpdate, VendorBill
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@router.post("/vendors", response_model=dict)
async def create_vendor(
    vendor: VendorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new vendor/contact"""
    
    vendor_id = str(uuid.uuid4())
    
    # Auto-generate vendor code if not provided
    if not vendor.vendor_code:
        # Get count for code generation
        count = await db.vendors.count_documents({"tenant_id": vendor.tenant_id}) + 1
        vendor.vendor_code = f"VEN{count:04d}"
    
    vendor_data = {
        **vendor.dict(),
        "id": vendor_id,
        "total_billed": 0.0,
        "total_paid": 0.0,
        "balance_due": 0.0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
        "deleted_at": None,
        "created_by": current_user["id"]
    }
    
    await db.vendors.insert_one(vendor_data)
    
    return {
        "success": True,
        "message": "Vendor created successfully",
        "vendor_id": vendor_id,
        "vendor_code": vendor.vendor_code
    }


@router.get("/vendors", response_model=dict)
async def get_vendors(
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,  # contact, active_vendor, all
    vendor_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all vendors with filters"""
    
    if not tenant_id:
        tenant_id = current_user.get("tenant_id")
    
    query = {
        "tenant_id": tenant_id,
        "deleted_at": None
    }
    
    if project_id:
        query["project_id"] = project_id
    
    if status and status != "all":
        query["status"] = status
    
    if vendor_type:
        query["vendor_type"] = vendor_type
    
    vendors = await db.vendors.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=None)
    
    # Separate by status
    contacts = [v for v in vendors if v["status"] == "contact"]
    active_vendors = [v for v in vendors if v["status"] == "active_vendor"]
    
    return {
        "success": True,
        "vendors": vendors,
        "contacts": contacts,
        "active_vendors": active_vendors,
        "summary": {
            "total": len(vendors),
            "contacts": len(contacts),
            "active_vendors": len(active_vendors),
            "total_balance_due": sum(v["balance_due"] for v in active_vendors)
        }
    }


@router.get("/vendors/{vendor_id}", response_model=dict)
async def get_vendor(
    vendor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get vendor details with bills and payment history"""
    
    vendor = await db.vendors.find_one(
        {"id": vendor_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get vendor bills
    bills = await db.vendor_bills.find(
        {"vendor_id": vendor_id, "deleted_at": None},
        {"_id": 0}
    ).sort("bill_date", -1).to_list(length=None)
    
    # Get payment history
    payments = await db.transactions.find(
        {
            "vendor_id": vendor_id,
            "reference_type": "vendor_payment",
            "deleted_at": None
        },
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(length=None)
    
    return {
        "success": True,
        "vendor": vendor,
        "bills": bills,
        "payments": payments,
        "summary": {
            "total_bills": len(bills),
            "pending_bills": len([b for b in bills if b["status"] != "paid"]),
            "total_payments": len(payments)
        }
    }


@router.put("/vendors/{vendor_id}", response_model=dict)
async def update_vendor(
    vendor_id: str,
    vendor_update: VendorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update vendor details"""
    
    vendor = await db.vendors.find_one({"id": vendor_id, "deleted_at": None})
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = {k: v for k, v in vendor_update.dict(exclude_unset=True).items()}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.vendors.update_one(
            {"id": vendor_id},
            {"$set": update_data}
        )
    
    return {
        "success": True,
        "message": "Vendor updated successfully"
    }


@router.post("/vendors/{vendor_id}/convert-to-active", response_model=dict)
async def convert_to_active_vendor(
    vendor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Convert contact to active vendor"""
    
    vendor = await db.vendors.find_one({"id": vendor_id, "deleted_at": None})
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {
            "status": "active_vendor",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "success": True,
        "message": f"{vendor['vendor_name']} is now an active vendor"
    }


# Vendor Bills Management

@router.post("/vendor-bills", response_model=dict)
async def create_vendor_bill(
    bill: VendorBillCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new vendor bill/commitment"""
    
    # Verify vendor exists
    vendor = await db.vendors.find_one({"id": bill.vendor_id, "deleted_at": None})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Convert vendor to active if not already
    if vendor["status"] == "contact":
        await db.vendors.update_one(
            {"id": bill.vendor_id},
            {"$set": {"status": "active_vendor"}}
        )
    
    bill_id = str(uuid.uuid4())
    
    # Auto-generate bill number if not provided
    if not bill.bill_number:
        count = await db.vendor_bills.count_documents({"tenant_id": bill.tenant_id}) + 1
        bill.bill_number = f"BILL{count:05d}"
    
    bill_data = {
        **bill.dict(),
        "id": bill_id,
        "paid_amount": 0.0,
        "balance_amount": bill.committed_amount,
        "payment_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
        "deleted_at": None,
        "created_by": current_user["id"]
    }
    
    await db.vendor_bills.insert_one(bill_data)
    
    # Update vendor totals
    await db.vendors.update_one(
        {"id": bill.vendor_id},
        {
            "$inc": {
                "total_billed": bill.committed_amount,
                "balance_due": bill.committed_amount
            }
        }
    )
    
    return {
        "success": True,
        "message": "Bill created successfully",
        "bill_id": bill_id,
        "bill_number": bill.bill_number
    }


@router.get("/vendor-bills", response_model=dict)
async def get_vendor_bills(
    tenant_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get vendor bills with filters"""
    
    if not tenant_id:
        tenant_id = current_user.get("tenant_id")
    
    query = {
        "tenant_id": tenant_id,
        "deleted_at": None
    }
    
    if vendor_id:
        query["vendor_id"] = vendor_id
    
    if project_id:
        query["project_id"] = project_id
    
    if status:
        query["status"] = status
    
    bills = await db.vendor_bills.find(
        query,
        {"_id": 0}
    ).sort("bill_date", -1).to_list(length=None)
    
    # Enrich with vendor names
    for bill in bills:
        vendor = await db.vendors.find_one(
            {"id": bill["vendor_id"]},
            {"vendor_name": 1, "vendor_code": 1, "_id": 0}
        )
        if vendor:
            bill["vendor_name"] = vendor["vendor_name"]
            bill["vendor_code"] = vendor["vendor_code"]
    
    return {
        "success": True,
        "bills": bills,
        "summary": {
            "total_bills": len(bills),
            "total_committed": sum(b["committed_amount"] for b in bills),
            "total_paid": sum(b["paid_amount"] for b in bills),
            "total_pending": sum(b["balance_amount"] for b in bills)
        }
    }


@router.get("/vendor-bills/{bill_id}", response_model=dict)
async def get_vendor_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get bill details with payment history"""
    
    bill = await db.vendor_bills.find_one(
        {"id": bill_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Get vendor details
    vendor = await db.vendors.find_one(
        {"id": bill["vendor_id"]},
        {"_id": 0}
    )
    
    # Get payment history for this bill
    payments = await db.transactions.find(
        {
            "reference_type": "vendor_payment",
            "reference_id": bill_id,
            "deleted_at": None
        },
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(length=None)
    
    return {
        "success": True,
        "bill": bill,
        "vendor": vendor,
        "payments": payments,
        "payment_history_detail": [
            {
                "date": p["transaction_date"],
                "amount": p["amount"],
                "payment_mode": p["payment_mode"],
                "from_account": p.get("from_account_name"),
                "reference": p.get("transaction_id")
            }
            for p in payments
        ]
    }
