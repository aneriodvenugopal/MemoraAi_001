from fastapi import APIRouter, HTTPException, Request
from models.currency import Currency, CurrencyCreate
from services.currency_service import CurrencyService
from utils.helpers import serialize_doc, deserialize_doc
from typing import List

router = APIRouter(prefix="/currencies", tags=["currencies"])

def get_db(request: Request):
    return request.app.state.db

@router.get("/", response_model=List[Currency])
async def get_currencies(request: Request):
    """Get all active currencies"""
    db = get_db(request)
    
    currencies = await db.currencies.find({'is_active': True}, {"_id": 0}).to_list(100)
    
    for curr in currencies:
        deserialize_doc(curr)
    
    return [Currency(**c) for c in currencies]

@router.post("/", response_model=Currency)
async def create_currency(currency_create: CurrencyCreate, request: Request):
    """Create a new currency"""
    db = get_db(request)
    
    # Check if currency already exists
    existing = await db.currencies.find_one({'code': currency_create.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Currency already exists")
    
    currency = Currency(**currency_create.model_dump())
    currency_doc = serialize_doc(currency.model_dump())
    
    await db.currencies.insert_one(currency_doc)
    
    return currency

@router.post("/update-rates")
async def update_exchange_rates(request: Request):
    """Update exchange rates from API"""
    db = get_db(request)
    currency_service = CurrencyService(db)
    
    success = await currency_service.update_exchange_rates()
    
    if success:
        return {"message": "Exchange rates updated successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to update exchange rates")

@router.get("/convert")
async def convert_currency(amount: float, from_currency: str, to_currency: str, request: Request):
    """Convert amount between currencies"""
    db = get_db(request)
    currency_service = CurrencyService(db)
    
    try:
        converted_amount = await currency_service.convert(amount, from_currency, to_currency)
        return {
            "amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "converted_amount": converted_amount,
            "formatted": currency_service.format_currency(converted_amount, to_currency)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
