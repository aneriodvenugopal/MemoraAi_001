import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['retoerp']

async def setup_test_environment():
    """Create test user and notifications"""
    
    # First check if tenant exists
    tenant = await db.tenants.find_one({}, {"_id": 0})
    
    if not tenant:
        print("Creating default tenant...")
        tenant_id = str(uuid.uuid4())
        tenant_doc = {
            'id': tenant_id,
            'name': 'Demo Real Estate Company',
            'domain': 'demo.realapex.in',
            'package_id': 'premium',
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant_doc)
        print(f"✅ Created tenant: {tenant_id}")
    else:
        tenant_id = tenant['id']
        print(f"✅ Using existing tenant: {tenant_id}")
    
    # Check for role
    role = await db.roles.find_one({'slug': 'tenant_admin'}, {"_id": 0})
    
    if not role:
        print("Creating roles...")
        roles = [
            {
                'id': str(uuid.uuid4()),
                'name': 'Super Admin',
                'slug': 'super_admin',
                'permissions': []
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Tenant Admin',
                'slug': 'tenant_admin',
                'permissions': []
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Staff',
                'slug': 'staff',
                'permissions': []
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Customer',
                'slug': 'customer',
                'permissions': []
            }
        ]
        await db.roles.insert_many(roles)
        role = await db.roles.find_one({'slug': 'tenant_admin'}, {"_id": 0})
        print(f"✅ Created roles")
    
    # Create test user (Tenant Admin)
    existing_user = await db.users.find_one({'phone': '9908290239'}, {"_id": 0})
    
    if existing_user:
        user = existing_user
        print(f"✅ Using existing user: {user['name']}")
    else:
        print("Creating test user...")
        user_id = str(uuid.uuid4())
        user_doc = {
            'id': user_id,
            'name': 'Test Admin',
            'phone': '9908290239',
            'email': 'admin@demo.com',
            'role_id': role['id'],
            'tenant_id': tenant_id,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'otp': None,
            'otp_expires_at': None,
            'last_login': None
        }
        await db.users.insert_one(user_doc)
        user = user_doc
        print(f"✅ Created user: {user['name']} ({user['phone']})")
    
    # Create test notifications
    print("\nCreating test notifications...")
    
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
    
    result = await db.in_app_notifications.insert_many(notifications)
    
    print(f"✅ Created {len(result.inserted_ids)} test notifications!")
    
    print(f"\n" + "="*60)
    print(f"🎉 TEST ENVIRONMENT READY!")
    print(f"="*60)
    print(f"\n📱 Login Credentials:")
    print(f"   Phone: 9908290239")
    print(f"   OTP: Use any 6-digit number (e.g., 123456)")
    print(f"   Role: Tenant Admin")
    print(f"\n🔔 Notifications Created: {len(notifications)}")
    for notif in notifications:
        print(f"   • {notif['title']}")
    print(f"\n✅ After login, check the bell icon in the dashboard header!")
    print(f"   You should see a red badge with number 6!")
    print(f"="*60)

if __name__ == "__main__":
    asyncio.run(setup_test_environment())
    client.close()
