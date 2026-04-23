"""
Simple & Sharp Chatbot Service
Quick answers → Contact capture → Done!
100% FREE template-based responses
"""
import re
import random
from typing import Dict, List

class SimpleChatbotService:
    """
    Simple chatbot flow:
    1. Answer questions (template-based)
    2. Ask for contact details
    3. Capture date/time preference
    4. Thank you & done!
    """
    
    def __init__(self):
        self.conversation_states = {}
    
    async def chat(self, conversation_id: str, user_message: str, context: Dict = None) -> Dict:
        """
        Simple chat function
        """
        msg = user_message.lower().strip()
        
        # Get state
        state = self.conversation_states.get(conversation_id, {
            "stage": "answering",
            "questions_count": 0,
            "user_data": {},
            "context": context or {}
        })
        
        project_name = context.get('project_name') if context else None
        
        # Stage 1: Answer questions (max 2-3)
        if state["stage"] == "answering":
            state["questions_count"] += 1
            
            # Get answer
            answer = self._get_quick_answer(msg, project_name)
            
            # After 2 questions, ask for contact
            if state["questions_count"] >= 2:
                answer += "\n\n---\n\n📞 **Want to know more?**\n\nShare your contact details and our experts will reach out!\n\n**Please provide:**\n• Your Name\n• Mobile Number\n\nExample: Rajesh Kumar, 9876543210"
                state["stage"] = "contact_capture"
            
            self.conversation_states[conversation_id] = state
            
            return {
                "message": answer,
                "action": "continue",
                "stage": state["stage"]
            }
        
        # Stage 2: Capture contact details
        elif state["stage"] == "contact_capture":
            # Extract name and phone
            phone_match = re.search(r'\b[6-9]\d{9}\b', msg)
            
            if phone_match:
                phone = phone_match.group()
                
                # Extract name (words that are not the phone number)
                words = msg.replace(phone, '').strip()
                name = ' '.join([w for w in words.split() if not w.isdigit() and len(w) > 1])[:50]
                
                state["user_data"]["name"] = name or "Customer"
                state["user_data"]["phone"] = phone
                state["stage"] = "schedule_preference"
                
                response = f"""✅ Thank you, {name or 'there'}!

Got your details:
• Name: **{name or 'Not provided'}**
• Mobile: **{phone}**

**When would you like us to call?**

📅 **Select Date & Time:** (Type numbers)

**Date:**
1️⃣ Today
2️⃣ Tomorrow  
3️⃣ Day After Tomorrow
4️⃣ This Weekend
5️⃣ Next Week

**Time:**
6️⃣ Morning (10 AM - 12 PM)
7️⃣ Afternoon (2 PM - 4 PM)
8️⃣ Evening (5 PM - 7 PM)
9️⃣ Anytime

Type: "2 7" for Tomorrow Afternoon
Or: "Tomorrow evening" works too!"""
                
                self.conversation_states[conversation_id] = state
                
                return {
                    "message": response,
                    "action": "show_date_picker",
                    "stage": "schedule_preference",
                    "user_data": state["user_data"]
                }
            else:
                response = """I need your mobile number to help you better! 📱

Please share:
• Your Name  
• Mobile Number (10 digits)

Example: Rajesh Kumar, 9876543210"""
                
                return {
                    "message": response,
                    "action": "continue",
                    "stage": "contact_capture"
                }
        
        # Stage 3: Schedule preference
        elif state["stage"] == "schedule_preference":
            # Extract date and time
            date_map = {
                "1": "Today", "2": "Tomorrow", "3": "Day After Tomorrow",
                "4": "This Weekend", "5": "Next Week"
            }
            time_map = {
                "6": "Morning (10 AM - 12 PM)", "7": "Afternoon (2 PM - 4 PM)",
                "8": "Evening (5 PM - 7 PM)", "9": "Anytime"
            }
            
            selected_date = "Not specified"
            selected_time = "Anytime"
            
            # Check number selections
            for num, date in date_map.items():
                if num in msg:
                    selected_date = date
                    break
            
            for num, time in time_map.items():
                if num in msg:
                    selected_time = time
                    break
            
            # Fallback to text parsing
            if selected_date == "Not specified":
                if "today" in msg:
                    selected_date = "Today"
                elif "tomorrow" in msg:
                    selected_date = "Tomorrow"
                elif "weekend" in msg:
                    selected_date = "This Weekend"
            
            if selected_time == "Anytime":
                if "morning" in msg:
                    selected_time = "Morning"
                elif "afternoon" in msg:
                    selected_time = "Afternoon"
                elif "evening" in msg:
                    selected_time = "Evening"
            
            state["user_data"]["preferred_date"] = selected_date
            state["user_data"]["preferred_time"] = selected_time
            state["stage"] = "completed"
            
            name = state["user_data"].get("name", "there")
            phone = state["user_data"].get("phone")
            project_context = f" about **{project_name}**" if project_name else ""
            
            response = f"""🎉 **All Set!**

Thank you, **{name}**!

**Your Details:**
• 📱 Mobile: {phone}
• 📅 Preferred Date: {selected_date}
• ⏰ Preferred Time: {selected_time}

**What's Next:**
✅ Our expert team will review your inquiry{project_context}
✅ You'll receive a call at your preferred time
✅ Feel free to ask any questions during the call

**We look forward to helping you!** 🏡

---

Have more questions? Just type and ask!"""
            
            self.conversation_states[conversation_id] = state
            
            return {
                "message": response,
                "action": "completed",
                "stage": "completed",
                "appointment": state["user_data"]
            }
        
        # After completion, can still answer questions
        elif state["stage"] == "completed":
            answer = self._get_quick_answer(msg, project_name)
            answer += "\n\n*Our team will contact you as scheduled. Looking forward to it!* 😊"
            
            return {
                "message": answer,
                "action": "continue",
                "stage": "completed"
            }
        
        return {
            "message": "I'm here to help! What would you like to know?",
            "action": "continue",
            "stage": state["stage"]
        }
    
    def _get_quick_answer(self, msg: str, project_name: str = None) -> str:
        """Quick template-based answers"""
        
        # Property/Pricing questions
        if any(word in msg for word in ["price", "cost", "pricing", "how much", "rate"]):
            if project_name:
                return f"""💰 **Pricing - {project_name}**

Our pricing is competitive and varies based on:
• Unit size (2 BHK, 3 BHK, etc.)
• Floor level and facing
• Current offers and discounts

**For exact pricing and best offers, our sales team can help!**

Would you like to know anything else?"""
            else:
                return """💰 **Pricing Information**

Property prices vary based on:
• Location and project
• Unit configuration  
• Floor and amenities

**Our team can share detailed pricing for specific properties you're interested in!**

Any other questions?"""
        
        # Location/Area questions
        elif any(word in msg for word in ["location", "where", "area", "address"]):
            if project_name:
                return f"""📍 **Location - {project_name}**

Excellent location with:
• Good connectivity to main areas
• Schools, hospitals, malls nearby
• Public transport access
• Safe and established neighborhood

**Our team can share exact address and arrange a site visit!**

What else would you like to know?"""
            else:
                return """📍 **Location Information**

We have properties in prime locations across the city with:
• Great connectivity
• Social infrastructure nearby
• Peaceful neighborhoods

**Tell us your preferred area, and we'll suggest the best options!**

Anything else?"""
        
        # Amenities/Features
        elif any(word in msg for word in ["amenity", "amenities", "facilities", "feature"]):
            if project_name:
                return f"""🏊 **Amenities - {project_name}**

Modern amenities including:
• Swimming pool & Gym
• Children's play area
• Clubhouse & Party hall
• 24/7 Security & CCTV
• Power backup & Water supply
• Parking facilities

**Our team can show you around during a site visit!**

Want to know more?"""
            else:
                return """🏊 **Amenities & Features**

Our properties come with modern amenities:
• Clubhouse, Gym, Swimming pool
• Security and Safety features
• Parking and Power backup
• Green spaces and Recreation

**Specific amenities vary by project. Our team can share details!**

Any other questions?"""
        
        # Availability
        elif any(word in msg for word in ["available", "availability", "vacant", "ready"]):
            if project_name:
                return f"""🏠 **Availability - {project_name}**

We have units available in various configurations.

**Current Status:**
• Multiple options to choose from
• Different floor levels available
• Ready to move & Under construction options

**Our team can show you available units and help you choose!**

Anything else you'd like to know?"""
            else:
                return """🏠 **Property Availability**

We have multiple properties available:
• Ready to move options
• Under construction projects  
• Various configurations (2BHK, 3BHK, etc.)

**Share your requirements and our team will find the perfect match!**

What else?"""
        
        # Payment/Loan
        elif any(word in msg for word in ["payment", "loan", "emi", "finance"]):
            return """💳 **Payment & Financing**

Flexible payment options available:
• Down payment plans
• Construction-linked plans
• Home loan assistance
• Bank tie-ups for easy loans

**Interest rates starting from 8.5% p.a.**

**Our team can help you with complete financing support!**

More questions?"""
        
        # Site visit
        elif any(word in msg for word in ["visit", "see", "show", "tour"]):
            if project_name:
                return f"""🚗 **Site Visit - {project_name}**

We'd love to show you around!

**Site Visit includes:**
• Property tour with our expert
• Sample flat viewing
• Amenities showcase
• Area overview

**We can arrange a visit at your convenient time!**

Ready to schedule?"""
            else:
                return """🚗 **Property Site Visits**

Free site visits with:
• Expert guidance
• Complete property tour
• Area exploration
• No obligation

**We can arrange visits to multiple properties!**

Interested?"""
        
        # Documentation/Legal
        elif any(word in msg for word in ["document", "legal", "rera", "approval", "paper"]):
            return """📄 **Documentation & Legal**

All our properties are:
✅ RERA approved and registered
✅ Clear title and documentation
✅ Bank approved for loans
✅ No legal disputes

**We provide complete documentation support throughout the process!**

**Our team can explain all legal aspects in detail.**

Any concerns?"""
        
        # Construction status
        elif any(word in msg for word in ["construction", "complete", "possession", "ready"]):
            if project_name:
                return f"""🏗️ **Construction Status - {project_name}**

**Current Status:**
• Construction progress updates available
• Quality construction by reputed builder
• Expected possession timeline will be shared

**Our team can provide detailed construction updates!**

Want to know more?"""
            else:
                return """🏗️ **Construction & Possession**

We have both:
• Ready to move properties (immediate possession)
• Under construction (discounted rates)

**All projects by reputed builders with quality construction.**

**Our team can share timelines and progress updates!**

Questions?"""
        
        # Default response
        else:
            if project_name:
                return f"""Thank you for your interest in **{project_name}**! 🏡

I can help you with:
• Pricing & Offers
• Location & Connectivity
• Amenities & Features
• Availability & Units
• Payment Plans
• Site Visits

**What would you like to know?**"""
            else:
                return """Thank you for your interest in our properties! 🏡

I can help you with:
• Property Details
• Pricing Information
• Location Benefits
• Amenities
• Payment Plans
• Site Visits

**What would you like to know?**"""

# Singleton
simple_chatbot = SimpleChatbotService()
