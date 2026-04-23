"""Populate database with large realistic Indian real estate data for testing"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import sys
import random
from datetime import datetime, timezone, timedelta
import uuid

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.helpers import serialize_doc

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

# Indian cities
CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow']

# Indian names (First + Last)
FIRST_NAMES = ['Amit', 'Priya', 'Rajesh', 'Sneha', 'Vikram', 'Ananya', 'Rahul', 'Kavya', 'Arjun', 'Divya', 
               'Karan', 'Nisha', 'Rohit', 'Pooja', 'Sanjay', 'Meera', 'Varun', 'Ishita', 'Aditya', 'Riya',
               'Nikhil', 'Shruti', 'Manoj', 'Swati', 'Akash', 'Tanvi', 'Harsh', 'Neha', 'Suresh', 'Anjali']

LAST_NAMES = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Iyer', 'Verma', 'Gupta', 'Desai', 'Chopra',
              'Mehta', 'Nair', 'Joshi', 'Rao', 'Bhat', 'Malhotra', 'Agarwal', 'Shah', 'Pillai', 'Menon']

# Project names
PROJECT_PREFIXES = ['Prestige', 'DLF', 'Godrej', 'Brigade', 'Sobha', 'Hiranandani', 'Lodha', 'Oberoi', 'Mahindra', 'Shapoorji']
PROJECT_SUFFIXES = ['Heights', 'Residency', 'Paradise', 'Gardens', 'Towers', 'Enclave', 'Avenue', 'Plaza', 'City', 'Park']

# Property types
PROPERTY_TYPES = {
    'residential': ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa', 'Penthouse'],
    'commercial': ['Office Space', 'Shop', 'Showroom', 'Warehouse'],
    'plotted': ['Residential Plot', 'Commercial Plot', 'Agricultural Plot']
}

# Areas in sq ft
AREA_RANGES = {
    '1 BHK': (450, 650),
    '2 BHK': (800, 1200),
    '3 BHK': (1200, 1800),
    '4 BHK': (1800, 2500),
    'Villa': (2500, 5000),
    'Penthouse': (3000, 6000),
    'Office Space': (500, 5000),
    'Shop': (200, 1000),
    'Showroom': (1000, 5000),
    'Warehouse': (5000, 20000),
    'Residential Plot': (1000, 5000),
    'Commercial Plot': (2000, 10000),
    'Agricultural Plot': (10000, 50000)
}

# Price per sq ft by city
PRICE_PER_SQFT = {
    'Mumbai': (15000, 30000),
    'Delhi': (12000, 25000),
    'Bangalore': (8000, 18000),
    'Hyderabad': (6000, 12000),
    'Pune': (7000, 14000),
    'Chennai': (6500, 13000),
    'Kolkata': (5000, 10000),
    'Ahmedabad': (5500, 11000),
    'Jaipur': (4000, 8000),
    'Lucknow': (3500, 7000)
}

# Lead sources
LEAD_SOURCES = ['Website', 'Facebook', 'Instagram', 'Reference', 'Walk-in', 'Broker', 'Agent', 'Direct Call', 'Email']

# Lead statuses
LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Negotiation', 'Site Visit Done', 'Booking', 'Converted']

# Follow-up types
FOLLOW_UP_TYPES = ['Phone Call', 'Email', 'Meeting', 'Site Visit', 'WhatsApp', 'SMS']

# Payment modes
PAYMENT_MODES = ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'RTGS/NEFT']

# Generate random Indian phone
def random_phone():
    return f"{random.choice([9, 8, 7])}{random.randint(100000000, 999999999)}"

# Generate random email
def random_email(name):
    domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    return f"{name.lower().replace(' ', '.')}@{random.choice(domains)}"

# Random date within last N days (positive for past, negative for future)
def random_date(days_back):
    if days_back < 0:
        # Future date
        days = random.randint(0, abs(days_back))
        return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    else:
        # Past date
        days = random.randint(0, days_back)
        return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

async def populate_data():
    """Populate database with large realistic data"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("POPULATING ExlainERP WITH REALISTIC INDIAN REAL ESTATE DATA")
    print("=" * 80)
    print()
    
    # Get tenant
    tenant = await db.tenants.find_one({}, {"_id": 0})
    if not tenant:
        print("❌ No tenant found. Please run create_first_tenant.py first.")
        return
    
    tenant_id = tenant['id']
    
    # Get categories
    categories = await db.categories.find({"deleted_at": None}, {"_id": 0}).to_list(length=None)
    
    # Create lookup dicts
    cat_lookup = {}
    for cat in categories:
        key = f"{cat['type']}_{cat['slug']}"
        cat_lookup[key] = cat['id']
    
    # Get staff users
    staff_role = await db.roles.find_one({'slug': 'staff'}, {"_id": 0})
    staff_users = await db.users.find({'role_id': staff_role['id']}, {"_id": 0}).to_list(length=None)
    staff_ids = [s['id'] for s in staff_users]
    
    if not staff_ids:
        print("⚠️  No staff users found. Some features will be limited.")
        staff_ids = [None]
    
    # Get INR currency
    inr = await db.currencies.find_one({'code': 'INR'}, {"_id": 0})
    currency_id = inr['id'] if inr else None
    
    print(f"📋 Tenant: {tenant['name']}")
    print(f"👥 Staff Members: {len(staff_ids)}")
    print()
    
    # Statistics
    stats = {
        'projects': 0,
        'properties': 0,
        'leads': 0,
        'follow_ups': 0,
        'bookings': 0,
        'payments': 0,
        'commissions': 0
    }
    
    # ============================================
    # CREATE PROJECTS (30 projects across cities)
    # ============================================
    print("🏗️  Creating Projects...")
    projects = []
    
    for i in range(30):
        city = random.choice(CITIES)
        project_type = random.choice(['residential', 'commercial', 'plotted'])
        
        project = {
            'id': str(uuid.uuid4()),
            'tenant_id': tenant_id,
            'name': f"{random.choice(PROJECT_PREFIXES)} {random.choice(PROJECT_SUFFIXES)} {city}",
            'description': f"Premium {project_type} project in {city}",
            'location': f"{random.choice(['Sector', 'Phase', 'Block'])} {random.randint(1, 50)}, {city}",
            'city': city,
            'state': random.choice(['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Telangana', 'Gujarat']),
            'pincode': f"{random.randint(400000, 700000)}",
            'project_type': project_type,
            'total_units': random.randint(50, 500),
            'available_units': 0,  # Will calculate
            'start_date': random_date(365),
            'expected_completion': random_date(-180),  # Future date
            'status': random.choice(['Planning', 'Under Construction', 'Ready to Move', 'Completed']),
            'amenities': ['Gym', 'Swimming Pool', 'Club House', 'Garden', 'Security', 'Power Backup'],
            'rera_number': f"MH{random.randint(10000, 99999)}",
            'currency_id': currency_id,
            'created_at': random_date(365),
            'updated_at': random_date(30),
            'deleted_at': None
        }
        
        await db.projects.insert_one(serialize_doc(project))
        projects.append(project)
        stats['projects'] += 1
    
    print(f"   ✅ Created {stats['projects']} projects")
    
    # ============================================
    # CREATE PROPERTIES (500 properties)
    # ============================================
    print("🏠 Creating Properties...")
    properties = []
    property_statuses = ['available', 'blocked', 'sold', 'reserved']
    
    for project in projects:
        # Create 15-20 properties per project
        num_properties = random.randint(15, 20)
        
        for i in range(num_properties):
            # Get property type based on project type
            if project['project_type'] == 'residential':
                prop_type = random.choice(PROPERTY_TYPES['residential'])
            elif project['project_type'] == 'commercial':
                prop_type = random.choice(PROPERTY_TYPES['commercial'])
            else:
                prop_type = random.choice(PROPERTY_TYPES['plotted'])
            
            # Calculate area and price
            area_min, area_max = AREA_RANGES[prop_type]
            area = random.randint(area_min, area_max)
            
            price_min, price_max = PRICE_PER_SQFT[project['city']]
            price_per_sqft = random.randint(price_min, price_max)
            base_price = area * price_per_sqft
            
            status = random.choice(property_statuses)
            
            # Get property type category
            prop_type_cat_slug = prop_type.lower().replace(' ', '_')
            prop_type_cat = await db.categories.find_one(
                {'type': 'property_type', 'name': prop_type}, 
                {"_id": 0}
            )
            
            if not prop_type_cat:
                # Create if doesn't exist
                prop_type_cat = {
                    'id': str(uuid.uuid4()),
                    'type': 'property_type',
                    'name': prop_type,
                    'slug': prop_type_cat_slug,
                    'description': f'{prop_type} property type',
                    'parent_id': None,
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'deleted_at': None
                }
                await db.categories.insert_one(serialize_doc(prop_type_cat))
            
            # Get property status category
            status_cat = await db.categories.find_one(
                {'type': 'property_status', 'slug': status}, 
                {"_id": 0}
            )
            
            # If no status found, use 'available' as default
            if not status_cat:
                status_cat = await db.categories.find_one(
                    {'type': 'property_status', 'slug': 'available'}, 
                    {"_id": 0}
                )
            
            if not status_cat:
                # Create available status if it doesn't exist
                status_cat = {
                    'id': str(uuid.uuid4()),
                    'type': 'property_status',
                    'name': 'Available',
                    'slug': 'available',
                    'description': 'Property available for sale',
                    'parent_id': None,
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'deleted_at': None
                }
                await db.categories.insert_one(serialize_doc(status_cat))
            
            property_doc = {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'project_id': project['id'],
                'property_number': f"{chr(65 + random.randint(0, 10))}-{random.randint(101, 999)}",
                'property_type_id': prop_type_cat['id'],
                'status_id': status_cat['id'],  # Now guaranteed to have a value
                'floor': random.randint(0, 25),
                'block': random.choice(['A', 'B', 'C', 'D']),
                'facing': random.choice(['North', 'South', 'East', 'West', 'North-East', 'South-West']),
                'area': area,
                'unit': 'sqft',
                'price': base_price,
                'price_per_sqft': price_per_sqft,
                'features': ['Modular Kitchen', 'Vitrified Tiles', 'Parking', 'Power Backup'],
                'images': [],
                'length': None,
                'width': None,
                'layout_x': None,
                'layout_y': None,
                'is_active': True,
                'currency_id': currency_id,
                'created_at': random_date(300),
                'updated_at': random_date(30),
                'deleted_at': None
            }
            
            await db.properties.insert_one(serialize_doc(property_doc))
            properties.append(property_doc)
            stats['properties'] += 1
    
    print(f"   ✅ Created {stats['properties']} properties")
    
    # ============================================
    # CREATE LEADS (800 leads)
    # ============================================
    print("👤 Creating Leads...")
    leads = []
    
    for i in range(800):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}"
        
        # Get random source
        source_name = random.choice(LEAD_SOURCES)
        source_cat = await db.categories.find_one(
            {'type': 'lead_source', 'name': source_name},
            {"_id": 0}
        )
        
        # Get random status
        status_name = random.choice(LEAD_STATUSES)
        status_cat = await db.categories.find_one(
            {'type': 'lead_status', 'name': status_name},
            {"_id": 0}
        )
        
        # Random project and property
        project = random.choice(projects)
        interested_properties = random.sample(
            [p for p in properties if p['project_id'] == project['id']], 
            k=min(3, len([p for p in properties if p['project_id'] == project['id']]))
        )
        
        lead = {
            'id': str(uuid.uuid4()),
            'tenant_id': tenant_id,
            'project_id': project['id'],
            'source_id': source_cat['id'] if source_cat else None,
            'status_id': status_cat['id'] if status_cat else None,
            'name': full_name,
            'email': random_email(full_name),
            'phone': random_phone(),
            'alternate_phone': random_phone() if random.random() > 0.7 else None,
            'budget_min': random.randint(2000000, 5000000),
            'budget_max': random.randint(5000000, 15000000),
            'preferred_location': project['city'],
            'requirements': f"Looking for {random.choice(['2 BHK', '3 BHK', 'Villa'])} in {project['city']}",
            'interested_properties': [p['id'] for p in interested_properties],
            'quality': random.choice(['Hot', 'Warm', 'Cold']),
            'assigned_to': random.choice(staff_ids),
            'notes': f"Lead from {source_name}",
            'created_at': random_date(180),
            'updated_at': random_date(30),
            'deleted_at': None
        }
        
        await db.leads.insert_one(serialize_doc(lead))
        leads.append(lead)
        stats['leads'] += 1
    
    print(f"   ✅ Created {stats['leads']} leads")
    
    # ============================================
    # CREATE FOLLOW-UPS (2000 follow-ups)
    # ============================================
    print("📞 Creating Follow-ups...")
    
    for lead in random.sample(leads, min(500, len(leads))):
        # Create 2-5 follow-ups per lead
        num_followups = random.randint(2, 5)
        
        for i in range(num_followups):
            followup_type_name = random.choice(FOLLOW_UP_TYPES)
            followup_type_cat = await db.categories.find_one(
                {'type': 'follow_up_type', 'name': followup_type_name},
                {"_id": 0}
            )
            
            followup = {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'lead_id': lead['id'],
                'type_id': followup_type_cat['id'] if followup_type_cat else None,
                'scheduled_date': random_date(60),
                'completed': random.random() > 0.3,
                'notes': f"Follow-up via {followup_type_name}. Customer interested.",
                'outcome': random.choice(['Interested', 'Not Interested', 'Callback Later', 'Visited Site']),
                'next_action': random.choice(['Schedule site visit', 'Send brochure', 'Call back', 'Send quotation']),
                'assigned_to': lead['assigned_to'],
                'created_at': random_date(90),
                'updated_at': random_date(30),
                'deleted_at': None
            }
            
            await db.follow_ups.insert_one(serialize_doc(followup))
            stats['follow_ups'] += 1
    
    print(f"   ✅ Created {stats['follow_ups']} follow-ups")
    
    # ============================================
    # CREATE BOOKINGS (300 bookings)
    # ============================================
    print("📝 Creating Bookings...")
    bookings = []
    
    # Get converted leads for bookings
    converted_status = await db.categories.find_one(
        {'type': 'lead_status', 'slug': 'converted'},
        {"_id": 0}
    )
    
    converted_leads = [l for l in leads if l['status_id'] == (converted_status['id'] if converted_status else None)]
    if not converted_leads:
        converted_leads = random.sample(leads, min(300, len(leads)))
    
    for lead in random.sample(converted_leads, min(300, len(converted_leads))):
        # Find available property
        available_status = await db.categories.find_one(
            {'type': 'property_status', 'slug': 'available'},
            {"_id": 0}
        )
        
        available_props = [p for p in properties 
                          if p['project_id'] == lead['project_id'] 
                          and p['status_id'] == (available_status['id'] if available_status else None)]
        
        if not available_props:
            continue
        
        property_doc = random.choice(available_props)
        
        # Payment plan
        payment_plan = random.choice(['Full Payment', 'EMI', 'Custom'])
        total_amount = property_doc['price']
        
        # Booking amount (10-20% of total)
        booking_amount = round(total_amount * random.uniform(0.10, 0.20), 2)
        
        booking = {
            'id': str(uuid.uuid4()),
            'tenant_id': tenant_id,
            'project_id': property_doc['project_id'],
            'property_id': property_doc['id'],
            'customer_id': lead['id'],
            'customer_name': lead['name'],
            'customer_email': lead['email'],
            'customer_phone': lead['phone'],
            'booking_date': random_date(120),
            'total_amount': total_amount,
            'booking_amount': booking_amount,
            'paid_amount': booking_amount,
            'balance_amount': total_amount - booking_amount,
            'payment_plan': payment_plan,
            'emi_months': random.choice([12, 18, 24, 36]) if payment_plan == 'EMI' else 0,
            'agreement_number': f"AGR-{random.randint(100000, 999999)}",
            'status': random.choice(['Confirmed', 'Pending Documentation']),
            'notes': f"Booking for {property_doc['property_number']}",
            'currency_id': currency_id,
            'is_active': True,
            'created_at': random_date(120),
            'updated_at': random_date(30),
            'deleted_at': None
        }
        
        await db.bookings.insert_one(serialize_doc(booking))
        bookings.append(booking)
        stats['bookings'] += 1
        
        # Update property status to sold/blocked
        sold_status = await db.categories.find_one(
            {'type': 'property_status', 'slug': 'sold'},
            {"_id": 0}
        )
        await db.properties.update_one(
            {'id': property_doc['id']},
            {'$set': {'status_id': sold_status['id'] if sold_status else None}}
        )
    
    print(f"   ✅ Created {stats['bookings']} bookings")
    
    # ============================================
    # CREATE PAYMENTS (600 payments)
    # ============================================
    print("💰 Creating Payments...")
    
    for booking in bookings:
        # Create 2-5 payments per booking
        num_payments = random.randint(2, 5)
        total_paid = 0
        
        for i in range(num_payments):
            payment_mode_name = random.choice(PAYMENT_MODES)
            payment_mode_cat = await db.categories.find_one(
                {'type': 'payment_mode', 'name': payment_mode_name},
                {"_id": 0}
            )
            
            # Payment amount
            if i == 0:
                amount = booking['booking_amount']
            else:
                remaining = booking['total_amount'] - total_paid
                amount = round(min(remaining, random.uniform(100000, 500000)), 2)
            
            total_paid += amount
            
            payment = {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'booking_id': booking['id'],
                'project_id': booking['project_id'],
                'customer_id': booking['customer_id'],
                'amount': amount,
                'mode_id': payment_mode_cat['id'] if payment_mode_cat else None,
                'payment_date': random_date(90),
                'transaction_id': f"TXN-{random.randint(100000000, 999999999)}",
                'reference_number': f"REF-{random.randint(100000, 999999)}" if payment_mode_name in ['Cheque', 'Bank Transfer'] else None,
                'status': random.choice(['Success', 'Pending', 'Failed']),
                'notes': f"Payment {i+1} for {booking['agreement_number']}",
                'receipt_number': f"REC-{random.randint(100000, 999999)}",
                'currency_id': currency_id,
                'created_at': random_date(90),
                'updated_at': random_date(20),
                'deleted_at': None
            }
            
            await db.payments.insert_one(serialize_doc(payment))
            stats['payments'] += 1
            
            if total_paid >= booking['total_amount']:
                break
    
    print(f"   ✅ Created {stats['payments']} payments")
    
    # ============================================
    # CREATE COMMISSIONS (300 commissions)
    # ============================================
    print("🏆 Creating Commissions...")
    
    for booking in bookings:
        if not booking.get('customer_id'):
            continue
        
        # Find the staff who handled this lead
        lead = next((l for l in leads if l['id'] == booking['customer_id']), None)
        if not lead or not lead.get('assigned_to'):
            continue
        
        # Commission calculation (2-5% of booking amount)
        commission_rate = random.uniform(2, 5)
        commission_amount = round(booking['total_amount'] * (commission_rate / 100), 2)
        
        commission = {
            'id': str(uuid.uuid4()),
            'tenant_id': tenant_id,
            'booking_id': booking['id'],
            'staff_id': lead['assigned_to'],
            'project_id': booking['project_id'],
            'amount': commission_amount,
            'percentage': commission_rate,
            'status': random.choice(['Pending', 'Approved', 'Paid']),
            'approved_by': None,
            'approved_at': None,
            'paid_at': random_date(30) if random.random() > 0.5 else None,
            'payment_mode': random.choice(PAYMENT_MODES) if random.random() > 0.5 else None,
            'notes': f"Commission for {booking['agreement_number']}",
            'currency_id': currency_id,
            'created_at': random_date(90),
            'updated_at': random_date(20),
            'deleted_at': None
        }
        
        await db.commissions.insert_one(serialize_doc(commission))
        stats['commissions'] += 1
    
    print(f"   ✅ Created {stats['commissions']} commissions")
    
    # ============================================
    # SUMMARY
    # ============================================
    print()
    print("=" * 80)
    print("DATA POPULATION COMPLETE!")
    print("=" * 80)
    print()
    print("📊 Summary:")
    print(f"   Projects:     {stats['projects']}")
    print(f"   Properties:   {stats['properties']}")
    print(f"   Leads:        {stats['leads']}")
    print(f"   Follow-ups:   {stats['follow_ups']}")
    print(f"   Bookings:     {stats['bookings']}")
    print(f"   Payments:     {stats['payments']}")
    print(f"   Commissions:  {stats['commissions']}")
    print()
    print("✅ Database is now ready for comprehensive testing!")
    print()
    print("🧪 Test the following features:")
    print("   - Projects across 10 Indian cities")
    print("   - Properties with various types and statuses")
    print("   - Lead pipeline with different sources")
    print("   - Follow-up tracking and management")
    print("   - Booking and payment workflows")
    print("   - Commission calculations")
    print("   - Reports with filters (date, city, status)")
    print("   - Charts and analytics")
    print("   - Export to Excel")
    print()
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_data())
