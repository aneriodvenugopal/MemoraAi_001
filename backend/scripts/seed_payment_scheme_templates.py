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

async def seed_payment_scheme_templates():
    """Seed default payment scheme templates"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    print("🌱 Seeding Payment Scheme Templates...")
    
    # Get INR currency ID
    inr_currency = await db.currencies.find_one({"code": "INR"})
    if not inr_currency:
        print("❌ INR currency not found. Please run seed_currencies.py first.")
        return
    
    templates = [
        {
            "id": str(uuid.uuid4()),
            "tenant_id": "system",  # System template
            "project_id": None,
            "scheme_name": "12 Months Standard Scheme",
            "scheme_type": "12_months",
            "duration_months": 12,
            "fields": [
                {
                    "field_name": "Booking Amount",
                    "field_value": 100000,
                    "due_month": 0,
                    "is_percentage": False,
                    "description": "Initial booking amount"
                },
                {
                    "field_name": "1st Installment",
                    "field_value": 50000,
                    "due_month": 1,
                    "is_percentage": False,
                    "description": "First month payment"
                },
                {
                    "field_name": "2nd to 11th Installments (Monthly)",
                    "field_value": 50000,
                    "due_month": 2,
                    "is_percentage": False,
                    "description": "Monthly installments from month 2 to 11"
                },
                {
                    "field_name": "Final Payment",
                    "field_value": 200000,
                    "due_month": 12,
                    "is_percentage": False,
                    "description": "Final settlement payment"
                }
            ],
            "total_amount": 850000,
            "is_finalized": True,
            "is_active": True,
            "is_template": True,
            "description": "Standard 12-month payment scheme with monthly installments",
            "terms_conditions": "Payments must be made on time. Late payments may incur penalties.",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": "system",
            "project_id": None,
            "scheme_name": "18 Months Flexible Scheme",
            "scheme_type": "18_months",
            "duration_months": 18,
            "fields": [
                {
                    "field_name": "Booking Amount",
                    "field_value": 150000,
                    "due_month": 0,
                    "is_percentage": False,
                    "description": "Initial booking amount"
                },
                {
                    "field_name": "3 Months Payment",
                    "field_value": 100000,
                    "due_month": 3,
                    "is_percentage": False,
                    "description": "Payment at 3rd month"
                },
                {
                    "field_name": "6 Months Payment",
                    "field_value": 150000,
                    "due_month": 6,
                    "is_percentage": False,
                    "description": "Payment at 6th month"
                },
                {
                    "field_name": "9 Months Payment",
                    "field_value": 100000,
                    "due_month": 9,
                    "is_percentage": False,
                    "description": "Payment at 9th month"
                },
                {
                    "field_name": "12 Months Payment",
                    "field_value": 150000,
                    "due_month": 12,
                    "is_percentage": False,
                    "description": "Payment at 12th month"
                },
                {
                    "field_name": "Final Payment",
                    "field_value": 350000,
                    "due_month": 18,
                    "is_percentage": False,
                    "description": "Final settlement at 18 months"
                }
            ],
            "total_amount": 1000000,
            "is_finalized": True,
            "is_active": True,
            "is_template": True,
            "description": "Flexible 18-month scheme with quarterly payments",
            "terms_conditions": "Flexible payment schedule with milestone-based payments.",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": "system",
            "project_id": None,
            "scheme_name": "24 Months Extended Scheme",
            "scheme_type": "24_months",
            "duration_months": 24,
            "fields": [
                {
                    "field_name": "Booking Amount",
                    "field_value": 200000,
                    "due_month": 0,
                    "is_percentage": False,
                    "description": "Initial booking amount"
                },
                {
                    "field_name": "6 Months Special",
                    "field_value": 200000,
                    "due_month": 6,
                    "is_percentage": False,
                    "description": "Special payment at 6 months"
                },
                {
                    "field_name": "12 Months Payment",
                    "field_value": 250000,
                    "due_month": 12,
                    "is_percentage": False,
                    "description": "Mid-term payment"
                },
                {
                    "field_name": "18 Months Payment",
                    "field_value": 200000,
                    "due_month": 18,
                    "is_percentage": False,
                    "description": "Payment at 18 months"
                },
                {
                    "field_name": "Final Payment",
                    "field_value": 400000,
                    "due_month": 24,
                    "is_percentage": False,
                    "description": "Final settlement at completion"
                }
            ],
            "total_amount": 1250000,
            "is_finalized": True,
            "is_active": True,
            "is_template": True,
            "description": "Extended 24-month scheme for premium properties",
            "terms_conditions": "Extended payment plan with construction milestone-based payments.",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "tenant_id": "system",
            "project_id": None,
            "scheme_name": "Construction Linked Plan",
            "scheme_type": "custom",
            "duration_months": 36,
            "fields": [
                {
                    "field_name": "Booking Amount (10%)",
                    "field_value": 0,
                    "due_month": 0,
                    "is_percentage": True,
                    "description": "10% at booking"
                },
                {
                    "field_name": "Foundation Stage (20%)",
                    "field_value": 0,
                    "due_month": 3,
                    "is_percentage": True,
                    "description": "20% at foundation completion"
                },
                {
                    "field_name": "Plinth Level (20%)",
                    "field_value": 0,
                    "due_month": 6,
                    "is_percentage": True,
                    "description": "20% at plinth level"
                },
                {
                    "field_name": "Slab Level (20%)",
                    "field_value": 0,
                    "due_month": 12,
                    "is_percentage": True,
                    "description": "20% at slab completion"
                },
                {
                    "field_name": "Finishing Stage (20%)",
                    "field_value": 0,
                    "due_month": 24,
                    "is_percentage": True,
                    "description": "20% at finishing stage"
                },
                {
                    "field_name": "Possession (10%)",
                    "field_value": 0,
                    "due_month": 36,
                    "is_percentage": True,
                    "description": "10% at possession"
                }
            ],
            "total_amount": 0,  # Calculated based on property value
            "is_finalized": True,
            "is_active": True,
            "is_template": True,
            "description": "Construction-linked payment plan based on project milestones",
            "terms_conditions": "Payments linked to construction progress. Subject to on-ground verification.",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing system templates
    await db.payment_schemes.delete_many({"tenant_id": "system"})
    
    # Insert templates
    result = await db.payment_schemes.insert_many(templates)
    print(f"✅ Inserted {len(result.inserted_ids)} payment scheme templates")
    
    print("\n📊 Templates Created:")
    for template in templates:
        print(f"  - {template['scheme_name']} ({template['scheme_type']})")
        print(f"    Duration: {template['duration_months']} months")
        print(f"    Fields: {len(template['fields'])}")
        if template['total_amount'] > 0:
            print(f"    Sample Total: ₹{template['total_amount']:,}")
        else:
            print(f"    Total: Percentage-based (calculated from property value)")
    
    print(f"\n✅ Payment scheme templates seeded successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_payment_scheme_templates())
