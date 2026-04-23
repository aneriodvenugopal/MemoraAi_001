from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from models.bank_account import BankAccountCreate, BankAccountUpdate, BankAccount
from middleware.auth import get_current_user
from services.role_context_service import RoleContextService

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@router.post("/bank-accounts", response_model=dict)
async def create_bank_account(
    account: BankAccountCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create new bank account or cash account for a project.
    
    Access Control:
    - Tenant Admin: Can create bank accounts for any project in their tenant
    - Project Admin: Can only create bank accounts for their assigned project(s)
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Verify tenant matches
    if account.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create bank account for different tenant"
        )
    
    # Check if user has permission to create account in this project
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    is_project_admin = await RoleContextService.is_project_admin(user_id, tenant_id, account.project_id)
    
    if not (is_tenant_admin or is_project_admin):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create bank accounts in this project. Required: Tenant Admin or Project Admin role."
        )
    
    # Verify project exists and belongs to tenant
    project = await db.projects.find_one({
        "id": account.project_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate account ID
    account_id = str(uuid.uuid4())
    
    # If account_number is "1111111", it's cash account
    is_cash = account.account_number == "1111111"
    
    # If marking as primary online, unmark others in the SAME PROJECT
    if account.is_primary_online:
        await db.bank_accounts.update_many(
            {
                "tenant_id": account.tenant_id,
                "project_id": account.project_id,
                "deleted_at": None
            },
            {"$set": {"is_primary_online": False}}
        )
    
    account_data = {
        "id": account_id,
        "account_number": account.account_number,
        "account_name": account.account_name,
        "account_type": account.account_type,
        "bank_name": account.bank_name if not is_cash else "Cash",
        "branch": account.branch,
        "ifsc_code": account.ifsc_code,
        "account_holder_name": account.account_holder_name,
        "opening_balance": account.opening_balance,
        "current_balance": account.opening_balance,
        "available_balance": account.opening_balance,
        "is_primary_online": account.is_primary_online,
        "is_active": account.is_active,
        "notes": account.notes,
        "tenant_id": account.tenant_id,
        "project_id": account.project_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
        "deleted_at": None,
        "created_by": user_id
    }
    
    await db.bank_accounts.insert_one(account_data)
    
    return {
        "success": True,
        "message": f"{'Cash account' if is_cash else 'Bank account'} created successfully for project {project.get('project_name', account.project_id)}",
        "account_id": account_id,
        "project_id": account.project_id
    }


@router.get("/bank-accounts", response_model=dict)
async def get_bank_accounts(
    project_id: Optional[str] = None,
    include_inactive: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Get bank accounts based on user's role and permissions.
    
    Access Control:
    - Tenant Admin: Can view bank accounts across ALL projects in their tenant
    - Project Admin: Can only view bank accounts for their assigned project(s)
    
    Query Parameters:
    - project_id: Filter by specific project (optional for Tenant Admin, required for Project Admin)
    - include_inactive: Include inactive accounts
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    # Check if user is tenant admin
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    # Base query
    query = {
        "tenant_id": tenant_id,
        "deleted_at": None
    }
    
    if not include_inactive:
        query["is_active"] = True
    
    if is_tenant_admin:
        # Tenant Admin: Can see all accounts across all projects
        # If project_id provided, filter by it
        if project_id:
            query["project_id"] = project_id
    else:
        # Project Admin or staff: Can only see accounts for their assigned projects
        user_projects = await RoleContextService.get_user_projects(user_id, tenant_id)
        
        if not user_projects:
            return {
                "success": True,
                "accounts": [],
                "cash_accounts": [],
                "bank_accounts": [],
                "summary": {
                    "total_accounts": 0,
                    "total_balance": 0,
                    "total_available": 0,
                    "cash_balance": 0,
                    "bank_balance": 0
                },
                "access_level": "no_projects"
            }
        
        # If project_id specified, verify user has access to it
        if project_id:
            if project_id not in user_projects:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have access to this project"
                )
            query["project_id"] = project_id
        else:
            # Return accounts for all projects user has access to
            query["project_id"] = {"$in": user_projects}
    
    accounts = await db.bank_accounts.find(
        query,
        {"_id": 0}
    ).sort("account_number", 1).to_list(length=None)
    
    # Enrich accounts with project information
    for account in accounts:
        project = await db.projects.find_one(
            {"id": account["project_id"], "deleted_at": None},
            {"_id": 0, "project_name": 1}
        )
        account["project_name"] = project.get("project_name") if project else "Unknown"
    
    # Calculate totals
    total_balance = sum(acc["current_balance"] for acc in accounts)
    total_available = sum(acc["available_balance"] for acc in accounts)
    
    # Separate cash and bank accounts
    cash_accounts = [acc for acc in accounts if acc["account_number"] == "1111111"]
    bank_accounts = [acc for acc in accounts if acc["account_number"] != "1111111"]
    
    return {
        "success": True,
        "accounts": accounts,
        "cash_accounts": cash_accounts,
        "bank_accounts": bank_accounts,
        "summary": {
            "total_accounts": len(accounts),
            "total_balance": total_balance,
            "total_available": total_available,
            "cash_balance": sum(acc["current_balance"] for acc in cash_accounts),
            "bank_balance": sum(acc["current_balance"] for acc in bank_accounts)
        },
        "access_level": "tenant_admin" if is_tenant_admin else "project_level",
        "accessible_projects": await RoleContextService.get_user_projects(user_id, tenant_id) if not is_tenant_admin else "all"
    }


@router.get("/bank-accounts/{account_id}", response_model=dict)
async def get_bank_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get bank account details with access control.
    
    Access Control:
    - Tenant Admin: Can view any account in their tenant
    - Project Admin: Can only view accounts in their assigned project(s)
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    account = await db.bank_accounts.find_one(
        {"id": account_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    if not is_tenant_admin:
        # Check if user has access to the account's project
        is_project_admin = await RoleContextService.is_project_admin(
            user_id, 
            tenant_id, 
            account["project_id"]
        )
        
        if not is_project_admin:
            # Check if user has ANY role in the project
            user_projects = await RoleContextService.get_user_projects(user_id, tenant_id)
            if account["project_id"] not in user_projects:
                raise HTTPException(
                    status_code=403,
                    detail="You don't have access to this bank account"
                )
    
    # Get project information
    project = await db.projects.find_one(
        {"id": account["project_id"], "deleted_at": None},
        {"_id": 0, "project_name": 1}
    )
    account["project_name"] = project.get("project_name") if project else "Unknown"
    
    # Get recent transactions
    transactions = await db.transactions.find(
        {
            "$or": [
                {"from_account_id": account_id},
                {"to_account_id": account_id}
            ],
            "deleted_at": None
        },
        {"_id": 0}
    ).sort("transaction_date", -1).limit(50).to_list(length=50)
    
    # Get pending cheques
    pending_cheques = await db.cheques.find(
        {
            "account_id": account_id,
            "status": "pending",
            "deleted_at": None
        },
        {"_id": 0}
    ).sort("expected_clearing_date", 1).to_list(length=None)
    
    return {
        "success": True,
        "account": account,
        "transactions": transactions,
        "pending_cheques": pending_cheques,
        "pending_cheques_amount": sum(ch["cheque_amount"] for ch in pending_cheques)
    }


@router.get("/bank-accounts/shareable/{account_id}", response_model=dict)
async def get_shareable_bank_details(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get bank account details in shareable format for customers"""
    
    account = await db.bank_accounts.find_one(
        {"id": account_id, "deleted_at": None, "is_active": True},
        {"_id": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Return only necessary details
    shareable_details = {
        "account_holder_name": account.get("account_holder_name", account["account_name"]),
        "account_number": account["account_number"],
        "bank_name": account.get("bank_name", "Cash"),
        "branch": account.get("branch"),
        "ifsc_code": account.get("ifsc_code")
    }
    
    return {
        "success": True,
        "bank_details": shareable_details,
        "formatted_text": f"""
Bank Details for Payment:

Account Holder: {shareable_details['account_holder_name']}
Account Number: {shareable_details['account_number']}
Bank Name: {shareable_details['bank_name']}
Branch: {shareable_details['branch'] or 'N/A'}
IFSC Code: {shareable_details['ifsc_code'] or 'N/A'}

Please use the above details for payment.
        """.strip()
    }


@router.put("/bank-accounts/{account_id}", response_model=dict)
async def update_bank_account(
    account_id: str,
    account_update: BankAccountUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update bank account details with access control.
    
    Access Control:
    - Tenant Admin: Can update any account in their tenant
    - Project Admin: Can only update accounts in their assigned project(s)
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    account = await db.bank_accounts.find_one(
        {"id": account_id, "deleted_at": None}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    if not is_tenant_admin:
        is_project_admin = await RoleContextService.is_project_admin(
            user_id, 
            tenant_id, 
            account["project_id"]
        )
        
        if not is_project_admin:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to update this bank account"
            )
    
    update_data = {k: v for k, v in account_update.dict(exclude_unset=True).items()}
    
    # If marking as primary online, unmark others in the SAME PROJECT
    if update_data.get("is_primary_online"):
        await db.bank_accounts.update_many(
            {
                "tenant_id": account["tenant_id"],
                "project_id": account["project_id"],
                "id": {"$ne": account_id},
                "deleted_at": None
            },
            {"$set": {"is_primary_online": False}}
        )
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.bank_accounts.update_one(
            {"id": account_id},
            {"$set": update_data}
        )
    
    return {
        "success": True,
        "message": "Account updated successfully"
    }


@router.delete("/bank-accounts/{account_id}", response_model=dict)
async def delete_bank_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Soft delete bank account with access control.
    
    Access Control:
    - Tenant Admin: Can delete any account in their tenant
    - Project Admin: Can only delete accounts in their assigned project(s)
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    account = await db.bank_accounts.find_one(
        {"id": account_id, "deleted_at": None}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify access
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    if not is_tenant_admin:
        is_project_admin = await RoleContextService.is_project_admin(
            user_id, 
            tenant_id, 
            account["project_id"]
        )
        
        if not is_project_admin:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this bank account"
            )
    
    # Check if account has balance
    if account["current_balance"] != 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete account with non-zero balance (₹{account['current_balance']:,.2f})"
        )
    
    await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc),
            "is_active": False
        }}
    )
    
    return {
        "success": True,
        "message": "Account deleted successfully"
    }


@router.get("/bank-accounts/primary-online/{project_id}", response_model=dict)
async def get_primary_online_account(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get primary account for online payment gateway for a specific project.
    
    Updated: Now project-specific instead of tenant-level.
    """
    tenant_id = current_user.get("tenant_id")
    
    # First, look for primary online account in the project
    account = await db.bank_accounts.find_one(
        {
            "tenant_id": tenant_id,
            "project_id": project_id,
            "is_primary_online": True,
            "is_active": True,
            "deleted_at": None
        },
        {"_id": 0}
    )
    
    if not account:
        # Return first active bank account in the project (not cash)
        account = await db.bank_accounts.find_one(
            {
                "tenant_id": tenant_id,
                "project_id": project_id,
                "account_number": {"$ne": "1111111"},
                "is_active": True,
                "deleted_at": None
            },
            {"_id": 0}
        )
    
    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"No active bank account found for online payments in project {project_id}"
        )
    
    return {
        "success": True,
        "account": account
    }
