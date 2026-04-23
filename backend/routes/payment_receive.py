"""
Payment Receive Module — Record customer payments (NOT online processing).

Records: Customer pays → Cash/UPI/NEFT/Cheque/DD → into company bank/cash account.
Against: Project → Property → EMI/Booking/Advance/Other.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import os

from motor.motor_asyncio import AsyncIOMotorClient
from middleware.auth import get_current_user

router = APIRouter()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class PaymentReceiveCreate(BaseModel):
    tenant_id: str
    project_id: str
    property_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    to_account_id: str
    amount: float
    payment_mode: str  # cash, upi, neft, rtgs, cheque, dd, online
    payment_purpose: str  # emi, booking, advance, registration, other
    transaction_ref: Optional[str] = None  # UTR, UPI ref, NEFT ref
    cheque_number: Optional[str] = None
    cheque_date: Optional[str] = None
    cheque_bank: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[str] = None  # If recording past payment


class ChequeStatusUpdate(BaseModel):
    status: str  # cleared, bounced, cancelled
    clearing_date: Optional[str] = None
    bounce_reason: Optional[str] = None


# ──── PAYMENT RECEIVE ────

@router.post("/payment-receive", response_model=dict)
async def record_payment_receive(
    payment: PaymentReceiveCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Record a payment received from customer.
    This does NOT process online payment — just records the entry.
    """
    tenant_id = current_user.get("tenant_id")
    if payment.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")

    # Verify bank account exists
    to_account = await db.bank_accounts.find_one(
        {"id": payment.to_account_id, "tenant_id": tenant_id, "deleted_at": None},
        {"_id": 0},
    )
    if not to_account:
        raise HTTPException(status_code=404, detail="Bank account not found")

    txn_id = str(uuid.uuid4())
    pay_date = datetime.now(timezone.utc)
    if payment.payment_date:
        try:
            pay_date = datetime.fromisoformat(payment.payment_date).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    is_cheque = payment.payment_mode == "cheque"

    txn_data = {
        "id": txn_id,
        "transaction_type": "credit",
        "transaction_date": pay_date,
        "from_account_id": None,
        "to_account_id": payment.to_account_id,
        "to_account_name": to_account.get("account_name", ""),
        "amount": payment.amount,
        "payment_mode": payment.payment_mode,
        "payment_purpose": payment.payment_purpose,
        "transaction_ref": payment.transaction_ref,
        "cheque_number": payment.cheque_number,
        "cheque_date": payment.cheque_date,
        "cheque_bank": payment.cheque_bank,
        "cheque_status": "pending" if is_cheque else None,
        "reference_type": "customer_payment",
        "reference_id": payment.property_id,
        "project_id": payment.project_id,
        "property_id": payment.property_id,
        "customer_id": payment.customer_id,
        "customer_name": payment.customer_name,
        "customer_phone": payment.customer_phone,
        "description": f"Payment from {payment.customer_name} - {payment.payment_purpose}",
        "notes": payment.notes,
        "tenant_id": tenant_id,
        "status": "recorded",
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("id"),
        "deleted_at": None,
    }
    await db.transactions.insert_one(txn_data)

    # Update bank account balance (cheques go to uncleared, others go to available)
    if is_cheque:
        await db.bank_accounts.update_one(
            {"id": payment.to_account_id},
            {
                "$inc": {"current_balance": payment.amount},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
        # Create cheque record
        cheque_id = str(uuid.uuid4())
        await db.cheques.insert_one({
            "id": cheque_id,
            "transaction_id": txn_id,
            "cheque_number": payment.cheque_number,
            "cheque_date": payment.cheque_date,
            "cheque_amount": payment.amount,
            "cheque_bank": payment.cheque_bank,
            "account_id": payment.to_account_id,
            "account_name": to_account.get("account_name", ""),
            "direction": "inward",
            "status": "pending",
            "customer_name": payment.customer_name,
            "customer_phone": payment.customer_phone,
            "project_id": payment.project_id,
            "property_id": payment.property_id,
            "tenant_id": tenant_id,
            "created_at": datetime.now(timezone.utc),
            "cleared_at": None,
            "deleted_at": None,
        })
    else:
        await db.bank_accounts.update_one(
            {"id": payment.to_account_id},
            {
                "$inc": {"current_balance": payment.amount, "available_balance": payment.amount},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    return {
        "success": True,
        "message": f"Payment of Rs.{payment.amount:,.2f} recorded from {payment.customer_name}",
        "transaction_id": txn_id,
    }


@router.get("/payment-receive", response_model=dict)
async def get_received_payments(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    customer_name: Optional[str] = None,
    payment_mode: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    """Get list of received payments with filters."""
    tenant_id = current_user.get("tenant_id")
    query = {"tenant_id": tenant_id, "transaction_type": "credit", "reference_type": "customer_payment", "deleted_at": None}

    if project_id:
        query["project_id"] = project_id
    if customer_name:
        query["customer_name"] = {"$regex": customer_name, "$options": "i"}
    if payment_mode:
        query["payment_mode"] = payment_mode
    if date_from:
        try:
            query["transaction_date"] = {"$gte": datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)}
        except Exception:
            pass
    if date_to:
        try:
            existing = query.get("transaction_date", {})
            existing["$lte"] = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            query["transaction_date"] = existing
        except Exception:
            pass

    total = await db.transactions.count_documents(query)
    payments = await db.transactions.find(query, {"_id": 0}).sort("transaction_date", -1).skip(skip).limit(limit).to_list(limit)

    total_amount = 0
    for p in payments:
        total_amount += p.get("amount", 0)

    return {"success": True, "payments": payments, "total": total, "total_amount": total_amount}


# ──── CHEQUE MANAGEMENT ────

@router.get("/cheques", response_model=dict)
async def get_cheques(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    direction: Optional[str] = None,
    project_id: Optional[str] = None,
    limit: int = 100,
):
    """Get all cheques with status filter."""
    tenant_id = current_user.get("tenant_id")
    query = {"tenant_id": tenant_id, "deleted_at": None}
    if status:
        query["status"] = status
    if direction:
        query["direction"] = direction
    if project_id:
        query["project_id"] = project_id

    cheques = await db.cheques.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)

    pending_amount = sum(c.get("cheque_amount", 0) for c in cheques if c.get("status") == "pending")
    cleared_amount = sum(c.get("cheque_amount", 0) for c in cheques if c.get("status") == "cleared")

    return {
        "success": True,
        "cheques": cheques,
        "total": len(cheques),
        "pending_amount": pending_amount,
        "cleared_amount": cleared_amount,
    }


@router.put("/cheques/{cheque_id}/status", response_model=dict)
async def update_cheque_status(
    cheque_id: str,
    update: ChequeStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update cheque status — cleared, bounced, cancelled."""
    tenant_id = current_user.get("tenant_id")

    cheque = await db.cheques.find_one(
        {"id": cheque_id, "tenant_id": tenant_id, "deleted_at": None}, {"_id": 0}
    )
    if not cheque:
        raise HTTPException(status_code=404, detail="Cheque not found")

    if cheque.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Cheque already {cheque['status']}")

    now = datetime.now(timezone.utc)
    cheque_update = {"status": update.status, "updated_at": now, "updated_by": current_user.get("id")}

    if update.status == "cleared":
        cheque_update["cleared_at"] = now
        # Move amount from uncleared to available
        await db.bank_accounts.update_one(
            {"id": cheque["account_id"]},
            {"$inc": {"available_balance": cheque["cheque_amount"]}, "$set": {"updated_at": now}},
        )
    elif update.status == "bounced":
        cheque_update["bounce_reason"] = update.bounce_reason
        # Reverse the balance
        await db.bank_accounts.update_one(
            {"id": cheque["account_id"]},
            {"$inc": {"current_balance": -cheque["cheque_amount"]}, "$set": {"updated_at": now}},
        )
        # Update transaction status
        await db.transactions.update_one(
            {"id": cheque["transaction_id"]},
            {"$set": {"status": "bounced", "cheque_status": "bounced", "updated_at": now}},
        )
    elif update.status == "cancelled":
        await db.bank_accounts.update_one(
            {"id": cheque["account_id"]},
            {"$inc": {"current_balance": -cheque["cheque_amount"]}, "$set": {"updated_at": now}},
        )

    await db.cheques.update_one({"id": cheque_id}, {"$set": cheque_update})

    return {"success": True, "message": f"Cheque {cheque['cheque_number']} marked as {update.status}"}


# ──── ACCOUNT LEDGER ────

@router.get("/account-ledger/{account_id}", response_model=dict)
async def get_account_ledger(
    account_id: str,
    current_user: dict = Depends(get_current_user),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 200,
):
    """Get full transaction ledger for a bank account."""
    tenant_id = current_user.get("tenant_id")

    account = await db.bank_accounts.find_one(
        {"id": account_id, "tenant_id": tenant_id, "deleted_at": None}, {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    query = {
        "$or": [{"from_account_id": account_id}, {"to_account_id": account_id}],
        "deleted_at": None,
    }
    if date_from:
        try:
            query["transaction_date"] = {"$gte": datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)}
        except Exception:
            pass
    if date_to:
        try:
            existing = query.get("transaction_date", {})
            existing["$lte"] = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            query["transaction_date"] = existing
        except Exception:
            pass

    transactions = await db.transactions.find(query, {"_id": 0}).sort("transaction_date", -1).limit(limit).to_list(limit)

    total_in = sum(t["amount"] for t in transactions if t.get("to_account_id") == account_id)
    total_out = sum(t["amount"] for t in transactions if t.get("from_account_id") == account_id)

    # Pending cheques
    pending_cheques = await db.cheques.find(
        {"account_id": account_id, "status": "pending", "deleted_at": None}, {"_id": 0}
    ).to_list(50)

    return {
        "success": True,
        "account": {
            "id": account["id"],
            "name": account.get("account_name", ""),
            "bank": account.get("bank_name", ""),
            "current_balance": account.get("current_balance", 0),
            "available_balance": account.get("available_balance", 0),
        },
        "transactions": transactions,
        "summary": {
            "total_in": total_in,
            "total_out": total_out,
            "net": total_in - total_out,
            "pending_cheques": len(pending_cheques),
            "pending_cheques_amount": sum(c["cheque_amount"] for c in pending_cheques),
        },
    }


# ──── DAILY REPORT ────

@router.get("/daily-report", response_model=dict)
async def get_daily_report(
    current_user: dict = Depends(get_current_user),
    date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    """
    Daily financial report — all accounts with balances.
    Shows: per-account balance, total available, uncleared cheques.
    """
    tenant_id = current_user.get("tenant_id")

    # Get all active accounts
    accounts = await db.bank_accounts.find(
        {"tenant_id": tenant_id, "is_active": True, "deleted_at": None}, {"_id": 0}
    ).to_list(50)

    # Date filter for transactions
    if date:
        try:
            d = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
            start = d.replace(hour=0, minute=0, second=0)
            end = d.replace(hour=23, minute=59, second=59)
        except Exception:
            start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
            end = datetime.now(timezone.utc)
    elif date_from and date_to:
        try:
            start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            end = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
        except Exception:
            start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
            end = datetime.now(timezone.utc)
    else:
        start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        end = datetime.now(timezone.utc)

    account_reports = []
    total_balance = 0
    total_available = 0
    total_uncleared = 0

    for acc in accounts:
        acc_id = acc["id"]
        is_cash = acc.get("account_number") == "1111111"

        # Today's credits
        credits = await db.transactions.find(
            {"to_account_id": acc_id, "transaction_date": {"$gte": start, "$lte": end}, "deleted_at": None},
            {"_id": 0, "amount": 1},
        ).to_list(500)
        day_in = sum(t["amount"] for t in credits)

        # Today's debits
        debits = await db.transactions.find(
            {"from_account_id": acc_id, "transaction_date": {"$gte": start, "$lte": end}, "deleted_at": None},
            {"_id": 0, "amount": 1},
        ).to_list(500)
        day_out = sum(t["amount"] for t in debits)

        # Pending cheques
        pending = await db.cheques.count_documents(
            {"account_id": acc_id, "status": "pending", "deleted_at": None}
        )
        pending_amt = 0
        if pending:
            cheqs = await db.cheques.find(
                {"account_id": acc_id, "status": "pending", "deleted_at": None},
                {"_id": 0, "cheque_amount": 1},
            ).to_list(100)
            pending_amt = sum(c["cheque_amount"] for c in cheqs)

        acc_balance = acc.get("current_balance", 0)
        acc_available = acc.get("available_balance", 0)

        account_reports.append({
            "account_id": acc_id,
            "account_name": acc.get("account_name", ""),
            "bank_name": acc.get("bank_name", "Cash" if is_cash else ""),
            "account_number": acc.get("account_number", ""),
            "is_cash": is_cash,
            "current_balance": acc_balance,
            "available_balance": acc_available,
            "day_credits": day_in,
            "day_debits": day_out,
            "day_net": day_in - day_out,
            "pending_cheques": pending,
            "pending_cheques_amount": pending_amt,
        })

        total_balance += acc_balance
        total_available += acc_available
        total_uncleared += pending_amt

    return {
        "success": True,
        "report_date": start.strftime("%Y-%m-%d"),
        "accounts": account_reports,
        "summary": {
            "total_accounts": len(accounts),
            "total_balance": total_balance,
            "total_available": total_available,
            "total_uncleared_cheques": total_uncleared,
            "cash_accounts": sum(1 for a in account_reports if a["is_cash"]),
            "bank_accounts": sum(1 for a in account_reports if not a["is_cash"]),
        },
    }
