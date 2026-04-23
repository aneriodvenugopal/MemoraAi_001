"""
Initialize default share reward configuration
Run this script to setup global reward settings
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

async def setup_share_rewards():
    """Setup default share reward configuration"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🎁 Setting up share reward configuration...")
    
    # Check if global config exists
    existing = await db.share_rewards.find_one({'tenant_id': None}, {"_id": 0})
    
    if existing:
        print("✅ Global reward config already exists")
        print(f"   Reward per view: ₹{existing.get('reward_per_view')}")
        print(f"   Reward per share: ₹{existing.get('reward_per_share')}")
        print(f"   Reward per lead: ₹{existing.get('reward_per_lead')}")
        print(f"   Reward per conversion: ₹{existing.get('reward_per_conversion')}")
        return
    
    # Create default global configuration
    config_id = str(uuid.uuid4())
    default_config = {
        'id': config_id,
        'tenant_id': None,  # Global configuration
        
        # Reward tiers
        'reward_per_view': 1.0,  # ₹1 per view
        'reward_per_share': 10.0,  # ₹10 when someone re-shares
        'reward_per_lead': 100.0,  # ₹100 per lead captured
        'reward_per_conversion': 500.0,  # ₹500 per paid conversion
        
        # Thresholds
        'min_payout_threshold': 500.0,  # Minimum ₹500 to withdraw
        'viral_threshold': 100,  # 100 views to qualify as viral
        'viral_bonus': 1000.0,  # ₹1000 bonus for viral content
        
        # Status
        'is_active': True,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.share_rewards.insert_one(default_config)
    
    print("✅ Global share reward config created successfully!")
    print("\n📊 Reward Structure:")
    print(f"   💵 Per View: ₹{default_config['reward_per_view']}")
    print(f"   🔄 Per Re-share: ₹{default_config['reward_per_share']}")
    print(f"   📝 Per Lead: ₹{default_config['reward_per_lead']}")
    print(f"   💰 Per Conversion: ₹{default_config['reward_per_conversion']}")
    print(f"\n🎯 Viral Bonus:")
    print(f"   Threshold: {default_config['viral_threshold']} views")
    print(f"   Bonus: ₹{default_config['viral_bonus']}")
    print(f"\n💳 Minimum Payout: ₹{default_config['min_payout_threshold']}")
    
    print("\n🎉 Setup complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_share_rewards())
