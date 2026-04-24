"""Dynamic Business Category Registry — MongoDB-backed.

Replaces the static CATEGORY_CONFIGS dict with a per-install registry the
SaaS admin can CRUD at runtime. Services under each category are also dynamic.

Schema (collection: `memoraai_category_registry`):
    {
        "id": uuid,
        "slug": "software_it",
        "name": "Software / IT Services",
        "icon": "code",
        "description": "...",
        "default_services": [
            {"id": uuid, "name": "...", "description": "...", "duration_mins": 30, "price": 0}
        ],
        "is_active": true,
        "is_system": false,
        "sort_order": 0,
        "created_at": "...", "updated_at": "..."
    }

The static `CATEGORY_CONFIGS` is used once on first boot as the seed so
existing installs keep the same defaults, and then the DB is the source of truth.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from models.memoraai import CATEGORY_CONFIGS

logger = logging.getLogger(__name__)

COLLECTION = "memoraai_category_registry"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_service(svc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": svc.get("id") or str(uuid.uuid4()),
        "name": (svc.get("name") or "").strip(),
        "description": (svc.get("description") or "").strip(),
        "duration_mins": int(svc.get("duration_mins") or 0),
        "price": float(svc.get("price") or 0),
    }


async def ensure_seeded(db) -> int:
    """Seed the registry from CATEGORY_CONFIGS the first time only.
    Returns the number of categories inserted."""
    existing = await db[COLLECTION].count_documents({})
    if existing > 0:
        return 0
    inserted = 0
    now = _now()
    for idx, (slug, cfg) in enumerate(CATEGORY_CONFIGS.items()):
        doc = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "name": cfg.get("name", slug.replace("_", " ").title()),
            "icon": cfg.get("icon", ""),
            "description": cfg.get("description", ""),
            "default_services": [_normalize_service(s) for s in cfg.get("default_services", [])],
            "is_active": True,
            "is_system": True,
            "sort_order": idx,
            "created_at": now,
            "updated_at": now,
        }
        await db[COLLECTION].insert_one(doc)
        inserted += 1
    logger.info(f"Category registry seeded with {inserted} categories")
    return inserted


async def get_all(db, active_only: bool = True) -> List[dict]:
    q = {"is_active": True} if active_only else {}
    cats = await db[COLLECTION].find(q, {"_id": 0}).sort("sort_order", 1).to_list(500)
    return cats


async def get(db, slug: str) -> Optional[dict]:
    return await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})


async def is_supported(db, slug: str) -> bool:
    if not slug:
        return False
    return (await db[COLLECTION].count_documents({"slug": slug, "is_active": True})) > 0


async def create(db, data: dict) -> dict:
    slug = (data.get("slug") or "").strip().lower().replace(" ", "_")
    name = (data.get("name") or "").strip()
    if not slug or not name:
        raise ValueError("slug and name are required")
    if await db[COLLECTION].find_one({"slug": slug}):
        raise ValueError(f"Category '{slug}' already exists")

    services = [_normalize_service(s) for s in (data.get("default_services") or [])]
    max_sort = await db[COLLECTION].count_documents({})
    now = _now()
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "name": name,
        "icon": (data.get("icon") or "briefcase").strip(),
        "description": (data.get("description") or "").strip(),
        "default_services": services,
        "is_active": True,
        "is_system": False,
        "sort_order": max_sort,
        "created_at": now,
        "updated_at": now,
    }
    await db[COLLECTION].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def update(db, slug: str, data: dict) -> dict:
    cat = await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise ValueError("Category not found")
    update_fields = {}
    if "name" in data and data["name"] is not None:
        update_fields["name"] = data["name"].strip()
    if "icon" in data and data["icon"] is not None:
        update_fields["icon"] = data["icon"].strip()
    if "description" in data and data["description"] is not None:
        update_fields["description"] = data["description"].strip()
    if "is_active" in data and data["is_active"] is not None:
        update_fields["is_active"] = bool(data["is_active"])
    if not update_fields:
        return cat
    update_fields["updated_at"] = _now()
    await db[COLLECTION].update_one({"slug": slug}, {"$set": update_fields})
    return await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})


async def delete(db, slug: str) -> bool:
    cat = await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})
    if not cat:
        return False
    if cat.get("is_system"):
        # soft-delete system categories
        await db[COLLECTION].update_one({"slug": slug}, {"$set": {"is_active": False, "updated_at": _now()}})
        return True
    r = await db[COLLECTION].delete_one({"slug": slug})
    return r.deleted_count > 0


# ─── Service CRUD nested within a category ─────────────────────
async def add_service(db, slug: str, svc_data: dict) -> dict:
    cat = await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise ValueError("Category not found")
    svc = _normalize_service(svc_data)
    if not svc["name"]:
        raise ValueError("Service name is required")
    await db[COLLECTION].update_one(
        {"slug": slug},
        {"$push": {"default_services": svc}, "$set": {"updated_at": _now()}},
    )
    return svc


async def update_service(db, slug: str, service_id: str, svc_data: dict) -> Optional[dict]:
    cat = await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise ValueError("Category not found")
    services = cat.get("default_services") or []
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
        {"slug": slug},
        {"$set": {"default_services": new_list, "updated_at": _now()}},
    )
    return updated


async def delete_service(db, slug: str, service_id: str) -> bool:
    cat = await db[COLLECTION].find_one({"slug": slug}, {"_id": 0})
    if not cat:
        return False
    services = cat.get("default_services") or []
    new_list = [s for s in services if s.get("id") != service_id]
    if len(new_list) == len(services):
        return False
    await db[COLLECTION].update_one(
        {"slug": slug},
        {"$set": {"default_services": new_list, "updated_at": _now()}},
    )
    return True
