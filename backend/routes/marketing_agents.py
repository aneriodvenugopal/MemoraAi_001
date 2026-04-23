"""
Marketing Agents Management API
- CRUD operations for marketing agents
- Commission tracking per agent
- Sales performance analytics
- Payment history management
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from middleware.auth import get_current_user
import uuid

router = APIRouter(prefix="/marketing-agents", tags=["Marketing Agents Management"])


def get_db(request: Request):
    return request.app.state.db


# ==================== PYDANTIC MODELS ====================

class BankDetails(BaseModel):
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch: Optional[str] = None
    upi_id: Optional[str] = None


class MarketingAgentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    photo_url: Optional[str] = None
    commission_rate: float = Field(default=2.5, ge=0, le=100)
    bank_details: Optional[BankDetails] = None
    assigned_projects: List[str] = []
    address: Optional[str] = None
    notes: Optional[str] = None


class MarketingAgentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    commission_rate: Optional[float] = None
    bank_details: Optional[BankDetails] = None
    assigned_projects: Optional[List[str]] = None
    status: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CommissionPaymentCreate(BaseModel):
    agent_id: str
    agent_sale_id: Optional[str] = None  # If paying for specific sale
    amount: float
    payment_mode: str  # cash, upi, bank, cheque
    reference_no: Optional[str] = None
    bank_account_id: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None


class AgentSaleCreate(BaseModel):
    agent_id: str
    booking_id: str
    property_id: str
    project_id: str
    customer_id: str
    sale_amount: float
    commission_rate: Optional[float] = None  # If different from agent's default


# ==================== AGENT CRUD ENDPOINTS ====================

@router.get("/")
async def list_marketing_agents(
    request: Request,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List all marketing agents for the tenant"""
    db = get_db(request)
    
    # Get user's tenant
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant_id = user.get("tenant_id")
    
    # Build query
    query = {"tenant_id": tenant_id, "deleted_at": None}
    
    if status:
        query["status"] = status
    
    if project_id:
        query["assigned_projects"] = project_id
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    # Get agents
    agents = await db.marketing_agents.find(query, {"_id": 0}) \
        .skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.marketing_agents.count_documents(query)
    
    # Enrich with stats for each agent
    for agent in agents:
        # Get sales stats
        sales_stats = await get_agent_sales_stats(db, agent["id"])
        agent["stats"] = sales_stats
    
    return {
        "success": True,
        "agents": agents,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats")
async def get_agents_overview_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get overall marketing agents statistics"""
    db = get_db(request)
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    tenant_id = user.get("tenant_id")
    
    # Count agents
    total_agents = await db.marketing_agents.count_documents({
        "tenant_id": tenant_id, "deleted_at": None
    })
    
    active_agents = await db.marketing_agents.count_documents({
        "tenant_id": tenant_id, "deleted_at": None, "status": "active"
    })
    
    # Get commission totals
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {
            "_id": None,
            "total_commission": {"$sum": "$commission_amount"},
            "total_paid": {"$sum": "$paid_amount"},
            "total_sales": {"$sum": "$sale_amount"},
            "total_bookings": {"$sum": 1}
        }}
    ]
    
    agg_result = await db.agent_sales.aggregate(pipeline).to_list(length=1)
    
    stats = agg_result[0] if agg_result else {
        "total_commission": 0,
        "total_paid": 0,
        "total_sales": 0,
        "total_bookings": 0
    }
    
    # This month stats
    from datetime import datetime
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    this_month_pipeline = [
        {"$match": {
            "tenant_id": tenant_id,
            "created_at": {"$gte": month_start.isoformat()}
        }},
        {"$group": {
            "_id": None,
            "sales": {"$sum": "$sale_amount"},
            "commission": {"$sum": "$commission_amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    month_result = await db.agent_sales.aggregate(this_month_pipeline).to_list(length=1)
    this_month = month_result[0] if month_result else {"sales": 0, "commission": 0, "count": 0}
    
    return {
        "success": True,
        "stats": {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "total_commission": stats.get("total_commission", 0),
            "total_paid": stats.get("total_paid", 0),
            "commission_due": stats.get("total_commission", 0) - stats.get("total_paid", 0),
            "total_sales_value": stats.get("total_sales", 0),
            "total_bookings": stats.get("total_bookings", 0),
            "this_month": {
                "sales": this_month.get("sales", 0),
                "commission": this_month.get("commission", 0),
                "bookings": this_month.get("count", 0)
            }
        }
    }


@router.get("/{agent_id}")
async def get_marketing_agent(
    agent_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed information about a marketing agent"""
    db = get_db(request)
    
    agent = await db.marketing_agents.find_one(
        {"id": agent_id, "deleted_at": None},
        {"_id": 0}
    )
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get sales stats
    stats = await get_agent_sales_stats(db, agent_id)
    agent["stats"] = stats
    
    # Get assigned project names
    if agent.get("assigned_projects"):
        projects = await db.projects.find(
            {"id": {"$in": agent["assigned_projects"]}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(length=100)
        agent["projects"] = projects
    
    return {"success": True, "agent": agent}


@router.post("/")
async def create_marketing_agent(
    agent_data: MarketingAgentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new marketing agent"""
    db = get_db(request)
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    tenant_id = user.get("tenant_id")
    
    # Check for duplicate phone
    existing = await db.marketing_agents.find_one({
        "tenant_id": tenant_id,
        "phone": agent_data.phone,
        "deleted_at": None
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Agent with this phone already exists")
    
    agent_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        **agent_data.dict(),
        "status": "active",
        "joining_date": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    
    # Convert bank_details to dict if present
    if agent_doc.get("bank_details"):
        agent_doc["bank_details"] = agent_doc["bank_details"].dict() if hasattr(agent_doc["bank_details"], 'dict') else agent_doc["bank_details"]
    
    await db.marketing_agents.insert_one(agent_doc)
    agent_doc.pop("_id", None)
    
    return {"success": True, "agent": agent_doc, "message": "Agent created successfully"}


@router.put("/{agent_id}")
async def update_marketing_agent(
    agent_id: str,
    agent_data: MarketingAgentUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a marketing agent"""
    db = get_db(request)
    
    agent = await db.marketing_agents.find_one({"id": agent_id, "deleted_at": None})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    update_data = {k: v for k, v in agent_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user["user_id"]
    
    # Convert bank_details if present
    if update_data.get("bank_details"):
        update_data["bank_details"] = update_data["bank_details"].dict() if hasattr(update_data["bank_details"], 'dict') else update_data["bank_details"]
    
    await db.marketing_agents.update_one(
        {"id": agent_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Agent updated successfully"}


@router.delete("/{agent_id}")
async def delete_marketing_agent(
    agent_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Soft delete a marketing agent"""
    db = get_db(request)
    
    agent = await db.marketing_agents.find_one({"id": agent_id, "deleted_at": None})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    await db.marketing_agents.update_one(
        {"id": agent_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_by": current_user["user_id"],
            "status": "deleted"
        }}
    )
    
    return {"success": True, "message": "Agent deleted successfully"}


@router.put("/{agent_id}/status")
async def update_agent_status(
    agent_id: str,
    status: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update agent status (active/inactive/terminated)"""
    db = get_db(request)
    
    if status not in ["active", "inactive", "terminated"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.marketing_agents.update_one(
        {"id": agent_id, "deleted_at": None},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {"success": True, "message": f"Agent status updated to {status}"}


# ==================== SALES & COMMISSION ENDPOINTS ====================

@router.get("/{agent_id}/sales")
async def get_agent_sales(
    agent_id: str,
    request: Request,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all sales/bookings attributed to an agent"""
    db = get_db(request)
    
    query = {"agent_id": agent_id}
    
    if status:
        query["status"] = status
    
    if project_id:
        query["project_id"] = project_id
    
    sales = await db.agent_sales.find(query, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with property and project names
    for sale in sales:
        # Get property info
        property_doc = await db.properties.find_one(
            {"id": sale.get("property_id")},
            {"_id": 0, "property_number": 1, "area": 1}
        )
        if property_doc:
            sale["property_number"] = property_doc.get("property_number")
            sale["property_area"] = property_doc.get("area")
        
        # Get project name
        project = await db.projects.find_one(
            {"id": sale.get("project_id")},
            {"_id": 0, "name": 1}
        )
        if project:
            sale["project_name"] = project.get("name")
        
        # Get customer name
        customer = await db.customers.find_one(
            {"id": sale.get("customer_id")},
            {"_id": 0, "name": 1, "phone": 1}
        )
        if customer:
            sale["customer_name"] = customer.get("name")
            sale["customer_phone"] = customer.get("phone")
    
    total = await db.agent_sales.count_documents(query)
    
    return {
        "success": True,
        "sales": sales,
        "total": total
    }


@router.post("/sales")
async def record_agent_sale(
    sale_data: AgentSaleCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Record a new sale attributed to an agent"""
    db = get_db(request)
    
    # Get agent
    agent = await db.marketing_agents.find_one(
        {"id": sale_data.agent_id, "deleted_at": None},
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Calculate commission
    commission_rate = sale_data.commission_rate or agent.get("commission_rate", 2.5)
    commission_amount = (sale_data.sale_amount * commission_rate) / 100
    
    sale_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": agent.get("tenant_id"),
        "agent_id": sale_data.agent_id,
        "booking_id": sale_data.booking_id,
        "property_id": sale_data.property_id,
        "project_id": sale_data.project_id,
        "customer_id": sale_data.customer_id,
        "sale_amount": sale_data.sale_amount,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "paid_amount": 0,
        "balance_amount": commission_amount,
        "status": "pending",  # pending, partial, paid
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.agent_sales.insert_one(sale_doc)
    sale_doc.pop("_id", None)
    
    return {"success": True, "sale": sale_doc, "message": "Sale recorded successfully"}


@router.get("/{agent_id}/payments")
async def get_agent_commission_payments(
    agent_id: str,
    request: Request,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all commission payments made to an agent"""
    db = get_db(request)
    
    payments = await db.agent_commission_payments.find(
        {"agent_id": agent_id},
        {"_id": 0}
    ).sort("payment_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with sale details
    for payment in payments:
        if payment.get("agent_sale_id"):
            sale = await db.agent_sales.find_one(
                {"id": payment["agent_sale_id"]},
                {"_id": 0, "property_id": 1, "project_id": 1}
            )
            if sale:
                property_doc = await db.properties.find_one(
                    {"id": sale.get("property_id")},
                    {"_id": 0, "property_number": 1}
                )
                project = await db.projects.find_one(
                    {"id": sale.get("project_id")},
                    {"_id": 0, "name": 1}
                )
                payment["property_number"] = property_doc.get("property_number") if property_doc else None
                payment["project_name"] = project.get("name") if project else None
    
    total = await db.agent_commission_payments.count_documents({"agent_id": agent_id})
    
    # Get totals
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "success": True,
        "payments": payments,
        "total": total,
        "total_paid": total_paid
    }


@router.post("/payments")
async def record_commission_payment(
    payment_data: CommissionPaymentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Record a commission payment to an agent"""
    db = get_db(request)
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    tenant_id = user.get("tenant_id")
    
    # Get agent
    agent = await db.marketing_agents.find_one(
        {"id": payment_data.agent_id, "deleted_at": None},
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate receipt number
    count = await db.agent_commission_payments.count_documents({"tenant_id": tenant_id})
    receipt_number = f"COM-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "agent_id": payment_data.agent_id,
        "agent_sale_id": payment_data.agent_sale_id,
        "amount": payment_data.amount,
        "payment_mode": payment_data.payment_mode,
        "reference_no": payment_data.reference_no,
        "bank_account_id": payment_data.bank_account_id,
        "payment_date": payment_data.payment_date or datetime.now(timezone.utc).isoformat(),
        "receipt_number": receipt_number,
        "notes": payment_data.notes,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.agent_commission_payments.insert_one(payment_doc)
    
    # Update agent_sale if specific sale
    if payment_data.agent_sale_id:
        sale = await db.agent_sales.find_one({"id": payment_data.agent_sale_id})
        if sale:
            new_paid = sale.get("paid_amount", 0) + payment_data.amount
            new_balance = sale.get("commission_amount", 0) - new_paid
            new_status = "paid" if new_balance <= 0 else ("partial" if new_paid > 0 else "pending")
            
            await db.agent_sales.update_one(
                {"id": payment_data.agent_sale_id},
                {"$set": {
                    "paid_amount": new_paid,
                    "balance_amount": max(0, new_balance),
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Update bank account balance if specified
    if payment_data.bank_account_id:
        await db.bank_accounts.update_one(
            {"id": payment_data.bank_account_id},
            {"$inc": {"current_balance": -payment_data.amount}}
        )
    
    payment_doc.pop("_id", None)
    
    return {
        "success": True,
        "payment": payment_doc,
        "receipt_number": receipt_number,
        "message": "Commission payment recorded successfully"
    }


# ==================== HELPER FUNCTIONS ====================

async def get_agent_sales_stats(db, agent_id: str) -> Dict[str, Any]:
    """Get aggregated sales statistics for an agent"""
    pipeline = [
        {"$match": {"agent_id": agent_id}},
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$sale_amount"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_paid": {"$sum": "$paid_amount"},
            "booking_count": {"$sum": 1},
            "pending_count": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
            "partial_count": {"$sum": {"$cond": [{"$eq": ["$status", "partial"]}, 1, 0]}},
            "paid_count": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}},
        }}
    ]
    
    result = await db.agent_sales.aggregate(pipeline).to_list(length=1)
    
    if not result:
        return {
            "total_sales": 0,
            "total_commission": 0,
            "total_paid": 0,
            "balance_due": 0,
            "booking_count": 0,
            "pending_count": 0,
            "partial_count": 0,
            "paid_count": 0,
        }
    
    stats = result[0]
    stats.pop("_id", None)
    stats["balance_due"] = stats.get("total_commission", 0) - stats.get("total_paid", 0)
    
    return stats


@router.get("/{agent_id}/sales/by-project")
async def get_agent_sales_by_project(
    agent_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get agent sales grouped by project with detailed breakdown"""
    db = get_db(request)
    
    # Group sales by project
    pipeline = [
        {"$match": {"agent_id": agent_id}},
        {"$group": {
            "_id": "$project_id",
            "total_sales": {"$sum": "$sale_amount"},
            "total_commission": {"$sum": "$commission_amount"},
            "total_paid": {"$sum": "$paid_amount"},
            "booking_count": {"$sum": 1},
            "sales": {"$push": {
                "id": "$id",
                "property_id": "$property_id",
                "sale_amount": "$sale_amount",
                "commission_amount": "$commission_amount",
                "paid_amount": "$paid_amount",
                "status": "$status",
                "created_at": "$created_at"
            }}
        }}
    ]
    
    results = await db.agent_sales.aggregate(pipeline).to_list(length=100)
    
    # Enrich with project names and property details
    for result in results:
        project = await db.projects.find_one(
            {"id": result["_id"]},
            {"_id": 0, "name": 1}
        )
        result["project_name"] = project.get("name") if project else "Unknown"
        result["project_id"] = result.pop("_id")
        result["balance_due"] = result["total_commission"] - result["total_paid"]
        
        # Get property numbers for each sale
        for sale in result.get("sales", []):
            property_doc = await db.properties.find_one(
                {"id": sale.get("property_id")},
                {"_id": 0, "property_number": 1}
            )
            sale["property_number"] = property_doc.get("property_number") if property_doc else None
    
    return {
        "success": True,
        "projects": results,
        "total_projects": len(results)
    }
