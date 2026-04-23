from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import uuid

from services.google_calendar_service import GoogleCalendarService
from services.auth_service import AuthService

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])

# Database connection
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Frontend URL for redirects - no hardcoded fallback for production safety
FRONTEND_URL = os.getenv("FRONTEND_URL")

@router.get("/login")
async def google_login():
    """Initiate Google OAuth flow"""
    try:
        auth_url, state = GoogleCalendarService.get_authorization_url()
        return {
            "authorization_url": auth_url,
            "state": state
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")

@router.get("/callback")
async def google_callback(code: str, state: str = None, request: Request = None):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for tokens
        result = await GoogleCalendarService.exchange_code_for_tokens(code)
        tokens = result["tokens"]
        user_info = result["user_info"]
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": user_info["email"]})
        
        if existing_user:
            # Update Google tokens
            await db.users.update_one(
                {"email": user_info["email"]},
                {
                    "$set": {
                        "google_tokens": tokens,
                        "google_connected": True,
                        "google_email": user_info["email"],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            user_id = existing_user["id"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            user_doc = {
                "id": user_id,
                "email": user_info["email"],
                "name": user_info.get("name", "User"),
                "picture": user_info.get("picture"),
                "google_tokens": tokens,
                "google_connected": True,
                "google_email": user_info["email"],
                "tenant_id": None,  # Will be set based on business logic
                "role_id": None,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        # Generate JWT token
        jwt_token = AuthService.create_access_token(
            user_id=user_id,
            tenant_id=existing_user.get("tenant_id") if existing_user else None,
            role="user"
        )
        
        # Redirect to frontend with token
        redirect_url = f"{FRONTEND_URL}/dashboard?token={jwt_token}&google_connected=true"
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"Google callback error: {e}")
        error_url = f"{FRONTEND_URL}/login?error=google_auth_failed"
        return RedirectResponse(url=error_url)

@router.get("/status")
async def google_connection_status(request: Request):
    """Check if user has connected Google Calendar"""
    try:
        # Get current user from JWT
        from middleware.auth import get_current_user
        current_user = await get_current_user(request)
        
        # Find user in database
        user = await db.users.find_one({"id": current_user["user_id"]})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        google_connected = user.get("google_connected", False)
        has_valid_tokens = False
        
        if google_connected and user.get("google_tokens"):
            # Check if tokens are valid
            try:
                creds, _ = await GoogleCalendarService.get_credentials(user["google_tokens"])
                has_valid_tokens = not creds.expired
            except:
                has_valid_tokens = False
        
        return {
            "google_connected": google_connected,
            "has_valid_tokens": has_valid_tokens,
            "google_email": user.get("google_email")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disconnect")
async def disconnect_google(request: Request):
    """Disconnect Google Calendar integration"""
    try:
        from middleware.auth import get_current_user
        current_user = await get_current_user(request)
        
        # Remove Google tokens
        await db.users.update_one(
            {"id": current_user["user_id"]},
            {
                "$unset": {
                    "google_tokens": "",
                    "google_email": ""
                },
                "$set": {
                    "google_connected": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Google Calendar disconnected successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
