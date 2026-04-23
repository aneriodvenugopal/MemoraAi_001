"""
PayU Payment Gateway Integration
For Indian Real Estate payments (UPI, Cards, NetBanking)
"""

import os
import hashlib
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Depends
from middleware.auth import get_current_user

router = APIRouter(prefix="/payu", tags=["PayU Payments"])

# PayU Configuration
PAYU_MERCHANT_KEY = os.getenv('PAYU_MERCHANT_KEY', 'ZWeCMxqQ')
PAYU_MERCHANT_SALT = os.getenv('PAYU_MERCHANT_SALT', '')
PAYU_MERCHANT_ID = os.getenv('PAYU_MERCHANT_ID', '5087302')
PAYU_MODE = os.getenv('PAYU_MODE', 'live')  # 'test' or 'live'

# PayU URLs
PAYU_TEST_URL = "https://test.payu.in/_payment"
PAYU_LIVE_URL = "https://secure.payu.in/_payment"


def get_payu_url():
    """Get PayU payment URL based on mode"""
    return PAYU_LIVE_URL if PAYU_MODE == 'live' else PAYU_TEST_URL


def generate_hash(params: Dict[str, str], salt: str) -> str:
    """
    Generate PayU hash for transaction verification
    Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    """
    hash_string = (
        f"{params['key']}|{params['txnid']}|{params['amount']}|"
        f"{params['productinfo']}|{params['firstname']}|{params['email']}|"
        f"{params.get('udf1', '')}|{params.get('udf2', '')}|{params.get('udf3', '')}|"
        f"{params.get('udf4', '')}|{params.get('udf5', '')}||||||{salt}"
    )
    return hashlib.sha512(hash_string.encode('utf-8')).hexdigest().lower()


def verify_hash(params: Dict[str, str], received_hash: str, salt: str) -> bool:
    """
    Verify PayU response hash
    Reverse hash sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    """
    hash_string = (
        f"{salt}|{params.get('status', '')}||||||"
        f"{params.get('udf5', '')}|{params.get('udf4', '')}|{params.get('udf3', '')}|"
        f"{params.get('udf2', '')}|{params.get('udf1', '')}|{params.get('email', '')}|"
        f"{params.get('firstname', '')}|{params.get('productinfo', '')}|"
        f"{params.get('amount', '')}|{params.get('txnid', '')}|{params['key']}"
    )
    calculated_hash = hashlib.sha512(hash_string.encode('utf-8')).hexdigest().lower()
    return calculated_hash == received_hash.lower()


@router.post("/initiate-payment")
async def initiate_payment(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Initiate a PayU payment
    
    Body: {
        "amount": 10000,
        "productinfo": "Plot Booking - ABC Layout",
        "firstname": "John",
        "email": "john@example.com",
        "phone": "9876543210",
        "booking_id": "booking-uuid",
        "property_id": "property-uuid",
        "payment_type": "booking" | "emi" | "registration"
    }
    """
    db = request.app.state.db
    body = await request.json()
    
    # Get tenant settings for PayU credentials
    tenant_id = current_user.get('tenant_id')
    tenant = None
    merchant_key = PAYU_MERCHANT_KEY
    merchant_salt = PAYU_MERCHANT_SALT
    
    if tenant_id:
        tenant = await db.tenants.find_one({'id': tenant_id}, {"_id": 0})
        if tenant and tenant.get('settings', {}).get('payu_enabled'):
            merchant_key = tenant['settings'].get('payu_merchant_key', PAYU_MERCHANT_KEY)
            merchant_salt = tenant['settings'].get('payu_merchant_salt', PAYU_MERCHANT_SALT)
    
    if not merchant_salt:
        raise HTTPException(status_code=400, detail="PayU merchant salt not configured")
    
    # Generate unique transaction ID
    txnid = f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:8].upper()}"
    
    # Prepare payment parameters
    amount = str(body.get('amount', 0))
    productinfo = body.get('productinfo', 'Payment')
    firstname = body.get('firstname', 'Customer')
    email = body.get('email', 'customer@example.com')
    phone = body.get('phone', '')
    
    # UDF fields for tracking
    udf1 = body.get('booking_id', '')
    udf2 = body.get('property_id', '')
    udf3 = body.get('payment_type', 'payment')
    udf4 = tenant_id or ''
    udf5 = current_user.get('user_id', '')
    
    # Generate hash
    params = {
        'key': merchant_key,
        'txnid': txnid,
        'amount': amount,
        'productinfo': productinfo,
        'firstname': firstname,
        'email': email,
        'udf1': udf1,
        'udf2': udf2,
        'udf3': udf3,
        'udf4': udf4,
        'udf5': udf5
    }
    
    payment_hash = generate_hash(params, merchant_salt)
    
    # Success and failure URLs
    base_url = os.getenv('FRONTEND_URL', request.headers.get('origin', ''))
    surl = f"{base_url}/payment-success"
    furl = f"{base_url}/payment-failure"
    
    # Store payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "txnid": txnid,
        "amount": float(amount),
        "productinfo": productinfo,
        "firstname": firstname,
        "email": email,
        "phone": phone,
        "booking_id": udf1,
        "property_id": udf2,
        "payment_type": udf3,
        "tenant_id": udf4,
        "user_id": udf5,
        "status": "initiated",
        "gateway": "payu",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payu_transactions.insert_one(payment_record)
    
    return {
        "success": True,
        "payment_url": get_payu_url(),
        "params": {
            "key": merchant_key,
            "txnid": txnid,
            "amount": amount,
            "productinfo": productinfo,
            "firstname": firstname,
            "email": email,
            "phone": phone,
            "surl": surl,
            "furl": furl,
            "hash": payment_hash,
            "udf1": udf1,
            "udf2": udf2,
            "udf3": udf3,
            "udf4": udf4,
            "udf5": udf5
        }
    }


@router.post("/callback")
async def payment_callback(request: Request):
    """
    PayU payment callback (success/failure)
    This endpoint receives POST data from PayU after payment
    """
    db = request.app.state.db
    
    # Parse form data
    form_data = await request.form()
    params = dict(form_data)
    
    print(f"\n{'='*60}")
    print(f"💳 PAYU CALLBACK RECEIVED")
    print(f"{'='*60}")
    print(f"Transaction ID: {params.get('txnid')}")
    print(f"Status: {params.get('status')}")
    print(f"Amount: {params.get('amount')}")
    print(f"{'='*60}\n")
    
    txnid = params.get('txnid')
    status = params.get('status')
    payu_id = params.get('mihpayid')
    
    # Get stored transaction
    transaction = await db.payu_transactions.find_one({'txnid': txnid}, {"_id": 0})
    
    if not transaction:
        return {"success": False, "error": "Transaction not found"}
    
    # Get merchant salt for verification
    tenant_id = transaction.get('tenant_id')
    merchant_salt = PAYU_MERCHANT_SALT
    
    if tenant_id:
        tenant = await db.tenants.find_one({'id': tenant_id}, {"_id": 0})
        if tenant and tenant.get('settings', {}).get('payu_merchant_salt'):
            merchant_salt = tenant['settings']['payu_merchant_salt']
    
    # Verify hash (optional but recommended)
    received_hash = params.get('hash', '')
    # hash_valid = verify_hash(params, received_hash, merchant_salt)
    
    # Update transaction status
    update_data = {
        "status": status.lower() if status else "unknown",
        "payu_id": payu_id,
        "mode": params.get('mode'),
        "unmappedstatus": params.get('unmappedstatus'),
        "error_message": params.get('error_Message'),
        "bank_ref_num": params.get('bank_ref_num'),
        "bankcode": params.get('bankcode'),
        "cardnum": params.get('cardnum'),
        "name_on_card": params.get('name_on_card'),
        "card_type": params.get('card_type'),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "callback_response": params
    }
    
    await db.payu_transactions.update_one(
        {'txnid': txnid},
        {'$set': update_data}
    )
    
    # If payment successful, update booking/EMI status
    if status and status.lower() == 'success':
        booking_id = transaction.get('booking_id')
        payment_type = transaction.get('payment_type')
        
        if booking_id and payment_type == 'booking':
            # Update booking payment status
            await db.bookings.update_one(
                {'id': booking_id},
                {'$set': {
                    'payment_status': 'paid',
                    'payment_date': datetime.now(timezone.utc).isoformat(),
                    'payment_reference': payu_id
                }}
            )
        
        # Create payment record
        payment_record = {
            "id": str(uuid.uuid4()),
            "booking_id": booking_id,
            "property_id": transaction.get('property_id'),
            "tenant_id": tenant_id,
            "amount": transaction.get('amount'),
            "payment_type": payment_type,
            "payment_method": "payu",
            "transaction_id": txnid,
            "payu_id": payu_id,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payments.insert_one(payment_record)
    
    return {
        "success": status and status.lower() == 'success',
        "txnid": txnid,
        "status": status,
        "payu_id": payu_id
    }


@router.get("/transaction/{txnid}")
async def get_transaction(
    txnid: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction details by transaction ID"""
    db = request.app.state.db
    
    transaction = await db.payu_transactions.find_one({'txnid': txnid}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return transaction


@router.get("/transactions")
async def get_transactions(
    request: Request,
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50
):
    """Get all transactions for current tenant"""
    db = request.app.state.db
    
    tenant_id = current_user.get('tenant_id')
    
    query = {}
    if tenant_id:
        query['tenant_id'] = tenant_id
    if status:
        query['status'] = status
    
    transactions = await db.payu_transactions.find(
        query, {"_id": 0}
    ).sort('created_at', -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions}
