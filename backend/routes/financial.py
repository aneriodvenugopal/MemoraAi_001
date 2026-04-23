"""
Financial System API Routes
Handles payment schedules, transactions, and expense tracking
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from middleware.auth import get_current_user
from services.role_context_service import RoleContextService
from models.financial import (
    PaymentScheduleCreate, TransactionCreate, TransactionUpdate,
    ExpenseCategoryCreate
)

router = APIRouter(prefix="/financial", tags=["financial"])


def get_db(request: Request):
    return request.app.state.db


# ============= PAYMENT SCHEDULES =============

@router.post("/payment-schedules")
async def create_payment_schedule(
    schedule_data: PaymentScheduleCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a payment schedule for a booking.
    Used for EMI/installment plans.
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Verify project access
    is_admin = await RoleContextService.is_tenant_admin(
        current_user.get("user_id"), tenant_id
    ) or await RoleContextService.is_project_admin(
        current_user.get("user_id"), tenant_id, schedule_data.project_id
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Calculate balance
    balance = schedule_data.amount
    
    schedule = {
        "id": str(uuid.uuid4()),
        "booking_id": schedule_data.booking_id,
        "customer_id": schedule_data.customer_id,
        "project_id": schedule_data.project_id,
        "tenant_id": tenant_id,
        "schedule_number": schedule_data.schedule_number,
        "due_date": schedule_data.due_date.isoformat(),
        "amount": schedule_data.amount,
        "description": schedule_data.description,
        "status": "pending",
        "paid_amount": 0.0,
        "balance_amount": balance,
        "paid_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    
    await db.payment_schedules.insert_one(schedule)
    
    return {
        "success": True,
        "message": "Payment schedule created",
        "schedule": schedule
    }


@router.get("/payment-schedules/booking/{booking_id}")
async def get_booking_payment_schedules(
    booking_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all payment schedules for a booking"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    schedules = await db.payment_schedules.find({
        "booking_id": booking_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0}).sort("schedule_number", 1).to_list(length=None)
    
    # Calculate summary
    total_amount = sum(s.get("amount", 0) for s in schedules)
    paid_amount = sum(s.get("paid_amount", 0) for s in schedules)
    balance = total_amount - paid_amount
    
    # Check for overdue
    current_date = datetime.now(timezone.utc)
    for schedule in schedules:
        if schedule.get("status") == "pending":
            due_date = datetime.fromisoformat(schedule.get("due_date"))
            if due_date < current_date:
                schedule["status"] = "overdue"
    
    return {
        "success": True,
        "booking_id": booking_id,
        "schedules": schedules,
        "summary": {
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "balance_amount": balance,
            "total_schedules": len(schedules)
        }
    }


@router.get("/payment-schedules/customer/{customer_id}")
async def get_customer_payment_schedules(
    customer_id: str,
    status: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all payment schedules for a customer"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    query = {
        "customer_id": customer_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    }
    
    if status:
        query["status"] = status
    
    schedules = await db.payment_schedules.find(
        query, {"_id": 0}
    ).sort("due_date", 1).to_list(length=None)
    
    return {
        "success": True,
        "customer_id": customer_id,
        "total": len(schedules),
        "schedules": schedules
    }


# ============= TRANSACTIONS =============

@router.post("/transactions")
async def create_transaction(
    transaction_data: TransactionCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a financial transaction (receivable or payment).
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Verify project access
    is_admin = await RoleContextService.is_tenant_admin(
        user_id, tenant_id
    ) or await RoleContextService.is_project_admin(
        user_id, tenant_id, transaction_data.project_id
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Generate transaction number
    count = await db.transactions.count_documents({"tenant_id": tenant_id})
    transaction_number = f"TXN-{tenant_id[:8]}-{count + 1:05d}"
    
    transaction = {
        "id": str(uuid.uuid4()),
        "transaction_number": transaction_number,
        "tenant_id": tenant_id,
        "project_id": transaction_data.project_id,
        "type": transaction_data.type,
        "category": transaction_data.category,
        "from_party": transaction_data.from_party,
        "to_party": transaction_data.to_party,
        "from_party_id": transaction_data.from_party_id,
        "to_party_id": transaction_data.to_party_id,
        "amount": transaction_data.amount,
        "currency_id": transaction_data.currency_id,
        "payment_method": transaction_data.payment_method,
        "bank_account_id": transaction_data.bank_account_id,
        "reference_number": transaction_data.reference_number,
        "booking_id": transaction_data.booking_id,
        "payment_schedule_id": transaction_data.payment_schedule_id,
        "commission_id": transaction_data.commission_id,
        "status": "completed",
        "payment_date": transaction_data.payment_date.isoformat(),
        "requires_approval": transaction_data.amount > 100000,  # Amounts > 1L need approval
        "approved_by": None,
        "approved_at": None,
        "description": transaction_data.description,
        "notes": transaction_data.notes,
        "receipt_url": None,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    
    await db.transactions.insert_one(transaction)
    
    # Update payment schedule if linked
    if transaction_data.payment_schedule_id:
        schedule = await db.payment_schedules.find_one({
            "id": transaction_data.payment_schedule_id
        }, {"_id": 0})
        
        if schedule:
            new_paid_amount = schedule.get("paid_amount", 0) + transaction_data.amount
            new_balance = schedule.get("amount", 0) - new_paid_amount
            
            new_status = "paid" if new_balance <= 0 else "partially_paid"
            
            await db.payment_schedules.update_one(
                {"id": transaction_data.payment_schedule_id},
                {"$set": {
                    "paid_amount": new_paid_amount,
                    "balance_amount": new_balance,
                    "status": new_status,
                    "paid_date": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return {
        "success": True,
        "message": "Transaction created successfully",
        "transaction": transaction
    }


@router.get("/transactions")
async def get_transactions(
    project_id: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get transactions with filters"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Build query
    query = {
        "tenant_id": tenant_id,
        "deleted_at": None
    }
    
    # Project filter with access control
    if project_id:
        is_admin = await RoleContextService.is_tenant_admin(
            user_id, tenant_id
        ) or await RoleContextService.is_project_admin(
            user_id, tenant_id, project_id
        )
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="No access to this project")
        
        query["project_id"] = project_id
    else:
        # If no project specified, check if user is tenant admin
        is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
        if not is_tenant_admin:
            # Get user's projects
            user_projects = await RoleContextService.get_user_projects(user_id, tenant_id)
            if user_projects:
                query["project_id"] = {"$in": user_projects}
            else:
                return {"success": True, "total": 0, "transactions": []}
    
    if type:
        query["type"] = type
    
    if status:
        query["status"] = status
    
    if start_date and end_date:
        query["payment_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    transactions = await db.transactions.find(
        query, {"_id": 0}
    ).sort("payment_date", -1).limit(limit).to_list(length=None)
    
    # Calculate summary
    total_amount = sum(t.get("amount", 0) for t in transactions)
    
    return {
        "success": True,
        "total": len(transactions),
        "total_amount": total_amount,
        "transactions": transactions
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction details"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    transaction = await db.transactions.find_one({
        "id": transaction_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "success": True,
        "transaction": transaction
    }


# ============= EXPENSE CATEGORIES =============

@router.post("/expense-categories")
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create expense category"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Only tenant admin can create categories
    is_admin = await RoleContextService.is_tenant_admin(
        current_user.get("user_id"), tenant_id
    )
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only tenant admin can create categories")
    
    category = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "name": category_data.name,
        "slug": category_data.slug,
        "description": category_data.description,
        "color": category_data.color,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.expense_categories.insert_one(category)
    
    return {
        "success": True,
        "message": "Expense category created",
        "category": category
    }


@router.get("/expense-categories")
async def get_expense_categories(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all expense categories"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    categories = await db.expense_categories.find({
        "tenant_id": tenant_id,
        "is_active": True
    }, {"_id": 0}).to_list(length=None)
    
    return {
        "success": True,
        "total": len(categories),
        "categories": categories
    }


# ============= FINANCIAL REPORTS =============

@router.get("/reports/summary")
async def get_financial_summary(
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get financial summary with income, expenses, and net profit.
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Build query
    query = {
        "tenant_id": tenant_id,
        "deleted_at": None,
        "status": "completed"
    }
    
    if project_id:
        is_admin = await RoleContextService.is_tenant_admin(
            user_id, tenant_id
        ) or await RoleContextService.is_project_admin(
            user_id, tenant_id, project_id
        )
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="No access to this project")
        
        query["project_id"] = project_id
    
    if start_date and end_date:
        query["payment_date"] = {"$gte": start_date, "$lte": end_date}
    
    # Get all transactions
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(length=None)
    
    # Calculate totals
    receivables = [t for t in transactions if t.get("type") == "receivable"]
    payments = [t for t in transactions if t.get("type") == "payment"]
    commissions = [t for t in transactions if t.get("type") == "commission"]
    
    total_income = sum(t.get("amount", 0) for t in receivables)
    total_expenses = sum(t.get("amount", 0) for t in payments)
    total_commissions = sum(t.get("amount", 0) for t in commissions)
    
    net_profit = total_income - total_expenses - total_commissions
    
    # Expense breakdown by category
    expense_by_category = {}
    for payment in payments:
        category = payment.get("category", "Uncategorized")
        expense_by_category[category] = expense_by_category.get(category, 0) + payment.get("amount", 0)
    
    return {
        "success": True,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "total_commissions": total_commissions,
            "net_profit": net_profit,
            "receivables_count": len(receivables),
            "payments_count": len(payments),
            "expense_breakdown": expense_by_category
        }
    }
