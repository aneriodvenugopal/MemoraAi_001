from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import AuthService
from typing import Optional

security = HTTPBearer()

async def get_current_user(request: Request) -> dict:
    """Get current user from JWT token"""
    try:
        authorization: str = request.headers.get("Authorization")
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        parts = authorization.split()
        if len(parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization format"
            )
            
        scheme, token = parts
        if scheme.lower() != 'bearer':
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )
        
        payload = AuthService.decode_token(token)
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

async def get_current_tenant(request: Request) -> Optional[str]:
    """Get current tenant ID from JWT token"""
    try:
        user = await get_current_user(request)
        return user.get('tenant_id')
    except:
        return None

def require_role(required_roles: list):
    """Decorator to require specific roles"""
    async def role_checker(request: Request):
        user = await get_current_user(request)
        user_role = user.get('role')
        
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker

async def require_saas_admin(request: Request):
    """Verify user is SaaS admin (phone: 9948303060)"""
    user_payload = await get_current_user(request)
    
    # Get db from request
    db = request.app.state.db
    
    # Get user from database
    user_doc = await db.users.find_one({'id': user_payload['user_id']}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is SaaS admin (9948303060)
    if user_doc.get('phone') != '9948303060':
        raise HTTPException(status_code=403, detail="Access denied. SaaS admin only.")
    
    return user_payload

async def get_user_project_context(user_id: str, tenant_id: str, project_id: str, db) -> dict:
    """
    Get user's role context for a specific project.
    Returns information about user's roles and permissions in the project.
    """
    from services.role_context_service import RoleContextService
    
    # Check if tenant admin
    is_tenant_admin = await RoleContextService.is_tenant_admin(user_id, tenant_id)
    
    # Check if project admin
    is_project_admin = await RoleContextService.is_project_admin(user_id, tenant_id, project_id)
    
    # Get all roles in project
    roles = await RoleContextService.get_user_roles_in_project(user_id, tenant_id, project_id)
    
    return {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "project_id": project_id,
        "is_tenant_admin": is_tenant_admin,
        "is_project_admin": is_project_admin,
        "roles": roles,
        "has_access": is_tenant_admin or is_project_admin or len(roles) > 0
    }

def require_project_access(required_roles: list = None):
    """
    Middleware to require project-level access.
    User must have tenant admin role OR specific project role.
    
    Args:
        required_roles: List of role names required (e.g., ["project_admin", "agent"])
                       If None, any role in the project is sufficient
    
    Usage:
        @router.get("/bank-accounts")
        async def get_accounts(
            project_id: str,
            current_user: dict = Depends(get_current_user),
            context: dict = Depends(require_project_access(["project_admin"]))
        ):
            # context contains: is_tenant_admin, is_project_admin, roles
    """
    async def project_access_checker(
        request: Request,
        project_id: str = None
    ):
        user = await get_current_user(request)
        db = request.app.state.db
        
        user_id = user.get('user_id')
        tenant_id = user.get('tenant_id')
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenant context available"
            )
        
        # If project_id not provided in dependency, try to get from query/path params
        if not project_id:
            project_id = request.query_params.get('project_id') or request.path_params.get('project_id')
        
        if not project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project ID required for this operation"
            )
        
        # Get user's context in this project
        context = await get_user_project_context(user_id, tenant_id, project_id, db)
        
        # Tenant admins always have access
        if context["is_tenant_admin"]:
            return context
        
        # If specific roles required, check for them
        if required_roles:
            user_role_names = [r.get("role_name") for r in context["roles"]]
            has_required_role = any(role in user_role_names for role in required_roles)
            
            if not has_required_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires one of these roles: {', '.join(required_roles)}"
                )
        else:
            # Any role in project is fine
            if not context["has_access"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No access to this project"
                )
        
        return context
    
    return project_access_checker
