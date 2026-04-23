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

async def seed_currencies():
    """Seed currency data with exchange rates"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.retoerp
    
    print("🌱 Seeding Currencies...")
    
    currencies = [
        {
            "id": str(uuid.uuid4()),
            "code": "INR",
            "name": "Indian Rupee",
            "symbol": "₹",
            "exchange_rate_to_inr": 1.0,
            "is_active": True,
            "is_base_currency": True,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "code": "USD",
            "name": "US Dollar",
            "symbol": "$",
            "exchange_rate_to_inr": 83.0,  # 1 USD = 83 INR (approximate)
            "is_active": True,
            "is_base_currency": False,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "code": "EUR",
            "name": "Euro",
            "symbol": "€",
            "exchange_rate_to_inr": 90.0,  # 1 EUR = 90 INR (approximate)
            "is_active": True,
            "is_base_currency": False,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "code": "GBP",
            "name": "British Pound",
            "symbol": "£",
            "exchange_rate_to_inr": 105.0,  # 1 GBP = 105 INR (approximate)
            "is_active": True,
            "is_base_currency": False,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "code": "AED",
            "name": "UAE Dirham",
            "symbol": "د.إ",
            "exchange_rate_to_inr": 22.6,  # 1 AED = 22.6 INR (approximate)
            "is_active": True,
            "is_base_currency": False,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "code": "SGD",
            "name": "Singapore Dollar",
            "symbol": "S$",
            "exchange_rate_to_inr": 62.0,  # 1 SGD = 62 INR (approximate)
            "is_active": True,
            "is_base_currency": False,
            "decimal_places": 2,
            "thousand_separator": ",",
            "decimal_separator": ".",
            "display_format": "{symbol}{amount}",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Clear existing
    await db.currencies.delete_many({})
    
    # Insert currencies
    result = await db.currencies.insert_many(currencies)
    print(f"✅ Inserted {len(result.inserted_ids)} currencies")
    
    print("\n📊 Currency List:")
    for curr in currencies:
        print(f"  - {curr['code']} ({curr['symbol']}) - {curr['name']}: 1 {curr['code']} = ₹{curr['exchange_rate_to_inr']}")
    
    print(f"\n✅ Currencies seeded successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_currencies())
