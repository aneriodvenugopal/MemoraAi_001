"""
Referral & Wallet System Routes
- Generate and manage referral codes
- Track referral conversions
- Wallet balance and transactions
- Withdrawal requests
"""
from fastapi import APIRouter, HTTPException, Request
from models.referral_wallet import (
    Referral, Wallet, WalletTransaction, WithdrawalRequest,
    ReferralStatus, TransactionType, WithdrawalStatus,
    CreateReferralRequest, RegisterReferredRequest, QualifyReferralRequest,
    WithdrawalRequestCreate, ProcessWithdrawalRequest, WalletAdjustmentRequest,
    generate_referral_code
)
from middleware.auth import get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

router = APIRouter(prefix="/referral-wallet", tags=["referral-wallet"])


def get_db(request: Request):
    return request.app.state.db


async def get_or_create_wallet(db, tenant_id: str, customer_id: str) -> dict:
    """Get existing wallet or create new one"""
    wallet = await db.wallets.find_one(
        {"tenant_id": tenant_id, "customer_id": customer_id},
        {"_id": 0}
    )
    
    if not wallet:
        new_wallet = Wallet(
            tenant_id=tenant_id,
            customer_id=customer_id
        )
        await db.wallets.insert_one(new_wallet.model_dump())
        wallet = new_wallet.model_dump()
    
    return wallet


async def create_wallet_transaction(
    db, wallet: dict, transaction_type: TransactionType,
    amount: float, description: str, reference_type: str = None,
    reference_id: str = None, created_by: str = None
):
    """Create wallet transaction and update balance"""
    balance_before = wallet["balance"]
    
    if transaction_type in [TransactionType.CREDIT, TransactionType.REFERRAL_REWARD]:
        balance_after = balance_before + amount
    else:
        balance_after = balance_before - amount
    
    transaction = WalletTransaction(
        tenant_id=wallet["tenant_id"],
        wallet_id=wallet["id"],
        customer_id=wallet["customer_id"],
        transaction_type=transaction_type,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_type=reference_type,
        reference_id=reference_id,
        description=description,
        created_by=created_by
    )
    
    await db.wallet_transactions.insert_one(transaction.model_dump())
    
    # Update wallet balance
    update_data = {
        "balance": balance_after,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if transaction_type in [TransactionType.CREDIT, TransactionType.REFERRAL_REWARD]:
        update_data["total_earned"] = wallet.get("total_earned", 0) + amount
    elif transaction_type == TransactionType.WITHDRAWAL:
        update_data["total_withdrawn"] = wallet.get("total_withdrawn", 0) + amount
    elif transaction_type == TransactionType.BOOKING_DISCOUNT:
        update_data["total_used"] = wallet.get("total_used", 0) + amount
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$set": update_data}
    )
    
    return transaction.model_dump()


# ==================== Referral Management ====================

@router.post("/referrals/create")
async def create_referral(
    referral_request: CreateReferralRequest,
    request: Request
):
    """Create a new referral code for a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get referrer (customer)
    referrer = await db.customers.find_one(
        {"id": referral_request.referrer_id},
        {"_id": 0, "name": 1, "phone": 1}
    )
    
    if not referrer:
        raise HTTPException(status_code=404, detail="Referrer customer not found")
    
    # Generate unique referral code
    referral_code = generate_referral_code()
    while await db.referrals.find_one({"referral_code": referral_code}):
        referral_code = generate_referral_code()
    
    # Calculate expiry
    expires_at = datetime.now(timezone.utc) + timedelta(days=referral_request.expires_days)
    
    referral = Referral(
        tenant_id=user["tenant_id"],
        referrer_id=referral_request.referrer_id,
        referrer_name=referrer.get("name"),
        referrer_phone=referrer.get("phone"),
        referral_code=referral_code,
        reward_amount=referral_request.reward_amount,
        reward_type=referral_request.reward_type,
        qualification_type=referral_request.qualification_type,
        project_id=referral_request.project_id,
        expires_at=expires_at
    )
    
    await db.referrals.insert_one(referral.model_dump())
    
    return {
        "success": True,
        "message": "Referral code created",
        "referral": referral.model_dump(),
        "referral_code": referral_code
    }


@router.get("/referrals")
async def get_referrals(
    request: Request,
    referrer_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all referrals with filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if referrer_id:
        query["referrer_id"] = referrer_id
    if status and status != "all":
        query["status"] = status
    
    referrals = await db.referrals.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.referrals.count_documents(query)
    
    return {
        "success": True,
        "referrals": referrals,
        "total": total
    }


@router.get("/referrals/code/{referral_code}")
async def get_referral_by_code(referral_code: str, request: Request):
    """Get referral details by code (public endpoint for referred person)"""
    db = get_db(request)
    
    referral = await db.referrals.find_one(
        {"referral_code": referral_code.upper()},
        {"_id": 0}
    )
    
    if not referral:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Check if expired
    if referral.get("expires_at"):
        if isinstance(referral["expires_at"], str):
            expires_at = datetime.fromisoformat(referral["expires_at"].replace('Z', '+00:00'))
        else:
            expires_at = referral["expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Referral code has expired")
    
    if referral["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Referral code already used")
    
    return {
        "success": True,
        "valid": True,
        "referrer_name": referral.get("referrer_name", ""),
        "reward_amount": referral.get("reward_amount", 0)
    }


@router.post("/referrals/register")
async def register_referred_person(
    register_request: RegisterReferredRequest,
    request: Request
):
    """Register a referred person using referral code"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find referral
    referral = await db.referrals.find_one(
        {"referral_code": register_request.referral_code.upper()},
        {"_id": 0}
    )
    
    if not referral:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    if referral["status"] != "pending":
        raise HTTPException(status_code=400, detail="Referral code already used")
    
    # Check expiry
    if referral.get("expires_at"):
        if isinstance(referral["expires_at"], str):
            expires_at = datetime.fromisoformat(referral["expires_at"].replace('Z', '+00:00'))
        else:
            expires_at = referral["expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            await db.referrals.update_one(
                {"id": referral["id"]},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=400, detail="Referral code has expired")
    
    # Check if phone already exists
    existing = await db.leads.find_one({"phone": register_request.referred_phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create lead for referred person
    lead_id = str(uuid.uuid4())
    lead = {
        "id": lead_id,
        "tenant_id": referral["tenant_id"],
        "name": register_request.referred_name,
        "phone": register_request.referred_phone,
        "email": register_request.referred_email,
        "source": "referral",
        "referral_code": register_request.referral_code.upper(),
        "referral_id": referral["id"],
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(lead)
    
    # Update referral
    await db.referrals.update_one(
        {"id": referral["id"]},
        {"$set": {
            "referred_id": lead_id,
            "referred_name": register_request.referred_name,
            "referred_phone": register_request.referred_phone,
            "referred_email": register_request.referred_email,
            "status": "registered",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Registration successful",
        "lead_id": lead_id,
        "referral_status": "registered"
    }


@router.post("/referrals/qualify")
async def qualify_referral(
    qualify_request: QualifyReferralRequest,
    request: Request
):
    """Mark referral as qualified and credit reward"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    referral = await db.referrals.find_one(
        {"id": qualify_request.referral_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    if referral["status"] not in ["registered"]:
        raise HTTPException(status_code=400, detail=f"Cannot qualify referral with status: {referral['status']}")
    
    if referral["reward_credited"]:
        raise HTTPException(status_code=400, detail="Reward already credited")
    
    # Get or create wallet for referrer
    wallet = await get_or_create_wallet(db, user["tenant_id"], referral["referrer_id"])
    
    # Credit reward
    reward_amount = referral.get("reward_amount", 0)
    if reward_amount > 0:
        await create_wallet_transaction(
            db, wallet,
            TransactionType.REFERRAL_REWARD,
            reward_amount,
            f"Referral reward for referring {referral.get('referred_name', 'customer')}",
            reference_type="referral",
            reference_id=referral["id"],
            created_by=user["user_id"]
        )
    
    # Update referral
    await db.referrals.update_one(
        {"id": referral["id"]},
        {"$set": {
            "status": "rewarded",
            "qualification_met": True,
            "qualification_date": datetime.now(timezone.utc).isoformat(),
            "reward_credited": True,
            "reward_credited_at": datetime.now(timezone.utc).isoformat(),
            "notes": qualify_request.qualification_notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Referral qualified. ₹{reward_amount} credited to referrer's wallet",
        "reward_amount": reward_amount
    }


@router.get("/referrals/stats")
async def get_referral_stats(request: Request):
    """Get referral statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    all_referrals = await db.referrals.find(query, {"_id": 0}).to_list(10000)
    
    total = len(all_referrals)
    by_status = {}
    for status in ReferralStatus:
        by_status[status.value] = len([r for r in all_referrals if r.get("status") == status.value])
    
    total_rewards = sum(r.get("reward_amount", 0) for r in all_referrals if r.get("reward_credited"))
    pending_rewards = sum(r.get("reward_amount", 0) for r in all_referrals if r.get("status") == "registered")
    
    # Conversion rate
    conversion_rate = 0
    if total > 0:
        converted = by_status.get("qualified", 0) + by_status.get("rewarded", 0)
        conversion_rate = round((converted / total) * 100, 2)
    
    return {
        "success": True,
        "stats": {
            "total_referrals": total,
            "by_status": by_status,
            "total_rewards_paid": total_rewards,
            "pending_rewards": pending_rewards,
            "conversion_rate": conversion_rate
        }
    }


# ==================== Wallet Management ====================

@router.get("/wallet/{customer_id}")
async def get_wallet(customer_id: str, request: Request):
    """Get customer wallet details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    wallet = await get_or_create_wallet(db, user["tenant_id"], customer_id)
    
    # Get recent transactions
    transactions = await db.wallet_transactions.find(
        {"wallet_id": wallet["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get customer info
    customer = await db.customers.find_one(
        {"id": customer_id},
        {"_id": 0, "name": 1, "phone": 1}
    )
    
    return {
        "success": True,
        "wallet": wallet,
        "transactions": transactions,
        "customer": customer
    }


@router.get("/wallet/{customer_id}/transactions")
async def get_wallet_transactions(
    customer_id: str,
    request: Request,
    skip: int = 0,
    limit: int = 50
):
    """Get wallet transactions"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    wallet = await db.wallets.find_one(
        {"tenant_id": user["tenant_id"], "customer_id": customer_id},
        {"_id": 0}
    )
    
    if not wallet:
        return {"success": True, "transactions": [], "total": 0}
    
    transactions = await db.wallet_transactions.find(
        {"wallet_id": wallet["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.wallet_transactions.count_documents({"wallet_id": wallet["id"]})
    
    return {
        "success": True,
        "transactions": transactions,
        "total": total
    }


@router.post("/wallet/adjust")
async def adjust_wallet_balance(
    adjustment: WalletAdjustmentRequest,
    request: Request
):
    """Admin adjustment of wallet balance"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    wallet = await get_or_create_wallet(db, user["tenant_id"], adjustment.customer_id)
    
    transaction_type = TransactionType.CREDIT if adjustment.amount > 0 else TransactionType.DEBIT
    
    transaction = await create_wallet_transaction(
        db, wallet,
        transaction_type,
        abs(adjustment.amount),
        adjustment.description,
        reference_type="admin_adjustment",
        created_by=user["user_id"]
    )
    
    # Get updated wallet
    updated_wallet = await db.wallets.find_one({"id": wallet["id"]}, {"_id": 0})
    
    return {
        "success": True,
        "message": f"Wallet adjusted by ₹{adjustment.amount}",
        "transaction": transaction,
        "new_balance": updated_wallet["balance"]
    }


# ==================== Withdrawal Management ====================

@router.post("/withdrawals/request")
async def request_withdrawal(
    withdrawal_request: WithdrawalRequestCreate,
    request: Request
):
    """Request wallet withdrawal"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # This would typically be for customer portal
    # For admin, we use customer_id from request
    customer_id = request.query_params.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="Customer ID required")
    
    wallet = await db.wallets.find_one(
        {"tenant_id": user["tenant_id"], "customer_id": customer_id},
        {"_id": 0}
    )
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if wallet["balance"] < withdrawal_request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if withdrawal_request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    withdrawal = WithdrawalRequest(
        tenant_id=user["tenant_id"],
        wallet_id=wallet["id"],
        customer_id=customer_id,
        amount=withdrawal_request.amount,
        bank_name=withdrawal_request.bank_name,
        account_number=withdrawal_request.account_number,
        ifsc_code=withdrawal_request.ifsc_code,
        account_holder_name=withdrawal_request.account_holder_name,
        upi_id=withdrawal_request.upi_id
    )
    
    await db.withdrawal_requests.insert_one(withdrawal.model_dump())
    
    return {
        "success": True,
        "message": "Withdrawal request submitted",
        "withdrawal": withdrawal.model_dump()
    }


@router.get("/withdrawals")
async def get_withdrawals(
    request: Request,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get withdrawal requests"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if customer_id:
        query["customer_id"] = customer_id
    if status and status != "all":
        query["status"] = status
    
    withdrawals = await db.withdrawal_requests.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Add customer names
    for w in withdrawals:
        customer = await db.customers.find_one({"id": w["customer_id"]}, {"_id": 0, "name": 1})
        w["customer_name"] = customer.get("name", "") if customer else ""
    
    total = await db.withdrawal_requests.count_documents(query)
    
    return {
        "success": True,
        "withdrawals": withdrawals,
        "total": total
    }


@router.post("/withdrawals/process")
async def process_withdrawal(
    process_request: ProcessWithdrawalRequest,
    request: Request
):
    """Process (approve/reject) withdrawal request"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    withdrawal = await db.withdrawal_requests.find_one(
        {"id": process_request.withdrawal_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot process withdrawal with status: {withdrawal['status']}")
    
    if process_request.approved:
        # Debit wallet
        wallet = await db.wallets.find_one({"id": withdrawal["wallet_id"]}, {"_id": 0})
        
        if wallet["balance"] < withdrawal["amount"]:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        await create_wallet_transaction(
            db, wallet,
            TransactionType.WITHDRAWAL,
            withdrawal["amount"],
            f"Withdrawal - {process_request.transaction_reference or 'Approved'}",
            reference_type="withdrawal",
            reference_id=withdrawal["id"],
            created_by=user["user_id"]
        )
        
        new_status = "completed"
    else:
        new_status = "rejected"
    
    await db.withdrawal_requests.update_one(
        {"id": process_request.withdrawal_id},
        {"$set": {
            "status": new_status,
            "processed_by": user["user_id"],
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "transaction_reference": process_request.transaction_reference,
            "rejection_reason": process_request.rejection_reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Withdrawal {'approved and processed' if process_request.approved else 'rejected'}",
        "status": new_status
    }


# ==================== Stats ====================

@router.get("/stats")
async def get_wallet_stats(request: Request):
    """Get overall wallet statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"]}
    
    wallets = await db.wallets.find(query, {"_id": 0}).to_list(10000)
    
    total_wallets = len(wallets)
    total_balance = sum(w.get("balance", 0) for w in wallets)
    total_earned = sum(w.get("total_earned", 0) for w in wallets)
    total_withdrawn = sum(w.get("total_withdrawn", 0) for w in wallets)
    
    # Pending withdrawals
    pending_withdrawals = await db.withdrawal_requests.find(
        {"tenant_id": user["tenant_id"], "status": "pending"},
        {"_id": 0, "amount": 1}
    ).to_list(1000)
    pending_withdrawal_amount = sum(w.get("amount", 0) for w in pending_withdrawals)
    
    return {
        "success": True,
        "stats": {
            "total_wallets": total_wallets,
            "total_balance": round(total_balance, 2),
            "total_earned": round(total_earned, 2),
            "total_withdrawn": round(total_withdrawn, 2),
            "pending_withdrawals": len(pending_withdrawals),
            "pending_withdrawal_amount": round(pending_withdrawal_amount, 2)
        }
    }
