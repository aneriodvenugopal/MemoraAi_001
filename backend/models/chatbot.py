from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import uuid4

# ============ CHATBOT CONFIGURATION ============

class ChatbotBranding(BaseModel):
    """Chatbot visual branding"""
    primary_color: str = Field(default="#3b82f6", description="Primary brand color")
    secondary_color: str = Field(default="#1e40af", description="Secondary color")
    logo_url: Optional[str] = Field(None, description="Tenant logo URL")
    position: str = Field(default="bottom-right", description="Widget position: bottom-right, bottom-left")


class ChatbotConfig(BaseModel):
    """Chatbot configuration for tenant"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: Optional[str] = Field(None, description="Tenant ID (None for shared ExlainERP chatbot)")
    
    # Bot personality
    bot_name: str = Field(default="ExlainERP Assistant", description="Chatbot name")
    welcome_message: str = Field(
        default="👋 Hi! I'm here to help you find your perfect property. How can I assist you today?",
        description="Initial greeting message"
    )
    system_prompt: str = Field(
        default="You are a helpful real estate assistant for ExlainERP platform. You help customers find properties, answer questions about real estate, and capture their contact information naturally during conversation. Always be friendly, professional, and helpful.",
        description="AI personality instructions"
    )
    
    # Features
    languages: List[str] = Field(default=["en", "te"], description="Supported languages: en, te, hi")
    auto_translate: bool = Field(default=True, description="Auto-detect and respond in user's language")
    lead_capture_enabled: bool = Field(default=True, description="Enable lead capture")
    
    # Branding
    branding: ChatbotBranding = Field(default_factory=ChatbotBranding)
    
    # API Configuration
    use_own_api_key: bool = Field(default=False, description="Use tenant's own OpenAI key")
    openai_api_key: Optional[str] = Field(None, description="Tenant's OpenAI API key (if use_own_api_key=True)")
    
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChatbotConfigCreate(BaseModel):
    """Create chatbot configuration"""
    tenant_id: Optional[str] = None
    bot_name: str = "ExlainERP Assistant"
    welcome_message: str = "👋 Hi! I'm here to help you find your perfect property. How can I assist you today?"
    system_prompt: Optional[str] = None
    languages: List[str] = ["en", "te"]
    branding: Optional[ChatbotBranding] = None
    use_own_api_key: bool = False
    openai_api_key: Optional[str] = None


class ChatbotConfigUpdate(BaseModel):
    """Update chatbot configuration"""
    bot_name: Optional[str] = None
    welcome_message: Optional[str] = None
    system_prompt: Optional[str] = None
    languages: Optional[List[str]] = None
    branding: Optional[ChatbotBranding] = None
    use_own_api_key: Optional[bool] = None
    openai_api_key: Optional[str] = None
    is_active: Optional[bool] = None


# ============ CHAT CONVERSATIONS ============

class ChatMessage(BaseModel):
    """Single chat message"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    role: str = Field(..., description="user or assistant")
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    language: Optional[str] = Field(None, description="Message language: en, te, hi")


class ChatConversation(BaseModel):
    """Chat conversation session"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: Optional[str] = Field(None, description="Tenant ID (None for shared)")
    
    # Visitor info
    visitor_id: str = Field(..., description="Unique visitor identifier (browser fingerprint/cookie)")
    visitor_name: Optional[str] = None
    visitor_phone: Optional[str] = None
    visitor_email: Optional[str] = None
    visitor_ip: Optional[str] = None
    visitor_location: Optional[str] = None
    
    # Lead info
    is_lead: bool = Field(default=False, description="Whether contact details were captured")
    lead_interest: Optional[str] = Field(None, description="What property/project they're interested in")
    lead_status: str = Field(default="new", description="new, contacted, qualified, converted")
    assigned_to: Optional[str] = Field(None, description="Staff ID assigned to follow up")
    
    # Metadata
    source: str = Field(default="website", description="website, mobile_app, facebook, etc")
    referrer_url: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Conversation stats
    message_count: int = Field(default=0)
    first_message_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True, description="Is conversation still ongoing")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessageCreate(BaseModel):
    """Create new chat message"""
    conversation_id: Optional[str] = None
    tenant_id: Optional[str] = None
    visitor_id: str
    content: str
    language: Optional[str] = "en"
    context: Optional[dict] = None  # Project ID, page type, etc
    
    # Optional visitor metadata (for first message)
    visitor_ip: Optional[str] = None
    visitor_location: Optional[str] = None
    referrer_url: Optional[str] = None
    user_agent: Optional[str] = None


class LeadCapture(BaseModel):
    """Capture lead information from chat"""
    conversation_id: str
    name: str
    phone: str
    email: Optional[str] = None
    interest: Optional[str] = None


# ============ ADMIN RESPONSES ============

class ChatConversationDetail(BaseModel):
    """Detailed conversation with messages"""
    conversation: ChatConversation
    messages: List[ChatMessage]
    chatbot_config: Optional[ChatbotConfig] = None


class ChatAnalytics(BaseModel):
    """Chat analytics"""
    total_conversations: int
    total_messages: int
    total_leads: int
    active_conversations: int
    lead_conversion_rate: float
    avg_messages_per_conversation: float
