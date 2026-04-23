"""Automated scheduler service for reminders and notifications"""
import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.notification_service import NotificationService
from services.notification_templates import NotificationTemplates
from typing import Dict, Any
import os

class SchedulerService:
    """Service for automated reminders and scheduled tasks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.notification_service = NotificationService()
    
    async def send_payment_reminders(self) -> Dict[str, Any]:
        """Send payment reminders for upcoming due dates"""
        print("🔔 Checking payment reminders...")
        
        # Get reminder settings
        reminder_days = int(os.getenv('PAYMENT_REMINDER_DAYS', '3'))
        
        # Calculate target date (X days from now)
        target_date = (datetime.now(timezone.utc) + timedelta(days=reminder_days)).date()
        target_date_str = target_date.isoformat()
        
        # Find payment schedules due on target date
        schedules = await self.db.payment_schedules.find({
            'due_date': {
                '$gte': target_date_str,
                '$lt': (target_date + timedelta(days=1)).isoformat()
            },
            'status': 'pending',
            'deleted_at': None
        }, {'_id': 0}).to_list(length=None)
        
        sent_count = 0
        
        for schedule in schedules:
            # Get booking details
            booking = await self.db.bookings.find_one(
                {'id': schedule['booking_id']}, 
                {'_id': 0}
            )
            
            if not booking:
                continue
            
            # Get property details
            property_doc = await self.db.properties.find_one(
                {'id': booking['property_id']}, 
                {'_id': 0}
            )
            
            if not property_doc:
                continue
            
            # Send SMS reminder
            if booking.get('customer_phone'):
                try:
                    sms_response = await self.notification_service.send_sms(
                        booking['customer_phone'],
                        NotificationTemplates.get_payment_reminder_sms(
                            booking['customer_name'],
                            schedule['amount'],
                            schedule['due_date'],
                            property_doc.get('property_number', 'Property')
                        )
                    )
                    
                    # Log notification
                    await self.notification_service.log_notification(
                        self.db,
                        booking['customer_phone'],
                        'sms',
                        'payment_reminder',
                        f"Payment reminder: ₹{schedule['amount']}",
                        sms_response
                    )
                    
                    sent_count += 1
                except Exception as e:
                    print(f"Error sending SMS reminder: {e}")
            
            # Send Email reminder if email exists
            if booking.get('customer_email'):
                try:
                    email_html = NotificationTemplates.get_payment_reminder_email_html(
                        booking['customer_name'],
                        property_doc.get('property_number', 'Property'),
                        schedule['due_date'],
                        schedule['amount'],
                        0  # Not overdue yet
                    )
                    
                    email_response = await self.notification_service.send_email(
                        booking['customer_email'],
                        f"Payment Reminder - Due on {schedule['due_date']}",
                        email_html,
                        html=True
                    )
                    
                    # Log notification
                    await self.notification_service.log_notification(
                        self.db,
                        booking['customer_email'],
                        'email',
                        'payment_reminder',
                        f"Payment reminder: ₹{schedule['amount']}",
                        email_response
                    )
                    
                except Exception as e:
                    print(f"Error sending email reminder: {e}")
        
        print(f"✅ Sent {sent_count} payment reminders")
        return {
            'total_schedules': len(schedules),
            'reminders_sent': sent_count,
            'target_date': target_date_str
        }
    
    async def send_overdue_alerts(self) -> Dict[str, Any]:
        """Send alerts for overdue payments"""
        print("⚠️  Checking overdue payments...")
        
        today = datetime.now(timezone.utc).date().isoformat()
        
        # Find overdue payment schedules
        overdue_schedules = await self.db.payment_schedules.find({
            'due_date': {'$lt': today},
            'status': 'pending',
            'deleted_at': None
        }, {'_id': 0}).to_list(length=None)
        
        sent_count = 0
        
        for schedule in overdue_schedules:
            # Calculate days overdue
            due_date = datetime.fromisoformat(schedule['due_date']).date()
            days_overdue = (datetime.now(timezone.utc).date() - due_date).days
            
            # Get booking details
            booking = await self.db.bookings.find_one(
                {'id': schedule['booking_id']}, 
                {'_id': 0}
            )
            
            if not booking:
                continue
            
            # Get property details
            property_doc = await self.db.properties.find_one(
                {'id': booking['property_id']}, 
                {'_id': 0}
            )
            
            if not property_doc:
                continue
            
            # Send URGENT SMS
            if booking.get('customer_phone'):
                try:
                    sms_message = f"URGENT: Payment of ₹{schedule['amount']:,.2f} for {property_doc.get('property_number', 'Property')} is OVERDUE by {days_overdue} days. Please pay immediately to avoid penalties. - ExlainERP"
                    
                    sms_response = await self.notification_service.send_sms(
                        booking['customer_phone'],
                        sms_message
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        booking['customer_phone'],
                        'sms',
                        'overdue_alert',
                        sms_message,
                        sms_response
                    )
                    
                    sent_count += 1
                except Exception as e:
                    print(f"Error sending overdue SMS: {e}")
            
            # Send URGENT Email
            if booking.get('customer_email'):
                try:
                    email_html = NotificationTemplates.get_payment_reminder_email_html(
                        booking['customer_name'],
                        property_doc.get('property_number', 'Property'),
                        schedule['due_date'],
                        schedule['amount'],
                        days_overdue
                    )
                    
                    email_response = await self.notification_service.send_email(
                        booking['customer_email'],
                        f"URGENT: Payment Overdue - {days_overdue} Days",
                        email_html,
                        html=True
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        booking['customer_email'],
                        'email',
                        'overdue_alert',
                        f"Overdue: ₹{schedule['amount']}, {days_overdue} days",
                        email_response
                    )
                    
                except Exception as e:
                    print(f"Error sending overdue email: {e}")
        
        print(f"✅ Sent {sent_count} overdue alerts")
        return {
            'total_overdue': len(overdue_schedules),
            'alerts_sent': sent_count
        }
    
    async def send_follow_up_reminders(self) -> Dict[str, Any]:
        """Send follow-up reminders to staff"""
        print("📞 Checking follow-up reminders...")
        
        today = datetime.now(timezone.utc).date().isoformat()
        
        # Find follow-ups scheduled for today that are not completed
        follow_ups = await self.db.follow_ups.find({
            'scheduled_date': {
                '$gte': today,
                '$lt': (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
            },
            'completed': False,
            'deleted_at': None
        }, {'_id': 0}).to_list(length=None)
        
        sent_count = 0
        
        for follow_up in follow_ups:
            # Get staff details
            staff = await self.db.users.find_one(
                {'id': follow_up.get('assigned_to')}, 
                {'_id': 0}
            )
            
            if not staff:
                continue
            
            # Get lead details
            lead = await self.db.leads.find_one(
                {'id': follow_up['lead_id']}, 
                {'_id': 0}
            )
            
            if not lead:
                continue
            
            # Get follow-up type
            follow_up_type = await self.db.categories.find_one(
                {'id': follow_up.get('type_id')}, 
                {'_id': 0}
            )
            
            type_name = follow_up_type['name'] if follow_up_type else 'Follow-up'
            
            # Send SMS to staff
            if staff.get('phone'):
                try:
                    sms_message = NotificationTemplates.get_follow_up_reminder_sms(
                        staff['name'],
                        lead['name'],
                        type_name
                    )
                    
                    sms_response = await self.notification_service.send_sms(
                        staff['phone'],
                        sms_message
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        staff['phone'],
                        'sms',
                        'follow_up_reminder',
                        sms_message,
                        sms_response
                    )
                    
                    sent_count += 1
                except Exception as e:
                    print(f"Error sending follow-up reminder: {e}")
        
        print(f"✅ Sent {sent_count} follow-up reminders")
        return {
            'total_follow_ups': len(follow_ups),
            'reminders_sent': sent_count
        }
    
    async def send_site_visit_reminders(self) -> Dict[str, Any]:
        """
        Send reminders for site visits scheduled for tomorrow.
        Sends SMS/WhatsApp to visitors and reminder to assigned staff.
        """
        print("🏠 Checking site visit reminders...")
        
        # Get tomorrow's date
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Find site visits scheduled for tomorrow
        visits = await self.db.site_visits.find({
            'scheduled_date': tomorrow,
            'status': {'$in': ['scheduled', 'confirmed']},
        }, {'_id': 0}).to_list(length=None)
        
        if not visits:
            print(f"📅 No site visits scheduled for tomorrow ({tomorrow})")
            return {
                'target_date': tomorrow,
                'total_visits': 0,
                'visitor_reminders_sent': 0,
                'staff_reminders_sent': 0
            }
        
        visitor_sent = 0
        staff_sent = 0
        failed = 0
        
        for visit in visits:
            # Get project details for location
            project = await self.db.projects.find_one(
                {'id': visit.get('project_id')},
                {'_id': 0}
            )
            project_name = project.get('name', 'Property') if project else 'Property'
            location = project.get('address') if project else None
            
            # Get staff details
            staff = await self.db.users.find_one(
                {'id': visit.get('assigned_to')},
                {'_id': 0}
            )
            staff_name = visit.get('assigned_to_name', 'Our Team')
            staff_phone = staff.get('phone') if staff else None
            
            # Format time
            visit_date = visit.get('scheduled_date')
            visit_time = visit.get('scheduled_time', '10:00')
            
            # Format date for display
            try:
                date_obj = datetime.strptime(visit_date, "%Y-%m-%d")
                formatted_date = date_obj.strftime("%B %d, %Y")
            except:
                formatted_date = visit_date
            
            # Format time for display
            try:
                time_parts = visit_time.split(':')
                hour = int(time_parts[0])
                minute = time_parts[1] if len(time_parts) > 1 else '00'
                ampm = 'AM' if hour < 12 else 'PM'
                hour_12 = hour % 12 or 12
                formatted_time = f"{hour_12}:{minute} {ampm}"
            except:
                formatted_time = visit_time
            
            visitor_name = visit.get('visitor_name', 'Customer')
            visitor_phone = visit.get('visitor_mobile')
            visitor_email = visit.get('visitor_email')
            
            # ===== SEND VISITOR REMINDER =====
            if visitor_phone:
                try:
                    # Try WhatsApp first (more engaging)
                    whatsapp_msg = NotificationTemplates.get_site_visit_reminder_whatsapp(
                        visitor_name=visitor_name,
                        project_name=project_name,
                        visit_date=formatted_date,
                        visit_time=formatted_time,
                        staff_name=staff_name,
                        staff_phone=staff_phone,
                        location=location
                    )
                    
                    wa_response = await self.notification_service.send_whatsapp(
                        visitor_phone,
                        whatsapp_msg
                    )
                    
                    # Log WhatsApp notification
                    await self.notification_service.log_notification(
                        self.db,
                        visitor_phone,
                        'whatsapp',
                        'site_visit_reminder',
                        f"Site visit reminder for {project_name}",
                        wa_response
                    )
                    
                    # Also send SMS as backup
                    sms_msg = NotificationTemplates.get_site_visit_reminder_sms(
                        visitor_name=visitor_name,
                        project_name=project_name,
                        visit_date=formatted_date,
                        visit_time=formatted_time,
                        staff_name=staff_name,
                        staff_phone=staff_phone
                    )
                    
                    sms_response = await self.notification_service.send_sms(
                        visitor_phone,
                        sms_msg
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        visitor_phone,
                        'sms',
                        'site_visit_reminder',
                        sms_msg,
                        sms_response
                    )
                    
                    visitor_sent += 1
                    
                except Exception as e:
                    print(f"Error sending visitor reminder: {e}")
                    failed += 1
            
            # Send email reminder if visitor has email
            if visitor_email:
                try:
                    email_html = NotificationTemplates.get_site_visit_reminder_email_html(
                        visitor_name=visitor_name,
                        project_name=project_name,
                        visit_date=formatted_date,
                        visit_time=formatted_time,
                        staff_name=staff_name,
                        staff_phone=staff_phone,
                        location=location,
                        duration=visit.get('duration_minutes', 60)
                    )
                    
                    email_response = await self.notification_service.send_email(
                        visitor_email,
                        f"🏠 Site Visit Reminder - {project_name} - {formatted_date}",
                        email_html,
                        html=True
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        visitor_email,
                        'email',
                        'site_visit_reminder',
                        f"Site visit reminder email for {project_name}",
                        email_response
                    )
                    
                except Exception as e:
                    print(f"Error sending visitor email reminder: {e}")
            
            # ===== SEND STAFF REMINDER =====
            if staff and staff.get('phone'):
                try:
                    staff_sms = NotificationTemplates.get_site_visit_staff_reminder_sms(
                        staff_name=staff_name,
                        visitor_name=visitor_name,
                        visitor_phone=visitor_phone or 'N/A',
                        project_name=project_name,
                        visit_time=formatted_time
                    )
                    
                    staff_response = await self.notification_service.send_sms(
                        staff['phone'],
                        staff_sms
                    )
                    
                    await self.notification_service.log_notification(
                        self.db,
                        staff['phone'],
                        'sms',
                        'site_visit_staff_reminder',
                        staff_sms,
                        staff_response
                    )
                    
                    staff_sent += 1
                    
                except Exception as e:
                    print(f"Error sending staff reminder: {e}")
            
            # Update visit to mark reminder sent
            await self.db.site_visits.update_one(
                {'id': visit['id']},
                {'$set': {
                    'reminder_sent': True,
                    'reminder_sent_at': datetime.now(timezone.utc).isoformat()
                }}
            )
        
        print(f"✅ Site visit reminders: {visitor_sent} to visitors, {staff_sent} to staff, {failed} failed")
        return {
            'target_date': tomorrow,
            'total_visits': len(visits),
            'visitor_reminders_sent': visitor_sent,
            'staff_reminders_sent': staff_sent,
            'failed': failed
        }
    
    async def send_festival_greetings(self) -> Dict[str, Any]:
        """
        Send festival greetings on Republic Day (Jan 26) and Independence Day (Aug 15)
        Called daily by cron - only sends if today is a greeting day
        """
        print("🎉 Checking festival greetings...")
        
        today = datetime.now(timezone.utc).strftime("%m-%d")
        
        # Check if today is a greeting day
        festival = None
        if today == "01-26":
            festival = "republic_day"
        elif today == "08-15":
            festival = "independence_day"
        
        if not festival:
            print(f"📅 Today ({today}) is not a festival greeting day")
            return {
                'is_greeting_day': False,
                'today': today,
                'next_greeting': 'republic_day (01-26)' if today < '01-26' or today > '08-15' else 'independence_day (08-15)'
            }
        
        print(f"🎊 Today is {festival}! Sending greetings...")
        
        # Get all enabled tenant configs
        configs = await self.db.festival_greeting_configs.find(
            {"is_enabled": True},
            {"_id": 0}
        ).to_list(1000)
        
        if not configs:
            print("❌ No tenants have greetings enabled")
            return {
                'is_greeting_day': True,
                'festival': festival,
                'tenants_processed': 0,
                'total_sent': 0
            }
        
        # Message templates
        GREETING_MESSAGES = {
            "republic_day": "Warm wishes on Republic Day 🇮🇳\n– {company_name}",
            "independence_day": "Warm wishes on Independence Day 🇮🇳\n– {company_name}"
        }
        
        total_sent = 0
        total_failed = 0
        tenants_processed = 0
        
        for config in configs:
            tenant_id = config.get("tenant_id")
            company_name = config.get("company_name", "Your Company")
            
            # Get active recipients for this tenant
            recipients = await self.db.greeting_recipients.find(
                {
                    "tenant_id": tenant_id,
                    "is_active": True,
                    "opted_out": {"$ne": True}
                },
                {"_id": 0}
            ).to_list(10000)
            
            if not recipients:
                continue
            
            message = GREETING_MESSAGES[festival].format(company_name=company_name)
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            for recipient in recipients:
                # Create log entry
                log_entry = {
                    "id": str(__import__('uuid').uuid4()),
                    "tenant_id": tenant_id,
                    "festival": festival,
                    "festival_date": today_str,
                    "recipient_id": recipient.get("id"),
                    "recipient_name": recipient.get("name"),
                    "recipient_mobile": recipient.get("mobile"),
                    "message": message,
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Try to send SMS
                try:
                    sms_response = await self.notification_service.send_sms(
                        recipient["mobile"],
                        message
                    )
                    log_entry["status"] = "sent"
                    total_sent += 1
                except Exception as e:
                    log_entry["status"] = "failed"
                    log_entry["error_message"] = str(e)
                    total_failed += 1
                
                # Save log
                await self.db.greeting_logs.insert_one(log_entry)
            
            tenants_processed += 1
        
        print(f"✅ Festival greetings: {total_sent} sent, {total_failed} failed across {tenants_processed} tenants")
        return {
            'is_greeting_day': True,
            'festival': festival,
            'tenants_processed': tenants_processed,
            'total_sent': total_sent,
            'total_failed': total_failed
        }
    
    async def run_all_tasks(self) -> Dict[str, Any]:
        """Run all scheduled tasks"""
        print("🚀 Starting scheduled tasks...")
        print("=" * 60)
        
        results = {}
        
        # Run payment reminders
        try:
            results['payment_reminders'] = await self.send_payment_reminders()
        except Exception as e:
            print(f"Error in payment reminders: {e}")
            results['payment_reminders'] = {'error': str(e)}
        
        # Run overdue alerts
        try:
            results['overdue_alerts'] = await self.send_overdue_alerts()
        except Exception as e:
            print(f"Error in overdue alerts: {e}")
            results['overdue_alerts'] = {'error': str(e)}
        
        # Run follow-up reminders
        try:
            results['follow_up_reminders'] = await self.send_follow_up_reminders()
        except Exception as e:
            print(f"Error in follow-up reminders: {e}")
            results['follow_up_reminders'] = {'error': str(e)}
        
        # Run site visit reminders
        try:
            results['site_visit_reminders'] = await self.send_site_visit_reminders()
        except Exception as e:
            print(f"Error in site visit reminders: {e}")
            results['site_visit_reminders'] = {'error': str(e)}
        
        # Run festival greetings check
        try:
            results['festival_greetings'] = await self.send_festival_greetings()
        except Exception as e:
            print(f"Error in festival greetings: {e}")
            results['festival_greetings'] = {'error': str(e)}
        
        print("=" * 60)
        print("✅ All scheduled tasks completed")
        
        return results
