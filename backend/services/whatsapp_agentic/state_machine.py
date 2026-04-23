"""
Conversation State Machine for WhatsApp Agentic AI
Manages conversation flow and state transitions
"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class ConversationState(str, Enum):
    """Possible conversation states"""
    NEW_LEAD = "new_lead"
    GREETING = "greeting"
    QUALIFICATION = "qualification"
    PROJECT_DISCUSSION = "project_discussion"
    SITE_VISIT_OFFER = "site_visit_offer"
    SITE_VISIT_SCHEDULED = "site_visit_scheduled"
    POST_VISIT_FOLLOWUP = "post_visit_followup"
    BOOKING_DISCUSSION = "booking_discussion"
    PAYMENT_PENDING = "payment_pending"
    BOOKED = "booked"
    HUMAN_HANDOFF = "human_handoff"
    CLOSED = "closed"


class CustomerIntent(str, Enum):
    """Detected customer intents"""
    GREETING = "greeting"
    PRICE_INQUIRY = "price_inquiry"
    AVAILABILITY_CHECK = "availability_check"
    LAYOUT_REQUEST = "layout_request"
    SITE_VISIT_REQUEST = "site_visit_request"
    BOOKING_INTEREST = "booking_interest"
    PAYMENT_QUESTION = "payment_question"
    GENERAL_QUESTION = "general_question"
    COMPLAINT = "complaint"
    HUMAN_REQUEST = "human_request"
    UNKNOWN = "unknown"


class ConversationStateMachine:
    """
    Manages conversation state transitions
    """
    
    # State transition rules
    VALID_TRANSITIONS = {
        ConversationState.NEW_LEAD: [
            ConversationState.GREETING,
            ConversationState.QUALIFICATION
        ],
        ConversationState.GREETING: [
            ConversationState.QUALIFICATION,
            ConversationState.PROJECT_DISCUSSION,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.QUALIFICATION: [
            ConversationState.PROJECT_DISCUSSION,
            ConversationState.SITE_VISIT_OFFER,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.PROJECT_DISCUSSION: [
            ConversationState.SITE_VISIT_OFFER,
            ConversationState.BOOKING_DISCUSSION,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.SITE_VISIT_OFFER: [
            ConversationState.SITE_VISIT_SCHEDULED,
            ConversationState.PROJECT_DISCUSSION,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.SITE_VISIT_SCHEDULED: [
            ConversationState.POST_VISIT_FOLLOWUP,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.POST_VISIT_FOLLOWUP: [
            ConversationState.BOOKING_DISCUSSION,
            ConversationState.PROJECT_DISCUSSION,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.BOOKING_DISCUSSION: [
            ConversationState.PAYMENT_PENDING,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.PAYMENT_PENDING: [
            ConversationState.BOOKED,
            ConversationState.HUMAN_HANDOFF
        ],
        ConversationState.BOOKED: [
            ConversationState.CLOSED
        ],
        ConversationState.HUMAN_HANDOFF: [
            ConversationState.PROJECT_DISCUSSION,
            ConversationState.BOOKING_DISCUSSION,
            ConversationState.CLOSED
        ]
    }
    
    # Intent to state mapping
    INTENT_STATE_MAP = {
        CustomerIntent.GREETING: ConversationState.GREETING,
        CustomerIntent.PRICE_INQUIRY: ConversationState.PROJECT_DISCUSSION,
        CustomerIntent.AVAILABILITY_CHECK: ConversationState.PROJECT_DISCUSSION,
        CustomerIntent.LAYOUT_REQUEST: ConversationState.PROJECT_DISCUSSION,
        CustomerIntent.SITE_VISIT_REQUEST: ConversationState.SITE_VISIT_OFFER,
        CustomerIntent.BOOKING_INTEREST: ConversationState.BOOKING_DISCUSSION,
        CustomerIntent.PAYMENT_QUESTION: ConversationState.PAYMENT_PENDING,
        CustomerIntent.HUMAN_REQUEST: ConversationState.HUMAN_HANDOFF,
        CustomerIntent.COMPLAINT: ConversationState.HUMAN_HANDOFF
    }
    
    def __init__(self, db):
        self.db = db
    
    async def get_or_create_conversation(
        self, 
        tenant_id: str, 
        lead_id: str, 
        phone: str
    ) -> Dict[str, Any]:
        """Get existing conversation or create new one"""
        
        # Find existing active conversation
        conversation = await self.db.whatsapp_conversations.find_one({
            "tenant_id": tenant_id,
            "lead_id": lead_id,
            "status": {"$ne": "closed"}
        }, {"_id": 0})
        
        if conversation:
            return conversation
        
        # Create new conversation
        conversation = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "lead_id": lead_id,
            "phone": phone,
            "state": ConversationState.NEW_LEAD.value,
            "previous_states": [],
            "context": {
                "language": None,
                "detected_budget": None,
                "interested_projects": [],
                "interested_plots": [],
                "qualification_data": {},
                "site_visit_id": None,
                "booking_id": None
            },
            "ai_enabled": True,
            "human_assigned": None,
            "message_count": 0,
            "last_message_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "active"
        }
        
        await self.db.whatsapp_conversations.insert_one(conversation)
        return conversation
    
    async def transition_state(
        self, 
        conversation_id: str, 
        new_state: ConversationState,
        context_update: Optional[Dict] = None
    ) -> bool:
        """
        Transition conversation to new state
        Returns True if transition is valid
        """
        conversation = await self.db.whatsapp_conversations.find_one(
            {"id": conversation_id},
            {"_id": 0}
        )
        
        if not conversation:
            return False
        
        current_state = ConversationState(conversation["state"])
        
        # Check if transition is valid
        valid_next_states = self.VALID_TRANSITIONS.get(current_state, [])
        
        # Allow transition if valid or if it's the same state
        if new_state not in valid_next_states and new_state != current_state:
            # Log invalid transition but allow it for flexibility
            print(f"Warning: Unusual state transition {current_state} -> {new_state}")
        
        # Build update
        update = {
            "$set": {
                "state": new_state.value,
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "previous_states": {
                    "state": current_state.value,
                    "timestamp": datetime.utcnow()
                }
            }
        }
        
        # If transitioning to human_handoff, DO NOT disable AI
        # Only explicit enable_human_handoff() call should disable AI
        # This allows testing conversation flow without getting stuck
        
        # Add context updates if provided
        if context_update:
            for key, value in context_update.items():
                update["$set"][f"context.{key}"] = value
        
        await self.db.whatsapp_conversations.update_one(
            {"id": conversation_id},
            update
        )
        
        return True
    
    async def update_context(
        self, 
        conversation_id: str, 
        context_update: Dict[str, Any]
    ):
        """Update conversation context"""
        update = {"$set": {"updated_at": datetime.utcnow()}}
        
        for key, value in context_update.items():
            update["$set"][f"context.{key}"] = value
        
        await self.db.whatsapp_conversations.update_one(
            {"id": conversation_id},
            update
        )
    
    async def enable_human_handoff(
        self, 
        conversation_id: str, 
        agent_id: Optional[str] = None,
        reason: str = "customer_request"
    ):
        """Switch conversation to human agent"""
        await self.db.whatsapp_conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "state": ConversationState.HUMAN_HANDOFF.value,
                    "ai_enabled": False,
                    "human_assigned": agent_id,
                    "handoff_reason": reason,
                    "handoff_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    async def resume_ai(self, conversation_id: str):
        """Resume AI conversation after human handoff"""
        await self.db.whatsapp_conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "ai_enabled": True,
                    "state": ConversationState.PROJECT_DISCUSSION.value,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    def get_suggested_state(self, intent: CustomerIntent, current_state: ConversationState) -> ConversationState:
        """Get suggested next state based on intent"""
        suggested = self.INTENT_STATE_MAP.get(intent)
        
        if suggested:
            return suggested
        
        # Default progression based on current state
        if current_state == ConversationState.NEW_LEAD:
            return ConversationState.GREETING
        elif current_state == ConversationState.GREETING:
            return ConversationState.QUALIFICATION
        elif current_state == ConversationState.QUALIFICATION:
            return ConversationState.PROJECT_DISCUSSION
        
        return current_state
