from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/marketing-dashboard", tags=["Marketing Dashboard"])

def get_db(request: Request):
    return request.app.mongodb

async def get_current_user_from_request(request: Request):
    """Extract user from JWT token"""
    from middleware.auth import decode_jwt
    
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(' ')[1]
    try:
        payload = decode_jwt(token)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_marketing_agent(request: Request):
    """Middleware to check if user is marketing agent or staff"""
    user = await get_current_user_from_request(request)
    db = get_db(request)
    
    # Get user details
    user_doc = await db.users.find_one({'id': user['user_id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role
    role = await db.roles.find_one({'id': user_doc['role_id']}, {"_id": 0})
    if not role or role['slug'] not in ['marketing_agent', 'staff', 'tenant_admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Access denied. Marketing Agent role required.")
    
    return {
        **user,
        'role_slug': role['slug'],
        'assigned_projects': user_doc.get('assigned_projects', []),
        'user_doc': user_doc
    }

@router.get("/overview")
async def get_marketing_dashboard(
    request: Request,
    user: dict = Depends(require_marketing_agent)
):
    """Get marketing agent dashboard overview"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Get assigned leads (either by user_id or project)
    if user['role_slug'] in ['marketing_agent', 'staff']:
        # For marketing agents, show leads assigned to them
        assigned_leads = await db.leads.find(
            {'assigned_to': user_id, 'deleted_at': None},
            {"_id": 0}
        ).to_list(length=10000)
        
        # Also get leads from assigned projects
        assigned_projects = user.get('assigned_projects', [])
        if assigned_projects:
            project_leads = await db.leads.find(
                {
                    'project_id': {'$in': assigned_projects},
                    'deleted_at': None
                },
                {"_id": 0}
            ).to_list(length=10000)
            
            # Merge unique leads
            all_lead_ids = set([l['id'] for l in assigned_leads])
            for lead in project_leads:
                if lead['id'] not in all_lead_ids:
                    assigned_leads.append(lead)
    else:
        # Admin sees all tenant leads
        assigned_leads = await db.leads.find(
            {'tenant_id': user['tenant_id'], 'deleted_at': None},
            {"_id": 0}
        ).to_list(length=10000)
    
    # Count by status
    leads_by_status = {}
    for lead in assigned_leads:
        status_id = lead.get('status_id', 'unknown')
        # Get status name
        status_cat = await db.master_categories.find_one({'id': status_id}, {"_id": 0})
        status_name = status_cat['name'] if status_cat else 'Unknown'
        leads_by_status[status_name] = leads_by_status.get(status_name, 0) + 1
    
    # Get commissions for this agent
    commissions = await db.commissions.find(
        {'staff_id': user_id, 'deleted_at': None},
        {"_id": 0}
    ).to_list(length=10000)
    
    total_commission = sum(c.get('commission_amount', 0) for c in commissions)
    paid_commissions = [c for c in commissions if c.get('status') == 'paid']
    pending_commissions = [c for c in commissions if c.get('status') == 'pending']
    
    total_paid = sum(c.get('commission_amount', 0) for c in paid_commissions)
    total_pending = sum(c.get('commission_amount', 0) for c in pending_commissions)
    
    # Get bookings related to agent's leads
    lead_ids = [l['id'] for l in assigned_leads]
    bookings = await db.bookings.find(
        {'lead_id': {'$in': lead_ids}, 'deleted_at': None},
        {"_id": 0}
    ).to_list(length=10000)
    
    # Get payment followups (bookings with pending payments)
    payment_followups = []
    for booking in bookings:
        if booking.get('balance_amount', 0) > 0:
            # Check if payment is overdue
            next_payment_date = booking.get('next_payment_date')
            if next_payment_date:
                if isinstance(next_payment_date, str):
                    next_payment_date = datetime.fromisoformat(next_payment_date.replace('Z', '+00:00'))
                
                is_overdue = next_payment_date < datetime.now(timezone.utc)
                payment_followups.append({
                    **booking,
                    'is_overdue': is_overdue
                })
    
    # Get notifications for this user
    notifications = await db.in_app_notifications.find(
        {'user_id': user_id, 'read': False},
        {"_id": 0}
    ).sort('created_at', -1).limit(10).to_list(length=10)
    
    # Recent activities (leads created/updated in last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_leads = [l for l in assigned_leads if datetime.fromisoformat(l['created_at'].replace('Z', '+00:00')) > seven_days_ago]
    
    return {
        "success": True,
        "overview": {
            "total_leads": len(assigned_leads),
            "leads_by_status": leads_by_status,
            "total_bookings": len(bookings),
            "total_commission": total_commission,
            "paid_commission": total_paid,
            "pending_commission": total_pending,
            "payment_followups": len(payment_followups),
            "unread_notifications": len(notifications),
            "recent_leads_count": len(recent_leads)
        },
        "recent_leads": recent_leads[:10],
        "payment_followups": payment_followups[:10],
        "notifications": notifications,
        "user_role": user['role_slug']
    }

@router.get("/my-leads")
async def get_agent_leads(
    request: Request,
    status: Optional[str] = None,
    user: dict = Depends(require_marketing_agent)
):
    """Get leads assigned to marketing agent"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Build filter
    lead_filter = {'assigned_to': user_id, 'deleted_at': None}
    
    if status:
        # Get status ID from slug
        status_cat = await db.master_categories.find_one({'slug': status, 'type': 'lead_status'}, {"_id": 0})
        if status_cat:
            lead_filter['status_id'] = status_cat['id']
    
    leads = await db.leads.find(lead_filter, {"_id": 0}).sort('created_at', -1).to_list(length=1000)
    
    # Enrich with project names and status names
    for lead in leads:
        if lead.get('project_id'):
            project = await db.projects.find_one({'id': lead['project_id']}, {"_id": 0, 'name': 1})
            lead['project_name'] = project.get('name') if project else None
        
        if lead.get('status_id'):
            status_cat = await db.master_categories.find_one({'id': lead['status_id']}, {"_id": 0})
            lead['status_name'] = status_cat.get('name') if status_cat else 'Unknown'
    
    return {
        "success": True,
        "leads": leads,
        "total": len(leads)
    }

@router.get("/my-commissions")
async def get_agent_commissions(
    request: Request,
    status: Optional[str] = None,
    user: dict = Depends(require_marketing_agent)
):
    """Get commissions for marketing agent"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Build filter
    commission_filter = {'staff_id': user_id, 'deleted_at': None}
    if status:
        commission_filter['status'] = status
    
    commissions = await db.commissions.find(commission_filter, {"_id": 0}).sort('created_at', -1).to_list(length=1000)
    
    # Enrich with booking and project details
    for commission in commissions:
        if commission.get('booking_id'):
            booking = await db.bookings.find_one({'id': commission['booking_id']}, {"_id": 0})
            if booking:
                commission['booking_details'] = booking
                
                # Get property
                if booking.get('property_id'):
                    prop = await db.properties.find_one(
                        {'id': booking['property_id']},
                        {"_id": 0, 'plot_number': 1, 'project_id': 1}
                    )
                    if prop:
                        commission['property_name'] = prop.get('plot_number')
                        
                        # Get project
                        if prop.get('project_id'):
                            project = await db.projects.find_one(
                                {'id': prop['project_id']},
                                {"_id": 0, 'name': 1}
                            )
                            commission['project_name'] = project.get('name') if project else None
    
    # Calculate totals
    total_amount = sum(c.get('commission_amount', 0) for c in commissions)
    
    return {
        "success": True,
        "commissions": commissions,
        "total": len(commissions),
        "total_amount": total_amount
    }

@router.get("/payment-followups")
async def get_payment_followups(
    request: Request,
    overdue_only: bool = False,
    user: dict = Depends(require_marketing_agent)
):
    """Get bookings requiring payment followup"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Get agent's leads
    assigned_leads = await db.leads.find(
        {'assigned_to': user_id, 'deleted_at': None},
        {"_id": 0, 'id': 1}
    ).to_list(length=10000)
    lead_ids = [l['id'] for l in assigned_leads]
    
    # Get bookings with pending payments
    bookings = await db.bookings.find(
        {
            'lead_id': {'$in': lead_ids},
            'balance_amount': {'$gt': 0},
            'deleted_at': None
        },
        {"_id": 0}
    ).sort('next_payment_date', 1).to_list(length=1000)
    
    # Process followups
    followups = []
    for booking in bookings:
        next_payment_date = booking.get('next_payment_date')
        is_overdue = False
        days_overdue = 0
        
        if next_payment_date:
            if isinstance(next_payment_date, str):
                next_payment_date = datetime.fromisoformat(next_payment_date.replace('Z', '+00:00'))
            
            is_overdue = next_payment_date < datetime.now(timezone.utc)
            if is_overdue:
                days_overdue = (datetime.now(timezone.utc) - next_payment_date).days
        
        # Apply filter
        if overdue_only and not is_overdue:
            continue
        
        # Enrich with property and customer details
        if booking.get('property_id'):
            prop = await db.properties.find_one(
                {'id': booking['property_id']},
                {"_id": 0, 'plot_number': 1, 'project_id': 1}
            )
            if prop:
                booking['property_name'] = prop.get('plot_number')
                
                if prop.get('project_id'):
                    project = await db.projects.find_one(
                        {'id': prop['project_id']},
                        {"_id": 0, 'name': 1}
                    )
                    booking['project_name'] = project.get('name') if project else None
        
        if booking.get('customer_id'):
            customer = await db.users.find_one(
                {'id': booking['customer_id']},
                {"_id": 0, 'name': 1, 'phone': 1, 'email': 1}
            )
            booking['customer_details'] = customer
        
        booking['is_overdue'] = is_overdue
        booking['days_overdue'] = days_overdue
        followups.append(booking)
    
    return {
        "success": True,
        "followups": followups,
        "total": len(followups),
        "overdue_count": len([f for f in followups if f['is_overdue']])
    }

@router.get("/my-bookings")
async def get_agent_bookings(
    request: Request,
    user: dict = Depends(require_marketing_agent)
):
    """Get bookings related to agent's leads"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Get agent's leads
    assigned_leads = await db.leads.find(
        {'assigned_to': user_id, 'deleted_at': None},
        {"_id": 0, 'id': 1}
    ).to_list(length=10000)
    lead_ids = [l['id'] for l in assigned_leads]
    
    # Get bookings
    bookings = await db.bookings.find(
        {'lead_id': {'$in': lead_ids}, 'deleted_at': None},
        {"_id": 0}
    ).sort('created_at', -1).to_list(length=1000)
    
    # Enrich
    for booking in bookings:
        if booking.get('property_id'):
            prop = await db.properties.find_one(
                {'id': booking['property_id']},
                {"_id": 0, 'plot_number': 1, 'project_id': 1}
            )
            if prop:
                booking['property_name'] = prop.get('plot_number')
                
                if prop.get('project_id'):
                    project = await db.projects.find_one(
                        {'id': prop['project_id']},
                        {"_id": 0, 'name': 1}
                    )
                    booking['project_name'] = project.get('name') if project else None
    
    return {
        "success": True,
        "bookings": bookings,
        "total": len(bookings)
    }

@router.get("/analytics")
async def get_agent_analytics(
    request: Request,
    user: dict = Depends(require_marketing_agent)
):
    """Get analytics for marketing agent"""
    db = get_db(request)
    user_id = user['user_id']
    
    # Get all assigned leads
    assigned_leads = await db.leads.find(
        {'assigned_to': user_id, 'deleted_at': None},
        {"_id": 0}
    ).to_list(length=10000)
    
    # Monthly performance (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)
        
        month_leads = [l for l in assigned_leads 
                      if month_start <= datetime.fromisoformat(l['created_at'].replace('Z', '+00:00')) < month_end]
        
        # Get bookings for this month
        lead_ids_month = [l['id'] for l in month_leads]
        bookings_month = await db.bookings.find(
            {
                'lead_id': {'$in': lead_ids_month},
                'deleted_at': None
            },
            {"_id": 0, 'booking_amount': 1}
        ).to_list(length=10000)
        
        monthly_data.append({
            'month': month_start.strftime('%b'),
            'leads': len(month_leads),
            'bookings': len(bookings_month),
            'revenue': sum(b.get('booking_amount', 0) for b in bookings_month)
        })
    
    # Conversion rate
    lead_ids = [l['id'] for l in assigned_leads]
    total_bookings = await db.bookings.count_documents({
        'lead_id': {'$in': lead_ids},
        'deleted_at': None
    })
    conversion_rate = (total_bookings / len(assigned_leads) * 100) if assigned_leads else 0
    
    return {
        "success": True,
        "analytics": {
            "monthly_performance": monthly_data,
            "conversion_rate": round(conversion_rate, 2),
            "total_leads": len(assigned_leads),
            "total_conversions": total_bookings
        }
    }
