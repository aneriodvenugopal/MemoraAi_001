"""
MemoraAI Chat Learning / Correction Rules API

Business owners review AI replies in the Team Inbox and provide corrections.
Corrections are stored per tenant and injected into the AI system prompt
for future conversations, enabling continuous reinforcement learning.
"""
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/corrections", tags=["memoraai-corrections"])

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "can", "i", "you", "he", "she", "it", "we",
    "they", "this", "that", "these", "those", "am", "my", "your", "his",
    "her", "its", "our", "their", "of", "to", "in", "on", "at", "for",
    "with", "by", "from", "and", "or", "but", "not", "no", "so", "if",
    "as", "what", "when", "where", "how", "why", "which", "who", "whom",
}


def _extract_keywords(*texts: str, limit: int = 8) -> List[str]:
    """Extract simple lowercase keywords from free text (best-effort, works for EN/Hindi/Telugu too)."""
    tokens: List[str] = []
    seen = set()
    for text in texts:
        if not text:
            continue
        # Split on non-word; keep unicode letters
        for tok in re.split(r"[^\w]+", text.lower(), flags=re.UNICODE):
            if not tok or len(tok) < 3:
                continue
            if tok in STOPWORDS or tok.isdigit():
                continue
            if tok in seen:
                continue
            seen.add(tok)
            tokens.append(tok)
            if len(tokens) >= limit:
                return tokens
    return tokens


def get_db(request: Request):
    return request.app.state.db


# ───────────────── MODELS ─────────────────
class CorrectionCreate(BaseModel):
    original_message: str        # customer's message
    ai_response: str             # what the AI said
    correction_note: str         # what owner wants to change / fix
    suggested_response: Optional[str] = None  # preferred AI reply
    keywords: Optional[List[str]] = None
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None
    category: Optional[str] = None  # "pricing", "policy", "tone", "fact", etc.


class CorrectionUpdate(BaseModel):
    correction_note: Optional[str] = None
    suggested_response: Optional[str] = None
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


# ───────────────── CRUD ─────────────────
@router.post("")
async def create_correction(data: CorrectionCreate, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    keywords = [k.lower() for k in (data.keywords or []) if k]
    if not keywords:
        keywords = _extract_keywords(data.original_message, data.correction_note)

    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "original_message": data.original_message,
        "ai_response": data.ai_response,
        "correction_note": data.correction_note,
        "suggested_response": data.suggested_response or "",
        "keywords": keywords,
        "conversation_id": data.conversation_id,
        "message_id": data.message_id,
        "category": data.category or "general",
        "is_active": True,
        "times_applied": 0,
        "created_by": user.get("user_id"),
        "created_by_name": user.get("name") or user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_corrections.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Correction saved. AI will apply it in future replies.", "correction": doc}


@router.get("")
async def list_corrections(
    request: Request,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    query = {"tenant_id": tenant_id}
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"original_message": regex},
            {"correction_note": regex},
            {"suggested_response": regex},
            {"keywords": regex},
        ]

    skip = (page - 1) * limit
    total = await db.memoraai_corrections.count_documents(query)
    items = (
        await db.memoraai_corrections.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {"corrections": items, "total": total, "page": page, "limit": limit}


@router.get("/{correction_id}")
async def get_correction(correction_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    c = await db.memoraai_corrections.find_one(
        {"id": correction_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not c:
        raise HTTPException(status_code=404, detail="Correction not found")
    return {"correction": c}


@router.put("/{correction_id}")
async def update_correction(correction_id: str, data: CorrectionUpdate, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "keywords" in update:
        update["keywords"] = [k.lower() for k in update["keywords"] if k]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.memoraai_corrections.update_one(
        {"id": correction_id, "tenant_id": tenant_id}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Correction not found")
    updated = await db.memoraai_corrections.find_one(
        {"id": correction_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    return {"message": "Correction updated", "correction": updated}


@router.delete("/{correction_id}")
async def delete_correction(correction_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    result = await db.memoraai_corrections.delete_one(
        {"id": correction_id, "tenant_id": tenant_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Correction not found")
    return {"message": "Correction deleted"}


@router.post("/{correction_id}/toggle")
async def toggle_correction(correction_id: str, request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    c = await db.memoraai_corrections.find_one(
        {"id": correction_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not c:
        raise HTTPException(status_code=404, detail="Correction not found")
    new_status = not c.get("is_active", True)
    await db.memoraai_corrections.update_one(
        {"id": correction_id}, {"$set": {"is_active": new_status}}
    )
    return {"is_active": new_status, "message": f"Correction {'activated' if new_status else 'paused'}"}


@router.get("/stats/summary")
async def corrections_summary(request: Request):
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")

    total = await db.memoraai_corrections.count_documents({"tenant_id": tenant_id})
    active = await db.memoraai_corrections.count_documents({"tenant_id": tenant_id, "is_active": True})
    applied_agg = await db.memoraai_corrections.aggregate([
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": None, "total_applied": {"$sum": "$times_applied"}}},
    ]).to_list(1)
    total_applied = applied_agg[0]["total_applied"] if applied_agg else 0

    by_cat = await db.memoraai_corrections.aggregate([
        {"$match": {"tenant_id": tenant_id}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)
    by_category = [{"category": b["_id"] or "general", "count": b["count"]} for b in by_cat]

    return {
        "total": total,
        "active": active,
        "times_applied": total_applied,
        "by_category": by_category,
    }


# ───────────────── HELPER FOR AI PROMPT INJECTION ─────────────────
async def get_relevant_corrections(
    db, tenant_id: str, user_message: str, limit: int = 5
) -> List[dict]:
    """
    Return corrections most likely relevant to the incoming message.
    Matches on keyword overlap first; falls back to most-recent active corrections.
    """
    if not tenant_id:
        return []

    msg_tokens = set(_extract_keywords(user_message or "", limit=20))

    active = await db.memoraai_corrections.find(
        {"tenant_id": tenant_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    if not active:
        return []

    scored = []
    for c in active:
        kw = set([k.lower() for k in (c.get("keywords") or [])])
        overlap = len(kw & msg_tokens) if kw and msg_tokens else 0
        scored.append((overlap, c))

    scored.sort(key=lambda x: (-x[0], 0))
    matched = [c for score, c in scored if score > 0][:limit]
    if matched:
        return matched
    # No keyword match — still surface the 2 most recent so general corrections apply
    return active[:2]


def format_corrections_for_prompt(corrections: List[dict]) -> str:
    """Render corrections as a compact block for the AI system prompt."""
    if not corrections:
        return ""
    lines = []
    for c in corrections:
        note = (c.get("correction_note") or "").strip()
        sugg = (c.get("suggested_response") or "").strip()
        orig = (c.get("original_message") or "").strip()
        entry = f"- Topic: {orig[:80]!r} — Correction: {note}"
        if sugg:
            entry += f" | Preferred reply example: {sugg[:200]}"
        lines.append(entry)
    return (
        "\n\n[OWNER CORRECTIONS — HIGHEST PRIORITY, MUST FOLLOW]\n"
        "These are explicit learnings from the business owner. "
        "Apply them whenever relevant to the current customer message.\n"
        + "\n".join(lines)
    )


async def increment_applied_counts(db, tenant_id: str, correction_ids: List[str]):
    """Bump usage counter for corrections that were actually injected."""
    if not correction_ids:
        return
    await db.memoraai_corrections.update_many(
        {"tenant_id": tenant_id, "id": {"$in": correction_ids}},
        {"$inc": {"times_applied": 1},
         "$set": {"last_applied_at": datetime.now(timezone.utc).isoformat()}},
    )
