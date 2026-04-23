"""
Setup script to create required projects and bank accounts
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME', 'retoerp')

# Tenant ID from existing user
TENANT_ID = "f18f7bd6-3a1f-472d-acf9-c2fb181787e7"

async def setup_projects_and_accounts():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=== Setting up Projects and Bank Accounts ===\n")
    
    # First, delete all existing projects and related data
    print("Cleaning up existing data...")
    await db.projects.delete_many({})
    await db.properties.delete_many({})
    await db.bank_accounts.delete_many({})
    await db.bookings.delete_many({})
    await db.payments.delete_many({})
    await db.payment_schedules.delete_many({})
    await db.agent_sales.delete_many({})
    await db.agent_commission_payments.delete_many({})
    print("✓ Existing data cleaned")
    
    # Create Project 1: Rama Rama Project
    project1_id = str(uuid.uuid4())
    project1 = {
        "id": project1_id,
        "tenant_id": TENANT_ID,
        "name": "Rama Rama Project",
        "project_name": "Rama Rama Project",
        "description": "Premium residential plots with excellent connectivity",
        "location": "Shadnagar, Hyderabad",
        "total_area": "25 acres",
        "total_plots": 150,
        "launch_date": "2025-01-01",
        "rera_number": "P02400123456",
        "status": "active",
        "amenities": ["Gated Community", "24/7 Security", "Parks", "Street Lights", "Underground Drainage"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.projects.insert_one(project1)
    print(f"✓ Created Project: {project1['name']} (ID: {project1_id[:8]}...)")
    
    # Create Project 2: Sai Krishna Enclave
    project2_id = str(uuid.uuid4())
    project2 = {
        "id": project2_id,
        "tenant_id": TENANT_ID,
        "name": "Sai Krishna Enclave",
        "project_name": "Sai Krishna Enclave",
        "description": "Budget-friendly plots in prime location",
        "location": "Shamshabad, Hyderabad",
        "total_area": "15 acres",
        "total_plots": 100,
        "launch_date": "2025-06-01",
        "rera_number": "P02400789012",
        "status": "active",
        "amenities": ["Avenue Plantation", "Internal Roads", "Electricity", "Water Supply"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.projects.insert_one(project2)
    print(f"✓ Created Project: {project2['name']} (ID: {project2_id[:8]}...)")
    
    # Create Bank Accounts for Project 1: Rama Rama Project
    bank1_id = str(uuid.uuid4())
    bank1 = {
        "id": bank1_id,
        "tenant_id": TENANT_ID,
        "project_id": project1_id,
        "account_name": "Rama Rama Project - SBI",
        "bank_name": "State Bank of India",
        "account_number": "38765432109",
        "ifsc_code": "SBIN0001234",
        "branch": "Shadnagar Branch",
        "account_type": "current",
        "is_primary": True,
        "is_primary_online": True,
        "is_active": True,
        "current_balance": 2500000,
        "available_balance": 2500000,
        "notes": "Primary account for Rama Rama Project",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.bank_accounts.insert_one(bank1)
    print(f"  ✓ Bank Account: SBI - ****{bank1['account_number'][-4:]}")
    
    # Cash Account for Project 1
    cash1_id = str(uuid.uuid4())
    cash1 = {
        "id": cash1_id,
        "tenant_id": TENANT_ID,
        "project_id": project1_id,
        "account_name": "Rama Rama Project - Cash",
        "bank_name": "Cash Account",
        "account_number": "1111111",
        "ifsc_code": "",
        "branch": "Office",
        "account_type": "cash",
        "is_primary": False,
        "is_primary_online": False,
        "is_active": True,
        "current_balance": 150000,
        "available_balance": 150000,
        "notes": "Cash collections for Rama Rama Project",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.bank_accounts.insert_one(cash1)
    print(f"  ✓ Cash Account: Office Cash")
    
    # Second Bank for Project 1
    bank1b_id = str(uuid.uuid4())
    bank1b = {
        "id": bank1b_id,
        "tenant_id": TENANT_ID,
        "project_id": project1_id,
        "account_name": "Rama Rama Project - HDFC",
        "bank_name": "HDFC Bank",
        "account_number": "50100987654321",
        "ifsc_code": "HDFC0001234",
        "branch": "Kothapet Branch",
        "account_type": "current",
        "is_primary": False,
        "is_primary_online": False,
        "is_active": True,
        "current_balance": 800000,
        "available_balance": 800000,
        "notes": "Secondary account for Rama Rama Project",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.bank_accounts.insert_one(bank1b)
    print(f"  ✓ Bank Account: HDFC - ****{bank1b['account_number'][-4:]}")
    
    # Create Bank Account for Project 2: Sai Krishna Enclave
    bank2_id = str(uuid.uuid4())
    bank2 = {
        "id": bank2_id,
        "tenant_id": TENANT_ID,
        "project_id": project2_id,
        "account_name": "Sai Krishna Enclave - ICICI",
        "bank_name": "ICICI Bank",
        "account_number": "123456789012",
        "ifsc_code": "ICIC0001234",
        "branch": "Shamshabad Branch",
        "account_type": "current",
        "is_primary": True,
        "is_primary_online": True,
        "is_active": True,
        "current_balance": 1200000,
        "available_balance": 1200000,
        "notes": "Primary account for Sai Krishna Enclave",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None
    }
    await db.bank_accounts.insert_one(bank2)
    print(f"  ✓ Bank Account: ICICI - ****{bank2['account_number'][-4:]}")
    
    # Create sample properties for Project 1
    print("\nCreating sample properties for Rama Rama Project...")
    
    # Get or create available status
    available_status = await db.categories.find_one({"slug": "available", "type": "property_status"}, {"_id": 0})
    if not available_status:
        available_status_id = str(uuid.uuid4())
        await db.categories.insert_one({
            "id": available_status_id,
            "name": "Available",
            "slug": "available",
            "type": "property_status",
            "tenant_id": TENANT_ID,
            "color": "#22c55e",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        })
        available_status = {"id": available_status_id}
    
    properties_data = [
        {"number": "RR-001", "area": 167, "facing": "East", "price": 1500000, "corner": True},
        {"number": "RR-002", "area": 150, "facing": "North", "price": 1350000, "corner": False},
        {"number": "RR-003", "area": 200, "facing": "East", "price": 1800000, "corner": False},
        {"number": "RR-004", "area": 175, "facing": "West", "price": 1400000, "corner": True},
        {"number": "RR-005", "area": 150, "facing": "South", "price": 1200000, "corner": False},
        {"number": "RR-006", "area": 220, "facing": "East", "price": 2200000, "corner": True},
        {"number": "RR-007", "area": 167, "facing": "North", "price": 1500000, "corner": False},
        {"number": "RR-008", "area": 180, "facing": "East", "price": 1620000, "corner": False},
    ]
    
    for prop in properties_data:
        prop_id = str(uuid.uuid4())
        property_doc = {
            "id": prop_id,
            "tenant_id": TENANT_ID,
            "project_id": project1_id,
            "property_number": prop["number"],
            "area": prop["area"],
            "unit": "sq.yard",
            "facing": prop["facing"],
            "is_corner": prop["corner"],
            "price": prop["price"],
            "price_per_unit": prop["price"] / prop["area"],
            "status_id": available_status["id"],
            "status": "available",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        await db.properties.insert_one(property_doc)
    print(f"  ✓ Created {len(properties_data)} properties")
    
    # Create sample properties for Project 2
    print("\nCreating sample properties for Sai Krishna Enclave...")
    properties_data2 = [
        {"number": "SK-101", "area": 120, "facing": "East", "price": 960000, "corner": False},
        {"number": "SK-102", "area": 130, "facing": "North", "price": 1040000, "corner": True},
        {"number": "SK-103", "area": 150, "facing": "East", "price": 1200000, "corner": False},
        {"number": "SK-104", "area": 140, "facing": "West", "price": 1050000, "corner": False},
        {"number": "SK-105", "area": 160, "facing": "South", "price": 1280000, "corner": True},
    ]
    
    for prop in properties_data2:
        prop_id = str(uuid.uuid4())
        property_doc = {
            "id": prop_id,
            "tenant_id": TENANT_ID,
            "project_id": project2_id,
            "property_number": prop["number"],
            "area": prop["area"],
            "unit": "sq.yard",
            "facing": prop["facing"],
            "is_corner": prop["corner"],
            "price": prop["price"],
            "price_per_unit": prop["price"] / prop["area"],
            "status_id": available_status["id"],
            "status": "available",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        await db.properties.insert_one(property_doc)
    print(f"  ✓ Created {len(properties_data2)} properties")
    
    # Update marketing agent to use new project
    await db.marketing_agents.update_many(
        {"tenant_id": TENANT_ID},
        {"$set": {"assigned_projects": [project1_id, project2_id]}}
    )
    
    print("\n=== Setup Complete ===")
    print(f"Projects: 2 (Rama Rama Project, Sai Krishna Enclave)")
    print(f"Bank Accounts: 4 (3 for Rama Rama, 1 for Sai Krishna)")
    print(f"Properties: {len(properties_data) + len(properties_data2)}")
    
    # Return project IDs for use in category setup
    return {
        "project1_id": project1_id,
        "project2_id": project2_id,
        "tenant_id": TENANT_ID
    }
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_projects_and_accounts())
