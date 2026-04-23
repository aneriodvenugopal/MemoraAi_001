"""
Role Assignment API Routes
Manages flexible role assignments for users across tenants and projects.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from middleware.auth import get_current_user
from services.role_context_service import RoleContextService

router = APIRouter(prefix="/role-assignments", tags=["role-assignments"])

def get_db(request: Request):
    return request.app.state.db


@router.post("/assign", response_model=dict)
async def assign_role_to_user(
    data: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a role to a user in a specific context (tenant/project).
    
    Request Body:
    {
        "user_id": "user123",
        "tenant_id": "tenant1",
        "project_id": "projectA" (optional, null for tenant-level roles),
        "role_id": "role123",
        "role_name": "agent" (agent, customer, supervisor, project_admin, etc.),
        "context_metadata": {
            "commission_percentage": 5.0,
            "permissions": ["view_properties", "create_leads"]
        }
    }
    
    Access Control: Only Tenant Admins can assign roles
    """
    db = get_db(request)
    
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Check if current user is tenant admin
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    if not is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail="Only Tenant Admins can assign roles"
        )
    
    # Validate required fields
    target_user_id = data.get("user_id")
    target_tenant_id = data.get("tenant_id")
    target_project_id = data.get("project_id")
    role_id = data.get("role_id")
    role_name = data.get("role_name")
    context_metadata = data.get("context_metadata", {})
    
    if not all([target_user_id, target_tenant_id, role_id, role_name]):
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: user_id, tenant_id, role_id, role_name"
        )
    
    # Verify tenant matches (can only assign roles in own tenant)
    if target_tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot assign roles in a different tenant"
        )
    
    # Verify user exists
    user = await db.users.find_one({"id": target_user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If project specified, verify it exists
    if target_project_id:
        project = await db.projects.find_one({
            "id": target_project_id,
            "tenant_id": target_tenant_id,
            "deleted_at": None
        }, {"_id": 0})
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if this role assignment already exists
    existing = await db.project_staff.find_one({
        "user_id": target_user_id,
        "tenant_id": target_tenant_id,
        "project_id": target_project_id,
        "role_id": role_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This role assignment already exists for the user"
        )
    
    # Create role assignment
    assignment = await RoleContextService.create_role_assignment(
        user_id=target_user_id,
        tenant_id=target_tenant_id,
        role_id=role_id,
        role_name=role_name,
        project_id=target_project_id,
        context_metadata=context_metadata,
        assigned_by=user_id
    )
    
    return {
        "success": True,
        "message": f"Role '{role_name}' assigned successfully to user in {'project ' + target_project_id if target_project_id else 'tenant-level'}",
        "assignment": assignment
    }


@router.get("/user/{user_id}", response_model=dict)
async def get_user_role_assignments(
    user_id: str,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all role assignments for a user.
    
    Query Parameters:
    - tenant_id: Filter by tenant (optional)
    - project_id: Filter by project (optional)
    
    Returns all contexts where the user has roles.
    """
    db = get_db(request)
    
    # Check if current user is tenant admin or requesting their own roles
    current_user_id = current_user.get("user_id")
    current_tenant_id = current_user.get("tenant_id")
    
    is_tenant_admin = await RoleContextService.is_tenant_admin(current_user_id, current_tenant_id)
    
    if not is_tenant_admin and current_user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own role assignments"
        )
    
    # Build query
    query = {
        "user_id": user_id,
        "status": "active",
        "deleted_at": None
    }
    
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    if project_id:
        query["project_id"] = project_id
    
    assignments = await db.project_staff.find(query, {"_id": 0}).to_list(length=None)
    
    # Enrich with project information
    for assignment in assignments:
        if assignment.get("project_id"):
            project = await db.projects.find_one(
                {"id": assignment["project_id"], "deleted_at": None},
                {"_id": 0, "project_name": 1}
            )
            assignment["project_name"] = project.get("project_name") if project else "Unknown"
    
    return {
        "success": True,
        "user_id": user_id,
        "total_assignments": len(assignments),
        "assignments": assignments
    }


@router.get("/project/{project_id}/users", response_model=dict)
async def get_project_role_assignments(
    project_id: str,
    role_name: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all users with role assignments in a project.
    
    Query Parameters:
    - role_name: Filter by specific role (optional)
    
    Access Control: Tenant Admin or Project Admin
    """
    db = get_db(request)
    
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Check access
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    is_project_admin = await RoleContextService.is_project_admin(user_id, tenant_id, project_id)
    
    if not (is_tenant_admin or is_project_admin):
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this project's role assignments"
        )
    
    # Build query
    query = {
        "project_id": project_id,
        "tenant_id": tenant_id,
        "status": "active",
        "deleted_at": None
    }
    
    if role_name:
        query["role_name"] = role_name
    
    assignments = await db.project_staff.find(query, {"_id": 0}).to_list(length=None)
    
    # Enrich with user information
    for assignment in assignments:
        user = await db.users.find_one(
            {"id": assignment["user_id"]},
            {"_id": 0, "name": 1, "phone": 1, "email": 1}
        )
        if user:
            assignment["user_name"] = user.get("name")
            assignment["user_phone"] = user.get("phone")
            assignment["user_email"] = user.get("email")
    
    return {
        "success": True,
        "project_id": project_id,
        "total_assignments": len(assignments),
        "assignments": assignments
    }


@router.delete("/assignment/{assignment_id}", response_model=dict)
async def remove_role_assignment(
    assignment_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove (soft delete) a role assignment.
    
    Access Control: Only Tenant Admins can remove role assignments
    """
    db = get_db(request)
    
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Check if current user is tenant admin
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    if not is_tenant_admin:
        raise HTTPException(
            status_code=403,
            detail="Only Tenant Admins can remove role assignments"
        )
    
    # Find assignment
    assignment = await db.project_staff.find_one({
        "id": assignment_id,
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0})
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Role assignment not found")
    
    # Soft delete
    await db.project_staff.update_one(
        {"id": assignment_id},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "status": "inactive"
        }}
    )
    
    return {
        "success": True,
        "message": "Role assignment removed successfully"
    }


@router.get("/my-contexts", response_model=dict)
async def get_my_role_contexts(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all tenant/project contexts where the current user has any role.
    Auto-migrates legacy user roles to role_assignments if not present.
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    db = get_db(request)
    
    # First, check if user has any role assignments
    existing_assignments = await db.role_assignments.find({
        "user_id": user_id,
        "$or": [
            {"status": "active"},
            {"is_active": True}
        ]
    }).to_list(length=1)
    
    # If no assignments, auto-migrate from user record (legacy system)
    if not existing_assignments:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user:
            # Get role_id (could be in 'role_id' field or nested in 'role' object)
            role_id = user.get("role_id")
            role_data = user.get("role", {})
            
            if not role_id and isinstance(role_data, dict):
                role_id = role_data.get("id")
            
            if role_id:
                # Lookup the role details from master_roles collection
                role_doc = await db.master_roles.find_one({"id": role_id}, {"_id": 0})
                if not role_doc:
                    role_doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
                
                role_name = "user"
                display_name = "User"
                permissions = []
                
                if role_doc:
                    role_name = role_doc.get("slug") or role_doc.get("name", "user").lower().replace(" ", "_")
                    display_name = role_doc.get("name", "User")
                    permissions = role_doc.get("permissions", [])
                elif isinstance(role_data, dict):
                    role_name = role_data.get("slug", "user")
                    display_name = role_data.get("name", "User")
                    permissions = role_data.get("permissions", [])
                
                # Create role assignment from legacy data
                assignment = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "project_id": None,  # Tenant-level role
                    "role_id": role_id,
                    "role_name": role_name,
                    "display_name": display_name,
                    "context_metadata": {
                        "permissions": permissions,
                        "migrated_from": "legacy_user_role"
                    },
                    "status": "active",
                    "is_active": True,
                    "assigned_by": "system_migration",
                    "assigned_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_at": None
                }
                
                await db.role_assignments.insert_one(assignment)
    
    # Get all contexts
    contexts = await RoleContextService.get_all_contexts_for_user(user_id)
    
    # If still empty, check role_assignments collection directly
    if not contexts:
        assignments = await db.role_assignments.find({
            "user_id": user_id,
            "$or": [
                {"status": "active"},
                {"is_active": True}
            ]
        }, {"_id": 0}).to_list(length=None)
        
        for a in assignments:
            contexts.append({
                "tenant_id": a.get("tenant_id"),
                "project_id": a.get("project_id"),
                "role_id": a.get("role_id"),
                "role_name": a.get("role_name"),
                "display_name": a.get("display_name"),
                "permissions": a.get("context_metadata", {}).get("permissions", []) or a.get("metadata", {}).get("permissions", [])
            })
    
    # Enrich with tenant and project names
    for context in contexts:
        tenant = await db.tenants.find_one(
            {"id": context.get("tenant_id"), "deleted_at": None},
            {"_id": 0, "name": 1, "company_name": 1}
        )
        context["tenant_name"] = tenant.get("name") or tenant.get("company_name", "Unknown") if tenant else "Unknown"
        
        if context.get("project_id"):
            project = await db.projects.find_one(
                {"id": context["project_id"], "deleted_at": None},
                {"_id": 0, "name": 1, "project_name": 1}
            )
            context["project_name"] = project.get("name") or project.get("project_name", "Unknown") if project else "Unknown"
    
    return {
        "success": True,
        "user_id": user_id,
        "total_contexts": len(contexts),
        "contexts": contexts
    }
