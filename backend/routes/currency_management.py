from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from models.currency import Currency, CurrencyCreate, CurrencyUpdate
from middleware.auth import get_current_user

router = APIRouter()

# Database connection
MONGO_URL = os.getenv('MONGO_URL')
client = AsyncIOMotorClient(MONGO_URL)
db = client.retoerp

@router.get("/currencies", response_model=dict)
async def get_all_currencies(
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all currencies"""
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    currencies = await db.currencies.find(query).to_list(length=None)
    
    # Separate base currency
    base = next((c for c in currencies if c.get("is_base_currency")), None)
    others = [c for c in currencies if not c.get("is_base_currency")]
    
    return {
        "success": True,
        "count": len(currencies),
        "base_currency": base,
        "currencies": others
    }

@router.get("/currencies/{currency_id}", response_model=dict)
async def get_currency(
    currency_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single currency details"""
    
    currency = await db.currencies.find_one({"id": currency_id})
    
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    return {
        "success": True,
        "currency": currency
    }

@router.get("/currencies/code/{currency_code}", response_model=dict)
async def get_currency_by_code(
    currency_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Get currency by code (INR, USD, etc.)"""
    
    currency = await db.currencies.find_one({"code": currency_code.upper()})
    
    if not currency:
        raise HTTPException(status_code=404, detail=f"Currency {currency_code} not found")
    
    return {
        "success": True,
        "currency": currency
    }

@router.post("/currencies", response_model=dict)
async def create_currency(
    currency: CurrencyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new currency (Admin only)"""
    
    # Check if code already exists
    existing = await db.currencies.find_one({"code": currency.code.upper()})
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Currency {currency.code} already exists"
        )
    
    currency_dict = currency.dict()
    currency_dict["id"] = Currency().id
    currency_dict["code"] = currency_dict["code"].upper()
    currency_dict["is_active"] = True
    currency_dict["created_at"] = datetime.now(timezone.utc)
    currency_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.currencies.insert_one(currency_dict)
    
    return {
        "success": True,
        "message": f"Currency {currency.code} created successfully",
        "currency_id": currency_dict["id"]
    }

@router.put("/currencies/{currency_id}", response_model=dict)
async def update_currency(
    currency_id: str,
    update: CurrencyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update currency (mainly exchange rate)"""
    
    currency = await db.currencies.find_one({"id": currency_id})
    
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    update_data = {k: v for k, v in update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.currencies.update_one(
        {"id": currency_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Currency updated successfully"
    }

@router.put("/currencies/code/{currency_code}/rate", response_model=dict)
async def update_exchange_rate(
    currency_code: str,
    exchange_rate_to_inr: float,
    current_user: dict = Depends(get_current_user)
):
    """Update exchange rate for a currency"""
    
    currency = await db.currencies.find_one({"code": currency_code.upper()})
    
    if not currency:
        raise HTTPException(status_code=404, detail=f"Currency {currency_code} not found")
    
    if currency.get("is_base_currency"):
        raise HTTPException(
            status_code=400,
            detail="Cannot update exchange rate for base currency"
        )
    
    await db.currencies.update_one(
        {"code": currency_code.upper()},
        {
            "$set": {
                "exchange_rate_to_inr": exchange_rate_to_inr,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Exchange rate updated: 1 {currency_code.upper()} = ₹{exchange_rate_to_inr}",
        "new_rate": exchange_rate_to_inr
    }

@router.post("/currencies/convert", response_model=dict)
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    current_user: dict = Depends(get_current_user)
):
    """Convert amount from one currency to another"""
    
    # Get both currencies
    from_curr = await db.currencies.find_one({"code": from_currency.upper()})
    to_curr = await db.currencies.find_one({"code": to_currency.upper()})
    
    if not from_curr:
        raise HTTPException(status_code=404, detail=f"Currency {from_currency} not found")
    
    if not to_curr:
        raise HTTPException(status_code=404, detail=f"Currency {to_currency} not found")
    
    # Convert to INR first (base currency)
    amount_in_inr = amount * from_curr.get("exchange_rate_to_inr", 1.0)
    
    # Convert from INR to target currency
    to_rate = to_curr.get("exchange_rate_to_inr", 1.0)
    converted_amount = amount_in_inr / to_rate if to_rate > 0 else 0
    
    return {
        "success": True,
        "from_currency": from_currency.upper(),
        "to_currency": to_currency.upper(),
        "original_amount": amount,
        "converted_amount": round(converted_amount, 2),
        "exchange_rate": round(from_curr.get("exchange_rate_to_inr", 1.0) / to_rate if to_rate > 0 else 0, 4)
    }

@router.get("/currencies/rates/all", response_model=dict)
async def get_all_exchange_rates(
    base_currency: str = "INR",
    current_user: dict = Depends(get_current_user)
):
    """Get all exchange rates relative to base currency"""
    
    base = await db.currencies.find_one({"code": base_currency.upper()})
    
    if not base:
        raise HTTPException(status_code=404, detail=f"Base currency {base_currency} not found")
    
    currencies = await db.currencies.find({"is_active": True}).to_list(length=None)
    
    rates = {}
    base_rate = base.get("exchange_rate_to_inr", 1.0)
    
    for curr in currencies:
        if curr["code"] != base_currency.upper():
            curr_rate = curr.get("exchange_rate_to_inr", 1.0)
            # Calculate rate relative to base currency
            rates[curr["code"]] = {
                "rate": round(curr_rate / base_rate if base_rate > 0 else 0, 4),
                "symbol": curr.get("symbol"),
                "name": curr.get("name")
            }
    
    return {
        "success": True,
        "base_currency": base_currency.upper(),
        "rates": rates
    }
