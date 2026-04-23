"""Analytics service for generating reports and insights"""
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

class AnalyticsService:
    """Service for analytics and reporting"""
    
    @staticmethod
    async def get_dashboard_metrics(
        db: AsyncIOMotorDatabase,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get dashboard overview metrics"""
        
        # Build base query
        query = {}
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date.isoformat()
        if end_date:
            date_query['$lte'] = end_date.isoformat()
        
        if date_query:
            query['created_at'] = date_query
        
        # Total leads
        total_leads = await db.leads.count_documents(
            {**query, 'deleted_at': None}
        )
        
        # Converted leads
        converted_status = await db.categories.find_one(
            {'slug': 'converted', 'type': 'lead_status'}, {"_id": 0}
        )
        converted_leads = 0
        if converted_status:
            converted_leads = await db.leads.count_documents(
                {**query, 'status_id': converted_status['id'], 'deleted_at': None}
            )
        
        # Total bookings
        total_bookings = await db.bookings.count_documents(
            {**query, 'deleted_at': None}
        )
        
        # Total revenue (sum of booking amounts)
        revenue_pipeline = [
            {'$match': {**query, 'deleted_at': None}}
        ]
        revenue_result = await db.bookings.aggregate([
            *revenue_pipeline,
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}}}
        ]).to_list(length=1)
        
        total_revenue = revenue_result[0]['total'] if revenue_result else 0
        
        # Total payments collected
        payment_pipeline = [
            {'$match': {**query, 'deleted_at': None}}
        ]
        payment_result = await db.payments.aggregate([
            *payment_pipeline,
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]).to_list(length=1)
        
        total_payments = payment_result[0]['total'] if payment_result else 0
        
        # Pending payments
        pending_payments = total_revenue - total_payments
        
        # Properties by status
        property_statuses = await db.categories.find(
            {'type': 'property_status', 'deleted_at': None}, {"_id": 0}
        ).to_list(length=None)
        
        property_stats = []
        for status in property_statuses:
            count = await db.properties.count_documents(
                {'status_id': status['id'], 'deleted_at': None}
            )
            property_stats.append({
                'status': status['name'],
                'count': count
            })
        
        # Lead conversion rate
        conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        
        # Recent activities (last 10)
        recent_leads = await db.leads.find(
            {**({'tenant_id': tenant_id} if tenant_id else {}), 'deleted_at': None},
            {"_id": 0}
        ).sort('created_at', -1).limit(5).to_list(length=5)
        
        recent_bookings = await db.bookings.find(
            {**({'tenant_id': tenant_id} if tenant_id else {}), 'deleted_at': None},
            {"_id": 0}
        ).sort('created_at', -1).limit(5).to_list(length=5)
        
        return {
            'overview': {
                'total_leads': total_leads,
                'converted_leads': converted_leads,
                'conversion_rate': round(conversion_rate, 2),
                'total_bookings': total_bookings,
                'total_revenue': round(total_revenue, 2),
                'total_payments_collected': round(total_payments, 2),
                'pending_payments': round(pending_payments, 2)
            },
            'property_stats': property_stats,
            'recent_leads': recent_leads,
            'recent_bookings': recent_bookings
        }
    
    @staticmethod
    async def get_lead_analytics(
        db: AsyncIOMotorDatabase,
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get lead analytics and insights"""
        
        # Build query
        query = {'deleted_at': None}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if project_id:
            query['project_id'] = project_id
        
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date.isoformat()
        if end_date:
            date_query['$lte'] = end_date.isoformat()
        if date_query:
            query['created_at'] = date_query
        
        # Leads by source
        lead_sources = await db.categories.find(
            {'type': 'lead_source', 'deleted_at': None}, {"_id": 0}
        ).to_list(length=None)
        
        leads_by_source = []
        for source in lead_sources:
            count = await db.leads.count_documents({**query, 'source_id': source['id']})
            if count > 0:
                leads_by_source.append({
                    'source': source['name'],
                    'count': count
                })
        
        # Leads by status
        lead_statuses = await db.categories.find(
            {'type': 'lead_status', 'deleted_at': None}, {"_id": 0}
        ).to_list(length=None)
        
        leads_by_status = []
        for status in lead_statuses:
            count = await db.leads.count_documents({**query, 'status_id': status['id']})
            leads_by_status.append({
                'status': status['name'],
                'count': count
            })
        
        # Leads by quality
        quality_distribution = await db.leads.aggregate([
            {'$match': query},
            {'$group': {'_id': '$quality', 'count': {'$sum': 1}}}
        ]).to_list(length=None)
        
        leads_by_quality = [
            {'quality': item['_id'], 'count': item['count']}
            for item in quality_distribution
        ]
        
        # Top performing staff (by lead count)
        top_staff = await db.leads.aggregate([
            {'$match': query},
            {'$group': {'_id': '$assigned_to', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {'$limit': 5}
        ]).to_list(length=5)
        
        # Fetch staff details
        top_staff_with_details = []
        for item in top_staff:
            if item['_id']:
                staff = await db.users.find_one({'id': item['_id']}, {"_id": 0, 'name': 1})
                top_staff_with_details.append({
                    'staff_name': staff['name'] if staff else 'Unknown',
                    'lead_count': item['count']
                })
        
        return {
            'leads_by_source': leads_by_source,
            'leads_by_status': leads_by_status,
            'leads_by_quality': leads_by_quality,
            'top_staff': top_staff_with_details
        }
    
    @staticmethod
    async def get_sales_analytics(
        db: AsyncIOMotorDatabase,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get sales analytics"""
        
        # Build query
        query = {'deleted_at': None}
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date.isoformat()
        if end_date:
            date_query['$lte'] = end_date.isoformat()
        if date_query:
            query['booking_date'] = date_query
        
        # Sales by project
        sales_by_project = await db.bookings.aggregate([
            {'$match': query},
            {'$group': {
                '_id': '$project_id',
                'total_sales': {'$sum': '$total_amount'},
                'booking_count': {'$sum': 1}
            }},
            {'$sort': {'total_sales': -1}}
        ]).to_list(length=None)
        
        # Fetch project details
        sales_by_project_with_details = []
        for item in sales_by_project:
            if item['_id']:
                project = await db.projects.find_one(
                    {'id': item['_id']}, {"_id": 0, 'name': 1}
                )
                sales_by_project_with_details.append({
                    'project_name': project['name'] if project else 'Unknown',
                    'total_sales': round(item['total_sales'], 2),
                    'booking_count': item['booking_count']
                })
        
        # Monthly sales trend (last 6 months)
        monthly_sales = await db.bookings.aggregate([
            {'$match': {**query}},
            {'$group': {
                '_id': {
                    '$substr': ['$booking_date', 0, 7]  # YYYY-MM
                },
                'total_sales': {'$sum': '$total_amount'},
                'booking_count': {'$sum': 1}
            }},
            {'$sort': {'_id': 1}},
            {'$limit': 6}
        ]).to_list(length=6)
        
        monthly_trend = [
            {
                'month': item['_id'],
                'total_sales': round(item['total_sales'], 2),
                'booking_count': item['booking_count']
            }
            for item in monthly_sales
        ]
        
        # Payment plan distribution
        payment_plan_dist = await db.bookings.aggregate([
            {'$match': query},
            {'$group': {'_id': '$payment_plan', 'count': {'$sum': 1}}}
        ]).to_list(length=None)
        
        payment_plan_distribution = [
            {'plan': item['_id'], 'count': item['count']}
            for item in payment_plan_dist
        ]
        
        return {
            'sales_by_project': sales_by_project_with_details,
            'monthly_trend': monthly_trend,
            'payment_plan_distribution': payment_plan_distribution
        }
    
    @staticmethod
    async def get_payment_analytics(
        db: AsyncIOMotorDatabase,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get payment analytics"""
        
        # Build query
        query = {'deleted_at': None}
        if tenant_id:
            query['tenant_id'] = tenant_id
        
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date.isoformat()
        if end_date:
            date_query['$lte'] = end_date.isoformat()
        if date_query:
            query['payment_date'] = date_query
        
        # Payment by mode
        payment_modes = await db.categories.find(
            {'type': 'payment_mode', 'deleted_at': None}, {"_id": 0}
        ).to_list(length=None)
        
        payments_by_mode = []
        for mode in payment_modes:
            result = await db.payments.aggregate([
                {'$match': {**query, 'mode_id': mode['id']}},
                {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
            ]).to_list(length=1)
            
            total = result[0]['total'] if result else 0
            if total > 0:
                payments_by_mode.append({
                    'mode': mode['name'],
                    'total': round(total, 2)
                })
        
        # Payment status overview
        total_expected = await db.bookings.aggregate([
            {'$match': {'deleted_at': None, **({"tenant_id": tenant_id} if tenant_id else {})}},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}}}
        ]).to_list(length=1)
        
        total_collected = await db.payments.aggregate([
            {'$match': query},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]).to_list(length=1)
        
        expected = total_expected[0]['total'] if total_expected else 0
        collected = total_collected[0]['total'] if total_collected else 0
        pending = expected - collected
        
        # Overdue payments (schedules past due date)
        today = datetime.now(timezone.utc).isoformat()
        overdue_schedules = await db.payment_schedules.find({
            'due_date': {'$lt': today},
            'status': 'pending',
            'deleted_at': None,
            **({"tenant_id": tenant_id} if tenant_id else {})
        }, {"_id": 0}).to_list(length=None)
        
        overdue_amount = sum(schedule['amount'] for schedule in overdue_schedules)
        
        return {
            'payments_by_mode': payments_by_mode,
            'payment_status': {
                'total_expected': round(expected, 2),
                'total_collected': round(collected, 2),
                'pending': round(pending, 2),
                'collection_rate': round((collected / expected * 100) if expected > 0 else 0, 2)
            },
            'overdue': {
                'count': len(overdue_schedules),
                'amount': round(overdue_amount, 2)
            }
        }
    
    @staticmethod
    async def get_commission_analytics(
        db: AsyncIOMotorDatabase,
        tenant_id: Optional[str] = None,
        staff_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get commission analytics"""
        
        # Build query
        query = {'deleted_at': None}
        if tenant_id:
            query['tenant_id'] = tenant_id
        if staff_id:
            query['staff_id'] = staff_id
        
        date_query = {}
        if start_date:
            date_query['$gte'] = start_date.isoformat()
        if end_date:
            date_query['$lte'] = end_date.isoformat()
        if date_query:
            query['created_at'] = date_query
        
        # Commission by status
        commission_statuses = ['pending', 'approved', 'paid']
        commissions_by_status = []
        
        for status in commission_statuses:
            result = await db.commissions.aggregate([
                {'$match': {**query, 'status': status}},
                {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
            ]).to_list(length=1)
            
            total = result[0]['total'] if result else 0
            commissions_by_status.append({
                'status': status.title(),
                'total': round(total, 2)
            })
        
        # Top earners
        top_earners = await db.commissions.aggregate([
            {'$match': query},
            {'$group': {
                '_id': '$staff_id',
                'total_commission': {'$sum': '$amount'}
            }},
            {'$sort': {'total_commission': -1}},
            {'$limit': 5}
        ]).to_list(length=5)
        
        # Fetch staff details
        top_earners_with_details = []
        for item in top_earners:
            if item['_id']:
                staff = await db.users.find_one({'id': item['_id']}, {"_id": 0, 'name': 1})
                top_earners_with_details.append({
                    'staff_name': staff['name'] if staff else 'Unknown',
                    'total_commission': round(item['total_commission'], 2)
                })
        
        return {
            'commissions_by_status': commissions_by_status,
            'top_earners': top_earners_with_details
        }
