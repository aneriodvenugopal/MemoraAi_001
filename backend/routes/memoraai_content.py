"""MemoraAI Content Library API - Media management for WhatsApp sharing"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from middleware.auth import get_current_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/content", tags=["memoraai-content"])

def get_db(request: Request):
    return request.app.state.db

CONTENT_TYPES = ["brochure", "image", "video", "link", "faq", "price_list", "template", "document", "note"]


@router.get("")
async def list_content(request: Request, content_type: str = None, page: int = 1, limit: int = 50):
    """List content library items"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id, "deleted_at": None}
    if content_type:
        query["content_type"] = content_type

    skip = (page - 1) * limit
    total = await db.memoraai_content.count_documents(query)
    items = await db.memoraai_content.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page}


@router.post("")
async def create_content(request: Request):
    """Create content library item"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    item = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "title": body.get("title", ""),
        "content_type": body.get("content_type", "document"),
        "description": body.get("description", ""),
        "url": body.get("url", ""),
        "file_name": body.get("file_name", ""),
        "file_size": body.get("file_size", 0),
        "mime_type": body.get("mime_type", ""),
        "tags": body.get("tags", []),
        "category_slug": body.get("category_slug", ""),
        "share_count": 0,
        "is_active": True,
        "created_by": user.get("user_id", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }
    await db.memoraai_content.insert_one(item)
    item.pop("_id", None)
    return {"message": "Content created", "item": item}


@router.put("/{item_id}")
async def update_content(item_id: str, request: Request):
    """Update content item"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    body = await request.json()

    update = {k: v for k, v in body.items() if k not in ["id", "tenant_id", "created_at"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_content.update_one(
        {"id": item_id, "tenant_id": tenant_id}, {"$set": update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    updated = await db.memoraai_content.find_one({"id": item_id}, {"_id": 0})
    return {"message": "Content updated", "item": updated}


@router.delete("/{item_id}")
async def delete_content(item_id: str, request: Request):
    """Soft-delete content"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    result = await db.memoraai_content.update_one(
        {"id": item_id, "tenant_id": tenant_id},
        {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat(), "is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"message": "Content deleted"}


@router.post("/{item_id}/share")
async def increment_share_count(item_id: str, request: Request):
    """Increment share count when content is shared via WhatsApp"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    await db.memoraai_content.update_one(
        {"id": item_id, "tenant_id": tenant_id},
        {"$inc": {"share_count": 1}}
    )
    return {"message": "Share count incremented"}


@router.get("/stats")
async def content_stats(request: Request):
    """Content library stats"""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    total = await db.memoraai_content.count_documents({"tenant_id": tenant_id, "deleted_at": None})
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "deleted_at": None}},
        {"$group": {"_id": "$content_type", "count": {"$sum": 1}, "shares": {"$sum": "$share_count"}}},
    ]
    by_type = {}
    async for doc in db.memoraai_content.aggregate(pipeline):
        by_type[doc["_id"]] = {"count": doc["count"], "shares": doc["shares"]}

    return {"total": total, "by_type": by_type}
