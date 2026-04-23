"""
Customers Management Routes (Admin/Staff)
- CRUD operations on customers
- Search by name, phone, email, tags
- View purchase history
- Manage wallet transactions
- Export customer data
"""
from fastapi import APIRouter, HTTPException, Request, Query
from models.customer import Customer, CustomerCreate, CustomerUpdate, CustomerWalletTransaction
from middleware.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional, List
import uuid

router = APIRouter(prefix="/customers", tags=["customers-management"])


def get_db(request: Request):
    return request.app.state.db


# ==================== LIST & SEARCH ====================

@router.get("")
async def get_customers(
    request: Request,
    search: Optional[str] = None,
    status: Optional[str] = None,
    is_nri: Optional[bool] = None,
    tag: Optional[str] = None,
    source_slug: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all customers with optional filters"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"], "is_active": True}
    
    # Search by name, phone, or email
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if is_nri is not None:
        query["is_nri"] = is_nri
    
    if tag:
        query["tags"] = tag
    
    if source_slug:
        query["source_slug"] = source_slug
    
    customers = await db.customers.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.customers.count_documents(query)
    
    return {
        "success": True,
        "customers": customers,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats")
async def get_customer_stats(request: Request):
    """Get customer statistics"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"], "is_active": True}
    
    total = await db.customers.count_documents(query)
    
    # By status
    active = await db.customers.count_documents({**query, "status": "active"})
    inactive = await db.customers.count_documents({**query, "status": "inactive"})
    blacklisted = await db.customers.count_documents({**query, "status": "blacklisted"})
    
    # NRI count
    nri_count = await db.customers.count_documents({**query, "is_nri": True})
    
    # With bookings
    customers_with_bookings = await db.bookings.distinct(
        "customer_id",
        {"tenant_id": user["tenant_id"], "deleted_at": None}
    )
    
    # Total wallet balance
    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total_wallet": {"$sum": "$wallet_balance"}}}
    ]
    wallet_result = await db.customers.aggregate(pipeline).to_list(1)
    total_wallet = wallet_result[0]["total_wallet"] if wallet_result else 0
    
    return {
        "success": True,
        "total": total,
        "by_status": {
            "active": active,
            "inactive": inactive,
            "blacklisted": blacklisted
        },
        "nri_count": nri_count,
        "with_bookings": len(customers_with_bookings),
        "total_wallet_balance": round(total_wallet, 2)
    }


@router.get("/search")
async def search_customers(
    request: Request,
    q: str,
    limit: int = 10
):
    """Quick search customers by name or phone"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if len(q) < 2:
        return {"success": True, "customers": []}
    
    query = {
        "tenant_id": user["tenant_id"],
        "is_active": True,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}}
        ]
    }
    
    customers = await db.customers.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1, "status": 1}
    ).limit(limit).to_list(limit)
    
    return {"success": True, "customers": customers}


@router.get("/{customer_id}")
async def get_customer(customer_id: str, request: Request):
    """Get single customer details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "customer": customer}


@router.get("/{customer_id}/purchase-history")
async def get_customer_purchase_history(customer_id: str, request: Request):
    """Get customer's purchase history (bookings, payments)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify customer exists
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1, "user_id": 1}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get bookings by customer_id or user_id
    booking_query = {"tenant_id": user["tenant_id"], "deleted_at": None}
    if customer.get("user_id"):
        booking_query["$or"] = [
            {"customer_id": customer_id},
            {"customer_id": customer["user_id"]}
        ]
    else:
        booking_query["customer_id"] = customer_id
    
    bookings = await db.bookings.find(
        booking_query,
        {"_id": 0}
    ).sort("booking_date", -1).to_list(100)
    
    # Enrich with property and project details
    for booking in bookings:
        if booking.get("property_id"):
            prop = await db.properties.find_one(
                {"id": booking["property_id"]},
                {"_id": 0, "id": 1, "property_number": 1, "plot_number": 1}
            )
            booking["property"] = prop
        
        if booking.get("project_id"):
            project = await db.projects.find_one(
                {"id": booking["project_id"]},
                {"_id": 0, "id": 1, "name": 1}
            )
            booking["project"] = project
    
    # Get payments
    booking_ids = [b["id"] for b in bookings]
    payments = []
    if booking_ids:
        payments = await db.payments.find(
            {"booking_id": {"$in": booking_ids}, "deleted_at": None},
            {"_id": 0}
        ).sort("payment_date", -1).to_list(100)
    
    # Summary
    total_bookings = len(bookings)
    total_value = sum(b.get("total_amount", 0) for b in bookings)
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    
    return {
        "success": True,
        "customer_id": customer_id,
        "customer_name": customer["name"],
        "summary": {
            "total_bookings": total_bookings,
            "total_value": round(total_value, 2),
            "total_paid": round(total_paid, 2),
            "balance": round(total_value - total_paid, 2)
        },
        "bookings": bookings,
        "payments": payments
    }


@router.get("/{customer_id}/wallet")
async def get_customer_wallet(customer_id: str, request: Request):
    """Get customer wallet details and transactions"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "name": 1, "wallet_balance": 1, "total_wallet_earned": 1, "total_wallet_used": 1}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get wallet transactions
    transactions = await db.customer_wallet_transactions.find(
        {"customer_id": customer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "customer_id": customer_id,
        "customer_name": customer["name"],
        "wallet": {
            "balance": customer.get("wallet_balance", 0),
            "total_earned": customer.get("total_wallet_earned", 0),
            "total_used": customer.get("total_wallet_used", 0)
        },
        "transactions": transactions
    }


# ==================== CREATE ====================

@router.post("")
async def create_customer(
    customer_data: CustomerCreate,
    request: Request
):
    """Create a new customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check for duplicate phone
    existing = await db.customers.find_one({
        "tenant_id": user["tenant_id"],
        "phone": customer_data.phone,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone already exists")
    
    customer = Customer(
        tenant_id=user["tenant_id"],
        name=customer_data.name,
        phone=customer_data.phone,
        alternate_phone=customer_data.alternate_phone,
        email=customer_data.email,
        address=customer_data.address,
        city=customer_data.city,
        state=customer_data.state,
        pincode=customer_data.pincode,
        aadhar_number=customer_data.aadhar_number,
        pan_number=customer_data.pan_number,
        is_nri=customer_data.is_nri,
        passport_number=customer_data.passport_number,
        country_of_residence=customer_data.country_of_residence,
        is_joint_buyer=customer_data.is_joint_buyer,
        joint_buyers=customer_data.joint_buyers,
        preferred_contact_method=customer_data.preferred_contact_method,
        preferred_contact_time=customer_data.preferred_contact_time,
        source_slug=customer_data.source_slug,
        referred_by_customer_id=customer_data.referred_by_customer_id,
        notes=customer_data.notes,
        tags=customer_data.tags,
        converted_from_lead_id=customer_data.converted_from_lead_id
    )
    
    await db.customers.insert_one(customer.model_dump())
    
    return {
        "success": True,
        "customer": customer.model_dump(),
        "message": "Customer created successfully"
    }


# ==================== UPDATE ====================

@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    update_data: CustomerUpdate,
    request: Request
):
    """Update customer details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Build update dict
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_dict[field] = value
    
    result = await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": "Customer updated"}


@router.post("/{customer_id}/add-tag")
async def add_customer_tag(
    customer_id: str,
    request: Request,
    tag: str
):
    """Add a tag to customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {
            "$addToSet": {"tags": tag.lower().strip()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": f"Tag '{tag}' added"}


@router.post("/{customer_id}/remove-tag")
async def remove_customer_tag(
    customer_id: str,
    request: Request,
    tag: str
):
    """Remove a tag from customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {
            "$pull": {"tags": tag.lower().strip()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": f"Tag '{tag}' removed"}


# ==================== WALLET ====================

@router.post("/{customer_id}/wallet/credit")
async def credit_customer_wallet(
    customer_id: str,
    request: Request,
    amount: float,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None
):
    """Credit amount to customer wallet"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can credit wallet")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    new_balance = customer.get("wallet_balance", 0) + amount
    new_total_earned = customer.get("total_wallet_earned", 0) + amount
    
    # Create transaction
    transaction = CustomerWalletTransaction(
        customer_id=customer_id,
        tenant_id=user["tenant_id"],
        type="credit",
        amount=amount,
        balance_after=new_balance,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id
    )
    
    await db.customer_wallet_transactions.insert_one(transaction.model_dump())
    
    # Update customer wallet
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {
            "wallet_balance": new_balance,
            "total_wallet_earned": new_total_earned,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "new_balance": new_balance,
        "transaction_id": transaction.id,
        "message": f"₹{amount} credited to wallet"
    }


@router.post("/{customer_id}/wallet/debit")
async def debit_customer_wallet(
    customer_id: str,
    request: Request,
    amount: float,
    reason: str,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None
):
    """Debit amount from customer wallet"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    current_balance = customer.get("wallet_balance", 0)
    
    if current_balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: ₹{current_balance}")
    
    new_balance = current_balance - amount
    new_total_used = customer.get("total_wallet_used", 0) + amount
    
    # Create transaction
    transaction = CustomerWalletTransaction(
        customer_id=customer_id,
        tenant_id=user["tenant_id"],
        type="debit",
        amount=amount,
        balance_after=new_balance,
        reason=reason,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id
    )
    
    await db.customer_wallet_transactions.insert_one(transaction.model_dump())
    
    # Update customer wallet
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": {
            "wallet_balance": new_balance,
            "total_wallet_used": new_total_used,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "new_balance": new_balance,
        "transaction_id": transaction.id,
        "message": f"₹{amount} debited from wallet"
    }


# ==================== DELETE ====================

@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, request: Request):
    """Soft delete a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only admin can delete customers")
    
    # Check if customer has active bookings
    active_bookings = await db.bookings.count_documents({
        "customer_id": customer_id,
        "status": {"$nin": ["cancelled", "completed"]},
        "deleted_at": None
    })
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer with {active_bookings} active bookings"
        )
    
    result = await db.customers.update_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": "Customer deleted"}


# ==================== CONVERT LEAD ====================

@router.post("/convert-lead/{lead_id}")
async def convert_lead_to_customer(
    lead_id: str,
    request: Request
):
    """Convert a lead to customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get lead
    lead = await db.leads.find_one(
        {"id": lead_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if already converted
    existing = await db.customers.find_one({
        "tenant_id": user["tenant_id"],
        "converted_from_lead_id": lead_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Lead already converted to customer")
    
    # Check for duplicate phone
    phone_exists = await db.customers.find_one({
        "tenant_id": user["tenant_id"],
        "phone": lead.get("phone"),
        "is_active": True
    })
    
    if phone_exists:
        raise HTTPException(status_code=400, detail="Customer with this phone already exists")
    
    # Create customer from lead
    customer = Customer(
        tenant_id=user["tenant_id"],
        name=lead.get("name", ""),
        phone=lead.get("phone", ""),
        email=lead.get("email"),
        source_slug=lead.get("source_id"),
        notes=lead.get("notes"),
        converted_from_lead_id=lead_id
    )
    
    await db.customers.insert_one(customer.model_dump())
    
    # Update lead status
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "converted",
            "converted_to_customer_id": customer.id,
            "converted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "customer": customer.model_dump(),
        "message": "Lead converted to customer"
    }
