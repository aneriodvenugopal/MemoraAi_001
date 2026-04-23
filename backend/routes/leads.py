from fastapi import APIRouter, HTTPException, Request, Depends
from models.lead import Lead, LeadCreate, LeadUpdate, LeadFollowup, LeadFollowupCreate, LeadConvert
from models.user import User, UserCreate
from models.role import Role
from utils.helpers import serialize_doc, deserialize_doc
from services.audit_log_service import AuditLogService
from middleware.auth import get_current_user
from middleware.usage_limits import check_lead_limit
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/leads", tags=["leads"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/", response_model=Lead)
async def create_lead(
    lead_create: LeadCreate, 
    request: Request,
    user: dict = Depends(check_lead_limit)  # Enforce monthly lead limit
):
    """Create a new lead"""
    db = get_db(request)
    
    # Check if lead with same phone already exists in tenant
    existing = await db.leads.find_one({
        'tenant_id': lead_create.tenant_id,
        'phone': lead_create.phone,
        'deleted_at': None
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Lead with this phone number already exists")
    
    # Create lead
    lead_data = lead_create.model_dump()
    
    # Set default status if not provided
    if not lead_data.get('status_id'):
        new_status = await db.master_categories.find_one({
            'slug': 'new',
            'type': 'lead_status',
            'tenant_id': lead_create.tenant_id
        }, {"_id": 0})
        if new_status:
            lead_data['status_id'] = new_status['id']
    
    if lead_data.get('assigned_to'):
        lead_data['assigned_at'] = datetime.now(timezone.utc)
    
    lead = Lead(**lead_data)
    lead_doc = serialize_doc(lead.model_dump())
    
    await db.leads.insert_one(lead_doc)
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Lead",
        auditable_id=lead.id,
        event="created",
        module="lead",
        user_id=user.get('user_id'),
        new_values=lead_doc,
        tenant_id=lead.tenant_id,
        project_id=lead.project_id,
        ip_address=request.client.host
    )
    
    # Create notification for tenant admins about new lead
    import uuid as uuid_lib
    
    # Fetch role IDs first to avoid N+1 query
    tenant_admin_role = await db.roles.find_one({'slug': 'tenant_admin'}, {'_id': 0, 'id': 1})
    super_admin_role = await db.roles.find_one({'slug': 'super_admin'}, {'_id': 0, 'id': 1})
    role_ids = []
    if tenant_admin_role:
        role_ids.append(tenant_admin_role['id'])
    if super_admin_role:
        role_ids.append(super_admin_role['id'])
    
    tenant_admins = await db.users.find({
        'tenant_id': lead.tenant_id,
        'role_id': {'$in': role_ids},
        'is_active': True,
        'deleted_at': None
    }, {'_id': 0}).to_list(length=100)
    
    # Get project name if available
    project_name = "property"
    if lead.project_id:
        project = await db.projects.find_one({'id': lead.project_id}, {'_id': 0})
        if project:
            project_name = project.get('name', 'property')
    
    # Create notification for each admin
    for admin in tenant_admins:
        notification_doc = {
            'id': str(uuid_lib.uuid4()),
            'user_id': admin['id'],
            'tenant_id': lead.tenant_id,
            'title': '👤 New Property Interest',
            'message': f'{lead.name} ({lead.phone}) showed interest in {project_name}',
            'type': 'lead',
            'priority': 'high',
            'read': False,
            'action_url': '/leads',
            'action_label': 'View Lead',
            'metadata': {
                'lead_id': lead.id,
                'lead_name': lead.name,
                'lead_phone': lead.phone,
                'project_id': lead.project_id,
                'project_name': project_name
            },
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        }
        await db.in_app_notifications.insert_one(notification_doc)
    
    # If lead is assigned to staff, notify them too
    if lead.assigned_to:
        staff_user = await db.users.find_one({'id': lead.assigned_to}, {'_id': 0})
        if staff_user:
            notification_doc = {
                'id': str(uuid_lib.uuid4()),
                'user_id': staff_user['id'],
                'tenant_id': lead.tenant_id,
                'title': '📋 New Lead Assigned',
                'message': f'Lead "{lead.name}" has been assigned to you for follow-up',
                'type': 'lead',
                'priority': 'normal',
                'read': False,
                'action_url': '/leads',
                'action_label': 'View Lead',
                'metadata': {
                    'lead_id': lead.id,
                    'lead_name': lead.name,
                    'lead_phone': lead.phone
                },
                'created_at': datetime.now(timezone.utc).isoformat(),
                'read_at': None
            }
            await db.in_app_notifications.insert_one(notification_doc)
    
    return lead

@router.get("/", response_model=List[Lead])
async def get_leads(
    request: Request,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    source_id: Optional[str] = None,
    is_converted: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get all leads with filters"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {'deleted_at': None}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    # If staff, show only assigned leads
    if user.get('role') == 'staff':
        query['assigned_to'] = user.get('user_id')
    elif assigned_to:
        query['assigned_to'] = assigned_to
    
    if project_id:
        query['project_id'] = project_id
    
    if status_id:
        query['status_id'] = status_id
    
    if source_id:
        query['source_id'] = source_id
    
    if is_converted is not None:
        query['is_converted'] = is_converted
    
    leads = await db.leads.find(query, {"_id": 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    
    # Normalize legacy field names for backward compatibility
    normalized_leads = []
    for lead in leads:
        # Handle legacy buyer_name/buyer_phone fields
        if not lead.get('name') and lead.get('buyer_name'):
            lead['name'] = lead['buyer_name']
        if not lead.get('phone') and lead.get('buyer_phone'):
            lead['phone'] = lead['buyer_phone']
        # Provide defaults if still missing
        if not lead.get('name'):
            lead['name'] = 'Unknown'
        if not lead.get('phone'):
            lead['phone'] = 'N/A'
        normalized_leads.append(lead)
    
    return [Lead(**l) for l in normalized_leads]

@router.get("/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, request: Request):
    """Get lead by ID"""
    db = get_db(request)
    
    lead_doc = await db.leads.find_one({'id': lead_id, 'deleted_at': None}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead_doc = deserialize_doc(lead_doc)
    return Lead(**lead_doc)

@router.get("/{lead_id}/details")
async def get_lead_details(lead_id: str, request: Request):
    """Get lead with all related information (assigned user, project, follow-ups)"""
    db = get_db(request)
    
    lead_doc = await db.leads.find_one({'id': lead_id, 'deleted_at': None}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead_doc = deserialize_doc(lead_doc)
    
    # Get assigned user info
    assigned_user = None
    if lead_doc.get('assigned_to'):
        user_doc = await db.users.find_one({'id': lead_doc['assigned_to']}, {"_id": 0, "password": 0, "otp": 0})
        if user_doc:
            assigned_user = {
                'id': user_doc['id'],
                'name': user_doc['name'],
                'phone': user_doc['phone'],
                'email': user_doc.get('email')
            }
    
    # Get project info
    project = None
    if lead_doc.get('project_id'):
        project_doc = await db.projects.find_one({'id': lead_doc['project_id']}, {"_id": 0})
        if project_doc:
            project = {
                'id': project_doc['id'],
                'name': project_doc['name'],
                'city': project_doc['city'],
                'state': project_doc['state']
            }
    
    # Get status info
    status = None
    if lead_doc.get('status_id'):
        status_doc = await db.master_categories.find_one({'id': lead_doc['status_id']}, {"_id": 0})
        if status_doc:
            status = {
                'id': status_doc['id'],
                'name': status_doc['name'],
                'slug': status_doc['slug']
            }
    
    # Get follow-ups
    followups = await db.lead_followups.find(
        {'lead_id': lead_id},
        {"_id": 0}
    ).sort('followup_date', -1).to_list(50)
    
    # Process followups if needed
    # for followup in followups:
    #     deserialize_doc(followup)
    
    return {
        'lead': Lead(**lead_doc),
        'assigned_user': assigned_user,
        'project': project,
        'status': status,
        'followups': followups
    }

@router.put("/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_update: LeadUpdate, request: Request):
    """Update lead"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get existing lead
    existing = await db.leads.find_one({'id': lead_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update lead
    update_data = lead_update.model_dump(exclude_none=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # If assigning to someone for first time, set assigned_at
    if 'assigned_to' in update_data and not existing.get('assigned_at'):
        update_data['assigned_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one(
        {'id': lead_id},
        {'$set': update_data}
    )
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Lead",
        auditable_id=lead_id,
        event="updated",
        module="lead",
        user_id=user.get('user_id'),
        old_values=existing,
        new_values=update_data,
        tenant_id=existing.get('tenant_id'),
        project_id=existing.get('project_id'),
        ip_address=request.client.host
    )
    
    # Get updated lead
    lead_doc = await db.leads.find_one({'id': lead_id}, {"_id": 0})
    lead_doc = deserialize_doc(lead_doc)
    
    return Lead(**lead_doc)

@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, request: Request):
    """Soft delete lead"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get existing lead
    existing = await db.leads.find_one({'id': lead_id, 'deleted_at': None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Soft delete
    await db.leads.update_one(
        {'id': lead_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    # Audit log
    audit_service = AuditLogService(db)
    await audit_service.log(
        auditable_type="Lead",
        auditable_id=lead_id,
        event="deleted",
        module="lead",
        user_id=user.get('user_id'),
        tenant_id=existing.get('tenant_id'),
        project_id=existing.get('project_id'),
        ip_address=request.client.host
    )
    
    return {"message": "Lead deleted successfully"}

# Follow-up routes
@router.post("/followups", response_model=LeadFollowup)
async def create_followup(followup_create: LeadFollowupCreate, request: Request):
    """Create a follow-up for a lead"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get lead
    lead_doc = await db.leads.find_one({'id': followup_create.lead_id, 'deleted_at': None}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Create followup
    followup_data = followup_create.model_dump()
    followup_data['tenant_id'] = lead_doc['tenant_id']
    followup_data['project_id'] = lead_doc.get('project_id')
    
    followup = LeadFollowup(**followup_data)
    followup_doc = serialize_doc(followup.model_dump())
    
    await db.lead_followups.insert_one(followup_doc)
    
    # Update lead's last_followup_date and next_followup_date
    update_data = {
        'last_followup_date': datetime.now(timezone.utc).isoformat(),
        'followup_count': lead_doc.get('followup_count', 0) + 1,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if followup_create.next_followup_date:
        update_data['next_followup_date'] = followup_create.next_followup_date.isoformat()
    
    await db.leads.update_one(
        {'id': followup_create.lead_id},
        {'$set': update_data}
    )
    
    return followup

@router.get("/{lead_id}/followups", response_model=List[LeadFollowup])
async def get_lead_followups(lead_id: str, request: Request):
    """Get all follow-ups for a lead"""
    db = get_db(request)
    
    followups = await db.lead_followups.find(
        {'lead_id': lead_id},
        {"_id": 0}
    ).sort('followup_date', -1).to_list(100)
    
    # Process followups if needed
    # for followup in followups:
    #     deserialize_doc(followup)
    
    return [LeadFollowup(**f) for f in followups]

@router.post("/convert")
async def convert_lead(convert_data: LeadConvert, request: Request):
    """Convert lead to customer"""
    db = get_db(request)
    user = await get_current_user(request)
    
    # Get lead
    lead_doc = await db.leads.find_one({'id': convert_data.lead_id, 'deleted_at': None}, {"_id": 0})
    if not lead_doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead_doc.get('is_converted'):
        raise HTTPException(status_code=400, detail="Lead is already converted")
    
    # Get customer role
    customer_role = await db.roles.find_one({'slug': 'customer'}, {"_id": 0})
    if not customer_role:
        raise HTTPException(status_code=500, detail="Customer role not found")
    
    # Check if user already exists with this phone
    existing_user = await db.users.find_one({'phone': convert_data.customer_phone}, {"_id": 0})
    
    if existing_user:
        customer_id = existing_user['id']
    else:
        # Create customer user
        customer = User(
            phone=convert_data.customer_phone,
            email=convert_data.customer_email,
            name=convert_data.customer_name,
            role_id=customer_role['id'],
            tenant_id=lead_doc['tenant_id']
        )
        customer_doc = serialize_doc(customer.model_dump())
        await db.users.insert_one(customer_doc)
        customer_id = customer.id
    
    # Update lead as converted
    await db.leads.update_one(
        {'id': convert_data.lead_id},
        {'$set': {
            'is_converted': True,
            'converted_to_customer_id': customer_id,
            'converted_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get 'converted' status
    converted_status = await db.master_categories.find_one({'slug': 'converted', 'type': 'lead_status'}, {"_id": 0})
    if converted_status:
        await db.leads.update_one(
            {'id': convert_data.lead_id},
            {'$set': {'status_id': converted_status['id']}}
        )
    
    return {
        "message": "Lead converted to customer successfully",
        "customer_id": customer_id
    }

@router.get("/stats/summary")
async def get_lead_stats(request: Request, tenant_id: Optional[str] = None, project_id: Optional[str] = None):
    """Get lead statistics"""
    db = get_db(request)
    user = await get_current_user(request)
    
    query = {'deleted_at': None}
    
    # If not super admin, filter by tenant
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user.get('tenant_id')
    elif tenant_id:
        query['tenant_id'] = tenant_id
    
    if project_id:
        query['project_id'] = project_id
    
    # Total leads
    total_leads = await db.leads.count_documents(query)
    
    # Converted leads
    query['is_converted'] = True
    converted_leads = await db.leads.count_documents(query)
    
    # Active leads (not converted)
    query['is_converted'] = False
    active_leads = await db.leads.count_documents(query)
    
    # Leads by status
    del query['is_converted']
    pipeline = [
        {'$match': query},
        {'$lookup': {
            'from': 'master_categories',
            'localField': 'status_id',
            'foreignField': 'id',
            'as': 'status_info'
        }},
        {'$unwind': '$status_info'},
        {'$group': {
            '_id': '$status_info.name',
            'count': {'$sum': 1}
        }}
    ]
    
    status_breakdown = await db.leads.aggregate(pipeline).to_list(100)
    
    return {
        'total_leads': total_leads,
        'active_leads': active_leads,
        'converted_leads': converted_leads,
        'conversion_rate': (converted_leads / total_leads * 100) if total_leads > 0 else 0,
        'status_breakdown': status_breakdown
    }



# ============ PUBLIC LEAD API (No Auth Required) ============
# For WhatsApp Automation Integration

from pydantic import BaseModel
from services.whatsapp_agentic.meta_whatsapp_client import meta_whatsapp_client
import uuid


class PublicLeadCreate(BaseModel):
    """Public lead creation - minimal fields"""
    phone: str
    name: str
    tenant_id: str  # Required to associate with correct tenant
    source: Optional[str] = "whatsapp"  # whatsapp, website, manual
    notes: Optional[str] = None
    send_welcome_message: bool = True  # Auto-send WhatsApp welcome message


class PublicLeadSearch(BaseModel):
    """Public lead search"""
    phone: str
    tenant_id: str


@router.post("/public/add", tags=["public"])
async def public_add_lead(
    lead_data: PublicLeadCreate,
    request: Request
):
    """
    PUBLIC API: Add a new lead and optionally send WhatsApp welcome message
    
    No authentication required - for WhatsApp automation integration
    
    Example:
    POST /api/leads/public/add
    {
        "phone": "9949376620",
        "name": "Gopal",
        "tenant_id": "f18f7bd6-3a1f-472d-acf9-c2fb181787e7",
        "send_welcome_message": true
    }
    """
    db = get_db(request)
    
    # Normalize phone number
    phone = ''.join(filter(str.isdigit, lead_data.phone))
    if len(phone) == 10:
        phone = f"91{phone}"
    
    # Check if lead already exists
    existing = await db.leads.find_one({
        'tenant_id': lead_data.tenant_id,
        '$or': [
            {'phone': phone},
            {'phone': lead_data.phone},
            {'phone': phone[-10:]}  # Last 10 digits
        ],
        'deleted_at': None
    }, {"_id": 0})
    
    if existing:
        # Lead exists - return existing data
        return {
            "success": True,
            "message": "Lead already exists",
            "lead": {
                "id": existing.get('id'),
                "name": existing.get('name'),
                "phone": existing.get('phone'),
                "created_at": existing.get('created_at')
            },
            "is_new": False,
            "whatsapp_sent": False
        }
    
    # Get tenant info for welcome message
    tenant = await db.tenants.find_one(
        {'id': lead_data.tenant_id, 'deleted_at': None},
        {'_id': 0, 'id': 1, 'name': 1, 'company_name': 1}
    )
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Create new lead
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    new_lead = {
        'id': lead_id,
        'tenant_id': lead_data.tenant_id,
        'name': lead_data.name,
        'phone': phone,
        'source_id': None,
        'status_id': None,
        'notes': lead_data.notes or f"Added via {lead_data.source}",
        'tags': [lead_data.source] if lead_data.source else [],
        'is_active': True,
        'is_converted': False,
        'followup_count': 0,
        'created_at': now,
        'updated_at': now,
        'deleted_at': None
    }
    
    # Set default status
    new_status = await db.master_categories.find_one({
        'slug': 'new',
        'type': 'lead_status',
        'tenant_id': lead_data.tenant_id
    }, {"_id": 0})
    if new_status:
        new_lead['status_id'] = new_status['id']
    
    await db.leads.insert_one(new_lead)
    
    # Send WhatsApp welcome message if enabled
    whatsapp_result = None
    if lead_data.send_welcome_message:
        company_name = tenant.get('company_name') or tenant.get('name', 'RealApex')
        welcome_message = f"""🏠 *Welcome to {company_name}!*

Hi {lead_data.name}! 👋

Thank you for your interest in our properties. 

How can we help you today?

1️⃣ Looking to *Buy* a property
2️⃣ Want to *Sell* your property  
3️⃣ Looking for *Rental* options
4️⃣ Need *Investment* advice

Just reply with the number or type your query!

_Powered by RealApex_"""
        
        try:
            whatsapp_result = await meta_whatsapp_client.send_text_message(
                phone=phone,
                message=welcome_message
            )
            print(f"📤 WhatsApp welcome sent to {phone}: {whatsapp_result.get('success')}")
        except Exception as e:
            print(f"⚠️ WhatsApp send failed: {e}")
            whatsapp_result = {"success": False, "error": str(e)}
    
    return {
        "success": True,
        "message": "Lead created successfully",
        "lead": {
            "id": lead_id,
            "name": lead_data.name,
            "phone": phone,
            "tenant_id": lead_data.tenant_id,
            "created_at": now.isoformat()
        },
        "is_new": True,
        "whatsapp_sent": whatsapp_result.get('success', False) if whatsapp_result else False,
        "whatsapp_message_id": whatsapp_result.get('message_id') if whatsapp_result else None
    }


@router.get("/public/search/{tenant_id}/{phone}", tags=["public"])
async def public_search_lead(
    tenant_id: str,
    phone: str,
    request: Request
):
    """
    PUBLIC API: Search for a lead by phone number
    
    No authentication required
    
    Example:
    GET /api/leads/public/search/f18f7bd6-3a1f-472d-acf9-c2fb181787e7/9949376620
    """
    db = get_db(request)
    
    # Normalize phone
    phone_normalized = ''.join(filter(str.isdigit, phone))
    if len(phone_normalized) == 10:
        phone_with_country = f"91{phone_normalized}"
    else:
        phone_with_country = phone_normalized
    
    # Search lead
    lead = await db.leads.find_one({
        'tenant_id': tenant_id,
        '$or': [
            {'phone': phone},
            {'phone': phone_normalized},
            {'phone': phone_with_country},
            {'phone': {'$regex': f'{phone_normalized[-10:]}$'}}
        ],
        'deleted_at': None
    }, {"_id": 0})
    
    if not lead:
        return {
            "success": False,
            "message": "Lead not found",
            "lead": None
        }
    
    return {
        "success": True,
        "message": "Lead found",
        "lead": {
            "id": lead.get('id'),
            "name": lead.get('name'),
            "phone": lead.get('phone'),
            "status_id": lead.get('status_id'),
            "is_converted": lead.get('is_converted', False),
            "created_at": lead.get('created_at'),
            "notes": lead.get('notes')
        }
    }


@router.post("/public/send-whatsapp", tags=["public"])
async def public_send_whatsapp(
    phone: str,
    message: str,
    tenant_id: Optional[str] = None,
    request: Request = None
):
    """
    PUBLIC API: Send WhatsApp message to any number
    
    No authentication required - for automation
    
    Example:
    POST /api/leads/public/send-whatsapp?phone=9949376620&message=Hello!
    """
    # Normalize phone
    phone_normalized = ''.join(filter(str.isdigit, phone))
    if len(phone_normalized) == 10:
        phone_normalized = f"91{phone_normalized}"
    
    try:
        result = await meta_whatsapp_client.send_text_message(
            phone=phone_normalized,
            message=message
        )
        
        return {
            "success": result.get('success', False),
            "phone": phone_normalized,
            "message_id": result.get('message_id'),
            "error": result.get('error')
        }
    except Exception as e:
        return {
            "success": False,
            "phone": phone_normalized,
            "error": str(e)
        }


@router.get("/public/tenant/{phone}", tags=["public"])
async def get_tenant_by_phone(
    phone: str,
    request: Request
):
    """
    PUBLIC API: Get tenant ID by admin phone number
    
    Useful when you know the agent's phone but need tenant_id
    
    Example:
    GET /api/leads/public/tenant/9908290239
    """
    db = get_db(request)
    
    # Normalize phone
    phone_normalized = ''.join(filter(str.isdigit, phone))
    
    # Find user by phone
    user = await db.users.find_one({
        '$or': [
            {'phone': phone},
            {'phone': phone_normalized},
            {'phone': f"91{phone_normalized}" if len(phone_normalized) == 10 else phone_normalized}
        ],
        'deleted_at': None
    }, {"_id": 0, 'tenant_id': 1, 'name': 1, 'phone': 1, 'role': 1})
    
    if not user:
        return {
            "success": False,
            "message": "User not found",
            "tenant_id": None
        }
    
    # Get tenant info
    tenant = await db.tenants.find_one(
        {'id': user.get('tenant_id'), 'deleted_at': None},
        {'_id': 0, 'id': 1, 'name': 1, 'company_name': 1}
    )
    
    return {
        "success": True,
        "tenant_id": user.get('tenant_id'),
        "tenant_name": tenant.get('company_name') or tenant.get('name') if tenant else None,
        "user_name": user.get('name'),
        "user_role": user.get('role')
    }
