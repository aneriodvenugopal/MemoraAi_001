from fastapi import APIRouter, HTTPException, Request, Depends, Query
from models.project_staff import ProjectStaff, ProjectStaffCreate, ProjectStaffUpdate, QuickStaffCreate
from middleware.auth import get_current_user
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import bcrypt

router = APIRouter(prefix="/project-staff", tags=["project-staff"])

def get_db(request: Request):
    return request.app.state.db

# ============ STAFF ASSIGNMENT ============

@router.post("/assign")
async def assign_staff_to_project(
    staff_data: ProjectStaffCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Assign existing user to a project as staff"""
    db = get_db(request)
    
    # Get current user details
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Verify the user being assigned exists
    assigned_user = await db.users.find_one({'id': staff_data.user_id}, {"_id": 0})
    if not assigned_user:
        raise HTTPException(status_code=404, detail="User to be assigned not found")
    
    # Verify they belong to same tenant
    if assigned_user.get('tenant_id') != user.get('tenant_id'):
        raise HTTPException(status_code=403, detail="Cannot assign staff from different tenant")
    
    # If project_id provided, verify project exists and belongs to tenant
    if staff_data.project_id:
        project = await db.projects.find_one({
            'id': staff_data.project_id,
            'tenant_id': user.get('tenant_id'),
            'deleted_at': None
        }, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if assignment already exists
    existing = await db.project_staff.find_one({
        'user_id': staff_data.user_id,
        'project_id': staff_data.project_id,
        'tenant_id': user.get('tenant_id'),
        'deleted_at': None
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Staff already assigned to this project")
    
    # Create assignment
    staff_assignment = ProjectStaff(**staff_data.model_dump())
    staff_assignment.tenant_id = user.get('tenant_id')
    staff_assignment.assigned_by = current_user['user_id']
    
    staff_doc = staff_assignment.model_dump()
    staff_doc['created_at'] = staff_doc['created_at'].isoformat()
    staff_doc['updated_at'] = staff_doc['updated_at'].isoformat()
    
    await db.project_staff.insert_one(staff_doc)
    
    return {
        "success": True,
        "message": "Staff assigned successfully",
        "assignment": staff_assignment.model_dump()
    }

@router.post("/quick-create")
async def quick_create_staff(
    staff_data: QuickStaffCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Quickly create new staff member and optionally assign to project"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Check if phone already exists
    existing_user = await db.users.find_one({'phone': staff_data.phone}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    new_user = {
        'id': user_id,
        'name': staff_data.name,
        'phone': staff_data.phone,
        'email': staff_data.email,
        'password': bcrypt.hashpw(staff_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'role': 'staff',  # Basic staff role
        'tenant_id': user.get('tenant_id'),
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.users.insert_one(new_user)
    
    return {
        "success": True,
        "message": "Staff created successfully",
        "user": {
            "id": user_id,
            "name": staff_data.name,
            "phone": staff_data.phone,
            "role": staff_data.role,
            "default_password": staff_data.password
        }
    }

@router.get("/project/{project_id}")
async def get_project_staff(
    project_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all staff assigned to a specific project"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get project staff assignments
    staff_assignments = await db.project_staff.find({
        'project_id': project_id,
        'tenant_id': user.get('tenant_id'),
        'deleted_at': None,
        'status': 'active'
    }, {"_id": 0}).to_list(length=100)
    
    # Enrich with user details
    enriched_staff = []
    for assignment in staff_assignments:
        staff_user = await db.users.find_one({'id': assignment['user_id']}, {"_id": 0})
        if staff_user:
            enriched_staff.append({
                **assignment,
                'user_name': staff_user.get('name'),
                'user_phone': staff_user.get('phone'),
                'user_email': staff_user.get('email')
            })
    
    return {
        "success": True,
        "staff": enriched_staff,
        "total": len(enriched_staff)
    }

@router.get("/tenant-level")
async def get_tenant_level_staff(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all tenant-level staff (project_id = NULL)"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get tenant-level staff
    staff_assignments = await db.project_staff.find({
        'project_id': None,
        'tenant_id': user.get('tenant_id'),
        'deleted_at': None,
        'status': 'active'
    }, {"_id": 0}).to_list(length=100)
    
    # Enrich with user details
    enriched_staff = []
    for assignment in staff_assignments:
        staff_user = await db.users.find_one({'id': assignment['user_id']}, {"_id": 0})
        if staff_user:
            enriched_staff.append({
                **assignment,
                'user_name': staff_user.get('name'),
                'user_phone': staff_user.get('phone'),
                'user_email': staff_user.get('email')
            })
    
    return {
        "success": True,
        "staff": enriched_staff,
        "total": len(enriched_staff)
    }

@router.get("/user/{user_id}/projects")
async def get_user_projects(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all projects a user is assigned to"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all project assignments for this user
    assignments = await db.project_staff.find({
        'user_id': user_id,
        'tenant_id': user.get('tenant_id'),
        'deleted_at': None,
        'status': 'active'
    }, {"_id": 0}).to_list(length=100)
    
    # Get project details
    project_access = []
    for assignment in assignments:
        if assignment.get('project_id'):
            project = await db.projects.find_one({'id': assignment['project_id']}, {"_id": 0})
            if project:
                project_access.append({
                    'assignment': assignment,
                    'project': {
                        'id': project.get('id'),
                        'name': project.get('name'),
                        'location': project.get('location')
                    }
                })
        else:
            # Tenant-level access
            project_access.append({
                'assignment': assignment,
                'access_type': 'tenant_level',
                'message': 'Access to all projects'
            })
    
    return {
        "success": True,
        "projects": project_access,
        "total": len(project_access)
    }

@router.put("/{assignment_id}")
async def update_staff_assignment(
    assignment_id: str,
    update_data: ProjectStaffUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update staff assignment (role, commission, project transfer)"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get existing assignment
    existing = await db.project_staff.find_one({
        'id': assignment_id,
        'tenant_id': user.get('tenant_id'),
        'deleted_at': None
    }, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Update
    await db.project_staff.update_one(
        {'id': assignment_id},
        {'$set': update_dict}
    )
    
    # Get updated assignment
    updated = await db.project_staff.find_one({'id': assignment_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Assignment updated successfully",
        "assignment": updated
    }

@router.delete("/{assignment_id}")
async def remove_staff_assignment(
    assignment_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Remove staff from project (soft delete)"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete
    result = await db.project_staff.update_one(
        {'id': assignment_id, 'tenant_id': user.get('tenant_id')},
        {'$set': {'deleted_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {
        "success": True,
        "message": "Staff removed from project"
    }

@router.get("/available-staff")
async def get_available_staff(
    request: Request,
    current_user: dict = Depends(get_current_user),
    search: Optional[str] = None
):
    """Get all available staff in tenant for assignment"""
    db = get_db(request)
    
    # Get current user
    user = await db.users.find_one({'id': current_user['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build query
    query = {
        'tenant_id': user.get('tenant_id'),
        'is_active': True,
        'deleted_at': None
    }
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]
    
    # Get all users
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(length=100)
    
    # For each user, get their current assignments
    enriched_users = []
    for usr in users:
        assignments = await db.project_staff.find({
            'user_id': usr['id'],
            'deleted_at': None,
            'status': 'active'
        }, {"_id": 0}).to_list(length=10)
        
        enriched_users.append({
            **usr,
            'current_assignments': len(assignments),
            'assignments': assignments
        })
    
    return {
        "success": True,
        "staff": enriched_users,
        "total": len(enriched_users)
    }
