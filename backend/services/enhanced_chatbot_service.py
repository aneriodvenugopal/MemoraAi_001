"""
Enhanced ExlainERP Chatbot Service
Complete conversation flow with lead capture, verification, advisory, and scheduling
100% FREE for all users
"""
import os
import random
import re
from typing import Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class EnhancedChatbotService:
    """
    Smart chatbot with complete conversation flow:
    1. Feature guidance (free)
    2. Requirement gathering
    3. Feedback collection
    4. Contact information capture
    5. Mobile verification (OTP)
    6. Instant advisory
    7. Expert appointment scheduling
    """
    
    def __init__(self):
        self.conversation_states = {}
    
    async def chat(self, 
                   conversation_id: str,
                   user_message: str,
                   conversation_history: List[Dict] = None,
                   user_context: Dict = None,
                   context: Dict = None) -> Dict:
        """
        Main chat function with intelligent flow
        
        Returns:
            {
                "message": str,
                "action": str,  # "continue", "send_otp", "verify_otp", "show_advisory", "schedule_appointment"
                "data": dict
            }
        """
        
        msg = user_message.lower().strip()
        
        # Get current conversation state
        state = self.conversation_states.get(conversation_id, {
            "stage": "initial",
            "user_data": {},
            "requirements": {},
            "feedback": None,
            "verified": False,
            "context": context or {}
        })
        
        # Update context if provided
        if context:
            state["context"] = context
        
        # Check if this is project-specific chat
        is_project_chat = context and context.get('project_id') if context else False
        project_name = context.get('project_name') if context else None
        
        # Stage 1: Initial greeting & feature guidance
        if state["stage"] == "initial":
            return await self._handle_initial_stage(msg, conversation_id, state)
        
        # Stage 2: Requirement gathering
        elif state["stage"] == "gathering_requirements":
            return await self._handle_requirements_stage(msg, conversation_id, state)
        
        # Stage 3: Feedback collection
        elif state["stage"] == "collecting_feedback":
            return await self._handle_feedback_stage(msg, conversation_id, state)
        
        # Stage 4: Contact information
        elif state["stage"] == "requesting_contact":
            return await self._handle_contact_stage(msg, conversation_id, state)
        
        # Stage 5: OTP verification
        elif state["stage"] == "verifying_otp":
            return await self._handle_otp_stage(msg, conversation_id, state)
        
        # Stage 6: Provide advisory
        elif state["stage"] == "providing_advisory":
            return await self._handle_advisory_stage(msg, conversation_id, state)
        
        # Stage 7: Schedule expert call
        elif state["stage"] == "scheduling_call":
            return await self._handle_scheduling_stage(msg, conversation_id, state)
        
        # Default: Answer questions
        return await self._handle_general_query(msg, conversation_id, state)
    
    async def _handle_initial_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 1: Greet and offer help"""
        
        project_name = state.get("context", {}).get("project_name")
        is_project_chat = bool(state.get("context", {}).get("project_id"))
        
        # Project-specific welcome
        if is_project_chat and project_name:
            if msg in ["1", "property", "details"]:
                response = f"""**{project_name} - Property Details** 🏘️

I can help you with:

1️⃣ Available Units & Floor Plans
2️⃣ Pricing & Payment Options
3️⃣ Amenities & Facilities
4️⃣ Location Benefits
5️⃣ Construction Status
6️⃣ Documentation & RERA

**What would you like to know? (Type number)**"""
                
                state["stage"] = "gathering_requirements"
                self.conversation_states[conv_id] = state
                
                return {
                    "message": response,
                    "action": "continue",
                    "data": {}
                }
            
            elif msg in ["4", "visit", "schedule"]:
                response = f"""**Schedule Site Visit - {project_name}** 📅

Great choice! Let me help you schedule a visit.

**Preferred Date? (Type number or date)**

1️⃣ Today
2️⃣ Tomorrow
3️⃣ This Weekend
4️⃣ Next Week

**Preferred Time?**

5️⃣ Morning (10 AM - 12 PM)
6️⃣ Afternoon (2 PM - 4 PM)
7️⃣ Evening (4 PM - 6 PM)

Type: "2 6" for Tomorrow Afternoon
Or: "Tomorrow at 3 PM"
"""
                
                state["stage"] = "scheduling_call"
                self.conversation_states[conv_id] = state
                
                return {
                    "message": response,
                    "action": "continue",
                    "data": {}
                }
        
        # Check if asking about features or user typed "1"
        if any(word in msg for word in ["feature", "what can", "help", "how does", "what is"]) or msg in ["1", "one"]:
            response = """Hello! 👋 I'm your ExlainERP Assistant!

**Our Key Features:**

1️⃣ Property Management - Browse projects, layouts, availability
2️⃣ Payment Tracking - EMI plans, payment schedules
3️⃣ Analytics Dashboard - Real-time business insights
4️⃣ Lead Management - Never miss a customer
5️⃣ Mobile App - Manage on-the-go
6️⃣ AI Advisory - Expert property advice

**What interests you? (Type number)**

Type: 1, 2, 3, 4, 5, or 6
Or type 0 to continue conversation"""
            
            state["stage"] = "gathering_requirements"
            self.conversation_states[conv_id] = state
            
            return {
                "message": response,
                "action": "continue",
                "data": {}
            }
        
        # Default greeting
        response = """Hello! 👋 Welcome to ExlainERP!

I'm here to help you explore our real estate ERP platform.

**Please select an option (just type the number):**

1️⃣ Learn about our features
2️⃣ Get property advisory
3️⃣ See how we can help your business
4️⃣ Talk to our team

Type: 1, 2, 3, or 4"""
        
        state["stage"] = "gathering_requirements"
        self.conversation_states[conv_id] = state
        
        return {
            "message": response,
            "action": "continue",
            "data": {}
        }
    
    async def _handle_requirements_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 2: Gather requirements"""
        
        # Save requirement
        if "requirements" not in state:
            state["requirements"] = {}
        
        state["requirements"]["user_query"] = msg
        
        # Check what they're interested in
        if any(word in msg for word in ["property", "buy", "invest", "flat", "plot", "villa", "2", "two"]) or msg in ["2", "6"]:
            response = """Great! I can help you with property advisory. 🏡

**Please share your preferences (type numbers):**

**Budget Range:**
1️⃣ Under 25 Lakhs
2️⃣ 25-50 Lakhs
3️⃣ 50 Lakhs - 1 Crore
4️⃣ 1-2 Crores
5️⃣ Above 2 Crores

**Property Type:**
6️⃣ Apartment/Flat
7️⃣ Villa/Independent House
8️⃣ Plot/Land
9️⃣ Commercial Space

**Or type your requirements directly!**
Example: "50 lakhs budget, looking for flat in Banjara Hills"

"""
            
            state["stage"] = "collecting_feedback"
            
        elif any(word in msg for word in ["business", "company", "manage", "crm", "erp", "3", "three"]) or msg == "3":
            response = """Perfect! ExlainERP can streamline your real estate business. 📈

**What's your biggest challenge? (Select number)**

1️⃣ Lead Management - Too many leads getting lost
2️⃣ Payment Tracking - Hard to track EMIs & dues
3️⃣ Team Coordination - Communication issues
4️⃣ Reporting - Need better insights
5️⃣ Customer Follow-ups - Missing opportunities
6️⃣ All of the above!

Type: 1, 2, 3, 4, 5, or 6"""
            
            state["stage"] = "collecting_feedback"
        
        else:
            response = f"""Got it! You're interested in: {msg}

**Before I provide detailed information, please select:**

**You are a:**
1️⃣ Property Buyer
2️⃣ Real Estate Professional/Agent
3️⃣ Real Estate Company/Builder
4️⃣ Investor

**What information would help you most:**
5️⃣ Pricing & Plans
6️⃣ Feature Details
7️⃣ Demo/Trial
8️⃣ Talk to Expert

Type the number(s) that match you!"""
            
            state["stage"] = "collecting_feedback"
        
        self.conversation_states[conv_id] = state
        
        return {
            "message": response,
            "action": "continue",
            "data": {}
        }
    
    async def _handle_feedback_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 3: Collect feedback and request contact"""
        
        state["feedback"] = msg
        
        response = """Thank you for sharing! 😊

I have some great insights and recommendations for you.

To provide personalized assistance and keep you updated, could you please share:

📱 **Your mobile number**
📧 **Your name** (optional)

Don't worry - we respect your privacy and will only use this to help you better!"""
        
        state["stage"] = "requesting_contact"
        self.conversation_states[conv_id] = state
        
        return {
            "message": response,
            "action": "continue",
            "data": {}
        }
    
    async def _handle_contact_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 4: Extract and verify contact information"""
        
        # Extract phone number
        phone_match = re.search(r'\b[6-9]\d{9}\b', msg)
        
        if phone_match:
            phone = phone_match.group()
            state["user_data"]["phone"] = phone
            
            # Extract name if provided
            words = msg.split()
            potential_name = " ".join([w for w in words if not w.isdigit() and len(w) > 2])
            if potential_name:
                state["user_data"]["name"] = potential_name.strip()
            
            # Generate OTP
            otp = str(random.randint(100000, 999999))
            state["otp"] = otp
            state["otp_verified"] = False
            
            name_part = f"{state['user_data'].get('name', 'there')}, " if state['user_data'].get('name') else ""
            
            response = f"""Perfect! {name_part}Thank you! 🎉

📱 Verification code sent to **{phone}**

**OTP: {otp}** (Demo - showing OTP for testing)

Please type the 6-digit OTP to verify."""
            
            state["stage"] = "verifying_otp"
            self.conversation_states[conv_id] = state
            
            return {
                "message": response,
                "action": "send_otp",
                "data": {
                    "phone": phone,
                    "otp": otp,
                    "name": state["user_data"].get("name")
                }
            }
        else:
            response = """I couldn't find a valid mobile number. 📱

Please share your 10-digit mobile number.

Example: 9876543210"""
            
            return {
                "message": response,
                "action": "continue",
                "data": {}
            }
    
    async def _handle_otp_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 5: Verify OTP"""
        
        # Extract OTP from message
        otp_match = re.search(r'\b\d{6}\b', msg)
        
        if otp_match:
            entered_otp = otp_match.group()
            
            if entered_otp == state.get("otp"):
                state["otp_verified"] = True
                state["verified_at"] = datetime.now().isoformat()
                
                name_part = f"{state['user_data'].get('name', 'there')}, " if state['user_data'].get('name') else ""
                
                response = f"""✅ **Verified Successfully!** {name_part}

Great news! Now you can:

**Select an option (type number):**

1️⃣ Get Instant Advisory - Based on your requirements
2️⃣ Schedule Expert Call - Talk to our consultants
3️⃣ Both - Get advisory + schedule call

Type: 1, 2, or 3"""
                
                state["stage"] = "providing_advisory"
                self.conversation_states[conv_id] = state
                
                return {
                    "message": response,
                    "action": "verify_otp",
                    "data": {
                        "verified": True,
                        "user_data": state["user_data"]
                    }
                }
            else:
                response = f"""❌ Invalid OTP!

The code you entered doesn't match. Please try again.

Expected: {state.get('otp')}
(Demo mode - showing correct OTP)"""
                
                return {
                    "message": response,
                    "action": "continue",
                    "data": {"verified": False}
                }
        else:
            response = """Please enter the 6-digit OTP sent to your mobile number.

Example: 123456"""
            
            return {
                "message": response,
                "action": "continue",
                "data": {}
            }
    
    async def _handle_advisory_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 6: Provide advisory or move to scheduling"""
        
        if msg in ["1", "advisory", "both", "3"]:
            # Trigger advisory (will be handled by frontend to call advisory API)
            response = f"""📊 **Preparing Your Advisory...**

Based on your requirements:
• {state.get('requirements', {}).get('user_query', 'Property search')}
• Budget and location preferences

Generating detailed advisory now!

*(Advisory form will open with your details)*"""
            
            if msg in ["both", "3"]:
                state["stage"] = "scheduling_call"
                response += "\n\n✅ Great! After reviewing advisory, let's schedule your expert call..."
            
            self.conversation_states[conv_id] = state
            
            return {
                "message": response,
                "action": "show_advisory",
                "data": {
                    "requirements": state.get("requirements"),
                    "user_data": state.get("user_data")
                }
            }
        
        elif msg in ["2", "schedule", "call"]:
            response = """📞 **Schedule Expert Consultation**

Our property experts are ready to help!

**Preferred Date? (Select or type)**

1️⃣ Today
2️⃣ Tomorrow
3️⃣ Day After Tomorrow
4️⃣ This Weekend
5️⃣ Other (please specify date)

**Preferred Time?**

6️⃣ Morning (9 AM - 12 PM)
7️⃣ Afternoon (12 PM - 3 PM)
8️⃣ Evening (3 PM - 6 PM)
9️⃣ Night (6 PM - 9 PM)

**Type date and time numbers (e.g., "2 7" for Tomorrow Afternoon)**
Or type directly: "Tomorrow at 3 PM"
"""
            
            state["stage"] = "scheduling_call"
            self.conversation_states[conv_id] = state
            
            return {
                "message": response,
                "action": "continue",
                "data": {}
            }
        
        else:
            response = """**Select an option (type number):**

1️⃣ Instant Advisory - Get recommendations now
2️⃣ Expert Call - Schedule consultation
3️⃣ Both - Advisory + Expert call

Type: 1, 2, or 3"""
            
            return {
                "message": response,
                "action": "continue",
                "data": {}
            }
    
    async def _handle_scheduling_stage(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Stage 7: Schedule expert appointment"""
        
        # Extract date and time from message
        schedule_info = {
            "raw_request": msg,
            "date": "Not specified",
            "time": "Not specified",
            "special_request": ""
        }
        
        # Number-based date selection
        date_map = {
            "1": "Today",
            "2": "Tomorrow", 
            "3": "Day After Tomorrow",
            "4": "This Weekend"
        }
        
        # Number-based time selection
        time_map = {
            "6": "Morning (9 AM - 12 PM)",
            "7": "Afternoon (12 PM - 3 PM)",
            "8": "Evening (3 PM - 6 PM)",
            "9": "Night (6 PM - 9 PM)"
        }
        
        # Check for number inputs
        for num, date in date_map.items():
            if num in msg:
                schedule_info["date"] = date
                break
        
        for num, time in time_map.items():
            if num in msg:
                schedule_info["time"] = time
                break
        
        # Simple date extraction from text
        if schedule_info["date"] == "Not specified":
            if any(word in msg.lower() for word in ["tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]):
                words = msg.lower().split()
                for word in words:
                    if word in ["tomorrow", "today", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]:
                        schedule_info["date"] = word.capitalize()
                        break
        
        # Simple time extraction from text
        if schedule_info["time"] == "Not specified":
            time_match = re.search(r'\b(\d{1,2})\s*(am|pm|AM|PM)\b', msg)
            if time_match:
                schedule_info["time"] = time_match.group()
            elif any(word in msg.lower() for word in ["morning", "afternoon", "evening", "night"]):
                for word in ["morning", "afternoon", "evening", "night"]:
                    if word in msg.lower():
                        schedule_info["time"] = word.capitalize()
                        break
        
        # Extract special request
        schedule_info["special_request"] = msg
        
        state["appointment"] = schedule_info
        state["stage"] = "completed"
        self.conversation_states[conv_id] = state
        
        name = state["user_data"].get("name", "there")
        phone = state["user_data"].get("phone", "your number")
        
        response = f"""✅ **Appointment Scheduled!**

Thank you, {name}! Your consultation is booked.

📋 **Details:**
• 📅 Date: {schedule_info['date']}
• ⏰ Time: {schedule_info['time']}
• 📱 Contact: {phone}
• 📝 Request: {schedule_info['special_request'][:100]}

**What happens next:**
1. Our expert will review your requirements
2. You'll receive a confirmation call
3. We'll contact you at your preferred time

**You can also:**
• Get instant advisory (type "advisory")
• Ask any questions (I'm here to help!)

Looking forward to helping you find your perfect property! 🏡"""
        
        return {
            "message": response,
            "action": "schedule_appointment",
            "data": {
                "appointment": schedule_info,
                "user_data": state["user_data"],
                "requirements": state.get("requirements")
            }
        }
    
    async def _handle_general_query(self, msg: str, conv_id: str, state: Dict) -> Dict:
        """Handle general questions at any stage"""
        
        # Feature questions
        if any(word in msg for word in ["feature", "what can", "how does", "price", "cost"]):
            response = """**ExlainERP Features:**

1️⃣ Property Management - Layouts, availability
2️⃣ Payment Automation - Razorpay/Stripe
3️⃣ Analytics - Real-time dashboards
4️⃣ CRM - Lead management
5️⃣ Mobile App - iOS & Android
6️⃣ AI Advisory - Property recommendations

**Select a feature to learn more (type number)**

Or type:
7️⃣ See Pricing
8️⃣ Schedule Demo
9️⃣ Talk to Expert"""
            
        else:
            response = """**I'm here to help!**

**What would you like to know? (Type number)**

1️⃣ ExlainERP Features
2️⃣ Pricing & Plans
3️⃣ Property Advisory
4️⃣ Schedule Expert Call
5️⃣ How Platform Works
6️⃣ Request Demo

Type: 1, 2, 3, 4, 5, or 6"""
        
        return {
            "message": response,
            "action": "continue",
            "data": {}
        }

# Singleton
enhanced_chatbot = EnhancedChatbotService()
