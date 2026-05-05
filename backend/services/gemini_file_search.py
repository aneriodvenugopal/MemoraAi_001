"""
Gemini Managed RAG — per-tenant File Search Store integration.

Each tenant gets ONE FileSearchStore on the Gemini backend:
    fileSearchStores/memora_<tenant_id>

Knowledge sources (memoraai_content uploads, website_intelligence crawl
chunks, manual content) are pushed as documents into that store. The
LLM router then attaches the store as a tool on every reply so Gemini
performs server-side semantic retrieval.

Why managed RAG vs in-prompt stuffing:
  • sub-second responses (no 4000-char prompt prefix)
  • exact numbers preserved (no LLM paraphrase)
  • scales to 10k+ docs per tenant
  • free retrieval ($0.15/1M tokens only at index time)

Required: GEMINI_API_KEY (direct, not via emergent — File Search is
Gemini-native and emergentintegrations doesn't yet expose it).
"""
from __future__ import annotations
import logging
import os
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

_API_KEY = os.environ.get("GEMINI_API_KEY", "")
_client: Optional[genai.Client] = None


def _get_client() -> Optional[genai.Client]:
    global _client
    if _client is None and _API_KEY:
        try:
            _client = genai.Client(api_key=_API_KEY)
        except Exception as e:
            logger.warning(f"Gemini client init failed: {e}")
            _client = None
    return _client


def is_enabled() -> bool:
    """File Search is opt-in via env flag (default ON when key present)."""
    if not _API_KEY:
        return False
    flag = os.environ.get("USE_GEMINI_FILE_SEARCH", "true").lower()
    return flag in ("1", "true", "yes")


def _store_name_for_tenant(tenant_id: str) -> str:
    """Deterministic store-name slug for a tenant."""
    safe = "".join(c for c in tenant_id if c.isalnum() or c == "-")[:40] or "tenant"
    return f"memora-{safe}"


# ────────────────────────────────────────────────────────────────────
# Store management
# ────────────────────────────────────────────────────────────────────
async def ensure_tenant_store(db, tenant_id: str) -> Optional[str]:
    """
    Ensure a Gemini FileSearchStore exists for this tenant. Returns the
    full resource name (e.g. "fileSearchStores/abc123") or None if disabled.
    Cached on the tenants document under `gemini_file_search_store`.
    """
    if not is_enabled():
        return None
    client = _get_client()
    if not client:
        return None

    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "gemini_file_search_store": 1})
    cached = (tenant or {}).get("gemini_file_search_store")
    if cached:
        # Quick existence check (best-effort)
        try:
            store = await asyncio.to_thread(
                client.file_search_stores.get, name=cached
            )
            if store and getattr(store, "name", None):
                return store.name
        except Exception:
            # Store deleted upstream — fall through and recreate
            logger.info(f"Cached store {cached} missing, recreating for {tenant_id}")

    display = _store_name_for_tenant(tenant_id)
    try:
        store = await asyncio.to_thread(
            client.file_search_stores.create,
            config={"display_name": display},
        )
    except Exception as e:
        logger.error(f"create file_search_store failed for {tenant_id}: {e}")
        return None

    name = getattr(store, "name", None)
    if not name:
        return None

    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "gemini_file_search_store": name,
            "gemini_store_created_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.info(f"Created Gemini File Search store for tenant={tenant_id}: {name}")
    return name


async def upload_text_doc(
    store_name: str,
    doc_id: str,
    title: str,
    text: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Upload a plain-text document into a tenant store. Idempotent by `doc_id`
    (caller should clear existing first if updating). Returns True on success.
    """
    if not is_enabled() or not text:
        return False
    client = _get_client()
    if not client:
        return False

    try:
        # File Search accepts text/plain natively; we wrap in a tempfile
        import tempfile
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            f.write(f"# {title}\n\n{text}")
            path = f.name
        ok = await _upload_file_to_store(
            client, store_name, doc_id, title, path, metadata
        )
        try:
            os.unlink(path)
        except Exception:
            pass
        return ok
    except Exception as e:
        logger.warning(f"upload_text_doc failed (store={store_name} doc={doc_id}): {e}")
        return False


async def upload_native_file(
    store_name: str,
    doc_id: str,
    title: str,
    file_path: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Upload a PDF / DOCX / etc. file directly into a tenant store.

    Gemini File Search parses these formats server-side, so we don't need
    to extract text first. The caller owns ``file_path`` (we don't delete it).
    """
    if not is_enabled() or not file_path or not os.path.exists(file_path):
        return False
    client = _get_client()
    if not client:
        return False
    try:
        return await _upload_file_to_store(
            client, store_name, doc_id, title, file_path, metadata
        )
    except Exception as e:
        logger.warning(f"upload_native_file failed (store={store_name} doc={doc_id}): {e}")
        return False


async def _upload_file_to_store(
    client, store_name: str, doc_id: str, title: str,
    path: str, metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Internal: upload an arbitrary local file to the given store with metadata."""
    meta = {"doc_id": doc_id, "title": (title or doc_id)[:120]}
    if metadata:
        meta.update({k: str(v)[:200] for k, v in metadata.items() if v is not None})
    op = await asyncio.to_thread(
        client.file_search_stores.upload_to_file_search_store,
        file=path,
        file_search_store_name=store_name,
        config={
            "display_name": (title or doc_id)[:120],
            "custom_metadata": [
                types.CustomMetadata(key=k, string_value=str(v))
                for k, v in meta.items()
            ],
        },
    )
    # Wait for indexing (max 60s for larger files)
    for _ in range(60):
        done = getattr(op, "done", True)
        if done:
            break
        await asyncio.sleep(1)
        try:
            op = await asyncio.to_thread(client.operations.get, op)
        except Exception:
            break
    return True



async def delete_doc(store_name: str, doc_id: str) -> bool:
    """Best-effort delete of all docs whose custom_metadata.doc_id == doc_id."""
    if not is_enabled():
        return False
    client = _get_client()
    if not client:
        return False
    try:
        docs = await asyncio.to_thread(
            client.file_search_stores.documents.list,
            parent=store_name,
        )
        for d in docs:
            md = {m.key: getattr(m, "string_value", "") for m in (d.custom_metadata or [])}
            if md.get("doc_id") == doc_id:
                # `config={"force": True}` recursively removes the doc + chunks;
                # without it the API returns 400 FAILED_PRECONDITION on
                # non-empty docs. Falls back to plain delete on older SDKs.
                try:
                    await asyncio.to_thread(
                        client.file_search_stores.documents.delete,
                        name=d.name, config={"force": True},
                    )
                except TypeError:
                    await asyncio.to_thread(
                        client.file_search_stores.documents.delete, name=d.name
                    )
        return True
    except Exception as e:
        logger.warning(f"delete_doc failed: {e}")
        return False


async def bulk_sync_tenant_knowledge(db, tenant_id: str) -> Dict[str, Any]:
    """
    Push the tenant's existing knowledge into their Gemini store.

    Sources:
      • memoraai_content        (manual brochures / FAQ pastes)
      • website_pages           (crawled site content)

    Idempotent at the FileSearchStore level only by display_name conflicts —
    we tag every doc with `doc_id` so callers can delete-then-add for updates.
    """
    if not is_enabled():
        return {"enabled": False}

    store_name = await ensure_tenant_store(db, tenant_id)
    if not store_name:
        return {"enabled": False, "error": "no_store"}

    # Tenant-level metadata applied to every doc — drives category-aware
    # retrieval inside the LLM router.
    t_doc = await db.tenants.find_one(
        {"id": tenant_id},
        {"_id": 0, "business_category": 1, "category_slug": 1,
         "company_name": 1, "name": 1},
    ) or {}
    base_meta = {
        "tenant_id": tenant_id,
        "business_category": (t_doc.get("business_category")
                              or t_doc.get("category_slug") or "general"),
        "business_name": (t_doc.get("company_name") or t_doc.get("name") or ""),
    }

    pushed = 0
    skipped = 0

    async for c in db.memoraai_content.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "title": 1, "content": 1, "summary": 1,
         "extracted_text": 1, "url": 1, "content_type": 1, "tags": 1,
         "category_slug": 1},
    ):
        body = (c.get("extracted_text") or c.get("content") or c.get("summary") or "").strip()
        if len(body) < 30:
            skipped += 1
            continue
        ok = await upload_text_doc(
            store_name=store_name,
            doc_id=f"content_{c.get('id')}",
            title=c.get("title") or "Manual content",
            text=body[:60000],
            metadata={**base_meta,
                      "source": "memoraai_content",
                      "content_type": c.get("content_type") or "document",
                      "url": c.get("url", ""),
                      "tags": ",".join(map(str, c.get("tags") or [])),
                      "category_slug": c.get("category_slug") or ""},
        )
        if ok:
            pushed += 1

    async for p in db.website_pages.find(
        {"tenant_id": tenant_id, "use_for_ai": {"$ne": False}},
        {"_id": 0, "id": 1, "title": 1, "url": 1, "type": 1, "cleaned_text": 1},
    ):
        body = (p.get("cleaned_text") or "").strip()
        if len(body) < 30:
            skipped += 1
            continue
        ok = await upload_text_doc(
            store_name=store_name,
            doc_id=f"page_{p.get('id')}",
            title=p.get("title") or p.get("url"),
            text=body[:60000],
            metadata={**base_meta,
                      "source": "website",
                      "content_type": "website_page",
                      "url": p.get("url", ""),
                      "page_type": p.get("type", "other")},
        )
        if ok:
            pushed += 1

    # Projects (RERA, location, base price, status)
    from . import rag_autosync as _rag  # local import avoids cycle
    async for proj in db.projects.find(
        {"tenant_id": tenant_id, "deleted_at": None},
        {"_id": 0},
    ):
        text = _rag._format_project_text(proj)
        if len(text) < 20:
            skipped += 1
            continue
        ok = await upload_text_doc(
            store_name=store_name,
            doc_id=_rag.doc_id_project(proj.get("id", "")),
            title=f"Project: {proj.get('name','')}",
            text=text,
            metadata={**base_meta,
                      "source": "projects",
                      "content_type": "project",
                      "project_id": proj.get("id", ""),
                      "project_type": proj.get("project_type", ""),
                      "rera": proj.get("rera_number", "")},
        )
        if ok:
            pushed += 1

    # Properties (per-plot price, area, RERA inherited from project)
    project_cache: Dict[str, Dict[str, Any]] = {}
    async for prop in db.properties.find(
        {"tenant_id": tenant_id, "deleted_at": None},
        {"_id": 0},
    ):
        pid = prop.get("project_id")
        if pid and pid not in project_cache:
            project_cache[pid] = await db.projects.find_one(
                {"id": pid}, {"_id": 0}
            ) or {}
        proj = project_cache.get(pid, {})
        text = _rag._format_property_text(prop, proj)
        if len(text) < 20:
            skipped += 1
            continue
        ok = await upload_text_doc(
            store_name=store_name,
            doc_id=_rag.doc_id_property(prop.get("id", "")),
            title=f"{proj.get('name','')} - {prop.get('property_number','')}",
            text=text,
            metadata={**base_meta,
                      "source": "properties",
                      "content_type": "property",
                      "project_id": pid or "",
                      "project_type": proj.get("project_type", ""),
                      "rera": proj.get("rera_number", "")},
        )
        if ok:
            pushed += 1

    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {
            "gemini_store_synced_at": datetime.now(timezone.utc).isoformat(),
            "gemini_store_doc_count": pushed,
        }},
    )
    return {
        "enabled": True,
        "store": store_name,
        "pushed": pushed,
        "skipped": skipped,
    }


async def get_tenant_store(db, tenant_id: str) -> Optional[str]:
    """Read-only fetch of cached store name (no creation)."""
    if not is_enabled():
        return None
    t = await db.tenants.find_one(
        {"id": tenant_id}, {"_id": 0, "gemini_file_search_store": 1}
    )
    return (t or {}).get("gemini_file_search_store")



async def store_breakdown(store_name: str) -> Dict[str, Any]:
    """List documents in a store and aggregate counts by source / category /
    content_type / project_id (read from custom_metadata). Best-effort."""
    if not is_enabled() or not store_name:
        return {"total": 0, "by_source": {}, "by_category": {},
                "by_content_type": {}, "by_project": {}}
    client = _get_client()
    if not client:
        return {"total": 0, "by_source": {}, "by_category": {},
                "by_content_type": {}, "by_project": {}}
    try:
        docs = await asyncio.to_thread(
            client.file_search_stores.documents.list, parent=store_name,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(f"store_breakdown list failed: {e}")
        return {"total": 0, "by_source": {}, "by_category": {},
                "by_content_type": {}, "by_project": {}}

    by_source: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    by_content_type: Dict[str, int] = {}
    by_project: Dict[str, int] = {}
    total = 0
    for d in docs:
        total += 1
        md = {m.key: getattr(m, "string_value", "") for m in (d.custom_metadata or [])}
        s = md.get("source") or "unknown"
        c = md.get("business_category") or "general"
        ct = md.get("content_type") or "unknown"
        pid = md.get("project_id") or ""
        by_source[s] = by_source.get(s, 0) + 1
        by_category[c] = by_category.get(c, 0) + 1
        by_content_type[ct] = by_content_type.get(ct, 0) + 1
        if pid:
            by_project[pid] = by_project.get(pid, 0) + 1
    return {
        "total": total,
        "by_source": by_source,
        "by_category": by_category,
        "by_content_type": by_content_type,
        "by_project": by_project,
    }
