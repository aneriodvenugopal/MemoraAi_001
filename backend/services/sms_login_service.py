"""
SMS Login API Integration Service
Real SMS provider: smslogin.co
With DLT Approved Templates
"""

import os
import httpx
import random
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from .sms_templates import DLT_TEMPLATES, fill_template, get_template_id, SMSTemplateKey

# SMS Login API Configuration
SMS_LOGIN_BASE_URL = "https://smslogin.co/v3/api.php"
SMS_LOGIN_USERNAME = os.getenv('SMS_LOGIN_USERNAME', 'Eloniot')
SMS_LOGIN_API_KEY = os.getenv('SMS_LOGIN_API_KEY', '6abb40963b99b1475d58')
SMS_LOGIN_SENDER_ID = os.getenv('SMS_LOGIN_SENDER_ID', 'ELNIOT')

MONGO_URL = os.getenv('MONGO_URL')
DB_NAME = os.getenv('DB_NAME')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class SMSLoginService:
    """Service for SMS Login API operations with DLT Templates"""
    
    @staticmethod
    async def _send_sms(
        phone: str, 
        message: str, 
        template_id: str,
        sms_type: str = "general",
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Internal method to send SMS via SMS Login API
        """
        try:
            params = {
                "username": SMS_LOGIN_USERNAME,
                "apikey": SMS_LOGIN_API_KEY,
                "senderid": SMS_LOGIN_SENDER_ID,
                "mobile": phone,
                "message": message,
                "templateid": template_id
            }
            
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.get(SMS_LOGIN_BASE_URL, params=params)
                response_text = response.text.strip()
                
                print(f"\n{'='*60}")
                print(f"📱 SMS LOGIN API - {sms_type.upper()}")
                print(f"{'='*60}")
                print(f"To: {phone}")
                print(f"Template ID: {template_id}")
                print(f"Message: {message[:100]}...")
                print(f"API Response: {response_text}")
                print(f"Status Code: {response.status_code}")
                print(f"{'='*60}\n")
                
                is_success = response.status_code == 200
                message_id = None
                
                if is_success:
                    try:
                        import json
                        resp_json = json.loads(response_text.replace("'", '"'))
                        message_id = resp_json.get("campid")
                    except:
                        if response_text.isdigit():
                            message_id = response_text
                        elif "campid" in response_text:
                            is_success = True
                
                result = {
                    "success": is_success,
                    "phone": phone,
                    "message_id": message_id,
                    "provider": "smslogin",
                    "template_id": template_id,
                    "response": response_text,
                    "status_code": response.status_code,
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Log to database
                await db.sms_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": sms_type,
                    "phone": phone,
                    "message": message,
                    "template_id": template_id,
                    "provider_message_id": message_id,
                    "provider_response": response_text,
                    "success": is_success,
                    "metadata": metadata or {},
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                return result
                
        except Exception as e:
            print(f"❌ SMS Login API Error: {str(e)}")
            return {
                "success": False,
                "phone": phone,
                "error": str(e),
                "provider": "smslogin"
            }
    
    # ============ OTP Methods ============
    
    @staticmethod
    async def send_otp_login(phone: str, otp: str) -> Dict[str, Any]:
        """Send Login OTP SMS"""
        message = fill_template(SMSTemplateKey.OTP_LOGIN, {"otp": otp})
        template_id = get_template_id(SMSTemplateKey.OTP_LOGIN)
        return await SMSLoginService._send_sms(phone, message, template_id, "otp_login", {"otp": otp})
    
    @staticmethod
    async def send_otp_payment(phone: str, otp: str, amount: str) -> Dict[str, Any]:
        """Send Payment OTP SMS"""
        message = fill_template(SMSTemplateKey.OTP_PAYMENT, {"otp": otp, "amount": amount})
        template_id = get_template_id(SMSTemplateKey.OTP_PAYMENT)
        return await SMSLoginService._send_sms(phone, message, template_id, "otp_payment", {"otp": otp, "amount": amount})
    
    @staticmethod
    async def send_otp(phone: str, otp: str, validity_minutes: int = 10) -> Dict[str, Any]:
        """Send OTP SMS (RETORP template - backward compatible)"""
        message = fill_template(SMSTemplateKey.OTP_RETORP, {"otp": otp, "validity_minutes": str(validity_minutes)})
        template_id = get_template_id(SMSTemplateKey.OTP_RETORP)
        return await SMSLoginService._send_sms(phone, message, template_id, "otp", {"otp": otp})
    
    # ============ Payment Methods ============
    
    @staticmethod
    async def send_payment_received(phone: str, customer_name: str, amount: str, receipt_no: str) -> Dict[str, Any]:
        """Send Payment Received SMS"""
        message = fill_template(SMSTemplateKey.PAYMENT_RECEIVED, {
            "customer_name": customer_name,
            "amount": amount,
            "receipt_no": receipt_no
        })
        template_id = get_template_id(SMSTemplateKey.PAYMENT_RECEIVED)
        return await SMSLoginService._send_sms(phone, message, template_id, "payment_received", {
            "customer_name": customer_name, "amount": amount, "receipt_no": receipt_no
        })
    
    @staticmethod
    async def send_token_received(phone: str, amount: str) -> Dict[str, Any]:
        """Send Token Payment Received SMS"""
        message = fill_template(SMSTemplateKey.TOKEN_RECEIVED, {"amount": amount})
        template_id = get_template_id(SMSTemplateKey.TOKEN_RECEIVED)
        return await SMSLoginService._send_sms(phone, message, template_id, "token_received", {"amount": amount})
    
    @staticmethod
    async def send_payment_link(phone: str, customer_name: str, amount: str, payment_link: str) -> Dict[str, Any]:
        """Send Payment Link SMS"""
        message = fill_template(SMSTemplateKey.PAYMENT_LINK, {
            "customer_name": customer_name,
            "amount": amount,
            "payment_link": payment_link
        })
        template_id = get_template_id(SMSTemplateKey.PAYMENT_LINK)
        return await SMSLoginService._send_sms(phone, message, template_id, "payment_link", {
            "customer_name": customer_name, "amount": amount
        })
    
    # ============ Booking Methods ============
    
    @staticmethod
    async def send_booking_confirmed(phone: str, customer_name: str, booking_id: str, total_amount: str) -> Dict[str, Any]:
        """Send Booking Confirmed SMS"""
        message = fill_template(SMSTemplateKey.BOOKING_CONFIRMED, {
            "customer_name": customer_name,
            "booking_id": booking_id,
            "total_amount": total_amount
        })
        template_id = get_template_id(SMSTemplateKey.BOOKING_CONFIRMED)
        return await SMSLoginService._send_sms(phone, message, template_id, "booking_confirmed", {
            "customer_name": customer_name, "booking_id": booking_id, "total_amount": total_amount
        })
    
    # ============ EMI & Payment Reminder Methods ============
    
    @staticmethod
    async def send_emi_due(phone: str, customer_name: str, amount: str, due_date: str, installment_no: str) -> Dict[str, Any]:
        """Send EMI Due SMS"""
        message = fill_template(SMSTemplateKey.EMI_DUE, {
            "customer_name": customer_name,
            "amount": amount,
            "due_date": due_date,
            "installment_no": installment_no
        })
        template_id = get_template_id(SMSTemplateKey.EMI_DUE)
        return await SMSLoginService._send_sms(phone, message, template_id, "emi_due", {
            "customer_name": customer_name, "amount": amount, "due_date": due_date
        })
    
    @staticmethod
    async def send_payment_reminder(phone: str, amount: str, due_date: str) -> Dict[str, Any]:
        """Send Payment Reminder SMS"""
        message = fill_template(SMSTemplateKey.PAYMENT_REMINDER, {
            "amount": amount,
            "due_date": due_date
        })
        template_id = get_template_id(SMSTemplateKey.PAYMENT_REMINDER)
        return await SMSLoginService._send_sms(phone, message, template_id, "payment_reminder", {
            "amount": amount, "due_date": due_date
        })
    
    # ============ Site Visit Methods ============
    
    @staticmethod
    async def send_visit_confirmed(phone: str, customer_name: str, visit_date: str, visit_time: str) -> Dict[str, Any]:
        """Send Site Visit Confirmed SMS"""
        message = fill_template(SMSTemplateKey.VISIT_CONFIRMED, {
            "customer_name": customer_name,
            "visit_date": visit_date,
            "visit_time": visit_time
        })
        template_id = get_template_id(SMSTemplateKey.VISIT_CONFIRMED)
        return await SMSLoginService._send_sms(phone, message, template_id, "visit_confirmed", {
            "customer_name": customer_name, "visit_date": visit_date, "visit_time": visit_time
        })
    
    @staticmethod
    async def send_visit_reminder(phone: str, customer_name: str, visit_time: str) -> Dict[str, Any]:
        """Send Site Visit Reminder SMS"""
        message = fill_template(SMSTemplateKey.VISIT_REMINDER, {
            "customer_name": customer_name,
            "visit_time": visit_time
        })
        template_id = get_template_id(SMSTemplateKey.VISIT_REMINDER)
        return await SMSLoginService._send_sms(phone, message, template_id, "visit_reminder", {
            "customer_name": customer_name, "visit_time": visit_time
        })
    
    @staticmethod
    async def send_visit_rescheduled(phone: str, customer_name: str, new_date: str, new_time: str) -> Dict[str, Any]:
        """Send Site Visit Rescheduled SMS"""
        message = fill_template(SMSTemplateKey.VISIT_RESCHEDULED, {
            "customer_name": customer_name,
            "new_date": new_date,
            "new_time": new_time
        })
        template_id = get_template_id(SMSTemplateKey.VISIT_RESCHEDULED)
        return await SMSLoginService._send_sms(phone, message, template_id, "visit_rescheduled", {
            "customer_name": customer_name, "new_date": new_date, "new_time": new_time
        })
    
    # ============ Document Methods ============
    
    @staticmethod
    async def send_document_ready(phone: str) -> Dict[str, Any]:
        """Send Document Ready SMS"""
        message = fill_template(SMSTemplateKey.DOCUMENT_READY, {})
        template_id = get_template_id(SMSTemplateKey.DOCUMENT_READY)
        return await SMSLoginService._send_sms(phone, message, template_id, "document_ready")
    
    @staticmethod
    async def send_agreement_ready(phone: str, customer_name: str) -> Dict[str, Any]:
        """Send Agreement Ready SMS"""
        message = fill_template(SMSTemplateKey.AGREEMENT_READY, {"customer_name": customer_name})
        template_id = get_template_id(SMSTemplateKey.AGREEMENT_READY)
        return await SMSLoginService._send_sms(phone, message, template_id, "agreement_ready", {
            "customer_name": customer_name
        })
    
    @staticmethod
    async def send_registration_done(phone: str, customer_name: str, registration_no: str) -> Dict[str, Any]:
        """Send Registration Done SMS"""
        message = fill_template(SMSTemplateKey.REGISTRATION_DONE, {
            "customer_name": customer_name,
            "registration_no": registration_no
        })
        template_id = get_template_id(SMSTemplateKey.REGISTRATION_DONE)
        return await SMSLoginService._send_sms(phone, message, template_id, "registration_done", {
            "customer_name": customer_name, "registration_no": registration_no
        })
    
    # ============ Lead & Staff Methods ============
    
    @staticmethod
    async def send_welcome(phone: str, customer_name: str) -> Dict[str, Any]:
        """Send Welcome SMS"""
        message = fill_template(SMSTemplateKey.WELCOME, {"customer_name": customer_name})
        template_id = get_template_id(SMSTemplateKey.WELCOME)
        return await SMSLoginService._send_sms(phone, message, template_id, "welcome", {
            "customer_name": customer_name
        })
    
    @staticmethod
    async def send_new_lead_assigned(phone: str, staff_name: str, lead_name: str) -> Dict[str, Any]:
        """Send New Lead Assigned SMS to Staff"""
        message = fill_template(SMSTemplateKey.NEW_LEAD_ASSIGNED, {
            "staff_name": staff_name,
            "lead_name": lead_name
        })
        template_id = get_template_id(SMSTemplateKey.NEW_LEAD_ASSIGNED)
        return await SMSLoginService._send_sms(phone, message, template_id, "new_lead_assigned", {
            "staff_name": staff_name, "lead_name": lead_name
        })
    
    @staticmethod
    async def send_follow_up_reminder(phone: str, staff_name: str, lead_name: str) -> Dict[str, Any]:
        """Send Follow-up Reminder SMS to Staff"""
        message = fill_template(SMSTemplateKey.FOLLOW_UP_REMINDER, {
            "staff_name": staff_name,
            "lead_name": lead_name
        })
        template_id = get_template_id(SMSTemplateKey.FOLLOW_UP_REMINDER)
        return await SMSLoginService._send_sms(phone, message, template_id, "follow_up_reminder", {
            "staff_name": staff_name, "lead_name": lead_name
        })
    
    # ============ Utility Methods ============
    
    @staticmethod
    async def send_bulk_sms(
        phone_numbers: List[str],
        message: str,
        template_id: str
    ) -> Dict[str, Any]:
        """Send bulk SMS to multiple numbers (up to 500)"""
        try:
            mobile_list = ",".join(phone_numbers[:500])
            
            params = {
                "username": SMS_LOGIN_USERNAME,
                "apikey": SMS_LOGIN_API_KEY,
                "senderid": SMS_LOGIN_SENDER_ID,
                "mobile": mobile_list,
                "message": message,
                "templateid": template_id
            }
            
            async with httpx.AsyncClient(timeout=60.0) as http_client:
                response = await http_client.get(SMS_LOGIN_BASE_URL, params=params)
                response_text = response.text.strip()
                
                print(f"\n{'='*60}")
                print(f"📱 SMS LOGIN API - BULK SMS")
                print(f"{'='*60}")
                print(f"To: {len(phone_numbers)} numbers")
                print(f"API Response: {response_text}")
                print(f"{'='*60}\n")
                
                is_success = response.status_code == 200
                
                await db.sms_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": "bulk",
                    "phone_count": len(phone_numbers),
                    "phones": phone_numbers,
                    "message": message,
                    "template_id": template_id,
                    "provider_response": response_text,
                    "success": is_success,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                return {
                    "success": is_success,
                    "sent_count": len(phone_numbers),
                    "message_id": response_text if is_success else None,
                    "response": response_text,
                    "provider": "smslogin"
                }
                
        except Exception as e:
            print(f"❌ SMS Login Bulk API Error: {str(e)}")
            return {"success": False, "error": str(e), "provider": "smslogin"}
    
    @staticmethod
    async def check_delivery_status(message_id: str) -> Dict[str, Any]:
        """Check delivery status of a sent message"""
        try:
            params = {
                "username": SMS_LOGIN_USERNAME,
                "apikey": SMS_LOGIN_API_KEY,
                "campid": message_id
            }
            
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.get(SMS_LOGIN_BASE_URL, params=params)
                response_text = response.text.strip()
                
                return {
                    "success": response.status_code == 200,
                    "message_id": message_id,
                    "status": response_text,
                    "provider": "smslogin"
                }
        except Exception as e:
            return {"success": False, "message_id": message_id, "error": str(e), "provider": "smslogin"}
    
    @staticmethod
    async def get_credit_balance() -> Dict[str, Any]:
        """Get SMS credit balance"""
        try:
            params = {
                "username": SMS_LOGIN_USERNAME,
                "apikey": SMS_LOGIN_API_KEY
            }
            balance_url = "https://smslogin.co/v3/getbalance.php"
            
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.get(balance_url, params=params)
                return {
                    "success": response.status_code == 200,
                    "balance": response.text.strip(),
                    "provider": "smslogin"
                }
        except Exception as e:
            return {"success": False, "error": str(e), "provider": "smslogin"}
    
    @staticmethod
    async def generate_and_send_otp(phone: str) -> Dict[str, Any]:
        """Generate OTP and send via SMS Login API"""
        otp = str(random.randint(100000, 999999))
        
        otp_record = {
            "id": str(uuid.uuid4()),
            "phone": phone,
            "otp": otp,
            "expires_at": datetime.now(timezone.utc).timestamp() + (10 * 60),
            "verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.otp_records.delete_many({"phone": phone})
        await db.otp_records.insert_one(otp_record)
        
        # Use the new OTP login template
        send_result = await SMSLoginService.send_otp_login(phone, otp)
        
        return {
            "success": send_result.get("success", False),
            "phone": phone,
            "otp": otp,
            "message_id": send_result.get("message_id"),
            "provider_response": send_result.get("response"),
            "expires_in_minutes": 10
        }
    
    @staticmethod
    async def verify_otp(phone: str, otp: str) -> Dict[str, Any]:
        """Verify OTP entered by user"""
        otp_record = await db.otp_records.find_one({
            "phone": phone,
            "otp": otp,
            "verified": False
        }, {"_id": 0})
        
        if not otp_record:
            return {"success": False, "error": "Invalid OTP"}
        
        if datetime.now(timezone.utc).timestamp() > otp_record.get("expires_at", 0):
            return {"success": False, "error": "OTP expired"}
        
        await db.otp_records.update_one(
            {"phone": phone, "otp": otp},
            {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"success": True, "message": "OTP verified successfully"}
