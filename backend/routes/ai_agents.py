"""
AI Agents API Routes
Provides AI-powered assistance for leads, properties, and customer communication
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from middleware.auth import get_current_user
from services.ai_agent_service import AIAgentService
from models.ai_agent import AIConversationCreate, AIMessageCreate

router = APIRouter(prefix="/ai-agents", tags=["ai_agents"])


def get_db(request: Request):
    return request.app.state.db


# Initialize AI service
ai_service = AIAgentService()


# ============= LEAD FOLLOW-UP AGENT =============

@router.post("/lead-followup/start")
async def start_lead_followup_conversation(
    lead_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Start AI conversation for lead follow-up assistance.
    
    Returns conversation_id and session_id for subsequent messages.
    """
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Get lead details
    lead = await db.leads.find_one({
        "id": lead_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get project if available
    project = None
    if lead.get("project_id"):
        project = await db.projects.find_one({
            "id": lead["project_id"]
        }, {"_id": 0})
    
    # Create conversation record
    session_id = f"lead_followup_{lead_id}_{uuid.uuid4().hex[:8]}"
    conversation = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "agent_type": "lead_followup",
        "agent_name": "Lead Follow-up Assistant",
        "context": {
            "lead_id": lead_id,
            "lead_name": lead.get("name"),
            "project_id": lead.get("project_id")
        },
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_message_at": None
    }
    
    await db.ai_conversations.insert_one(conversation)
    
    # Generate system prompt
    system_prompt = ai_service.get_lead_followup_system_prompt(lead, project)
    
    # Create AI chat session
    chat = await ai_service.create_chat_session(session_id, system_prompt)
    
    return {
        "success": True,
        "conversation_id": conversation["id"],
        "session_id": session_id,
        "lead_name": lead.get("name"),
        "message": "Lead follow-up assistant ready. Ask me to generate follow-up messages or suggest next actions."
    }


@router.post("/lead-followup/message")
async def send_lead_followup_message(
    message_data: AIMessageCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Send message to Lead Follow-up Agent and get response"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Verify conversation exists
    conversation = await db.ai_conversations.find_one({
        "id": message_data.conversation_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get lead and project for system prompt
    lead_id = conversation.get("context", {}).get("lead_id")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    
    project = None
    if lead and lead.get("project_id"):
        project = await db.projects.find_one({"id": lead["project_id"]}, {"_id": 0})
    
    # Create chat session with system prompt
    system_prompt = ai_service.get_lead_followup_system_prompt(lead, project)
    chat = await ai_service.create_chat_session(message_data.session_id, system_prompt)
    
    # Store user message
    user_message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": message_data.conversation_id,
        "session_id": message_data.session_id,
        "tenant_id": tenant_id,
        "role": "user",
        "content": message_data.content,
        "model": None,
        "tokens_used": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(user_message_doc)
    
    # Get AI response
    ai_response = await ai_service.send_message(chat, message_data.content)
    
    # Store AI message
    ai_message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": message_data.conversation_id,
        "session_id": message_data.session_id,
        "tenant_id": tenant_id,
        "role": "assistant",
        "content": ai_response,
        "model": f"{ai_service.model_provider}/{ai_service.model_name}",
        "tokens_used": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(ai_message_doc)
    
    # Update conversation
    await db.ai_conversations.update_one(
        {"id": message_data.conversation_id},
        {"$set": {
            "last_message_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": ai_response,
        "conversation_id": message_data.conversation_id
    }


# ============= PROPERTY RECOMMENDATION AGENT =============

@router.post("/property-recommendation/start")
async def start_property_recommendation(
    customer_id: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Start AI conversation for property recommendations"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    # Get customer preferences if available
    customer_preferences = {}
    if customer_id:
        customer = await db.users.find_one({
            "id": customer_id,
            "tenant_id": tenant_id
        }, {"_id": 0})
        
        if customer:
            customer_preferences = {
                "budget": customer.get("budget"),
                "location": customer.get("preferred_location"),
                "property_type": customer.get("property_type"),
                "bedrooms": customer.get("bedrooms")
            }
    
    # Get available properties
    properties = await db.projects.find({
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0}).limit(20).to_list(20)
    
    # Create conversation
    session_id = f"property_rec_{uuid.uuid4().hex[:12]}"
    conversation = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "agent_type": "property_recommendation",
        "agent_name": "Property Recommendation Assistant",
        "context": {
            "customer_id": customer_id,
            "property_count": len(properties)
        },
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_message_at": None
    }
    
    await db.ai_conversations.insert_one(conversation)
    
    # Generate system prompt
    system_prompt = ai_service.get_property_recommendation_system_prompt(
        customer_preferences,
        properties
    )
    
    # Create AI chat session
    chat = await ai_service.create_chat_session(session_id, system_prompt)
    
    return {
        "success": True,
        "conversation_id": conversation["id"],
        "session_id": session_id,
        "available_properties": len(properties),
        "message": "Property recommendation assistant ready. Tell me your requirements and I'll suggest the best matches."
    }


@router.post("/property-recommendation/message")
async def send_property_recommendation_message(
    message_data: AIMessageCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Send message to Property Recommendation Agent"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Verify conversation
    conversation = await db.ai_conversations.find_one({
        "id": message_data.conversation_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get properties for context
    properties = await db.projects.find({
        "tenant_id": tenant_id,
        "deleted_at": None
    }, {"_id": 0}).limit(20).to_list(20)
    
    # Create chat session
    system_prompt = ai_service.get_property_recommendation_system_prompt({}, properties)
    chat = await ai_service.create_chat_session(message_data.session_id, system_prompt)
    
    # Store user message
    user_message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": message_data.conversation_id,
        "session_id": message_data.session_id,
        "tenant_id": tenant_id,
        "role": "user",
        "content": message_data.content,
        "model": None,
        "tokens_used": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(user_message_doc)
    
    # Get AI response
    ai_response = await ai_service.send_message(chat, message_data.content)
    
    # Store AI message
    ai_message_doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": message_data.conversation_id,
        "session_id": message_data.session_id,
        "tenant_id": tenant_id,
        "role": "assistant",
        "content": ai_response,
        "model": f"{ai_service.model_provider}/{ai_service.model_name}",
        "tokens_used": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_messages.insert_one(ai_message_doc)
    
    # Update conversation
    await db.ai_conversations.update_one(
        {"id": message_data.conversation_id},
        {"$set": {
            "last_message_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": ai_response,
        "conversation_id": message_data.conversation_id
    }


# ============= CONVERSATION MANAGEMENT =============

@router.get("/conversations")
async def get_my_conversations(
    agent_type: Optional[str] = None,
    limit: int = 20,
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Get user's AI conversations"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    user_id = current_user.get("user_id")
    
    query = {
        "tenant_id": tenant_id,
        "user_id": user_id
    }
    
    if agent_type:
        query["agent_type"] = agent_type
    
    conversations = await db.ai_conversations.find(
        query, {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "total": len(conversations),
        "conversations": conversations
    }


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get messages in a conversation"""
    db = get_db(request)
    tenant_id = current_user.get("tenant_id")
    
    # Verify conversation access
    conversation = await db.ai_conversations.find_one({
        "id": conversation_id,
        "tenant_id": tenant_id
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages = await db.ai_messages.find({
        "conversation_id": conversation_id
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    return {
        "success": True,
        "conversation": conversation,
        "total_messages": len(messages),
        "messages": messages
    }
