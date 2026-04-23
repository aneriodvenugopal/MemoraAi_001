"""
Seed predefined packages: Starter, Professional, Enterprise
Run this script to initialize the SaaS packages
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

async def seed_packages():
    """Seed 3 predefined packages"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🎯 Seeding SaaS Packages...")
    print("=" * 60)
    
    # Define packages with international standards
    packages = [
        {
            "id": str(uuid.uuid4()),
            "name": "Starter",
            "description": "Perfect for small real estate businesses getting started",
            "monthly_price": 5000,  # ₹5,000/month ($60/month)
            "yearly_price": 51000,  # ₹51,000/year (15% discount)
            "features": {
                "max_projects": 2,
                "max_users": 5,
                "max_properties": 100,
                "advanced_analytics": False,
                "ai_advisory": True,
                "multi_language": True,
                "custom_branding": False,
                "api_access": False,
                "priority_support": False,
                "payment_gateway": True,
                "referral_system": True,
                "resale_marketplace": False,
                "mobile_app": True,
                "sms_credits": 500,
                "email_credits": 2000,
                "whatsapp_credits": 200
            },
            "is_active": True,
            "display_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Professional",
            "description": "Most Popular - Ideal for growing real estate businesses",
            "monthly_price": 15000,  # ₹15,000/month ($180/month)
            "yearly_price": 153000,  # ₹153,000/year (15% discount)
            "features": {
                "max_projects": 10,
                "max_users": 25,
                "max_properties": 1000,
                "advanced_analytics": True,
                "ai_advisory": True,
                "multi_language": True,
                "custom_branding": False,
                "api_access": False,
                "priority_support": True,
                "payment_gateway": True,
                "referral_system": True,
                "resale_marketplace": True,
                "mobile_app": True,
                "sms_credits": 2000,
                "email_credits": 5000,
                "whatsapp_credits": 1000
            },
            "is_active": True,
            "display_order": 2,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Enterprise",
            "description": "Complete solution for large real estate enterprises",
            "monthly_price": 50000,  # ₹50,000/month ($600/month)
            "yearly_price": 510000,  # ₹510,000/year (15% discount)
            "features": {
                "max_projects": 999999,  # Unlimited
                "max_users": 999999,  # Unlimited
                "max_properties": 999999,  # Unlimited
                "advanced_analytics": True,
                "ai_advisory": True,
                "multi_language": True,
                "custom_branding": True,
                "api_access": True,
                "priority_support": True,
                "payment_gateway": True,
                "referral_system": True,
                "resale_marketplace": True,
                "mobile_app": True,
                "sms_credits": 10000,
                "email_credits": 25000,
                "whatsapp_credits": 5000
            },
            "is_active": True,
            "display_order": 3,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing packages
    deleted_count = await db.packages.delete_many({})
    print(f"🗑️  Cleared {deleted_count.deleted_count} existing packages")
    print()
    
    # Insert packages
    for package in packages:
        await db.packages.insert_one(package)
        
        print(f"✅ {package['name']}")
        print(f"   Monthly: ₹{package['monthly_price']:,} | Yearly: ₹{package['yearly_price']:,}")
        print(f"   Projects: {package['features']['max_projects']}")
        print(f"   Users: {package['features']['max_users']}")
        print(f"   Properties: {package['features']['max_properties']}")
        print(f"   Credits: {package['features']['sms_credits']} SMS, {package['features']['email_credits']} Email, {package['features']['whatsapp_credits']} WhatsApp")
        print()
    
    print("=" * 60)
    print("🎉 Successfully seeded 3 packages!")
    print()
    print("Package Features Comparison:")
    print("━" * 60)
    print("Feature                 | Starter | Professional | Enterprise")
    print("━" * 60)
    print("Advanced Analytics      |    ❌   |      ✅      |     ✅")
    print("Custom Branding         |    ❌   |      ❌      |     ✅")
    print("API Access              |    ❌   |      ❌      |     ✅")
    print("Priority Support        |    ❌   |      ✅      |     ✅")
    print("Resale Marketplace      |    ❌   |      ✅      |     ✅")
    print("━" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_packages())
