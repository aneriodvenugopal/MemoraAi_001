"""
Email Service using Resend
Handles all transactional emails for ExlainERP
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configure Resend
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'ExlainERP <onboarding@resend.dev>')
SENDER_NAME = os.environ.get('SENDER_NAME', 'ExlainERP')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


class EmailTemplates:
    """HTML Email Templates for ExlainERP"""
    
    @staticmethod
    def base_template(content: str, title: str = "ExlainERP") -> str:
        """Base email template with ExlainERP branding"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">ExlainERP</h1>
                            <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Real Estate ERP Solutions</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                                This email was sent by ExlainERP.<br>
                                Please do not reply to this email.
                            </p>
                            <p style="margin: 12px 0 0; color: #94a3b8; font-size: 11px; text-align: center;">
                                © {datetime.now().year} ExlainERP. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    @staticmethod
    def welcome_email(name: str, tenant_name: str = "ExlainERP") -> str:
        """Welcome email for new users"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">Welcome to {tenant_name}!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Thank you for joining us! Your account has been successfully created. 
                You can now access our real estate management platform.
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                With ExlainERP, you can:
            </p>
            <ul style="color: #475569; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
                <li>View and manage properties</li>
                <li>Track your bookings and payments</li>
                <li>Schedule site visits</li>
                <li>Access important documents</li>
            </ul>
            <p style="color: #475569; line-height: 1.6; margin: 0;">
                If you have any questions, please don't hesitate to reach out to our support team.
            </p>
        """
        return EmailTemplates.base_template(content, f"Welcome to {tenant_name}")
    
    @staticmethod
    def otp_email(name: str, otp: str, purpose: str = "verification") -> str:
        """OTP verification email"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">Verification Code</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                Your {purpose} code is:
            </p>
            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="font-size: 36px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px;">{otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 16px;">
                This code is valid for <strong>10 minutes</strong>.
            </p>
            <p style="color: #ef4444; font-size: 14px; margin: 0;">
                ⚠️ Do not share this code with anyone. Our team will never ask for your OTP.
            </p>
        """
        return EmailTemplates.base_template(content, "Your Verification Code")
    
    @staticmethod
    def password_reset_email(name: str, otp: str) -> str:
        """Password reset OTP email"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">Password Reset Request</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset your password. Use the code below to proceed:
            </p>
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
                <span style="font-size: 36px; font-weight: bold; color: #92400e; letter-spacing: 8px;">{otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 16px;">
                This code expires in <strong>10 minutes</strong>.
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0;">
                If you didn't request this, please ignore this email or contact support if you're concerned.
            </p>
        """
        return EmailTemplates.base_template(content, "Password Reset")
    
    @staticmethod
    def booking_confirmation_email(
        customer_name: str,
        project_name: str,
        property_details: str,
        booking_id: str,
        booking_date: str,
        total_amount: str,
        paid_amount: str = "0"
    ) -> str:
        """Booking confirmation email"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">🎉 Booking Confirmed!</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {customer_name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                Congratulations! Your booking has been successfully confirmed.
            </p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <h3 style="color: #166534; margin: 0 0 16px; font-size: 18px;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Booking ID:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{booking_id}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Project:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{project_name}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Property:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{property_details}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Date:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{booking_date}</td>
                    </tr>
                    <tr style="border-top: 1px solid #d1fae5;">
                        <td style="color: #64748b; padding: 12px 0 4px; font-size: 14px;">Total Amount:</td>
                        <td style="color: #1e293b; padding: 12px 0 4px; font-size: 16px; font-weight: 700; text-align: right;">₹{total_amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 4px 0; font-size: 14px;">Amount Paid:</td>
                        <td style="color: #22c55e; padding: 4px 0; font-size: 14px; font-weight: 600; text-align: right;">₹{paid_amount}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0;">
                Thank you for choosing us. Our team will contact you shortly with next steps.
            </p>
        """
        return EmailTemplates.base_template(content, "Booking Confirmation")
    
    @staticmethod
    def payment_confirmation_email(
        customer_name: str,
        amount: str,
        payment_date: str,
        payment_method: str,
        receipt_number: str,
        project_name: str,
        property_details: str = ""
    ) -> str:
        """Payment confirmation email"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">✅ Payment Received</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {customer_name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                We have successfully received your payment. Here are the details:
            </p>
            
            <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Receipt No:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{receipt_number}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Amount:</td>
                        <td style="color: #22c55e; padding: 8px 0; font-size: 20px; font-weight: 700; text-align: right;">₹{amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Date:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{payment_date}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Method:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{payment_method}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Project:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{project_name}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0;">
                Thank you for your payment. A detailed receipt will be available in your account.
            </p>
        """
        return EmailTemplates.base_template(content, "Payment Confirmation")
    
    @staticmethod
    def payment_reminder_email(
        customer_name: str,
        amount: str,
        due_date: str,
        project_name: str,
        property_details: str,
        days_until_due: int = 0,
        is_overdue: bool = False
    ) -> str:
        """Payment reminder or overdue email"""
        if is_overdue:
            title = "⚠️ Payment Overdue"
            header_color = "#ef4444"
            bg_color = "#fef2f2"
            border_color = "#ef4444"
            urgency_text = f"Your payment is <strong>{abs(days_until_due)} days overdue</strong>."
        elif days_until_due <= 3:
            title = "🔔 Payment Due Soon"
            header_color = "#f59e0b"
            bg_color = "#fffbeb"
            border_color = "#f59e0b"
            urgency_text = f"Your payment is due in <strong>{days_until_due} day(s)</strong>."
        else:
            title = "📅 Payment Reminder"
            header_color = "#3b82f6"
            bg_color = "#eff6ff"
            border_color = "#3b82f6"
            urgency_text = f"Your payment is due on <strong>{due_date}</strong>."
        
        content = f"""
            <h2 style="color: {header_color}; margin: 0 0 20px; font-size: 24px;">{title}</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {customer_name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                {urgency_text}
            </p>
            
            <div style="background-color: {bg_color}; border: 1px solid {border_color}; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Project:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{project_name}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Property:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{property_details}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Due Date:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{due_date}</td>
                    </tr>
                    <tr style="border-top: 1px solid {border_color};">
                        <td style="color: #64748b; padding: 12px 0; font-size: 14px;">Amount Due:</td>
                        <td style="color: {header_color}; padding: 12px 0; font-size: 20px; font-weight: 700; text-align: right;">₹{amount}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Please make your payment at the earliest to avoid late fees.
            </p>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                If you have already made this payment, please ignore this reminder.
            </p>
        """
        return EmailTemplates.base_template(content, title)
    
    @staticmethod
    def site_visit_confirmation_email(
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str,
        location: str,
        assigned_staff: str,
        contact_number: str
    ) -> str:
        """Site visit confirmation email"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">🏠 Site Visit Scheduled</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                Dear {visitor_name},
            </p>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                Your site visit has been scheduled. We look forward to meeting you!
            </p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <h3 style="color: #166534; margin: 0 0 16px; font-size: 18px;">Visit Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">📍 Project:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{project_name}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">📅 Date:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{visit_date}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">⏰ Time:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{visit_time}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">🗺️ Location:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{location}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">👤 Contact Person:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{assigned_staff}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">📞 Contact:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{contact_number}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                Please carry a valid ID proof for the site visit.
            </p>
        """
        return EmailTemplates.base_template(content, "Site Visit Scheduled")
    
    @staticmethod
    def lead_inquiry_email(
        lead_name: str,
        project_name: str,
        lead_phone: str,
        lead_email: str,
        message: str,
        source: str
    ) -> str:
        """Lead inquiry notification (for admin/staff)"""
        content = f"""
            <h2 style="color: #1e3a5f; margin: 0 0 20px; font-size: 24px;">🔔 New Lead Inquiry</h2>
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                A new inquiry has been received. Please follow up at the earliest.
            </p>
            
            <div style="background-color: #faf5ff; border: 1px solid #a855f7; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                <h3 style="color: #7c3aed; margin: 0 0 16px; font-size: 18px;">Lead Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Name:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{lead_name}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Phone:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{lead_phone}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; text-align: right;">{lead_email or 'Not provided'}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Project:</td>
                        <td style="color: #1e293b; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">{project_name}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Source:</td>
                        <td style="color: #7c3aed; padding: 8px 0; font-size: 14px; text-align: right;">{source}</td>
                    </tr>
                </table>
                {f'<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9d5ff;"><strong style="color: #64748b;">Message:</strong><p style="color: #1e293b; margin: 8px 0 0;">{message}</p></div>' if message else ''}
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                Quick follow-up increases conversion rates by 80%.
            </p>
        """
        return EmailTemplates.base_template(content, "New Lead Inquiry")


class EmailService:
    """Main Email Service for ExlainERP"""
    
    @staticmethod
    def is_configured() -> bool:
        """Check if email service is configured"""
        return bool(RESEND_API_KEY)
    
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email using Resend API
        """
        if not EmailService.is_configured():
            # Mock mode - log to console
            print("\n" + "="*60)
            print("📧 [MOCK EMAIL] - Resend not configured")
            print("="*60)
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"Content: HTML Email ({len(html_content)} chars)")
            print("="*60 + "\n")
            return {
                "success": True,
                "provider": "mock",
                "message_id": f"mock_email_{datetime.now(timezone.utc).timestamp()}",
                "status": "sent",
                "mock": True
            }
        
        params = {
            "from": from_email or SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        try:
            # Run sync SDK in thread to keep FastAPI non-blocking
            email = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent to {to_email}: {email.get('id')}")
            return {
                "success": True,
                "provider": "resend",
                "message_id": email.get("id"),
                "status": "sent"
            }
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {
                "success": False,
                "provider": "resend",
                "error": str(e),
                "status": "failed"
            }
    
    @staticmethod
    async def send_welcome_email(to_email: str, name: str, tenant_name: str = "ExlainERP") -> Dict[str, Any]:
        """Send welcome email to new user"""
        html = EmailTemplates.welcome_email(name, tenant_name)
        return await EmailService.send_email(to_email, f"Welcome to {tenant_name}!", html)
    
    @staticmethod
    async def send_otp_email(to_email: str, name: str, otp: str, purpose: str = "verification") -> Dict[str, Any]:
        """Send OTP verification email"""
        html = EmailTemplates.otp_email(name, otp, purpose)
        return await EmailService.send_email(to_email, f"Your ExlainERP {purpose.title()} Code: {otp}", html)
    
    @staticmethod
    async def send_password_reset_email(to_email: str, name: str, otp: str) -> Dict[str, Any]:
        """Send password reset OTP email"""
        html = EmailTemplates.password_reset_email(name, otp)
        return await EmailService.send_email(to_email, "Password Reset - ExlainERP", html)
    
    @staticmethod
    async def send_booking_confirmation_email(
        to_email: str,
        customer_name: str,
        project_name: str,
        property_details: str,
        booking_id: str,
        booking_date: str,
        total_amount: str,
        paid_amount: str = "0"
    ) -> Dict[str, Any]:
        """Send booking confirmation email"""
        html = EmailTemplates.booking_confirmation_email(
            customer_name, project_name, property_details,
            booking_id, booking_date, total_amount, paid_amount
        )
        return await EmailService.send_email(to_email, f"Booking Confirmed - {project_name}", html)
    
    @staticmethod
    async def send_payment_confirmation_email(
        to_email: str,
        customer_name: str,
        amount: str,
        payment_date: str,
        payment_method: str,
        receipt_number: str,
        project_name: str
    ) -> Dict[str, Any]:
        """Send payment confirmation email"""
        html = EmailTemplates.payment_confirmation_email(
            customer_name, amount, payment_date, payment_method,
            receipt_number, project_name
        )
        return await EmailService.send_email(to_email, f"Payment Received - ₹{amount}", html)
    
    @staticmethod
    async def send_payment_reminder_email(
        to_email: str,
        customer_name: str,
        amount: str,
        due_date: str,
        project_name: str,
        property_details: str,
        days_until_due: int = 0,
        is_overdue: bool = False
    ) -> Dict[str, Any]:
        """Send payment reminder email"""
        html = EmailTemplates.payment_reminder_email(
            customer_name, amount, due_date, project_name,
            property_details, days_until_due, is_overdue
        )
        
        if is_overdue:
            subject = f"⚠️ Payment Overdue - ₹{amount}"
        elif days_until_due <= 3:
            subject = f"🔔 Payment Due in {days_until_due} day(s) - ₹{amount}"
        else:
            subject = f"Payment Reminder - Due on {due_date}"
        
        return await EmailService.send_email(to_email, subject, html)
    
    @staticmethod
    async def send_site_visit_confirmation_email(
        to_email: str,
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str,
        location: str,
        assigned_staff: str,
        contact_number: str
    ) -> Dict[str, Any]:
        """Send site visit confirmation email"""
        html = EmailTemplates.site_visit_confirmation_email(
            visitor_name, project_name, visit_date, visit_time,
            location, assigned_staff, contact_number
        )
        return await EmailService.send_email(to_email, f"Site Visit Confirmed - {project_name}", html)
    
    @staticmethod
    async def send_lead_inquiry_notification(
        to_email: str,
        lead_name: str,
        project_name: str,
        lead_phone: str,
        lead_email: str,
        message: str,
        source: str
    ) -> Dict[str, Any]:
        """Send lead inquiry notification to admin/staff"""
        html = EmailTemplates.lead_inquiry_email(
            lead_name, project_name, lead_phone, lead_email, message, source
        )
        return await EmailService.send_email(to_email, f"New Inquiry - {lead_name} ({project_name})", html)
