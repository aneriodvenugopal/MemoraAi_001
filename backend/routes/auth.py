from fastapi import APIRouter, HTTPException, Request, Depends
from models.user import User, UserCreate, UserLogin, OTPVerify
from services.auth_service import AuthService
from datetime import datetime, timedelta, timezone
from utils.helpers import serialize_doc, deserialize_doc
from typing import Optional
import uuid

router = APIRouter(prefix="/auth", tags=["authentication"])

def get_db(request: Request):
    return request.app.state.db

@router.post("/send-otp")
async def send_otp(login: UserLogin, request: Request):
    """Send OTP to user's phone - checks both users AND customers"""
    db = get_db(request)
    phone = login.phone.strip()
    
    # Normalize phone
    phone_digits = ''.join(filter(str.isdigit, phone))
    
    # Check if user exists in users collection
    user = await db.users.find_one({
        '$or': [
            {'phone': phone},
            {'phone': phone_digits},
            {'phone': phone_digits[-10:]}
        ]
    }, {"_id": 0})
    
    # Check if customer exists (property buyer without user account)
    customer = None
    if not user:
        customer = await db.customers.find_one({
            '$or': [
                {'phone': phone},
                {'phone': phone_digits},
                {'phone': phone_digits[-10:]},
                {'phone': f'+91{phone_digits[-10:]}'}
            ],
            'status': {'$ne': 'blacklisted'},
            'deleted_at': None
        }, {"_id": 0})
    
    if not user and not customer:
        raise HTTPException(status_code=404, detail="No account found with this phone number. Please contact support.")
    
    # Generate OTP
    otp = AuthService.generate_otp()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    if user:
        # Update user with OTP
        await db.users.update_one(
            {'phone': phone},
            {'$set': {
                'otp': otp,
                'otp_expires_at': otp_expires_at.isoformat()
            }}
        )
        account_type = "user"
    else:
        # Store OTP for customer portal
        await db.customer_portal_otps.update_one(
            {"phone": phone_digits[-10:]},
            {
                "$set": {
                    "phone": phone_digits[-10:],
                    "otp": otp,
                    "attempts": 0,
                    "expires_at": otp_expires_at.isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        account_type = "customer"
    
    # Send OTP via SMS
    await AuthService.send_otp_sms(phone, otp)
    
    return {
        "message": "OTP sent successfully",
        "phone": phone,
        "account_type": account_type,  # "user" or "customer"
        "otp": otp  # TODO: Remove in production
    }

@router.post("/verify-otp")
async def verify_otp(verify: OTPVerify, request: Request):
    """Verify OTP and login - works for both users AND customers"""
    db = get_db(request)
    phone = verify.phone.strip()
    phone_digits = ''.join(filter(str.isdigit, phone))
    
    # Try to find user first
    user_doc = await db.users.find_one({
        '$or': [
            {'phone': phone},
            {'phone': phone_digits},
            {'phone': phone_digits[-10:]}
        ]
    }, {"_id": 0})
    
    if user_doc:
        # User login flow
        user_doc = deserialize_doc(user_doc)
        user = User(**user_doc)
        
        # Verify OTP
        if user.otp != verify.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        # Check OTP expiry
        if not AuthService.validate_otp_expiry(user.otp_expires_at):
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Get user's role
        role_doc = await db.roles.find_one({'id': user.role_id}, {"_id": 0})
        role_slug = role_doc['slug'] if role_doc else 'user'
        
        # Generate JWT token
        token = AuthService.create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            role=role_slug
        )
        
        # Update last login
        await db.users.update_one(
            {'id': user.id},
            {'$set': {
                'last_login': datetime.now(timezone.utc).isoformat(),
                'otp': None,
                'otp_expires_at': None
            }}
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "account_type": "user",
            "user": {
                "id": user.id,
                "name": user.name,
                "phone": user.phone,
                "email": user.email,
                "role": role_slug,
                "tenant_id": user.tenant_id
            }
        }
    
    # Try customer login flow
    customer = await db.customers.find_one({
        '$or': [
            {'phone': phone},
            {'phone': phone_digits},
            {'phone': phone_digits[-10:]},
            {'phone': f'+91{phone_digits[-10:]}'}
        ],
        'status': {'$ne': 'blacklisted'},
        'deleted_at': None
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="No account found with this phone number")
    
    # Verify customer OTP
    otp_record = await db.customer_portal_otps.find_one({
        "phone": phone_digits[-10:],
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    if otp_record.get("otp") != verify.otp:
        await db.customer_portal_otps.update_one(
            {"phone": phone_digits[-10:]},
            {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Create customer session
    session_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    session = {
        "session_id": session_id,
        "customer_id": customer["id"],
        "phone": phone_digits[-10:],
        "tenant_id": customer["tenant_id"],
        "customer_name": customer.get("name", "Customer"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at
    }
    
    await db.customer_portal_sessions.insert_one(session)
    
    # Clear OTP
    await db.customer_portal_otps.delete_one({"phone": phone_digits[-10:]})
    
    return {
        "access_token": session_id,  # Use session_id as token for customers
        "token_type": "customer_session",
        "account_type": "customer",
        "user": {
            "id": customer["id"],
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "email": customer.get("email"),
            "role": "customer",
            "tenant_id": customer["tenant_id"]
        },
        "session_id": session_id,
        "expires_at": expires_at
    }


@router.post("/login")
async def login_with_password(data: dict, request: Request):
    """Login with phone/email and password"""
    db = get_db(request)
    
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    remember_me = data.get('remember_me', False)
    
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
    
    if not phone and not email:
        raise HTTPException(status_code=400, detail="Phone or email is required")
    
    # Find user by phone or email
    query = {}
    if phone:
        query = {'phone': phone}
    elif email:
        query = {'email': email}
    
    user_doc = await db.users.find_one(query, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has password (prioritize password_hash over legacy password field)
    stored_password = user_doc.get('password_hash') or user_doc.get('password')
    if not stored_password:
        raise HTTPException(status_code=400, detail="No password set. Please use OTP login or reset password")
    
    # Verify password using bcrypt directly (passlib has version issues)
    import bcrypt
    
    try:
        is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        is_valid = False
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Get user's role
    role_doc = await db.roles.find_one({'id': user_doc['role_id']}, {"_id": 0})
    role_slug = role_doc['slug'] if role_doc else 'user'
    
    # Generate JWT token with remember_me support
    token = AuthService.create_access_token(
        user_id=user_doc['id'],
        tenant_id=user_doc['tenant_id'],
        role=role_slug,
        remember_me=remember_me
    )
    
    # Update last login
    await db.users.update_one(
        query,
        {'$set': {'last_login': datetime.now(timezone.utc).isoformat()}}
    )
    
    # Calculate token expiry for frontend
    from datetime import timedelta
    if remember_me:
        expires_in = 30 * 24 * 60 * 60  # 30 days in seconds
    else:
        expires_in = 24 * 60 * 60  # 24 hours in seconds
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "remember_me": remember_me,
        "user": {
            "id": user_doc['id'],
            "name": user_doc['name'],
            "phone": user_doc.get('phone'),
            "email": user_doc.get('email'),
            "role": role_slug,
            "tenant_id": user_doc['tenant_id']
        }
    }


@router.post("/register")
async def register(user_create: UserCreate, request: Request):
    """Register a new user"""
    db = get_db(request)
    
    # Check if user already exists
    existing_user = await db.users.find_one({'phone': user_create.phone}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this phone already exists")
    
    # Check if role exists
    role = await db.roles.find_one({'id': user_create.role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user
    user = User(**user_create.model_dump())
    user_doc = serialize_doc(user.model_dump())
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "email": user.email
        }
    }

@router.get("/me")
async def get_current_user_info(request: Request):
    """Get current user information"""
    from middleware.auth import get_current_user
    
    user_payload = await get_current_user(request)
    db = get_db(request)
    
    # Get user details
    user_doc = await db.users.find_one({'id': user_payload['user_id']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = deserialize_doc(user_doc)
    user = User(**user_doc)
    
    # Get role details
    role_doc = await db.roles.find_one({'id': user.role_id}, {"_id": 0})
    
    return {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "role": role_doc,
        "tenant_id": user.tenant_id,
        "is_active": user.is_active,
        "last_login": user.last_login
    }

@router.get("/roles")
async def get_all_roles(request: Request):
    """Get all available roles"""
    db = get_db(request)
    
    roles = await db.roles.find({"deleted_at": None}, {"_id": 0}).to_list(length=None)
    
    return roles


# ============ FORGOT PASSWORD ============

@router.post("/forgot-password")
async def forgot_password(login: UserLogin, request: Request):
    """Send OTP for password reset"""
    db = get_db(request)
    
    # Check if user exists
    user = await db.users.find_one({'phone': login.phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this phone number")
    
    # Generate OTP and reset token
    otp = AuthService.generate_otp()
    import uuid
    reset_token = str(uuid.uuid4())
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Update user with OTP and reset token
    await db.users.update_one(
        {'phone': login.phone},
        {'$set': {
            'reset_otp': otp,
            'reset_token': reset_token,
            'reset_otp_expires_at': otp_expires_at.isoformat()
        }}
    )
    
    # Send OTP via SMS
    await AuthService.send_otp_sms(login.phone, otp)
    
    # Also send via email if user has email
    if user.get('email'):
        await AuthService.send_password_reset_email(
            email=user['email'],
            name=user.get('name', 'User'),
            otp=otp
        )
    
    return {
        "message": "Password reset OTP sent successfully",
        "phone": login.phone,
        "email_sent": bool(user.get('email')),
        "reset_token": reset_token,
        "otp": otp  # TODO: Remove in production
    }

@router.post("/verify-reset-otp")
async def verify_reset_otp(data: dict, request: Request):
    """Verify OTP for password reset"""
    db = get_db(request)
    
    phone = data.get('phone')
    otp = data.get('otp')
    reset_token = data.get('reset_token')
    
    if not phone or not otp or not reset_token:
        raise HTTPException(status_code=400, detail="Phone, OTP and reset token are required")
    
    # Find user
    user = await db.users.find_one({'phone': phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check OTP and token
    if user.get('reset_otp') != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if user.get('reset_token') != reset_token:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    # Check if OTP expired
    otp_expires_at = user.get('reset_otp_expires_at')
    if otp_expires_at:
        expires = datetime.fromisoformat(otp_expires_at)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="OTP expired")
    
    return {
        "message": "OTP verified successfully",
        "phone": phone
    }

@router.post("/reset-password")
async def reset_password(data: dict, request: Request):
    """Reset password after OTP verification"""
    db = get_db(request)
    
    phone = data.get('phone')
    otp = data.get('otp')
    reset_token = data.get('reset_token')
    new_password = data.get('new_password')
    
    if not phone or not otp or not reset_token or not new_password:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    # Find user
    user = await db.users.find_one({'phone': phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify OTP and token again
    if user.get('reset_otp') != otp or user.get('reset_token') != reset_token:
        raise HTTPException(status_code=400, detail="Invalid OTP or reset token")
    
    # Check if OTP expired
    otp_expires_at = user.get('reset_otp_expires_at')
    if otp_expires_at:
        expires = datetime.fromisoformat(otp_expires_at)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one")
    
    # Hash new password
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(new_password)
    
    # Update password and clear reset fields
    await db.users.update_one(
        {'phone': phone},
        {'$set': {
            'password': hashed_password,
            'updated_at': datetime.now(timezone.utc).isoformat()
        },
        '$unset': {
            'reset_otp': '',
            'reset_token': '',
            'reset_otp_expires_at': ''
        }}
    )
    
    return {
        "message": "Password reset successfully. Please login with your new password.",
        "phone": phone
    }



# ============ GOOGLE OAUTH ============

@router.post("/google/session")
async def process_google_session(data: dict, request: Request):
    """
    Process Google OAuth session_id from Emergent Auth
    Exchange session_id for user data and create/update user
    """
    import httpx
    import uuid
    
    db = get_db(request)
    session_id = data.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Exchange session_id for user data from Emergent Auth
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            google_user = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying session: {str(e)}")
    
    email = google_user.get('email')
    name = google_user.get('name')
    picture = google_user.get('picture')
    google_session_token = google_user.get('session_token')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    # Check if user exists by email
    existing_user = await db.users.find_one({'email': email}, {"_id": 0})
    
    if existing_user:
        # User exists - update and login
        await db.users.update_one(
            {'email': email},
            {'$set': {
                'name': name or existing_user.get('name'),
                'google_picture': picture,
                'google_session_token': google_session_token,
                'last_login': datetime.now(timezone.utc).isoformat(),
                'auth_provider': 'google'
            }}
        )
        user_doc = existing_user
    else:
        # New user - create account
        # Get default tenant for new Google users (or create one)
        default_tenant = await db.tenants.find_one({}, {"_id": 0})
        tenant_id = default_tenant['id'] if default_tenant else None
        
        # Get staff role as default
        staff_role = await db.roles.find_one({'slug': 'staff'}, {"_id": 0})
        role_id = staff_role['id'] if staff_role else None
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        user_doc = {
            'id': user_id,
            'email': email,
            'name': name or email.split('@')[0],
            'phone': None,
            'google_picture': picture,
            'google_session_token': google_session_token,
            'tenant_id': tenant_id,
            'role_id': role_id,
            'is_active': True,
            'auth_provider': 'google',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_login': datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(user_doc)
    
    # Get role for JWT
    role_doc = await db.roles.find_one({'id': user_doc.get('role_id')}, {"_id": 0})
    role_slug = role_doc['slug'] if role_doc else 'staff'
    
    # Generate JWT token
    token = AuthService.create_access_token(
        user_id=user_doc['id'],
        tenant_id=user_doc.get('tenant_id'),
        role=role_slug
    )
    
    # Store session in database for "Remember Me" functionality
    session_expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {'user_id': user_doc['id']},
        {'$set': {
            'user_id': user_doc['id'],
            'session_token': google_session_token,
            'jwt_token': token,
            'expires_at': session_expires.isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_doc['id'],
            "name": user_doc.get('name'),
            "email": user_doc.get('email'),
            "phone": user_doc.get('phone'),
            "picture": picture,
            "role": role_slug,
            "tenant_id": user_doc.get('tenant_id'),
            "is_new_user": not existing_user
        }
    }


@router.post("/logout")
async def logout(request: Request):
    """Logout user and clear session"""
    from middleware.auth import get_current_user
    
    try:
        user = await get_current_user(request)
        db = get_db(request)
        
        # Delete user session
        await db.user_sessions.delete_one({'user_id': user['user_id']})
        
        return {"message": "Logged out successfully"}
    except:
        return {"message": "Logged out"}

