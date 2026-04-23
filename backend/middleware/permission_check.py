"""
Permission-based Access Control Middleware

Provides decorators and functions to check if users have specific permissions
in the multi-role access control system.
"""

from fastapi import HTTPException, Request, Depends
from typing import List, Optional
from functools import wraps

from middleware.auth import get_current_user
from services.role_context_service import RoleContextService


async def require_permission(
    request: Request,
    permission: str,
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Dependency function to require a specific permission.
    
    Usage in route:
        @router.get("/protected-endpoint")
        async def protected_route(
            request: Request,
            permission_check = Depends(lambda r, u=Depends(get_current_user): 
                require_permission(r, "manage_properties", u))
        ):
            ...
    
    Args:
        request: FastAPI request object
        permission: Permission slug required
        project_id: Project context (optional, extracts from query/path if not provided)
        current_user: Current authenticated user
    
    Raises:
        HTTPException: 403 if user doesn't have permission
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Try to extract project_id from request if not provided
    if not project_id:
        # Check query params
        project_id = request.query_params.get("project_id")
        
        # Check path params
        if not project_id and hasattr(request, "path_params"):
            project_id = request.path_params.get("project_id")
    
    # Check permission
    has_perm = await RoleContextService.has_permission(
        user_id=user_id,
        tenant_id=tenant_id,
        permission=permission,
        project_id=project_id
    )
    
    if not has_perm:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have the required permission: {permission}"
        )
    
    return True


async def require_any_permission(
    request: Request,
    permissions: List[str],
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Require that user has at least one of the specified permissions.
    
    Args:
        request: FastAPI request object
        permissions: List of permission slugs (any one is sufficient)
        project_id: Project context (optional)
        current_user: Current authenticated user
    
    Raises:
        HTTPException: 403 if user doesn't have any of the permissions
    """
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")
    
    # Try to extract project_id from request if not provided
    if not project_id:
        project_id = request.query_params.get("project_id")
        if not project_id and hasattr(request, "path_params"):
            project_id = request.path_params.get("project_id")
    
    # Check if user has any of the permissions
    for permission in permissions:
        has_perm = await RoleContextService.has_permission(
            user_id=user_id,
            tenant_id=tenant_id,
            permission=permission,
            project_id=project_id
        )
        
        if has_perm:
            return True
    
    # User doesn't have any required permission
    raise HTTPException(
        status_code=403,
        detail=f"You don't have any of the required permissions: {', '.join(permissions)}"
    )


async def check_user_permission(
    user_id: str,
    tenant_id: str,
    permission: str,
    project_id: Optional[str] = None
) -> bool:
    """
    Utility function to check permission without raising exception.
    
    Returns:
        True if user has permission, False otherwise
    """
    return await RoleContextService.has_permission(
        user_id=user_id,
        tenant_id=tenant_id,
        permission=permission,
        project_id=project_id
    )


async def get_user_all_permissions(
    user_id: str,
    tenant_id: str,
    project_id: Optional[str] = None
) -> List[str]:
    """
    Get all permissions for a user in a context.
    
    Returns:
        List of permission slugs
    """
    return await RoleContextService.get_user_permissions_in_context(
        user_id=user_id,
        tenant_id=tenant_id,
        project_id=project_id
    )


class PermissionChecker:
    """
    Helper class for checking permissions in routes.
    
    Usage:
        permission_checker = PermissionChecker("manage_properties")
        
        @router.get("/endpoint")
        async def my_route(
            request: Request,
            current_user = Depends(get_current_user),
            _ = Depends(permission_checker.check)
        ):
            ...
    """
    
    def __init__(self, permission: str, extract_project_from: Optional[str] = None):
        """
        Initialize permission checker.
        
        Args:
            permission: Required permission slug
            extract_project_from: Name of path/query parameter containing project_id
        """
        self.permission = permission
        self.extract_project_from = extract_project_from
    
    async def check(
        self,
        request: Request,
        current_user: dict = Depends(get_current_user)
    ):
        """Check if current user has the required permission"""
        user_id = current_user.get("user_id")
        tenant_id = current_user.get("tenant_id")
        
        # Extract project_id if specified
        project_id = None
        if self.extract_project_from:
            # Try query params first
            project_id = request.query_params.get(self.extract_project_from)
            
            # Then try path params
            if not project_id and hasattr(request, "path_params"):
                project_id = request.path_params.get(self.extract_project_from)
        
        # Check permission
        has_perm = await RoleContextService.has_permission(
            user_id=user_id,
            tenant_id=tenant_id,
            permission=self.permission,
            project_id=project_id
        )
        
        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail=f"You don't have the required permission: {self.permission}"
            )
        
        return True
