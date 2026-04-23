"""
AI Agent Models
Store AI conversations and agent configurations
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class AIConversation(BaseModel):
    """AI conversation/chat session"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str  # Unique session identifier
    tenant_id: str
    user_id: str
    
    # Agent details
    agent_type: str  # lead_followup, property_recommendation, whatsapp_business
    agent_name: str  # Display name
    
    # Conversation details
    context: Optional[Dict[str, Any]] = None  # Related lead_id, property_id, etc.
    status: str = "active"  # active, completed, archived
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: Optional[datetime] = None


class AIMessage(BaseModel):
    """Individual AI message in conversation"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    session_id: str
    tenant_id: str
    
    # Message details
    role: str  # user, assistant, system
    content: str
    
    # AI model details
    model: Optional[str] = None  # gpt-5, claude-sonnet-4, etc.
    tokens_used: Optional[int] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIConversationCreate(BaseModel):
    """Create new AI conversation"""
    agent_type: str
    agent_name: str
    context: Optional[Dict[str, Any]] = None


class AIMessageCreate(BaseModel):
    """Create AI message"""
    conversation_id: str
    session_id: str
    content: str
