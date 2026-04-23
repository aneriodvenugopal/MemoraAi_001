"""
Seed initial content categories
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
from datetime import datetime

load_dotenv()

async def seed_categories():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    categories = [
        {
            "id": str(uuid.uuid4()),
            "name": "Lead Management Solutions",
            "slug": "lead-management-solutions",
            "description": "Stop losing leads with automated follow-ups and smart CRM",
            "icon": "🎯",
            "color": "#FF6B6B",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Payment Automation",
            "slug": "payment-automation",
            "description": "Automate payment reminders and eliminate revenue leakage",
            "icon": "💳",
            "color": "#4ECDC4",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Commission Tracking",
            "slug": "commission-tracking",
            "description": "Never miss a commission with automated tracking",
            "icon": "💰",
            "color": "#95E1D3",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Digital Property Layouts",
            "slug": "digital-property-layouts",
            "description": "Transform property showcasing with interactive layouts",
            "icon": "🏗️",
            "color": "#F38181",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "CRM for Real Estate",
            "slug": "crm-for-real-estate",
            "description": "Manage customer relationships and boost sales",
            "icon": "📊",
            "color": "#AA96DA",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Analytics & Insights",
            "slug": "analytics-insights",
            "description": "Make data-driven decisions with powerful analytics",
            "icon": "📈",
            "color": "#FCBAD3",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Customer Retention",
            "slug": "customer-retention",
            "description": "Build long-term relationships and repeat business",
            "icon": "❤️",
            "color": "#FFFFD2",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Referral Growth",
            "slug": "referral-growth",
            "description": "Turn customers into brand ambassadors",
            "icon": "🔗",
            "color": "#A8E6CF",
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    
    # Clear existing categories
    await db.content_categories.delete_many({})
    
    # Insert new categories
    await db.content_categories.insert_many(categories)
    
    print(f"✅ Successfully seeded {len(categories)} content categories")
    
    # Print categories for reference
    for cat in categories:
        print(f"  {cat['icon']} {cat['name']} ({cat['id']})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_categories())
