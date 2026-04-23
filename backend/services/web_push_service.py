"""
Web Push Notification Service with SMS Fallback
- Sends web push notifications to subscribed users
- Falls back to SMS if push fails or user not subscribed
- Manages push subscriptions
- Handles notification preferences
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import json
import os
import uuid

# Web Push library - install with: pip install pywebpush
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    print("Warning: pywebpush not installed. Web push notifications will be mocked.")


class WebPushService:
    """Service for managing web push notifications with SMS fallback"""
    
    # VAPID keys should be generated once and stored in env
    # Generate with: npx web-push generate-vapid-keys
    VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
    VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
    VAPID_CLAIMS = {
        'sub': os.environ.get('VAPID_EMAIL', 'mailto:support@memoraai.in')
    }
    
    @classmethod
    async def save_subscription(
        cls,
        db,
        user_id: str,
        subscription_info: Dict[str, Any],
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a push subscription for a user.
        subscription_info contains: endpoint, keys (p256dh, auth)
        """
        subscription_doc = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'endpoint': subscription_info.get('endpoint'),
            'keys': subscription_info.get('keys', {}),
            'device_info': device_info or {},
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'last_used_at': datetime.now(timezone.utc).isoformat(),
        }
        
        # Check for existing subscription with same endpoint
        existing = await db.push_subscriptions.find_one({
            'user_id': user_id,
            'endpoint': subscription_info.get('endpoint')
        })
        
        if existing:
            # Update existing subscription
            await db.push_subscriptions.update_one(
                {'id': existing['id']},
                {'$set': {
                    'keys': subscription_info.get('keys', {}),
                    'is_active': True,
                    'last_used_at': datetime.now(timezone.utc).isoformat(),
                }}
            )
            return {'success': True, 'message': 'Subscription updated', 'subscription_id': existing['id']}
        else:
            # Insert new subscription
            await db.push_subscriptions.insert_one(subscription_doc)
            return {'success': True, 'message': 'Subscription saved', 'subscription_id': subscription_doc['id']}
    
    @classmethod
    async def remove_subscription(cls, db, user_id: str, endpoint: str) -> Dict[str, Any]:
        """Remove a push subscription"""
        result = await db.push_subscriptions.update_one(
            {'user_id': user_id, 'endpoint': endpoint},
            {'$set': {'is_active': False, 'removed_at': datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            'success': result.modified_count > 0,
            'message': 'Subscription removed' if result.modified_count > 0 else 'Subscription not found'
        }
    
    @classmethod
    async def send_push_notification(
        cls,
        db,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        icon: str = '/logo192.png',
        badge: str = '/badge.png',
        tag: Optional[str] = None,
        actions: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Send push notification to a user.
        Returns success status and whether fallback was used.
        """
        # Get user's active subscriptions
        subscriptions = await db.push_subscriptions.find({
            'user_id': user_id,
            'is_active': True
        }).to_list(length=10)
        
        if not subscriptions:
            return {
                'success': False,
                'reason': 'no_subscription',
                'message': 'User has no active push subscriptions',
                'fallback_needed': True
            }
        
        # Prepare notification payload
        notification_payload = {
            'title': title,
            'body': body,
            'icon': icon,
            'badge': badge,
            'data': data or {},
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        
        if tag:
            notification_payload['tag'] = tag
        
        if actions:
            notification_payload['actions'] = actions
        
        # Send to all active subscriptions
        success_count = 0
        failed_endpoints = []
        
        for subscription in subscriptions:
            try:
                if WEBPUSH_AVAILABLE and cls.VAPID_PRIVATE_KEY:
                    # Real web push
                    webpush(
                        subscription_info={
                            'endpoint': subscription['endpoint'],
                            'keys': subscription['keys']
                        },
                        data=json.dumps(notification_payload),
                        vapid_private_key=cls.VAPID_PRIVATE_KEY,
                        vapid_claims=cls.VAPID_CLAIMS
                    )
                    success_count += 1
                else:
                    # Mock mode - log the notification
                    print(f"[MOCK PUSH] To user {user_id}: {title} - {body}")
                    success_count += 1
                
                # Update last used timestamp
                await db.push_subscriptions.update_one(
                    {'id': subscription['id']},
                    {'$set': {'last_used_at': datetime.now(timezone.utc).isoformat()}}
                )
                
            except WebPushException as e:
                print(f"Push notification failed: {e}")
                failed_endpoints.append(subscription['endpoint'])
                
                # If subscription expired (410 Gone), mark as inactive
                if e.response and e.response.status_code == 410:
                    await db.push_subscriptions.update_one(
                        {'id': subscription['id']},
                        {'$set': {'is_active': False, 'expired_at': datetime.now(timezone.utc).isoformat()}}
                    )
            except Exception as e:
                print(f"Push notification error: {e}")
                failed_endpoints.append(subscription['endpoint'])
        
        # Log notification
        notification_log = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'type': 'web_push',
            'title': title,
            'body': body,
            'data': data,
            'subscriptions_targeted': len(subscriptions),
            'success_count': success_count,
            'failed_endpoints': failed_endpoints,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.notification_logs.insert_one(notification_log)
        
        return {
            'success': success_count > 0,
            'success_count': success_count,
            'total_subscriptions': len(subscriptions),
            'failed_count': len(failed_endpoints),
            'fallback_needed': success_count == 0
        }
    
    @classmethod
    async def send_notification_with_fallback(
        cls,
        db,
        user_id: str,
        title: str,
        body: str,
        phone: Optional[str] = None,
        notification_service = None,
        data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send notification with automatic SMS fallback.
        
        Flow:
        1. Try web push first
        2. If push fails or user not subscribed, send SMS
        """
        results = {
            'web_push': None,
            'sms_fallback': None,
            'final_status': 'unknown'
        }
        
        # Step 1: Try Web Push
        push_result = await cls.send_push_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            data=data,
            **kwargs
        )
        results['web_push'] = push_result
        
        # Step 2: Check if fallback needed
        if push_result.get('success'):
            results['final_status'] = 'push_sent'
            return results
        
        # Step 3: SMS Fallback
        if push_result.get('fallback_needed') and phone and notification_service:
            # Prepare SMS message (shorter than push)
            sms_body = f"{title}: {body}"
            if len(sms_body) > 160:
                sms_body = sms_body[:157] + "..."
            
            try:
                sms_result = await notification_service.send_sms(phone, sms_body)
                results['sms_fallback'] = sms_result
                
                if sms_result.get('success'):
                    results['final_status'] = 'sms_fallback_sent'
                else:
                    results['final_status'] = 'both_failed'
                    
            except Exception as e:
                print(f"SMS fallback failed: {e}")
                results['sms_fallback'] = {'success': False, 'error': str(e)}
                results['final_status'] = 'both_failed'
        else:
            results['final_status'] = 'push_failed_no_fallback'
        
        # Log the notification attempt with fallback status
        log_doc = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'type': 'notification_with_fallback',
            'title': title,
            'body': body,
            'results': results,
            'phone_used': phone[-4:] if phone else None,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.notification_logs.insert_one(log_doc)
        
        return results
    
    @classmethod
    def get_vapid_public_key(cls) -> str:
        """Get VAPID public key for frontend subscription"""
        return cls.VAPID_PUBLIC_KEY


class NotificationPreferences:
    """Manage user notification preferences"""
    
    DEFAULT_PREFERENCES = {
        'push_enabled': True,
        'sms_fallback_enabled': True,
        'email_enabled': True,
        'whatsapp_enabled': False,
        
        # Notification types
        'payment_reminders': True,
        'booking_updates': True,
        'site_visit_reminders': True,
        'promotional': False,
        'system_updates': True,
        
        # Quiet hours (IST)
        'quiet_hours_enabled': True,
        'quiet_start': '22:00',  # 10 PM
        'quiet_end': '08:00',    # 8 AM
    }
    
    @classmethod
    async def get_preferences(cls, db, user_id: str) -> Dict[str, Any]:
        """Get notification preferences for a user"""
        prefs = await db.notification_preferences.find_one(
            {'user_id': user_id},
            {'_id': 0}
        )
        
        if not prefs:
            return cls.DEFAULT_PREFERENCES.copy()
        
        # Merge with defaults for any missing keys
        result = cls.DEFAULT_PREFERENCES.copy()
        result.update(prefs)
        return result
    
    @classmethod
    async def update_preferences(
        cls,
        db,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update notification preferences for a user"""
        # Filter to only allowed keys
        allowed_keys = set(cls.DEFAULT_PREFERENCES.keys())
        filtered_prefs = {k: v for k, v in preferences.items() if k in allowed_keys}
        
        await db.notification_preferences.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    **filtered_prefs,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                },
                '$setOnInsert': {
                    'user_id': user_id,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {'success': True, 'message': 'Preferences updated'}
    
    @classmethod
    def is_quiet_hours(cls, preferences: Dict[str, Any]) -> bool:
        """Check if current time is within quiet hours"""
        if not preferences.get('quiet_hours_enabled', False):
            return False
        
        from datetime import time as dt_time
        
        quiet_start = preferences.get('quiet_start', '22:00')
        quiet_end = preferences.get('quiet_end', '08:00')
        
        # Parse times
        start_hour, start_min = map(int, quiet_start.split(':'))
        end_hour, end_min = map(int, quiet_end.split(':'))
        
        start_time = dt_time(start_hour, start_min)
        end_time = dt_time(end_hour, end_min)
        
        # Get current IST time
        now = datetime.now(timezone.utc)
        ist_offset_minutes = 5 * 60 + 30
        from datetime import timedelta
        ist_time = (now + timedelta(minutes=ist_offset_minutes)).time()
        
        # Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if start_time > end_time:
            return ist_time >= start_time or ist_time <= end_time
        else:
            return start_time <= ist_time <= end_time
