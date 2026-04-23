"""
Seed script to set up the flexible role system.
Creates example roles and demonstrates the multi-role architecture.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'retoerp')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def seed_roles():
    """Seed common roles for the system"""
    
    roles = [
        {
            "id": str(uuid.uuid4()),
            "name": "Tenant Admin",
            "slug": "tenant_admin",
            "description": "Full access to tenant - can manage all projects, users, and settings",
            "is_system": True,
            "permissions": [
                "manage_projects", "manage_users", "manage_properties", 
                "manage_bookings", "manage_payments", "manage_commissions",
                "manage_bank_accounts", "view_analytics"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Project Admin",
            "slug": "project_admin",
            "description": "Admin for specific project(s) - can manage project-level data",
            "is_system": True,
            "permissions": [
                "manage_properties", "manage_bookings", "manage_payments",
                "manage_bank_accounts_project", "view_project_analytics"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Agent",
            "slug": "agent",
            "description": "Sales agent - can create leads, manage bookings, earn commissions",
            "is_system": True,
            "permissions": [
                "create_leads", "manage_own_leads", "create_bookings",
                "view_properties", "view_own_commissions"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Customer",
            "slug": "customer",
            "description": "Property buyer/customer - can view their bookings and make payments",
            "is_system": True,
            "permissions": [
                "view_own_bookings", "view_own_payments", "make_payments",
                "view_own_properties", "request_resale"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Supervisor",
            "slug": "supervisor",
            "description": "Team supervisor - manages agents, earns gap commissions",
            "is_system": True,
            "permissions": [
                "manage_team", "view_team_performance", "view_own_commissions",
                "create_leads", "manage_bookings"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vendor",
            "slug": "vendor",
            "description": "External vendor/contractor for project",
            "is_system": True,
            "permissions": [
                "view_project_details", "submit_invoices", "track_payments"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Staff",
            "slug": "staff",
            "description": "General staff member with basic access",
            "is_system": True,
            "permissions": [
                "view_properties", "create_leads", "view_bookings"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Insert roles (skip if already exists)
    for role in roles:
        existing = await db.roles.find_one({"slug": role["slug"]}, {"_id": 0})
        if existing:
            print(f"✓ Role '{role['name']}' already exists")
        else:
            await db.roles.insert_one(role)
            print(f"✓ Created role '{role['name']}'")


async def create_example_scenario():
    """
    Create an example scenario demonstrating the flexible role system:
    
    User "Ramu" has multiple roles:
    - Agent in Tenant1 ProjectA (5% commission)
    - Customer in Tenant1 ProjectA (bought property)
    - Supervisor in Tenant1 ProjectB (7% commission)
    - Customer in Tenant2 ProjectX
    """
    
    # This is just for documentation - actual implementation would be done via API
    print("\n" + "="*80)
    print("EXAMPLE SCENARIO: Multi-Role User (Ramu)")
    print("="*80)
    
    print("""
Ramu's Role Assignments:
------------------------

1. Tenant1 - ProjectA - Agent Role:
   {
     "user_id": "ramu_123",
     "tenant_id": "tenant1",
     "project_id": "projectA",
     "role_id": "<agent_role_id>",
     "role_name": "agent",
     "context_metadata": {
       "commission_percentage": 5.0,
       "team": "Team Alpha"
     }
   }

2. Tenant1 - ProjectA - Customer Role:
   {
     "user_id": "ramu_123",
     "tenant_id": "tenant1",
     "project_id": "projectA",
     "role_id": "<customer_role_id>",
     "role_name": "customer",
     "context_metadata": {
       "property_ids": ["prop_101"],
       "booking_ids": ["book_201"]
     }
   }

3. Tenant1 - ProjectB - Supervisor Role:
   {
     "user_id": "ramu_123",
     "tenant_id": "tenant1",
     "project_id": "projectB",
     "role_id": "<supervisor_role_id>",
     "role_name": "supervisor",
     "context_metadata": {
       "commission_percentage": 7.0,
       "team_size": 5
     }
   }

4. Tenant2 - ProjectX - Customer Role:
   {
     "user_id": "ramu_123",
     "tenant_id": "tenant2",
     "project_id": "projectX",
     "role_id": "<customer_role_id>",
     "role_name": "customer",
     "context_metadata": {
       "property_ids": ["prop_999"]
     }
   }

How Ramu Accesses Banking System:
---------------------------------

When accessing bank accounts in:

- Tenant1-ProjectA: Can see accounts (as Agent or Customer role)
- Tenant1-ProjectB: Can see accounts (as Supervisor role)
- Tenant2-ProjectX: Can see accounts (as Customer role)

If Ramu has tenant_admin role in Tenant1, he can see ALL bank accounts 
across ALL projects in Tenant1.

API Endpoints to Use:
--------------------

1. Assign Role:
   POST /api/role-assignments/assign
   Body: {user_id, tenant_id, project_id, role_id, role_name, context_metadata}

2. Get User's Roles:
   GET /api/role-assignments/user/{user_id}

3. Get All Contexts for User:
   GET /api/role-assignments/my-contexts

4. Create Bank Account (Project-Specific):
   POST /api/bank-accounts
   Body: {tenant_id, project_id, account_name, account_number, ...}

5. View Bank Accounts:
   GET /api/bank-accounts?project_id=projectA
   (Automatically filters based on user's role context)
    """)


async def main():
    """Main seeding function"""
    
    print("Starting Role System Seeding...")
    print("=" * 80)
    
    # Seed roles
    await seed_roles()
    
    # Show example scenario
    await create_example_scenario()
    
    print("\n" + "=" * 80)
    print("✓ Role System Seeding Complete!")
    print("=" * 80)
    
    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
