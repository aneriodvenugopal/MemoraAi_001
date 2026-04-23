"""
Seed script for Master Property Categories and Subcategories
Run with: python backend/scripts/seed_property_categories.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/retoerp')

# Master Categories for Real Estate
MASTER_CATEGORIES = [
    {
        "name": "Residential Plots",
        "slug": "residential-plots",
        "description": "Individual plots for residential construction",
        "icon": "Home",
        "subcategories": [
            {"name": "Villa Plots", "slug": "villa-plots", "description": "Large plots for villa construction", "icon": "Castle"},
            {"name": "Independent House Plots", "slug": "independent-house-plots", "description": "Plots for independent houses", "icon": "Home"},
            {"name": "Gated Community Plots", "slug": "gated-community-plots", "description": "Plots within gated communities", "icon": "Shield"},
            {"name": "Farm House Plots", "slug": "farm-house-plots", "description": "Large plots for farm houses", "icon": "Trees"},
        ]
    },
    {
        "name": "Commercial Plots",
        "slug": "commercial-plots",
        "description": "Plots for commercial development",
        "icon": "Building2",
        "subcategories": [
            {"name": "Shop Plots", "slug": "shop-plots", "description": "Plots for retail shops", "icon": "Store"},
            {"name": "Office Space Plots", "slug": "office-space-plots", "description": "Plots for office buildings", "icon": "Building"},
            {"name": "Warehouse Plots", "slug": "warehouse-plots", "description": "Plots for warehouses", "icon": "Warehouse"},
            {"name": "Industrial Plots", "slug": "industrial-plots", "description": "Plots for industrial use", "icon": "Factory"},
        ]
    },
    {
        "name": "Agricultural Land",
        "slug": "agricultural-land",
        "description": "Land for agricultural purposes",
        "icon": "Wheat",
        "subcategories": [
            {"name": "Farm Land", "slug": "farm-land", "description": "Land for farming", "icon": "Tractor"},
            {"name": "Orchard Land", "slug": "orchard-land", "description": "Land for orchards", "icon": "Apple"},
            {"name": "Plantation Land", "slug": "plantation-land", "description": "Land for plantations", "icon": "Trees"},
        ]
    },
    {
        "name": "Mixed Use",
        "slug": "mixed-use",
        "description": "Plots suitable for multiple purposes",
        "icon": "Grid",
        "subcategories": [
            {"name": "Residential + Commercial", "slug": "residential-commercial", "description": "Combined use plots", "icon": "Building2"},
            {"name": "Live-Work Spaces", "slug": "live-work-spaces", "description": "Plots for live-work arrangements", "icon": "Briefcase"},
        ]
    },
    {
        "name": "Premium/Luxury",
        "slug": "premium-luxury",
        "description": "High-end premium plots",
        "icon": "Crown",
        "subcategories": [
            {"name": "Lake View Plots", "slug": "lake-view-plots", "description": "Plots with lake views", "icon": "Waves"},
            {"name": "Hill View Plots", "slug": "hill-view-plots", "description": "Plots with hill views", "icon": "Mountain"},
            {"name": "Highway Facing", "slug": "highway-facing", "description": "Plots facing highways", "icon": "Route"},
            {"name": "Corner Plots", "slug": "corner-plots", "description": "Premium corner plots", "icon": "CornerUpRight"},
        ]
    },
    {
        "name": "Layout Types",
        "slug": "layout-types",
        "description": "Different layout configurations",
        "icon": "LayoutGrid",
        "subcategories": [
            {"name": "DTCP Approved", "slug": "dtcp-approved", "description": "DTCP approved layouts", "icon": "BadgeCheck"},
            {"name": "HMDA Approved", "slug": "hmda-approved", "description": "HMDA approved layouts", "icon": "BadgeCheck"},
            {"name": "LP Approved", "slug": "lp-approved", "description": "Layout Permission approved", "icon": "FileCheck"},
            {"name": "RERA Registered", "slug": "rera-registered", "description": "RERA registered projects", "icon": "Shield"},
            {"name": "Panchayat Approved", "slug": "panchayat-approved", "description": "Panchayat approved layouts", "icon": "Landmark"},
        ]
    },
    {
        "name": "By Facing",
        "slug": "by-facing",
        "description": "Plots categorized by facing direction",
        "icon": "Compass",
        "subcategories": [
            {"name": "East Facing", "slug": "east-facing", "description": "East facing plots", "icon": "Sun"},
            {"name": "North Facing", "slug": "north-facing", "description": "North facing plots", "icon": "ArrowUp"},
            {"name": "West Facing", "slug": "west-facing", "description": "West facing plots", "icon": "Sunset"},
            {"name": "South Facing", "slug": "south-facing", "description": "South facing plots", "icon": "ArrowDown"},
        ]
    },
    {
        "name": "By Size",
        "slug": "by-size",
        "description": "Plots categorized by size",
        "icon": "Ruler",
        "subcategories": [
            {"name": "Small (< 150 sq.yard)", "slug": "small-plots", "description": "Plots under 150 sq.yard", "icon": "Square"},
            {"name": "Medium (150-300 sq.yard)", "slug": "medium-plots", "description": "Plots 150-300 sq.yard", "icon": "SquareStack"},
            {"name": "Large (300-500 sq.yard)", "slug": "large-plots", "description": "Plots 300-500 sq.yard", "icon": "Maximize"},
            {"name": "Extra Large (> 500 sq.yard)", "slug": "extra-large-plots", "description": "Plots over 500 sq.yard", "icon": "Expand"},
        ]
    }
]

async def seed_master_categories():
    """Seed master property categories and subcategories"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    # Clear existing data (optional - comment out if you want to preserve existing)
    await db.master_property_categories.delete_many({})
    await db.master_property_subcategories.delete_many({})
    
    print("Seeding Master Property Categories...")
    
    sort_order = 1
    for cat_data in MASTER_CATEGORIES:
        category_id = str(uuid.uuid4())
        
        # Create category
        category = {
            "id": category_id,
            "name": cat_data["name"],
            "slug": cat_data["slug"],
            "description": cat_data["description"],
            "icon": cat_data["icon"],
            "sort_order": sort_order,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.master_property_categories.insert_one(category)
        print(f"  ✓ Created category: {cat_data['name']}")
        
        # Create subcategories
        sub_sort = 1
        for sub_data in cat_data.get("subcategories", []):
            subcategory = {
                "id": str(uuid.uuid4()),
                "master_category_id": category_id,
                "name": sub_data["name"],
                "slug": sub_data["slug"],
                "description": sub_data["description"],
                "icon": sub_data["icon"],
                "sort_order": sub_sort,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.master_property_subcategories.insert_one(subcategory)
            print(f"    - {sub_data['name']}")
            sub_sort += 1
        
        sort_order += 1
    
    print("\n✅ Master categories seeded successfully!")
    
    # Count results
    cat_count = await db.master_property_categories.count_documents({})
    sub_count = await db.master_property_subcategories.count_documents({})
    print(f"Total: {cat_count} categories, {sub_count} subcategories")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_master_categories())
