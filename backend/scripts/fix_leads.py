"""Fix categories and leads"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def fix_categories_and_leads():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔧 Fixing Categories and Leads...")
    print()
    
    # Delete old broken categories
    await db.categories.delete_many({'type': {'$in': ['lead_status', 'lead_source']}})
    
    # Create lead statuses
    lead_statuses = ['New', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Negotiation', 'Converted', 'Lost']
    
    print("Creating Lead Statuses:")
    for status in lead_statuses:
        cat = {
            'id': str(uuid.uuid4()),
            'type': 'lead_status',
            'name': status,
            'slug': status.lower().replace(' ', '_'),
            'description': f'{status} lead status',
            'parent_id': None,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        await db.categories.insert_one(cat)
        print(f'  ✅ {status}')
    
    # Create lead sources
    lead_sources = ['Website', 'IncomeLands App', 'Walk-in', 'Referral', 'Facebook', 'Google Ads', 'Phone Call', 'Email', 'Agent']
    
    print("\nCreating Lead Sources:")
    for source in lead_sources:
        cat = {
            'id': str(uuid.uuid4()),
            'type': 'lead_source',
            'name': source,
            'slug': source.lower().replace(' ', '_').replace('-', '_'),
            'description': f'{source} lead source',
            'parent_id': None,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        await db.categories.insert_one(cat)
        print(f'  ✅ {source}')
    
    print()
    
    # Now fix leads
    new_status = await db.categories.find_one({'type': 'lead_status', 'slug': 'new'}, {'_id': 0})
    website_source = await db.categories.find_one({'type': 'lead_source', 'slug': 'website'}, {'_id': 0})
    
    if new_status and website_source:
        # Update all leads
        result_status = await db.leads.update_many(
            {},
            {'$set': {'status_id': new_status['id'], 'source_id': website_source['id']}}
        )
        print(f"✅ Updated {result_status.modified_count} leads")
    
    # Verify
    bad_leads = await db.leads.count_documents({'$or': [{'status_id': None}, {'source_id': None}]})
    print(f"Leads with None fields: {bad_leads}")
    
    print()
    print("✅ Fix complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_categories_and_leads())
