import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback_secret_for_dev')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
JWT_REMEMBER_ME_DAYS = 30

class AuthService:
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """Generate a random OTP"""
        return ''.join(random.choices(string.digits, k=length))
    
    @staticmethod
    def create_access_token(user_id: str, tenant_id: Optional[str] = None, role: str = 'user', remember_me: bool = False) -> str:
        """Create JWT access token
        
        Args:
            user_id: User identifier
            tenant_id: Tenant identifier (optional)
            role: User role
            remember_me: If True, token expires in 30 days; otherwise 24 hours
        """
        if remember_me:
            expiration = datetime.now(timezone.utc) + timedelta(days=JWT_REMEMBER_ME_DAYS)
        else:
            expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
        
        payload = {
            'user_id': user_id,
            'tenant_id': tenant_id,
            'role': role,
            'remember_me': remember_me,
            'exp': expiration
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")
    
    @staticmethod
    async def send_otp_sms(phone: str, otp: str) -> bool:
        """Send OTP via SMS using SMS Login API (Real SMS)"""
        from services.sms_login_service import SMSLoginService
        
        # Use real SMS Login API
        response = await SMSLoginService.send_otp(phone, otp, validity_minutes=10)
        
        return response.get('success', False)
    
    @staticmethod
    async def send_otp_email(email: str, name: str, otp: str, purpose: str = "verification") -> bool:
        """Send OTP via Email using email service"""
        from services.email_service import EmailService
        
        response = await EmailService.send_otp_email(email, name, otp, purpose)
        return response.get('success', False)
    
    @staticmethod
    async def send_password_reset_email(email: str, name: str, otp: str) -> bool:
        """Send password reset OTP via Email"""
        from services.email_service import EmailService
        
        response = await EmailService.send_password_reset_email(email, name, otp)
        return response.get('success', False)
    
    @staticmethod
    def validate_otp_expiry(otp_expires_at: datetime) -> bool:
        """Check if OTP is still valid"""
        if not otp_expires_at:
            return False
        return datetime.now(timezone.utc) < otp_expires_at
