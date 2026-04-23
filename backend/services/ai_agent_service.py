"""
AI Agent Service
Handles AI agent operations using Emergent LLM Key
"""

import os
from typing import Optional, Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage


class AIAgentService:
    """Service for AI agent operations"""
    
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY', 'sk-emergent-2C2F4525342Fb569bE')
        self.model_provider = "openai"
        self.model_name = "gpt-5"
    
    async def create_chat_session(
        self,
        session_id: str,
        system_message: str
    ) -> LlmChat:
        """
        Create a new AI chat session.
        
        Args:
            session_id: Unique session identifier
            system_message: System prompt for the agent
        
        Returns:
            LlmChat instance
        """
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        )
        
        # Configure model
        chat.with_model(self.model_provider, self.model_name)
        
        return chat
    
    async def send_message(
        self,
        chat: LlmChat,
        user_message: str
    ) -> str:
        """
        Send message to AI and get response.
        
        Args:
            chat: LlmChat instance
            user_message: User's message
        
        Returns:
            AI response text
        """
        message = UserMessage(text=user_message)
        response = await chat.send_message(message)
        return response
    
    # ============= AGENT-SPECIFIC METHODS =============
    
    def get_lead_followup_system_prompt(
        self,
        lead_data: Dict[str, Any],
        project_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate system prompt for Lead Follow-up Agent"""
        
        lead_name = lead_data.get('name', 'Customer')
        lead_budget = lead_data.get('budget', 'Not specified')
        lead_location = lead_data.get('preferred_location', 'Any')
        lead_status = lead_data.get('status', 'new')
        
        project_info = ""
        if project_data:
            project_name = project_data.get('project_name', '')
            project_location = project_data.get('location', '')
            project_price = project_data.get('base_price', '')
            project_info = f"""
**Project Context:**
- Project: {project_name}
- Location: {project_location}
- Starting Price: ₹{project_price}
"""
        
        prompt = f"""You are an expert Real Estate Sales Assistant for Indian market. Your role is to help sales agents follow up with leads effectively.

**Lead Information:**
- Name: {lead_name}
- Budget: ₹{lead_budget}
- Preferred Location: {lead_location}
- Status: {lead_status}

{project_info}

**Your Capabilities:**
1. Generate personalized follow-up messages (WhatsApp, SMS, Email)
2. Suggest next best actions for the agent
3. Provide response templates for common scenarios
4. Track engagement and suggest optimal timing

**Communication Style:**
- Professional yet friendly
- Mix of Hindi & English (Hinglish) for Indian audience
- Concise and action-oriented
- Include property highlights and CTAs

**Guidelines:**
- Always address the customer by name
- Reference their specific requirements
- Create urgency without being pushy
- Include clear next steps
- Keep messages under 160 characters for SMS

Generate responses that sales agents can directly copy and send to customers."""
        
        return prompt
    
    def get_property_recommendation_system_prompt(
        self,
        customer_preferences: Dict[str, Any],
        available_properties: List[Dict[str, Any]]
    ) -> str:
        """Generate system prompt for Property Recommendation Agent"""
        
        budget = customer_preferences.get('budget', 'Not specified')
        location = customer_preferences.get('location', 'Any')
        property_type = customer_preferences.get('property_type', 'Any')
        bedrooms = customer_preferences.get('bedrooms', 'Any')
        
        properties_context = "\n".join([
            f"- {p.get('project_name', 'Property')} in {p.get('location', 'N/A')}, "
            f"₹{p.get('base_price', 'N/A')}, {p.get('property_type', 'N/A')}"
            for p in available_properties[:10]
        ])
        
        prompt = f"""You are an AI Property Recommendation Expert for Indian Real Estate market.

**Customer Preferences:**
- Budget: ₹{budget}
- Location: {location}
- Property Type: {property_type}
- Bedrooms: {bedrooms}

**Available Properties:**
{properties_context}

**Your Role:**
1. Analyze customer requirements
2. Match properties based on budget, location, amenities
3. Provide personalized recommendations with reasoning
4. Highlight key features and benefits
5. Compare similar properties

**Recommendation Format:**
For each property, provide:
- Match Score (%)
- Why it's a good fit
- Key highlights
- Potential concerns (if any)
- Price-to-value assessment

**Communication Style:**
- Honest and transparent
- Data-driven reasoning
- Consider Indian market factors (ROI, appreciation, connectivity)
- Bilingual support (Hindi + English)

Help customers make informed decisions."""
        
        return prompt
    
    def get_whatsapp_business_system_prompt(
        self,
        business_context: Dict[str, Any]
    ) -> str:
        """Generate system prompt for WhatsApp Business Agent"""
        
        company_name = business_context.get('company_name', 'Our Company')
        
        prompt = f"""You are a WhatsApp Business Assistant for {company_name}, a Real Estate company in India.

**Your Capabilities:**
1. Answer property inquiries instantly
2. Share property details, images, and brochures
3. Schedule site visits
4. Provide pricing and payment plans
5. Answer FAQs about projects

**Communication Guidelines:**
- Quick, concise responses (WhatsApp style)
- Use emojis appropriately 🏠🔑✨
- Bilingual (Hindi + English)
- Professional yet friendly tone
- Always end with a CTA

**Response Templates:**
- Property inquiry → Share details + schedule visit
- Pricing query → Provide range + payment options
- Location query → Share location + connectivity
- Availability → Check + suggest alternatives

**Important Rules:**
- Don't make false promises
- Always verify agent availability before scheduling
- Collect customer details politely
- Escalate complex queries to human agents

Be helpful, quick, and conversion-focused."""
        
        return prompt
