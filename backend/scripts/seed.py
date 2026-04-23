"""Seed initial data for the database"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.role import Role, Permission
from models.currency import Currency
from models.category import MasterCategory
from utils.helpers import serialize_doc

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def seed_roles():
    """Seed initial roles"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    roles = [
        Role(
            name="Super Admin",
            slug="super_admin",
            description="Full system access",
            is_system=True,
            permissions=["*"]  # All permissions
        ),
        Role(
            name="Tenant Admin",
            slug="tenant_admin",
            description="Full access within tenant",
            is_system=True,
            permissions=["view_dashboard", "manage_projects", "manage_properties", "manage_leads", 
                        "manage_staff", "view_reports", "manage_payments", "manage_commissions"]
        ),
        Role(
            name="Staff",
            slug="staff",
            description="Staff member with limited access",
            is_system=True,
            permissions=["view_dashboard", "view_projects", "manage_leads", "view_properties"]
        ),
        Role(
            name="Customer",
            slug="customer",
            description="Customer with read-only access to their properties",
            is_system=True,
            permissions=["view_dashboard", "view_my_properties", "view_payments", "request_resale"]
        )
    ]
    
    for role in roles:
        existing = await db.roles.find_one({'slug': role.slug}, {"_id": 0})
        if not existing:
            role_doc = serialize_doc(role.model_dump())
            await db.roles.insert_one(role_doc)
            print(f"✅ Created role: {role.name}")
        else:
            print(f"⏭️  Role already exists: {role.name}")
    
    client.close()

async def seed_currencies():
    """Seed initial currencies"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    currencies = [
        Currency(code="INR", name="Indian Rupee", symbol="₹", exchange_rate=83.12, is_active=True),
        Currency(code="USD", name="US Dollar", symbol="$", exchange_rate=1.0, is_active=True),
        Currency(code="SAR", name="Saudi Riyal", symbol="﷼", exchange_rate=3.75, is_active=True),
        Currency(code="AED", name="UAE Dirham", symbol="د.إ", exchange_rate=3.67, is_active=True),
        Currency(code="GBP", name="British Pound", symbol="£", exchange_rate=0.79, is_active=True),
        Currency(code="EUR", name="Euro", symbol="€", exchange_rate=0.92, is_active=True),
    ]
    
    for currency in currencies:
        existing = await db.currencies.find_one({'code': currency.code}, {"_id": 0})
        if not existing:
            currency_doc = serialize_doc(currency.model_dump())
            await db.currencies.insert_one(currency_doc)
            print(f"✅ Created currency: {currency.name}")
        else:
            print(f"⏭️  Currency already exists: {currency.name}")
    
    client.close()

async def seed_categories():
    """Seed initial master categories"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    categories = [
        # Property Types
        MasterCategory(name="Residential", slug="residential", type="property_type", is_system=True, sort_order=1),
        MasterCategory(name="Commercial", slug="commercial", type="property_type", is_system=True, sort_order=2),
        MasterCategory(name="Agricultural", slug="agricultural", type="property_type", is_system=True, sort_order=3),
        MasterCategory(name="Industrial", slug="industrial", type="property_type", is_system=True, sort_order=4),
        
        # Lead Status
        MasterCategory(name="New", slug="new", type="lead_status", is_system=True, sort_order=1),
        MasterCategory(name="Contacted", slug="contacted", type="lead_status", is_system=True, sort_order=2),
        MasterCategory(name="Interested", slug="interested", type="lead_status", is_system=True, sort_order=3),
        MasterCategory(name="Site Visit Scheduled", slug="site-visit-scheduled", type="lead_status", is_system=True, sort_order=4),
        MasterCategory(name="Negotiation", slug="negotiation", type="lead_status", is_system=True, sort_order=5),
        MasterCategory(name="Converted", slug="converted", type="lead_status", is_system=True, sort_order=6),
        MasterCategory(name="Lost", slug="lost", type="lead_status", is_system=True, sort_order=7),
        
        # Payment Mode
        MasterCategory(name="Cash", slug="cash", type="payment_mode", is_system=True, sort_order=1),
        MasterCategory(name="Bank Transfer", slug="bank-transfer", type="payment_mode", is_system=True, sort_order=2),
        MasterCategory(name="Cheque", slug="cheque", type="payment_mode", is_system=True, sort_order=3),
        MasterCategory(name="UPI", slug="upi", type="payment_mode", is_system=True, sort_order=4),
        MasterCategory(name="Card", slug="card", type="payment_mode", is_system=True, sort_order=5),
        MasterCategory(name="EMI", slug="emi", type="payment_mode", is_system=True, sort_order=6),
        
        # Property Status
        MasterCategory(name="Available", slug="available", type="property_status", is_system=True, sort_order=1),
        MasterCategory(name="Blocked", slug="blocked", type="property_status", is_system=True, sort_order=2),
        MasterCategory(name="Booked", slug="booked", type="property_status", is_system=True, sort_order=3),
        MasterCategory(name="Sold", slug="sold", type="property_status", is_system=True, sort_order=4),
        MasterCategory(name="Resale", slug="resale", type="property_status", is_system=True, sort_order=5),
        
        # Lead Source
        MasterCategory(name="Website", slug="website", type="lead_source", is_system=True, sort_order=1),
        MasterCategory(name="IncomeLands App", slug="incomelands", type="lead_source", is_system=True, sort_order=2),
        MasterCategory(name="Walk-in", slug="walk-in", type="lead_source", is_system=True, sort_order=3),
        MasterCategory(name="Referral", slug="referral", type="lead_source", is_system=True, sort_order=4),
        MasterCategory(name="Facebook", slug="facebook", type="lead_source", is_system=True, sort_order=5),
        MasterCategory(name="Google Ads", slug="google-ads", type="lead_source", is_system=True, sort_order=6),
        MasterCategory(name="Phone Call", slug="phone-call", type="lead_source", is_system=True, sort_order=7),
        MasterCategory(name="Email", slug="email", type="lead_source", is_system=True, sort_order=8),
        MasterCategory(name="Agent", slug="agent", type="lead_source", is_system=True, sort_order=9),
    ]
    
    for category in categories:
        existing = await db.master_categories.find_one({'slug': category.slug, 'type': category.type}, {"_id": 0})
        if not existing:
            category_doc = serialize_doc(category.model_dump())
            await db.master_categories.insert_one(category_doc)
            print(f"✅ Created category: {category.name} ({category.type})")
        else:
            print(f"⏭️  Category already exists: {category.name} ({category.type})")
    
    client.close()

async def main():
    print("🌱 Starting database seeding...")
    print("\n📝 Seeding roles...")
    await seed_roles()
    print("\n💰 Seeding currencies...")
    await seed_currencies()
    print("\n🏷️  Seeding categories...")
    await seed_categories()
    print("\n✨ Seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
