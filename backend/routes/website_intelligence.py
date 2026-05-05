"""
Website Intelligence Engine API.

Tenant-scoped endpoints for crawling, viewing, and managing the
indexed website content used by the AI reply engine.
"""
from __future__ import annotations
import csv
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from middleware.auth import get_current_user
from services import website_crawler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/website-intel", tags=["website-intelligence"])


def get_db(request: Request):
    return request.app.state.db


def _tid(user: dict) -> str:
    tid = user.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=400, detail="No tenant assigned to this user")
    return tid


# ───────── Models ─────────
class SourceUpsert(BaseModel):
    primary_url: str
    additional_urls: List[str] = Field(default_factory=list)
    depth: str = "medium"  # light | medium | deep
    schedule: str = "manual"  # manual | daily | every_6h | weekly
    auto_remove_dead: bool = True
    reindex_changed_only: bool = True


class ManualContentIn(BaseModel):
    title: str
    body: str


class TogglePageIn(BaseModel):
    page_ids: List[str]
    use_for_ai: bool = True


# ───────── Source CRUD ─────────
@router.get("/source")
async def get_source(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_db(request)
    tid = _tid(current_user)
    src = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0})
    return {"source": src}


@router.post("/source")
async def upsert_source(
    payload: SourceUpsert,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    if payload.depth not in website_crawler.DEPTH_PRESETS:
        raise HTTPException(status_code=400, detail="depth must be light|medium|deep")
    if payload.schedule not in ("manual", "daily", "every_6h", "weekly"):
        raise HTTPException(status_code=400, detail="invalid schedule")

    primary = website_crawler._normalize_url(payload.primary_url)
    if not primary.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="primary_url must include http(s)://")

    existing = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0})
    src_id = existing.get("id") if existing else f"src_{uuid.uuid4().hex[:10]}"
    doc = {
        "id": src_id,
        "tenant_id": tid,
        "primary_url": primary,
        "additional_urls": [website_crawler._normalize_url(u) for u in payload.additional_urls if u],
        "depth": payload.depth,
        "schedule": payload.schedule,
        "auto_remove_dead": payload.auto_remove_dead,
        "reindex_changed_only": payload.reindex_changed_only,
        "updated_at": datetime.now(timezone.utc),
        "status": existing.get("status", "idle") if existing else "idle",
    }
    if not existing:
        doc["created_at"] = datetime.now(timezone.utc)
    await db.website_sources.update_one(
        {"tenant_id": tid}, {"$set": doc}, upsert=True
    )
    return {"source": doc}


@router.post("/reset")
async def reset_index(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_db(request)
    tid = _tid(current_user)
    src = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0, "id": 1})
    if not src:
        raise HTTPException(status_code=404, detail="No website source")
    sid = src["id"]
    await db.website_pages.delete_many({"tenant_id": tid, "source_id": sid})
    await db.website_chunks.delete_many({"tenant_id": tid, "source_id": sid})
    await db.website_structured_data.delete_many({"tenant_id": tid, "source_id": sid})
    await db.website_sync_logs.delete_many({"tenant_id": tid, "source_id": sid})
    await db.website_sources.update_one(
        {"id": sid}, {"$set": {"status": "idle", "pages_indexed": 0, "chunks_count": 0}}
    )
    return {"success": True}


# ───────── Sync ─────────
async def _run_crawl_bg(db, tid: str, sid: str, primary: str, extras: List[str],
                        depth: str, sync_id: str):
    try:
        await db.website_sources.update_one(
            {"id": sid, "tenant_id": tid},
            {"$set": {"status": "crawling"}}
        )
        await website_crawler.run_crawl(db, tid, sid, primary, extras, depth, sync_id)
    except Exception as e:
        logger.exception(f"crawl failed for tenant={tid}: {e}")
        await db.website_sync_logs.update_one(
            {"id": sync_id},
            {"$set": {"status": "error", "error": str(e),
                      "completed_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await db.website_sources.update_one(
            {"id": sid, "tenant_id": tid},
            {"$set": {"status": "error"}}
        )


@router.post("/sync")
async def start_sync(
    request: Request,
    background: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    src = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0})
    if not src:
        raise HTTPException(status_code=404, detail="Configure a website first")

    sync_id = f"sync_{uuid.uuid4().hex[:10]}"
    await db.website_sync_logs.insert_one({
        "id": sync_id,
        "tenant_id": tid,
        "source_id": src["id"],
        "primary_url": src["primary_url"],
        "depth_preset": src["depth"],
        "status": "queued",
        "started_at": datetime.now(timezone.utc),
    })

    background.add_task(
        _run_crawl_bg, db, tid, src["id"], src["primary_url"],
        src.get("additional_urls", []), src.get("depth", "medium"), sync_id,
    )
    return {"sync_id": sync_id, "status": "queued"}


@router.get("/sync/{sync_id}")
async def get_sync_status(
    sync_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    log = await db.website_sync_logs.find_one(
        {"id": sync_id, "tenant_id": tid}, {"_id": 0}
    )
    if not log:
        raise HTTPException(status_code=404, detail="Sync not found")
    return log


@router.get("/syncs")
async def list_syncs(
    request: Request,
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
):
    db = get_db(request)
    tid = _tid(current_user)
    items = await db.website_sync_logs.find(
        {"tenant_id": tid}, {"_id": 0}
    ).sort("started_at", -1).to_list(limit)
    return {"items": items}


# ───────── Pages ─────────
@router.get("/pages")
async def list_pages(
    request: Request,
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    use_for_ai: Optional[bool] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
):
    db = get_db(request)
    tid = _tid(current_user)
    query: dict = {"tenant_id": tid}
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if use_for_ai is not None:
        query["use_for_ai"] = use_for_ai
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"url": {"$regex": q, "$options": "i"}},
        ]
    total = await db.website_pages.count_documents(query)
    items = await db.website_pages.find(
        query,
        {"_id": 0, "cleaned_text": 0},
    ).sort("last_crawled_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": items}


@router.get("/pages/{page_id}")
async def get_page(
    page_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    page = await db.website_pages.find_one(
        {"id": page_id, "tenant_id": tid}, {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404)
    chunks = await db.website_chunks.find(
        {"page_id": page_id, "tenant_id": tid}, {"_id": 0}
    ).sort("chunk_index", 1).to_list(100)
    return {"page": page, "chunks": chunks}


@router.post("/pages/toggle")
async def toggle_pages(
    payload: TogglePageIn,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    res = await db.website_pages.update_many(
        {"tenant_id": tid, "id": {"$in": payload.page_ids}},
        {"$set": {"use_for_ai": payload.use_for_ai}},
    )
    return {"updated": res.modified_count}


@router.get("/pages.csv")
async def export_pages_csv(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    items = await db.website_pages.find(
        {"tenant_id": tid},
        {"_id": 0, "url": 1, "title": 1, "type": 1, "status": 1,
         "word_count": 1, "use_for_ai": 1, "last_crawled_at": 1},
    ).to_list(2000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["url", "title", "type", "status", "word_count", "use_for_ai", "last_crawled_at"])
    for it in items:
        w.writerow([it.get("url"), it.get("title"), it.get("type"), it.get("status"),
                    it.get("word_count"), it.get("use_for_ai"), it.get("last_crawled_at")])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=website_pages.csv"},
    )


# ───────── Structured data ─────────
@router.get("/structured")
async def get_structured(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_db(request)
    tid = _tid(current_user)
    doc = await db.website_structured_data.find_one(
        {"tenant_id": tid}, {"_id": 0}
    )
    return {"data": doc or {}}


# ───────── Knowledge stats ─────────
@router.get("/stats")
async def stats(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_db(request)
    tid = _tid(current_user)
    src = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0}) or {}
    pages = await db.website_pages.count_documents({"tenant_id": tid})
    chunks = await db.website_chunks.count_documents({"tenant_id": tid})
    failed = await db.website_pages.count_documents({"tenant_id": tid, "status": "error"})
    last_log = await db.website_sync_logs.find_one(
        {"tenant_id": tid}, {"_id": 0}, sort=[("started_at", -1)]
    ) or {}
    return {
        "source": src,
        "pages_indexed": pages,
        "chunks_created": chunks,
        "failed_pages": failed,
        "last_sync_at": last_log.get("completed_at") or last_log.get("started_at"),
        "last_sync_status": last_log.get("status"),
        "last_duration_ms": last_log.get("duration_ms"),
    }


# ───────── Manual content (free-form notes) ─────────
@router.post("/manual-content")
async def add_manual_content(
    payload: ManualContentIn,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="body required")

    doc_id = f"manual_{uuid.uuid4().hex[:10]}"
    page_id = f"manual_page_{uuid.uuid4().hex[:8]}"
    src = await db.website_sources.find_one({"tenant_id": tid}, {"_id": 0, "id": 1}) or {}
    src_id = src.get("id", "manual")

    await db.website_pages.insert_one({
        "id": page_id, "tenant_id": tid, "source_id": src_id,
        "url": f"manual://{doc_id}", "title": payload.title.strip()[:200],
        "type": "manual", "status": "indexed",
        "word_count": len(payload.body.split()), "use_for_ai": True,
        "first_seen_at": datetime.now(timezone.utc),
        "last_crawled_at": datetime.now(timezone.utc),
        "cleaned_text": payload.body[:60000],
    })
    chunks = website_crawler._chunk(payload.body)
    for i, ch in enumerate(chunks):
        await db.website_chunks.insert_one({
            "id": f"{page_id}_chunk_{i}",
            "tenant_id": tid, "source_id": src_id,
            "page_id": page_id, "url": f"manual://{doc_id}",
            "page_type": "manual", "title": payload.title,
            "chunk_index": i, "text": ch,
            "word_count": len(ch.split()),
            "created_at": datetime.now(timezone.utc),
        })
    return {"page_id": page_id, "chunks_created": len(chunks)}


# ───────── Test retrieval ─────────
class SearchIn(BaseModel):
    query: str
    k: int = 5


@router.post("/test-search")
async def test_search(
    payload: SearchIn,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db(request)
    tid = _tid(current_user)
    hits = await website_crawler.search_chunks(db, tid, payload.query, payload.k)
    return {"query": payload.query, "hits": hits}


# ───────── Gemini Managed RAG (File Search) ─────────
@router.get("/rag/status")
async def rag_status(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_db(request)
    tid = _tid(current_user)
    from services import gemini_file_search as gfs
    t = await db.tenants.find_one(
        {"id": tid},
        {"_id": 0, "gemini_file_search_store": 1, "gemini_store_synced_at": 1,
         "gemini_store_doc_count": 1, "business_category": 1,
         "category_slug": 1},
    ) or {}
    store_name = t.get("gemini_file_search_store")
    breakdown: dict = {}
    if gfs.is_enabled() and store_name:
        try:
            breakdown = await gfs.store_breakdown(store_name)
        except Exception as e:  # noqa: BLE001
            logger.warning(f"breakdown failed: {e}")
            breakdown = {}
    return {
        "enabled": gfs.is_enabled(),
        "store_name": store_name,
        "last_synced_at": t.get("gemini_store_synced_at"),
        "doc_count": breakdown.get("total", t.get("gemini_store_doc_count", 0)),
        "business_category": (t.get("business_category")
                              or t.get("category_slug") or "general"),
        "breakdown": breakdown,
    }


@router.post("/rag/sync")
async def rag_sync(
    request: Request,
    background: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Manually push (or re-push) all tenant knowledge to the Gemini store."""
    db = get_db(request)
    tid = _tid(current_user)
    from services import gemini_file_search as gfs
    if not gfs.is_enabled():
        raise HTTPException(status_code=400, detail="Gemini File Search is disabled")

    async def _go():
        try:
            r = await gfs.bulk_sync_tenant_knowledge(db, tid)
            logger.info(f"manual RAG sync done: {r}")
        except Exception as e:
            logger.exception(f"manual RAG sync failed: {e}")

    background.add_task(_go)
    return {"status": "queued"}
