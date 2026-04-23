"""
Create Satthenapalli layout with actual SVG and plots data
"""
import asyncio
import os
import sys
import json
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'test_database')

async def create_satthenapalli_layout():
    """Create Satthenapalli layout with real data"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🚀 Creating Satthenapalli Layout...")
    
    # Get default tenant
    tenant = await db.tenants.find_one({'deleted_at': None})
    if not tenant:
        print("❌ No tenant found.")
        return
    
    tenant_id = tenant['id']
    print(f"✅ Using tenant: {tenant['name']} ({tenant_id})")
    
    # Get or create Satthenapalli project
    project = await db.projects.find_one({
        'name': 'SATTENAPALLI Layout Plan',
        'tenant_id': tenant_id,
        'deleted_at': None
    })
    
    if not project:
        project_id = str(uuid.uuid4())
        project_doc = {
            'id': project_id,
            'tenant_id': tenant_id,
            'name': 'SATTENAPALLI Layout Plan',
            'location': 'Sattenapalli, Andhra Pradesh',
            'description': 'Premium residential plots with modern amenities',
            'total_units': 50,
            'status': 'Active',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'deleted_at': None
        }
        await db.projects.insert_one(project_doc)
        print(f"✅ Created project: SATTENAPALLI Layout Plan ({project_id})")
    else:
        project_id = project['id']
        print(f"✅ Using existing project: {project['name']} ({project_id})")
    
    # Load plots data
    with open('/tmp/plots.json', 'r') as f:
        plots_data = json.load(f)
    
    # Load SVG content
    with open('/tmp/sathhenapally.svg', 'r') as f:
        svg_content = f.read()
    
    # Extract plots from the JSON structure
    plots_list = plots_data['layouts'][0]['plots']
    
    # Convert plots to our format
    formatted_plots = []
    for plot in plots_list:
        formatted_plot = {
            'id': str(plot['id']),
            'display_name': plot['displayName'],
            'block': plot.get('block', 'A'),
            'coordinates': [
                {'x': coord['x'], 'y': coord['y']}
                for coord in plot['coordinates']
            ],
            'price': plot['price'],
            'area': plot['area'],
            'status': plot['status'],
            'amenities': plot.get('amenities', []),
            'property_id': None,
            'customer_name': None,
            'booking_date': None
        }
        formatted_plots.append(formatted_plot)
    
    print(f"✅ Loaded {len(formatted_plots)} plots from JSON")
    
    # Delete existing layout if any
    await db.project_layouts.delete_many({
        'project_id': project_id,
        'tenant_id': tenant_id
    })
    
    # Create layout document
    layout_id = str(uuid.uuid4())
    layout_doc = {
        'id': layout_id,
        'project_id': project_id,
        'tenant_id': tenant_id,
        'layout_name': 'Satthenapalli Main Layout',
        'svg_content': None,  # Don't store large SVG in DB
        'svg_url': '/sathhenapally.svg',  # Correct filename with double 'l'
        'plots': formatted_plots,
        'metadata': {
            'version': '1.0',
            'total_plots': len(formatted_plots),
            'source': 'satthenapalli.svg',
            'created_from': 'imported_data'
        },
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'deleted_at': None
    }
    
    await db.project_layouts.insert_one(layout_doc)
    
    # Count statuses
    status_counts = {}
    for plot in formatted_plots:
        status = plot['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"\n✅ Satthenapalli Layout Created Successfully!")
    print(f"\n📊 Layout Statistics:")
    print(f"   Total Plots: {len(formatted_plots)}")
    print(f"   Status Breakdown:")
    for status, count in status_counts.items():
        print(f"      - {status.capitalize()}: {count}")
    
    print(f"\n🔗 ACCESS LINKS:")
    print(f"\nPublic Share Link (No Login Required):")
    print(f"https://retomerp-memora.preview.emergentagent.com/public/layout/{project_id}")
    print(f"\nAuthenticated View:")
    print(f"https://retomerp-memora.preview.emergentagent.com/projects/{project_id}/layout")
    print(f"\n✨ The layout includes the full Satthenapalli SVG background with all plot overlays!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_satthenapalli_layout())
