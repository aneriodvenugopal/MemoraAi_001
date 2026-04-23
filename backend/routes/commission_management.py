from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

from models.commission_transaction import CommissionEarning, CommissionPayout, CommissionPayoutCreate, CommissionApproval
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

async def calculate_commissions_for_payment(payment_id: str):
    """
    Calculate and create commission earnings when a payment is received
    This runs as a background task
    """
    
    payment = await db.customer_payments.find_one({"id": payment_id})
    if not payment or payment.get("status") != "completed":
        return
    
    # Get all bookings for this payment
    for booking_id in payment.get("booking_ids", []):
        booking = await db.bookings.find_one({"id": booking_id})
        if not booking:
            continue
        
        # Get the staff who closed the deal
        sales_staff_id = booking.get("closed_by")
        if not sales_staff_id:
            continue
        
        # Get staff hierarchy
        staff_hierarchy = await db.staff_hierarchy.find_one({
            "staff_id": sales_staff_id,
            "tenant_id": payment["tenant_id"],
            "deleted_at": None,
            "is_active": True
        })
        
        if not staff_hierarchy:
            continue
        
        # Get property and project details for commission calculation
        property_data = await db.properties.find_one({"id": booking["property_id"]})
        project_data = await db.projects.find_one({"id": booking["project_id"]})
        
        if not property_data or not project_data:
            continue
        
        property_value = booking.get("total_amount", 0)
        payment_received = payment.get("allocation", {}).get(booking_id, 0)
        
        if payment_received <= 0:
            continue
        
        # Calculate direct commission for sales staff
        direct_commission_pct = staff_hierarchy.get("direct_commission_percentage", 0)
        
        # Check for project-specific override
        project_commissions = staff_hierarchy.get("project_commissions", {})
        if booking["project_id"] in project_commissions:
            direct_commission_pct = project_commissions[booking["project_id"]].get("direct", direct_commission_pct)
        
        # Check for category-specific override
        category_commissions = staff_hierarchy.get("category_commissions", {})
        property_category = property_data.get("property_type_id")
        if property_category and property_category in category_commissions:
            direct_commission_pct = category_commissions[property_category].get("direct", direct_commission_pct)
        
        if direct_commission_pct > 0:
            commission_amount = (payment_received * direct_commission_pct) / 100
            tds_amount = (commission_amount * 5.0) / 100  # 5% TDS
            net_commission = commission_amount - tds_amount
            
            # Create direct commission earning
            direct_earning = {
                "id": str(uuid.uuid4()),
                "tenant_id": payment["tenant_id"],
                "project_id": booking["project_id"],
                "property_id": booking["property_id"],
                "booking_id": booking_id,
                "payment_id": payment_id,
                "staff_id": sales_staff_id,
                "staff_name": staff_hierarchy.get("staff_name"),
                "commission_type": "direct",
                "sales_staff_id": sales_staff_id,
                "sales_staff_name": staff_hierarchy.get("staff_name"),
                "hierarchy_level_difference": 0,
                "property_value": property_value,
                "payment_received": payment_received,
                "commission_percentage": direct_commission_pct,
                "commission_amount": commission_amount,
                "currency_id": payment.get("currency_id"),
                "project_specific": booking["project_id"] in project_commissions,
                "category_specific": property_category in category_commissions if property_category else False,
                "tds_percentage": 5.0,
                "tds_amount": tds_amount,
                "net_commission": net_commission,
                "status": "pending",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await db.commission_earnings.insert_one(direct_earning)
        
        # Calculate gap commissions for upline
        hierarchy_path = staff_hierarchy.get("hierarchy_path", [])
        
        for level_diff, manager_id in enumerate(reversed(hierarchy_path), 1):
            manager_hierarchy = await db.staff_hierarchy.find_one({
                "staff_id": manager_id,
                "tenant_id": payment["tenant_id"],
                "deleted_at": None,
                "is_active": True
            })
            
            if not manager_hierarchy:
                continue
            
            gap_commission_pct = manager_hierarchy.get("gap_commission_percentage", 0)
            
            # Check for project-specific override
            manager_project_commissions = manager_hierarchy.get("project_commissions", {})
            if booking["project_id"] in manager_project_commissions:
                gap_commission_pct = manager_project_commissions[booking["project_id"]].get("gap", gap_commission_pct)
            
            # Check for category-specific override
            manager_category_commissions = manager_hierarchy.get("category_commissions", {})
            if property_category and property_category in manager_category_commissions:
                gap_commission_pct = manager_category_commissions[property_category].get("gap", gap_commission_pct)
            
            if gap_commission_pct > 0:
                gap_commission_amount = (payment_received * gap_commission_pct) / 100
                gap_tds_amount = (gap_commission_amount * 5.0) / 100
                gap_net_commission = gap_commission_amount - gap_tds_amount
                
                # Create gap commission earning
                gap_earning = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": payment["tenant_id"],
                    "project_id": booking["project_id"],
                    "property_id": booking["property_id"],
                    "booking_id": booking_id,
                    "payment_id": payment_id,
                    "staff_id": manager_id,
                    "staff_name": manager_hierarchy.get("staff_name"),
                    "commission_type": "gap",
                    "sales_staff_id": sales_staff_id,
                    "sales_staff_name": staff_hierarchy.get("staff_name"),
                    "hierarchy_level_difference": level_diff,
                    "property_value": property_value,
                    "payment_received": payment_received,
                    "commission_percentage": gap_commission_pct,
                    "commission_amount": gap_commission_amount,
                    "currency_id": payment.get("currency_id"),
                    "project_specific": booking["project_id"] in manager_project_commissions,
                    "category_specific": property_category in manager_category_commissions if property_category else False,
                    "tds_percentage": 5.0,
                    "tds_amount": gap_tds_amount,
                    "net_commission": gap_net_commission,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                await db.commission_earnings.insert_one(gap_earning)

@router.get("/commissions/earnings", response_model=dict)
async def list_commission_earnings(
    tenant_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    project_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    commission_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List commission earnings with filters"""
    
    query = {}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if staff_id:
        query["staff_id"] = staff_id
    if project_id:
        query["project_id"] = project_id
    if booking_id:
        query["booking_id"] = booking_id
    if commission_type:
        query["commission_type"] = commission_type
    if status:
        query["status"] = status
    
    if from_date or to_date:
        query["created_at"] = {}
        if from_date:
            query["created_at"]["$gte"] = datetime.fromisoformat(from_date)
        if to_date:
            query["created_at"]["$lte"] = datetime.fromisoformat(to_date)
    
    total_count = await db.commission_earnings.count_documents(query)
    
    earnings = await db.commission_earnings.find(query)\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=None)
    
    # Calculate totals
    total_commission = sum(e.get("commission_amount", 0) for e in earnings)
    total_tds = sum(e.get("tds_amount", 0) for e in earnings)
    total_net = sum(e.get("net_commission", 0) for e in earnings)
    
    return {
        "success": True,
        "count": len(earnings),
        "total_count": total_count,
        "total_commission": total_commission,
        "total_tds": total_tds,
        "total_net_commission": total_net,
        "earnings": earnings
    }

@router.get("/commissions/earnings/{earning_id}", response_model=dict)
async def get_commission_earning(
    earning_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed commission earning information"""
    
    earning = await db.commission_earnings.find_one({"id": earning_id})
    
    if not earning:
        raise HTTPException(status_code=404, detail="Commission earning not found")
    
    # Get related data
    booking = await db.bookings.find_one({"id": earning.get("booking_id")})
    payment = await db.customer_payments.find_one({"id": earning.get("payment_id")})
    property_data = await db.properties.find_one({"id": earning.get("property_id")})
    project_data = await db.projects.find_one({"id": earning.get("project_id")})
    
    return {
        "success": True,
        "earning": earning,
        "booking": booking,
        "payment": payment,
        "property": property_data,
        "project": project_data
    }

@router.post("/commissions/earnings/{earning_id}/approve", response_model=dict)
async def approve_commission_earning(
    earning_id: str,
    approval: CommissionApproval,
    current_user: dict = Depends(get_current_user)
):
    """Approve, reject, or hold commission earning"""
    
    earning = await db.commission_earnings.find_one({"id": earning_id})
    
    if not earning:
        raise HTTPException(status_code=404, detail="Commission earning not found")
    
    if earning.get("status") not in ["pending", "on_hold"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve earning with status: {earning.get('status')}"
        )
    
    new_status = {
        "approve": "approved",
        "reject": "cancelled",
        "hold": "on_hold"
    }.get(approval.action)
    
    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if approval.action == "approve":
        update_data["approved_by"] = current_user.get("id")
        update_data["approved_at"] = datetime.now(timezone.utc)
        update_data["approval_notes"] = approval.notes
    
    await db.commission_earnings.update_one(
        {"id": earning_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Commission earning {approval.action}d successfully",
        "new_status": new_status
    }

@router.get("/commissions/staff/{staff_id}/summary", response_model=dict)
async def get_staff_commission_summary(
    staff_id: str,
    tenant_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get commission summary for a staff member"""
    
    query = {"staff_id": staff_id}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    if from_date or to_date:
        query["created_at"] = {}
        if from_date:
            query["created_at"]["$gte"] = datetime.fromisoformat(from_date)
        if to_date:
            query["created_at"]["$lte"] = datetime.fromisoformat(to_date)
    
    earnings = await db.commission_earnings.find(query).to_list(length=None)
    
    # Calculate by status
    by_status = {}
    for earning in earnings:
        status = earning.get("status", "pending")
        if status not in by_status:
            by_status[status] = {
                "count": 0,
                "total_commission": 0,
                "total_tds": 0,
                "total_net": 0
            }
        
        by_status[status]["count"] += 1
        by_status[status]["total_commission"] += earning.get("commission_amount", 0)
        by_status[status]["total_tds"] += earning.get("tds_amount", 0)
        by_status[status]["total_net"] += earning.get("net_commission", 0)
    
    # Calculate by type
    by_type = {}
    for earning in earnings:
        comm_type = earning.get("commission_type", "direct")
        if comm_type not in by_type:
            by_type[comm_type] = {
                "count": 0,
                "total_commission": 0,
                "total_net": 0
            }
        
        by_type[comm_type]["count"] += 1
        by_type[comm_type]["total_commission"] += earning.get("commission_amount", 0)
        by_type[comm_type]["total_net"] += earning.get("net_commission", 0)
    
    return {
        "success": True,
        "staff_id": staff_id,
        "total_earnings": len(earnings),
        "by_status": by_status,
        "by_type": by_type
    }

@router.post("/commissions/payouts", response_model=dict)
async def create_commission_payout(
    payout_data: CommissionPayoutCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create commission payout (transfer to agent)"""
    
    # Validate all commission earnings exist and are approved
    total_commission = 0
    total_tds = 0
    
    for earning_id in payout_data.commission_earning_ids:
        earning = await db.commission_earnings.find_one({"id": earning_id})
        
        if not earning:
            raise HTTPException(
                status_code=404,
                detail=f"Commission earning {earning_id} not found"
            )
        
        if earning.get("status") != "approved":
            raise HTTPException(
                status_code=400,
                detail=f"Commission earning {earning_id} is not approved"
            )
        
        # Check if already paid
        existing_payout = await db.commission_payouts.find_one({
            "commission_earning_ids": earning_id
        })
        
        if existing_payout:
            raise HTTPException(
                status_code=400,
                detail=f"Commission earning {earning_id} already paid"
            )
        
        total_commission += earning.get("commission_amount", 0)
        total_tds += earning.get("tds_amount", 0)
    
    # Get staff details
    first_earning = await db.commission_earnings.find_one({
        "id": payout_data.commission_earning_ids[0]
    })
    
    staff_hierarchy = await db.staff_hierarchy.find_one({
        "staff_id": first_earning.get("staff_id"),
        "tenant_id": payout_data.tenant_id,
        "deleted_at": None
    })
    
    net_payout = total_commission - total_tds
    
    # Create payout record
    payout_id = str(uuid.uuid4())
    
    payout_dict = {
        "id": payout_id,
        "tenant_id": payout_data.tenant_id,
        "staff_id": first_earning.get("staff_id"),
        "staff_name": first_earning.get("staff_name"),
        "staff_phone": staff_hierarchy.get("staff_phone") if staff_hierarchy else "",
        "staff_bank_account": None,
        "staff_bank_ifsc": None,
        "staff_upi_id": None,
        "commission_earning_ids": payout_data.commission_earning_ids,
        "total_commission": total_commission,
        "total_tds": total_tds,
        "net_payout": net_payout,
        "currency_id": first_earning.get("currency_id"),
        "payment_date": datetime.now(timezone.utc),
        "payment_mode": payout_data.payment_mode,
        "payment_reference": payout_data.payment_reference,
        "company_account_id": payout_data.company_account_id,
        "status": "completed",
        "processed_by": payout_data.processed_by,
        "processed_at": datetime.now(timezone.utc),
        "notes": payout_data.notes,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.commission_payouts.insert_one(payout_dict)
    
    # Update commission earnings to paid status
    await db.commission_earnings.update_many(
        {"id": {"$in": payout_data.commission_earning_ids}},
        {
            "$set": {
                "status": "paid",
                "paid_date": datetime.now(timezone.utc),
                "payment_mode": payout_data.payment_mode,
                "payment_reference": payout_data.payment_reference,
                "paid_by": payout_data.processed_by,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": "Commission payout created successfully",
        "payout_id": payout_id,
        "net_payout": net_payout,
        "earnings_count": len(payout_data.commission_earning_ids)
    }

@router.get("/commissions/payouts", response_model=dict)
async def list_commission_payouts(
    tenant_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List commission payouts with filters"""
    
    query = {}
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    if staff_id:
        query["staff_id"] = staff_id
    if status:
        query["status"] = status
    
    if from_date or to_date:
        query["payment_date"] = {}
        if from_date:
            query["payment_date"]["$gte"] = datetime.fromisoformat(from_date)
        if to_date:
            query["payment_date"]["$lte"] = datetime.fromisoformat(to_date)
    
    total_count = await db.commission_payouts.count_documents(query)
    
    payouts = await db.commission_payouts.find(query)\
        .sort("payment_date", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=None)
    
    total_paid = sum(p.get("net_payout", 0) for p in payouts)
    
    return {
        "success": True,
        "count": len(payouts),
        "total_count": total_count,
        "total_paid": total_paid,
        "payouts": payouts
    }

@router.get("/commissions/payouts/{payout_id}", response_model=dict)
async def get_commission_payout(
    payout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed payout information"""
    
    payout = await db.commission_payouts.find_one({"id": payout_id})
    
    if not payout:
        raise HTTPException(status_code=404, detail="Commission payout not found")
    
    # Get earnings included in this payout
    earnings = []
    for earning_id in payout.get("commission_earning_ids", []):
        earning = await db.commission_earnings.find_one({"id": earning_id})
        if earning:
            earnings.append(earning)
    
    return {
        "success": True,
        "payout": payout,
        "earnings_count": len(earnings),
        "earnings": earnings
    }

@router.post("/commissions/trigger-calculation/{payment_id}", response_model=dict)
async def trigger_commission_calculation(
    payment_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger commission calculation for a payment"""
    
    payment = await db.customer_payments.find_one({"id": payment_id})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail="Can only calculate commissions for completed payments"
        )
    
    # Check if commissions already calculated
    existing = await db.commission_earnings.count_documents({"payment_id": payment_id})
    
    if existing > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Commissions already calculated ({existing} earnings found)"
        )
    
    # Trigger calculation in background
    background_tasks.add_task(calculate_commissions_for_payment, payment_id)
    
    return {
        "success": True,
        "message": "Commission calculation triggered",
        "payment_id": payment_id
    }
