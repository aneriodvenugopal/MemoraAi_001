"""
Script to make existing layouts public/viewable on homepage
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"

async def make_layouts_public():
    """Make all existing layouts public"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    try:
        # Update all non-deleted layouts to be public
        result = await db.master_layouts.update_many(
            {'deleted_at': None},
            {'$set': {'is_public': True}}
        )
        
        print(f"\n✅ Updated {result.modified_count} layouts to be public")
        
        # Show some examples
        layouts = await db.master_layouts.find(
            {'deleted_at': None, 'is_public': True},
            {'layout_name': 1, 'id': 1, '_id': 0}
        ).limit(10).to_list(length=10)
        
        print(f"\nPublic layouts now available:")
        for layout in layouts:
            print(f"  - {layout.get('layout_name')} (ID: {layout.get('id')[:20]}...)")
        
        print(f"\nTotal public layouts: {len(layouts)}")
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(make_layouts_public())
