import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

MONGO_URL = os.getenv('MONGO_URL')

async def seed_master_categories():
    """Seed master property categories and subcategories"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    print("🌱 Seeding Master Property Categories...")
    
    # Master Categories
    categories = [
        {
            "id": str(uuid.uuid4()),
            "name": "Residential",
            "slug": "residential",
            "description": "Residential properties for living purposes",
            "icon": "🏠",
            "sort_order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Commercial",
            "slug": "commercial",
            "description": "Commercial properties for business purposes",
            "icon": "🏢",
            "sort_order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Industrial",
            "slug": "industrial",
            "description": "Industrial properties for manufacturing and warehousing",
            "icon": "🏭",
            "sort_order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Agricultural",
            "slug": "agricultural",
            "description": "Agricultural lands and farm properties",
            "icon": "🌾",
            "sort_order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing
    await db.master_property_categories.delete_many({})
    
    # Insert categories
    result = await db.master_property_categories.insert_many(categories)
    print(f"✅ Inserted {len(result.inserted_ids)} master categories")
    
    # Create category ID map
    cat_map = {cat["slug"]: cat["id"] for cat in categories}
    
    # Master Subcategories
    subcategories = [
        # Residential Subcategories
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Apartments",
            "slug": "apartments",
            "description": "Multi-story residential units (2BHK, 3BHK, 4BHK, Penthouse)",
            "icon": "🏢",
            "additional_fields": ["bhk_type", "floor_number", "facing", "balcony_count", "parking_slots"],
            "sort_order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Independent Houses",
            "slug": "independent_houses",
            "description": "Standalone residential houses",
            "icon": "🏠",
            "additional_fields": ["floors", "bedrooms", "bathrooms", "parking_slots", "garden_area"],
            "sort_order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Villas",
            "slug": "villas",
            "description": "Luxury standalone houses with premium amenities",
            "icon": "🏰",
            "additional_fields": ["floors", "bedrooms", "bathrooms", "pool", "garden_area", "parking_slots"],
            "sort_order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Gated Community Plots",
            "slug": "gated_community_plots",
            "description": "Residential plots within gated communities",
            "icon": "🏘️",
            "additional_fields": ["plot_area", "facing", "corner_plot", "park_facing"],
            "sort_order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Open Plots",
            "slug": "open_plots",
            "description": "Open land plots for residential development",
            "icon": "📐",
            "additional_fields": ["plot_area", "facing", "corner_plot", "road_width"],
            "sort_order": 5,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Row Houses",
            "slug": "row_houses",
            "description": "Connected residential houses in a row",
            "icon": "🏘️",
            "additional_fields": ["floors", "bedrooms", "bathrooms", "parking_slots"],
            "sort_order": 6,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["residential"],
            "name": "Farm Houses",
            "slug": "farm_houses",
            "description": "Residential properties with farm land",
            "icon": "🌳",
            "additional_fields": ["house_area", "land_area", "bedrooms", "bathrooms"],
            "sort_order": 7,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        
        # Commercial Subcategories
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Office Spaces",
            "slug": "office_spaces",
            "description": "Commercial office spaces",
            "icon": "💼",
            "additional_fields": ["carpet_area", "floor_number", "cabins", "workstations", "parking_slots"],
            "sort_order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Retail Shops",
            "slug": "retail_shops",
            "description": "Retail shops and showrooms",
            "icon": "🏪",
            "additional_fields": ["carpet_area", "floor_number", "frontage", "parking_slots"],
            "sort_order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Showrooms",
            "slug": "showrooms",
            "description": "Large retail showrooms",
            "icon": "🏬",
            "additional_fields": ["carpet_area", "floor_number", "frontage", "display_area", "parking_slots"],
            "sort_order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Warehouses",
            "slug": "warehouses",
            "description": "Storage and warehouse spaces",
            "icon": "📦",
            "additional_fields": ["carpet_area", "height", "loading_docks", "parking_area"],
            "sort_order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Co-working Spaces",
            "slug": "coworking_spaces",
            "description": "Shared office spaces",
            "icon": "👥",
            "additional_fields": ["carpet_area", "workstations", "meeting_rooms", "amenities"],
            "sort_order": 5,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Food Courts",
            "slug": "food_courts",
            "description": "Food court spaces",
            "icon": "🍽️",
            "additional_fields": ["carpet_area", "seating_capacity", "kitchen_area"],
            "sort_order": 6,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["commercial"],
            "name": "Malls",
            "slug": "malls",
            "description": "Shopping mall spaces",
            "icon": "🛍️",
            "additional_fields": ["carpet_area", "floor_number", "footfall", "anchor_stores"],
            "sort_order": 7,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        
        # Industrial Subcategories
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["industrial"],
            "name": "Factory Sheds",
            "slug": "factory_sheds",
            "description": "Manufacturing factory sheds",
            "icon": "🏭",
            "additional_fields": ["carpet_area", "height", "power_load", "crane_capacity"],
            "sort_order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["industrial"],
            "name": "Logistics Parks",
            "slug": "logistics_parks",
            "description": "Logistics and distribution parks",
            "icon": "🚚",
            "additional_fields": ["carpet_area", "loading_docks", "parking_area", "office_space"],
            "sort_order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["industrial"],
            "name": "SEZ Units",
            "slug": "sez_units",
            "description": "Special Economic Zone units",
            "icon": "🏢",
            "additional_fields": ["carpet_area", "sez_benefits", "power_load"],
            "sort_order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["industrial"],
            "name": "Industrial Plots",
            "slug": "industrial_plots",
            "description": "Plots for industrial development",
            "icon": "📐",
            "additional_fields": ["plot_area", "power_availability", "road_width"],
            "sort_order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        
        # Agricultural Subcategories
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["agricultural"],
            "name": "Farm Lands",
            "slug": "farm_lands",
            "description": "Agricultural farm lands",
            "icon": "🌾",
            "additional_fields": ["land_area", "soil_type", "water_source", "crops"],
            "sort_order": 1,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["agricultural"],
            "name": "Dairy Farms",
            "slug": "dairy_farms",
            "description": "Dairy farming properties",
            "icon": "🐄",
            "additional_fields": ["land_area", "cattle_capacity", "shed_area", "water_source"],
            "sort_order": 2,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["agricultural"],
            "name": "Poultry Farms",
            "slug": "poultry_farms",
            "description": "Poultry farming properties",
            "icon": "🐔",
            "additional_fields": ["land_area", "bird_capacity", "shed_area", "water_source"],
            "sort_order": 3,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "master_category_id": cat_map["agricultural"],
            "name": "Horticulture Lands",
            "slug": "horticulture_lands",
            "description": "Lands for horticulture and gardening",
            "icon": "🌻",
            "additional_fields": ["land_area", "plantation_type", "water_source", "irrigation"],
            "sort_order": 4,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing subcategories
    await db.master_property_subcategories.delete_many({})
    
    # Insert subcategories
    result = await db.master_property_subcategories.insert_many(subcategories)
    print(f"✅ Inserted {len(result.inserted_ids)} master subcategories")
    
    print("\n📊 Summary:")
    print(f"  - Residential: 7 subcategories (Apartments, Villas, Plots, etc.)")
    print(f"  - Commercial: 7 subcategories (Office, Retail, Warehouse, etc.)")
    print(f"  - Industrial: 4 subcategories (Factory, Logistics, SEZ, etc.)")
    print(f"  - Agricultural: 4 subcategories (Farm Lands, Dairy, Poultry, etc.)")
    print(f"\n✅ Master categories seeded successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_master_categories())
