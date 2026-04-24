"""MemoraAI Logs — unified activity feed (tenant-scoped).

Aggregates recent events from multiple collections so the business owner sees
one chronological stream of what's happening in their account:
- AI replies to customers (whatsapp_conversations)
- Owner corrections applied
- Content / knowledge uploads
- New leads added
- Staff members added / removed
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/logs", tags=["memoraai-logs"])


def get_db(request: Request):
    return request.app.state.db


@router.get("")
async def get_logs(
    request: Request,
    kind: Optional[str] = None,          # 'ai' | 'correction' | 'content' | 'lead' | 'staff'
    limit: int = 100,
):
    """Return a unified, chronologically sorted activity feed for the tenant."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    events: List[dict] = []
    per_source = max(20, limit // 4)

    # 1. Recent WhatsApp conversations (latest 50 messages across convs)
    if not kind or kind == "ai":
        try:
            convs = await db.whatsapp_conversations.find(
                {"tenant_id": tenant_id},
                {"_id": 0, "customer_phone": 1, "customer_name": 1, "messages": {"$slice": -3}, "updated_at": 1, "last_message_at": 1},
            ).sort("updated_at", -1).limit(per_source).to_list(per_source)
            for c in convs:
                ts = c.get("last_message_at") or c.get("updated_at")
                if not ts:
                    continue
                last_msgs = c.get("messages") or []
                last = last_msgs[-1] if last_msgs else {}
                events.append({
                    "kind": "ai",
                    "icon": "message",
                    "title": f"AI chat with {c.get('customer_name') or c.get('customer_phone') or 'Customer'}",
                    "description": (last.get("text") or last.get("content") or "")[:160],
                    "timestamp": ts,
                    "meta": {"customer_phone": c.get("customer_phone")},
                })
        except Exception as e:
            logger.warning(f"logs/ai failed: {e}")

    # 2. Corrections (owner teaching the AI)
    if not kind or kind == "correction":
        try:
            corr = await db.memoraai_corrections.find(
                {"tenant_id": tenant_id},
                {"_id": 0, "customer_message": 1, "corrected_response": 1, "created_at": 1, "times_applied": 1, "is_active": 1},
            ).sort("created_at", -1).limit(per_source).to_list(per_source)
            for c in corr:
                events.append({
                    "kind": "correction",
                    "icon": "brain",
                    "title": f"AI learned a correction",
                    "description": (c.get("corrected_response") or "")[:160],
                    "timestamp": c.get("created_at"),
                    "meta": {
                        "applied_count": c.get("times_applied", 0),
                        "active": c.get("is_active", True),
                    },
                })
        except Exception as e:
            logger.warning(f"logs/correction failed: {e}")

    # 3. Knowledge / content uploads
    if not kind or kind == "content":
        try:
            content = await db.memoraai_content.find(
                {"tenant_id": tenant_id},
                {"_id": 0, "title": 1, "content_type": 1, "created_at": 1, "file_name": 1},
            ).sort("created_at", -1).limit(per_source).to_list(per_source)
            for c in content:
                events.append({
                    "kind": "content",
                    "icon": "file",
                    "title": f"Added {(c.get('content_type') or 'note').replace('_', ' ').title()}: {c.get('title') or 'Untitled'}",
                    "description": c.get("file_name") or "",
                    "timestamp": c.get("created_at"),
                    "meta": {"content_type": c.get("content_type")},
                })
        except Exception as e:
            logger.warning(f"logs/content failed: {e}")

    # 4. New leads
    if not kind or kind == "lead":
        try:
            leads = await db.memoraai_leads.find(
                {"tenant_id": tenant_id},
                {"_id": 0, "name": 1, "phone": 1, "source": 1, "created_at": 1, "status": 1},
            ).sort("created_at", -1).limit(per_source).to_list(per_source)
            for l in leads:
                events.append({
                    "kind": "lead",
                    "icon": "user-plus",
                    "title": f"New lead: {l.get('name') or l.get('phone') or 'Unknown'}",
                    "description": f"Source: {(l.get('source') or 'manual').replace('_', ' ').title()} · Status: {l.get('status') or 'new'}",
                    "timestamp": l.get("created_at"),
                    "meta": {"phone": l.get("phone")},
                })
        except Exception as e:
            logger.warning(f"logs/lead failed: {e}")

    # 5. Staff changes
    if not kind or kind == "staff":
        try:
            staff = await db.users.find(
                {"tenant_id": tenant_id, "role": {"$in": ["tenant_staff", "tenant_admin"]}},
                {"_id": 0, "name": 1, "role": 1, "created_at": 1, "phone": 1},
            ).sort("created_at", -1).limit(per_source).to_list(per_source)
            for s in staff:
                if not s.get("created_at"):
                    continue
                is_admin = s.get("role") == "tenant_admin"
                events.append({
                    "kind": "staff",
                    "icon": "user-cog",
                    "title": f"{'Business admin' if is_admin else 'Staff member'} added: {s.get('name') or s.get('phone')}",
                    "description": s.get("phone") or "",
                    "timestamp": s.get("created_at"),
                    "meta": {"role": s.get("role")},
                })
        except Exception as e:
            logger.warning(f"logs/staff failed: {e}")

    # Sort merged events by timestamp (desc) and trim
    def sort_key(e):
        ts = e.get("timestamp") or ""
        return ts if isinstance(ts, str) else ""

    events.sort(key=sort_key, reverse=True)
    events = events[:limit]

    # Summary counts (for header chips)
    counts = {}
    for e in events:
        counts[e["kind"]] = counts.get(e["kind"], 0) + 1

    return {
        "events": events,
        "total": len(events),
        "counts": counts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
