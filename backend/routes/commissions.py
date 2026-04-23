from fastapi import APIRouter, HTTPException, Request
from models.commission import Commission, CommissionCreate, CommissionRule, CommissionRuleCreate, CommissionPayout
from utils.helpers import serialize_doc, deserialize_doc
from services.audit_log_service import AuditLogService
from middleware.auth import get_current_user
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/commissions", tags=["commissions"])

def get_db(request: Request):
    return request.app.state.db

# Commission Rules
@router.post("/rules", response_model=CommissionRule)
async def create_commission_rule(rule_create: CommissionRuleCreate, request: Request):
    """Create a new commission rule"""
    db = get_db(request)
    user = await get_current_user(request)
    
    rule = CommissionRule(**rule_create.model_dump())
    rule_doc = serialize_doc(rule.model_dump())
    
    await db.commission_rules.insert_one(rule_doc)
    
    return rule

@router.get("/rules", response_model=List[CommissionRule])
async def get_commission_rules(
    request: Request,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    is_active: bool = True
):
    """Get all commission rules"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    if project_id:
        query['$or'] = [
            {'project_id': project_id},
            {'project_id': None}  # Also include global rules
        ]
    
    query['is_active'] = is_active
    
    rules = await db.commission_rules.find(query, {"_id": 0}).sort('priority', -1).to_list(100)
    
    for rule in rules:
        deserialize_doc(rule)
    
    return [CommissionRule(**r) for r in rules]

# Commissions
@router.post("/", response_model=Commission)
async def create_commission(commission_create: CommissionCreate, request: Request):
    """Create a commission (auto-calculate based on rules)"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get booking
    booking_doc = await db.bookings.find_one({'id': commission_create.booking_id, 'deleted_at': None}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get property
    property_doc = await db.properties.find_one({'id': booking_doc['property_id']}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Get staff
    staff_doc = await db.users.find_one({'id': commission_create.staff_id}, {"_id": 0})
    if not staff_doc:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Find applicable commission rule
    rules = await db.commission_rules.find({
        'tenant_id': booking_doc['tenant_id'],
        'is_active': True,
        '$or': [
            {'project_id': booking_doc['project_id']},
            {'project_id': None}
        ]
    }, {"_id": 0}).sort('priority', -1).to_list(100)
    
    applicable_rule = None
    for rule in rules:
        # Check role
        if rule.get('role_id') and rule['role_id'] != staff_doc['role_id']:
            continue
        
        # Check property value range
        if rule.get('min_property_value') and property_doc['price'] < rule['min_property_value']:
            continue
        if rule.get('max_property_value') and property_doc['price'] > rule['max_property_value']:
            continue
        
        # Check property type
        if rule.get('property_type_id') and property_doc['property_type_id'] != rule['property_type_id']:
            continue
        
        applicable_rule = rule
        break
    
    if not applicable_rule:
        raise HTTPException(status_code=400, detail="No applicable commission rule found")
    
    # Calculate commission
    property_value = property_doc['price']
    commission_amount = 0.0
    commission_percentage = None
    
    if applicable_rule['commission_type'] == 'percentage':
        commission_percentage = applicable_rule['commission_value']
        commission_amount = property_value * (commission_percentage / 100)
    else:  # flat_amount
        commission_amount = applicable_rule['commission_value']
    
    # Create commission
    commission = Commission(
        tenant_id=booking_doc['tenant_id'],
        project_id=booking_doc['project_id'],
        property_id=booking_doc['property_id'],
        booking_id=commission_create.booking_id,
        staff_id=commission_create.staff_id,
        staff_name=staff_doc['name'],
        property_value=property_value,
        commission_rule_id=applicable_rule['id'],
        commission_type=applicable_rule['commission_type'],
        commission_percentage=commission_percentage,
        commission_amount=commission_amount,
        currency_id=property_doc['currency_id'],
        notes=commission_create.notes
    )
    
    commission_doc = serialize_doc(commission.model_dump())
    await db.commissions.insert_one(commission_doc)
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Commission",
        auditable_id=commission.id,
        event="created",
        module="commission",
        user_id=user.get('user_id'),
        new_values=commission_doc,
        tenant_id=booking_doc['tenant_id'],
        project_id=booking_doc['project_id'],
        ip_address=request.client.host
    )
    
    return commission

@router.get("/", response_model=List[Commission])
async def get_commissions(
    request: Request,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all commissions with filters"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    # If staff, show only their commissions
    if user.get('role') == 'staff':
        query['staff_id'] = user.get('user_id')
    elif staff_id:
        query['staff_id'] = staff_id
    
    if project_id:
        query['project_id'] = project_id
    
    if status:
        query['status'] = status
    
    commissions = await db.commissions.find(query, {"_id": 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    for comm in commissions:
        deserialize_doc(comm)
    
    return [Commission(**c) for c in commissions]

@router.get("/{commission_id}", response_model=Commission)
async def get_commission(commission_id: str, request: Request):
    """Get commission by ID"""
    db = get_db(request)
    
    commission_doc = await db.commissions.find_one({'id': commission_id}, {"_id": 0})
    if not commission_doc:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    commission_doc = deserialize_doc(commission_doc)
    return Commission(**commission_doc)

@router.post("/{commission_id}/approve")
async def approve_commission(commission_id: str, request: Request):
    """Approve a commission"""
    db = get_db(request)
    user = await get_current_user(request)
    
    commission = await db.commissions.find_one({'id': commission_id}, {"_id": 0})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    if commission['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Commission is not pending")
    
    await db.commissions.update_one(
        {'id': commission_id},
        {'$set': {
            'status': 'approved',
            'approved_by': user.get('user_id'),
            'approved_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Commission approved successfully"}

@router.post("/{commission_id}/payout")
async def payout_commission(commission_id: str, payout: CommissionPayout, request: Request):
    """Mark commission as paid"""
    db = get_db(request)
    user = await get_current_user(request)
    
    commission = await db.commissions.find_one({'id': commission_id}, {"_id": 0})
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    
    if commission['status'] not in ['pending', 'approved']:
        raise HTTPException(status_code=400, detail="Commission cannot be paid")
    
    await db.commissions.update_one(
        {'id': commission_id},
        {'$set': {
            'status': 'paid',
            'payment_date': datetime.now(timezone.utc).isoformat(),
            'payment_mode': payout.payment_mode,
            'transaction_reference': payout.transaction_reference,
            'notes': payout.notes,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Commission paid successfully"}

@router.get("/stats/summary")
async def get_commission_stats(
    request: Request,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    staff_id: Optional[str] = None
):
    """Get commission statistics"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {}
    
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    if user.get('role') == 'staff':
        query['staff_id'] = user.get('user_id')
    elif staff_id:
        query['staff_id'] = staff_id
    
    if project_id:
        query['project_id'] = project_id
    
    # Total commissions
    pipeline = [
        {'$match': query},
        {'$group': {
            '_id': '$status',
            'count': {'$sum': 1},
            'total_amount': {'$sum': '$commission_amount'}
        }}
    ]
    
    stats = await db.commissions.aggregate(pipeline).to_list(100)
    
    result = {
        'pending': {'count': 0, 'amount': 0},
        'approved': {'count': 0, 'amount': 0},
        'paid': {'count': 0, 'amount': 0},
        'total': {'count': 0, 'amount': 0}
    }
    
    for stat in stats:
        status = stat['_id']
        result[status] = {
            'count': stat['count'],
            'amount': stat['total_amount']
        }
        result['total']['count'] += stat['count']
        result['total']['amount'] += stat['total_amount']
    
    return result
