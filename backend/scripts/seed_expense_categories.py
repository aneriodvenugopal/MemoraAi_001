"""
Seed Default Expense Categories for Financial System
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
DB_NAME = os.getenv('DB_NAME', 'test_database')


async def seed_expense_categories():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("💰 Seeding Default Expense Categories...")
    print(f"📁 Database: {DB_NAME}")
    print("=" * 60)
    
    # Get all tenants
    tenants = await db.tenants.find({}, {"_id": 0, "id": 1, "company_name": 1}).to_list(100)
    
    if not tenants:
        print("⚠️  No tenants found. Skipping category seeding.")
        client.close()
        return
    
    # Default expense categories for real estate
    default_categories = [
        {
            "name": "Construction",
            "slug": "construction",
            "description": "Construction and development costs",
            "color": "#FF6B6B"
        },
        {
            "name": "Marketing",
            "slug": "marketing",
            "description": "Advertising and marketing expenses",
            "color": "#4ECDC4"
        },
        {
            "name": "Legal",
            "slug": "legal",
            "description": "Legal and documentation fees",
            "color": "#45B7D1"
        },
        {
            "name": "Administration",
            "slug": "administration",
            "description": "Office and admin expenses",
            "color": "#FFA07A"
        },
        {
            "name": "Utilities",
            "slug": "utilities",
            "description": "Electricity, water, maintenance",
            "color": "#98D8C8"
        },
        {
            "name": "Salaries",
            "slug": "salaries",
            "description": "Staff salaries and wages",
            "color": "#F7B731"
        },
        {
            "name": "Commissions",
            "slug": "commissions",
            "description": "Sales commissions",
            "color": "#5F27CD"
        },
        {
            "name": "Vendor Payments",
            "slug": "vendor_payments",
            "description": "Payments to vendors and contractors",
            "color": "#00D2D3"
        },
        {
            "name": "Other",
            "slug": "other",
            "description": "Miscellaneous expenses",
            "color": "#95A5A6"
        }
    ]
    
    total_created = 0
    
    for tenant in tenants:
        tenant_id = tenant.get("id")
        tenant_name = tenant.get("company_name", "Unknown")
        
        print(f"\n📊 Processing tenant: {tenant_name}")
        
        # Check existing categories
        existing = await db.expense_categories.count_documents({"tenant_id": tenant_id})
        
        if existing > 0:
            print(f"  ⚠️  Already has {existing} categories, skipping")
            continue
        
        # Insert categories for this tenant
        for cat in default_categories:
            category = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "name": cat["name"],
                "slug": cat["slug"],
                "description": cat["description"],
                "color": cat["color"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.expense_categories.insert_one(category)
            total_created += 1
        
        print(f"  ✅ Created {len(default_categories)} expense categories")
    
    print("\n" + "=" * 60)
    print(f"✅ Expense Categories Seeded Successfully!")
    print(f"\n📊 Summary:")
    print(f"   • Tenants Processed: {len(tenants)}")
    print(f"   • Total Categories Created: {total_created}")
    print(f"\n💡 Categories:")
    for cat in default_categories:
        print(f"   • {cat['name']} ({cat['slug']})")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_expense_categories())
