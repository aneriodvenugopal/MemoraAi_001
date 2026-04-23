"""Fix bookings to match the Booking model schema"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def fix_bookings():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔧 Fixing Bookings...")
    print()
    
    # Get all bookings
    bookings = await db.bookings.find({}).to_list(length=None)
    print(f"Total bookings: {len(bookings)}")
    
    fixed_count = 0
    
    for booking in bookings:
        updates = {}
        
        # Fix payment_plan -> payment_plan_type
        if 'payment_plan' in booking and 'payment_plan_type' not in booking:
            payment_plan = booking['payment_plan']
            # Convert to lowercase with underscore
            payment_plan_type = payment_plan.lower().replace(' ', '_')
            updates['payment_plan_type'] = payment_plan_type
        
        # Ensure required fields exist
        if 'status' not in booking:
            updates['status'] = 'active'
        
        if 'booking_date' not in booking:
            updates['booking_date'] = booking.get('created_at')
        
        # Apply updates if any
        if updates:
            await db.bookings.update_one(
                {'id': booking['id']},
                {'$set': updates}
            )
            fixed_count += 1
    
    print(f"✅ Fixed {fixed_count} bookings")
    
    # Verify
    sample = await db.bookings.find_one({}, {'_id': 0})
    if sample:
        has_required = all(k in sample for k in ['payment_plan_type', 'status', 'booking_date'])
        print(f"Sample booking has all required fields: {has_required}")
    
    print()
    print("✅ Fix complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_bookings())
