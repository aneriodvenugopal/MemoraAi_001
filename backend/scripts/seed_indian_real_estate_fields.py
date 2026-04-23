"""
Seed default fields for Indian Real Estate Project Types
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')

# Indian Real Estate Default Fields
INDIAN_REAL_ESTATE_FIELDS = {
    # OPEN PLOTS / VENTURE
    "plots": [
        {
            "field_key": "plot_number",
            "field_label": "Plot Number",
            "field_type": "string",
            "category": "basic",
            "config": {
                "validation_rules": {"required": True, "searchable": True, "show_in_list": True}
            },
            "display_order": 1,
            "is_system_field": True
        },
        {
            "field_key": "plot_size",
            "field_label": "Plot Size",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.yards",
                "min": 50,
                "step": 10,
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 2,
            "is_system_field": True
        },
        {
            "field_key": "plot_size_sqft",
            "field_label": "Plot Size (Sq.Ft)",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.ft",
                "min": 450,
                "step": 90,
                "validation_rules": {"required": False, "searchable": True, "filterable": True}
            },
            "display_order": 3
        },
        {
            "field_key": "facing",
            "field_label": "Facing",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"],
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 4,
            "is_system_field": True
        },
        {
            "field_key": "plot_dimensions",
            "field_label": "Plot Dimensions (Length x Width)",
            "field_type": "string",
            "category": "dimensions",
            "config": {
                "placeholder": "e.g., 30 x 40 ft",
                "validation_rules": {"required": False, "searchable": False}
            },
            "display_order": 5
        },
        {
            "field_key": "corner_plot",
            "field_label": "Corner Plot",
            "field_type": "boolean",
            "category": "features",
            "config": {
                "validation_rules": {"required": False, "filterable": True, "show_in_list": True}
            },
            "display_order": 6
        },
        {
            "field_key": "plot_type",
            "field_label": "Plot Type",
            "field_type": "select",
            "category": "basic",
            "config": {
                "options": ["Residential", "Commercial", "Agricultural", "Industrial"],
                "validation_rules": {"required": True, "filterable": True}
            },
            "display_order": 7
        },
        {
            "field_key": "dtcp_approved",
            "field_label": "DTCP Approved",
            "field_type": "boolean",
            "category": "legal",
            "config": {
                "validation_rules": {"required": False, "filterable": True, "show_in_list": True}
            },
            "display_order": 8
        },
        {
            "field_key": "rera_approved",
            "field_label": "RERA Approved",
            "field_type": "boolean",
            "category": "legal",
            "config": {
                "validation_rules": {"required": False, "filterable": True, "show_in_list": True}
            },
            "display_order": 9
        },
        {
            "field_key": "loan_available",
            "field_label": "Bank Loan Available",
            "field_type": "boolean",
            "category": "pricing",
            "config": {
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 10
        }
    ],
    
    # VILLA / INDEPENDENT HOUSE
    "villa": [
        {
            "field_key": "villa_number",
            "field_label": "Villa Number",
            "field_type": "string",
            "category": "basic",
            "config": {"validation_rules": {"required": True, "searchable": True}},
            "display_order": 1,
            "is_system_field": True
        },
        {
            "field_key": "bhk_type",
            "field_label": "BHK Type",
            "field_type": "select",
            "category": "basic",
            "config": {
                "options": ["2 BHK", "3 BHK", "4 BHK", "5 BHK", "6+ BHK"],
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 2,
            "is_system_field": True
        },
        {
            "field_key": "plot_area",
            "field_label": "Plot Area",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.yards",
                "min": 100,
                "validation_rules": {"required": True, "searchable": True, "filterable": True}
            },
            "display_order": 3
        },
        {
            "field_key": "built_up_area",
            "field_label": "Built-up Area",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.ft",
                "min": 800,
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 4
        },
        {
            "field_key": "facing",
            "field_label": "Facing",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"],
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 5
        },
        {
            "field_key": "floors",
            "field_label": "Number of Floors",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["Ground", "Ground + 1", "Ground + 2", "Ground + 3"],
                "validation_rules": {"required": True}
            },
            "display_order": 6
        },
        {
            "field_key": "bathrooms",
            "field_label": "Bathrooms",
            "field_type": "number",
            "category": "features",
            "config": {
                "min": 1,
                "max": 10,
                "validation_rules": {"required": True, "show_in_list": True}
            },
            "display_order": 7
        },
        {
            "field_key": "car_parking",
            "field_label": "Car Parking",
            "field_type": "number",
            "category": "features",
            "config": {
                "min": 0,
                "max": 5,
                "validation_rules": {"required": False, "show_in_list": True}
            },
            "display_order": 8
        },
        {
            "field_key": "amenities",
            "field_label": "Amenities",
            "field_type": "multiselect",
            "category": "amenities",
            "config": {
                "options": ["Swimming Pool", "Modular Kitchen", "Home Theater", "Garden", "Terrace", "Servant Room", "Study Room", "Pooja Room"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 9
        },
        {
            "field_key": "gated_community",
            "field_label": "Gated Community",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 10
        }
    ],
    
    # APARTMENTS / FLATS
    "apartment": [
        {
            "field_key": "flat_number",
            "field_label": "Flat Number",
            "field_type": "string",
            "category": "basic",
            "config": {"validation_rules": {"required": True, "searchable": True}},
            "display_order": 1,
            "is_system_field": True
        },
        {
            "field_key": "tower_block",
            "field_label": "Tower/Block",
            "field_type": "string",
            "category": "basic",
            "config": {"validation_rules": {"required": False, "searchable": True, "filterable": True}},
            "display_order": 2
        },
        {
            "field_key": "floor_number",
            "field_label": "Floor Number",
            "field_type": "number",
            "category": "basic",
            "config": {
                "min": 0,
                "max": 50,
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 3
        },
        {
            "field_key": "bhk_type",
            "field_label": "BHK Type",
            "field_type": "select",
            "category": "basic",
            "config": {
                "options": ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "Penthouse"],
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 4,
            "is_system_field": True
        },
        {
            "field_key": "carpet_area",
            "field_label": "Carpet Area",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.ft",
                "min": 300,
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 5
        },
        {
            "field_key": "super_built_up_area",
            "field_label": "Super Built-up Area",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.ft",
                "min": 400,
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 6
        },
        {
            "field_key": "balconies",
            "field_label": "Balconies",
            "field_type": "number",
            "category": "features",
            "config": {
                "min": 0,
                "max": 5,
                "validation_rules": {"required": False}
            },
            "display_order": 7
        },
        {
            "field_key": "bathrooms",
            "field_label": "Bathrooms",
            "field_type": "number",
            "category": "features",
            "config": {
                "min": 1,
                "max": 6,
                "validation_rules": {"required": True, "show_in_list": True}
            },
            "display_order": 8
        },
        {
            "field_key": "facing",
            "field_label": "Facing",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"],
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 9
        },
        {
            "field_key": "car_parking",
            "field_label": "Car Parking Slots",
            "field_type": "number",
            "category": "features",
            "config": {
                "min": 0,
                "max": 3,
                "validation_rules": {"required": False, "show_in_list": True}
            },
            "display_order": 10
        },
        {
            "field_key": "furnishing_status",
            "field_label": "Furnishing Status",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["Unfurnished", "Semi-Furnished", "Fully Furnished"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 11
        },
        {
            "field_key": "amenities",
            "field_label": "Amenities",
            "field_type": "multiselect",
            "category": "amenities",
            "config": {
                "options": ["Gym", "Swimming Pool", "Clubhouse", "Children's Play Area", "Lift", "Security", "Power Backup", "Water Supply", "Intercom"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 12
        }
    ],
    
    # FARMLAND / AGRICULTURAL LAND
    "farmland": [
        {
            "field_key": "survey_number",
            "field_label": "Survey Number",
            "field_type": "string",
            "category": "legal",
            "config": {"validation_rules": {"required": True, "searchable": True}},
            "display_order": 1,
            "is_system_field": True
        },
        {
            "field_key": "land_area",
            "field_label": "Land Area",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "acres",
                "min": 0.5,
                "step": 0.25,
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 2,
            "is_system_field": True
        },
        {
            "field_key": "land_area_guntas",
            "field_label": "Land Area (Guntas)",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "guntas",
                "min": 1,
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 3
        },
        {
            "field_key": "soil_type",
            "field_label": "Soil Type",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["Red Soil", "Black Soil", "Clay Soil", "Loamy Soil", "Sandy Soil"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 4
        },
        {
            "field_key": "water_source",
            "field_label": "Water Source",
            "field_type": "multiselect",
            "category": "features",
            "config": {
                "options": ["Borewell", "Canal", "Well", "River", "Pond", "Drip Irrigation"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 5
        },
        {
            "field_key": "electricity_available",
            "field_label": "Electricity Available",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 6
        },
        {
            "field_key": "road_access",
            "field_label": "Road Access",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 7
        },
        {
            "field_key": "crops_suitable",
            "field_label": "Crops Suitable For",
            "field_type": "multiselect",
            "category": "features",
            "config": {
                "options": ["Mango", "Paddy", "Cotton", "Maize", "Vegetables", "Coconut", "Teak", "Sandalwood"],
                "validation_rules": {"required": False}
            },
            "display_order": 8
        },
        {
            "field_key": "fenced",
            "field_label": "Fenced/Compound Wall",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 9
        },
        {
            "field_key": "pattadar_passbook",
            "field_label": "Pattadar Passbook Available",
            "field_type": "boolean",
            "category": "legal",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 10
        }
    ],
    
    # GATED COMMUNITY
    "gated_community": [
        # Inherits from plots + additional amenities
        {
            "field_key": "plot_number",
            "field_label": "Plot Number",
            "field_type": "string",
            "category": "basic",
            "config": {"validation_rules": {"required": True, "searchable": True}},
            "display_order": 1,
            "is_system_field": True
        },
        {
            "field_key": "plot_size",
            "field_label": "Plot Size",
            "field_type": "number",
            "category": "dimensions",
            "config": {
                "unit": "sq.yards",
                "min": 100,
                "validation_rules": {"required": True, "searchable": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 2,
            "is_system_field": True
        },
        {
            "field_key": "facing",
            "field_label": "Facing",
            "field_type": "select",
            "category": "features",
            "config": {
                "options": ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"],
                "validation_rules": {"required": True, "filterable": True, "show_in_list": True}
            },
            "display_order": 3
        },
        {
            "field_key": "corner_plot",
            "field_label": "Corner Plot",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 4
        },
        {
            "field_key": "park_facing",
            "field_label": "Park Facing",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 5
        },
        {
            "field_key": "main_road_facing",
            "field_label": "Main Road Facing",
            "field_type": "boolean",
            "category": "features",
            "config": {"validation_rules": {"required": False, "filterable": True}},
            "display_order": 6
        },
        {
            "field_key": "community_amenities",
            "field_label": "Community Amenities",
            "field_type": "multiselect",
            "category": "amenities",
            "config": {
                "options": ["Clubhouse", "Swimming Pool", "Gym", "Indoor Games", "Kids Play Area", "Jogging Track", "Amphitheater", "Meditation Center", "Shopping Complex", "School", "Hospital"],
                "validation_rules": {"required": False, "filterable": True}
            },
            "display_order": 7
        },
        {
            "field_key": "security_features",
            "field_label": "Security Features",
            "field_type": "multiselect",
            "category": "features",
            "config": {
                "options": ["24x7 Security", "CCTV Surveillance", "Gated Entry/Exit", "Security Cabin", "Intercom", "Visitor Management"],
                "validation_rules": {"required": False}
            },
            "display_order": 8
        },
        {
            "field_key": "utilities",
            "field_label": "Utilities Available",
            "field_type": "multiselect",
            "category": "features",
            "config": {
                "options": ["Underground Drainage", "Street Lights", "Water Supply", "Electricity", "Broadband", "Cable TV"],
                "validation_rules": {"required": False}
            },
            "display_order": 9
        }
    ]
}

async def seed_indian_fields():
    """Seed default Indian real estate fields"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.test_database
    
    print("🇮🇳 Seeding Indian Real Estate Default Fields...\n")
    
    total_fields = 0
    
    for project_type, fields in INDIAN_REAL_ESTATE_FIELDS.items():
        print(f"\n📋 {project_type.upper()}:")
        
        for field in fields:
            # Check if field already exists
            existing = await db.field_definitions.find_one({
                "tenant_id": None,  # System fields
                "project_type": project_type,
                "field_key": field['field_key']
            })
            
            if existing:
                print(f"  ⏭️  {field['field_label']} (already exists)")
                continue
            
            # Create field
            field_doc = {
                **field,
                "tenant_id": None,  # System default field
                "project_type": project_type,
                "is_active": True,
                "version": 1,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "deprecated_at": None,
                "deleted_at": None
            }
            
            await db.field_definitions.insert_one(field_doc)
            print(f"  ✅ {field['field_label']}")
            total_fields += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Seeded {total_fields} default fields!")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    asyncio.run(seed_indian_fields())
