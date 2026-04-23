"""
Payment Transfer Module — Record outgoing payments.

Company pays → Agent/Vendor/Staff/Land Owner → from selected bank account.
Records entry only. Does NOT process actual bank transfer.
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


class PaymentTransferCreate(BaseModel):
    tenant_id: str
    from_account_id: str
    payee_type: str  # agent, vendor, staff, land_owner, other
    payee_id: Optional[str] = None
    payee_name: str
    payee_phone: Optional[str] = None
    payee_bank_details: Optional[str] = None
    amount: float
    payment_mode: str  # cash, neft, rtgs, upi, cheque, dd
    transaction_ref: Optional[str] = None
    cheque_number: Optional[str] = None
    cheque_date: Optional[str] = None
    project_id: Optional[str] = None
    property_id: Optional[str] = None
    purpose: Optional[str] = None  # commission, salary, land_purchase, site_work, misc
    notes: Optional[str] = None
    payment_date: Optional[str] = None


@router.post("/payment-out", response_model=dict)
async def record_payment_transfer(
    payment: PaymentTransferCreate,
    current_user: dict = Depends(get_current_user),
):
    """Record an outgoing payment to agent/vendor/staff/land owner."""
    tenant_id = current_user.get("tenant_id")
    if payment.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")

    # Verify source bank account
    from_account = await db.bank_accounts.find_one(
        {"id": payment.from_account_id, "tenant_id": tenant_id, "deleted_at": None}, {"_id": 0}
    )
    if not from_account:
        raise HTTPException(status_code=404, detail="Source bank account not found")

    if from_account.get("available_balance", 0) < payment.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: Rs.{from_account['available_balance']:,.2f}",
        )

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
        "transaction_type": "debit",
        "transaction_date": pay_date,
        "from_account_id": payment.from_account_id,
        "from_account_name": from_account.get("account_name", ""),
        "to_account_id": None,
        "amount": payment.amount,
        "payment_mode": payment.payment_mode,
        "transaction_ref": payment.transaction_ref,
        "cheque_number": payment.cheque_number,
        "cheque_date": payment.cheque_date,
        "cheque_status": "pending" if is_cheque else None,
        "reference_type": f"{payment.payee_type}_payment",
        "reference_id": payment.payee_id,
        "project_id": payment.project_id,
        "property_id": payment.property_id,
        "payee_type": payment.payee_type,
        "payee_id": payment.payee_id,
        "payee_name": payment.payee_name,
        "payee_phone": payment.payee_phone,
        "purpose": payment.purpose,
        "description": f"Payment to {payment.payee_name} ({payment.payee_type}) - {payment.purpose or ''}",
        "notes": payment.notes,
        "tenant_id": tenant_id,
        "status": "recorded",
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("id"),
        "deleted_at": None,
    }
    await db.transactions.insert_one(txn_data)

    # Update bank account balance
    await db.bank_accounts.update_one(
        {"id": payment.from_account_id},
        {
            "$inc": {"current_balance": -payment.amount, "available_balance": -payment.amount},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )

    # If paying agent commission, update agent commission ledger
    if payment.payee_type == "agent" and payment.payee_id:
        await db.agent_commission_ledger.insert_one({
            "id": str(uuid.uuid4()),
            "agent_id": payment.payee_id,
            "agent_name": payment.payee_name,
            "transaction_id": txn_id,
            "type": "payout",
            "amount": payment.amount,
            "from_account_id": payment.from_account_id,
            "from_account_name": from_account.get("account_name", ""),
            "payment_mode": payment.payment_mode,
            "project_id": payment.project_id,
            "property_id": payment.property_id,
            "notes": payment.notes,
            "tenant_id": tenant_id,
            "created_at": datetime.now(timezone.utc),
            "created_by": current_user.get("id"),
        })

    # If cheque, create cheque record
    if is_cheque:
        await db.cheques.insert_one({
            "id": str(uuid.uuid4()),
            "transaction_id": txn_id,
            "cheque_number": payment.cheque_number,
            "cheque_date": payment.cheque_date,
            "cheque_amount": payment.amount,
            "account_id": payment.from_account_id,
            "account_name": from_account.get("account_name", ""),
            "direction": "outward",
            "status": "issued",
            "payee_name": payment.payee_name,
            "payee_type": payment.payee_type,
            "project_id": payment.project_id,
            "tenant_id": tenant_id,
            "created_at": datetime.now(timezone.utc),
            "deleted_at": None,
        })

    return {
        "success": True,
        "message": f"Payment of Rs.{payment.amount:,.2f} recorded to {payment.payee_name}",
        "transaction_id": txn_id,
    }


@router.get("/payment-out", response_model=dict)
async def get_outgoing_payments(
    current_user: dict = Depends(get_current_user),
    payee_type: Optional[str] = None,
    project_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    """Get list of outgoing payments with filters."""
    tenant_id = current_user.get("tenant_id")
    query = {"tenant_id": tenant_id, "transaction_type": "debit", "deleted_at": None}

    if payee_type:
        query["payee_type"] = payee_type
    if project_id:
        query["project_id"] = project_id
    if date_from:
        try:
            query.setdefault("transaction_date", {})["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    if date_to:
        try:
            query.setdefault("transaction_date", {})["$lte"] = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    total = await db.transactions.count_documents(query)
    payments = await db.transactions.find(query, {"_id": 0}).sort("transaction_date", -1).skip(skip).limit(limit).to_list(limit)
    total_amount = sum(p.get("amount", 0) for p in payments)

    return {"success": True, "payments": payments, "total": total, "total_amount": total_amount}


# ──── AGENT COMMISSION LEDGER ────

class AgentCommissionAdd(BaseModel):
    tenant_id: str
    agent_id: str
    agent_name: str
    project_id: str
    property_id: str
    property_label: Optional[str] = None
    commission_amount: float
    commission_note: Optional[str] = None


@router.post("/agent-commission", response_model=dict)
async def add_agent_commission(
    data: AgentCommissionAdd,
    current_user: dict = Depends(get_current_user),
):
    """Add commission entry for an agent — manually decided per deal."""
    tenant_id = current_user.get("tenant_id")
    if data.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")

    entry_id = str(uuid.uuid4())
    await db.agent_commission_ledger.insert_one({
        "id": entry_id,
        "agent_id": data.agent_id,
        "agent_name": data.agent_name,
        "transaction_id": None,
        "type": "earned",
        "amount": data.commission_amount,
        "project_id": data.project_id,
        "property_id": data.property_id,
        "property_label": data.property_label,
        "notes": data.commission_note,
        "tenant_id": tenant_id,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("id"),
    })

    return {"success": True, "message": f"Commission Rs.{data.commission_amount:,.2f} added for {data.agent_name}", "entry_id": entry_id}


@router.get("/agent-commission/{agent_id}", response_model=dict)
async def get_agent_commission_ledger(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get full commission ledger for an agent — earned, paid, balance."""
    tenant_id = current_user.get("tenant_id")

    entries = await db.agent_commission_ledger.find(
        {"agent_id": agent_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    total_earned = sum(e["amount"] for e in entries if e.get("type") == "earned")
    total_paid = sum(e["amount"] for e in entries if e.get("type") == "payout")
    balance = total_earned - total_paid

    # Group by project
    project_wise = {}
    for e in entries:
        pid = e.get("project_id", "unknown")
        if pid not in project_wise:
            project_wise[pid] = {"earned": 0, "paid": 0, "entries": []}
        if e.get("type") == "earned":
            project_wise[pid]["earned"] += e["amount"]
        elif e.get("type") == "payout":
            project_wise[pid]["paid"] += e["amount"]
        project_wise[pid]["entries"].append(e)

    return {
        "success": True,
        "agent_id": agent_id,
        "total_earned": total_earned,
        "total_paid": total_paid,
        "balance_due": balance,
        "entries": entries,
        "project_wise": project_wise,
    }


@router.get("/agent-commissions-summary", response_model=dict)
async def get_all_agents_commission_summary(
    current_user: dict = Depends(get_current_user),
):
    """Get commission summary for all agents."""
    tenant_id = current_user.get("tenant_id")

    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": {"agent_id": "$agent_id", "agent_name": "$agent_name", "type": "$type"},
            "total": {"$sum": "$amount"},
        }},
    ]

    results = await db.agent_commission_ledger.aggregate(pipeline).to_list(500)

    agents = {}
    for r in results:
        aid = r["_id"]["agent_id"]
        aname = r["_id"]["agent_name"]
        atype = r["_id"]["type"]
        if aid not in agents:
            agents[aid] = {"agent_id": aid, "agent_name": aname, "earned": 0, "paid": 0}
        if atype == "earned":
            agents[aid]["earned"] = r["total"]
        elif atype == "payout":
            agents[aid]["paid"] = r["total"]

    agent_list = list(agents.values())
    for a in agent_list:
        a["balance"] = a["earned"] - a["paid"]

    return {
        "success": True,
        "agents": sorted(agent_list, key=lambda x: x["balance"], reverse=True),
        "total_earned": sum(a["earned"] for a in agent_list),
        "total_paid": sum(a["paid"] for a in agent_list),
        "total_balance": sum(a["balance"] for a in agent_list),
    }
