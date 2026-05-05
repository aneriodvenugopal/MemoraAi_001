"""
RAG Auto-Sync — push individual content/project/property documents into the
tenant's Gemini File Search store the moment they are created or updated.

Why per-doc instead of bulk:
  • A tenant can ask "Polaris RERA enti?" 3 seconds after admin types it in
    — the AI must see it WITHIN those seconds.
  • Bulk sync re-uploads everything (cost + time). Per-doc keeps the store
    fresh with one upload per change.

Public API:
  sync_content(db, tenant_id, content_id)
  sync_project(db, tenant_id, project_id)
  sync_property(db, tenant_id, property_id)
  delete_doc(db, tenant_id, doc_id)

All helpers are best-effort: they swallow failures (logging only) so a
sync hiccup never breaks the user-facing CRUD response.
"""
from __future__ import annotations
import logging
from typing import Any, Dict, Optional

from . import gemini_file_search as gfs

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
# Doc-id helpers — keep deterministic so updates overwrite cleanly.
# ─────────────────────────────────────────────────────────────────────
def doc_id_content(content_id: str) -> str:
    return f"content_{content_id}"


def doc_id_project(project_id: str) -> str:
    return f"project_{project_id}"


def doc_id_property(property_id: str) -> str:
    return f"property_{property_id}"


# ─────────────────────────────────────────────────────────────────────
# Doc-text formatters — the *exact* text the AI will see.
# Keep them factual, machine-parseable, with EVERY number/RERA/code
# reproduced verbatim. The LLM will be told to never paraphrase numbers.
# ─────────────────────────────────────────────────────────────────────
def _format_project_text(project: Dict[str, Any]) -> str:
    p = project
    lines = [f"# Project: {p.get('name','')}"]
    if p.get("rera_number"):
        lines.append(f"RERA Number: {p['rera_number']}")
    if p.get("project_type"):
        lines.append(f"Type: {p['project_type']}")
    loc_bits = [p.get("location"), p.get("address"), p.get("city"),
                p.get("state"), p.get("pincode")]
    loc = ", ".join([x for x in loc_bits if x])
    if loc:
        lines.append(f"Location: {loc}")
    if p.get("status"):
        lines.append(f"Status: {p['status']}")
    if p.get("total_area") is not None:
        lines.append(f"Total Area: {p['total_area']}")
    if p.get("total_units"):
        lines.append(f"Total Units: {p['total_units']}")
    if p.get("price_per_unit") is not None:
        lines.append(f"Base Price per Unit: {p['price_per_unit']}")
    if p.get("available_units") is not None:
        lines.append(
            f"Inventory: available={p.get('available_units',0)}, "
            f"booked={p.get('sold_units',0)}, blocked={p.get('blocked_units',0)}"
        )
    if p.get("start_date"):
        lines.append(f"Start Date: {p['start_date']}")
    if p.get("expected_completion"):
        lines.append(f"Expected Completion: {p['expected_completion']}")
    if p.get("amenities"):
        lines.append("Amenities: " + ", ".join(map(str, p["amenities"][:30])))
    if p.get("features"):
        lines.append("Features: " + ", ".join(map(str, p["features"][:30])))
    if p.get("description"):
        lines.append("")
        lines.append("Description:")
        lines.append(str(p["description"])[:4000])
    if p.get("brochure_url"):
        lines.append(f"Brochure: {p['brochure_url']}")
    return "\n".join(lines)


def _format_property_text(
    prop: Dict[str, Any], project: Optional[Dict[str, Any]] = None
) -> str:
    p = prop
    project = project or {}
    pname = project.get("name") or "Project"
    lines = [
        f"# Property: {p.get('property_number','')} (in {pname})",
    ]
    if project.get("rera_number"):
        lines.append(f"Project RERA: {project['rera_number']}")
    if p.get("block"):
        lines.append(f"Block: {p['block']}")
    if p.get("floor") is not None:
        lines.append(f"Floor: {p['floor']}")
    if p.get("facing"):
        lines.append(f"Facing: {p['facing']}")
    if p.get("area") is not None:
        unit = p.get("unit") or "sqft"
        lines.append(f"Area: {p['area']} {unit}")
    if p.get("length") and p.get("width"):
        lines.append(f"Dimensions: {p['length']} x {p['width']}")
    if p.get("price") is not None:
        # Price stored verbatim — never round.
        lines.append(f"Price: {p['price']}")
    if p.get("price_per_sqft") is not None:
        lines.append(f"Price per sqft: {p['price_per_sqft']}")
    if p.get("booking_amount") is not None:
        lines.append(f"Booking Amount: {p['booking_amount']}")
    if p.get("contact_for_price"):
        lines.append("Note: Contact for price (price is not publicly listed)")
    # Status comes via status_id; surface it as raw id so caller can map.
    if p.get("status_id"):
        lines.append(f"Status: {p['status_id']}")
    if p.get("survey_number"):
        lines.append(f"Survey Number: {p['survey_number']}")
    if p.get("registration_number"):
        lines.append(f"Registration Number: {p['registration_number']}")
    if p.get("approval_number"):
        lines.append(f"Approval Number: {p['approval_number']}")
    if p.get("google_address"):
        lines.append(f"Address: {p['google_address']}")
    if p.get("features"):
        lines.append("Features: " + ", ".join(map(str, p["features"][:20])))
    project_loc_bits = [project.get("location"), project.get("city"),
                        project.get("state")]
    ploc = ", ".join([x for x in project_loc_bits if x])
    if ploc:
        lines.append(f"Project Location: {ploc}")
    return "\n".join(lines)


def _format_content_text(c: Dict[str, Any]) -> str:
    body = (
        c.get("extracted_text")
        or c.get("content")
        or c.get("description")
        or c.get("summary")
        or ""
    ).strip()
    head = [f"# {c.get('title','Document')}"]
    if c.get("content_type"):
        head.append(f"Type: {c['content_type']}")
    if c.get("url"):
        head.append(f"Source URL: {c['url']}")
    if c.get("tags"):
        head.append("Tags: " + ", ".join(map(str, c.get("tags") or [])))
    if body:
        head.append("")
        head.append(body[:60000])
    return "\n".join(head)


# ─────────────────────────────────────────────────────────────────────
# Public sync helpers (background-safe, exception-swallowing).
# ─────────────────────────────────────────────────────────────────────
async def _ensure_store(db, tenant_id: str) -> Optional[str]:
    if not gfs.is_enabled():
        return None
    return await gfs.ensure_tenant_store(db, tenant_id)


async def _upsert_doc(
    db, tenant_id: str, doc_id: str, title: str, text: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    if not text or len(text.strip()) < 10:
        return False
    store = await _ensure_store(db, tenant_id)
    if not store:
        return False
    # Delete-then-upload to keep it idempotent on edits.
    try:
        await gfs.delete_doc(store, doc_id)
    except Exception as e:  # noqa: BLE001
        logger.debug(f"rag_autosync: prior delete skipped: {e}")
    ok = await gfs.upload_text_doc(
        store_name=store, doc_id=doc_id, title=title, text=text,
        metadata=metadata or {},
    )
    if ok:
        logger.info(f"RAG autosync OK tenant={tenant_id} doc={doc_id}")
    else:
        logger.warning(f"RAG autosync FAIL tenant={tenant_id} doc={doc_id}")
    return ok


async def sync_content(db, tenant_id: str, content_id: str) -> bool:
    try:
        c = await db.memoraai_content.find_one(
            {"id": content_id, "tenant_id": tenant_id}, {"_id": 0}
        )
        if not c or c.get("deleted_at") or c.get("is_active") is False:
            await delete_doc(db, tenant_id, doc_id_content(content_id))
            return False
        text = _format_content_text(c)
        return await _upsert_doc(
            db, tenant_id, doc_id_content(content_id),
            c.get("title") or "Manual content", text,
            {"source": "memoraai_content", "url": c.get("url", "")},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception(f"sync_content failed: {e}")
        return False


async def sync_project(db, tenant_id: str, project_id: str) -> bool:
    try:
        p = await db.projects.find_one(
            {"id": project_id, "tenant_id": tenant_id}, {"_id": 0}
        )
        if not p or p.get("deleted_at"):
            await delete_doc(db, tenant_id, doc_id_project(project_id))
            return False
        text = _format_project_text(p)
        return await _upsert_doc(
            db, tenant_id, doc_id_project(project_id),
            f"Project: {p.get('name','')}", text,
            {"source": "projects", "rera": p.get("rera_number", "")},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception(f"sync_project failed: {e}")
        return False


async def sync_property(db, tenant_id: str, property_id: str) -> bool:
    try:
        prop = await db.properties.find_one(
            {"id": property_id, "tenant_id": tenant_id}, {"_id": 0}
        )
        if not prop or prop.get("deleted_at"):
            await delete_doc(db, tenant_id, doc_id_property(property_id))
            return False
        project = await db.projects.find_one(
            {"id": prop.get("project_id")}, {"_id": 0}
        ) or {}
        text = _format_property_text(prop, project)
        return await _upsert_doc(
            db, tenant_id, doc_id_property(property_id),
            f"{project.get('name','')} - {prop.get('property_number','')}",
            text,
            {"source": "properties",
             "project_id": prop.get("project_id", ""),
             "rera": project.get("rera_number", "")},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception(f"sync_property failed: {e}")
        return False


async def delete_doc(db, tenant_id: str, doc_id: str) -> bool:
    """Best-effort delete — used on hard/soft delete of any synced row."""
    try:
        if not gfs.is_enabled():
            return False
        store = await gfs.get_tenant_store(db, tenant_id)
        if not store:
            return False
        return await gfs.delete_doc(store, doc_id)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"rag_autosync.delete_doc failed: {e}")
        return False
