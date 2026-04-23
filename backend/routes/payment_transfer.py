from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class PaymentTransferCreate(BaseModel):
    vendor_id: str
    bill_id: Optional[str] = None
    from_account_id: str
    amount: float
    payment_mode: str  # cash, neft, rtgs, upi, cheque
    transaction_id: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[datetime] = None
    notes: Optional[str] = None
    tenant_id: str


@router.post("/payment-transfer", response_model=dict)
async def create_payment_transfer(
    payment: PaymentTransferCreate,
    current_user: dict = Depends(get_current_user)
):
    """Make payment to vendor"""
    
    # Verify vendor exists
    vendor = await db.vendors.find_one({"id": payment.vendor_id, "deleted_at": None})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Verify bank account exists and has sufficient balance
    from_account = await db.bank_accounts.find_one(
        {"id": payment.from_account_id, "deleted_at": None}
    )
    if not from_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    if from_account["available_balance"] < payment.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: ₹{from_account['available_balance']:,.2f}"
        )
    
    # If bill_id provided, verify bill exists
    bill = None
    if payment.bill_id:
        bill = await db.vendor_bills.find_one({"id": payment.bill_id, "deleted_at": None})
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Check if amount exceeds pending balance
        if payment.amount > bill["balance_amount"]:
            raise HTTPException(
                status_code=400,
                detail=f"Payment amount exceeds pending balance (₹{bill['balance_amount']:,.2f})"
            )
    
    transaction_id = str(uuid.uuid4())
    
    # Create transaction record
    transaction_data = {
        "id": transaction_id,
        "transaction_type": "debit",
        "transaction_date": datetime.now(timezone.utc),
        "from_account_id": payment.from_account_id,
        "from_account_name": from_account["account_name"],
        "to_account_id": None,
        "amount": payment.amount,
        "payment_mode": payment.payment_mode,
        "transaction_id": payment.transaction_id,
        "cheque_number": payment.cheque_number,
        "cheque_date": payment.cheque_date,
        "cheque_status": "cleared" if payment.payment_mode != "cheque" else "pending",
        "reference_type": "vendor_payment",
        "reference_id": payment.bill_id,
        "vendor_id": payment.vendor_id,
        "vendor_name": vendor["vendor_name"],
        "description": f"Payment to {vendor['vendor_name']}",
        "notes": payment.notes,
        "tenant_id": payment.tenant_id,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user["id"],
        "deleted_at": None
    }
    
    await db.transactions.insert_one(transaction_data)
    
    # Update bank account balance
    new_balance = from_account["current_balance"] - payment.amount
    await db.bank_accounts.update_one(
        {"id": payment.from_account_id},
        {"$set": {
            "current_balance": new_balance,
            "available_balance": new_balance,  # Will recalculate if cheque
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update vendor totals
    await db.vendors.update_one(
        {"id": payment.vendor_id},
        {
            "$inc": {
                "total_paid": payment.amount,
                "balance_due": -payment.amount
            },
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Update bill if provided
    if bill:
        new_paid = bill["paid_amount"] + payment.amount
        new_balance = bill["balance_amount"] - payment.amount
        new_status = "paid" if new_balance == 0 else "partial"
        
        await db.vendor_bills.update_one(
            {"id": payment.bill_id},
            {
                "$set": {
                    "paid_amount": new_paid,
                    "balance_amount": new_balance,
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$inc": {"payment_count": 1}
            }
        )
    
    # If cheque, create cheque record
    if payment.payment_mode == "cheque":
        cheque_id = str(uuid.uuid4())
        cheque_data = {
            "id": cheque_id,
            "transaction_id": transaction_id,
            "cheque_number": payment.cheque_number,
            "cheque_date": payment.cheque_date,
            "cheque_amount": payment.amount,
            "bank_name": from_account.get("bank_name", ""),
            "account_id": payment.from_account_id,
            "status": "pending",
            "expected_clearing_date": None,
            "actual_clearing_date": None,
            "vendor_id": payment.vendor_id,
            "tenant_id": payment.tenant_id,
            "created_at": datetime.now(timezone.utc),
            "deleted_at": None
        }
        await db.cheques.insert_one(cheque_data)
    
    return {
        "success": True,
        "message": f"Payment of ₹{payment.amount:,.2f} made to {vendor['vendor_name']}",
        "transaction_id": transaction_id,
        "new_balance": new_balance
    }


@router.get("/payment-transfer/recent", response_model=dict)
async def get_recent_transfers(
    tenant_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get recent payment transfers"""
    
    if not tenant_id:
        tenant_id = current_user.get("tenant_id")
    
    transfers = await db.transactions.find(
        {
            "tenant_id": tenant_id,
            "reference_type": "vendor_payment",
            "deleted_at": None
        },
        {"_id": 0}
    ).sort("transaction_date", -1).limit(limit).to_list(length=limit)
    
    return {
        "success": True,
        "transfers": transfers,
        "total": len(transfers)
    }
