"""
Roles & Multi-Role Access Control API Routes

New system for managing roles, permissions, and role assignments.
Supports:
- Viewing available roles and their permissions
- Assigning roles to users at tenant/project level
- Context selection (switching between roles)
- Permission checking
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

from middleware.auth import get_current_user
from services.role_context_service import RoleContextService
from models.role import RoleAssignmentCreate, RoleAssignmentUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


def get_db(request: Request):
    return request.app.state.db


# ============= ROLE MANAGEMENT ENDPOINTS =============

@router.get("/system-roles")
async def get_system_roles(request: Request):
    """
    Get all system roles with their permissions.
    
    Returns roles sorted by hierarchy level.
    """
    roles = await RoleContextService.get_all_system_roles()
    
    return {
        "success": True,
        "total": len(roles),
        "roles": roles
    }


@router.get("/system-roles/{role_slug}")
async def get_role_by_slug(role_slug: str, request: Request):
    """
    Get details of a specific role by its slug.
    """
    role = await RoleContextService.get_role_by_slug(role_slug)
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return {
        "success": True,
        "role": role
    }


# ============= ROLE ASSIGNMENT ENDPOINTS (NEW SYSTEM) =============

@router.post("/assignments")
async def create_role_assignment(
    assignment_data: RoleAssignmentCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a role to a user in a specific context (tenant or project).
    
    Request Body:
    {
        "user_id": "user_abc",
        "tenant_id": "tenant_xyz",
        "project_id": "project_123",  // optional, null for tenant-level
        "role_id": "role_tenant_admin",
        "valid_from": "2024-01-01T00:00:00Z",  // optional
        "valid_until": "2024-12-31T23:59:59Z",  // optional
        "metadata": {
            "commission_percentage": 5.0,
            "reporting_to": "manager_id"
        }
    }
    
    Access Control: Only Tenant Admins can assign roles
    """
    db = get_db(request)
    
    current_user_id = current_user.get("user_id")
    current_tenant_id = current_user.get("tenant_id")
    
    # Check if current user has permission to assign roles
    has_permission = await RoleContextService.has_permission(
        user_id=current_user_id,
        tenant_id=current_tenant_id,
        permission="assign_roles"
    )
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to assign roles"
        )
    
    # Verify tenant matches (can only assign in own tenant)
    if assignment_data.tenant_id != current_tenant_id:
        raise HTTPException(
            status_code=403,
            detail="You can only assign roles within your tenant"
        )
    
    # Verify user exists
    user = await db.users.find_one({"id": assignment_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify project exists (if project-level assignment)
    if assignment_data.project_id:
        project = await db.projects.find_one({
            "id": assignment_data.project_id,
            "tenant_id": assignment_data.tenant_id,
            "deleted_at": None
        }, {"_id": 0})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Create the assignment
    try:
        assignment = await RoleContextService.create_new_role_assignment(
            user_id=assignment_data.user_id,
            tenant_id=assignment_data.tenant_id,
            role_id=assignment_data.role_id,
            project_id=assignment_data.project_id,
            assigned_by=current_user_id,
            metadata=assignment_data.metadata,
            valid_from=assignment_data.valid_from,
            valid_until=assignment_data.valid_until
        )
        
        # Get role name for response
        role = await RoleContextService.get_role_by_id(assignment_data.role_id)
        
        return {
            "success": True,
            "message": f"Role '{role.get('name')}' assigned successfully",
            "assignment": assignment
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assignments/user/{user_id}")
async def get_user_assignments(
    user_id: str,
    tenant_id: Optional[str] = None,
    project_id: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all role assignments for a specific user.
    
    Query Parameters:
    - tenant_id: Filter by tenant (optional)
    - project_id: Filter by project (optional)
    """
    current_user_id = current_user.get("user_id")
    current_tenant_id = current_user.get("tenant_id")
    
    # Users can view their own assignments, or admins can view others
    if current_user_id != user_id:
        has_permission = await RoleContextService.has_permission(
            user_id=current_user_id,
            tenant_id=current_tenant_id,
            permission="manage_users"
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own role assignments"
            )
    
    assignments = await RoleContextService.get_user_role_assignments_new(
        user_id=user_id,
        tenant_id=tenant_id,
        project_id=project_id,
        include_permissions=True
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "total": len(assignments),
        "assignments": assignments
    }


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Deactivate a role assignment.
    
    Access Control: Only users with 'manage_users' permission
    """
    current_user_id = current_user.get("user_id")
    current_tenant_id = current_user.get("tenant_id")
    
    # Check permission
    has_permission = await RoleContextService.has_permission(
        user_id=current_user_id,
        tenant_id=current_tenant_id,
        permission="assign_roles"
    )
    
    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to remove role assignments"
        )
    
    success = await RoleContextService.deactivate_role_assignment(assignment_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {
        "success": True,
        "message": "Role assignment removed successfully"
    }


# ============= CONTEXT & PERMISSIONS ENDPOINTS =============

@router.get("/my-contexts")
async def get_my_contexts(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all available contexts for the current user.
    
    Returns all tenant/project combinations where user has roles.
    Used for context selection after login.
    """
    user_id = current_user.get("user_id")
    
    contexts = await RoleContextService.get_user_contexts(user_id)
    
    return {
        "success": True,
        "user_id": user_id,
        "total_contexts": len(contexts),
        "contexts": contexts
    }


@router.get("/my-permissions")
async def get_my_permissions(
    tenant_id: str,
    project_id: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all permissions for current user in a specific context.
    
    Query Parameters:
    - tenant_id: Tenant context (required)
    - project_id: Project context (optional)
    """
    user_id = current_user.get("user_id")
    
    permissions = await RoleContextService.get_user_permissions_in_context(
        user_id=user_id,
        tenant_id=tenant_id,
        project_id=project_id
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "project_id": project_id,
        "total_permissions": len(permissions),
        "permissions": permissions
    }


class PermissionCheckRequest(BaseModel):
    permission: str
    tenant_id: str
    project_id: Optional[str] = None


@router.post("/check-permission")
async def check_permission(
    data: PermissionCheckRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if current user has a specific permission in a context.
    
    Request Body:
    {
        "permission": "manage_properties",
        "tenant_id": "tenant_xyz",
        "project_id": "project_123"  // optional
    }
    """
    user_id = current_user.get("user_id")
    
    has_perm = await RoleContextService.has_permission(
        user_id=user_id,
        tenant_id=data.tenant_id,
        permission=data.permission,
        project_id=data.project_id
    )
    
    return {
        "success": True,
        "has_permission": has_perm,
        "permission": data.permission,
        "context": {
            "tenant_id": data.tenant_id,
            "project_id": data.project_id
        }
    }


@router.get("/project/{project_id}/staff")
async def get_project_staff_assignments(
    project_id: str,
    role_slug: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all users with role assignments in a specific project.
    
    Query Parameters:
    - role_slug: Filter by specific role slug (optional)
    
    Access Control: Project Admin or Tenant Admin
    """
    db = get_db(request)
    current_user_id = current_user.get("user_id")
    current_tenant_id = current_user.get("tenant_id")
    
    # Check if user has permission to view project staff
    is_tenant_admin = await RoleContextService.is_tenant_admin(current_user_id, current_tenant_id)
    is_project_admin = await RoleContextService.is_project_admin(current_user_id, current_tenant_id, project_id)
    
    if not (is_tenant_admin or is_project_admin):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view project staff"
        )
    
    # Build query
    query = {
        "project_id": project_id,
        "is_active": True
    }
    
    assignments = await db.role_assignments.find(query, {"_id": 0}).to_list(length=None)
    
    # Enrich with user and role details
    for assignment in assignments:
        # Get user info
        user = await db.users.find_one(
            {"id": assignment["user_id"]},
            {"_id": 0, "name": 1, "email": 1, "phone": 1}
        )
        if user:
            assignment["user_name"] = user.get("name")
            assignment["user_email"] = user.get("email")
            assignment["user_phone"] = user.get("phone")
        
        # Get role info
        role = await RoleContextService.get_role_by_id(assignment["role_id"])
        if role:
            assignment["role_name"] = role.get("name")
            assignment["role_slug"] = role.get("slug")
            assignment["role_level"] = role.get("level")
    
    # Filter by role_slug if provided
    if role_slug:
        assignments = [a for a in assignments if a.get("role_slug") == role_slug]
    
    return {
        "success": True,
        "project_id": project_id,
        "total": len(assignments),
        "staff": assignments
    }
