"""Communication service for sending SMS, Email, and WhatsApp notifications"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import os
from enum import Enum

class NotificationType(Enum):
    """Types of notifications"""
    OTP = "otp"
    PAYMENT_REMINDER = "payment_reminder"
    BOOKING_CONFIRMATION = "booking_confirmation"
    FOLLOW_UP_REMINDER = "follow_up_reminder"
    WELCOME = "welcome"
    PAYMENT_RECEIPT = "payment_receipt"
    PROPERTY_DETAILS = "property_details"

class NotificationChannel(Enum):
    """Communication channels"""
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"

# Abstract Provider Classes
class SMSProvider(ABC):
    """Abstract SMS provider"""
    
    @abstractmethod
    async def send_sms(self, phone: str, message: str) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    async def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        pass

class EmailProvider(ABC):
    """Abstract email provider"""
    
    @abstractmethod
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        pass

class WhatsAppProvider(ABC):
    """Abstract WhatsApp provider"""
    
    @abstractmethod
    async def send_message(self, phone: str, message: str) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    async def send_template(self, phone: str, template_name: str, params: Dict) -> Dict[str, Any]:
        pass


# Mock Implementations (for development)
class MockSMSProvider(SMSProvider):
    """Mock SMS provider that logs to console"""
    
    async def send_sms(self, phone: str, message: str) -> Dict[str, Any]:
        print(f"📱 [MOCK SMS] To: {phone}")
        print(f"   Message: {message}")
        return {
            "success": True,
            "provider": "mock",
            "message_id": f"mock_sms_{datetime.now(timezone.utc).timestamp()}",
            "status": "sent"
        }
    
    async def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        message = f"Your ExlainERP verification code is: {otp}. Valid for 10 minutes."
        return await self.send_sms(phone, message)


class MockEmailProvider(EmailProvider):
    """Mock email provider that logs to console"""
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        print(f"📧 [MOCK EMAIL] To: {to}")
        print(f"   Subject: {subject}")
        print(f"   Body Preview: {body[:100]}...")
        if attachments:
            print(f"   Attachments: {len(attachments)} file(s)")
        return {
            "success": True,
            "provider": "mock",
            "message_id": f"mock_email_{datetime.now(timezone.utc).timestamp()}",
            "status": "sent"
        }


class MockWhatsAppProvider(WhatsAppProvider):
    """Mock WhatsApp provider that logs to console"""
    
    async def send_message(self, phone: str, message: str) -> Dict[str, Any]:
        print(f"💬 [MOCK WHATSAPP] To: {phone}")
        print(f"   Message: {message}")
        return {
            "success": True,
            "provider": "mock",
            "message_id": f"mock_wa_{datetime.now(timezone.utc).timestamp()}",
            "status": "sent"
        }
    
    async def send_template(self, phone: str, template_name: str, params: Dict) -> Dict[str, Any]:
        print(f"💬 [MOCK WHATSAPP TEMPLATE] To: {phone}")
        print(f"   Template: {template_name}")
        print(f"   Params: {params}")
        return await self.send_message(phone, f"Template: {template_name}")


# Real Provider Implementations (to be used when API keys are provided)
class MSG91Provider(SMSProvider):
    """MSG91 SMS provider for India"""
    
    def __init__(self, auth_key: str, sender_id: str):
        self.auth_key = auth_key
        self.sender_id = sender_id
        self.base_url = "https://api.msg91.com/api"
    
    async def send_sms(self, phone: str, message: str) -> Dict[str, Any]:
        # TODO: Implement actual MSG91 API call
        import httpx
        
        payload = {
            "authkey": self.auth_key,
            "mobiles": phone,
            "message": message,
            "sender": self.sender_id,
            "route": "4",  # Transactional route
            "country": "91"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sendhttp.php",
                    data=payload,
                    timeout=10.0
                )
                return {
                    "success": response.status_code == 200,
                    "provider": "msg91",
                    "response": response.json() if response.status_code == 200 else response.text,
                    "status": "sent" if response.status_code == 200 else "failed"
                }
        except Exception as e:
            return {
                "success": False,
                "provider": "msg91",
                "error": str(e),
                "status": "failed"
            }
    
    async def send_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        # MSG91 has a dedicated OTP API
        import httpx
        
        payload = {
            "authkey": self.auth_key,
            "mobile": phone,
            "otp": otp,
            "sender": self.sender_id
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v5/otp",
                    json=payload,
                    timeout=10.0
                )
                return {
                    "success": response.status_code == 200,
                    "provider": "msg91",
                    "response": response.json() if response.status_code == 200 else response.text,
                    "status": "sent" if response.status_code == 200 else "failed"
                }
        except Exception as e:
            return {
                "success": False,
                "provider": "msg91",
                "error": str(e),
                "status": "failed"
            }


class SendGridProvider(EmailProvider):
    """SendGrid email provider"""
    
    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
            import base64
            
            # Create email message
            message = Mail(
                from_email=self.from_email,
                to_emails=to,
                subject=subject,
                html_content=body if html else None,
                plain_text_content=body if not html else None
            )
            
            # Add attachments if any
            if attachments:
                for att in attachments:
                    attachment = Attachment()
                    attachment.file_content = FileContent(base64.b64encode(att['content']).decode())
                    attachment.file_name = FileName(att['filename'])
                    attachment.file_type = FileType(att.get('type', 'application/pdf'))
                    attachment.disposition = Disposition('attachment')
                    message.attachment = attachment
            
            # Send email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            return {
                "success": response.status_code in [200, 202],
                "provider": "sendgrid",
                "message_id": response.headers.get('X-Message-Id'),
                "status": "sent" if response.status_code in [200, 202] else "failed"
            }
        except Exception as e:
            return {
                "success": False,
                "provider": "sendgrid",
                "error": str(e),
                "status": "failed"
            }


class AWSSESProvider(EmailProvider):
    """AWS SES email provider (alternative to SendGrid)"""
    
    def __init__(self, aws_access_key: str, aws_secret_key: str, region: str, from_email: str):
        self.aws_access_key = aws_access_key
        self.aws_secret_key = aws_secret_key
        self.region = region
        self.from_email = from_email
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            # Create SES client
            client = boto3.client(
                'ses',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.region
            )
            
            # Prepare email
            email_params = {
                'Source': self.from_email,
                'Destination': {'ToAddresses': [to]},
                'Message': {
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': {}
                }
            }
            
            if html:
                email_params['Message']['Body']['Html'] = {'Data': body, 'Charset': 'UTF-8'}
            else:
                email_params['Message']['Body']['Text'] = {'Data': body, 'Charset': 'UTF-8'}
            
            # Send email (note: attachments require raw email format)
            response = client.send_email(**email_params)
            
            return {
                "success": True,
                "provider": "aws_ses",
                "message_id": response['MessageId'],
                "status": "sent"
            }
        except ClientError as e:
            return {
                "success": False,
                "provider": "aws_ses",
                "error": str(e),
                "status": "failed"
            }
        except Exception as e:
            return {
                "success": False,
                "provider": "aws_ses",
                "error": str(e),
                "status": "failed"
            }


class ResendProvider(EmailProvider):
    """Resend email provider - Modern email API"""
    
    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email
        import resend
        resend.api_key = api_key
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        try:
            import resend
            import asyncio
            
            params = {
                "from": self.from_email,
                "to": [to],
                "subject": subject,
                "html": body if html else None,
                "text": body if not html else None
            }
            
            # Run sync SDK in thread to keep FastAPI non-blocking
            email = await asyncio.to_thread(resend.Emails.send, params)
            
            return {
                "success": True,
                "provider": "resend",
                "message_id": email.get("id"),
                "status": "sent"
            }
        except Exception as e:
            return {
                "success": False,
                "provider": "resend",
                "error": str(e),
                "status": "failed"
            }


# Provider Factory
class NotificationProviderFactory:
    """Factory to create notification providers based on configuration"""
    
    @staticmethod
    def create_sms_provider() -> SMSProvider:
        """Create SMS provider based on environment configuration"""
        provider = os.getenv('SMS_PROVIDER', 'mock')
        
        if provider == 'msg91':
            auth_key = os.getenv('MSG91_AUTH_KEY')
            sender_id = os.getenv('MSG91_SENDER_ID')
            if auth_key and sender_id:
                return MSG91Provider(auth_key, sender_id)
        
        # Default to mock
        return MockSMSProvider()
    
    @staticmethod
    def create_email_provider() -> EmailProvider:
        """Create email provider based on environment configuration"""
        provider = os.getenv('EMAIL_PROVIDER', 'mock')
        
        if provider == 'resend':
            api_key = os.getenv('RESEND_API_KEY')
            from_email = os.getenv('SENDER_EMAIL', 'ExlainERP <onboarding@resend.dev>')
            if api_key:
                return ResendProvider(api_key, from_email)
        
        if provider == 'sendgrid':
            api_key = os.getenv('SENDGRID_API_KEY')
            from_email = os.getenv('SENDGRID_FROM_EMAIL')
            if api_key and from_email:
                return SendGridProvider(api_key, from_email)
        
        elif provider == 'aws_ses':
            access_key = os.getenv('AWS_ACCESS_KEY_ID')
            secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
            region = os.getenv('AWS_REGION', 'us-east-1')
            from_email = os.getenv('AWS_SES_FROM_EMAIL')
            if access_key and secret_key and from_email:
                return AWSSESProvider(access_key, secret_key, region, from_email)
        
        # Default to mock
        return MockEmailProvider()
    
    @staticmethod
    def create_whatsapp_provider() -> WhatsAppProvider:
        """Create WhatsApp provider based on environment configuration"""
        # For now, always return mock (WhatsApp Business API requires approval)
        return MockWhatsAppProvider()


# Main Notification Service
class NotificationService:
    """Main service for sending all types of notifications"""
    
    def __init__(self):
        self.sms_provider = NotificationProviderFactory.create_sms_provider()
        self.email_provider = NotificationProviderFactory.create_email_provider()
        self.whatsapp_provider = NotificationProviderFactory.create_whatsapp_provider()
    
    async def send_sms(self, phone: str, message: str) -> Dict[str, Any]:
        """Send SMS"""
        return await self.sms_provider.send_sms(phone, message)
    
    async def send_otp_sms(self, phone: str, otp: str) -> Dict[str, Any]:
        """Send OTP via SMS"""
        return await self.sms_provider.send_otp(phone, otp)
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: bool = True,
        attachments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Send email"""
        return await self.email_provider.send_email(to, subject, body, html, attachments)
    
    async def send_whatsapp(self, phone: str, message: str) -> Dict[str, Any]:
        """Send WhatsApp message"""
        return await self.whatsapp_provider.send_message(phone, message)
    
    async def send_whatsapp_template(
        self, 
        phone: str, 
        template_name: str, 
        params: Dict
    ) -> Dict[str, Any]:
        """Send WhatsApp template message"""
        return await self.whatsapp_provider.send_template(phone, template_name, params)
    
    async def log_notification(
        self, 
        db, 
        recipient: str, 
        channel: str, 
        notification_type: str, 
        content: str,
        response: Dict[str, Any]
    ):
        """Log notification to database"""
        from utils.helpers import serialize_doc
        
        notification_log = {
            "id": str(__import__('uuid').uuid4()),
            "recipient": recipient,
            "channel": channel,
            "type": notification_type,
            "content": content,
            "provider": response.get('provider'),
            "status": response.get('status'),
            "message_id": response.get('message_id'),
            "success": response.get('success'),
            "error": response.get('error'),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notification_logs.insert_one(serialize_doc(notification_log))
        return notification_log
