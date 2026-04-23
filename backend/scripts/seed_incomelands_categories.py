"""
Seed script to add IncomeLands as a lead source category
"""
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

async def seed_incomelands_category():
    """Add IncomeLands as a lead source category"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not found in environment")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client.retoerp
    
    try:
        # Check if IncomeLands source already exists
        existing = await db.master_categories.find_one({
            "slug": "incomelands",
            "type": "lead_source"
        })
        
        if existing:
            print("✅ IncomeLands lead source already exists")
            return
        
        # Create IncomeLands lead source category
        incomelands_source = {
            "id": str(uuid.uuid4()),
            "name": "IncomeLands",
            "slug": "incomelands",
            "type": "lead_source",
            "description": "Leads from IncomeLands mobile app marketplace",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.master_categories.insert_one(incomelands_source)
        print("✅ Successfully added IncomeLands as lead source")
        
        # Also add marketplace-related categories if they don't exist
        categories_to_add = [
            {
                "name": "Marketplace Agent",
                "slug": "marketplace_agent",
                "type": "lead_source",
                "description": "Leads from marketplace agents"
            },
            {
                "name": "Direct Buyer",
                "slug": "direct_buyer",
                "type": "lead_source",
                "description": "Direct buyers from IncomeLands"
            }
        ]
        
        for cat_data in categories_to_add:
            existing_cat = await db.master_categories.find_one({
                "slug": cat_data["slug"],
                "type": cat_data["type"]
            })
            
            if not existing_cat:
                category = {
                    "id": str(uuid.uuid4()),
                    **cat_data,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_at": None
                }
                await db.master_categories.insert_one(category)
                print(f"✅ Added {cat_data['name']} category")
            else:
                print(f"✅ {cat_data['name']} category already exists")
        
        print("\n✅ IncomeLands marketplace categories setup complete!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_incomelands_category())
