import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['retoerp']

async def create_test_notifications():
    """Create test notifications for Tenant Admin user"""
    
    # Find Tenant Admin user (phone: 9908290239)
    user = await db.users.find_one({'phone': '9908290239'}, {"_id": 0})
    
    if not user:
        print("❌ Tenant Admin user not found. Please register first.")
        return
    
    print(f"✅ Found user: {user['name']} ({user['phone']})")
    print(f"   User ID: {user['id']}")
    print(f"   Tenant ID: {user['tenant_id']}")
    
    # Sample notifications
    notifications = [
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': '💰 New Payment Received',
            'message': 'Payment of ₹50,000 received from Rajesh Kumar for Plot A-15',
            'type': 'payment',
            'priority': 'high',
            'read': False,
            'action_url': '/bookings',
            'action_label': 'View Booking',
            'metadata': {'amount': 50000, 'customer': 'Rajesh Kumar'},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': '📅 New Booking Created',
            'message': 'New booking for Satthenapalli Gardens by Priya Sharma',
            'type': 'booking',
            'priority': 'normal',
            'read': False,
            'action_url': '/bookings',
            'action_label': 'View Details',
            'metadata': {'project': 'Satthenapalli Gardens'},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': '👤 New Lead Assigned',
            'message': 'Lead "Anil Reddy" has been assigned to you for follow-up',
            'type': 'lead',
            'priority': 'normal',
            'read': False,
            'action_url': '/leads',
            'action_label': 'View Lead',
            'metadata': {'lead_name': 'Anil Reddy'},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': '⚠️ Payment Due Tomorrow',
            'message': 'EMI payment of ₹25,000 due tomorrow for Plot B-7',
            'type': 'warning',
            'priority': 'high',
            'read': False,
            'action_url': '/bookings',
            'action_label': 'View Payment',
            'metadata': {'amount': 25000},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': '✅ Layout Approved',
            'message': 'Your layout "Green Valley Phase 2" has been approved',
            'type': 'success',
            'priority': 'normal',
            'read': False,
            'action_url': '/layouts',
            'action_label': 'View Layout',
            'metadata': {'layout': 'Green Valley Phase 2'},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        },
        {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'tenant_id': user['tenant_id'],
            'title': 'ℹ️ System Update',
            'message': 'New features added: Hybrid Layout Creator with smart plot detection',
            'type': 'info',
            'priority': 'low',
            'read': False,
            'action_url': '/layout/create/hybrid',
            'action_label': 'Try Now',
            'metadata': {},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        }
    ]
    
    # Insert notifications
    result = await db.in_app_notifications.insert_many(notifications)
    
    print(f"\n✅ Created {len(result.inserted_ids)} test notifications!")
    print(f"\n📋 Notification Summary:")
    for notif in notifications:
        print(f"   • {notif['title']}")
    
    print(f"\n🔔 Login to test:")
    print(f"   Phone: 9908290239")
    print(f"   OTP: Check backend logs or use any 6-digit number")
    print(f"\n✅ After login, check the bell icon in the dashboard header!")

if __name__ == "__main__":
    asyncio.run(create_test_notifications())
    client.close()
