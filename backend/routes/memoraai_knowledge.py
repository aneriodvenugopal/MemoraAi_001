"""
MemoraAI Knowledge Extraction
-----------------------------
Upload a PDF or image and extract its textual content so the AI can
answer customer WhatsApp questions from it.

- PDFs: text extracted locally with pypdf (fast, no LLM cost).
- Images / scanned PDFs: OCR via Gemini vision through emergentintegrations.

The extracted content is stored in `memoraai_content` so the RAG layer
and `sales_engine.py` already pick it up automatically.
"""
import os
import io
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel

from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memoraai/knowledge", tags=["memoraai-knowledge"])


def get_db(request: Request):
    return request.app.state.db


# ────────────── PDF text extraction ──────────────
def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        parts = []
        for i, page in enumerate(reader.pages):
            try:
                t = page.extract_text() or ""
                if t.strip():
                    parts.append(f"--- Page {i + 1} ---\n{t.strip()}")
            except Exception as e:
                logger.warning(f"PDF page {i} extract failed: {e}")
        return "\n\n".join(parts)[:50000]
    except Exception as e:
        logger.warning(f"pypdf failed: {e}")
        return ""


# ────────────── Image OCR via Gemini vision ──────────────
async def _extract_image_text(file_bytes: bytes, mime_type: str, filename: str) -> str:
    """Use Gemini vision (via Emergent LLM key) to extract all text + context from an image."""
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        return ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ocr-{uuid.uuid4()}",
            system_message=(
                "You are an OCR + content summarizer. Return ALL readable text "
                "from the image first, followed by a short summary of what the "
                "image shows (product, chart, person, etc.). Keep the output "
                "faithful to the image — never invent content."
            ),
        ).with_model("gemini", "gemini-2.0-flash")

        b64 = base64.b64encode(file_bytes).decode()
        img = ImageContent(image_base64=b64)
        msg = UserMessage(
            text="Extract all text from this image for a business knowledge base.",
            file_contents=[img],
        )
        result = await chat.send_message(msg)
        return (result or "").strip()[:50000]
    except Exception as e:
        logger.exception(f"Image OCR failed: {e}")
        return ""


# ────────────── MODELS ──────────────
class TextNotePayload(BaseModel):
    title: str
    text: str
    tags: Optional[List[str]] = None
    category: Optional[str] = "note"


# ────────────── ENDPOINTS ──────────────
@router.post("/extract")
async def extract_from_file(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
):
    """Upload a PDF or image; extract its text; save as a knowledge content item
    that the WhatsApp AI can read from. Returns the extracted text + new content id."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    raw = await file.read()
    mime = file.content_type or ""
    fname = file.filename or "upload"
    size = len(raw)
    if size > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")

    extracted = ""
    kind = "document"

    if mime.startswith("application/pdf") or fname.lower().endswith(".pdf"):
        kind = "pdf"
        extracted = _extract_pdf_text(raw)
        if not extracted.strip():
            # Likely scanned PDF — try OCR on first page image via Gemini directly on bytes
            extracted = await _extract_image_text(raw, "application/pdf", fname)
    elif mime.startswith("image/"):
        kind = "image"
        extracted = await _extract_image_text(raw, mime, fname)
    else:
        # Plain text, CSV, Excel as text fallback
        try:
            extracted = raw.decode("utf-8", errors="ignore")[:50000]
        except Exception:
            extracted = ""

    if not extracted.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any readable text from this file. Try another format or paste as text."
        )

    # Best-effort file save (so we can link back to the original)
    saved_url = None
    try:
        # reuse the files route saver if available
        from pathlib import Path
        uploads_dir = Path("/app/backend/uploads/memoraai_kb")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(fname).suffix or (".pdf" if kind == "pdf" else ".bin")
        safe_id = str(uuid.uuid4())
        out = uploads_dir / f"{safe_id}{ext}"
        out.write_bytes(raw)
        saved_url = f"/uploads/memoraai_kb/{out.name}"
    except Exception as e:
        logger.warning(f"KB file save failed: {e}")

    content_doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "title": (title or Path(fname).stem)[:180],
        "content_type": "note" if kind != "pdf" else "document",
        "description": extracted,  # Full extracted text lives here so RAG picks it up
        "url": saved_url or "",
        "file_name": fname,
        "file_size": size,
        "mime_type": mime,
        "tags": ["kb", kind, "auto-extracted"],
        "source": "own-business-gpt",
        "is_active": True,
        "share_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_content.insert_one(content_doc)
    content_doc.pop("_id", None)

    return {
        "success": True,
        "extracted_text": extracted,
        "content": content_doc,
        "char_count": len(extracted),
    }


@router.post("/text")
async def add_text_note(data: TextNotePayload, request: Request):
    """Add a plain long-text note straight to the knowledge base."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    if not data.text.strip() or not data.title.strip():
        raise HTTPException(status_code=400, detail="Title and text are required")

    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "title": data.title.strip()[:180],
        "content_type": "note",
        "description": data.text.strip(),
        "url": "",
        "tags": (data.tags or []) + ["kb", "text"],
        "source": "own-business-gpt",
        "is_active": True,
        "share_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.memoraai_content.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "content": doc}


@router.get("/summary")
async def kb_summary(request: Request):
    """Quick aggregation for the Knowledge Base stats strip."""
    user = await get_current_user(request)
    db = get_db(request)
    tenant_id = user.get("tenant_id")
    base = {"tenant_id": tenant_id}

    async def c(query):
        return await db.memoraai_content.count_documents({**base, **query})

    total = await c({})
    notes = await c({"content_type": {"$in": ["note", "faq", "template"]}})
    docs = await c({"content_type": {"$in": ["document", "brochure", "price_list"]}})
    imgs = await c({"content_type": "image"})
    videos = await c({"content_type": "video"})
    links = await c({"content_type": "link"})
    faqs = await c({"content_type": "faq"})

    # Last 7 days — "this week" pill in UI
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    this_week = await c({"created_at": {"$gte": since}})

    return {
        "total": total,
        "notes": notes,
        "documents": docs,
        "images": imgs,
        "videos_audio": videos,
        "links": links,
        "faqs": faqs,
        "this_week": this_week,
    }
