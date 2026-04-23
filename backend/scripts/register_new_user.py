"""Register a new user"""
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

async def register_user():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    phone = "9948303060"
    
    # Check if user already exists
    existing = await db.users.find_one({'phone': phone}, {"_id": 0})
    if existing:
        print(f"⚠️  User with phone {phone} already exists!")
        print(f"Name: {existing['name']}")
        print(f"Email: {existing.get('email', 'N/A')}")
        client.close()
        return
    
    # Get tenant admin role
    role = await db.roles.find_one({'slug': 'tenant_admin'}, {"_id": 0})
    if not role:
        print("❌ Tenant Admin role not found!")
        client.close()
        return
    
    # Create new user
    user = User(
        phone=phone,
        name="ExlainERP User",
        email="user@memoraai.in",
        role_id=role['id'],
        tenant_id="test-tenant-1"
    )
    
    user_doc = serialize_doc(user.model_dump())
    await db.users.insert_one(user_doc)
    
    print("✅ User registered successfully!")
    print(f"📱 Phone: {phone}")
    print(f"👤 Name: {user.name}")
    print(f"📧 Email: {user.email}")
    print(f"🎭 Role: Tenant Admin")
    print("\n🔐 To login:")
    print(f"1. Go to your preview URL")
    print(f"2. Enter phone: {phone}")
    print(f"3. Click 'Send OTP'")
    print(f"4. Get OTP from backend logs:")
    print(f"   tail -f /var/log/supervisor/backend.err.log | grep 'Sending OTP'")
    print(f"5. Enter OTP and login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(register_user())
