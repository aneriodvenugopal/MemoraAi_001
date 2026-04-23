from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import hashlib
import uuid
import random
import string

from models.incomelands_user import (
    IncomeLandsUser,
    IncomeLandsUserRegister,
    IncomeLandsUserLogin,
    IncomeLandsSendOTP,
    IncomeLandsVerifyOTP,
    IncomeLandsSetPassword
)
from services.auth_service import AuthService
from middleware.auth import get_current_user

router = APIRouter(prefix="/incomelands/auth", tags=["IncomeLands Authentication"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_referral_code() -> str:
    """Generate unique referral code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: IncomeLandsUserRegister):
    """Register a new IncomeLands user"""
    
    # Check if user already exists
    existing_user = await db.incomelands_users.find_one({"mobile": user_data.mobile})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this mobile number already exists")
    
    # Generate user ID and referral code
    user_id = str(uuid.uuid4())
    referral_code = generate_referral_code()
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Handle referral
    referred_by_user_id = None
    if user_data.referral_code:
        referrer = await db.incomelands_users.find_one({"referral_code": user_data.referral_code})
        if referrer:
            referred_by_user_id = referrer["id"]
            # Give 10 credits to referrer
            await db.incomelands_users.update_one(
                {"id": referrer["id"]},
                {"$inc": {"free_credits": 10}}
            )
    
    # Create user document
    user_doc = {
        "id": user_id,
        "mobile": user_data.mobile,
        "name": user_data.name or f"User {user_data.mobile[-4:]}",
        "password_hash": password_hash,
        "free_credits": 20,
        "paid_credits": 0,
        "referral_code": referral_code,
        "referred_by": referred_by_user_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "otp": None,
        "otp_expires_at": None
    }
    
    # Insert into database
    await db.incomelands_users.insert_one(user_doc)
    
    # Generate JWT token
    token = AuthService.create_access_token(
        user_id=user_id,
        tenant_id="incomelands",
        role="agent"
    )
    
    # Remove sensitive data
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "user": user_doc
    }

@router.post("/login")
async def login(login_data: IncomeLandsUserLogin):
    """Login with mobile number and password"""
    
    # Find user
    user = await db.incomelands_users.find_one({"mobile": login_data.mobile})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
    
    # Verify password
    password_hash = hash_password(login_data.password)
    if user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login
    await db.incomelands_users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate JWT token
    token = AuthService.create_access_token(
        user_id=user["id"],
        tenant_id="incomelands",
        role="agent"
    )
    
    # Remove sensitive data
    user.pop("password_hash", None)
    user.pop("otp", None)
    user.pop("otp_expires_at", None)
    user.pop("_id", None)
    
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": user
    }

@router.post("/send-otp")
async def send_otp(otp_data: IncomeLandsSendOTP):
    """Send OTP to user's mobile number"""
    
    # Find user
    user = await db.incomelands_users.find_one({"mobile": otp_data.mobile})
    
    # Generate OTP
    otp = AuthService.generate_otp()
    otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    if user:
        # Existing user - update with OTP
        await db.incomelands_users.update_one(
            {"mobile": otp_data.mobile},
            {"$set": {
                "otp": otp,
                "otp_expires_at": otp_expires_at.isoformat()
            }}
        )
        is_new_user = False
    else:
        # New user - create temporary record with OTP
        temp_user_id = str(uuid.uuid4())
        await db.incomelands_users.insert_one({
            "id": temp_user_id,
            "mobile": otp_data.mobile,
            "otp": otp,
            "otp_expires_at": otp_expires_at.isoformat(),
            "is_active": False,  # Will be activated after OTP verification
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        is_new_user = True
    
    # Send OTP via SMS (TODO: Integrate with MSG91 or similar service)
    try:
        await AuthService.send_otp_sms(otp_data.mobile, otp)
    except Exception as e:
        print(f"Failed to send OTP SMS: {e}")
        # Continue even if SMS fails for development
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "is_new_user": is_new_user,
        "otp": otp  # TODO: Remove in production
    }

@router.post("/verify-otp")
async def verify_otp(verify_data: IncomeLandsVerifyOTP):
    """Verify OTP and login/register user"""
    
    # Find user
    user = await db.incomelands_users.find_one({"mobile": verify_data.mobile})
    
    if not user:
        raise HTTPException(status_code=404, detail="No OTP sent to this number. Please request OTP first.")
    
    # Verify OTP
    if user.get("otp") != verify_data.otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check OTP expiry
    otp_expires_at = user.get("otp_expires_at")
    if otp_expires_at:
        if isinstance(otp_expires_at, str):
            otp_expires_at = datetime.fromisoformat(otp_expires_at)
        if datetime.now(timezone.utc) > otp_expires_at:
            raise HTTPException(status_code=401, detail="OTP has expired")
    
    # Check if user is new (no password set)
    is_new_user = not user.get("password_hash")
    
    if is_new_user:
        # New user - need to set password
        # Update with name if provided
        update_data = {
            "otp": None,
            "otp_expires_at": None
        }
        if verify_data.name:
            update_data["name"] = verify_data.name
        
        await db.incomelands_users.update_one(
            {"id": user["id"]},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "OTP verified successfully. Please set your password.",
            "is_new_user": True,
            "requires_password": True
        }
    else:
        # Existing user - complete login
        await db.incomelands_users.update_one(
            {"id": user["id"]},
            {"$set": {
                "last_login": datetime.now(timezone.utc).isoformat(),
                "otp": None,
                "otp_expires_at": None,
                "is_active": True
            }}
        )
        
        # Generate JWT token
        token = AuthService.create_access_token(
            user_id=user["id"],
            tenant_id="incomelands",
            role="agent"
        )
        
        # Remove sensitive data
        user.pop("password_hash", None)
        user.pop("otp", None)
        user.pop("otp_expires_at", None)
        user.pop("_id", None)
        
        return {
            "success": True,
            "message": "Login successful",
            "is_new_user": False,
            "token": token,
            "user": user
        }

@router.post("/set-password")
async def set_password(password_data: IncomeLandsSetPassword):
    """Set password for new user after OTP verification"""
    
    # Find user
    user = await db.incomelands_users.find_one({"mobile": password_data.mobile})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if password is already set
    if user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password already set. Please use login.")
    
    # Generate user details
    referral_code = generate_referral_code()
    password_hash = hash_password(password_data.password)
    
    # Update user with password and activate account
    await db.incomelands_users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": password_hash,
            "is_active": True,
            "free_credits": 20,
            "paid_credits": 0,
            "referral_code": referral_code,
            "last_login": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "name": user.get("name") or f"User {password_data.mobile[-4:]}"
        }}
    )
    
    # Generate JWT token
    token = AuthService.create_access_token(
        user_id=user["id"],
        tenant_id="incomelands",
        role="agent"
    )
    
    # Get updated user
    user = await db.incomelands_users.find_one({"id": user["id"]})
    user.pop("password_hash", None)
    user.pop("_id", None)
    
    return {
        "success": True,
        "message": "Password set successfully. You are now logged in!",
        "token": token,
        "user": user
    }

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    
    user = await db.incomelands_users.find_one({"id": current_user["user_id"]})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove sensitive data
    user.pop("password_hash", None)
    user.pop("otp", None)
    user.pop("otp_expires_at", None)
    user.pop("_id", None)
    
    return {
        "success": True,
        "user": user
    }
