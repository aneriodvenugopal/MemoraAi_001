"""
Document Locker Routes
- Simple document storage with physical location mapping
- Search by customer name, mobile, keyword
- Email sharing (manual, no tracking)
- NO AI, NO automation
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from models.document_locker import (
    PhysicalLocation, PhysicalLocationCreate,
    Document, DocumentCreate, DocumentUpdate, DocumentSearch
)
from middleware.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import os

router = APIRouter(prefix="/document-locker", tags=["document-locker"])


def get_db(request: Request):
    return request.app.state.db


# ==================== PHYSICAL LOCATIONS ====================

@router.get("/physical-locations")
async def get_physical_locations(request: Request):
    """Get all physical storage locations for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    locations = await db.physical_locations.find(
        {"tenant_id": user["tenant_id"], "is_active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return {"success": True, "locations": locations}


@router.post("/physical-locations")
async def create_physical_location(
    location_data: PhysicalLocationCreate,
    request: Request
):
    """Create a new physical storage location (Admin/Accountant only)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check role - only admin or accountant can create locations
    if user.get("role") not in ["super_admin", "tenant_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Only Admin or Accountant can manage physical locations")
    
    # Check if name already exists
    existing = await db.physical_locations.find_one({
        "tenant_id": user["tenant_id"],
        "name": location_data.name.upper(),
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="Location with this name already exists")
    
    location = PhysicalLocation(
        tenant_id=user["tenant_id"],
        name=location_data.name.upper(),
        description=location_data.description,
        created_by=user["user_id"]
    )
    
    await db.physical_locations.insert_one(location.model_dump())
    
    return {"success": True, "location": location.model_dump()}


@router.delete("/physical-locations/{location_id}")
async def delete_physical_location(location_id: str, request: Request):
    """Soft delete a physical location (Admin only)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.get("role") not in ["super_admin", "tenant_admin"]:
        raise HTTPException(status_code=403, detail="Only Admin can delete locations")
    
    # Check if location has documents
    doc_count = await db.documents.count_documents({
        "physical_location_id": location_id,
        "is_active": True
    })
    
    if doc_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete location with {doc_count} documents. Move documents first."
        )
    
    result = await db.physical_locations.update_one(
        {"id": location_id, "tenant_id": user["tenant_id"]},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return {"success": True, "message": "Location deleted"}


# ==================== DOCUMENTS ====================

@router.get("/documents")
async def get_documents(
    request: Request,
    project_id: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all documents for tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"], "is_active": True}
    if project_id:
        query["project_id"] = project_id
    
    documents = await db.documents.find(
        query, {"_id": 0}
    ).sort("uploaded_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.documents.count_documents(query)
    
    # Remove physical_code for non-admin/accountant users
    if user.get("role") not in ["super_admin", "tenant_admin", "accountant"]:
        for doc in documents:
            doc.pop("physical_code", None)
            doc.pop("physical_location_id", None)
            doc.pop("physical_location_name", None)
            doc.pop("order_number", None)
    
    return {
        "success": True,
        "documents": documents,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.post("/documents")
async def create_document(
    document_data: DocumentCreate,
    request: Request
):
    """Upload a new document with physical location mapping"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate physical location exists
    location = await db.physical_locations.find_one({
        "id": document_data.physical_location_id,
        "tenant_id": user["tenant_id"],
        "is_active": True
    }, {"_id": 0})
    
    if not location:
        raise HTTPException(status_code=404, detail="Physical location not found")
    
    # Get next order number for this location
    next_order = location.get("last_order_number", 0) + 1
    
    # Generate physical code (e.g., "OFFICE-STORAGE-1-001")
    physical_code = f"{location['name']}-{str(next_order).zfill(3)}"
    
    # Create document
    document = Document(
        tenant_id=user["tenant_id"],
        project_id=document_data.project_id,
        customer_name=document_data.customer_name,
        customer_mobile=document_data.customer_mobile,
        customer_email=document_data.customer_email,
        document_name=document_data.document_name,
        document_type=document_data.document_type,
        file_url=document_data.file_url,
        file_type=document_data.file_type,
        file_size=document_data.file_size,
        keywords=[k.lower().strip() for k in document_data.keywords],
        physical_location_id=document_data.physical_location_id,
        physical_location_name=location["name"],
        order_number=next_order,
        physical_code=physical_code,
        notes=document_data.notes,
        uploaded_by=user["user_id"]
    )
    
    # Update location's last order number
    await db.physical_locations.update_one(
        {"id": document_data.physical_location_id},
        {"$set": {"last_order_number": next_order}}
    )
    
    await db.documents.insert_one(document.model_dump())
    
    return {
        "success": True,
        "document": document.model_dump(),
        "physical_code": physical_code,
        "message": f"Document uploaded. Write '{physical_code}' on the physical file."
    }


@router.get("/documents/{document_id}")
async def get_document(document_id: str, request: Request):
    """Get single document details"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    document = await db.documents.find_one({
        "id": document_id,
        "tenant_id": user["tenant_id"],
        "is_active": True
    }, {"_id": 0})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Remove physical_code for non-admin/accountant users
    if user.get("role") not in ["super_admin", "tenant_admin", "accountant"]:
        document.pop("physical_code", None)
        document.pop("physical_location_id", None)
        document.pop("physical_location_name", None)
        document.pop("order_number", None)
    
    return {"success": True, "document": document}


@router.put("/documents/{document_id}")
async def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    request: Request
):
    """Update document metadata (not file)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Build update dict
    update_dict = {}
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            if field == "keywords":
                update_dict[field] = [k.lower().strip() for k in value]
            else:
                update_dict[field] = value
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.documents.update_one(
        {"id": document_id, "tenant_id": user["tenant_id"], "is_active": True},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document updated"}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, request: Request):
    """Soft delete a document"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.documents.update_one(
        {"id": document_id, "tenant_id": user["tenant_id"], "is_active": True},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document deleted"}


# ==================== SEARCH ====================

@router.post("/documents/search")
async def search_documents(
    search_params: DocumentSearch,
    request: Request
):
    """
    Search documents by:
    - Customer name (partial match)
    - Customer mobile (exact or partial)
    - Keyword (exact match in keywords array)
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    query = {"tenant_id": user["tenant_id"], "is_active": True}
    
    # Build search conditions
    conditions = []
    
    if search_params.customer_name:
        conditions.append({
            "customer_name": {"$regex": search_params.customer_name, "$options": "i"}
        })
    
    if search_params.customer_mobile:
        conditions.append({
            "customer_mobile": {"$regex": search_params.customer_mobile}
        })
    
    if search_params.keyword:
        conditions.append({
            "keywords": search_params.keyword.lower().strip()
        })
    
    if search_params.project_id:
        query["project_id"] = search_params.project_id
    
    if conditions:
        query["$or"] = conditions
    
    documents = await db.documents.find(
        query, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    # Remove physical_code for non-admin/accountant users
    if user.get("role") not in ["super_admin", "tenant_admin", "accountant"]:
        for doc in documents:
            doc.pop("physical_code", None)
            doc.pop("physical_location_id", None)
            doc.pop("physical_location_name", None)
            doc.pop("order_number", None)
    
    return {
        "success": True,
        "documents": documents,
        "count": len(documents),
        "search_params": search_params.model_dump(exclude_unset=True)
    }


# ==================== EMAIL SHARING ====================

@router.post("/documents/{document_id}/share-email")
async def share_document_via_email(
    document_id: str,
    request: Request,
    email_to: str = Form(...)
):
    """
    Share document via email
    - Manual email entry
    - One-click send
    - NO tracking, NO analytics
    """
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get document
    document = await db.documents.find_one({
        "id": document_id,
        "tenant_id": user["tenant_id"],
        "is_active": True
    }, {"_id": 0})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get tenant info for sender details
    tenant = await db.tenants.find_one(
        {"id": user["tenant_id"]},
        {"_id": 0, "company_name": 1, "email": 1}
    )
    
    # TODO: Integrate with actual email service (SendGrid/Resend)
    # For now, just log the share attempt
    share_log = {
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "document_name": document["document_name"],
        "shared_to": email_to,
        "shared_by": user["user_id"],
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": user["tenant_id"]
    }
    
    await db.document_share_logs.insert_one(share_log)
    
    return {
        "success": True,
        "message": f"Document '{document['document_name']}' shared to {email_to}",
        "note": "Email service integration pending - share logged for manual follow-up"
    }


# ==================== FILE UPLOAD ====================

@router.post("/upload")
async def upload_document_file(
    request: Request,
    file: UploadFile = File(...)
):
    """Upload document file (PDF, JPG, PNG, DOC)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", 
                     "application/msword", 
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX"
        )
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "pdf"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    
    # Save file
    upload_dir = "/app/uploads/documents"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, unique_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_url = f"/api/document-locker/files/{unique_filename}"
    
    return {
        "success": True,
        "file_url": file_url,
        "file_type": file_ext.lower(),
        "file_size": len(content),
        "original_name": file.filename
    }


@router.get("/files/{filename}")
async def get_document_file(filename: str, request: Request):
    """Serve uploaded document file"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/uploads/documents/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)
