"""
Role Context Service - Manages context-aware role assignments and permissions.

This service handles the flexible multi-role architecture where:
- Same user can have multiple roles in the same project
- Same user can have roles across multiple projects and tenants
- Role assignments are context-specific with metadata (commission%, permissions, etc.)
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class RoleContextService:
    """Service for managing context-aware role assignments"""
    
    @staticmethod
    async def get_user_roles_in_project(
        user_id: str,
        tenant_id: str,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all roles a user has in a specific project context.
        
        Args:
            user_id: The user's ID
            tenant_id: The tenant ID
            project_id: The project ID (None for tenant-level roles)
        
        Returns:
            List of role assignments with metadata
            
        Example:
            roles = await get_user_roles_in_project("ramu", "tenant1", "projectA")
            # Returns: [
            #   {role_name: "agent", commission_percentage: 5.0, ...},
            #   {role_name: "customer", property_ids: ["p1"], ...}
            # ]
        """
        query = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "active",
            "deleted_at": None
        }
        
        if project_id:
            query["project_id"] = project_id
        
        role_assignments = await db.project_staff.find(query, {"_id": 0}).to_list(length=None)
        return role_assignments
    
    @staticmethod
    async def get_tenant_level_roles(user_id: str, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get user's tenant-level roles (project_id is None).
        These roles typically grant access across all projects.
        
        Example: Tenant Admin role
        """
        query = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": None,
            "status": "active",
            "deleted_at": None
        }
        
        role_assignments = await db.project_staff.find(query, {"_id": 0}).to_list(length=None)
        return role_assignments
    
    @staticmethod
    async def is_tenant_admin(user_id: str, tenant_id: str) -> bool:
        """
        Check if user has tenant admin role (can access all projects).
        
        Tenant admin is identified by:
        1. can_view_all_projects = True, OR
        2. role_name = "tenant_admin", OR
        3. project_id is None and role allows full access
        """
        # Check for tenant-level role with full access
        tenant_role = await db.project_staff.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "status": "active",
            "deleted_at": None,
            "$or": [
                {"can_view_all_projects": True},
                {"role_name": "tenant_admin"},
                {"role_name": "admin"}
            ]
        }, {"_id": 0})
        
        if tenant_role:
            return True
        
        # Also check the main users table for backward compatibility
        user = await db.users.find_one({
            "id": user_id,
            "tenant_id": tenant_id,
            "deleted_at": None
        }, {"_id": 0})
        
        if user:
            # Get user's primary role
            role = await db.roles.find_one({"id": user.get("role_id")}, {"_id": 0})
            if role and role.get("slug") in ["tenant_admin", "super_admin"]:
                return True
        
        return False
    
    @staticmethod
    async def is_project_admin(user_id: str, tenant_id: str, project_id: str) -> bool:
        """
        Check if user has project admin role for a specific project.
        """
        project_role = await db.project_staff.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "status": "active",
            "deleted_at": None,
            "$or": [
                {"role_name": "project_admin"},
                {"role_name": "admin"}
            ]
        }, {"_id": 0})
        
        return project_role is not None
    
    @staticmethod
    async def has_role_in_project(
        user_id: str,
        tenant_id: str,
        project_id: str,
        required_roles: List[str]
    ) -> bool:
        """
        Check if user has any of the required roles in a project.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            project_id: Project ID
            required_roles: List of role names (e.g., ["agent", "supervisor"])
        
        Returns:
            True if user has at least one of the required roles
        """
        # First check if user is tenant admin (has access to all projects)
        if await RoleContextService.is_tenant_admin(user_id, tenant_id):
            return True
        
        # Check for project-specific roles
        role_assignment = await db.project_staff.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "role_name": {"$in": required_roles},
            "status": "active",
            "deleted_at": None
        }, {"_id": 0})
        
        return role_assignment is not None
    
    @staticmethod
    async def get_user_projects(user_id: str, tenant_id: str) -> List[str]:
        """
        Get all project IDs where user has any role assignment.
        
        Returns:
            List of project IDs
        """
        # If user is tenant admin, they have access to ALL projects
        if await RoleContextService.is_tenant_admin(user_id, tenant_id):
            # Return all projects in the tenant
            projects = await db.projects.find(
                {"tenant_id": tenant_id, "deleted_at": None},
                {"_id": 0, "id": 1}
            ).to_list(length=None)
            return [p["id"] for p in projects]
        
        # Otherwise, return only projects where user has explicit role assignments
        role_assignments = await db.project_staff.find({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": {"$ne": None},
            "status": "active",
            "deleted_at": None
        }, {"_id": 0, "project_id": 1}).to_list(length=None)
        
        project_ids = list(set([ra["project_id"] for ra in role_assignments if ra.get("project_id")]))
        return project_ids
    
    @staticmethod
    async def get_all_contexts_for_user(user_id: str) -> List[Dict[str, Any]]:
        """
        Get all tenant/project combinations where user has any role.
        Checks both role_assignments and project_staff collections.
        Handles both old schema (is_active) and new schema (status).
        """
        # Check role_assignments collection with flexible query
        role_assignments = await db.role_assignments.find({
            "user_id": user_id,
            "$or": [
                {"status": "active"},
                {"is_active": True},
                {"status": {"$exists": False}, "is_active": {"$exists": False}}  # Legacy records
            ],
            "deleted_at": None
        }, {"_id": 0}).to_list(length=None)
        
        # Also check project_staff for backward compatibility
        staff_assignments = await db.project_staff.find({
            "user_id": user_id,
            "$or": [
                {"status": "active"},
                {"is_active": True}
            ],
            "deleted_at": None
        }, {"_id": 0}).to_list(length=None)
        
        # Combine both
        all_assignments = role_assignments + staff_assignments
        
        # Group by tenant and project
        contexts = {}
        for assignment in all_assignments:
            tenant_id = assignment.get("tenant_id")
            if not tenant_id:
                continue
            project_id = assignment.get("project_id", "tenant_level")
            key = f"{tenant_id}:{project_id}"
            
            if key not in contexts:
                contexts[key] = {
                    "tenant_id": tenant_id,
                    "project_id": project_id if project_id != "tenant_level" else None,
                    "role_id": assignment.get("role_id"),
                    "role_name": assignment.get("role_name"),
                    "display_name": assignment.get("display_name"),
                    "roles": [],
                    "permissions": assignment.get("context_metadata", {}).get("permissions", []) or assignment.get("metadata", {}).get("permissions", [])
                }
            
            contexts[key]["roles"].append({
                "role_id": assignment.get("role_id"),
                "role_name": assignment.get("role_name"),
                "context_metadata": assignment.get("context_metadata", {}) or assignment.get("metadata", {})
            })
        
        return list(contexts.values())
    
    @staticmethod
    async def create_role_assignment(
        user_id: str,
        tenant_id: str,
        role_id: str,
        role_name: str,
        project_id: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
        assigned_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new role assignment for a user.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            role_id: Role ID from roles collection
            role_name: Role name (agent, customer, supervisor, etc.)
            project_id: Project ID (None for tenant-level roles)
            context_metadata: Role-specific data (commission%, permissions, etc.)
            assigned_by: User ID who created this assignment
        
        Returns:
            Created assignment document
        """
        from datetime import datetime, timezone
        import uuid
        
        assignment = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "role_id": role_id,
            "role_name": role_name,
            "context_metadata": context_metadata or {},
            "commission_rate": context_metadata.get("commission_percentage", 0.0) if context_metadata else 0.0,
            "can_create_staff": False,
            "can_view_all_projects": role_name in ["tenant_admin", "admin"],
            "status": "active",
            "assigned_by": assigned_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.project_staff.insert_one(assignment)
        return assignment
    
    # ============= NEW MULTI-ROLE SYSTEM METHODS =============
    
    @staticmethod
    async def get_role_by_id(role_id: str) -> Optional[Dict[str, Any]]:
        """Get role details by ID including permissions"""
        role = await db.roles.find_one({"id": role_id}, {"_id": 0})
        return role
    
    @staticmethod
    async def get_role_by_slug(slug: str) -> Optional[Dict[str, Any]]:
        """Get role details by slug"""
        role = await db.roles.find_one({"slug": slug}, {"_id": 0})
        return role
    
    @staticmethod
    async def get_all_system_roles() -> List[Dict[str, Any]]:
        """Get all system roles with their permissions"""
        roles = await db.roles.find(
            {"is_system": True, "level": {"$exists": True}},
            {"_id": 0}
        ).sort("level", 1).to_list(length=None)
        return roles
    
    @staticmethod
    async def create_new_role_assignment(
        user_id: str,
        tenant_id: str,
        role_id: str,
        project_id: Optional[str] = None,
        assigned_by: str = None,
        metadata: Optional[Dict[str, Any]] = None,
        valid_from: Optional[datetime] = None,
        valid_until: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a new role assignment using the new role_assignments collection.
        
        This is the NEW system that uses role_assignments table instead of project_staff.
        """
        import uuid
        
        # Get role details to validate
        role = await RoleContextService.get_role_by_id(role_id)
        if not role:
            raise ValueError(f"Role {role_id} not found")
        
        # Check if assignment already exists
        existing = await db.role_assignments.find_one({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "role_id": role_id,
            "is_active": True
        }, {"_id": 0})
        
        if existing:
            raise ValueError("Role assignment already exists for this user in this context")
        
        assignment = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenant_id,
            "project_id": project_id,
            "role_id": role_id,
            "assigned_by": assigned_by or "system",
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "valid_from": valid_from.isoformat() if valid_from else None,
            "valid_until": valid_until.isoformat() if valid_until else None,
            "metadata": metadata or {}
        }
        
        await db.role_assignments.insert_one(assignment)
        return assignment
    
    @staticmethod
    async def get_user_role_assignments_new(
        user_id: str,
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        include_permissions: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get all active role assignments for a user (NEW system).
        
        Args:
            user_id: User ID
            tenant_id: Filter by tenant (optional)
            project_id: Filter by project (optional)
            include_permissions: Whether to include role permissions
        
        Returns:
            List of role assignments with role details
        """
        query = {
            "user_id": user_id,
            "is_active": True
        }
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        if project_id:
            query["project_id"] = project_id
        
        assignments = await db.role_assignments.find(query, {"_id": 0}).to_list(length=None)
        
        # Enrich with role details
        if include_permissions:
            for assignment in assignments:
                role = await RoleContextService.get_role_by_id(assignment["role_id"])
                if role:
                    assignment["role_name"] = role.get("name")
                    assignment["role_slug"] = role.get("slug")
                    assignment["role_level"] = role.get("level")
                    assignment["permissions"] = role.get("permissions", [])
        
        return assignments
    
    @staticmethod
    async def get_user_permissions_in_context(
        user_id: str,
        tenant_id: str,
        project_id: Optional[str] = None
    ) -> List[str]:
        """
        Get all permissions a user has in a specific context.
        Combines permissions from all roles user has in that context.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            project_id: Project ID (None for tenant-level)
        
        Returns:
            List of unique permission slugs
        """
        # Get all role assignments for this user in this context
        assignments = await RoleContextService.get_user_role_assignments_new(
            user_id=user_id,
            tenant_id=tenant_id,
            project_id=project_id,
            include_permissions=True
        )
        
        # Also check tenant-level roles if querying project context
        if project_id:
            tenant_assignments = await RoleContextService.get_user_role_assignments_new(
                user_id=user_id,
                tenant_id=tenant_id,
                project_id=None,
                include_permissions=True
            )
            assignments.extend(tenant_assignments)
        
        # Collect all unique permissions
        all_permissions = set()
        for assignment in assignments:
            permissions = assignment.get("permissions", [])
            all_permissions.update(permissions)
        
        return list(all_permissions)
    
    @staticmethod
    async def has_permission(
        user_id: str,
        tenant_id: str,
        permission: str,
        project_id: Optional[str] = None
    ) -> bool:
        """
        Check if user has a specific permission in a context.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            permission: Permission slug to check
            project_id: Project ID (optional)
        
        Returns:
            True if user has the permission
        """
        permissions = await RoleContextService.get_user_permissions_in_context(
            user_id=user_id,
            tenant_id=tenant_id,
            project_id=project_id
        )
        
        return permission in permissions
    
    @staticmethod
    async def get_user_contexts(user_id: str) -> List[Dict[str, Any]]:
        """
        Get all available contexts (tenant + project combinations) for a user.
        Used for context selection on login.
        
        Returns:
            List of contexts with tenant_id, project_id, and roles
        """
        assignments = await db.role_assignments.find({
            "user_id": user_id,
            "is_active": True
        }, {"_id": 0}).to_list(length=None)
        
        # Group by tenant and project
        contexts_dict = {}
        for assignment in assignments:
            tenant_id = assignment["tenant_id"]
            project_id = assignment.get("project_id")
            
            key = f"{tenant_id}:{project_id or 'tenant_level'}"
            
            if key not in contexts_dict:
                contexts_dict[key] = {
                    "tenant_id": tenant_id,
                    "project_id": project_id,
                    "roles": []
                }
            
            # Get role details
            role = await RoleContextService.get_role_by_id(assignment["role_id"])
            if role:
                contexts_dict[key]["roles"].append({
                    "role_id": assignment["role_id"],
                    "role_name": role.get("name"),
                    "role_slug": role.get("slug"),
                    "role_level": role.get("level"),
                    "permissions": role.get("permissions", [])
                })
        
        # Enrich with tenant and project names
        contexts = list(contexts_dict.values())
        for context in contexts:
            # Get tenant name
            tenant = await db.tenants.find_one(
                {"id": context["tenant_id"]},
                {"_id": 0, "company_name": 1}
            )
            context["tenant_name"] = tenant.get("company_name") if tenant else "Unknown Tenant"
            
            # Get project name if applicable
            if context["project_id"]:
                project = await db.projects.find_one(
                    {"id": context["project_id"]},
                    {"_id": 0, "project_name": 1}
                )
                context["project_name"] = project.get("project_name") if project else "Unknown Project"
            else:
                context["project_name"] = None
        
        return contexts
    
    @staticmethod
    async def deactivate_role_assignment(assignment_id: str) -> bool:
        """
        Deactivate a role assignment.
        
        Args:
            assignment_id: Assignment ID to deactivate
        
        Returns:
            True if successful
        """
        result = await db.role_assignments.update_one(
            {"id": assignment_id},
            {"$set": {"is_active": False}}
        )
        
        return result.modified_count > 0

