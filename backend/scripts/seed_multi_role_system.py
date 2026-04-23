"""
Seed script for Multi-Role Access Control System
Creates 7 system roles with proper permissions
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'retoerp')

async def seed_multi_role_system():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🎭 Seeding Multi-Role Access Control System...")
    print(f"📁 Database: {DB_NAME}")
    print(f"🔗 Connection: {MONGO_URL}")
    print("=" * 60)
    
    # Define 7 system roles with permissions
    system_roles = [
        {
            "id": "role_tenant_admin",
            "name": "Tenant Admin",
            "slug": "tenant_admin",
            "level": 1,  # Highest power
            "description": "Full control over entire tenant. Can manage all projects, users, and settings.",
            "is_system": True,
            "permissions": [
                "manage_all_projects",
                "manage_users",
                "manage_roles",
                "view_all_data",
                "manage_billing",
                "manage_settings",
                "create_projects",
                "delete_projects",
                "assign_roles",
                "view_all_leads",
                "view_all_bookings",
                "view_all_payments",
                "manage_bank_accounts",
                "view_reports",
                "manage_commissions"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_project_admin",
            "name": "Project Admin",
            "slug": "project_admin",
            "level": 2,
            "description": "Full control over assigned project(s). Can manage project users, properties, and view all project data.",
            "is_system": True,
            "permissions": [
                "manage_project",
                "manage_project_users",
                "view_all_project_data",
                "manage_properties",
                "assign_project_roles",
                "view_project_leads",
                "view_project_bookings",
                "view_project_payments",
                "view_project_reports",
                "manage_project_settings"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_sales_manager",
            "name": "Sales Manager",
            "slug": "sales_manager",
            "level": 3,
            "description": "Manages sales team in specific project. Views team performance and can reassign leads.",
            "is_system": True,
            "permissions": [
                "view_team_data",
                "manage_team_leads",
                "view_reports",
                "reassign_leads",
                "view_team_bookings",
                "view_team_performance",
                "manage_own_leads",
                "create_bookings",
                "view_own_commissions"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_agent",
            "name": "Agent",
            "slug": "agent",
            "level": 4,
            "description": "Sales agent who sells properties. Manages own leads and customers.",
            "is_system": True,
            "permissions": [
                "manage_own_leads",
                "create_bookings",
                "view_own_data",
                "view_properties",
                "view_own_commissions",
                "create_followups",
                "view_own_bookings"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_supervisor",
            "name": "Supervisor",
            "slug": "supervisor",
            "level": 5,
            "description": "Oversees operations in specific project. Views reports and monitors progress.",
            "is_system": True,
            "permissions": [
                "view_project_reports",
                "view_project_data",
                "view_properties",
                "view_project_bookings",
                "monitor_progress"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_customer",
            "name": "Customer",
            "slug": "customer",
            "level": 6,
            "description": "Property buyer/booker. Views only own bookings and payments.",
            "is_system": True,
            "permissions": [
                "view_own_bookings",
                "make_payments",
                "view_own_properties",
                "view_own_payments",
                "view_construction_updates",
                "download_receipts"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "role_vendor",
            "name": "Vendor",
            "slug": "vendor",
            "level": 7,  # Lowest power
            "description": "Service provider to project. Submits bills and receives payments.",
            "is_system": True,
            "permissions": [
                "submit_bills",
                "view_own_payments",
                "view_own_transactions",
                "upload_documents"
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing system roles with level field (new system)
    print("\n📋 Creating system roles...")
    delete_result = await db.roles.delete_many({"is_system": True, "level": {"$exists": True}})
    print(f"  Deleted {delete_result.deleted_count} old system roles")
    
    # Insert new roles
    inserted_count = 0
    for role in system_roles:
        try:
            await db.roles.insert_one(role)
            print(f"  ✅ {role['name']} (Level {role['level']}) - {len(role['permissions'])} permissions")
            inserted_count += 1
        except Exception as e:
            print(f"  ❌ Failed to insert {role['name']}: {e}")
    
    print(f"\n✅ Inserted {inserted_count}/{len(system_roles)} system roles")
    
    # Create indexes for role_assignments collection
    print("\n🔍 Creating indexes for role_assignments...")
    await db.role_assignments.create_index([("user_id", 1), ("tenant_id", 1), ("is_active", 1)])
    await db.role_assignments.create_index([("user_id", 1), ("project_id", 1), ("is_active", 1)])
    await db.role_assignments.create_index([("project_id", 1), ("role_id", 1), ("is_active", 1)])
    await db.role_assignments.create_index([("tenant_id", 1), ("role_id", 1), ("is_active", 1)])
    print("  ✅ Created 4 indexes for role_assignments")
    
    # Create indexes for user_sessions collection
    print("\n🔍 Creating indexes for user_sessions...")
    await db.user_sessions.create_index([("token", 1)], unique=True)
    await db.user_sessions.create_index([("user_id", 1)])
    await db.user_sessions.create_index([("expires_at", 1)])
    print("  ✅ Created 3 indexes for user_sessions")
    
    # Create index for roles
    print("\n🔍 Creating indexes for roles...")
    try:
        await db.roles.create_index([("slug", 1)], unique=True)
        print("  ✅ Created 1 index for roles")
    except Exception as e:
        if "duplicate key" in str(e).lower() or "already exists" in str(e).lower():
            print("  ⚠️  Index already exists (skipping)")
        else:
            print(f"  ⚠️  Index creation warning: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Multi-Role System Seeded Successfully!")
    print("\n📊 Summary:")
    print(f"   • System Roles: {len(system_roles)}")
    print(f"   • Total Permissions: {sum(len(r['permissions']) for r in system_roles)}")
    print("\n🎯 Role Hierarchy (by power level):")
    for role in sorted(system_roles, key=lambda x: x['level']):
        print(f"   {role['level']}. {role['name']} ({role['slug']})")
    
    print("\n💡 Next Steps:")
    print("   1. Migrate existing users to role_assignments")
    print("   2. Update authentication to support context selection")
    print("   3. Update APIs with multi-role access control")
    print("   4. Build frontend context selector UI")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_multi_role_system())
