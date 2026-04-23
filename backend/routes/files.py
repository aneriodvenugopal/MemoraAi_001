"""
File Upload API Routes
Endpoints for file upload, retrieval, and management
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, StreamingResponse, Response
from typing import Optional, List
from middleware.auth import get_current_user
from services.file_upload_service import FileUploadService, UPLOAD_CONTEXTS, get_upload_path
import os

def get_db(request: Request):
    return request.app.state.db

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    context: str = Form(default="general"),
    related_id: Optional[str] = Form(default=None),
    description: Optional[str] = Form(default=None)
):
    """
    Upload a file
    
    Args:
        file: The file to upload
        context: Upload context (customer_document, property_media, agreement, payment_proof, project_media, profile, general)
        related_id: Related entity ID (customer_id, property_id, etc.)
        description: Optional file description
    
    Returns:
        Upload result with file URL and metadata
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    # Validate context
    if context not in UPLOAD_CONTEXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid context. Allowed: {', '.join(UPLOAD_CONTEXTS.keys())}"
        )
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Initialize service and upload
    upload_service = FileUploadService(db)
    
    result = await upload_service.upload_file(
        file_content=content,
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        context=context,
        tenant_id=tenant_id,
        uploaded_by=user.get("user_id"),
        related_id=related_id,
        metadata={"description": description} if description else None
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/upload/multiple")
async def upload_multiple_files(
    request: Request,
    files: List[UploadFile] = File(...),
    context: str = Form(default="general"),
    related_id: Optional[str] = Form(default=None)
):
    """Upload multiple files at once"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per upload")
    
    upload_service = FileUploadService(db)
    results = []
    
    for file in files:
        content = await file.read()
        if len(content) == 0:
            results.append({"success": False, "filename": file.filename, "error": "Empty file"})
            continue
        
        result = await upload_service.upload_file(
            file_content=content,
            original_filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            context=context,
            tenant_id=tenant_id,
            uploaded_by=user.get("user_id"),
            related_id=related_id
        )
        
        results.append({
            "filename": file.filename,
            **result
        })
    
    success_count = sum(1 for r in results if r.get("success"))
    
    return {
        "total": len(files),
        "success_count": success_count,
        "failed_count": len(files) - success_count,
        "files": results
    }


@router.get("/")
async def list_files(
    request: Request,
    context: Optional[str] = Query(default=None),
    related_id: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=100)
):
    """List files for current tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    upload_service = FileUploadService(db)
    files = await upload_service.get_files(
        tenant_id=tenant_id,
        context=context,
        related_id=related_id,
        category=category,
        limit=limit
    )
    
    return {"files": files, "count": len(files)}


@router.get("/{context}/{tenant_id}/{filename}")
async def serve_file(context: str, tenant_id: str, filename: str, request: Request):
    """Serve uploaded file - checks object storage first, then local"""
    # Validate context
    if context not in UPLOAD_CONTEXTS:
        raise HTTPException(status_code=404, detail="Invalid path")
    
    # Security: sanitize filename
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Determine content type
    extension = filename.split(".")[-1].lower() if "." in filename else ""
    content_types = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
        "doc": "application/msword", "mp4": "video/mp4", "webm": "video/webm",
        "mov": "video/quicktime",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    media_type = content_types.get(extension, "application/octet-stream")
    
    # Try local file first
    file_path = get_upload_path(context, tenant_id, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type=media_type, filename=filename)
    
    # Try object storage
    try:
        from services.object_storage import get_object
        storage_path = f"realapex/{context}/{tenant_id}/{filename}"
        
        # Also check DB for storage_path
        db = get_db(request)
        file_record = await db.files.find_one(
            {"filename": filename, "tenant_id": tenant_id},
            {"_id": 0, "storage_path": 1, "content_type": 1}
        )
        if file_record and file_record.get("storage_path"):
            storage_path = file_record["storage_path"]
            media_type = file_record.get("content_type", media_type)
        
        content, obj_content_type = get_object(storage_path)
        return Response(content=content, media_type=media_type)
    except Exception as e:
        print(f"Object storage fetch failed for {filename}: {e}")
    
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/{file_id}")
async def delete_file(file_id: str, request: Request):
    """Delete a file"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    upload_service = FileUploadService(db)
    result = await upload_service.delete_file(file_id, tenant_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.get("/by-id/{file_id}")
async def get_file_by_id(file_id: str, request: Request):
    """Get file metadata by ID"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    
    upload_service = FileUploadService(db)
    file_record = await upload_service.get_file_by_id(file_id, tenant_id)
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    return file_record


# Customer document specific endpoints
@router.get("/customer/{customer_id}")
async def get_customer_documents(customer_id: str, request: Request):
    """Get all documents for a customer"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    upload_service = FileUploadService(db)
    files = await upload_service.get_files(
        tenant_id=tenant_id,
        context="customer_document",
        related_id=customer_id
    )
    
    return {"customer_id": customer_id, "documents": files, "count": len(files)}


# Property media specific endpoints
@router.get("/property/{property_id}")
async def get_property_media(property_id: str, request: Request):
    """Get all media for a property"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    tenant_id = user.get("tenant_id")
    
    upload_service = FileUploadService(db)
    files = await upload_service.get_files(
        tenant_id=tenant_id,
        context="property_media",
        related_id=property_id
    )
    
    # Separate images and videos
    images = [f for f in files if f.get("category") == "image"]
    videos = [f for f in files if f.get("category") == "video"]
    documents = [f for f in files if f.get("category") == "document"]
    
    return {
        "property_id": property_id,
        "images": images,
        "videos": videos,
        "documents": documents,
        "total": len(files)
    }
