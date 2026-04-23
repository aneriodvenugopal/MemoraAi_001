from fastapi import APIRouter, HTTPException, Request, Query, Depends
from models.user import User, UserCreate, UserUpdate
from datetime import datetime, timezone
from typing import Optional
from utils.helpers import serialize_doc, deserialize_doc
from middleware.auth import get_current_user as auth_get_current_user
from middleware.usage_limits import check_user_limit

router = APIRouter(prefix="/users", tags=["users"])

def get_db(request: Request):
    return request.app.state.db

def get_current_user(request: Request):
    """Get current user from request state (set by auth middleware)"""
    return request.state.user if hasattr(request.state, 'user') else None

@router.get("/")
async def get_users(
    request: Request,
    role_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0)
):
    """Get all users with filters"""
    db = get_db(request)
    
    # Build query
    query = {"deleted_at": None}
    
    if role_id:
        query["role_id"] = role_id
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    if is_active is not None:
        query["is_active"] = is_active
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Get users
    users = await db.users.find(query, {"_id": 0}) \
        .skip(skip) \
        .limit(limit) \
        .to_list(length=limit)
    
    # Enrich with role information
    for user in users:
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        user["role"] = role
    
    return {
        "users": users,
        "total": await db.users.count_documents(query)
    }

@router.get("/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user by ID"""
    db = get_db(request)
    
    user = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role details
    role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
    user["role"] = role
    
    # Get tenant details if applicable
    if user.get("tenant_id"):
        tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
        user["tenant"] = tenant
    
    return user

@router.post("/")
async def create_user(
    user_data: UserCreate, 
    request: Request,
    current_user: dict = Depends(check_user_limit)  # Enforce user limit
):
    """Create new user (admin only)"""
    db = get_db(request)
    
    # Check if phone already exists
    existing = await db.users.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User with this phone already exists")
    
    # Check if email already exists (if provided)
    if user_data.email:
        existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create user
    user = User(
        phone=user_data.phone,
        name=user_data.name,
        email=user_data.email,
        role_id=user_data.role_id,
        tenant_id=user_data.tenant_id,
        is_active=True
    )
    
    user_doc = serialize_doc(user.model_dump())
    await db.users.insert_one(user_doc)
    
    return {"message": "User created successfully", "user_id": user.id}

@router.put("/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, request: Request):
    """Update user"""
    db = get_db(request)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update dict
    update_data = {}
    if user_data.name is not None:
        update_data["name"] = user_data.name
    if user_data.email is not None:
        # Check if email is already taken by another user
        if user_data.email:
            existing = await db.users.find_one(
                {"email": user_data.email, "id": {"$ne": user_id}}, 
                {"_id": 0}
            )
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = user_data.email
    if user_data.role_id is not None:
        update_data["role_id"] = user_data.role_id
    if user_data.tenant_id is not None:
        update_data["tenant_id"] = user_data.tenant_id
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    return {"message": "User updated successfully"}

@router.delete("/{user_id}")
async def deactivate_user(user_id: str, request: Request):
    """Deactivate user (soft delete)"""
    db = get_db(request)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Deactivate user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "User deactivated successfully"}

@router.post("/{user_id}/activate")
async def activate_user(user_id: str, request: Request):
    """Activate user"""
    db = get_db(request)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Activate user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_active": True,
            "deleted_at": None
        }}
    )
    
    return {"message": "User activated successfully"}

@router.get("/{user_id}/performance")
async def get_user_performance(user_id: str, request: Request):
    """Get staff performance metrics"""
    db = get_db(request)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get assigned leads count
    total_leads = await db.leads.count_documents({
        "assigned_to": user_id,
        "deleted_at": None
    })
    
    # Get converted leads count
    converted_status = await db.categories.find_one(
        {"type": "lead_status", "slug": "converted"},
        {"_id": 0}
    )
    converted_leads = 0
    if converted_status:
        converted_leads = await db.leads.count_documents({
            "assigned_to": user_id,
            "status_id": converted_status["id"],
            "deleted_at": None
        })
    
    # Conversion rate
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Get commissions
    total_commission = await db.commissions.aggregate([
        {"$match": {"staff_id": user_id, "deleted_at": None}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    total_commission_amount = total_commission[0]["total"] if total_commission else 0
    
    # Paid commissions
    paid_commission = await db.commissions.aggregate([
        {"$match": {"staff_id": user_id, "status": "paid", "deleted_at": None}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    
    paid_commission_amount = paid_commission[0]["total"] if paid_commission else 0
    
    # Get bookings closed by this staff
    bookings_closed = await db.bookings.count_documents({
        "closed_by": user_id,
        "deleted_at": None
    })
    
    # Total deal value
    deal_value = await db.bookings.aggregate([
        {"$match": {"closed_by": user_id, "deleted_at": None}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(length=1)
    
    total_deal_value = deal_value[0]["total"] if deal_value else 0
    
    # Get recent leads
    recent_leads = await db.leads.find(
        {"assigned_to": user_id, "deleted_at": None},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(length=5)
    
    # Enrich leads with status
    for lead in recent_leads:
        if lead.get("status_id"):
            status = await db.categories.find_one(
                {"id": lead["status_id"]},
                {"_id": 0, "name": 1}
            )
            lead["status_name"] = status["name"] if status else "Unknown"
    
    return {
        "user": user,
        "metrics": {
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "conversion_rate": round(conversion_rate, 2),
            "bookings_closed": bookings_closed,
            "total_deal_value": round(total_deal_value, 2),
            "total_commission_earned": round(total_commission_amount, 2),
            "commission_paid": round(paid_commission_amount, 2),
            "commission_pending": round(total_commission_amount - paid_commission_amount, 2)
        },
        "recent_leads": recent_leads
    }

@router.get("/stats/overview")
async def get_users_stats(request: Request, tenant_id: Optional[str] = Query(None)):
    """Get overall user statistics"""
    db = get_db(request)
    
    query = {"deleted_at": None}
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    # Total users
    total_users = await db.users.count_documents(query)
    
    # Active users
    active_users = await db.users.count_documents({**query, "is_active": True})
    
    # Users by role
    roles = await db.roles.find({}, {"_id": 0}).to_list(length=None)
    users_by_role = []
    
    for role in roles:
        count = await db.users.count_documents({**query, "role_id": role["id"]})
        if count > 0:
            users_by_role.append({
                "role": role["name"],
                "count": count
            })
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "users_by_role": users_by_role
    }
