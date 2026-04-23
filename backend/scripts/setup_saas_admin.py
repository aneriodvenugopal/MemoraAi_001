"""Setup MemoraAI SaaS Admin and fix user roles"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def setup():
    # 1. Get role IDs
    roles = await db.roles.find({}, {'_id': 0}).to_list(20)
    role_map = {}
    for r in roles:
        role_map[r['name'].lower().replace(' ', '_')] = r['id']
    print(f"Roles: {role_map}")

    super_admin_role = role_map.get('super_admin')
    tenant_admin_role = role_map.get('tenant_admin')
    staff_role = role_map.get('staff')
    customer_role = role_map.get('customer')

    # 2. Fix existing users - add role field and role_id
    password_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')

    # Fix all existing users with proper role field
    existing = await db.users.find({}, {'_id': 0}).to_list(50)
    for u in existing:
        update = {}
        if not u.get('role_id'):
            # Determine role from name/email
            if 'super' in (u.get('name', '') + u.get('email', '')).lower():
                update['role_id'] = super_admin_role
                update['role'] = 'super_admin'
            elif 'staff' in (u.get('name', '') + u.get('email', '')).lower():
                update['role_id'] = staff_role
                update['role'] = 'staff'
            elif 'customer' in (u.get('name', '') + u.get('email', '')).lower():
                update['role_id'] = customer_role
                update['role'] = 'customer'
            else:
                update['role_id'] = tenant_admin_role
                update['role'] = 'tenant_admin'
        if not u.get('role'):
            if u.get('role_id') == super_admin_role:
                update['role'] = 'super_admin'
            elif u.get('role_id') == tenant_admin_role:
                update['role'] = 'tenant_admin'
            elif u.get('role_id') == staff_role:
                update['role'] = 'staff'
            else:
                update['role'] = 'customer'
        if not u.get('password_hash'):
            update['password_hash'] = password_hash
        if update:
            await db.users.update_one({'id': u['id']}, {'$set': update})
            print(f"  Fixed: {u.get('name', u.get('phone'))} -> {update.get('role', 'unchanged')}")

    # 3. Create SaaS Admin with phone 9948303060
    saas_admin = await db.users.find_one({'phone': '9948303060'}, {'_id': 0})
    if not saas_admin:
        saas_doc = {
            'id': str(uuid.uuid4()),
            'name': 'MemoraAI Admin',
            'phone': '9948303060',
            'email': 'admin@memoraai.in',
            'password_hash': password_hash,
            'role_id': super_admin_role,
            'role': 'super_admin',
            'tenant_id': None,
            'is_active': True,
            'created_at': '2026-04-23T00:00:00Z',
        }
        await db.users.insert_one(saas_doc)
        print(f"  Created SaaS Admin: 9948303060 / admin123 (super_admin)")
    else:
        await db.users.update_one({'phone': '9948303060'}, {'$set': {
            'role_id': super_admin_role,
            'role': 'super_admin',
            'password_hash': password_hash,
            'is_active': True,
        }})
        print(f"  Updated SaaS Admin: 9948303060")

    # 4. Verify all users
    print("\n=== ALL USERS ===")
    all_users = await db.users.find({}, {'_id': 0, 'name': 1, 'phone': 1, 'role': 1, 'role_id': 1, 'email': 1}).to_list(50)
    for u in all_users:
        print(f"  {u.get('name','?')} | {u.get('phone','?')} | role={u.get('role','?')} | role_id={u.get('role_id','?')[:8]}...")

    client.close()

asyncio.run(setup())
