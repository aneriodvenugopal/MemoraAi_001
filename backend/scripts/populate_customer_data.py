"""
Script to populate realistic customer data for testing Customer Portal
Creates bookings, payments, schedules, and properties for customer users
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/retoerp')
DB_NAME = os.getenv('DB_NAME', 'test_database')

async def populate_customer_data():
    """Populate customer data for testing"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🚀 Starting customer data population...")
    
    # Get default tenant
    tenant = await db.tenants.find_one({'deleted_at': None})
    if not tenant:
        print("❌ No tenant found. Please create a tenant first.")
        return
    
    tenant_id = tenant['id']
    print(f"✅ Using tenant: {tenant['name']} ({tenant_id})")
    
    # Get customer users by role_id
    # First get customer role
    customer_role = await db.roles.find_one({'slug': 'customer'})
    if not customer_role:
        print("❌ Customer role not found in database.")
        return
    
    customers = await db.users.find({
        'role_id': customer_role['id'],
        'deleted_at': None
    }).to_list(length=None)
    
    if not customers:
        print("❌ No customer users found. Please create customer users first.")
        return
    
    print(f"✅ Found {len(customers)} customer users")
    
    # Get or create projects
    projects = await db.projects.find({'tenant_id': tenant_id, 'deleted_at': None}).to_list(length=5)
    
    if not projects or len(projects) == 0:
        print("📦 Creating sample projects...")
        project_data = [
            {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'name': 'Ocean View Residences',
                'location': 'Banjara Hills, Hyderabad',
                'description': 'Luxury apartments with ocean view',
                'total_units': 100,
                'status': 'Active',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            },
            {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'name': 'Green Valley Villas',
                'location': 'Gachibowli, Hyderabad',
                'description': 'Premium villas with garden',
                'total_units': 50,
                'status': 'Active',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            },
            {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'name': 'Skyline Towers',
                'location': 'HITEC City, Hyderabad',
                'description': 'Modern high-rise apartments',
                'total_units': 150,
                'status': 'Active',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            }
        ]
        await db.projects.insert_many(project_data)
        projects = project_data
        print(f"✅ Created {len(projects)} projects")
    
    # Property configurations for realistic scenarios
    property_configs = [
        {'type': '2BHK', 'area': 1200, 'price': 6500000, 'floor': 5},
        {'type': '3BHK', 'area': 1800, 'price': 9500000, 'floor': 8},
        {'type': '3BHK Premium', 'area': 2200, 'price': 12500000, 'floor': 12},
        {'type': '4BHK Penthouse', 'area': 3000, 'price': 18500000, 'floor': 15},
        {'type': 'Villa', 'area': 3500, 'price': 22000000, 'floor': 1},
        {'type': '2BHK Corner', 'area': 1350, 'price': 7200000, 'floor': 7},
        {'type': '3BHK Duplex', 'area': 2500, 'price': 14500000, 'floor': 10}
    ]
    
    # Payment plan scenarios
    payment_plans = [
        {'name': '20-80 Plan', 'down_payment': 0.20, 'installments': 12},
        {'name': '30-70 Plan', 'down_payment': 0.30, 'installments': 10},
        {'name': '40-60 Plan', 'down_payment': 0.40, 'installments': 8}
    ]
    
    # Booking statuses with realistic distribution
    booking_statuses = ['active', 'active', 'active', 'completed', 'under_construction']
    
    for customer in customers:
        customer_id = customer['id']  # Use 'id' field instead of 'user_id'
        customer_name = customer['name']
        
        print(f"\n👤 Creating data for customer: {customer_name} ({customer['phone']})")
        
        # Create 5-7 properties with bookings for this customer
        num_properties = 6  # Middle of 5-7 range
        
        for i in range(num_properties):
            config = property_configs[i % len(property_configs)]
            project = projects[i % len(projects)]
            payment_plan = payment_plans[i % len(payment_plans)]
            
            # Create property
            property_id = str(uuid.uuid4())
            property_number = f"{project['name'][:3].upper()}-{i+1}-{config['floor']}{chr(65+i%4)}"
            
            property_doc = {
                'id': property_id,
                'tenant_id': tenant_id,
                'project_id': project['id'],
                'property_number': property_number,
                'property_type': config['type'],
                'area': config['area'],
                'unit': 'sqft',
                'price': config['price'],
                'status': 'Sold' if i < 4 else 'Booked',
                'floor': config['floor'],
                'facing': ['North', 'South', 'East', 'West'][i % 4],
                'availability': 'Sold',
                'features': ['Parking', 'Balcony', 'Modular Kitchen', 'Gymnasium'],
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            }
            
            await db.properties.insert_one(property_doc)
            
            # Create booking
            booking_id = str(uuid.uuid4())
            booking_date = datetime.now(timezone.utc) - timedelta(days=180-i*30)
            status = booking_statuses[i % len(booking_statuses)]
            
            total_amount = config['price']
            down_payment = total_amount * payment_plan['down_payment']
            
            # Calculate paid amount based on status
            if status == 'completed':
                paid_amount = total_amount
            elif status == 'active':
                paid_amount = down_payment + (total_amount - down_payment) * (0.3 + i*0.1)
            else:
                paid_amount = down_payment + (total_amount - down_payment) * 0.2
            
            booking_doc = {
                'id': booking_id,
                'tenant_id': tenant_id,
                'customer_id': customer_id,
                'property_id': property_id,
                'project_id': project['id'],
                'booking_date': booking_date.date().isoformat(),
                'total_amount': total_amount,
                'paid_amount': paid_amount,
                'pending_amount': total_amount - paid_amount,
                'payment_plan_type': payment_plan['name'],
                'status': status,
                'agreement_date': (booking_date + timedelta(days=15)).date().isoformat(),
                'possession_date': (booking_date + timedelta(days=730)).date().isoformat(),
                'created_at': booking_date.isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'deleted_at': None
            }
            
            await db.bookings.insert_one(booking_doc)
            
            # Create payment schedules
            remaining_amount = total_amount - down_payment
            installment_amount = remaining_amount / payment_plan['installments']
            
            schedules = []
            
            # Down payment schedule (already paid)
            schedule_id = str(uuid.uuid4())
            schedules.append({
                'id': schedule_id,
                'tenant_id': tenant_id,
                'booking_id': booking_id,
                'property_id': property_id,
                'customer_id': customer_id,
                'installment_number': 1,
                'amount': down_payment,
                'due_date': booking_date.date().isoformat(),
                'status': 'paid',
                'payment_date': booking_date.date().isoformat(),
                'created_at': booking_date.isoformat(),
                'updated_at': booking_date.isoformat(),
                'deleted_at': None
            })
            
            # Installment schedules
            paid_installments = int((paid_amount - down_payment) / installment_amount)
            
            for j in range(payment_plan['installments']):
                schedule_id = str(uuid.uuid4())
                due_date = booking_date + timedelta(days=30*(j+1))
                
                # Determine status
                if j < paid_installments:
                    sched_status = 'paid'
                    pay_date = due_date.date().isoformat()
                elif due_date.date() < datetime.now(timezone.utc).date():
                    sched_status = 'overdue'
                    pay_date = None
                else:
                    sched_status = 'pending'
                    pay_date = None
                
                schedules.append({
                    'id': schedule_id,
                    'tenant_id': tenant_id,
                    'booking_id': booking_id,
                    'property_id': property_id,
                    'customer_id': customer_id,
                    'installment_number': j + 2,
                    'amount': installment_amount,
                    'due_date': due_date.date().isoformat(),
                    'status': sched_status,
                    'payment_date': pay_date,
                    'created_at': booking_date.isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'deleted_at': None
                })
            
            await db.payment_schedules.insert_many(schedules)
            
            # Create payment records for paid schedules
            payments = []
            for schedule in schedules:
                if schedule['status'] == 'paid':
                    payment_id = str(uuid.uuid4())
                    payments.append({
                        'id': payment_id,
                        'tenant_id': tenant_id,
                        'booking_id': booking_id,
                        'property_id': property_id,
                        'customer_id': customer_id,
                        'schedule_id': schedule['id'],
                        'amount': schedule['amount'],
                        'payment_date': schedule['payment_date'],
                        'mode_id': ['cash', 'bank_transfer', 'cheque', 'upi'][j % 4],
                        'status': 'Success',
                        'receipt_number': f"RCP-{booking_id[:8]}-{schedule['installment_number']}",
                        'transaction_id': f"TXN{uuid.uuid4().hex[:12].upper()}",
                        'notes': f"Payment for installment {schedule['installment_number']}",
                        'created_at': schedule['payment_date'],
                        'updated_at': schedule['payment_date'],
                        'deleted_at': None
                    })
            
            if payments:
                await db.payments.insert_many(payments)
            
            print(f"  ✅ Created property {property_number} - {config['type']} - ₹{config['price']:,}")
            print(f"     Booking: {status} | Paid: ₹{paid_amount:,.0f} / ₹{total_amount:,}")
            print(f"     Schedules: {len(schedules)} | Payments: {len(payments)}")
        
        # Create 1-2 resale requests for some properties
        if num_properties >= 4:
            resale_properties = await db.properties.find({
                'tenant_id': tenant_id,
                'deleted_at': None
            }).limit(2).to_list(length=2)
            
            for prop in resale_properties[:2]:
                booking = await db.bookings.find_one({
                    'property_id': prop['id'],
                    'customer_id': customer_id
                })
                
                if booking:
                    resale_id = str(uuid.uuid4())
                    resale_doc = {
                        'id': resale_id,
                        'tenant_id': tenant_id,
                        'property_id': prop['id'],
                        'booking_id': booking['id'],
                        'customer_id': customer_id,
                        'asking_price': prop['price'] * 1.15,  # 15% appreciation
                        'reason': 'Relocation to another city',
                        'status': 'pending',
                        'notes': 'Looking for genuine buyers. Property in excellent condition.',
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                        'deleted_at': None
                    }
                    await db.resale_requests.insert_one(resale_doc)
                    print(f"  ✅ Created resale request for {prop['property_number']}")
    
    print("\n✅ Customer data population complete!")
    print("\n📊 Summary:")
    total_properties = await db.properties.count_documents({'deleted_at': None})
    total_bookings = await db.bookings.count_documents({'deleted_at': None})
    total_schedules = await db.payment_schedules.count_documents({'deleted_at': None})
    total_payments = await db.payments.count_documents({'deleted_at': None})
    total_resales = await db.resale_requests.count_documents({'deleted_at': None})
    
    print(f"   Properties: {total_properties}")
    print(f"   Bookings: {total_bookings}")
    print(f"   Payment Schedules: {total_schedules}")
    print(f"   Payments: {total_payments}")
    print(f"   Resale Requests: {total_resales}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_customer_data())
