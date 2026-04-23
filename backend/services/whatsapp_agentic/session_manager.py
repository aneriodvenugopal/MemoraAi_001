"""
WhatsApp Session Manager
Handles 24-hour session window tracking and template fallback

WhatsApp Business API Rule:
- After customer replies: 24-hour free conversation window
- After 24 hours without reply: ONLY template messages allowed
- Session reopens when customer replies again
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# Session window duration (WhatsApp allows 24 hours)
SESSION_WINDOW_HOURS = 24

# Buffer time before session expiry (send reminder template)
SESSION_WARNING_HOURS = 23


class WhatsAppSessionManager:
    """
    Manages WhatsApp conversation sessions and 24-hour window
    """
    
    def __init__(self, db: AsyncIOMotorDatabase = None):
        self.db = db
        self.collection_name = "whatsapp_sessions"
    
    def set_db(self, db: AsyncIOMotorDatabase):
        """Set database connection"""
        self.db = db
    
    async def update_session(
        self, 
        phone: str, 
        tenant_id: str,
        direction: str = "inbound",  # inbound = customer, outbound = bot
        message_id: str = None
    ) -> Dict[str, Any]:
        """
        Update session when message is sent/received
        
        Args:
            phone: Customer phone number
            tenant_id: Tenant ID
            direction: 'inbound' (customer) or 'outbound' (bot)
            message_id: WhatsApp message ID
        
        Returns:
            Session data with status
        """
        if self.db is None:
            logger.warning("Database not set for session manager")
            return {"error": "Database not configured"}
        
        now = datetime.now(timezone.utc)
        phone_normalized = self._normalize_phone(phone)
        
        # Get existing session
        session = await self.db[self.collection_name].find_one({
            "phone": phone_normalized,
            "tenant_id": tenant_id
        }, {"_id": 0})
        
        if direction == "inbound":
            # Customer sent message - session window opens/resets
            session_data = {
                "phone": phone_normalized,
                "tenant_id": tenant_id,
                "last_customer_message_at": now,
                "session_expires_at": now + timedelta(hours=SESSION_WINDOW_HOURS),
                "session_status": "active",
                "last_message_id": message_id,
                "total_messages": (session.get("total_messages", 0) if session else 0) + 1,
                "updated_at": now
            }
            
            if not session:
                session_data["created_at"] = now
                session_data["session_started_at"] = now
            
            await self.db[self.collection_name].update_one(
                {"phone": phone_normalized, "tenant_id": tenant_id},
                {"$set": session_data},
                upsert=True
            )
            
            logger.info(f"📥 Session OPENED/REFRESHED for {phone_normalized} - expires at {session_data['session_expires_at']}")
            
            return {
                "status": "active",
                "session_expires_at": session_data["session_expires_at"],
                "can_send_free_message": True,
                "hours_remaining": SESSION_WINDOW_HOURS
            }
        
        else:
            # Bot sending message - just update last outbound
            if session:
                await self.db[self.collection_name].update_one(
                    {"phone": phone_normalized, "tenant_id": tenant_id},
                    {"$set": {
                        "last_bot_message_at": now,
                        "last_outbound_message_id": message_id,
                        "updated_at": now
                    }}
                )
            
            return await self.check_session(phone, tenant_id)
    
    async def check_session(
        self, 
        phone: str, 
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Check if session is active and can send free messages
        
        Returns:
            {
                "status": "active" | "expired" | "warning" | "unknown",
                "can_send_free_message": bool,
                "must_use_template": bool,
                "hours_remaining": float,
                "session_expires_at": datetime
            }
        """
        if self.db is None:
            return {
                "status": "unknown",
                "can_send_free_message": False,
                "must_use_template": True,
                "error": "Database not configured"
            }
        
        phone_normalized = self._normalize_phone(phone)
        now = datetime.now(timezone.utc)
        
        session = await self.db[self.collection_name].find_one({
            "phone": phone_normalized,
            "tenant_id": tenant_id
        }, {"_id": 0})
        
        if not session:
            # No session exists - must use template to initiate
            logger.info(f"⚠️ No session for {phone_normalized} - template required")
            return {
                "status": "no_session",
                "can_send_free_message": False,
                "must_use_template": True,
                "hours_remaining": 0,
                "reason": "No previous conversation - use template to start"
            }
        
        expires_at = session.get("session_expires_at")
        if not expires_at:
            return {
                "status": "unknown",
                "can_send_free_message": False,
                "must_use_template": True,
                "reason": "Session expiry not set"
            }
        
        # Make expires_at timezone aware if it isn't
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        time_remaining = expires_at - now
        hours_remaining = time_remaining.total_seconds() / 3600
        
        if hours_remaining <= 0:
            # Session EXPIRED
            logger.warning(f"🔴 Session EXPIRED for {phone_normalized} - template required")
            
            # Update status
            await self.db[self.collection_name].update_one(
                {"phone": phone_normalized, "tenant_id": tenant_id},
                {"$set": {"session_status": "expired", "updated_at": now}}
            )
            
            return {
                "status": "expired",
                "can_send_free_message": False,
                "must_use_template": True,
                "hours_remaining": 0,
                "session_expires_at": expires_at,
                "reason": "24-hour session window expired"
            }
        
        elif hours_remaining <= (SESSION_WINDOW_HOURS - SESSION_WARNING_HOURS):
            # Session about to expire (within 1 hour)
            logger.info(f"🟡 Session WARNING for {phone_normalized} - {hours_remaining:.1f} hours remaining")
            return {
                "status": "warning",
                "can_send_free_message": True,
                "must_use_template": False,
                "hours_remaining": hours_remaining,
                "session_expires_at": expires_at,
                "reason": f"Session expiring soon - {hours_remaining:.1f} hours left"
            }
        
        else:
            # Session ACTIVE
            return {
                "status": "active",
                "can_send_free_message": True,
                "must_use_template": False,
                "hours_remaining": hours_remaining,
                "session_expires_at": expires_at
            }
    
    async def get_expired_sessions(
        self, 
        tenant_id: str = None,
        limit: int = 100
    ) -> list:
        """
        Get all expired sessions that need template re-engagement
        """
        if self.db is None:
            return []
        
        now = datetime.now(timezone.utc)
        query = {
            "session_expires_at": {"$lt": now},
            "session_status": {"$ne": "re_engaged"}
        }
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        
        sessions = await self.db[self.collection_name].find(
            query, {"_id": 0}
        ).limit(limit).to_list(limit)
        
        return sessions
    
    async def mark_re_engaged(self, phone: str, tenant_id: str):
        """Mark session as re-engaged via template"""
        if self.db is None:
            return
        
        phone_normalized = self._normalize_phone(phone)
        await self.db[self.collection_name].update_one(
            {"phone": phone_normalized, "tenant_id": tenant_id},
            {"$set": {
                "session_status": "re_engaged",
                "re_engaged_at": datetime.now(timezone.utc)
            }}
        )
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone to consistent format"""
        phone = ''.join(filter(str.isdigit, str(phone)))
        if len(phone) == 10:
            phone = f"91{phone}"
        return phone


# Singleton instance
session_manager = WhatsAppSessionManager()
