"""
Coupon Code Management Routes
Generate and track ₹5000 discount coupons
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from models.coupon import CouponCode, CouponRequest, CouponUsage
from middleware.auth import get_current_user
import uuid
from datetime import datetime
import random
import string

router = APIRouter(prefix="/coupons", tags=["coupons"])

def get_db(request: Request):
    return request.app.database

def generate_coupon_code() -> str:
    """Generate unique coupon code: RETO5K-XXXXX"""
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"RETO5K-{random_part}"

@router.post("/generate")
async def generate_coupon(
    request: CouponRequest,
    db = Depends(get_db)
):
    """
    Generate ₹5000 discount coupon for customer
    PUBLIC endpoint - anyone can request
    """
    
    # Check if phone already has an active coupon
    existing = await db.coupons.find_one({
        "customer_phone": request.customer_phone,
        "status": "issued"
    })
    
    if existing:
        # Return existing coupon
        return {
            "success": True,
            "message": "You already have an active coupon!",
            "coupon": {
                "code": existing["code"],
                "discount": existing["discount_amount"],
                "status": existing["status"]
            }
        }
    
    # Generate new coupon
    coupon_code = generate_coupon_code()
    
    coupon = CouponCode(
        id=str(uuid.uuid4()),
        code=coupon_code,
        customer_name=request.customer_name,
        customer_phone=request.customer_phone,
        customer_email=request.customer_email,
        discount_amount=5000,
        status="issued",
        issued_date=datetime.now().isoformat(),
        source="advisory"
    )
    
    await db.coupons.insert_one(coupon.dict())
    
    return {
        "success": True,
        "message": "Coupon generated successfully!",
        "coupon": {
            "code": coupon_code,
            "discount": 5000,
            "valid_until": "Valid for 90 days",
            "how_to_use": "Share this code with our sales team when booking property"
        }
    }

@router.post("/mark-used")
async def mark_coupon_used(
    usage: CouponUsage,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Mark coupon as used
    Requires authentication (staff only)
    """
    
    # Find coupon
    coupon = await db.coupons.find_one({"code": usage.coupon_code})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    if coupon["status"] == "used":
        raise HTTPException(status_code=400, detail="Coupon already used")
    
    if coupon["status"] == "expired":
        raise HTTPException(status_code=400, detail="Coupon expired")
    
    # Mark as used
    await db.coupons.update_one(
        {"code": usage.coupon_code},
        {
            "$set": {
                "status": "used",
                "used_date": datetime.now().isoformat(),
                "used_for_project": usage.project_id,
                "tenant_id": usage.tenant_id,
                "notes": usage.notes
            }
        }
    )
    
    return {
        "success": True,
        "message": "Coupon marked as used successfully",
        "discount_applied": coupon["discount_amount"]
    }

@router.get("/verify/{coupon_code}")
async def verify_coupon(
    coupon_code: str,
    db = Depends(get_db)
):
    """
    Verify if coupon is valid
    PUBLIC endpoint
    """
    
    coupon = await db.coupons.find_one({"code": coupon_code})
    
    if not coupon:
        return {
            "valid": False,
            "message": "Invalid coupon code"
        }
    
    if coupon["status"] == "used":
        return {
            "valid": False,
            "message": "Coupon already used",
            "used_date": coupon.get("used_date")
        }
    
    if coupon["status"] == "expired":
        return {
            "valid": False,
            "message": "Coupon expired"
        }
    
    return {
        "valid": True,
        "message": "Coupon is valid!",
        "discount": coupon["discount_amount"],
        "customer_phone": coupon["customer_phone"]
    }

@router.get("/stats")
async def get_coupon_stats(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get coupon usage statistics
    Requires authentication (admin/staff)
    """
    
    total_issued = await db.coupons.count_documents({"status": "issued"})
    total_used = await db.coupons.count_documents({"status": "used"})
    total_expired = await db.coupons.count_documents({"status": "expired"})
    
    # Recent coupons
    recent = await db.coupons.find().sort("issued_date", -1).limit(10).to_list(length=10)
    
    return {
        "stats": {
            "total_issued": total_issued,
            "total_used": total_used,
            "total_expired": total_expired,
            "usage_rate": f"{(total_used / (total_issued + total_used + total_expired) * 100):.1f}%" if (total_issued + total_used + total_expired) > 0 else "0%"
        },
        "recent_coupons": [
            {
                "code": c["code"],
                "phone": c["customer_phone"],
                "status": c["status"],
                "issued": c["issued_date"]
            }
            for c in recent
        ]
    }
