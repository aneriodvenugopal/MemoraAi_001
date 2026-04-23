"""
Set default passwords for existing users
Password = Mobile Number (for easy migration)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def set_default_passwords():
    """Set default passwords for all existing users without passwords"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🔐 Setting default passwords for existing users...")
    print("Default password = Mobile number\n")
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(length=1000)
    
    updated_count = 0
    already_has_password = 0
    no_phone = 0
    
    for user in users:
        user_id = user.get('id')
        phone = user.get('phone')
        name = user.get('name', 'Unknown')
        existing_password = user.get('password')
        
        # Skip if already has password
        if existing_password:
            already_has_password += 1
            print(f"⏭️  {name} ({phone}) - Already has password, skipping")
            continue
        
        # Skip if no phone number
        if not phone:
            no_phone += 1
            print(f"⚠️  {name} - No phone number, skipping")
            continue
        
        # Set password as phone number (hashed)
        hashed_password = pwd_context.hash(phone)
        
        # Update user
        await db.users.update_one(
            {'id': user_id},
            {'$set': {'password': hashed_password}}
        )
        
        updated_count += 1
        print(f"✅ {name} ({phone}) - Password set to: {phone}")
    
    print("\n" + "="*60)
    print(f"📊 Summary:")
    print(f"   Total users: {len(users)}")
    print(f"   ✅ Updated: {updated_count}")
    print(f"   ⏭️  Already had password: {already_has_password}")
    print(f"   ⚠️  No phone number: {no_phone}")
    print("="*60)
    
    if updated_count > 0:
        print(f"\n🎉 Success! {updated_count} users can now login with:")
        print(f"   Username: Their phone number")
        print(f"   Password: Their phone number")
        print(f"\n💡 Tip: Encourage users to change their password after first login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(set_default_passwords())
