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

        meta = {"doc_id": doc_id, "title": title[:120]}
        if metadata:
            meta.update({k: str(v)[:200] for k, v in metadata.items() if v is not None})

        op = await asyncio.to_thread(
            client.file_search_stores.upload_to_file_search_store,
            file=path,
            file_search_store_name=store_name,
            config={
                "display_name": title[:120] or doc_id,
                "custom_metadata": [
                    types.CustomMetadata(key=k, string_value=str(v))
                    for k, v in meta.items()
                ],
            },
        )
        # Wait for indexing (max 30s)
        for _ in range(30):
            done = getattr(op, "done", True)
            if done:
                break
            await asyncio.sleep(1)
            try:
                op = await asyncio.to_thread(client.operations.get, op)
            except Exception:
                break
        try:
            os.unlink(path)
        except Exception:
            pass
        return True
    except Exception as e:
        logger.warning(f"upload_text_doc failed (store={store_name} doc={doc_id}): {e}")
        return False


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

    pushed = 0
    skipped = 0

    async for c in db.memoraai_content.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "title": 1, "content": 1, "summary": 1,
         "extracted_text": 1, "url": 1},
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
            metadata={"source": "memoraai_content", "url": c.get("url", "")},
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
            metadata={"source": "website", "url": p.get("url", ""),
                      "page_type": p.get("type", "other")},
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
