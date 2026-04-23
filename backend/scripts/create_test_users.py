"""Create a test user for development"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from models.user import User
from utils.helpers import serialize_doc

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_test_users():
    """Create test users for each role"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get role IDs
    super_admin_role = await db.roles.find_one({'slug': 'super_admin'}, {"_id": 0})
    tenant_admin_role = await db.roles.find_one({'slug': 'tenant_admin'}, {"_id": 0})
    staff_role = await db.roles.find_one({'slug': 'staff'}, {"_id": 0})
    customer_role = await db.roles.find_one({'slug': 'customer'}, {"_id": 0})
    
    test_users = [
        {
            'phone': '9999999999',
            'email': 'superadmin@memoraai.in',
            'name': 'Super Admin',
            'role_id': super_admin_role['id'],
            'tenant_id': None
        },
        {
            'phone': '8888888888',
            'email': 'admin@memoraai.in',
            'name': 'Tenant Admin',
            'role_id': tenant_admin_role['id'],
            'tenant_id': 'test-tenant-1'  # We'll create this tenant too
        },
        {
            'phone': '7777777777',
            'email': 'staff@memoraai.in',
            'name': 'Staff Member',
            'role_id': staff_role['id'],
            'tenant_id': 'test-tenant-1'
        },
        {
            'phone': '6666666666',
            'email': 'customer@memoraai.in',
            'name': 'Customer User',
            'role_id': customer_role['id'],
            'tenant_id': 'test-tenant-1'
        }
    ]
    
    for user_data in test_users:
        existing = await db.users.find_one({'phone': user_data['phone']}, {"_id": 0})
        if not existing:
            user = User(**user_data)
            user_doc = serialize_doc(user.model_dump())
            await db.users.insert_one(user_doc)
            print(f"✅ Created test user: {user_data['name']} (Phone: {user_data['phone']})")
        else:
            print(f"⏭️  User already exists: {user_data['name']} (Phone: {user_data['phone']})")
    
    client.close()

if __name__ == "__main__":
    print("🌱 Creating test users...")
    asyncio.run(create_test_users())
    print("\n✨ Test users created!")
    print("\nTest Login Credentials:")
    print("Super Admin: 9999999999 (OTP will be sent)")
    print("Tenant Admin: 8888888888")
    print("Staff: 7777777777")
    print("Customer: 6666666666")
