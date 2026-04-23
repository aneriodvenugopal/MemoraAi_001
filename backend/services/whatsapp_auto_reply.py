"""
WhatsApp Auto-Reply Service
- Handles incoming WhatsApp messages
- Auto-replies based on keywords and business hours
- Captures leads automatically
- 24/7 instant response capability
"""
from datetime import datetime, timezone, time
from typing import Dict, Any, Optional, List
import re
import os

class WhatsAppAutoReplyService:
    """Service for managing WhatsApp auto-replies and lead capture"""
    
    # Business hours configuration (IST)
    BUSINESS_START = time(10, 0)  # 10:00 AM
    BUSINESS_END = time(18, 0)    # 6:00 PM
    
    # Keyword patterns for auto-replies
    KEYWORD_PATTERNS = {
        'price': ['price', 'rate', 'cost', 'amount', 'ధర', 'रेट', 'कीमत'],
        'location': ['location', 'address', 'where', 'directions', 'చిరునామా', 'पता'],
        'site_visit': ['visit', 'see', 'show', 'చూడాలి', 'देखना'],
        'availability': ['available', 'vacancy', 'open', 'ఉందా', 'उपलब्ध'],
        'payment': ['payment', 'emi', 'installment', 'చెల్లింపు', 'भुगतान'],
        'document': ['document', 'paper', 'registration', 'డాక్యుమెంట్', 'कागज'],
        'greeting': ['hi', 'hello', 'hey', 'good morning', 'good evening', 'నమస్కారం', 'नमस्ते'],
    }
    
    # Auto-reply templates
    TEMPLATES = {
        'welcome': """🏠 *Welcome to {company_name}!*

Thank you for reaching out. We're here to help you find your dream property.

How can we assist you today?

1️⃣ View Available Properties
2️⃣ Schedule a Site Visit
3️⃣ Get Price List
4️⃣ Payment Plans & EMI Options
5️⃣ Talk to Our Team

Reply with the number or type your query.

*{company_name}* - Your Real Estate Partner""",

        'after_hours': """🌙 *Thank you for contacting {company_name}!*

Our office hours are *10:00 AM - 6:00 PM (Mon-Sat)*.

We've received your message and our team will respond first thing in the morning.

In the meantime, you can:
📱 Browse our properties: {website_url}
📞 Emergency contact: {emergency_phone}

*{company_name}* - Your Real Estate Partner""",

        'price_inquiry': """💰 *Price Information - {company_name}*

Thank you for your interest!

Our current offerings:
📍 *{project_name}*
   Starting from ₹{starting_price}
   
💳 *Easy Payment Options:*
   • Down payment: {down_payment}%
   • EMI available
   • Bank loan assistance

Would you like to:
1️⃣ Get detailed price list
2️⃣ Schedule a site visit
3️⃣ Speak with our executive

Reply with your choice!""",

        'site_visit': """🏗️ *Schedule Your Site Visit*

Great! We'd love to show you around.

Please share the following:
1. Your preferred date
2. Preferred time (10 AM - 5 PM)
3. Number of people visiting

Our team will confirm your slot within 30 minutes.

📍 *Location:* {project_location}
🚗 *Landmark:* {landmark}

*{company_name}* - Your Real Estate Partner""",

        'availability': """✅ *Property Availability - {company_name}*

We have {available_count} properties available right now!

*Available Options:*
{available_list}

Interested in any specific property?
Reply with the plot number or type to know more.

*{company_name}* - Your Real Estate Partner""",

        'payment_info': """💳 *Payment Options - {company_name}*

We offer flexible payment plans:

📊 *Payment Structure:*
• Booking Amount: {booking_amount}
• Down Payment: {down_payment}%
• Balance: Through EMI or milestones

🏦 *EMI Options:*
• Starting from ₹{emi_starting}/month
• Tenure: Up to 24 months
• Zero processing fee

🏛️ *Bank Loans:*
• Tie-ups with major banks
• Quick approval
• Assistance provided

Want to calculate your EMI? Share the property value!

*{company_name}* - Your Real Estate Partner""",

        'lead_captured': """✅ *Thank You, {customer_name}!*

We've noted your interest. Here's what happens next:

1️⃣ Our executive will call you within {callback_time}
2️⃣ You'll receive the property details via WhatsApp
3️⃣ Site visit can be scheduled at your convenience

Your Reference ID: *{lead_id}*

Any questions? Reply here anytime!

*{company_name}* - Your Real Estate Partner""",

        'default': """👋 *Hello from {company_name}!*

Thank you for your message. 

Our team will respond shortly. 

Meanwhile, you can:
• Type "PRICE" for pricing info
• Type "VISIT" to schedule site visit
• Type "EMI" for payment options
• Type "MENU" for all options

*{company_name}* - Your Real Estate Partner"""
    }
    
    @classmethod
    def is_business_hours(cls) -> bool:
        """Check if current time is within business hours (IST)"""
        # Get current time in IST (UTC+5:30)
        now = datetime.now(timezone.utc)
        ist_offset = 5 * 60 + 30  # 5 hours 30 minutes in minutes
        ist_time = now.replace(tzinfo=None) + timedelta(minutes=ist_offset)
        current_time = ist_time.time()
        
        # Check if it's a weekday (Monday=0, Sunday=6)
        is_weekday = ist_time.weekday() < 6  # Mon-Sat
        
        return is_weekday and cls.BUSINESS_START <= current_time <= cls.BUSINESS_END
    
    @classmethod
    def detect_intent(cls, message: str) -> str:
        """Detect user intent from message using keyword matching"""
        message_lower = message.lower().strip()
        
        # Check for greeting first
        if len(message_lower) < 20:
            for keyword in cls.KEYWORD_PATTERNS['greeting']:
                if keyword in message_lower:
                    return 'greeting'
        
        # Check other intents
        for intent, keywords in cls.KEYWORD_PATTERNS.items():
            if intent == 'greeting':
                continue
            for keyword in keywords:
                if keyword in message_lower:
                    return intent
        
        return 'default'
    
    @classmethod
    async def generate_auto_reply(
        cls,
        message: str,
        sender_phone: str,
        tenant_config: Dict[str, Any],
        db = None
    ) -> Dict[str, Any]:
        """
        Generate appropriate auto-reply based on message content.
        Also captures lead if new contact.
        """
        intent = cls.detect_intent(message)
        is_business = cls.is_business_hours()
        
        # Get tenant configuration
        company_name = tenant_config.get('company_name', 'MemoraAI')
        website_url = tenant_config.get('website_url', '')
        emergency_phone = tenant_config.get('emergency_phone', '')
        
        # Default template variables
        template_vars = {
            'company_name': company_name,
            'website_url': website_url,
            'emergency_phone': emergency_phone,
        }
        
        # Select appropriate template
        if not is_business and intent != 'greeting':
            template_key = 'after_hours'
        elif intent == 'greeting':
            template_key = 'welcome'
        elif intent == 'price':
            template_key = 'price_inquiry'
            # Add price-specific variables
            template_vars.update({
                'project_name': tenant_config.get('default_project_name', 'Premium Plots'),
                'starting_price': tenant_config.get('starting_price', '25,00,000'),
                'down_payment': tenant_config.get('down_payment_percent', '30'),
            })
        elif intent == 'site_visit':
            template_key = 'site_visit'
            template_vars.update({
                'project_location': tenant_config.get('project_location', 'Contact for location'),
                'landmark': tenant_config.get('landmark', 'Will be shared on confirmation'),
            })
        elif intent == 'availability':
            template_key = 'availability'
            # Get availability from database if possible
            available_count = tenant_config.get('available_count', 'multiple')
            template_vars.update({
                'available_count': available_count,
                'available_list': tenant_config.get('available_list', '• Multiple options in various sizes\n• Corner plots available\n• East/North facing options'),
            })
        elif intent == 'payment':
            template_key = 'payment_info'
            template_vars.update({
                'booking_amount': tenant_config.get('booking_amount', '₹50,000'),
                'down_payment': tenant_config.get('down_payment_percent', '30'),
                'emi_starting': tenant_config.get('emi_starting', '25,000'),
            })
        else:
            template_key = 'default'
        
        # Generate reply from template
        template = cls.TEMPLATES.get(template_key, cls.TEMPLATES['default'])
        reply_message = template.format(**template_vars)
        
        # Capture lead if database available
        lead_id = None
        is_new_lead = False
        
        if db:
            # Check if contact exists
            existing_lead = await db.leads.find_one({'phone': sender_phone})
            existing_customer = await db.customers.find_one({'phone': sender_phone})
            
            if not existing_lead and not existing_customer:
                # Create new lead
                import uuid
                lead_id = str(uuid.uuid4())
                lead_doc = {
                    'id': lead_id,
                    'phone': sender_phone,
                    'name': f'WhatsApp Lead - {sender_phone[-4:]}',
                    'source': 'whatsapp_auto',
                    'source_detail': f'Auto-captured via WhatsApp ({intent})',
                    'status': 'new',
                    'tenant_id': tenant_config.get('tenant_id'),
                    'first_message': message,
                    'intent_detected': intent,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
                await db.leads.insert_one(lead_doc)
                is_new_lead = True
                
                # Add lead captured message
                reply_message += f"\n\n_Lead ID: {lead_id[:8]}_"
        
        return {
            'reply_message': reply_message,
            'intent': intent,
            'template_used': template_key,
            'is_business_hours': is_business,
            'lead_captured': is_new_lead,
            'lead_id': lead_id,
            'sender_phone': sender_phone,
        }
    
    @classmethod
    def get_quick_replies(cls, intent: str) -> List[Dict[str, str]]:
        """Get quick reply buttons for WhatsApp interactive messages"""
        quick_replies = {
            'greeting': [
                {'id': 'price', 'title': '💰 Prices'},
                {'id': 'visit', 'title': '🏠 Site Visit'},
                {'id': 'call', 'title': '📞 Call Me'},
            ],
            'price': [
                {'id': 'visit', 'title': '🏠 Schedule Visit'},
                {'id': 'emi', 'title': '💳 EMI Options'},
                {'id': 'call', 'title': '📞 Talk to Team'},
            ],
            'site_visit': [
                {'id': 'tomorrow', 'title': '📅 Tomorrow'},
                {'id': 'weekend', 'title': '📅 This Weekend'},
                {'id': 'custom', 'title': '📅 Other Date'},
            ],
            'default': [
                {'id': 'price', 'title': '💰 Prices'},
                {'id': 'visit', 'title': '🏠 Site Visit'},
                {'id': 'menu', 'title': '📋 All Options'},
            ],
        }
        return quick_replies.get(intent, quick_replies['default'])


# Required import for timedelta
from datetime import timedelta
