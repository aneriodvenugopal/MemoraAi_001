"""Create first tenant for ExlainERP"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys
import uuid

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.tenant import Tenant
from utils.helpers import serialize_doc
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_tenant():
    """Create a default tenant organization"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if tenant already exists
    existing = await db.tenants.find_one({}, {"_id": 0})
    if existing:
        print(f"⏭️  Tenant already exists: {existing['name']}")
        print(f"   Tenant ID: {existing['id']}")
        client.close()
        return existing['id']
    
    # Get INR currency ID
    inr_currency = await db.currencies.find_one({'code': 'INR'}, {"_id": 0})
    if not inr_currency:
        print("❌ INR currency not found. Please run seed.py first.")
        client.close()
        return None
    
    # Create default tenant
    tenant = Tenant(
        name="Default Organization",
        company_name="Default Real Estate Company",
        phone="9999999999",
        email="admin@memoraai.in",
        address="Default Address",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        base_currency_id=inr_currency['id'],
        primary_language="en",
        timezone="Asia/Kolkata",
        is_active=True,
        subscription_start=datetime.now(timezone.utc)
    )
    
    tenant_doc = serialize_doc(tenant.model_dump())
    await db.tenants.insert_one(tenant_doc)
    print(f"✅ Created tenant: {tenant.name}")
    print(f"   Tenant ID: {tenant.id}")
    
    client.close()
    return tenant.id

if __name__ == "__main__":
    asyncio.run(create_tenant())
