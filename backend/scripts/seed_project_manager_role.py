import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import sys
sys.path.append('/app/backend')
from models.role import Role
import uuid
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')

async def seed_project_manager_role():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = 'retoerp'
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if project_manager role already exists
    existing = await db.roles.find_one({'slug': 'project_manager'}, {"_id": 0})
    
    if existing:
        print("✅ Project Manager role already exists")
        return
    
    # Create Project Manager role
    role = {
        'id': str(uuid.uuid4()),
        'name': "Project Manager",
        'slug': "project_manager",
        'description': "Project Manager with access to assigned project(s) only",
        'is_system': True,
        'permissions': [
            "view_dashboard",
            "view_assigned_projects",
            "manage_leads",
            "view_properties",
            "view_bookings",
            "view_payments",
            "manage_project_staff",
            "view_project_reports",
            "view_resale_requests"
        ],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.roles.insert_one(role)
    print(f"✅ Created Project Manager role: {role['id']}")
    print(f"   Permissions: {', '.join(role['permissions'])}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_project_manager_role())
    print("\n🎉 Project Manager role seeded successfully!")
