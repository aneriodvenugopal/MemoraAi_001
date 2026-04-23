"""
MemoraAI Google Calendar Sync Service

Tenant-scoped Google Calendar integration. Gracefully no-ops when
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars are empty (placeholder mode)
or when a tenant has not connected their Google account yet.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.google_calendar_service import GoogleCalendarService

logger = logging.getLogger(__name__)


def is_calendar_configured() -> bool:
    """Return True only when server-level Google OAuth credentials are present."""
    return bool(os.getenv("GOOGLE_CLIENT_ID") and os.getenv("GOOGLE_CLIENT_SECRET"))


def _parse_appointment_start(apt: dict) -> Optional[datetime]:
    """Parse appointment_date (+optional appointment_time) into a tz-aware datetime."""
    date_str = (apt.get("appointment_date") or "").strip()
    time_str = (apt.get("appointment_time") or "").strip()
    if not date_str:
        return None
    try:
        # Try full ISO first
        if "T" in date_str:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            base = date_str[:10]
            if time_str:
                # accept HH:MM or HH:MM:SS
                tparts = time_str.split(":")
                hh = int(tparts[0]) if tparts else 9
                mm = int(tparts[1]) if len(tparts) > 1 else 0
                dt = datetime(
                    int(base[0:4]), int(base[5:7]), int(base[8:10]),
                    hh, mm, tzinfo=timezone.utc,
                )
            else:
                dt = datetime(
                    int(base[0:4]), int(base[5:7]), int(base[8:10]),
                    9, 0, tzinfo=timezone.utc,
                )
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        logger.warning(f"Calendar sync: could not parse date for apt {apt.get('id')}: {e}")
        return None


async def sync_appointment_to_calendar(db, tenant_id: str, appointment: dict) -> dict:
    """
    Push an appointment to the tenant's connected Google Calendar.

    Returns a dict describing the outcome. Never raises; errors are captured
    and returned so the caller can decide what to do.
    """
    result = {"synced": False, "configured": is_calendar_configured(), "reason": None}

    if not result["configured"]:
        result["reason"] = "server_not_configured"
        return result

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        result["reason"] = "tenant_not_found"
        return result

    google_tokens = tenant.get("google_tokens")
    if not google_tokens:
        result["reason"] = "tenant_not_connected"
        return result

    start = _parse_appointment_start(appointment)
    if not start:
        result["reason"] = "invalid_date"
        return result

    duration = int(appointment.get("duration_mins") or 30)
    end = start + timedelta(minutes=duration)

    service_name = appointment.get("service_name") or "Appointment"
    customer_name = appointment.get("customer_name") or appointment.get("customer_phone") or "Customer"
    title = f"{service_name} — {customer_name}"

    description_parts = [
        f"Customer: {customer_name}",
        f"Phone: {appointment.get('customer_phone', 'N/A')}",
        f"Service: {service_name}",
    ]
    if appointment.get("amount"):
        description_parts.append(f"Amount: ₹{appointment['amount']}")
    if appointment.get("notes"):
        description_parts.append(f"Notes: {appointment['notes']}")
    description_parts.append(f"Source: {appointment.get('source', 'manual')}")
    description_parts.append("")
    description_parts.append("Auto-synced by MemoraAI")
    description = "\n".join(description_parts)

    try:
        res = await GoogleCalendarService.create_calendar_event(
            google_tokens=google_tokens,
            summary=title,
            description=description,
            start_time=start,
            end_time=end,
            attendees=None,
            location=None,
            add_video_conference=False,
        )

        # Persist refreshed tokens if any
        if res.get("updated_tokens"):
            await db.tenants.update_one(
                {"id": tenant_id},
                {"$set": {"google_tokens": {**google_tokens, **res["updated_tokens"]}}},
            )

        # Persist event id back on the appointment if we know its id
        if appointment.get("id"):
            await db.memoraai_appointments.update_one(
                {"id": appointment["id"], "tenant_id": tenant_id},
                {"$set": {
                    "google_event_id": res.get("event_id"),
                    "google_event_link": res.get("event_link"),
                    "google_synced_at": datetime.now(timezone.utc).isoformat(),
                }},
            )

        result.update({
            "synced": True,
            "event_id": res.get("event_id"),
            "event_link": res.get("event_link"),
        })
        return result
    except Exception as e:
        logger.exception(f"Calendar sync failed for apt {appointment.get('id')}: {e}")
        result["reason"] = f"api_error: {str(e)[:200]}"
        return result


async def delete_synced_event(db, tenant_id: str, google_event_id: str) -> bool:
    """Remove an event from the tenant's Google Calendar. Safe: returns False on failure."""
    if not is_calendar_configured() or not google_event_id:
        return False
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant or not tenant.get("google_tokens"):
        return False
    try:
        await GoogleCalendarService.delete_calendar_event(
            google_tokens=tenant["google_tokens"],
            event_id=google_event_id,
        )
        return True
    except Exception as e:
        logger.warning(f"Failed to delete Google event {google_event_id}: {e}")
        return False
