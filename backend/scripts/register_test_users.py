"""Register test users for all roles with Indian names and numbers"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.user import User
from utils.helpers import serialize_doc
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Test users data with Indian names and memorable phone numbers
TEST_USERS = [
    {
        "phone": "9999999999",
        "name": "Rajesh Kumar",
        "email": "rajesh.kumar@memoraai.in",
        "role_slug": "super_admin",
        "description": "Super Admin - All 9s"
    },
    {
        "phone": "8888888888",
        "name": "Priya Sharma",
        "email": "priya.sharma@memoraai.in",
        "role_slug": "tenant_admin",
        "description": "Tenant Admin - All 8s"
    },
    {
        "phone": "7777777777",
        "name": "Amit Patel",
        "email": "amit.patel@memoraai.in",
        "role_slug": "staff",
        "description": "Staff Member - All 7s"
    },
    {
        "phone": "6666666666",
        "name": "Sneha Reddy",
        "email": "sneha.reddy@memoraai.in",
        "role_slug": "customer",
        "description": "Customer - All 6s"
    },
    {
        "phone": "5555555555",
        "name": "Vikram Singh",
        "email": "vikram.singh@memoraai.in",
        "role_slug": "staff",
        "description": "Staff Member 2 - All 5s"
    },
    {
        "phone": "4444444444",
        "name": "Ananya Iyer",
        "email": "ananya.iyer@memoraai.in",
        "role_slug": "customer",
        "description": "Customer 2 - All 4s"
    },
]

async def register_test_users():
    """Register all test users"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 70)
    print("REGISTERING TEST USERS FOR ExlainERP")
    print("=" * 70)
    print()
    
    # Get default tenant for non-super admin users
    default_tenant = await db.tenants.find_one({}, {"_id": 0})
    if not default_tenant:
        print("❌ ERROR: No tenant found. Please run create_first_tenant.py first.")
        client.close()
        return
    
    tenant_id = default_tenant['id']
    print(f"📋 Using Tenant: {default_tenant['name']} (ID: {tenant_id})")
    print()
    
    registered_count = 0
    skipped_count = 0
    
    for user_data in TEST_USERS:
        # Check if user already exists
        existing = await db.users.find_one({'phone': user_data['phone']}, {"_id": 0})
        if existing:
            print(f"⏭️  {user_data['description']}")
            print(f"   Phone: {user_data['phone']} - Already registered")
            print(f"   Name: {existing['name']}")
            skipped_count += 1
            print()
            continue
        
        # Get role ID
        role = await db.roles.find_one({'slug': user_data['role_slug']}, {"_id": 0})
        if not role:
            print(f"❌ Role not found: {user_data['role_slug']}")
            continue
        
        # Create user
        user = User(
            phone=user_data['phone'],
            name=user_data['name'],
            email=user_data['email'],
            role_id=role['id'],
            tenant_id=None if user_data['role_slug'] == 'super_admin' else tenant_id,
            is_active=True
        )
        
        user_doc = serialize_doc(user.model_dump())
        await db.users.insert_one(user_doc)
        
        print(f"✅ {user_data['description']}")
        print(f"   Phone: {user_data['phone']}")
        print(f"   Name: {user_data['name']}")
        print(f"   Email: {user_data['email']}")
        print(f"   Role: {role['name']}")
        registered_count += 1
        print()
    
    print("=" * 70)
    print(f"REGISTRATION COMPLETE: {registered_count} new users, {skipped_count} skipped")
    print("=" * 70)
    print()
    
    # Print all users summary
    print("📋 ALL REGISTERED USERS:")
    print("=" * 70)
    
    all_users = await db.users.find({"deleted_at": None}, {"_id": 0}).to_list(length=None)
    
    # Group by role
    roles_data = {}
    for user in all_users:
        role = await db.roles.find_one({'id': user['role_id']}, {"_id": 0})
        role_name = role['name'] if role else 'Unknown'
        
        if role_name not in roles_data:
            roles_data[role_name] = []
        
        roles_data[role_name].append({
            'name': user['name'],
            'phone': user['phone'],
            'email': user.get('email', 'N/A')
        })
    
    for role_name, users in roles_data.items():
        print(f"\n{role_name}:")
        print("-" * 70)
        for user in users:
            print(f"  📱 {user['phone']} - {user['name']} ({user['email']})")
    
    print()
    print("=" * 70)
    print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(register_test_users())
