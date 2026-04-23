"""
Hybrid Advisory Service
Combines: AI insights (50-100 words) + Real location data
Cost: Minimal (max 150 tokens per request)
Speed: Fast (parallel API calls)
"""
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path
from services.location_insights_service import location_insights_service
import asyncio

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class HybridAdvisoryService:
    """
    Ultra-fast, ultra-cheap advisory
    - AI: 50-100 word crispy insights (max 150 tokens)
    - Real Data: Google Places location info
    - Total cost: ~₹0.50-1 per advisory
    """
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found")
    
    async def get_advisory(self, category: str, user_inputs: dict, projects: list) -> str:
        """
        Get hybrid advisory with AI + real data
        """
        
        # Run AI and location insights in parallel for speed
        ai_task = self._get_ai_insights(category, user_inputs, projects)
        location_task = self._get_location_insights(user_inputs)
        
        ai_insights, location_data = await asyncio.gather(ai_task, location_task)
        
        # Combine AI insights with real data
        response = self._format_response(category, user_inputs, ai_insights, location_data, projects)
        
        return response
    
    async def _get_ai_insights(self, category: str, user_inputs: dict, projects: list) -> str:
        """
        Get AI insights - clean and readable format
        100-150 words with bullet points
        """
        
        try:
            # Clean prompt for readable response
            prompt = self._get_clean_prompt(category, user_inputs, projects)
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"advisory_{category}",
                system_message="You are a real estate expert. Give advice in clean bullet points or short paragraphs. 100-150 words max. Use ✓ for benefits, ⚠️ for cautions. Be direct and specific."
            ).with_model("openai", "gpt-4o-mini")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Limit to 150 words for cost control
            words = response.split()
            if len(words) > 150:
                response = ' '.join(words[:150]) + '...'
            
            return response
            
        except Exception as e:
            print(f"AI insights error: {e}")
            return self._get_fallback_insights(category)
    
    def _get_clean_prompt(self, category: str, user_inputs: dict, projects: list) -> str:
        """Analytical prompts that ask AI to actually think about the case"""
        
        if category == "budget":
            budget = user_inputs.get('budget', 'Not specified')
            location = user_inputs.get('location', 'Not specified')
            prop_type = user_inputs.get('property_type', 'Any')
            
            prompt = f"""Client wants {prop_type} in {location} with {budget} budget.

Give 4 bullet points:
✓ What they can realistically get
✓ Financial planning tip
⚠️ Hidden costs to watch
✓ One key advice

Keep it short and readable."""
            
            return prompt
        
        elif category == "location":
            location = user_inputs.get('location', 'Not specified')
            work_location = user_inputs.get('work_location', 'Not specified')
            
            prompt = f"""Evaluate {location} for someone working at {work_location}.

Give 4 points:
✓ Commute assessment
✓ Investment potential (3-5 year view)
⚠️ One drawback to know
✓ Better alternative if any

Short and direct."""
            
            return prompt
        
        elif category == "numerology":
            dob = user_inputs.get('dob', 'Not provided')
            lucky_nums = user_inputs.get('lucky_numbers', 'Not specified')
            direction = user_inputs.get('direction', 'Any')
            
            prompt = f"""Numerology for DOB: {dob}, Lucky: {lucky_nums}, Direction: {direction}.

Give 4 tips:
✓ Life path number significance
✓ How to use lucky numbers {lucky_nums}
✓ {direction} direction compatibility
✓ Property selection tip

Brief and practical."""
            
            return prompt
        
        elif category == "best_project":
            requirements = user_inputs.get('requirements', 'Quality property')
            timeline = user_inputs.get('timeline', 'Flexible')
            
            prompt = f"""Project selection for: {requirements}, Timeline: {timeline}.

Give 4 tips:
✓ What type of project to target
✓ Builder verification checklist
⚠️ Red flags to avoid
✓ Negotiation strategy

Keep it actionable."""
            
            return prompt
        
        elif category == "investment":
            amount = user_inputs.get('investment_amount', 'Not specified')
            timeline = user_inputs.get('timeline', 'Not specified')
            roi = user_inputs.get('roi_expectations', 'Market standard')
            
            prompt = f"""Investment: {amount}, Timeline: {timeline}, Expected ROI: {roi}.

Give 4 points:
✓ Is ROI realistic? 
✓ Best strategy for this timeline
⚠️ Main risk factor
✓ Exit strategy tip

Be direct."""
            
            return prompt
        
        # Generic fallback
        return f"Analyze this client's real estate situation and provide specific, actionable advice in 150-200 words: {user_inputs}"
    
    def _get_fallback_insights(self, category: str) -> str:
        """Fallback insights if AI fails"""
        
        fallbacks = {
            "budget": "Key tips: 1) Compare 3-4 projects before deciding 2) Keep 20-30% ready for down payment + registration 3) Check RERA approval and builder reputation 4) Negotiate for 5-10% discount",
            "location": "Investment factors: 1) Check connectivity (metro, roads) 2) Upcoming infrastructure projects boost value 3) Social amenities (schools, hospitals) matter 4) Research 3-year appreciation history",
            "numerology": "Property selection: 1) Choose flat/plot numbers with your lucky digits 2) Preferred direction entrance matters 3) House number sum should match favorable numbers 4) Consider Vastu along with numerology",
            "best_project": "Selection criteria: 1) RERA registration mandatory 2) Builder track record and on-time delivery 3) Quality of construction materials 4) Compare price per sqft with locality average",
            "investment": "Investment strategy: 1) Diversify across locations if possible 2) Research appreciation potential 3) Check rental yield if planning to rent 4) Keep 6-12 month emergency fund separate"
        }
        
        return fallbacks.get(category, "Contact our experts for personalized guidance on your real estate investment.")
    
    async def _get_location_insights(self, user_inputs: dict) -> dict:
        """Get real location data if location provided"""
        
        location = user_inputs.get('location') or user_inputs.get('work_location')
        
        if not location:
            return None
        
        try:
            return await location_insights_service.get_location_insights(location)
        except:
            return None
    
    def _format_response(self, category: str, user_inputs: dict, ai_insights: str, location_data: dict, projects: list) -> str:
        """Format final response with ExlainERP projects and coupon"""
        
        # Category icons and titles
        titles = {
            "budget": "💰 Budget Advisory",
            "location": "📍 Location Analysis",
            "numerology": "🔢 Numerology Guidance",
            "best_project": "⭐ Project Selection",
            "investment": "📈 Investment Strategy"
        }
        
        title = titles.get(category, "🏡 Property Advisory")
        
        response = f"**{title}**\n\n"
        
        # Situation summary
        response += self._format_situation_summary(category, user_inputs)
        
        # AI Insights (100-150 words, readable format)
        response += f"\n\n**💡 Expert Advice:**\n\n{ai_insights}\n"
        
        # Real location data (compact version)
        if location_data and location_data.get('coordinates'):
            response += self._format_compact_location_data(location_data)
        
        # ExlainERP Projects nearby
        location = user_inputs.get('location') or user_inputs.get('work_location')
        if projects and location:
            response += self._format_retoerp_projects(projects, location)
        
        # Coupon Code Strategy
        response += """

---

🎁 **SPECIAL OFFER - ₹5,000 DISCOUNT!**

Get exclusive **₹5,000 OFF** on any property purchase through ExlainERP!

📱 **How to claim:**
Send your mobile number to our sales team and get your unique coupon code instantly.

✓ Valid on all ExlainERP projects
✓ Can be used for booking or final payment
✓ Limited time offer!

**📞 Contact now to get your coupon code and explore properties!**

---

*Note: ExlainERP has projects across Telangana, AP, and India. Even if we don't have a project in your exact location, we'll help you find the perfect property nearby.*
"""
        
        return response
    
    def _format_situation_summary(self, category: str, inputs: dict) -> str:
        """Format situation summary - conversational style"""
        
        if category == "budget":
            budget = inputs.get('budget', 'your budget')
            location = inputs.get('location', 'preferred location')
            prop_type = inputs.get('property_type', 'property')
            text = f"Looking for a **{prop_type}** in **{location}** with a budget of **{budget}**"
            
        elif category == "location":
            location = inputs.get('location', 'location')
            work_loc = inputs.get('work_location', 'work location')
            text = f"Evaluating **{location}** as a potential location (commuting from **{work_loc}**)"
            
        elif category == "numerology":
            dob = inputs.get('dob', 'your birth date')
            lucky = inputs.get('lucky_numbers', 'your lucky numbers')
            text = f"Birth date: **{dob}**, Lucky numbers: **{lucky}**"
            
        elif category == "best_project":
            reqs = inputs.get('requirements', 'quality property')
            timeline = inputs.get('timeline', 'flexible timeline')
            text = f"Searching for: **{reqs}** with **{timeline}**"
            
        elif category == "investment":
            amount = inputs.get('investment_amount', 'investment amount')
            timeline = inputs.get('timeline', 'investment horizon')
            text = f"Planning to invest **{amount}** with **{timeline}**"
        
        else:
            return ""
        
        # Add description if provided
        description = inputs.get('description', '').strip()
        if description:
            text += f"\n\n*Your note: \"{description}\"*"
        
        return text
    
    def _format_compact_location_data(self, location_data: dict) -> str:
        """Compact version of location data - only essentials"""
        
        if not location_data.get('coordinates'):
            return ""
        
        text = f"\n**📍 Nearby ({location_data['location']}):**\n"
        
        # Top 2 schools
        if location_data.get('schools')[:2]:
            schools = location_data['schools'][:2]
            text += f"🏫 Schools: {', '.join([s['name'] for s in schools])}\n"
        
        # Top 2 hospitals
        if location_data.get('hospitals')[:2]:
            hospitals = location_data['hospitals'][:2]
            text += f"🏥 Hospitals: {', '.join([h['name'] for h in hospitals])}\n"
        
        # Top mall
        if location_data.get('malls'):
            text += f"🛍️ Shopping: {location_data['malls'][0]['name']}\n"
        
        # Metro if available
        if location_data.get('metro_stations'):
            text += f"🚇 Metro: {location_data['metro_stations'][0]['name']}\n"
        
        return text + "\n"
    
    def _format_retoerp_projects(self, projects: list, location: str) -> str:
        """Format ExlainERP projects available nearby"""
        
        # Filter by location
        location_lower = location.lower()
        matched = [p for p in projects if location_lower in str(p.get('location', '')).lower()]
        
        if not matched:
            # Show any 2 projects if no exact match
            matched = projects[:2]
        
        text = f"\n**🏘️ ExlainERP Projects Near {location}:**\n\n"
        
        for i, project in enumerate(matched[:3], 1):
            text += f"{i}. **{project.get('name', 'Project')}**\n"
            if project.get('location'):
                text += f"   📍 {project.get('location')}\n"
            if project.get('property_count'):
                text += f"   🏢 {project.get('property_count')} units available\n"
            text += "   📞 *Contact for details & site visit*\n\n"
        
        if len(matched) > 3:
            text += f"*+{len(matched) - 3} more projects in this area*\n"
        
        return text
    
    def _format_projects(self, projects: list, location: str = None) -> str:
        """Format projects section - conversational"""
        
        if not projects:
            return ""
        
        # Filter by location if provided
        if location:
            location_lower = location.lower()
            matched = [p for p in projects if location_lower in str(p.get('location', '')).lower()]
            if matched:
                projects = matched
        
        if not projects:
            return ""
        
        text = "\n\n**🏘️ Projects Worth Checking Out:**\n\n"
        
        for i, project in enumerate(projects[:3], 1):
            text += f"**{i}. {project.get('name', 'Project')}**"
            if project.get('location'):
                text += f" • {project.get('location')}"
            if project.get('property_count'):
                text += f" • {project.get('property_count')} units available"
            text += "\n"
        
        if len(projects) > 3:
            text += f"\n*Plus {len(projects) - 3} more options we can show you*\n"
        
        return text

# Singleton
hybrid_advisory_service = HybridAdvisoryService()
