"""
Reports & Export API Routes
Export data to Excel and PDF formats
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from middleware.auth import get_current_user
from services.export_service import ExcelExporter, PDFExporter

router = APIRouter(prefix="/reports", tags=["reports"])


def get_db(request: Request):
    return request.app.state.db


# ==================== Properties Export ====================

@router.get("/export/properties/excel")
async def export_properties_excel(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export properties to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status_id"] = status
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(5000)
    
    # Enrich with customer and project info
    for prop in properties:
        if prop.get("customer_id"):
            customer = await db.customers.find_one({"id": prop["customer_id"]}, {"_id": 0, "name": 1, "phone": 1})
            if customer:
                prop["customer_name"] = customer.get("name")
                prop["customer_phone"] = customer.get("phone")
        
        if prop.get("project_id"):
            project = await db.projects.find_one({"id": prop["project_id"]}, {"_id": 0, "name": 1})
            prop["project_name"] = project.get("name") if project else ""
    
    # Get project name for filename
    project_name = None
    if project_id:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
        project_name = project.get("name") if project else None
    
    excel_buffer = ExcelExporter.export_properties(properties, project_name)
    
    filename = f"Properties_{project_name or 'All'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/properties/pdf")
async def export_properties_pdf(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export properties to PDF"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status_id"] = status
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(5000)
    
    # Enrich data
    for prop in properties:
        if prop.get("customer_id"):
            customer = await db.customers.find_one({"id": prop["customer_id"]}, {"_id": 0, "name": 1})
            prop["customer_name"] = customer.get("name") if customer else ""
    
    project_name = None
    if project_id:
        project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
        project_name = project.get("name") if project else None
    
    pdf_buffer = PDFExporter.export_properties_pdf(properties, project_name)
    
    filename = f"Properties_{project_name or 'All'}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Leads Export ====================

@router.get("/export/leads/excel")
async def export_leads_excel(
    request: Request,
    project_id: Optional[str] = None,
    status_id: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export leads to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if project_id:
        query["project_id"] = project_id
    if status_id:
        query["status_id"] = status_id
    if source:
        query["source"] = source
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    # Enrich with project and status names
    for lead in leads:
        if lead.get("project_id"):
            project = await db.projects.find_one({"id": lead["project_id"]}, {"_id": 0, "name": 1})
            lead["project_name"] = project.get("name") if project else ""
        
        if lead.get("status_id"):
            status = await db.lead_statuses.find_one({"id": lead["status_id"]}, {"_id": 0, "name": 1})
            lead["status_name"] = status.get("name") if status else lead.get("status_id")
        
        if lead.get("assigned_to"):
            user = await db.users.find_one({"id": lead["assigned_to"]}, {"_id": 0, "name": 1})
            lead["assigned_to_name"] = user.get("name") if user else ""
    
    excel_buffer = ExcelExporter.export_leads(leads)
    
    filename = f"Leads_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Bookings Export ====================

@router.get("/export/bookings/excel")
async def export_bookings_excel(
    request: Request,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export bookings to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if start_date:
        query["booking_date"] = {"$gte": start_date}
    if end_date:
        if "booking_date" in query:
            query["booking_date"]["$lte"] = end_date
        else:
            query["booking_date"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(5000)
    
    # Enrich data
    for booking in bookings:
        if booking.get("customer_id"):
            customer = await db.customers.find_one({"id": booking["customer_id"]}, {"_id": 0, "name": 1, "phone": 1})
            if customer:
                booking["customer_name"] = customer.get("name")
                booking["customer_phone"] = customer.get("phone")
        
        if booking.get("property_id"):
            prop = await db.properties.find_one({"id": booking["property_id"]}, {"_id": 0, "property_number": 1})
            booking["property_number"] = prop.get("property_number") if prop else ""
        
        if booking.get("project_id"):
            project = await db.projects.find_one({"id": booking["project_id"]}, {"_id": 0, "name": 1})
            booking["project_name"] = project.get("name") if project else ""
    
    excel_buffer = ExcelExporter.export_bookings(bookings)
    
    filename = f"Bookings_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Payments Export ====================

@router.get("/export/payments/excel")
async def export_payments_excel(
    request: Request,
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export payments to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    
    # Also get EMI payments
    emi_payments = await db.emi_payments.find(query, {"_id": 0}).to_list(10000)
    
    all_payments = payments + emi_payments
    
    # Enrich data
    for payment in all_payments:
        if payment.get("customer_id"):
            customer = await db.customers.find_one({"id": payment["customer_id"]}, {"_id": 0, "name": 1})
            payment["customer_name"] = customer.get("name") if customer else ""
        
        if payment.get("property_id"):
            prop = await db.properties.find_one({"id": payment["property_id"]}, {"_id": 0, "property_number": 1, "project_id": 1})
            if prop:
                payment["property_number"] = prop.get("property_number")
                # Filter by project if needed
                if project_id and prop.get("project_id") != project_id:
                    continue
    
    # Filter by project if needed
    if project_id:
        filtered_payments = []
        for payment in all_payments:
            if payment.get("property_id"):
                prop = await db.properties.find_one({"id": payment["property_id"]}, {"_id": 0, "project_id": 1})
                if prop and prop.get("project_id") == project_id:
                    filtered_payments.append(payment)
        all_payments = filtered_payments
    
    excel_buffer = ExcelExporter.export_payments(all_payments)
    
    filename = f"Payments_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Payment Schedule Export ====================

@router.get("/export/payment-schedule/excel")
async def export_payment_schedule_excel(
    request: Request,
    customer_id: Optional[str] = None,
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export payment schedules to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if customer_id:
        # Get bookings for this customer
        bookings = await db.bookings.find({"customer_id": customer_id}, {"_id": 0, "id": 1}).to_list(100)
        booking_ids = [b["id"] for b in bookings]
        query["booking_id"] = {"$in": booking_ids}
    
    if property_id:
        query["property_id"] = property_id
    
    if status:
        query["status"] = status
    
    schedules = await db.payment_schedules.find(query, {"_id": 0}).sort("due_date", 1).to_list(10000)
    
    # Also check emi_schedules
    emi_schedules = await db.emi_schedules.find(query, {"_id": 0}).sort("due_date", 1).to_list(10000)
    
    all_schedules = schedules + emi_schedules
    
    # Enrich data
    for schedule in all_schedules:
        if schedule.get("property_id"):
            prop = await db.properties.find_one({"id": schedule["property_id"]}, {"_id": 0, "property_number": 1})
            schedule["property_number"] = prop.get("property_number") if prop else ""
    
    customer_name = None
    if customer_id:
        customer = await db.customers.find_one({"id": customer_id}, {"_id": 0, "name": 1})
        customer_name = customer.get("name") if customer else None
    
    excel_buffer = ExcelExporter.export_payment_schedule(all_schedules, customer_name)
    
    filename = f"Payment_Schedule_{customer_name or 'All'}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/payment-schedule/pdf")
async def export_payment_schedule_pdf(
    request: Request,
    customer_id: Optional[str] = None,
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export payment schedule to PDF"""
    db = get_db(request)
    
    query = {"tenant_id": current_user["tenant_id"], "deleted_at": None}
    
    if customer_id:
        bookings = await db.bookings.find({"customer_id": customer_id}, {"_id": 0, "id": 1}).to_list(100)
        booking_ids = [b["id"] for b in bookings]
        query["booking_id"] = {"$in": booking_ids}
    
    if property_id:
        query["property_id"] = property_id
    
    schedules = await db.payment_schedules.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    emi_schedules = await db.emi_schedules.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    
    all_schedules = schedules + emi_schedules
    
    customer_name = None
    if customer_id:
        customer = await db.customers.find_one({"id": customer_id}, {"_id": 0, "name": 1})
        customer_name = customer.get("name") if customer else None
    
    pdf_buffer = PDFExporter.export_payment_schedule_pdf(all_schedules, customer_name)
    
    filename = f"Payment_Schedule_{customer_name or 'All'}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Customers Export ====================

@router.get("/export/customers/excel")
async def export_customers_excel(
    request: Request,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export customers to Excel"""
    db = get_db(request)
    
    query = {
        "tenant_id": current_user["tenant_id"],
        "deleted_at": None
    }
    
    if status:
        query["status"] = status
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(10000)
    
    # Enrich with property count and total invested
    for customer in customers:
        bookings = await db.bookings.find({
            "customer_id": customer["id"],
            "deleted_at": None
        }, {"_id": 0, "total_amount": 1}).to_list(100)
        
        customer["property_count"] = len(bookings)
        customer["total_invested"] = sum(b.get("total_amount", 0) for b in bookings)
    
    excel_buffer = ExcelExporter.export_customers(customers)
    
    filename = f"Customers_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== Dashboard Analytics ====================

@router.get("/analytics/summary")
async def get_analytics_summary(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get analytics summary for dashboard"""
    db = get_db(request)
    tenant_id = current_user["tenant_id"]
    
    # Set default date range (last 30 days)
    if not end_date:
        end_date = datetime.now(timezone.utc).isoformat()
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Counts
    total_leads = await db.leads.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    total_properties = await db.properties.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    total_bookings = await db.bookings.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    total_customers = await db.customers.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    
    # Revenue
    bookings = await db.bookings.find({"tenant_id": tenant_id, "deleted_at": None}, {"_id": 0, "total_amount": 1, "paid_amount": 1}).to_list(10000)
    total_revenue = sum(b.get("total_amount", 0) for b in bookings)
    collected_amount = sum(b.get("paid_amount", 0) for b in bookings)
    pending_amount = total_revenue - collected_amount
    
    # Property status breakdown
    available = await db.properties.count_documents({"tenant_id": tenant_id, "status_id": "available", "deleted_at": None})
    booked = await db.properties.count_documents({"tenant_id": tenant_id, "status_id": {"$in": ["booked", "sold"]}, "deleted_at": None})
    blocked = await db.properties.count_documents({"tenant_id": tenant_id, "status_id": "blocked", "deleted_at": None})
    
    # Lead status breakdown
    lead_statuses = await db.lead_statuses.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(20)
    lead_breakdown = {}
    for status in lead_statuses:
        count = await db.leads.count_documents({"tenant_id": tenant_id, "status_id": status["id"], "deleted_at": None})
        lead_breakdown[status.get("name", status["id"])] = count
    
    return {
        "summary": {
            "total_leads": total_leads,
            "total_properties": total_properties,
            "total_bookings": total_bookings,
            "total_customers": total_customers,
            "total_revenue": total_revenue,
            "collected_amount": collected_amount,
            "pending_amount": pending_amount
        },
        "property_breakdown": {
            "available": available,
            "booked": booked,
            "blocked": blocked
        },
        "lead_breakdown": lead_breakdown,
        "date_range": {
            "start": start_date,
            "end": end_date
        }
    }
