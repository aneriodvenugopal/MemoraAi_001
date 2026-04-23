from fastapi import APIRouter, HTTPException, Request, Depends
from models.chatbot import (
    ChatbotConfig, ChatbotConfigCreate, ChatbotConfigUpdate,
    ChatMessage, ChatConversation, ChatMessageCreate, LeadCapture,
    ChatConversationDetail, ChatAnalytics
)
from services.chatbot_service import ChatbotService
from datetime import datetime, timezone
from utils.helpers import serialize_doc
from typing import Optional, List
from middleware.auth import get_current_user
import uuid

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

def get_db(request: Request):
    return request.app.state.db


# ============ CHATBOT CONFIGURATION ============

@router.get("/config")
async def get_chatbot_config(
    request: Request,
    tenant_id: Optional[str] = None
):
    """Get chatbot configuration for tenant or shared bot"""
    db = get_db(request)
    
    query = {'tenant_id': tenant_id}
    config = await db.chatbot_configs.find_one(query, {"_id": 0})
    
    if not config:
        # Return default configuration
        default_config = ChatbotConfig(tenant_id=tenant_id)
        return {
            "success": True,
            "config": default_config.model_dump(),
            "is_default": True
        }
    
    return {
        "success": True,
        "config": config,
        "is_default": False
    }


@router.post("/config")
async def create_chatbot_config(
    config_data: ChatbotConfigCreate,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Create chatbot configuration"""
    db = get_db(request)
    
    # Check if config already exists for this tenant
    existing = await db.chatbot_configs.find_one({'tenant_id': config_data.tenant_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Configuration already exists for this tenant")
    
    # Create config
    config = ChatbotConfig(**config_data.model_dump())
    config_doc = serialize_doc(config.model_dump())
    
    await db.chatbot_configs.insert_one(config_doc)
    
    return {
        "success": True,
        "message": "Chatbot configuration created",
        "config": config.model_dump()
    }


@router.put("/config/{config_id}")
async def update_chatbot_config(
    config_id: str,
    config_data: ChatbotConfigUpdate,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Update chatbot configuration"""
    db = get_db(request)
    
    # Check if config exists
    existing = await db.chatbot_configs.find_one({'id': config_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Update config
    update_data = {k: v for k, v in config_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.chatbot_configs.update_one(
        {'id': config_id},
        {'$set': update_data}
    )
    
    # Get updated config
    updated_config = await db.chatbot_configs.find_one({'id': config_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Configuration updated",
        "config": updated_config
    }


# ============ CHAT API - PUBLIC ============

@router.post("/message")
async def send_chat_message(
    message_data: ChatMessageCreate,
    request: Request
):
    """Send message to chatbot and get AI response (PUBLIC endpoint)"""
    db = get_db(request)
    
    try:
        # Get or create conversation
        if message_data.conversation_id:
            conversation = await db.chat_conversations.find_one(
                {'id': message_data.conversation_id},
                {"_id": 0}
            )
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            # Create new conversation
            conversation = ChatConversation(
                tenant_id=message_data.tenant_id,
                visitor_id=message_data.visitor_id,
                visitor_ip=message_data.visitor_ip,
                visitor_location=message_data.visitor_location,
                referrer_url=message_data.referrer_url,
                user_agent=message_data.user_agent
            )
            conversation_doc = serialize_doc(conversation.model_dump())
            await db.chat_conversations.insert_one(conversation_doc)
        
        conversation_id = conversation['id'] if isinstance(conversation, dict) else conversation.id
        
        # Save user message
        user_msg = ChatMessage(
            conversation_id=conversation_id,
            role="user",
            content=message_data.content,
            language=message_data.language
        )
        user_msg_doc = serialize_doc(user_msg.model_dump())
        await db.chat_messages.insert_one(user_msg_doc)
        
        # Get chatbot config
        config = await db.chatbot_configs.find_one(
            {'tenant_id': message_data.tenant_id},
            {"_id": 0}
        )
        
        # Initialize chatbot service
        chatbot = ChatbotService(
            tenant_id=message_data.tenant_id,
            system_prompt=config.get('system_prompt') if config else None,
            use_custom_key=config.get('use_own_api_key', False) if config else False,
            custom_api_key=config.get('openai_api_key') if config else None
        )
        
        # Get conversation history (last 10 messages for context)
        messages = await db.chat_messages.find(
            {'conversation_id': conversation_id},
            {"_id": 0}
        ).sort('timestamp', -1).limit(10).to_list(length=10)
        
        # Reverse to get chronological order
        messages.reverse()
        
        # Use SIMPLE chatbot - sharp and quick!
        from services.simple_chatbot_service import simple_chatbot
        
        # Get context from request (project info, page type, etc)
        context = message_data.context if hasattr(message_data, 'context') else {}
        
        chat_response = await simple_chatbot.chat(
            conversation_id=conversation_id,
            user_message=message_data.content,
            context=context
        )
        
        ai_response = chat_response["message"]
        action = chat_response.get("action", "continue")
        action_data = chat_response.get("data", {})
        
        # Save assistant message
        assistant_msg = ChatMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_response,
            language=message_data.language
        )
        assistant_msg_doc = serialize_doc(assistant_msg.model_dump())
        await db.chat_messages.insert_one(assistant_msg_doc)
        
        # Update conversation stats
        await db.chat_conversations.update_one(
            {'id': conversation_id},
            {
                '$set': {
                    'last_message_at': datetime.now(timezone.utc).isoformat()
                },
                '$inc': {
                    'message_count': 2  # user + assistant
                }
            }
        )
        
        # Check if we should trigger lead capture
        should_capture = chatbot.should_capture_lead(message_data.content, ai_response)
        
        if should_capture:
            # Extract contact info
            contact_info = chatbot.extract_contact_info(message_data.content)
            
            # Update conversation with lead info if found
            if contact_info.get('phone'):
                await db.chat_conversations.update_one(
                    {'id': conversation_id},
                    {
                        '$set': {
                            'visitor_phone': contact_info['phone'],
                            'visitor_email': contact_info.get('email'),
                            'is_lead': True
                        }
                    }
                )
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "user_message": user_msg.model_dump(),
            "assistant_message": assistant_msg.model_dump(),
            "should_capture_lead": should_capture,
            "action": action,
            "action_data": action_data
        }
        
    except Exception as e:
        print(f"Error in chat message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/capture-lead")
async def capture_lead(
    lead_data: LeadCapture,
    request: Request
):
    """Capture lead information from conversation (PUBLIC)"""
    db = get_db(request)
    
    # Update conversation with lead info
    result = await db.chat_conversations.update_one(
        {'id': lead_data.conversation_id},
        {
            '$set': {
                'visitor_name': lead_data.name,
                'visitor_phone': lead_data.phone,
                'visitor_email': lead_data.email,
                'lead_interest': lead_data.interest,
                'is_lead': True,
                'lead_status': 'new'
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "success": True,
        "message": "Lead information captured successfully"
    }


@router.get("/history/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    request: Request
):
    """Get conversation history (PUBLIC - for widget)"""
    db = get_db(request)
    
    # Get conversation
    conversation = await db.chat_conversations.find_one({'id': conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages = await db.chat_messages.find(
        {'conversation_id': conversation_id},
        {"_id": 0}
    ).sort('timestamp', 1).to_list(length=1000)
    
    return {
        "success": True,
        "conversation": conversation,
        "messages": messages
    }


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/conversations")
async def get_all_conversations(
    request: Request,
    tenant_id: Optional[str] = None,
    is_lead: Optional[bool] = None,
    lead_status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get all conversations with filters (ADMIN)"""
    db = get_db(request)
    
    query = {}
    if tenant_id:
        query['tenant_id'] = tenant_id
    if is_lead is not None:
        query['is_lead'] = is_lead
    if lead_status:
        query['lead_status'] = lead_status
    
    conversations = await db.chat_conversations.find(
        query,
        {"_id": 0}
    ).sort('last_message_at', -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.chat_conversations.count_documents(query)
    
    return {
        "success": True,
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/admin/conversation/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """Get conversation with all messages (ADMIN)"""
    db = get_db(request)
    
    conversation = await db.chat_conversations.find_one({'id': conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.chat_messages.find(
        {'conversation_id': conversation_id},
        {"_id": 0}
    ).sort('timestamp', 1).to_list(length=1000)
    
    # Get chatbot config
    config = await db.chatbot_configs.find_one({'tenant_id': conversation.get('tenant_id')}, {"_id": 0})
    
    return {
        "success": True,
        "conversation": conversation,
        "messages": messages,
        "config": config
    }


@router.get("/admin/analytics")
async def get_chat_analytics(
    request: Request,
    tenant_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get chat analytics (ADMIN)"""
    db = get_db(request)
    
    query = {}
    if tenant_id:
        query['tenant_id'] = tenant_id
    
    total_conversations = await db.chat_conversations.count_documents(query)
    total_leads = await db.chat_conversations.count_documents({**query, 'is_lead': True})
    active_conversations = await db.chat_conversations.count_documents({**query, 'is_active': True})
    
    # Get total messages
    total_messages = await db.chat_messages.count_documents({})
    
    # Calculate metrics
    lead_conversion_rate = (total_leads / total_conversations * 100) if total_conversations > 0 else 0
    avg_messages = (total_messages / total_conversations) if total_conversations > 0 else 0
    
    return {
        "success": True,
        "analytics": {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "total_leads": total_leads,
            "active_conversations": active_conversations,
            "lead_conversion_rate": round(lead_conversion_rate, 2),
            "avg_messages_per_conversation": round(avg_messages, 2)
        }
    }
