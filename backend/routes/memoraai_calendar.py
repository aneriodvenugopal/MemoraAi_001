"""MemoraAI Google Calendar Integration API (tenant-scoped)"""
import os
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import RedirectResponse

from middleware.auth import get_current_user
from services.google_calendar_service import GoogleCalendarService
from services.memoraai_calendar_sync import (
    is_calendar_configured,
    sync_appointment_to_calendar,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/calendar", tags=["memoraai-calendar"])


def get_db(request: Request):
    return request.app.state.db


def _frontend_base() -> str:
    return (
        os.getenv("FRONTEND_URL")
        or os.getenv("REACT_APP_BACKEND_URL")
        or ""
    ).rstrip("/")


# ───────────────── STATUS ─────────────────
@router.get("/status")
async def calendar_status(request: Request):
    """Return the current Google Calendar connection status for the caller's tenant."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0}) if tenant_id else None
    google_tokens = (tenant or {}).get("google_tokens") or {}

    return {
        "configured": is_calendar_configured(),
        "connected": bool(google_tokens.get("access_token")),
        "google_email": (tenant or {}).get("google_email"),
        "connected_at": (tenant or {}).get("google_connected_at"),
    }


# ───────────────── CONNECT ─────────────────
@router.get("/connect")
async def calendar_connect(request: Request):
    """Generate Google OAuth authorization URL for the tenant to connect their calendar."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    if not is_calendar_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Calendar is not configured on this server. "
                "Ask your admin to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            ),
        )

    # Create a short-lived state token tied to the tenant so we can resolve it in callback
    state_token = secrets.token_urlsafe(24)
    await db.memoraai_oauth_states.insert_one({
        "state": state_token,
        "tenant_id": tenant_id,
        "user_id": user.get("user_id"),
        "created_at": datetime.now(timezone.utc),
    })
    # Best-effort TTL index (idempotent)
    try:
        await db.memoraai_oauth_states.create_index("created_at", expireAfterSeconds=900)
    except Exception:
        pass

    auth_url, _ = GoogleCalendarService.get_authorization_url()
    # Append our state (google_auth_oauthlib returns its own state; we replace query param)
    sep = "&" if "?" in auth_url else "?"
    if "state=" in auth_url:
        import re
        auth_url = re.sub(r"state=[^&]+", f"state={state_token}", auth_url)
    else:
        auth_url = f"{auth_url}{sep}state={state_token}"

    return {"authorization_url": auth_url, "state": state_token}


# ───────────────── CALLBACK ─────────────────
@router.get("/callback")
async def calendar_callback(request: Request, code: str = Query(...), state: str = Query(...)):
    """Exchange code for tokens and store them on the tenant."""
    db = get_db(request)
    frontend = _frontend_base()

    # Resolve state
    state_doc = await db.memoraai_oauth_states.find_one({"state": state}, {"_id": 0})
    if not state_doc:
        return RedirectResponse(url=f"{frontend}/calendar-sync?error=invalid_state")

    tenant_id = state_doc.get("tenant_id")
    try:
        result = await GoogleCalendarService.exchange_code_for_tokens(code)
        tokens = result["tokens"]
        user_info = result["user_info"]
    except Exception as e:
        logger.exception(f"Google token exchange failed: {e}")
        return RedirectResponse(url=f"{frontend}/calendar-sync?error=token_exchange_failed")

    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "google_tokens": tokens,
            "google_email": user_info.get("email"),
            "google_connected_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    # One-time use
    await db.memoraai_oauth_states.delete_one({"state": state})

    return RedirectResponse(url=f"{frontend}/calendar-sync?connected=true")


# ───────────────── DISCONNECT ─────────────────
@router.post("/disconnect")
async def calendar_disconnect(request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    await db.tenants.update_one(
        {"id": tenant_id},
        {"$unset": {"google_tokens": "", "google_email": "", "google_connected_at": ""}},
    )
    return {"success": True, "message": "Google Calendar disconnected"}


# ───────────────── MANUAL SYNC ─────────────────
@router.post("/sync/{appointment_id}")
async def calendar_sync_appointment(appointment_id: str, request: Request):
    """Manually push a specific appointment to Google Calendar."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    apt = await db.memoraai_appointments.find_one(
        {"id": appointment_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    result = await sync_appointment_to_calendar(db, tenant_id, apt)
    if not result["synced"]:
        # Surface reason but don't 500 — caller may want to show "connect calendar" CTA
        return {"success": False, **result}
    return {"success": True, **result}


# ───────────────── UPCOMING (from Google) ─────────────────
@router.get("/upcoming")
async def calendar_upcoming(request: Request, limit: int = 10):
    """List upcoming Google Calendar events for the connected tenant."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0}) if tenant_id else None
    tokens = (tenant or {}).get("google_tokens")
    if not tokens:
        return {"connected": False, "events": []}

    try:
        res = await GoogleCalendarService.list_upcoming_events(tokens, max_results=limit)
    except Exception as e:
        logger.warning(f"Upcoming events fetch failed: {e}")
        return {"connected": True, "events": [], "error": str(e)[:160]}

    # Persist refreshed tokens if any
    if res.get("updated_tokens"):
        await db.tenants.update_one(
            {"id": tenant_id},
            {"$set": {"google_tokens": {**tokens, **res["updated_tokens"]}}},
        )

    events = []
    for ev in res.get("events", []) or []:
        start = ev.get("start", {}) or {}
        events.append({
            "id": ev.get("id"),
            "summary": ev.get("summary"),
            "start": start.get("dateTime") or start.get("date"),
            "link": ev.get("htmlLink"),
        })
    return {"connected": True, "events": events}
