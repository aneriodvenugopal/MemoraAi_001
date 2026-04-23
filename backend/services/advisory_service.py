"""
AI Advisory Service using OpenAI GPT-5
"""
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class AdvisoryService:
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found")
    
    def get_category_prompt(self, category: str, user_inputs: dict, projects: list) -> str:
        """Get category-specific system prompt"""
        
        base_instruction = """You are an expert real estate advisor for ExlainERP platform. 
Provide helpful, accurate, and personalized advice based on user's needs.
Be conversational, friendly, and professional. Keep responses concise (300-400 words).
Always end with actionable next steps."""
        
        if category == "budget":
            return f"""{base_instruction}

**Specialization:** Budget Advisory
Help users find the best properties within their budget. Analyze their financial capacity 
and recommend suitable projects.

**Available Projects:**
{self._format_projects(projects)}

**User Details:**
Budget: {user_inputs.get('budget', 'Not specified')}
Location Preference: {user_inputs.get('location', 'Any')}
Property Type: {user_inputs.get('property_type', 'Any')}

Provide advice on:
1. How their budget aligns with market rates
2. Best value properties within budget
3. Financing options if needed
4. Recommended projects from the list above (mention 2-3 by name)"""
        
        elif category == "location":
            return f"""{base_instruction}

**Specialization:** Location Highlights Advisory
Provide insights about location advantages, infrastructure, connectivity, and growth potential.

**Available Projects:**
{self._format_projects(projects)}

**User Details:**
Interested Location: {user_inputs.get('location', 'Not specified')}
Work Location: {user_inputs.get('work_location', 'Not specified')}
Priorities: {user_inputs.get('priorities', 'Not specified')}

Provide advice on:
1. Location advantages and disadvantages
2. Connectivity and infrastructure
3. Future growth potential
4. Recommended projects in that location (mention 2-3 by name)"""
        
        elif category == "numerology":
            return f"""{base_instruction}

**Specialization:** Numerology Advisory
Provide numerology-based property selection guidance. Be respectful and combine 
traditional numerology with practical advice.

**Available Projects:**
{self._format_projects(projects)}

**User Details:**
Date of Birth: {user_inputs.get('dob', 'Not specified')}
Lucky Numbers: {user_inputs.get('lucky_numbers', 'Not specified')}
Preferred Direction: {user_inputs.get('direction', 'Any')}

Provide advice on:
1. Lucky numbers and their significance
2. Auspicious directions for property
3. Best timing for property purchase
4. Recommended projects considering numerology (mention 2-3 by name)"""
        
        elif category == "best_project":
            return f"""{base_instruction}

**Specialization:** Best Project Advisory
Help users choose the best project based on their specific requirements and priorities.

**Available Projects:**
{self._format_projects(projects)}

**User Details:**
Requirements: {user_inputs.get('requirements', 'Not specified')}
Timeline: {user_inputs.get('timeline', 'Not specified')}
Priority Factors: {user_inputs.get('priorities', 'Not specified')}

Provide advice on:
1. Analysis of top projects matching their criteria
2. Comparison of key features
3. Which project offers best value
4. Specific recommendations with reasoning (mention 2-3 projects by name)"""
        
        elif category == "investment":
            return f"""{base_instruction}

**Specialization:** Future Investment Advisory
Provide investment-focused advice on property potential, ROI, and future appreciation.

**Available Projects:**
{self._format_projects(projects)}

**User Details:**
Investment Amount: {user_inputs.get('investment_amount', 'Not specified')}
Investment Timeline: {user_inputs.get('timeline', 'Not specified')}
ROI Expectations: {user_inputs.get('roi_expectations', 'Not specified')}

Provide advice on:
1. Investment potential analysis
2. Expected ROI and appreciation timeline
3. Risk factors to consider
4. Top investment opportunities from the list (mention 2-3 projects by name)"""
        
        return base_instruction
    
    def _format_projects(self, projects: list) -> str:
        """Format projects list for prompt"""
        if not projects:
            return "No projects available currently."
        
        formatted = []
        for i, project in enumerate(projects[:10], 1):  # Limit to 10
            formatted.append(f"{i}. {project.get('name', 'Unnamed')} - {project.get('location', 'Location not specified')}")
        
        return "\n".join(formatted)
    
    async def get_advisory(self, category: str, user_inputs: dict, projects: list) -> str:
        """Get AI advisory response"""
        
        try:
            system_message = self.get_category_prompt(category, user_inputs, projects)
            
            # Create user message
            user_message_text = f"Please provide your expert advice for the above user."
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"advisory_{category}",
                system_message=system_message
            ).with_model("openai", "gpt-5")
            
            user_message = UserMessage(text=user_message_text)
            response = await chat.send_message(user_message)
            
            return response
        
        except Exception as e:
            print(f"Advisory error: {e}")
            return "Sorry, we're experiencing technical difficulties. Please try again or contact our support team."

# Global instance
advisory_service = AdvisoryService()
