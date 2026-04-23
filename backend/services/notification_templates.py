"""Notification templates for different types of messages"""
from typing import Dict, Any
from datetime import datetime

class NotificationTemplates:
    """Pre-defined templates for various notifications"""
    
    @staticmethod
    def get_otp_sms(otp: str) -> str:
        """OTP SMS template"""
        return f"Your MemoraAI verification code is: {otp}. Valid for 10 minutes. Do not share this code with anyone."
    
    @staticmethod
    def get_payment_reminder_sms(customer_name: str, amount: float, due_date: str, property_name: str) -> str:
        """Payment reminder SMS template"""
        return (
            f"Dear {customer_name}, reminder: Payment of ₹{amount:,.2f} for {property_name} "
            f"is due on {due_date}. Please make payment to avoid penalties. - MemoraAI"
        )
    
    @staticmethod
    def get_booking_confirmation_sms(customer_name: str, property_name: str, booking_id: str) -> str:
        """Booking confirmation SMS template"""
        return (
            f"Dear {customer_name}, your booking for {property_name} is confirmed! "
            f"Booking ID: {booking_id}. Thank you for choosing us. - MemoraAI"
        )
    
    @staticmethod
    def get_follow_up_reminder_sms(staff_name: str, lead_name: str, follow_up_type: str) -> str:
        """Follow-up reminder SMS template"""
        return (
            f"Hi {staff_name}, reminder: {follow_up_type} scheduled with {lead_name}. "
            f"Please follow up today. - MemoraAI"
        )
    
    @staticmethod
    def get_welcome_email_html(customer_name: str, login_url: str) -> str:
        """Welcome email HTML template"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to MemoraAI!</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    <p>Welcome to MemoraAI - Your Complete Real Estate Automation Solution!</p>
                    <p>We're excited to have you on board. You can now:</p>
                    <ul>
                        <li>Track your property bookings</li>
                        <li>View payment schedules</li>
                        <li>Access property documents</li>
                        <li>Get updates on your investments</li>
                    </ul>
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Login to Your Account</a>
                    </p>
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                    <p>Best regards,<br>The MemoraAI Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 MemoraAI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def get_booking_confirmation_email_html(
        customer_name: str,
        property_name: str,
        booking_id: str,
        booking_date: str,
        total_amount: float,
        booking_amount: float,
        payment_plan: str
    ) -> str:
        """Booking confirmation email HTML template"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .details {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                .details-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
                .label {{ font-weight: bold; color: #666; }}
                .value {{ color: #333; }}
                .highlight {{ background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Booking Confirmed!</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    <p>Congratulations! Your booking has been confirmed successfully.</p>
                    
                    <div class="details">
                        <h3 style="margin-top: 0;">Booking Details</h3>
                        <div class="details-row">
                            <span class="label">Booking ID:</span>
                            <span class="value">{booking_id}</span>
                        </div>
                        <div class="details-row">
                            <span class="label">Property:</span>
                            <span class="value">{property_name}</span>
                        </div>
                        <div class="details-row">
                            <span class="label">Booking Date:</span>
                            <span class="value">{booking_date}</span>
                        </div>
                        <div class="details-row">
                            <span class="label">Total Amount:</span>
                            <span class="value">₹{total_amount:,.2f}</span>
                        </div>
                        <div class="details-row">
                            <span class="label">Booking Amount Paid:</span>
                            <span class="value">₹{booking_amount:,.2f}</span>
                        </div>
                        <div class="details-row">
                            <span class="label">Payment Plan:</span>
                            <span class="value">{payment_plan}</span>
                        </div>
                    </div>
                    
                    <div class="highlight">
                        <strong>Next Steps:</strong>
                        <ul>
                            <li>You will receive your payment schedule shortly</li>
                            <li>Property documents will be shared within 2-3 business days</li>
                            <li>Our team will contact you for further documentation</li>
                        </ul>
                    </div>
                    
                    <p>Thank you for choosing us. We look forward to serving you!</p>
                    <p>Best regards,<br>The MemoraAI Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 MemoraAI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def get_payment_receipt_email_html(
        customer_name: str,
        property_name: str,
        payment_date: str,
        amount: float,
        payment_mode: str,
        receipt_no: str,
        balance_amount: float
    ) -> str:
        """Payment receipt email HTML template"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .receipt {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px dashed #667eea; }}
                .receipt-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
                .amount-paid {{ font-size: 24px; color: #28a745; font-weight: bold; text-align: center; padding: 20px; background: #d4edda; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💳 Payment Receipt</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    <p>Thank you for your payment. This is to confirm that we have received your payment.</p>
                    
                    <div class="receipt">
                        <h3 style="margin-top: 0; text-align: center; color: #667eea;">PAYMENT RECEIPT</h3>
                        <div class="receipt-row">
                            <span>Receipt No:</span>
                            <span><strong>{receipt_no}</strong></span>
                        </div>
                        <div class="receipt-row">
                            <span>Date:</span>
                            <span>{payment_date}</span>
                        </div>
                        <div class="receipt-row">
                            <span>Property:</span>
                            <span>{property_name}</span>
                        </div>
                        <div class="receipt-row">
                            <span>Payment Mode:</span>
                            <span>{payment_mode}</span>
                        </div>
                    </div>
                    
                    <div class="amount-paid">
                        Amount Paid: ₹{amount:,.2f}
                    </div>
                    
                    <p><strong>Remaining Balance:</strong> ₹{balance_amount:,.2f}</p>
                    
                    <p>This is a system-generated receipt. Please keep it for your records.</p>
                    <p>Best regards,<br>The MemoraAI Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 MemoraAI. All rights reserved.</p>
                    <p>This is an automatically generated email. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def get_payment_reminder_email_html(
        customer_name: str,
        property_name: str,
        due_date: str,
        amount: float,
        overdue_days: int = 0
    ) -> str:
        """Payment reminder email HTML template"""
        is_overdue = overdue_days > 0
        subject_prefix = "URGENT: " if is_overdue else ""
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: {'#dc3545' if is_overdue else '#ffc107'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .alert {{ background: {'#f8d7da' if is_overdue else '#fff3cd'}; padding: 15px; border-left: 4px solid {'#dc3545' if is_overdue else '#ffc107'}; margin: 20px 0; }}
                .amount {{ font-size: 24px; font-weight: bold; text-align: center; padding: 20px; background: white; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{'⚠️ Payment Overdue!' if is_overdue else '⏰ Payment Reminder'}</h1>
                </div>
                <div class="content">
                    <p>Dear {customer_name},</p>
                    <p>This is a {'friendly' if not is_overdue else 'urgent'} reminder about your upcoming payment for {property_name}.</p>
                    
                    <div class="alert">
                        <strong>{'Payment Overdue!' if is_overdue else 'Payment Due Soon'}</strong><br>
                        {'Your payment is overdue by ' + str(overdue_days) + ' days.' if is_overdue else 'Please ensure timely payment to avoid penalties.'}
                    </div>
                    
                    <div class="amount">
                        Amount Due: ₹{amount:,.2f}
                    </div>
                    
                    <p><strong>Due Date:</strong> {due_date}</p>
                    
                    <p>Please make the payment at your earliest convenience. You can make payment through:</p>
                    <ul>
                        <li>Bank Transfer</li>
                        <li>UPI</li>
                        <li>Cheque</li>
                        <li>Card Payment</li>
                    </ul>
                    
                    <p>For any queries, please contact our accounts team.</p>
                    <p>Best regards,<br>The MemoraAI Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 MemoraAI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    @staticmethod
    def get_property_details_whatsapp(property_name: str, property_type: str, size: str, price: float, location: str) -> str:
        """Property details WhatsApp message template"""
        return f"""
🏠 *Property Details*

*Name:* {property_name}
*Type:* {property_type}
*Size:* {size}
*Price:* ₹{price:,.2f}
*Location:* {location}

For more details, please contact us or visit our office.

*MemoraAI* - Your Real Estate Partner
        """.strip()
    
    # ==================== SITE VISIT REMINDERS ====================
    
    @staticmethod
    def get_site_visit_reminder_sms(
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str,
        staff_name: str,
        staff_phone: str = None
    ) -> str:
        """Site visit reminder SMS template for visitors"""
        contact_info = f" Contact: {staff_phone}" if staff_phone else ""
        return (
            f"Dear {visitor_name}, reminder: Your site visit at {project_name} is scheduled for "
            f"{visit_date} at {visit_time}. {staff_name} will assist you.{contact_info} - MemoraAI"
        )
    
    @staticmethod
    def get_site_visit_reminder_whatsapp(
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str,
        staff_name: str,
        staff_phone: str = None,
        location: str = None
    ) -> str:
        """Site visit reminder WhatsApp template for visitors"""
        location_line = f"\n📍 *Location:* {location}" if location else ""
        contact_line = f"\n📞 *Contact:* {staff_phone}" if staff_phone else ""
        
        return f"""
🏠 *Site Visit Reminder*

Hello {visitor_name}! 👋

Your property site visit is scheduled:

📅 *Date:* {visit_date}
⏰ *Time:* {visit_time}
🏗️ *Project:* {project_name}{location_line}
👤 *Your Guide:* {staff_name}{contact_line}

Please arrive 10-15 minutes early. Carry a valid ID proof.

Need to reschedule? Reply to this message or call us.

Looking forward to seeing you! 🙂

*MemoraAI* - Your Real Estate Partner
        """.strip()
    
    @staticmethod
    def get_site_visit_staff_reminder_sms(
        staff_name: str,
        visitor_name: str,
        visitor_phone: str,
        project_name: str,
        visit_time: str
    ) -> str:
        """Site visit reminder SMS template for staff"""
        return (
            f"Hi {staff_name}, reminder: Site visit with {visitor_name} ({visitor_phone}) "
            f"at {project_name} today at {visit_time}. Please be prepared. - MemoraAI"
        )
    
    @staticmethod
    def get_site_visit_confirmation_sms(
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str
    ) -> str:
        """Site visit confirmation SMS when visit is scheduled"""
        return (
            f"Dear {visitor_name}, your site visit at {project_name} is confirmed for "
            f"{visit_date} at {visit_time}. We'll send you a reminder before your visit. - MemoraAI"
        )
    
    @staticmethod
    def get_site_visit_reminder_email_html(
        visitor_name: str,
        project_name: str,
        visit_date: str,
        visit_time: str,
        staff_name: str,
        staff_phone: str = None,
        location: str = None,
        duration: int = 60
    ) -> str:
        """Site visit reminder email HTML template"""
        contact_info = f"<br>📞 Contact: <a href='tel:{staff_phone}'>{staff_phone}</a>" if staff_phone else ""
        location_info = f"<br>📍 Location: {location}" if location else ""
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .visit-card {{ background: white; padding: 25px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .visit-detail {{ display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }}
                .visit-detail:last-child {{ border-bottom: none; }}
                .icon {{ font-size: 20px; margin-right: 15px; }}
                .tips {{ background: #e8f4fd; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 0 5px 5px 0; }}
                .button {{ display: inline-block; padding: 14px 30px; background: #3b82f6; color: white !important; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; }}
                .button.secondary {{ background: #6b7280; }}
                .cta {{ text-align: center; margin: 25px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏠 Site Visit Reminder</h1>
                    <p style="margin: 0; opacity: 0.9;">Your visit is tomorrow!</p>
                </div>
                <div class="content">
                    <p>Dear {visitor_name},</p>
                    <p>This is a friendly reminder about your upcoming property site visit. We're excited to show you around!</p>
                    
                    <div class="visit-card">
                        <h3 style="margin-top: 0; color: #1d4ed8;">📋 Visit Details</h3>
                        <div class="visit-detail">
                            <span class="icon">🏗️</span>
                            <div>
                                <strong>Project</strong><br>
                                {project_name}
                            </div>
                        </div>
                        <div class="visit-detail">
                            <span class="icon">📅</span>
                            <div>
                                <strong>Date & Time</strong><br>
                                {visit_date} at {visit_time}
                            </div>
                        </div>
                        <div class="visit-detail">
                            <span class="icon">⏱️</span>
                            <div>
                                <strong>Duration</strong><br>
                                Approximately {duration} minutes
                            </div>
                        </div>
                        <div class="visit-detail">
                            <span class="icon">👤</span>
                            <div>
                                <strong>Your Guide</strong><br>
                                {staff_name}{contact_info}
                            </div>
                        </div>
                        {f'<div class="visit-detail"><span class="icon">📍</span><div><strong>Location</strong><br>{location}</div></div>' if location else ''}
                    </div>
                    
                    <div class="tips">
                        <strong>📝 Tips for your visit:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Arrive 10-15 minutes early</li>
                            <li>Carry a valid ID proof</li>
                            <li>Wear comfortable shoes for walking</li>
                            <li>Prepare any questions you'd like to ask</li>
                        </ul>
                    </div>
                    
                    <div class="cta">
                        <p><strong>Need to make changes?</strong></p>
                        <a href="tel:{staff_phone}" class="button">📞 Call Us</a>
                    </div>
                    
                    <p>We look forward to meeting you!</p>
                    <p>Best regards,<br>The MemoraAI Team</p>
                </div>
                <div class="footer">
                    <p>© 2025 MemoraAI. All rights reserved.</p>
                    <p>This is an automated reminder. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
