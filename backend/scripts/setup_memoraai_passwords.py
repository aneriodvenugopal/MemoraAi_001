"""Set up passwords for MemoraAI test users"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def setup():
    tenant = await db.tenants.find_one({}, {'_id': 0})
    tenant_id = tenant['id'] if tenant else None
    print(f'Tenant ID: {tenant_id}')
    
    password_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
    
    for email in ['admin@realapex.in', 'superadmin@realapex.in', 'staff@realapex.in', 'customer@realapex.in']:
        update = {'password_hash': password_hash}
        if email != 'superadmin@realapex.in' and tenant_id:
            update['tenant_id'] = tenant_id
        r = await db.users.update_one({'email': email}, {'$set': update})
        print(f'Updated {email}: {r.modified_count}')
    
    client.close()

asyncio.run(setup())
