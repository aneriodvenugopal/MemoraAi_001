"""
Public branding asset endpoints — single source of truth for the platform logo.

Why these endpoints exist
─────────────────────────
The platform logo used to be served as a plain static file
(/memoraai-logo.png) from the React build. That had two production bugs:

1. Browsers and CDNs cached `/memoraai-logo.png` aggressively, so after an
   admin uploaded a new logo the URL was identical → no refetch → stale logo.
2. An upload only writes to the running container's filesystem. After a
   production redeploy, the file from git would clobber any change.

Now the canonical logo lives in MongoDB (`branding_assets` collection) and
is served by these endpoints with proper `Cache-Control` + `ETag` headers so:
  • a fresh upload produces a new `version` and a new `ETag` → guaranteed refetch,
  • but day-to-day requests still hit the browser's HTTP cache for 60 seconds,
  • and the asset survives any production redeploy.
"""
from __future__ import annotations
import base64
import io
import logging
from pathlib import Path

from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import Response as RawResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/branding", tags=["branding"])

# Static fallback files (shipped in the React build; used when Mongo has no
# branding row yet — i.e. brand-new deployment that hasn't customised the logo)
_PUBLIC_DIR = Path("/app/frontend/public")
_LOGO_PATH = _PUBLIC_DIR / "memoraai-logo.png"
_ICON_PATH = _PUBLIC_DIR / "memoraai-icon.png"


def _get_db(request: Request):
    return request.app.state.db


async def _resolve_asset(request: Request, kind: str):
    """Return (bytes, version_str) for kind in {'logo', 'icon'}."""
    db = _get_db(request)
    doc = await db.branding_assets.find_one(
        {"id": "platform"}, {"_id": 0, f"{kind}_b64": 1, "version": 1}
    )
    if doc and doc.get(f"{kind}_b64"):
        try:
            data = base64.b64decode(doc[f"{kind}_b64"])
            return data, str(doc.get("version", "0"))
        except Exception as e:
            logger.warning(f"branding decode fail kind={kind}: {e}")

    # Fallback to bundled static asset
    path = _LOGO_PATH if kind == "logo" else _ICON_PATH
    if path.exists():
        try:
            data = path.read_bytes()
            mtime = int(path.stat().st_mtime * 1000)
            return data, str(mtime)
        except Exception:
            pass
    return None, None


def _make_response(data: bytes, version: str, request: Request) -> Response:
    etag = f'W/"{version}"'
    # Honour client If-None-Match
    if (request.headers.get("if-none-match") or "") == etag:
        return Response(status_code=304, headers={
            "ETag": etag,
            "Cache-Control": "public, max-age=60, must-revalidate",
        })
    return RawResponse(
        content=data,
        media_type="image/png",
        headers={
            "ETag": etag,
            # Short browser cache + must-revalidate ⇒ guaranteed pickup of new version
            "Cache-Control": "public, max-age=60, must-revalidate",
            "X-Logo-Version": version,
            # Allow images to be embedded everywhere (marketing site, app, email)
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/version")
async def branding_version(request: Request):
    """Return the current platform logo version (used by frontend cache-busting)."""
    db = _get_db(request)
    doc = await db.branding_assets.find_one({"id": "platform"}, {"_id": 0, "version": 1, "updated_at": 1})
    if doc:
        v = str(doc.get("version", "0"))
    else:
        # Fall back to file mtime
        try:
            v = str(int(_LOGO_PATH.stat().st_mtime * 1000))
        except Exception:
            v = "0"
    return {
        "version": v,
        "logo_url": f"/api/branding/logo?v={v}",
        "icon_url": f"/api/branding/icon?v={v}",
    }


@router.get("/logo")
async def get_logo(request: Request):
    data, version = await _resolve_asset(request, "logo")
    if not data:
        raise HTTPException(status_code=404, detail="Logo not configured")
    return _make_response(data, version, request)


@router.get("/icon")
async def get_icon(request: Request):
    data, version = await _resolve_asset(request, "icon")
    if not data:
        raise HTTPException(status_code=404, detail="Icon not configured")
    return _make_response(data, version, request)
