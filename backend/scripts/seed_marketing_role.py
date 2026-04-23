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

async def seed_marketing_role():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = 'retoerp'
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if marketing_agent role already exists
    existing = await db.roles.find_one({'slug': 'marketing_agent'}, {"_id": 0})
    
    if existing:
        print("✅ Marketing Agent role already exists")
        return
    
    # Create Marketing Agent role
    role = {
        'id': str(uuid.uuid4()),
        'name': "Marketing Agent",
        'slug': "marketing_agent",
        'description': "Marketing/Sales agent with project-level access for leads and commissions",
        'is_system': True,
        'permissions': [
            "view_dashboard",
            "view_assigned_projects",
            "manage_assigned_leads",
            "view_properties",
            "view_assigned_bookings",
            "view_payments",
            "view_own_commissions",
            "followup_leads",
            "followup_payments",
            "view_notifications",
            "view_project_reports"
        ],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.roles.insert_one(role)
    print(f"✅ Created Marketing Agent role: {role['id']}")
    print(f"   Permissions: {', '.join(role['permissions'])}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_marketing_role())
    print("\n🎉 Marketing Agent role seeded successfully!")
