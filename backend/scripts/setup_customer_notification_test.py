import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client['retoerp']

async def setup_customer_test():
    """Create customer user, projects, and properties for testing"""
    
    # Get tenant and roles
    tenant = await db.tenants.find_one({}, {"_id": 0})
    tenant_id = tenant['id']
    
    tenant_admin = await db.users.find_one({'phone': '9908290239'}, {"_id": 0})
    customer_role = await db.roles.find_one({'slug': 'customer'}, {"_id": 0})
    
    # Create Customer User
    customer = await db.users.find_one({'phone': '8888888888'}, {"_id": 0})
    
    if not customer:
        print("Creating Customer user...")
        customer_id = str(uuid.uuid4())
        customer_doc = {
            'id': customer_id,
            'name': 'Ramesh Kumar',
            'phone': '8888888888',
            'email': 'ramesh@customer.com',
            'role_id': customer_role['id'],
            'tenant_id': tenant_id,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'otp': None,
            'otp_expires_at': None,
            'last_login': None
        }
        await db.users.insert_one(customer_doc)
        customer = customer_doc
        print(f"✅ Created Customer: {customer['name']} ({customer['phone']})")
    else:
        print(f"✅ Using existing customer: {customer['name']}")
    
    # Create Sample Project
    project = await db.projects.find_one({'name': 'Green Valley Apartments'}, {"_id": 0})
    
    if not project:
        print("\nCreating sample project...")
        project_id = str(uuid.uuid4())
        project_doc = {
            'id': project_id,
            'name': 'Green Valley Apartments',
            'tenant_id': tenant_id,
            'description': 'Luxury 2BHK and 3BHK apartments',
            'location': 'Hyderabad, Telangana',
            'project_type': 'apartment',
            'total_units': 50,
            'available_units': 35,
            'status': 'active',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        await db.projects.insert_one(project_doc)
        project = project_doc
        print(f"✅ Created Project: {project['name']}")
    else:
        print(f"✅ Using existing project: {project['name']}")
    
    # Create Sample Properties
    properties = await db.properties.find({'project_id': project['id']}, {"_id": 0}).to_list(length=5)
    
    if len(properties) < 3:
        print("\nCreating sample properties...")
        property_docs = []
        
        for i in range(1, 4):
            prop_id = str(uuid.uuid4())
            property_docs.append({
                'id': prop_id,
                'project_id': project['id'],
                'tenant_id': tenant_id,
                'property_name': f'Apartment A-{i}0{i}',
                'property_type': '2BHK' if i <= 2 else '3BHK',
                'area': 1200 + (i * 100),
                'price': 5000000 + (i * 500000),
                'status': 'available',
                'floor': i,
                'facing': 'East' if i % 2 == 0 else 'North',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            })
        
        await db.properties.insert_many(property_docs)
        properties = property_docs
        print(f"✅ Created {len(property_docs)} properties")
    else:
        print(f"✅ Using existing {len(properties)} properties")
    
    # Create a booking for customer (so they can request resale)
    booking = await db.bookings.find_one({'customer_id': customer['id']}, {"_id": 0})
    
    if not booking and len(properties) > 0:
        print("\nCreating sample booking for customer...")
        booking_id = str(uuid.uuid4())
        booking_doc = {
            'id': booking_id,
            'project_id': project['id'],
            'property_id': properties[0]['id'],
            'customer_id': customer['id'],
            'tenant_id': tenant_id,
            'booking_date': datetime.now(timezone.utc).isoformat(),
            'total_amount': properties[0]['price'],
            'booking_amount': properties[0]['price'] * 0.1,  # 10% booking
            'payment_plan': 'emi',
            'status': 'confirmed',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        await db.bookings.insert_one(booking_doc)
        booking = booking_doc
        print(f"✅ Created booking for property: {properties[0]['property_name']}")
    
    print("\n" + "="*70)
    print("🎉 CUSTOMER TEST ENVIRONMENT READY!")
    print("="*70)
    
    print("\n📱 TEST USERS:")
    print("\n1️⃣ TENANT ADMIN (Browser 1)")
    print(f"   Phone: 9908290239")
    print(f"   OTP: Any 6-digit (check screen)")
    print(f"   Role: Tenant Admin")
    
    print("\n2️⃣ CUSTOMER (Browser 2)")
    print(f"   Phone: 8888888888")
    print(f"   Name: Ramesh Kumar")
    print(f"   OTP: Any 6-digit (check screen)")
    print(f"   Role: Customer")
    
    print("\n📋 TEST SCENARIOS:")
    print("\n✅ Scenario 1: Property Interest Notification")
    print("   1. Browser 2 (Customer): Login → Go to Properties")
    print("   2. Click 'View Details' on any property")
    print("   3. Click 'Show Interest' or 'Request Callback' button")
    print("   4. Fill form and submit")
    print("   5. Browser 1 (Admin): Check bell icon - should see notification")
    print("      → '👤 New Property Interest from Ramesh Kumar'")
    
    print("\n✅ Scenario 2: Resale Request Notification")
    print("   1. Browser 2 (Customer): Login → Go to Customer Dashboard")
    print("   2. Go to 'Properties' or 'Bookings' tab")
    print(f"   3. Click 'Request Resale' on: {properties[0]['property_name'] if properties else 'your property'}")
    print("   4. Fill resale form and submit")
    print("   5. Browser 1 (Admin): Check bell icon - should see notification")
    print("      → '🏠 Resale Request from Ramesh Kumar'")
    
    print("\n🔗 URLs:")
    print("   Login: https://retomerp-memora.preview.emergentagent.com/login")
    print("   Properties: https://retomerp-memora.preview.emergentagent.com/properties")
    print("   Customer Dashboard: https://retomerp-memora.preview.emergentagent.com/customer-dashboard")
    
    print("\n💡 TIP: Keep both browsers open side-by-side to see")
    print("   notifications appear in real-time (refreshes every 30 seconds)")
    print("="*70)

if __name__ == "__main__":
    asyncio.run(setup_customer_test())
    client.close()
