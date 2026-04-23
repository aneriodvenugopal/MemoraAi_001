from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Import routes
from routes import auth, tenants, currencies, categories, projects, properties, leads, bookings, commissions, analytics, notifications, users, scheduler, customer, layouts, layouts_library, in_app_notifications, referrals, translations, content, advisory, admin_content, share_referral, resale, saas_admin, chatbot, public_pages, marketplace, incomelands, incomelands_auth, google_auth, calendar_integration, workforce, project_dashboard, marketing_dashboard, payment_schemes, customer_payments, staff_hierarchy, commission_management, property_categories, currency_management, usage_tracking, coupons, bank_accounts, vendors, payment_transfer, articles, project_staff, role_assignments, roles, financial, ai_agents, sms, document_locker, festival_greetings, site_visits, booking_queue, customers_management, resale_release_mgmt, emi_payments, receipts, vendor_management, referral_wallet, complaints, commission_analytics, stripe_payments, stripe_webhook, email, subscriptions, certified_property, pdf, files, customer_portal, project_pricing, voters, payu, marketing_agents, push_notifications, tutorai, realapex_demos, agentapex, whatsapp_webhook
# MemoraAI new routes
from routes import memoraai_categories, memoraai_sales, memoraai_waba, memoraai_memory, memoraai_dashboard, memoraai_analytics, memoraai_appointments, memoraai_templates, memoraai_industries, memoraai_content, memoraai_rules, memoraai_inbox, memoraai_engine, memoraai_saas_admin, memoraai_calendar, memoraai_corrections, memoraai_public_leads

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# User-friendly error message mappings
ERROR_MESSAGES = {
    "value_error": "Please check the value entered",
    "missing": "This field is required",
    "string_type": "Please enter text only",
    "int_parsing": "Please enter a valid whole number",
    "float_parsing": "Please enter a valid number",
    "number_parsing": "Please enter a valid number",
    "date_parsing": "Please enter a valid date",
    "email_validator": "Please enter a valid email address",
    "phone": "Please enter a valid phone number",
    "url": "Please enter a valid URL",
    "too_short": "This value is too short",
    "too_long": "This value is too long",
}

def get_friendly_error_message(error_type: str, field: str, msg: str) -> str:
    """Convert technical error to user-friendly message"""
    # Check for specific patterns in error message
    if "unable to parse string as" in msg.lower():
        if "number" in msg.lower() or "float" in msg.lower() or "int" in msg.lower():
            return f"'{field}' should be a number. Please remove any text or special characters."
    
    # Map error types to friendly messages
    for key, friendly_msg in ERROR_MESSAGES.items():
        if key in error_type.lower():
            return f"'{field}': {friendly_msg}"
    
    # Field-specific messages
    field_lower = field.lower()
    if "price" in field_lower or "amount" in field_lower or "area" in field_lower:
        if "parse" in msg.lower() or "number" in msg.lower():
            return f"'{field}' should be a number (e.g., 1000 or 1500.50)"
    
    return f"'{field}': {msg}"

# Create the main app without a prefix
app = FastAPI(title="MemoraAI API", version="2.0.0")


# Global exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors to user-friendly messages"""
    errors = []
    for error in exc.errors():
        field = " > ".join(str(loc) for loc in error.get("loc", ["unknown"]) if loc != "body")
        error_type = error.get("type", "")
        msg = error.get("msg", "Invalid value")
        
        friendly_msg = get_friendly_error_message(error_type, field, msg)
        errors.append(friendly_msg)
    
    # Join multiple errors with newline
    error_message = "; ".join(errors) if len(errors) > 1 else errors[0] if errors else "Please check your input"
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": error_message,
            "errors": errors
        }
    )


# Store db in app state for access in routes
app.state.db = db

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {
        "message": "MemoraAI API is running",
        "version": "2.0.0",
        "status": "healthy"
    }

# Root health check for Kubernetes (required for deployment)
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes"""
    return {"status": "healthy", "service": "memoraai-api"}

# API health check (alternative route)
@api_router.get("/health")
async def api_health_check():
    """Health check endpoint via API prefix"""
    return {"status": "healthy", "service": "memoraai-api"}

# Include all route modules
api_router.include_router(auth.router)
api_router.include_router(tenants.router)
api_router.include_router(currencies.router)
api_router.include_router(categories.router)
api_router.include_router(projects.router)
api_router.include_router(properties.router)
api_router.include_router(leads.router)
api_router.include_router(bookings.router)
api_router.include_router(commissions.router)
api_router.include_router(analytics.router)
api_router.include_router(notifications.router)
api_router.include_router(in_app_notifications.router)
api_router.include_router(users.router)
api_router.include_router(scheduler.router)
api_router.include_router(customer.router)
api_router.include_router(layouts.router)
api_router.include_router(layouts_library.router)
api_router.include_router(referrals.router)
api_router.include_router(translations.router)
api_router.include_router(content.router)
api_router.include_router(advisory.router)
api_router.include_router(coupons.router)
api_router.include_router(bank_accounts.router)
api_router.include_router(role_assignments.router)
api_router.include_router(roles.router)
api_router.include_router(financial.router)
api_router.include_router(ai_agents.router)
api_router.include_router(sms.router)
api_router.include_router(vendors.router)
api_router.include_router(payment_transfer.router)
api_router.include_router(articles.router)
api_router.include_router(project_staff.router)
api_router.include_router(admin_content.router)
api_router.include_router(share_referral.router)
api_router.include_router(resale.router)
api_router.include_router(saas_admin.router)
api_router.include_router(chatbot.router)
api_router.include_router(public_pages.router)
api_router.include_router(marketplace.router)
api_router.include_router(incomelands.router)
api_router.include_router(incomelands_auth.router)
# api_router.include_router(google_auth.router)  # Disabled - using OTP login only
# api_router.include_router(calendar_integration.router)  # Disabled - Google Calendar disabled
api_router.include_router(workforce.router)
api_router.include_router(project_dashboard.router)
api_router.include_router(marketing_dashboard.router)
api_router.include_router(payment_schemes.router)
api_router.include_router(stripe_payments.router)
api_router.include_router(stripe_webhook.router)
api_router.include_router(customer_payments.router)
api_router.include_router(staff_hierarchy.router)
api_router.include_router(commission_management.router)
api_router.include_router(property_categories.router)
api_router.include_router(currency_management.router)
api_router.include_router(usage_tracking.router)
api_router.include_router(document_locker.router)
api_router.include_router(festival_greetings.router)
api_router.include_router(site_visits.router)
api_router.include_router(booking_queue.router)
api_router.include_router(customers_management.router)
api_router.include_router(resale_release_mgmt.router)
api_router.include_router(emi_payments.router)
api_router.include_router(receipts.router)
api_router.include_router(vendor_management.router)
api_router.include_router(referral_wallet.router)
api_router.include_router(complaints.router)
api_router.include_router(commission_analytics.router)
api_router.include_router(email.router)
api_router.include_router(subscriptions.router)
api_router.include_router(certified_property.router)
api_router.include_router(pdf.router)
api_router.include_router(files.router)
api_router.include_router(customer_portal.router)
api_router.include_router(project_pricing.router)
api_router.include_router(voters.router)
api_router.include_router(payu.router)
api_router.include_router(marketing_agents.router)
api_router.include_router(push_notifications.router)
api_router.include_router(push_notifications.router)  # Push Notifications (whatsapp_router disabled, using new agentic system)
# api_router.include_router(push_notifications.whatsapp_router)  # OLD - Disabled in favor of Agentic AI
api_router.include_router(calendar_integration.router)  # Re-enabled for Site Visit sync
api_router.include_router(tutorai.router)  # TutorAI Admin Tool
api_router.include_router(realapex_demos.router)  # MemoraAI Demo Generator
api_router.include_router(agentapex.router)  # AgentApex Mobile Property App
api_router.include_router(whatsapp_webhook.router)  # WhatsApp Agentic AI Workflow (NEW)

# MemoraAI Multi-Category Routes
api_router.include_router(memoraai_categories.router)  # Business Categories & Services
api_router.include_router(memoraai_sales.router)       # Hot Sales Mode & Alerts
api_router.include_router(memoraai_waba.router)        # Self-Service WABA Setup
api_router.include_router(memoraai_memory.router)      # Business Memory AI
api_router.include_router(memoraai_dashboard.router)   # Category Dashboard Stats
api_router.include_router(memoraai_analytics.router)   # Category Analytics & Reports
api_router.include_router(memoraai_appointments.router) # Appointment/Booking Management
api_router.include_router(memoraai_templates.router)   # WhatsApp Template Workflow
api_router.include_router(memoraai_industries.router)  # Industry Pages
api_router.include_router(memoraai_content.router)     # Content Library
api_router.include_router(memoraai_rules.router)       # Business Rules
api_router.include_router(memoraai_inbox.router)       # Team Inbox + Human Handover
api_router.include_router(memoraai_engine.router)      # Follow-up Config + Emotion + Lead Funnel
api_router.include_router(memoraai_saas_admin.router)  # SaaS Admin Dashboard
api_router.include_router(memoraai_calendar.router)    # Google Calendar Sync
api_router.include_router(memoraai_corrections.router) # Chat Learning / Corrections
api_router.include_router(memoraai_public_leads.router) # Public marketing lead capture

# Phase 1 — Accounting & Money Tracking
from routes import payment_receive, payment_out
api_router.include_router(payment_receive.router)  # Payment Receive + Cheques + Ledger + Daily Report
api_router.include_router(payment_out.router)  # Payment Transfer + Agent Commission

# PWA Install tracking
@api_router.post("/analytics/pwa-install")
async def track_pwa_install(request: Request, platform: str = "unknown"):
    """Track PWA installations"""
    db = request.app.state.db
    
    install_record = {
        "id": str(uuid.uuid4()),
        "platform": platform,
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "installed_at": datetime.utcnow().isoformat()
    }
    
    await db.pwa_installs.insert_one(install_record)
    
    return {"success": True}

# Firebase FCM Token Management
@api_router.post("/notifications/save-fcm-token")
async def save_fcm_token(request: Request):
    """Save Firebase FCM token for user"""
    try:
        from middleware.auth import get_current_user
        
        current_user = await get_current_user(request)
        db = request.app.state.db
        
        body = await request.json()
        user_id = body.get('user_id')
        fcm_token = body.get('fcm_token')
        device_type = body.get('device_type', 'web')
        
        # Update user's FCM token
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "fcm_token": fcm_token,
                    "device_type": device_type,
                    "fcm_updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return {"success": True, "message": "FCM token saved"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop the follow-up scheduler
    if hasattr(app.state, "followup_task") and app.state.followup_task:
        app.state.followup_task.cancel()
    client.close()


# ============ AUTO FOLLOW-UP BACKGROUND SCHEDULER ============
import asyncio

async def _followup_scheduler_loop():
    """Background loop that checks for pending follow-ups every 30 minutes."""
    await asyncio.sleep(60)  # Initial delay — let server fully start
    while True:
        try:
            from services.whatsapp_agentic.auto_followup import AutoFollowupService
            from services.whatsapp_agentic.meta_whatsapp_client import meta_whatsapp_client as _meta_client
            from services.whatsapp_agentic.session_manager import session_manager as _session_mgr

            _session_mgr.set_db(db)
            _meta_client.set_session_manager(_session_mgr, db)

            service = AutoFollowupService(db)
            result = await service.run_batch(meta_client=_meta_client, min_delay_hours=2.0)

            if result["processed"] > 0:
                logger.info(
                    f"Auto follow-up batch: {result['successful']} sent, "
                    f"{result['failed']} failed out of {result['total_pending']} pending"
                )
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Auto follow-up scheduler error: {e}")

        await asyncio.sleep(1800)  # Run every 30 minutes


@app.on_event("startup")
async def start_followup_scheduler():
    """Start the auto follow-up background scheduler."""
    app.state.followup_task = asyncio.create_task(_followup_scheduler_loop())
    logger.info("Auto follow-up scheduler started (runs every 30 minutes)")