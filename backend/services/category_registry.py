"""Unified Business Category Registry — backed by `memoraai_industries`.

Single source of truth for:
- Public website industry cards (`/industry/{slug}`)
- SaaS admin Onboarding dropdown
- SaaS admin Categories management page
- Tenant onboarding default service seeding

Slug convention: hyphen-case ("real-estate"). For backward compat with any
existing tenant stored as "real_estate", lookups try both forms.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

COLLECTION = "memoraai_industries"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_slug(slug: str) -> str:
    return (slug or "").strip().lower().replace("_", "-").replace(" ", "-")


def _normalize_service(svc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": svc.get("id") or str(uuid.uuid4()),
        "name": (svc.get("name") or "").strip(),
        "description": (svc.get("description") or "").strip(),
        "duration_mins": int(svc.get("duration_mins") or 0),
        "price": float(svc.get("price") or 0),
    }


def _ensure_default_services(ind: dict) -> dict:
    """Derive rich `default_services` from legacy flat `services: [str]` when missing."""
    if not ind:
        return ind
    if ind.get("default_services"):
        return ind
    flat = ind.get("services") or []
    ind["default_services"] = [
        _normalize_service({"name": s}) for s in flat if isinstance(s, str) and s.strip()
    ]
    return ind


def _project(ind: dict) -> dict:
    """Shape a raw industry doc into the category API contract used by the UI."""
    if not ind:
        return ind
    ind = _ensure_default_services(dict(ind))
    return {
        "id": ind.get("id"),
        "slug": ind.get("slug"),
        "name": ind.get("title") or ind.get("name") or ind.get("slug"),
        "icon": ind.get("icon", ""),
        "description": ind.get("hero_sub") or ind.get("description", ""),
        "default_services": ind.get("default_services") or [],
        "is_active": ind.get("is_active", True),
        "is_system": ind.get("is_system", True),
        "sort_order": ind.get("sort_order", 99),
        "created_at": ind.get("created_at"),
        "updated_at": ind.get("updated_at"),
    }


async def _find_by_slug(db, slug: str) -> Optional[dict]:
    """Lookup tolerant to underscore/hyphen slug variants."""
    if not slug:
        return None
    norm = _normalize_slug(slug)
    doc = await db[COLLECTION].find_one({"slug": norm}, {"_id": 0})
    if doc:
        return doc
    # also try underscore form
    alt = norm.replace("-", "_")
    return await db[COLLECTION].find_one({"slug": alt}, {"_id": 0})


# ───────────────────────────── Public API ─────────────────────────────

async def ensure_seeded(db) -> int:
    """Backfill `default_services` on any existing industry doc that lacks it.
    Returns the number of docs updated."""
    updated = 0
    async for doc in db[COLLECTION].find({"default_services": {"$exists": False}}, {"_id": 0}):
        flat = doc.get("services") or []
        rich = [_normalize_service({"name": s}) for s in flat if isinstance(s, str) and s.strip()]
        await db[COLLECTION].update_one(
            {"slug": doc["slug"]},
            {"$set": {"default_services": rich, "updated_at": _now()}}
        )
        updated += 1
    if updated:
        logger.info(f"Backfilled default_services on {updated} industry docs")
    return updated


async def get_all(db, active_only: bool = True) -> List[dict]:
    q = {"is_active": True} if active_only else {}
    docs = await db[COLLECTION].find(q, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return [_project(d) for d in docs]


async def get(db, slug: str) -> Optional[dict]:
    doc = await _find_by_slug(db, slug)
    return _project(doc) if doc else None


async def is_supported(db, slug: str) -> bool:
    if not slug:
        return False
    doc = await _find_by_slug(db, slug)
    return bool(doc and doc.get("is_active", True))


async def create(db, data: dict) -> dict:
    slug = _normalize_slug(data.get("slug", ""))
    name = (data.get("name") or "").strip()
    if not slug or not name:
        raise ValueError("slug and name are required")
    if await _find_by_slug(db, slug):
        raise ValueError(f"Category '{slug}' already exists")

    services = [_normalize_service(s) for s in (data.get("default_services") or [])]
    max_sort = await db[COLLECTION].count_documents({})
    now = _now()
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "title": name,
        "icon": (data.get("icon") or "briefcase").strip(),
        "hero_title": data.get("hero_title") or name,
        "hero_sub": (data.get("description") or "").strip(),
        "services": [s["name"] for s in services],
        "default_services": services,
        "benefits": data.get("benefits") or [],
        "demo_chat": data.get("demo_chat") or [],
        "business_name": data.get("business_name", ""),
        "seo_title": data.get("seo_title", f"WhatsApp Automation for {name}"),
        "seo_desc": data.get("seo_desc", ""),
        "is_active": True,
        "is_system": False,
        "sort_order": max_sort,
        "created_at": now,
        "updated_at": now,
    }
    await db[COLLECTION].insert_one(doc)
    doc.pop("_id", None)
    return _project(doc)


async def update(db, slug: str, data: dict) -> dict:
    doc = await _find_by_slug(db, slug)
    if not doc:
        raise ValueError("Category not found")
    fields = {}
    if "name" in data and data["name"] is not None:
        fields["title"] = data["name"].strip()
    if "icon" in data and data["icon"] is not None:
        fields["icon"] = data["icon"].strip()
    if "description" in data and data["description"] is not None:
        fields["hero_sub"] = data["description"].strip()
    if "is_active" in data and data["is_active"] is not None:
        fields["is_active"] = bool(data["is_active"])
    if not fields:
        return _project(doc)
    fields["updated_at"] = _now()
    await db[COLLECTION].update_one({"slug": doc["slug"]}, {"$set": fields})
    refreshed = await db[COLLECTION].find_one({"slug": doc["slug"]}, {"_id": 0})
    return _project(refreshed)


async def delete(db, slug: str) -> bool:
    doc = await _find_by_slug(db, slug)
    if not doc:
        return False
    if doc.get("is_system", True):
        await db[COLLECTION].update_one({"slug": doc["slug"]}, {"$set": {"is_active": False, "updated_at": _now()}})
        return True
    r = await db[COLLECTION].delete_one({"slug": doc["slug"]})
    return r.deleted_count > 0


# ─── Nested service CRUD ──────────────────────────────
async def add_service(db, slug: str, svc_data: dict) -> dict:
    doc = await _find_by_slug(db, slug)
    if not doc:
        raise ValueError("Category not found")
    _ensure_default_services(doc)
    svc = _normalize_service(svc_data)
    if not svc["name"]:
        raise ValueError("Service name is required")
    current = doc.get("default_services") or []
    current.append(svc)
    # Keep flat `services` list in sync for legacy consumers
    await db[COLLECTION].update_one(
        {"slug": doc["slug"]},
        {"$set": {
            "default_services": current,
            "services": [s["name"] for s in current],
            "updated_at": _now(),
        }},
    )
    return svc


async def update_service(db, slug: str, service_id: str, svc_data: dict) -> Optional[dict]:
    doc = await _find_by_slug(db, slug)
    if not doc:
        raise ValueError("Category not found")
    _ensure_default_services(doc)
    services = doc.get("default_services") or []
    updated = None
    new_list = []
    for s in services:
        if s.get("id") == service_id:
            merged = {**s, **{k: v for k, v in svc_data.items() if v is not None}}
            merged = _normalize_service({**merged, "id": service_id})
            updated = merged
            new_list.append(merged)
        else:
            new_list.append(s)
    if not updated:
        return None
    await db[COLLECTION].update_one(
        {"slug": doc["slug"]},
        {"$set": {
            "default_services": new_list,
            "services": [s["name"] for s in new_list],
            "updated_at": _now(),
        }},
    )
    return updated


async def delete_service(db, slug: str, service_id: str) -> bool:
    doc = await _find_by_slug(db, slug)
    if not doc:
        return False
    _ensure_default_services(doc)
    services = doc.get("default_services") or []
    new_list = [s for s in services if s.get("id") != service_id]
    if len(new_list) == len(services):
        return False
    await db[COLLECTION].update_one(
        {"slug": doc["slug"]},
        {"$set": {
            "default_services": new_list,
            "services": [s["name"] for s in new_list],
            "updated_at": _now(),
        }},
    )
    return True
