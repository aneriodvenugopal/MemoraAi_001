"""
Firebase Push Notification Service
Centralized service for sending push notifications via Firebase Cloud Messaging
"""
import os
import json
from typing import List, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    
    # Check if already initialized
    if not firebase_admin._apps:
        # Try to load from environment variable (JSON string or file path)
        firebase_cred = os.environ.get('FIREBASE_CREDENTIALS')
        
        if firebase_cred:
            # Check if it's a file path or JSON string
            if firebase_cred.startswith('{'):
                # It's a JSON string
                cred_dict = json.loads(firebase_cred)
                cred = credentials.Certificate(cred_dict)
            else:
                # It's a file path
                cred = credentials.Certificate(firebase_cred)
            
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        else:
            logger.warning("FIREBASE_CREDENTIALS not found in environment. Push notifications will be disabled.")
            firebase_admin = None
    
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
    firebase_admin = None


class FirebaseNotificationService:
    """Service for sending Firebase push notifications"""
    
    @staticmethod
    def is_available() -> bool:
        """Check if Firebase is properly configured"""
        return firebase_admin is not None and firebase_admin._apps
    
    @staticmethod
    async def send_notification(
        fcm_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> bool:
        """
        Send push notification to a single device
        
        Args:
            fcm_token: Firebase Cloud Messaging token
            title: Notification title
            body: Notification body
            data: Additional data payload
            image_url: Optional image URL
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not FirebaseNotificationService.is_available():
            logger.warning("Firebase not configured. Skipping push notification.")
            return False
        
        if not fcm_token:
            logger.warning("No FCM token provided. Skipping push notification.")
            return False
        
        try:
            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build message
            message = messaging.Message(
                notification=notification,
                data=data or {},
                token=fcm_token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        click_action='FLUTTER_NOTIFICATION_CLICK'
                    )
                ),
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        icon='/icon.svg',
                        badge='/icon.svg'
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='/'
                    )
                )
            )
            
            # Send message
            response = messaging.send(message)
            logger.info(f"Successfully sent notification: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False
    
    @staticmethod
    async def send_to_multiple(
        fcm_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> Dict:
        """
        Send push notification to multiple devices
        
        Args:
            fcm_tokens: List of FCM tokens
            title: Notification title
            body: Notification body
            data: Additional data payload
            image_url: Optional image URL
            
        Returns:
            Dict with success_count and failure_count
        """
        if not FirebaseNotificationService.is_available():
            logger.warning("Firebase not configured. Skipping push notifications.")
            return {"success_count": 0, "failure_count": 0}
        
        if not fcm_tokens:
            logger.warning("No FCM tokens provided. Skipping push notifications.")
            return {"success_count": 0, "failure_count": 0}
        
        try:
            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build multicast message
            message = messaging.MulticastMessage(
                notification=notification,
                data=data or {},
                tokens=fcm_tokens,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        click_action='FLUTTER_NOTIFICATION_CLICK'
                    )
                ),
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        icon='/icon.svg',
                        badge='/icon.svg'
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='/'
                    )
                )
            )
            
            # Send multicast
            response = messaging.send_each_for_multicast(message)
            logger.info(f"Successfully sent {response.success_count} notifications, {response.failure_count} failed")
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Error sending multicast push notification: {e}")
            return {"success_count": 0, "failure_count": len(fcm_tokens)}
    
    @staticmethod
    async def send_to_topic(
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> bool:
        """
        Send push notification to a topic (all subscribed users)
        
        Args:
            topic: Topic name
            title: Notification title
            body: Notification body
            data: Additional data payload
            image_url: Optional image URL
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not FirebaseNotificationService.is_available():
            logger.warning("Firebase not configured. Skipping push notification.")
            return False
        
        try:
            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )
            
            # Build message
            message = messaging.Message(
                notification=notification,
                data=data or {},
                topic=topic,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        click_action='FLUTTER_NOTIFICATION_CLICK'
                    )
                ),
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        icon='/icon.svg',
                        badge='/icon.svg'
                    ),
                    fcm_options=messaging.WebpushFCMOptions(
                        link='/'
                    )
                )
            )
            
            # Send message
            response = messaging.send(message)
            logger.info(f"Successfully sent topic notification: {response}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending topic push notification: {e}")
            return False


# Helper function to combine in-app and push notifications
async def send_notification_to_user(
    db,
    user_id: str,
    tenant_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    priority: str = "normal",
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
    metadata: Optional[Dict] = None,
    image_url: Optional[str] = None
) -> Dict:
    """
    Send both in-app and push notification to a user
    
    Args:
        db: Database connection
        user_id: User ID
        tenant_id: Tenant ID
        title: Notification title
        message: Notification message
        notification_type: Type (info, success, warning, error)
        priority: Priority (low, normal, high)
        action_url: Optional action URL
        action_label: Optional action label
        metadata: Optional metadata dict
        image_url: Optional image URL
        
    Returns:
        Dict with in_app_saved and push_sent status
    """
    from datetime import datetime, timezone
    import uuid
    
    result = {
        "in_app_saved": False,
        "push_sent": False
    }
    
    try:
        # 1. Save in-app notification
        notification_doc = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'tenant_id': tenant_id,
            'title': title,
            'message': message,
            'type': notification_type,
            'priority': priority,
            'read': False,
            'action_url': action_url,
            'action_label': action_label,
            'metadata': metadata or {},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'read_at': None
        }
        
        await db.in_app_notifications.insert_one(notification_doc)
        result["in_app_saved"] = True
        logger.info(f"In-app notification saved for user {user_id}")
        
        # 2. Send push notification if user has FCM token
        user = await db.users.find_one({'id': user_id}, {"_id": 0})
        
        if user and user.get('fcm_token'):
            fcm_token = user.get('fcm_token')
            
            push_sent = await FirebaseNotificationService.send_notification(
                fcm_token=fcm_token,
                title=title,
                body=message,
                data={
                    'notification_id': notification_doc['id'],
                    'type': notification_type,
                    'action_url': action_url or '/',
                    **(metadata or {})
                },
                image_url=image_url
            )
            
            result["push_sent"] = push_sent
            logger.info(f"Push notification {'sent' if push_sent else 'failed'} for user {user_id}")
        else:
            logger.info(f"No FCM token for user {user_id}. Push notification skipped.")
    
    except Exception as e:
        logger.error(f"Error sending notification to user {user_id}: {e}")
    
    return result


async def send_notification_to_multiple_users(
    db,
    user_ids: List[str],
    tenant_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    priority: str = "normal",
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
    metadata: Optional[Dict] = None,
    image_url: Optional[str] = None
) -> Dict:
    """
    Send both in-app and push notifications to multiple users
    
    Returns:
        Dict with counts of notifications sent
    """
    from datetime import datetime, timezone
    import uuid
    
    result = {
        "in_app_count": 0,
        "push_success_count": 0,
        "push_failure_count": 0
    }
    
    try:
        # 1. Save in-app notifications for all users
        notifications_to_insert = []
        for user_id in user_ids:
            notification_doc = {
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'tenant_id': tenant_id,
                'title': title,
                'message': message,
                'type': notification_type,
                'priority': priority,
                'read': False,
                'action_url': action_url,
                'action_label': action_label,
                'metadata': metadata or {},
                'created_at': datetime.now(timezone.utc).isoformat(),
                'read_at': None
            }
            notifications_to_insert.append(notification_doc)
        
        if notifications_to_insert:
            await db.in_app_notifications.insert_many(notifications_to_insert)
            result["in_app_count"] = len(notifications_to_insert)
            logger.info(f"Saved {len(notifications_to_insert)} in-app notifications")
        
        # 2. Send push notifications to users with FCM tokens
        fcm_tokens = []
        users = await db.users.find(
            {'id': {'$in': user_ids}},
            {"_id": 0, "id": 1, "fcm_token": 1}
        ).to_list(length=1000)
        
        for user in users:
            if user.get('fcm_token'):
                fcm_tokens.append(user['fcm_token'])
        
        if fcm_tokens:
            push_result = await FirebaseNotificationService.send_to_multiple(
                fcm_tokens=fcm_tokens,
                title=title,
                body=message,
                data={
                    'type': notification_type,
                    'action_url': action_url or '/',
                    **(metadata or {})
                },
                image_url=image_url
            )
            
            result["push_success_count"] = push_result["success_count"]
            result["push_failure_count"] = push_result["failure_count"]
            logger.info(f"Push notifications: {push_result['success_count']} sent, {push_result['failure_count']} failed")
        else:
            logger.info("No FCM tokens found. Push notifications skipped.")
    
    except Exception as e:
        logger.error(f"Error sending notifications to multiple users: {e}")
    
    return result
