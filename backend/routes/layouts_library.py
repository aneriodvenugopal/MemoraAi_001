from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from models.layout import MasterLayout, MasterLayoutCreate, MasterLayoutUpdate, ProjectLayoutAssign, LayoutPlot
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import os
import shutil
from middleware.auth import get_current_user
from services.dxf_parser import DXFParser
from services.svg_parser import SVGParser
from services.pdf_parser import PDFParser
from services.cv_ocr_parser import CVOCRParser

router = APIRouter(prefix="/layouts", tags=["layouts_library"])

# Directory to store uploaded SVG files
UPLOAD_DIR = "/app/uploads/layouts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db(request: Request):
    return request.app.state.db

@router.post("/upload-svg")
async def upload_svg_file(
    file: UploadFile = File(...),
    request: Request = None
):
    """
    Upload SVG file with chunked upload support
    Returns the file path and URL
    """
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate file type
    if not file.filename.endswith('.svg'):
        raise HTTPException(status_code=400, detail="Only SVG files are allowed")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"{file_id}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)
    
    try:
        # Save file in chunks
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # Read 1MB at a time
                if not chunk:
                    break
                buffer.write(chunk)
        
        # Return file info
        return {
            "success": True,
            "file_id": file_id,
            "filename": new_filename,
            "file_path": file_path,
            "file_url": f"/api/layouts/files/{new_filename}",
            "original_filename": file.filename
        }
    
    except Exception as e:
        # Clean up file if error occurs
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/files/{filename}")
async def get_svg_file(filename: str):
    """Serve uploaded SVG files"""
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, media_type="image/svg+xml")

@router.post("/parse-file")
async def parse_layout_file(
    file: UploadFile = File(...),
    parse_method: str = Form(...),
    request: Request = None
):
    """
    Parse uploaded layout file and extract plot data.
    
    Supports:
    - DXF files (AutoCAD)
    - SVG files (vector graphics)
    - PDF files (vector or raster)
    - Image files (PNG, JPG, JPEG) with AI/OCR
    
    Args:
        file: The uploaded file
        parse_method: One of 'dxf', 'svg', 'pdf', 'ai_ocr'
    
    Returns:
        Parsed plot data with coordinates, metadata, and confidence scores
    """
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate file extension
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {
        'dxf': ['.dxf', '.dwg'],
        'svg': ['.svg'],
        'pdf': ['.pdf'],
        'ai_ocr': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.pdf']
    }
    
    if parse_method not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid parse method. Must be one of: {', '.join(allowed_extensions.keys())}"
        )
    
    if file_extension not in allowed_extensions[parse_method]:
        raise HTTPException(
            status_code=400,
            detail=f"File extension {file_extension} not valid for {parse_method} method. "
                   f"Expected: {', '.join(allowed_extensions[parse_method])}"
        )
    
    # Generate temporary filename
    temp_file_id = str(uuid.uuid4())
    temp_filename = f"{temp_file_id}{file_extension}"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_filename)
    
    try:
        # Save uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # Read 1MB at a time
                if not chunk:
                    break
                buffer.write(chunk)
        
        # Parse file based on method
        result = None
        
        if parse_method == 'dxf':
            result = DXFParser.parse_file(temp_file_path)
        
        elif parse_method == 'svg':
            result = SVGParser.parse_file(temp_file_path)
        
        elif parse_method == 'pdf':
            result = PDFParser.parse_file(temp_file_path)
            
            # If PDF is raster and needs OCR, use CV/OCR parser
            if result.get('needs_ocr'):
                result = CVOCRParser.parse_file(temp_file_path)
        
        elif parse_method == 'ai_ocr':
            result = CVOCRParser.parse_file(temp_file_path)
        
        # Keep the file for later use
        final_filename = f"parsed_{temp_filename}"
        final_file_path = os.path.join(UPLOAD_DIR, final_filename)
        shutil.move(temp_file_path, final_file_path)
        
        return {
            "success": True,
            "method": parse_method,
            "file_id": temp_file_id,
            "filename": final_filename,
            "file_path": final_file_path,
            "file_url": f"/api/layouts/files/{final_filename}",
            "original_filename": file.filename,
            "plots": result.get('plots', []),
            "metadata": result.get('metadata', {}),
            "total_plots_detected": len(result.get('plots', []))
        }
    
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        raise HTTPException(
            status_code=500,
            detail=f"File parsing failed: {str(e)}"
        )

@router.post("")
async def create_master_layout(
    layout_data: MasterLayoutCreate,
    request: Request
):
    """Create a new master layout (tenant or super admin)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user is super admin for template creation
    if layout_data.is_template and user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Only Super Admin can create templates")
    
    # Create layout
    layout_id = str(uuid.uuid4())
    layout_doc = {
        'id': layout_id,
        'tenant_id': None if layout_data.is_template else user['tenant_id'],
        'layout_name': layout_data.layout_name,
        'layout_type': layout_data.layout_type,
        'svg_content': layout_data.svg_content,
        'svg_url': layout_data.svg_url,
        'plots': [plot.dict() for plot in layout_data.plots],
        'metadata': layout_data.metadata,
        'is_template': layout_data.is_template,
        'created_by': user['user_id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.master_layouts.insert_one(layout_doc)
    
    return {
        "success": True,
        "message": "Layout created successfully",
        "layout_id": layout_id,
        "total_plots": len(layout_data.plots)
    }

@router.get("")
async def get_master_layouts(
    request: Request,
    layout_type: Optional[str] = None,
    include_templates: bool = True
):
    """Get all master layouts for current tenant (includes templates)"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Build query
    query = {'deleted_at': None}
    
    # Include tenant's own layouts and global templates
    if user.get('role') == 'super_admin':
        # Super admin sees all layouts
        pass
    else:
        # Tenant sees their own layouts + global templates
        query['$or'] = [
            {'tenant_id': user['tenant_id']},
            {'is_template': True}
        ]
    
    # Filter by type if provided
    if layout_type:
        query['layout_type'] = layout_type
    
    layouts = await db.master_layouts.find(query, {'_id': 0}).to_list(length=None)
    
    return {
        "success": True,
        "layouts": layouts,
        "total": len(layouts)
    }

@router.get("/stats")
async def get_layout_stats(request: Request):
    """Get layout statistics for current tenant"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Count layouts by type
    query = {'deleted_at': None}
    if user.get('role') != 'super_admin':
        query['tenant_id'] = user['tenant_id']
    
    layouts = await db.master_layouts.find(query, {'_id': 0}).to_list(length=None)
    
    stats = {
        'total_layouts': len(layouts),
        'by_type': {},
        'templates': 0,
        'assigned_to_projects': 0
    }
    
    for layout in layouts:
        layout_type = layout.get('layout_type', 'other')
        stats['by_type'][layout_type] = stats['by_type'].get(layout_type, 0) + 1
        
        if layout.get('is_template'):
            stats['templates'] += 1
    
    # Count assignments
    assignment_query = {'deleted_at': None, 'tenant_id': user['tenant_id']}
    assignments = await db.project_layouts.count_documents(assignment_query)
    stats['assigned_to_projects'] = assignments
    
    return {
        "success": True,
        "stats": stats
    }

@router.get("/{layout_id}")
async def get_master_layout(layout_id: str, request: Request):
    """Get a specific master layout"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    layout = await db.master_layouts.find_one(
        {'id': layout_id, 'deleted_at': None},
        {'_id': 0}
    )
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Check access
    if user.get('role') != 'super_admin':
        if layout.get('tenant_id') != user['tenant_id'] and not layout.get('is_template'):
            raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "success": True,
        "layout": layout
    }

@router.put("/{layout_id}")
async def update_master_layout(
    layout_id: str,
    layout_data: MasterLayoutUpdate,
    request: Request
):
    """Update a master layout"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get existing layout
    layout = await db.master_layouts.find_one(
        {'id': layout_id, 'deleted_at': None}
    )
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Check permissions
    if user.get('role') != 'super_admin':
        if layout.get('tenant_id') != user['tenant_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Build update data
    update_data = {'updated_at': datetime.now(timezone.utc).isoformat()}
    
    if layout_data.layout_name is not None:
        update_data['layout_name'] = layout_data.layout_name
    if layout_data.layout_type is not None:
        update_data['layout_type'] = layout_data.layout_type
    if layout_data.svg_content is not None:
        update_data['svg_content'] = layout_data.svg_content
    if layout_data.svg_url is not None:
        update_data['svg_url'] = layout_data.svg_url
    if layout_data.plots is not None:
        update_data['plots'] = [plot.dict() for plot in layout_data.plots]
    if layout_data.metadata is not None:
        update_data['metadata'] = layout_data.metadata
    
    await db.master_layouts.update_one(
        {'id': layout_id},
        {'$set': update_data}
    )
    
    return {
        "success": True,
        "message": "Layout updated successfully"
    }

@router.delete("/{layout_id}")
async def delete_master_layout(layout_id: str, request: Request):
    """Soft delete a master layout"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get existing layout
    layout = await db.master_layouts.find_one(
        {'id': layout_id, 'deleted_at': None}
    )
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Check permissions
    if user.get('role') != 'super_admin':
        if layout.get('tenant_id') != user['tenant_id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if layout is assigned to any projects
    assigned_projects = await db.project_layouts.find_one({
        'layout_id': layout_id,
        'deleted_at': None
    })
    
    if assigned_projects:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete layout that is assigned to projects"
        )
    
    await db.master_layouts.update_one(
        {'id': layout_id},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": "Layout deleted successfully"
    }

@router.post("/projects/{project_id}/assign")
async def assign_layout_to_project(
    project_id: str,
    assignment: ProjectLayoutAssign,
    request: Request
):
    """Assign a master layout to a project"""
    user = await get_current_user(request)
    db = get_db(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if project exists
    project = await db.projects.find_one({
        'id': project_id,
        'tenant_id': user['tenant_id'],
        'deleted_at': None
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if layout exists and is accessible
    layout = await db.master_layouts.find_one({
        'id': assignment.layout_id,
        'deleted_at': None
    })
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Check layout access
    if user.get('role') != 'super_admin':
        if layout.get('tenant_id') != user['tenant_id'] and not layout.get('is_template'):
            raise HTTPException(status_code=403, detail="Access denied to this layout")
    
    # Check if project already has a layout assigned
    existing_assignment = await db.project_layouts.find_one({
        'project_id': project_id,
        'deleted_at': None
    })
    
    if existing_assignment:
        # Update existing assignment
        await db.project_layouts.update_one(
            {'id': existing_assignment['id']},
            {
                '$set': {
                    'layout_id': assignment.layout_id,
                    'custom_plots': [plot.dict() for plot in assignment.custom_plots] if assignment.custom_plots else None,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {
            "success": True,
            "message": "Layout assignment updated successfully"
        }
    else:
        # Create new assignment
        assignment_id = str(uuid.uuid4())
        assignment_doc = {
            'id': assignment_id,
            'project_id': project_id,
            'layout_id': assignment.layout_id,
            'tenant_id': user['tenant_id'],
            'custom_plots': [plot.dict() for plot in assignment.custom_plots] if assignment.custom_plots else None,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        
        await db.project_layouts.insert_one(assignment_doc)
        
        return {
            "success": True,
            "message": "Layout assigned to project successfully",
            "assignment_id": assignment_id
        }
