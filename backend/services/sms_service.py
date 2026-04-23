"""
SMS Automation Service
Handles SMS sending with mock implementation (easy to switch to real provider)
"""

import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class SMSService:
    """Service for SMS operations"""
    
    # Default SMS templates
    DEFAULT_TEMPLATES = {
        "lead_ack": {
            "english": "Hello {customer_name}! Thank you for your interest in {project_name}. Our team will contact you shortly. - {company_name}",
            "hindi": "नमस्ते {customer_name}! {project_name} में आपकी रुचि के लिए धन्यवाद। हमारी टीम जल्द ही आपसे संपर्क करेगी। - {company_name}",
            "hinglish": "Hello {customer_name}! {project_name} mein aapki interest ke liye thank you. Hamare team aapse jald hi contact karegi. - {company_name}"
        },
        "follow_up": {
            "english": "Hi {customer_name}, this is {agent_name} from {company_name}. Following up on your interest in {project_name}. Are you available for a quick call?",
            "hindi": "नमस्ते {customer_name}, मैं {agent_name}, {company_name} से बोल रहा हूं। {project_name} में आपकी रुचि के बारे में फॉलो-अप कर रहा हूं। क्या आप एक त्वरित कॉल के लिए उपलब्ध हैं?",
            "hinglish": "Hi {customer_name}, yeh {agent_name} {company_name} se. {project_name} mein aapki interest ke baare mein follow up kar raha hun. Kya aap ek quick call ke liye available hain?"
        },
        "payment_reminder": {
            "english": "Dear {customer_name}, this is a reminder that your payment of ₹{amount} for {project_name} is due on {due_date}. Please pay to avoid late fees. - {company_name}",
            "hindi": "प्रिय {customer_name}, यह एक अनुस्मारक है कि {project_name} के लिए आपका ₹{amount} का भुगतान {due_date} को देय है। देर से शुल्क से बचने के लिए कृपया भुगतान करें। - {company_name}",
            "hinglish": "Dear {customer_name}, yeh reminder hai ki {project_name} ke liye aapka ₹{amount} ka payment {due_date} ko due hai. Late fees se bachne ke liye please pay karein. - {company_name}"
        },
        "booking_confirm": {
            "english": "Congratulations {customer_name}! Your booking for {property_details} at {project_name} is confirmed. Booking ID: {booking_id}. - {company_name}",
            "hindi": "बधाई हो {customer_name}! {project_name} में {property_details} के लिए आपकी बुकिंग की पुष्टि हो गई है। बुकिंग ID: {booking_id}। - {company_name}",
            "hinglish": "Congratulations {customer_name}! {project_name} mein {property_details} ke liye aapki booking confirm ho gayi hai. Booking ID: {booking_id}. - {company_name}"
        },
        "site_visit": {
            "english": "Hi {customer_name}, reminder for your site visit to {project_name} on {visit_date} at {visit_time}. Location: {location}. Contact: {contact_number}. - {company_name}",
            "hindi": "नमस्ते {customer_name}, {project_name} की आपकी साइट विज़िट के लिए अनुस्मारक {visit_date} को {visit_time} पर। स्थान: {location}। संपर्क: {contact_number}। - {company_name}",
            "hinglish": "Hi {customer_name}, aapki site visit ka reminder {project_name} ki {visit_date} ko {visit_time} par. Location: {location}. Contact: {contact_number}. - {company_name}"
        },
        "otp": {
            "english": "Your OTP for {company_name} is: {otp}. Valid for 10 minutes. Do not share with anyone.",
            "hindi": "आपका {company_name} के लिए OTP है: {otp}। 10 मिनट के लिए मान्य। किसी के साथ साझा न करें।",
            "hinglish": "Aapka {company_name} ke liye OTP hai: {otp}. 10 minutes ke liye valid. Kisi ke saath share mat karein."
        }
    }
    
    @staticmethod
    async def send_sms(
        tenant_id: str,
        recipient_phone: str,
        message_body: str,
        message_type: str,
        created_by: str,
        recipient_name: Optional[str] = None,
        recipient_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        booking_id: Optional[str] = None,
        project_id: Optional[str] = None,
        template_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS (Mock implementation - logs to database).
        Easy to switch to real provider by changing this method.
        """
        
        # Mock SMS sending
        sms_record = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "recipient_phone": recipient_phone,
            "recipient_name": recipient_name,
            "recipient_id": recipient_id,
            "message_type": message_type,
            "message_body": message_body,
            "template_id": template_id,
            "lead_id": lead_id,
            "booking_id": booking_id,
            "project_id": project_id,
            "status": "sent",  # Mock: immediately marked as sent
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "delivered_at": datetime.now(timezone.utc).isoformat(),  # Mock: immediately delivered
            "error_message": None,
            "provider": "mock",
            "provider_message_id": f"MOCK_{uuid.uuid4().hex[:12].upper()}",
            "cost": 0.15,  # Mock cost
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store in database
        await db.sms_messages.insert_one(sms_record)
        
        # Log to console for demo
        print(f"\n{'='*60}")
        print(f"📱 MOCK SMS SENT")
        print(f"{'='*60}")
        print(f"To: {recipient_phone} ({recipient_name})")
        print(f"Type: {message_type}")
        print(f"Message: {message_body}")
        print(f"Status: ✅ Delivered")
        print(f"Provider Message ID: {sms_record['provider_message_id']}")
        print(f"{'='*60}\n")
        
        return sms_record
    
    @staticmethod
    def get_template(message_type: str, language: str = "english") -> str:
        """Get SMS template by type and language"""
        templates = SMSService.DEFAULT_TEMPLATES.get(message_type, {})
        return templates.get(language, templates.get("english", ""))
    
    @staticmethod
    def fill_template(template: str, variables: Dict[str, Any]) -> str:
        """Fill template with variables"""
        try:
            return template.format(**variables)
        except KeyError as e:
            # If variable is missing, return template as-is
            print(f"Warning: Missing variable {e} in template")
            return template
    
    @staticmethod
    async def send_lead_acknowledgment(
        tenant_id: str,
        lead_id: str,
        created_by: str,
        language: str = "hinglish"
    ) -> Dict[str, Any]:
        """Send lead acknowledgment SMS"""
        
        # Get lead details
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise ValueError("Lead not found")
        
        # Get project details
        project = None
        if lead.get("project_id"):
            project = await db.projects.find_one({"id": lead["project_id"]}, {"_id": 0})
        
        # Get tenant details
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        
        # Get template and fill variables
        template = SMSService.get_template("lead_ack", language)
        variables = {
            "customer_name": lead.get("name", "Customer"),
            "project_name": project.get("project_name", "our project") if project else "our project",
            "company_name": tenant.get("company_name", "Our Company") if tenant else "Our Company"
        }
        
        message = SMSService.fill_template(template, variables)
        
        # Send SMS
        return await SMSService.send_sms(
            tenant_id=tenant_id,
            recipient_phone=lead.get("phone"),
            message_body=message,
            message_type="lead_ack",
            created_by=created_by,
            recipient_name=lead.get("name"),
            recipient_id=lead_id,
            lead_id=lead_id,
            project_id=lead.get("project_id")
        )
    
    @staticmethod
    async def send_booking_confirmation(
        tenant_id: str,
        booking_id: str,
        created_by: str,
        language: str = "hinglish"
    ) -> Dict[str, Any]:
        """Send booking confirmation SMS"""
        
        # Get booking details
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if not booking:
            raise ValueError("Booking not found")
        
        # Get customer details
        customer = await db.users.find_one({"id": booking.get("customer_id")}, {"_id": 0})
        
        # Get project details
        project = await db.projects.find_one({"id": booking.get("project_id")}, {"_id": 0})
        
        # Get tenant details
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        
        # Get template and fill variables
        template = SMSService.get_template("booking_confirm", language)
        variables = {
            "customer_name": customer.get("name", "Customer") if customer else "Customer",
            "property_details": booking.get("property_details", "property"),
            "project_name": project.get("project_name", "project") if project else "project",
            "booking_id": booking_id[:8],
            "company_name": tenant.get("company_name", "Our Company") if tenant else "Our Company"
        }
        
        message = SMSService.fill_template(template, variables)
        
        # Send SMS
        return await SMSService.send_sms(
            tenant_id=tenant_id,
            recipient_phone=customer.get("phone") if customer else booking.get("customer_phone"),
            message_body=message,
            message_type="booking_confirm",
            created_by=created_by,
            recipient_name=customer.get("name") if customer else None,
            recipient_id=customer.get("id") if customer else None,
            booking_id=booking_id,
            project_id=booking.get("project_id")
        )
    
    @staticmethod
    async def send_payment_reminder(
        tenant_id: str,
        payment_schedule_id: str,
        created_by: str,
        language: str = "hinglish"
    ) -> Dict[str, Any]:
        """Send payment reminder SMS"""
        
        # Get payment schedule
        schedule = await db.payment_schedules.find_one({"id": payment_schedule_id}, {"_id": 0})
        if not schedule:
            raise ValueError("Payment schedule not found")
        
        # Get customer details
        customer = await db.users.find_one({"id": schedule.get("customer_id")}, {"_id": 0})
        
        # Get project details
        project = await db.projects.find_one({"id": schedule.get("project_id")}, {"_id": 0})
        
        # Get tenant details
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        
        # Format due date
        due_date_str = datetime.fromisoformat(schedule.get("due_date")).strftime("%d-%b-%Y")
        
        # Get template and fill variables
        template = SMSService.get_template("payment_reminder", language)
        variables = {
            "customer_name": customer.get("name", "Customer") if customer else "Customer",
            "amount": f"{schedule.get('balance_amount', schedule.get('amount', 0)):,.0f}",
            "project_name": project.get("project_name", "project") if project else "project",
            "due_date": due_date_str,
            "company_name": tenant.get("company_name", "Our Company") if tenant else "Our Company"
        }
        
        message = SMSService.fill_template(template, variables)
        
        # Send SMS
        return await SMSService.send_sms(
            tenant_id=tenant_id,
            recipient_phone=customer.get("phone") if customer else "",
            message_body=message,
            message_type="payment_reminder",
            created_by=created_by,
            recipient_name=customer.get("name") if customer else None,
            recipient_id=customer.get("id") if customer else None,
            project_id=schedule.get("project_id")
        )
    
    @staticmethod
    async def generate_otp(phone: str, tenant_id: str) -> str:
        """Generate OTP and send SMS"""
        import random
        otp = str(random.randint(100000, 999999))
        
        # Get tenant details
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        
        # Get template and fill variables
        template = SMSService.get_template("otp", "english")
        variables = {
            "company_name": tenant.get("company_name", "Our Company") if tenant else "Our Company",
            "otp": otp
        }
        
        message = SMSService.fill_template(template, variables)
        
        # Send SMS
        await SMSService.send_sms(
            tenant_id=tenant_id,
            recipient_phone=phone,
            message_body=message,
            message_type="otp",
            created_by="system"
        )
        
        return otp
