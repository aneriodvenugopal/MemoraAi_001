"""
Sales Engine v2 - MemoraAI Property Expert
Cost-optimized WhatsApp AI with Gemini primary + GPT-4o-mini fallback.

FLOW:
  User message -> Parse location/budget/intent
  -> RAG: Pull tenant's project data, plots, FAQs, location highlights
  -> Check DB for matching projects/properties
  -> Match Found? -> Show projects + location highlights -> Close (visit/call/booking)
  -> No Match? -> Ask max 3 questions -> Capture lead -> "Our team will call"

RULES:
  - Max 3 questions total
  - Never repeat questions
  - DB check FIRST, then ask
  - Fast conversion (visit/call/booking)
  - Exit on bye/not interested
  - Multi-tenant: use only current tenant's data
  - NEVER reveal customer private data
"""

import os
import re
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

from .llm_router import llm_router
from .knowledge_retriever import KnowledgeRetriever
from .conversation_enhancer import (
    detect_telugu, get_ist_greeting, get_ist_time_context,
    is_price_negotiation, split_long_message,
    get_urgency_data, get_negotiation_data,
    build_enhanced_system_context,
)

logger = logging.getLogger(__name__)

# Location keywords for Indian cities/areas
LOCATION_KEYWORDS = {
    "hyderabad": ["hyderabad", "hyd", "secunderabad", "shamirpet", "adibatla", "tukkuguda",
                   "kompally", "medchal", "miyapur", "gachibowli", "kondapur", "madhapur",
                   "kukatpally", "bachupally", "nizampet", "pragathi nagar", "patancheru",
                   "mokila", "shankarpally", "shadnagar", "maheshwaram", "ibrahimpatnam",
                   "ghatkesar", "uppal", "nagole", "lb nagar", "dilsukhnagar", "vanasthalipuram",
                   "hayathnagar", "balapur", "meerpet", "bandlaguda", "narsingi", "kokapet",
                   "financial district", "nanakramguda", "tellapur", "ameenpur", "isnapur",
                   "dundigal", "sangareddy", "sadashivpet", "chevella", "moinabad",
                   "srisailam highway", "airport", "shamshabad", "kothur", "sagar highway",
                   "gandipet", "osman sagar", "himayat sagar", "jubilee hills", "banjara hills",
                   "film nagar", "manikonda", "puppalaguda", "rajendra nagar",
                   "mehdipatnam", "attapur", "pillar no", "tolichowki"],
    "vijayawada": ["vijayawada", "vjw", "bezawada", "mangalagiri", "guntur", "amaravati",
                   "tadepalli", "undavalli", "sattenapalli", "tenali", "narasaraopet",
                   "santhinagar", "poranki", "kanuru", "gannavaram", "kanchikacherla",
                   "nunna", "jaggaiahpet", "ibrahimpatnam"],
    "visakhapatnam": ["visakhapatnam", "vizag", "vishakhapatnam", "madhurawada",
                      "gajuwaka", "anakapalle", "pendurthi", "simhachalam"],
    "bangalore": ["bangalore", "bengaluru", "blr", "whitefield", "electronic city",
                  "sarjapur", "hsr layout", "koramangala", "marathahalli"],
    "chennai": ["chennai", "madras", "tambaram", "velachery", "adyar", "anna nagar",
                "omr", "ecr", "sholinganallur"],
    "warangal": ["warangal", "hanamkonda", "kazipet"],
    "karimnagar": ["karimnagar"],
    "khammam": ["khammam"],
    "nalgonda": ["nalgonda"],
    "nizamabad": ["nizamabad"],
    "tirupati": ["tirupati"],
    "nellore": ["nellore"],
    "rajahmundry": ["rajahmundry", "rajamahendravaram"],
    "kakinada": ["kakinada"],
}

EXIT_KEYWORDS = ["bye", "not interested", "no thanks", "no need", "stop", "cancel",
                 "leave me", "dont want", "don't want", "no more", "exit"]

# Location highlights for Telangana/Hyderabad areas
LOCATION_HIGHLIGHTS = {
    "shamirpet": "RRR Road proximity, Genome Valley, IIT Hyderabad nearby, HMDA approved layouts",
    "adibatla": "Near Rajiv Gandhi International Airport, Aerospace SEZ, HMDA approved, RRR connectivity",
    "tukkuguda": "ORR Exit 14, Airport proximity, Growing residential hub, HMDA approved",
    "kompally": "Medchal-Malkajgiri district, NH-44 access, Metro expansion planned",
    "shadnagar": "Srisailam Highway, RRR connectivity, HMDA approved, Affordable pricing",
    "maheshwaram": "Near ORR, LB Nagar connectivity, HMDA approved, Pharma City nearby",
    "mokila": "Gachibowli proximity, IT corridor access, Peaceful residential area",
    "patancheru": "Industrial hub, NH-65 access, Affordable land rates",
    "kokapet": "Financial District adjacent, Premium location, Metro connectivity planned",
    "narsingi": "ORR access, Gachibowli IT hub nearby, Premium residential area",
    "tellapur": "Near Gachibowli, Rapid development, Metro planned",
    "shamshabad": "Airport Road, Logistics hub, HMDA approved",
    "mangalagiri": "Amaravati Capital Region, NH-16 access, Growing city",
    "guntur": "AP major city, Medical hub, Education center",
    "tadepalli": "Krishna River front, Capital Region, NH connectivity",
}


def extract_location(message: str) -> Optional[str]:
    """Extract location/city from user message"""
    msg_lower = message.lower()
    for city, keywords in LOCATION_KEYWORDS.items():
        for kw in keywords:
            if kw in msg_lower:
                if kw != city:
                    return kw.title()
                return city.title()
    return None


def extract_budget(message: str) -> Optional[Dict[str, Any]]:
    """Extract budget from message. Returns dict with min/max and raw text"""
    msg_lower = message.lower()
    patterns = [
        (r'(\d+\.?\d*)\s*(?:to|-)\s*(\d+\.?\d*)\s*(?:lakhs?|lacs?|l\b)', 'lakh_range'),
        (r'(\d+\.?\d*)\s*(?:to|-)\s*(\d+\.?\d*)\s*(?:crores?|cr\b)', 'crore_range'),
        (r'(\d+\.?\d*)\s*(?:lakhs?|lacs?|l\b)', 'lakh'),
        (r'(\d+\.?\d*)\s*(?:crores?|cr\b)', 'crore'),
        (r'(\d+\.?\d*)\s*(?:k\b)', 'thousand'),
    ]
    for pattern, ptype in patterns:
        match = re.search(pattern, msg_lower)
        if match:
            if ptype == 'lakh_range':
                return {"min": float(match.group(1)) * 100000, "max": float(match.group(2)) * 100000,
                        "text": f"{match.group(1)}-{match.group(2)} Lakhs"}
            elif ptype == 'crore_range':
                return {"min": float(match.group(1)) * 10000000, "max": float(match.group(2)) * 10000000,
                        "text": f"{match.group(1)}-{match.group(2)} Crores"}
            elif ptype == 'lakh':
                val = float(match.group(1)) * 100000
                return {"min": val * 0.8, "max": val * 1.2, "text": f"{match.group(1)} Lakhs"}
            elif ptype == 'crore':
                val = float(match.group(1)) * 10000000
                return {"min": val * 0.8, "max": val * 1.2, "text": f"{match.group(1)} Crores"}
            elif ptype == 'thousand':
                val = float(match.group(1)) * 1000
                return {"min": val * 0.8, "max": val * 1.2, "text": f"{match.group(1)}K"}
    return None


def extract_property_type(message: str) -> Optional[str]:
    """Extract property type from message"""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["plot", "plots", "land", "site", "sites", "open plot"]):
        return "plot"
    if any(w in msg_lower for w in ["villa", "villas", "house", "independent house", "duplex"]):
        return "villa"
    if any(w in msg_lower for w in ["flat", "flats", "apartment", "apartments", "2bhk", "3bhk", "1bhk"]):
        return "flat"
    if any(w in msg_lower for w in ["commercial", "shop", "office", "warehouse", "godown"]):
        return "commercial"
    if any(w in msg_lower for w in ["farm", "farm land", "agricultural", "agriculture"]):
        return "farmland"
    if any(w in msg_lower for w in ["residential", "property", "properties"]):
        return "residential"
    return None


def is_exit_message(message: str) -> bool:
    msg_lower = message.lower().strip()
    return any(kw in msg_lower for kw in EXIT_KEYWORDS)


def extract_name_from_message(message: str) -> Optional[str]:
    """Extract customer name from message text."""
    patterns = [
        r"(?:my name is|i am|i'm|this is|myself)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"(?:name|naam)\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"(?:na peru|naa peru|peru)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pat in patterns:
        match = re.search(pat, message, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if len(name) > 2 and name.lower() not in {"sir", "madam", "hi", "hello"}:
                return name
    return None


def is_option_selection(message: str) -> Optional[int]:
    msg = message.strip()
    if msg in ["1", "2", "3"]:
        return int(msg)
    if msg.lower() in ["call", "talk", "phone"]:
        return 1
    if msg.lower() in ["visit", "site visit", "see", "schedule"]:
        return 2
    if msg.lower() in ["details", "more info", "information", "brochure"]:
        return 3
    return None


def get_location_highlights(location: str) -> str:
    """Get location highlights for a given area"""
    loc_lower = location.lower()
    for area, highlights in LOCATION_HIGHLIGHTS.items():
        if area in loc_lower or loc_lower in area:
            return highlights
    return ""


# System prompt for the MemoraAI Property Expert
REALAPEX_EXPERT_PROMPT = """You are a warm, friendly, professional {business_role} for {business_name}.
You sound HUMAN — never robotic, never overly salesy. Build trust naturally.

BUSINESS CATEGORY: {business_category}
SERVICES OFFERED:
{services_list}

STYLE (MANDATORY):
- 1 to 4 short lines per reply. NO paragraphs.
- Use • bullets for lists
- Only emojis: max 1-2, only when useful
- NEVER say "Certainly!", "I'd be delighted", "Absolutely!"
- Use natural, warm language appropriate for {business_category}
- Telugu detected? Reply in natural Telugu-English mix.
- Links on separate line with label
- Ask ONE next-step question only
- *bold* for key info

NEVER SAY THESE:
- "Sorry, I have no data"
- "I don't know"
- "I can't answer that"
- "No information available"
Instead: Share whatever data IS available and offer next step (call, visit, appointment).

SENSITIVE/DIFFICULT QUESTIONS:
Reply: "Good question. Our expert will explain this in detail over a call. Shall I arrange a call for you?"

DATA RULES:
- Use ONLY this tenant's data from Knowledge Base
- Share actual names, prices, availability
- NEVER reveal other customer data
- NEVER make up data not in Knowledge Base
- Recommend services from the SERVICES list when relevant
- For booking/appointment requests, confirm service details and offer to schedule

{knowledge_context}

{location_highlights}

CUSTOMER MEMORY:
{customer_memory}

KNOWN CUSTOMER INFO: {known_info}
MISSING INFO: {missing_info}
QUESTIONS ASKED: {questions_asked}
"""


class SalesEngine:
    """
    DB-First Real Estate Sales Engine v2.
    Uses Gemini (primary) + GPT-4o-mini (fallback) for cost optimization.
    Full long-term conversation memory via chat history from DB.
    """

    # Max recent messages to send in full to LLM
    MAX_RECENT_MESSAGES = 5
    # Messages older than this get summarized
    SUMMARIZE_THRESHOLD = 50

    def __init__(self, db):
        self.db = db
        self.knowledge_retriever = KnowledgeRetriever(db)

    async def _load_chat_history(
        self, conversation_id: str, phone: str
    ) -> List[Dict[str, str]]:
        """
        Load full chat history for this phone/conversation from DB.
        Returns list of {"role": "user"|"assistant", "content": "..."}.

        Memory management:
        - Last 30 messages: sent in full
        - Older messages: auto-summarized into a single context block
        """
        # Load all messages for this conversation, oldest first
        all_messages = await self.db.whatsapp_messages.find(
            {"conversation_id": conversation_id},
            {"_id": 0, "role": 1, "content": 1, "timestamp": 1}
        ).sort("timestamp", 1).to_list(500)

        if not all_messages:
            return []

        # Filter to user/assistant only (skip system messages)
        chat_msgs = [
            m for m in all_messages
            if m.get("role") in ("user", "assistant") and m.get("content")
        ]

        total = len(chat_msgs)

        if total <= self.MAX_RECENT_MESSAGES:
            # All messages fit — return as-is
            return [{"role": m["role"], "content": m["content"]} for m in chat_msgs]

        # Split: old messages get summarized, recent messages kept in full
        old_msgs = chat_msgs[: total - self.MAX_RECENT_MESSAGES]
        recent_msgs = chat_msgs[total - self.MAX_RECENT_MESSAGES :]

        # Check if a summary already exists for this conversation
        existing_summary = await self.db.whatsapp_conversation_summaries.find_one(
            {"conversation_id": conversation_id, "message_count": {"$gte": len(old_msgs)}},
            {"_id": 0, "summary": 1}
        )

        if existing_summary:
            summary_text = existing_summary["summary"]
        else:
            # Generate summary of old messages
            summary_text = self._build_summary(old_msgs)
            # Cache the summary
            await self.db.whatsapp_conversation_summaries.update_one(
                {"conversation_id": conversation_id},
                {"$set": {
                    "conversation_id": conversation_id,
                    "summary": summary_text,
                    "message_count": len(old_msgs),
                    "updated_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )

        # Build final history: summary as first "assistant" context + recent messages
        history = []
        if summary_text:
            history.append({
                "role": "user",
                "content": "[Previous conversation summary — customer context]"
            })
            history.append({
                "role": "assistant",
                "content": summary_text
            })

        for m in recent_msgs:
            history.append({"role": m["role"], "content": m["content"]})

        logger.info(f"Chat history loaded: {total} total msgs, {len(old_msgs)} summarized, {len(recent_msgs)} recent")
        return history

    def _build_summary(self, messages: List[Dict]) -> str:
        """Build a text summary of old messages (without LLM — fast extraction)."""
        parts = ["PREVIOUS CONVERSATION SUMMARY:"]
        customer_topics = set()
        customer_locations = set()
        customer_budget = ""

        for m in messages:
            content = m.get("content", "")
            role = m.get("role", "")

            if role == "user":
                # Extract key info from customer messages
                loc = extract_location(content)
                if loc:
                    customer_locations.add(loc)
                budget = extract_budget(content)
                if budget:
                    customer_budget = budget.get("text", "")
                prop_type = extract_property_type(content)
                if prop_type:
                    customer_topics.add(prop_type)
                # Keep first few customer messages as context
                if len(parts) < 8:
                    parts.append(f"Customer: {content[:100]}")
            elif role == "assistant" and len(parts) < 10:
                parts.append(f"Agent: {content[:100]}")

        if customer_locations:
            parts.append(f"Customer interested in: {', '.join(customer_locations)}")
        if customer_budget:
            parts.append(f"Budget mentioned: {customer_budget}")
        if customer_topics:
            parts.append(f"Property types discussed: {', '.join(customer_topics)}")

        return "\n".join(parts)

    async def process(
        self,
        tenant_id: str,
        lead_id: str,
        phone: str,
        message: str,
        conversation: Dict[str, Any],
        message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Main sales engine entry point."""
        context = conversation.get("context", {})
        state = conversation.get("state", "new_lead")
        questions_asked = context.get("questions_asked", 0)

        # --- STALE CONVERSATION RESET ---
        if context.get("lead_captured") or questions_asked > 3:
            logger.info(f"Resetting stale conversation for {phone} (lead_captured={context.get('lead_captured')}, questions={questions_asked})")
            context = {
                "location": context.get("location"),
                "budget": context.get("budget"),
                "budget_text": context.get("budget_text"),
                "property_type": context.get("property_type"),
                "questions_asked": 0,
                "lead_captured": False,
            }
            questions_asked = 0
            state = "new_lead"

        # --- EXIT CHECK ---
        if is_exit_message(message):
            return {
                "success": True,
                "response": "Thank you! Reach us anytime. Have a great day!",
                "next_state": "closed",
                "action": "conversation_closed",
                "context_update": {"status": "closed"}
            }

        # --- EXTRACT INFO FROM MESSAGE ---
        location = extract_location(message) or context.get("location")
        budget = extract_budget(message)
        prop_type = extract_property_type(message) or context.get("property_type")

        new_context = dict(context)
        if location and not context.get("location"):
            new_context["location"] = location
        if budget:
            new_context["budget"] = budget
            new_context["budget_text"] = budget["text"]
        if prop_type and not context.get("property_type"):
            new_context["property_type"] = prop_type

        # --- LOAD FULL CHAT HISTORY (long-term memory) ---
        conv_id = conversation.get("id", "")
        chat_history = await self._load_chat_history(conv_id, phone)

        # --- CONVERSATION ENHANCEMENTS ---
        is_telugu = detect_telugu(message) or context.get("is_telugu", False)
        customer_name = context.get("customer_name", "")
        detected_name = extract_name_from_message(message)
        if detected_name:
            customer_name = detected_name
        if not customer_name:
            # Try from lead data
            lead_data = await self.db.leads.find_one(
                {"tenant_id": tenant_id, "id": lead_id}, {"_id": 0, "buyer_name": 1}
            )
            if lead_data and lead_data.get("buyer_name"):
                customer_name = lead_data["buyer_name"]

        new_context["is_telugu"] = is_telugu
        if customer_name:
            new_context["customer_name"] = customer_name

        # Time-aware greeting
        time_greeting = get_ist_greeting()
        current_time = get_ist_time_context()

        # Price negotiation detection
        is_negotiation = is_price_negotiation(message)

        # Urgency data from DB
        matched_project_id = context.get("matched_project_id", "")
        urgency = await get_urgency_data(self.db, tenant_id, matched_project_id)

        # Negotiation data (only if customer is negotiating)
        negotiation = None
        if is_negotiation:
            negotiation = await get_negotiation_data(self.db, tenant_id, matched_project_id)

        # Build enhanced context string for LLM
        enhanced_context = build_enhanced_system_context(
            customer_name=customer_name,
            is_telugu=is_telugu,
            time_greeting=time_greeting if state == "new_lead" else "",
            urgency=urgency,
            negotiation=negotiation,
            current_time=current_time,
        )
        new_context["_enhanced"] = enhanced_context

        # --- OPTION SELECTION (after projects shown) ---
        if state == "project_discussion":
            option = is_option_selection(message)
            if option:
                return await self._handle_option_selection(
                    option, tenant_id, lead_id, phone, new_context, chat_history
                )

        # --- SITE VISIT SCHEDULING ---
        if state == "site_visit_offer":
            return await self._handle_site_visit_scheduling(
                message, tenant_id, lead_id, phone, new_context, conversation
            )

        # --- FACING DIRECTION QUERY ---
        facing_query = self._detect_facing_query(message)
        if facing_query:
            facing_response = await self._handle_facing_query(
                tenant_id, facing_query, message, new_context
            )
            if facing_response:
                return facing_response

        # --- ALWAYS LOAD TENANT KNOWLEDGE (RAG) ---
        knowledge = await self.knowledge_retriever.get_project_knowledge(tenant_id)
        knowledge_text = self.knowledge_retriever.format_knowledge_for_llm(knowledge)

        # STRICT ISOLATION: No cross-tenant fallback. If tenant has no data, respond honestly.
        if not knowledge.get("projects") and not knowledge.get("available_plots"):
            logger.info(f"Tenant {tenant_id} has no project data uploaded yet.")

        # --- CHECK: Is this a project inquiry? ---
        is_project_inquiry = self._is_project_inquiry(message)

        # --- SEARCH BY PROJECT NAME (fuzzy/partial match) ---
        name_match = await self._search_by_project_name(tenant_id, message)
        if name_match:
            response = await self._format_project_detail(name_match, tenant_id, message, new_context, chat_history)
            action = "project_detail_shown"
            return {
                "success": True,
                "response": response,
                "next_state": "project_discussion",
                "action": action,
                "context_update": {
                    **new_context,
                    "matched_project_id": name_match.get("id"),
                    "matched_project_name": name_match.get("name"),
                },
                "quick_replies": self._get_quick_replies(action, new_context),
            }

        # --- DB SEARCH BY LOCATION (if location available) ---
        current_location = new_context.get("location")
        if current_location:
            matches = await self._search_db(tenant_id, current_location, new_context.get("budget"))
            if matches["projects"] or matches["properties"]:
                response = await self._format_matches_with_ai(
                    matches, current_location, new_context, tenant_id, message, chat_history
                )
                return {
                    "success": True,
                    "response": response,
                    "next_state": "project_discussion",
                    "action": "projects_shown",
                    "context_update": {
                        **new_context,
                        "matches_found": True,
                        "match_count": len(matches["projects"]) + len(matches["properties"])
                    }
                }

        # --- PROJECT INQUIRY WITHOUT LOCATION ---
        # User asks "project names", "show projects", "availability" etc.
        if is_project_inquiry:
            return await self._handle_project_inquiry(
                message, tenant_id, new_context, knowledge, knowledge_text, chat_history
            )

        # --- SMART AI RESPONSE WITH KNOWLEDGE ---
        # For any message, use LLM with full project knowledge to answer
        return await self._smart_response_with_knowledge(
            message, tenant_id, lead_id, phone, new_context, questions_asked, state,
            knowledge_text, chat_history
        )

    def _get_quick_replies(self, action: str, context: Dict) -> List[Dict[str, str]]:
        """Generate context-appropriate quick reply buttons (max 3)."""
        if action in ("projects_shown", "project_detail_shown", "project_info_shared", "facing_query_answered"):
            return [
                {"id": "qr_visit", "title": "📍 Site Visit"},
                {"id": "qr_call", "title": "📞 Call Me"},
                {"id": "qr_layout", "title": "📐 Layout"},
            ]
        if action in ("callback_requested", "site_visit_flow", "visit_scheduled"):
            return [
                {"id": "qr_today", "title": "Today"},
                {"id": "qr_tomorrow", "title": "Tomorrow"},
                {"id": "qr_weekend", "title": "This Weekend"},
            ]
        if action == "lead_qualifying":
            missing = context.get("last_asked", "")
            if missing == "property_type":
                return [
                    {"id": "qr_plots", "title": "Plots"},
                    {"id": "qr_flats", "title": "Flats/Apartment"},
                    {"id": "qr_villas", "title": "Villas"},
                ]
            if missing == "budget":
                return [
                    {"id": "qr_20l", "title": "20-30 Lakhs"},
                    {"id": "qr_40l", "title": "30-50 Lakhs"},
                    {"id": "qr_50l", "title": "50L - 1Cr"},
                ]
            return [
                {"id": "qr_visit", "title": "📍 Site Visit"},
                {"id": "qr_call", "title": "📞 Call Me"},
                {"id": "qr_projects", "title": "Show Projects"},
            ]
        # Default
        return [
            {"id": "qr_visit", "title": "📍 Site Visit"},
            {"id": "qr_call", "title": "📞 Call Me"},
            {"id": "qr_projects", "title": "Show Projects"},
        ]

    def _detect_facing_query(self, message: str) -> Optional[str]:
        """Detect if customer is asking about facing directions."""
        msg_lower = message.lower()
        facings = {
            "east": ["east", "east facing", "toorpu", "sunrise"],
            "west": ["west", "west facing", "padamara", "sunset"],
            "north": ["north", "north facing", "uttaram"],
            "south": ["south", "south facing", "dakshinam"],
            "north-east": ["north east", "north-east", "northeast", "ne facing"],
            "south-east": ["south east", "south-east", "southeast", "se facing"],
            "north-west": ["north west", "north-west", "northwest", "nw facing"],
            "south-west": ["south west", "south-west", "southwest", "sw facing"],
        }
        # Check if "facing" or direction keyword present
        has_facing_context = "facing" in msg_lower or "face" in msg_lower or "direction" in msg_lower
        for direction, keywords in facings.items():
            if any(kw in msg_lower for kw in keywords):
                return direction
        if has_facing_context:
            return "all"
        return None

    async def _handle_facing_query(
        self, tenant_id: str, facing: str, message: str, context: Dict
    ) -> Optional[Dict[str, Any]]:
        """Handle facing direction queries — return project-wise facing counts."""
        wants_plot_numbers = any(
            kw in message.lower()
            for kw in ["plot number", "unit number", "property number", "plot no", "unit no", "numbers"]
        )

        # Get all projects for this tenant
        projects = await self.db.projects.find(
            {"tenant_id": tenant_id, "deleted_at": None}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(20)

        if not projects:
            return None

        parts = []
        found_any = False

        for proj in projects:
            pid = proj["id"]
            pname = proj.get("name", "Project")

            # Query properties by facing
            if facing == "all":
                props = await self.db.properties.find(
                    {"project_id": pid, "deleted_at": None, "facing": {"$exists": True, "$ne": ""}},
                    {"_id": 0, "facing": 1, "plot_number": 1, "property_number": 1, "area_sqft": 1, "total_area": 1, "status": 1}
                ).to_list(200)
            else:
                props = await self.db.properties.find(
                    {"project_id": pid, "deleted_at": None, "facing": {"$regex": facing, "$options": "i"}},
                    {"_id": 0, "facing": 1, "plot_number": 1, "property_number": 1, "area_sqft": 1, "total_area": 1, "status": 1}
                ).to_list(200)

            if not props:
                continue

            found_any = True
            available = [p for p in props if str(p.get("status", "")).lower() in ["available", ""]]

            if facing == "all":
                # Group by facing direction
                facing_counts = {}
                for p in available:
                    f = p.get("facing", "Unknown")
                    facing_counts[f] = facing_counts.get(f, 0) + 1
                parts.append(f"*{pname}*:")
                for f_dir, count in sorted(facing_counts.items()):
                    parts.append(f"• {f_dir} Facing - {count} units")
            else:
                parts.append(f"*{pname}*: {facing.title()} Facing - {len(available)} available")

            # Show plot numbers only if specifically asked
            if wants_plot_numbers and available:
                for p in available[:10]:
                    plot_num = p.get("plot_number") or p.get("property_number") or ""
                    area = p.get("area_sqft") or p.get("total_area") or ""
                    area_str = f" ({area} sqft)" if area else ""
                    parts.append(f"  ✅ Plot {plot_num}{area_str}")
                if len(available) > 10:
                    parts.append(f"  ... +{len(available)-10} more")

        if not found_any:
            return None

        # Add next step
        parts.append("")
        parts.append("Shall I share layout or schedule a visit?")

        return {
            "success": True,
            "response": "\n".join(parts),
            "next_state": "project_discussion",
            "action": "facing_query_answered",
            "context_update": {**context, "facing_preference": facing},
            "quick_replies": ["📐 Layout", "📍 Site Visit", "📞 Call Me"],
        }

    async def _search_by_project_name(self, tenant_id: str, message: str) -> Optional[Dict]:
        """
        Smart project name search — fuzzy, partial, token matching.
        Extracts potential project name tokens from user message and searches DB.
        """
        msg_lower = message.lower().strip()

        # Skip very short or generic messages
        if len(msg_lower) < 3 or msg_lower in ["hi", "hello", "hey", "ok", "yes", "no", "1", "2", "3"]:
            return None

        # Remove common filler words to extract project name tokens
        filler_words = {
            "show", "me", "the", "about", "tell", "give", "details", "of", "in",
            "what", "is", "are", "do", "you", "have", "any", "data", "project",
            "projects", "plots", "plot", "available", "status", "price", "layout",
            "unda", "undi", "cheppu", "kavali", "kosam", "lo", "ki", "ni", "na",
            "i", "want", "need", "looking", "for", "a", "can", "get", "info",
            "information", "property", "properties", "how", "many",
            "my", "and", "was", "were", "or", "no", "yes", "ok", "it", "its",
            "this", "that", "to", "at", "on", "with", "from", "by", "be",
            "not", "but", "so", "if", "he", "she", "we", "they", "your",
            "our", "has", "had", "will", "would", "could", "should", "did",
            "name", "called", "which", "where", "when", "who", "there",
        }
        tokens = [w for w in msg_lower.split() if w not in filler_words and len(w) > 1]
        if not tokens:
            return None

        # Build search query: try matching project name with extracted tokens
        search_patterns = []
        # Full token string
        token_str = " ".join(tokens)
        if len(token_str) > 2:
            search_patterns.append({"name": {"$regex": token_str, "$options": "i"}})

        # Individual tokens (for partial match)
        for token in tokens:
            if len(token) > 2:
                search_patterns.append({"name": {"$regex": token, "$options": "i"}})

        if not search_patterns:
            return None

        # Search projects
        projects = await self.db.projects.find(
            {"tenant_id": tenant_id, "deleted_at": None, "$or": search_patterns},
            {"_id": 0}
        ).limit(5).to_list(5)

        if not projects:
            return None

        # Score matches by how many tokens match
        best_match = None
        best_score = 0
        for proj in projects:
            proj_name_lower = proj.get("name", "").lower()
            score = sum(1 for t in tokens if t in proj_name_lower)
            # Bonus for exact substring match
            if token_str in proj_name_lower:
                score += 5
            if score > best_score:
                best_score = score
                best_match = proj

        # Only return if at least 2 tokens matched OR exact substring match
        if best_match and best_score >= 2:
            logger.info(f"Project name match: '{best_match.get('name')}' (score={best_score}, tokens={tokens})")
            return best_match

        return None

    async def _format_project_detail(
        self, project: Dict, tenant_id: str, message: str, context: Dict,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """Format a specific project's full details with plot availability table"""
        project_id = project.get("id", "")
        project_name = project.get("name", "Project")
        base_url = "https://memoraai.in"

        # Get all properties for this project
        properties = await self.db.properties.find(
            {"project_id": project_id, "deleted_at": None},
            {"_id": 0}
        ).to_list(200)

        # Count by status
        available = [p for p in properties if str(p.get("status", "")).lower() in ["available", ""]]
        sold = [p for p in properties if str(p.get("status", "")).lower() in ["sold", "booked", "reserved"]]
        total = len(properties)

        # Build plot availability table (compact, mobile-friendly)
        table_lines = []
        for p in available[:10]:  # Show max 10 available plots
            plot_num = p.get("plot_number") or p.get("property_number") or "N/A"
            area = p.get("area_sqft") or p.get("total_area") or ""
            area_str = f"{area} sqft" if area else ""
            facing = p.get("facing") or ""
            price = p.get("total_price") or p.get("price") or ""
            price_str = f"₹{price:,.0f}" if isinstance(price, (int, float)) and price else ""

            details = " | ".join(filter(None, [area_str, facing, price_str]))
            table_lines.append(f"✅ Plot {plot_num} - {details}")

        # Get layout info
        await self.db.layouts.find(
            {"project_id": project_id, "deleted_at": None},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(5)

        # Build clean, mobile-friendly response
        parts = []
        parts.append(f"*{project_name}*")
        parts.append(f"📍 {project.get('location', '')}, {project.get('city', '')}")

        # Key facts as compact bullets
        facts = []
        if project.get("rera_number"):
            facts.append(f"RERA: {project['rera_number']}")
        if project.get("status"):
            facts.append(f"Status: {project['status']}")
        if facts:
            parts.append(" • ".join(facts))

        parts.append(f"\n✅ *{len(available)} Available* / {len(sold)} Sold / {total} Total")

        if table_lines:
            parts.append("")
            for line in table_lines[:8]:
                parts.append(line)
            if len(available) > 8:
                parts.append(f"... +{len(available)-8} more available")

        # Links on separate lines
        project_link = f"{base_url}/projects/{project_id}"
        layout_link = f"{base_url}/public/projects/{project_id}/layout"
        parts.append(f"\nLayout:\n{layout_link}")
        parts.append(f"\nProject:\n{project_link}")

        if project.get("brochure_url"):
            brochure = project["brochure_url"]
            if not brochure.startswith("http"):
                brochure = f"{base_url}{brochure}"
            parts.append(f"\nBrochure:\n{brochure}")

        parts.append("\n1 - Talk to expert")
        parts.append("2 - Schedule visit")
        parts.append("3 - More details")
        parts.append("\n_Reply 1, 2 or 3_")

        return "\n".join(parts)

    def _is_project_inquiry(self, message: str) -> bool:
        """Detect if user is asking about projects, availability, or property details"""
        msg_lower = message.lower()
        inquiry_keywords = [
            "project", "projects", "project name", "project details",
            "available", "availability", "show me", "show properties",
            "what do you have", "what properties", "list", "names",
            "plots available", "how many", "which projects",
            "tell me about", "give me details", "brochure", "layout",
            "price", "pricing", "rate", "cost", "sqft rate",
            "amenities", "features", "rera", "status",
            "property details", "plot details", "units",
            "floor plan", "gallery", "images", "photos",
            "youtube", "video", "website", "link",
            "where is", "address", "total units",
        ]
        return any(kw in msg_lower for kw in inquiry_keywords)

    async def _handle_project_inquiry(
        self, message: str, tenant_id: str, context: Dict,
        knowledge: Dict, knowledge_text: str, chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Handle project inquiry - show ALL tenant projects/properties"""
        # Fetch ALL projects for this tenant
        all_projects = await self.db.projects.find(
            {"tenant_id": tenant_id, "deleted_at": None}, {"_id": 0}
        ).limit(10).to_list(10)

        # Count properties
        available_count = await self.db.properties.count_documents(
            {"tenant_id": tenant_id, "deleted_at": None,
             "status": {"$in": ["available", "Available", "AVAILABLE"]}}
        )
        total_count = await self.db.properties.count_documents(
            {"tenant_id": tenant_id, "deleted_at": None}
        )

        # STRICT ISOLATION: No cross-tenant data. If no data, respond honestly.

        # Build project summary for AI
        proj_summary = []
        for proj in all_projects:
            proj_summary.append(
                f"- *{proj.get('name', 'N/A')}*: {proj.get('location', '')}, "
                f"{proj.get('city', '')}, Status: {proj.get('status', 'N/A')}, "
                f"Units: {proj.get('total_units', 'N/A')}, "
                f"RERA: {proj.get('rera_number', 'N/A')}"
            )

        # Get sample properties
        await self.db.properties.find(
            {"tenant_id": tenant_id, "deleted_at": None},
            {"_id": 0, "plot_number": 1, "property_number": 1, "area_sqft": 1,
             "total_area": 1, "total_price": 1, "price": 1, "facing": 1,
             "status": 1, "location": 1, "location_text": 1, "city": 1}
        ).limit(5).to_list(5)

        try:
            prompt = f"""You are a real estate sales assistant. Customer asking about projects/properties.
Answer from the data below. Be specific and short.

PROJECTS ({len(all_projects)} total):
{chr(10).join(proj_summary) if proj_summary else 'No projects uploaded yet.'}

AVAILABILITY: {available_count} available / {total_count} total

KNOWLEDGE:
{knowledge_text[:2000]}

CUSTOMER: {message}

STYLE (MANDATORY):
- Max 4-6 short lines
- Use • bullets for project list
- One project per line with key detail
- No long paragraphs
- End with ONE question: "Which project interests you?" or "Shall I share layout?"
- Sound human: "Sure", "Here you go", "These are available"
- NEVER say "Certainly!" or "I'd be delighted"
- Max 1 emoji"""

            result = await llm_router.generate(
                system_prompt=prompt,
                user_message=message,
                context=context,
                chat_history=chat_history,
            )
            if result.get("text"):
                return {
                    "success": True,
                    "response": result["text"].strip(),
                    "next_state": "project_discussion",
                    "action": "project_info_shared",
                    "context_update": {**context, "projects_shown": True}
                }
        except Exception as e:
            logger.error(f"AI project inquiry failed: {e}")

        # Fallback: show projects as plain text
        if all_projects:
            parts = ["Our projects:\n"]
            for i, proj in enumerate(all_projects[:5], 1):
                loc = proj.get("location", proj.get("city", ""))
                parts.append(f"• *{proj.get('name', 'Project')}* - {loc}")
            if available_count:
                parts.append(f"\n✅ {available_count} plots available")
            parts.append("\n1 - Talk to expert")
            parts.append("2 - Schedule visit")
            parts.append("3 - Get details")
            parts.append("\n_Reply 1, 2 or 3_")
            return {
                "success": True,
                "response": "\n".join(parts),
                "next_state": "project_discussion",
                "action": "project_info_shared",
                "context_update": {**context, "projects_shown": True}
            }

        return {
            "success": True,
            "response": "Our project listings are being updated.\n\nWhich area are you interested in?",
            "next_state": "qualification",
            "action": "no_projects_found",
            "context_update": context
        }

    async def _smart_response_with_knowledge(
        self, message: str, tenant_id: str, lead_id: str, phone: str,
        context: Dict, questions_asked: int, state: str, knowledge_text: str,
        chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Smart AI response with full project knowledge + category awareness.
        Answers questions informationally FIRST, then guides to conversion.
        Falls back to lead capture only after max questions.
        """
        location = context.get("location")
        budget = context.get("budget")
        prop_type = context.get("property_type")

        # If we've asked 3+ questions already, capture and close
        if questions_asked >= 3:
            await self._update_lead(tenant_id, lead_id, {
                "status": "warm",
                "preferred_location": location or "",
                "budget": budget.get("max") if budget else None,
                "property_type": prop_type or "",
                "notes": f"WhatsApp lead capture: Location={location}, Budget={context.get('budget_text','N/A')}, Type={prop_type}"
            })
            return {
                "success": True,
                "response": "Noted. Our team will call you with best options shortly.",
                "next_state": "qualification",
                "action": "lead_captured",
                "context_update": {**context, "lead_captured": True},
                "human_followup_required": True
            }

        # Determine what's missing
        missing = []
        if not location:
            missing.append("location")
        if not prop_type:
            missing.append("property_type")
        if not budget:
            missing.append("budget")

        # Build known info
        known_info = []
        if location:
            known_info.append(f"Location: {location}")
        if context.get("budget_text"):
            known_info.append(f"Budget: {context['budget_text']}")
        if prop_type:
            known_info.append(f"Type: {prop_type}")

        known_str = ", ".join(known_info) if known_info else "Nothing known yet"
        missing_str = ", ".join(missing) if missing else "All info collected"

        # Truncate knowledge for prompt
        k_text = knowledge_text[:2500] if knowledge_text else "No project data available."

        loc_highlights = ""
        if location:
            highlights = get_location_highlights(location)
            if highlights:
                loc_highlights = f"\nLOCATION HIGHLIGHTS for {location}: {highlights}"

        # ── MemoraAI: Load category-aware context ──
        business_category = "Real Estate"
        business_role = "Sales Assistant"
        business_name = "Our Business"
        services_list = ""
        customer_memory = ""

        try:
            tenant = await self.db.tenants.find_one({"id": tenant_id}, {"_id": 0})
            if tenant:
                business_name = tenant.get("company_name", tenant.get("name", "Our Business"))
                cat_slug = tenant.get("business_category", "real_estate")
                business_category = tenant.get("business_category_name", "Real Estate")

                # Map category to role
                role_map = {
                    "real_estate": "Real Estate Sales Assistant",
                    "astrology": "Astrology Consultation Assistant",
                    "doctor_clinic": "Medical Receptionist & Assistant",
                    "function_hall": "Event Booking Assistant",
                    "pesticides_fertilizer": "Agricultural Products Advisor",
                    "beauty_salon": "Beauty & Wellness Booking Assistant",
                    "coaching_center": "Education Counselor & Assistant",
                }
                business_role = role_map.get(cat_slug, "Business Assistant")

            # Load active services for prompt
            services = await self.db.business_services.find(
                {"tenant_id": tenant_id, "is_active": True, "deleted_at": None},
                {"_id": 0, "name": 1, "description": 1, "price": 1, "duration_mins": 1}
            ).sort("sort_order", 1).to_list(15)

            if services:
                svc_lines = []
                for s in services:
                    price_str = f"Rs.{s['price']}" if s.get('price') else "Price on request"
                    dur_str = f"{s.get('duration_mins', 30)} mins" if s.get('duration_mins') else ""
                    svc_lines.append(f"• {s['name']}: {s.get('description', '')} | {price_str} | {dur_str}")
                services_list = "\n".join(svc_lines)
            else:
                services_list = "No specific services configured yet."

            # Load customer memory context via enhanced RAG
            from services.memory_ai_service import BusinessMemoryAI
            memory_ai = BusinessMemoryAI(self.db)
            customer_memory = await memory_ai.build_rag_context(tenant_id, phone, message)
            
            # Load business rules
            active_rules = await self.db.memoraai_rules.find(
                {"tenant_id": tenant_id, "is_active": True}, {"_id": 0}
            ).to_list(20)
            if active_rules:
                rules_text = "\n".join([f"- {r.get('rule','')}" for r in active_rules])
                customer_memory = f"{customer_memory}\n\n[BUSINESS RULES - MUST FOLLOW]\n{rules_text}"
        except Exception as cat_err:
            logger.warning(f"Category context load error (non-blocking): {cat_err}")

        system_prompt = REALAPEX_EXPERT_PROMPT.format(
            business_role=business_role,
            business_name=business_name,
            business_category=business_category,
            services_list=services_list or "General services",
            knowledge_context=f"\n--- KNOWLEDGE BASE ---\n{k_text}",
            location_highlights=loc_highlights,
            customer_memory=customer_memory or "New customer - no previous history.",
            known_info=known_str,
            missing_info=missing_str,
            questions_asked=questions_asked,
        )

        # Inject enhanced context (Telugu, name, time, urgency, negotiation)
        enhanced = context.get("_enhanced", "")
        if enhanced:
            system_prompt += f"\n\n--- CONTEXT ---\n{enhanced}"

        try:
            result = await llm_router.generate(
                system_prompt=system_prompt,
                user_message=message,
                context=context,
                chat_history=chat_history,
            )
            if result.get("text"):
                logger.info(f"LLM response via {result['model']}, cost~${result['cost_estimate']:.6f}, latency={result['latency_ms']}ms")
                return {
                    "success": True,
                    "response": result["text"].strip(),
                    "next_state": "qualification",
                    "action": "lead_qualifying",
                    "context_update": {
                        **context,
                        "questions_asked": questions_asked + 1,
                        "last_asked": missing[0] if missing else None
                    }
                }
        except Exception as e:
            logger.error(f"LLM error in sales engine: {e}")

        # Fallback
        if "location" in missing:
            return {
                "success": True,
                "response": "Which area are you looking for properties?",
                "next_state": "qualification",
                "action": "lead_qualifying",
                "context_update": {**context, "questions_asked": questions_asked + 1}
            }
        elif "budget" in missing:
            return {
                "success": True,
                "response": "What's your budget range?",
                "next_state": "qualification",
                "action": "lead_qualifying",
                "context_update": {**context, "questions_asked": questions_asked + 1}
            }
        elif "property_type" in missing:
            return {
                "success": True,
                "response": "Looking for plots, villa, or flat?",
                "next_state": "qualification",
                "action": "lead_qualifying",
                "context_update": {**context, "questions_asked": questions_asked + 1}
            }
        return {
            "success": True,
            "response": "Noted. Our team will call you shortly.",
            "next_state": "qualification",
            "action": "lead_captured",
            "context_update": {**context, "lead_captured": True},
            "human_followup_required": True
        }

    async def _search_db(
        self, tenant_id: str, location: str, budget: Optional[Dict] = None
    ) -> Dict[str, List]:
        """Search projects and properties by location and budget"""
        loc_lower = location.lower()

        project_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"location": {"$regex": loc_lower, "$options": "i"}},
                {"city": {"$regex": loc_lower, "$options": "i"}},
                {"name": {"$regex": loc_lower, "$options": "i"}},
                {"address": {"$regex": loc_lower, "$options": "i"}}
            ]
        }
        projects = await self.db.projects.find(
            project_query, {"_id": 0}
        ).limit(5).to_list(5)

        prop_query = {
            "tenant_id": tenant_id,
            "deleted_at": None,
            "$or": [
                {"location": {"$regex": loc_lower, "$options": "i"}},
                {"location_text": {"$regex": loc_lower, "$options": "i"}},
                {"city": {"$regex": loc_lower, "$options": "i"}},
                {"address": {"$regex": loc_lower, "$options": "i"}}
            ]
        }
        if budget:
            prop_query["$and"] = [
                {"$or": [
                    {"total_price": {"$gte": budget.get("min", 0), "$lte": budget.get("max", 999999999)}},
                    {"price": {"$gte": budget.get("min", 0), "$lte": budget.get("max", 999999999)}}
                ]}
            ]

        properties = await self.db.properties.find(
            prop_query, {"_id": 0}
        ).limit(10).to_list(10)

        if not properties and budget:
            properties = await self.db.properties.find(
                {k: v for k, v in prop_query.items() if k != "$and"},
                {"_id": 0}
            ).limit(10).to_list(10)

        return {"projects": projects, "properties": properties}

    async def _format_matches_with_ai(
        self, matches: Dict, location: str, context: Dict, tenant_id: str,
        user_message: str, chat_history: Optional[List[Dict]] = None
    ) -> str:
        """Format matches using AI for a natural, expert response"""
        # Build knowledge context from matches
        knowledge_parts = []
        for proj in matches["projects"][:3]:
            knowledge_parts.append(
                f"Project: {proj.get('name', '')}, Location: {proj.get('location', '')}, "
                f"Status: {proj.get('status', '')}, Units: {proj.get('total_units', '')}, "
                f"RERA: {proj.get('rera_number', 'N/A')}, "
                f"Amenities: {', '.join(proj.get('amenities', [])[:5])}"
            )

        if not matches["projects"]:
            for prop in matches["properties"][:5]:
                price = prop.get("total_price") or prop.get("price", "")
                price_str = f"Rs.{price:,.0f}" if isinstance(price, (int, float)) and price else "Contact"
                knowledge_parts.append(
                    f"Plot #{prop.get('plot_number', prop.get('property_number', 'N/A'))}: "
                    f"Area {prop.get('area_sqft') or prop.get('total_area', 'N/A')} sqft, "
                    f"Facing: {prop.get('facing', 'N/A')}, Price: {price_str}, "
                    f"Status: {prop.get('status', 'Available')}"
                )

        loc_highlights = get_location_highlights(location)

        # Use AI for natural formatting
        try:
            format_prompt = f"""You are a real estate sales assistant. Customer looking in {location}. Share matching properties.

DATA:
{chr(10).join(knowledge_parts)}

LOCATION: {loc_highlights if loc_highlights else 'N/A'}

STYLE (MANDATORY):
- Start with short confirmation: "Available in {location}:" or "Found matching options:"
- List properties with • bullets, one per line
- Include key detail per property (area, price, facing)
- Max 6-8 lines total
- End with:
1 - Talk to expert
2 - Schedule visit
3 - Full details

_Reply 1, 2 or 3_
- NEVER say "Certainly!" or "I'd be delighted"
- Max 1 emoji
- Sound human, not AI"""

            result = await llm_router.generate(
                system_prompt=format_prompt,
                user_message=user_message,
                context=context,
                force_model="gemini",
                chat_history=chat_history,
            )
            if result.get("text"):
                return result["text"]
        except Exception as e:
            logger.warning(f"AI formatting failed, using template: {e}")

        # Fallback: template format
        return self._format_matches_template(matches, location, context)

    def _format_matches_template(
        self, matches: Dict, location: str, context: Dict
    ) -> str:
        """Fallback template — short, mobile-friendly"""
        parts = [f"Available in {location}:\n"]

        for proj in matches["projects"][:3]:
            name = proj.get("name", "Project")
            loc = proj.get("location", "")
            parts.append(f"• *{name}* - {loc}")

        if not matches["projects"] and matches["properties"]:
            for prop in matches["properties"][:3]:
                plot_num = prop.get("plot_number", prop.get("property_number", ""))
                area = prop.get("area_sqft") or prop.get("total_area", "")
                price = prop.get("total_price") or prop.get("price", "")
                price_str = f"₹{price:,.0f}" if isinstance(price, (int, float)) and price else ""
                details = " | ".join(filter(None, [f"{area} sqft" if area else "", price_str]))
                parts.append(f"✅ Plot {plot_num} - {details}")

        parts.append("\n1 - Talk to expert")
        parts.append("2 - Schedule visit")
        parts.append("3 - Full details")
        parts.append("\n_Reply 1, 2 or 3_")

        return "\n".join(parts)

    async def _handle_option_selection(
        self, option: int, tenant_id: str, lead_id: str, phone: str, context: Dict,
        chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        if option == 1:
            await self._update_lead(tenant_id, lead_id, {
                "status": "hot",
                "notes": f"WhatsApp: Requested callback. Location: {context.get('location', 'N/A')}, Budget: {context.get('budget_text', 'N/A')}",
                "follow_up_date": datetime.now(timezone.utc).isoformat()
            })
            return {
                "success": True,
                "response": "Sure. Our expert will call you shortly.\n\nPreferred time for call?",
                "next_state": "qualification",
                "action": "callback_requested",
                "context_update": {**context, "callback_requested": True},
                "human_followup_required": True
            }
        elif option == 2:
            return {
                "success": True,
                "response": "Sure. Share your preferred date and time.\n\n_Example: Tomorrow 10 AM, Saturday 3 PM_",
                "next_state": "site_visit_offer",
                "action": "site_visit_flow",
                "context_update": {**context, "visit_requested": True}
            }
        elif option == 3:
            location = context.get("location", "")
            matches = await self._search_db(tenant_id, location) if location else {"projects": [], "properties": []}

            # Get full knowledge from RAG
            knowledge = await self.knowledge_retriever.get_project_knowledge(tenant_id)
            knowledge_text = self.knowledge_retriever.format_knowledge_for_llm(knowledge)

            try:
                detail_prompt = f"""Customer asked for project details in {location}. Share from data below.

KNOWLEDGE:
{knowledge_text[:2500]}

STYLE (MANDATORY):
- Project name on first line with *bold*
- Key facts as short bullet points (• location, units, RERA, amenities)
- Links on separate lines with labels:
  Layout:
  https://...
  Brochure:
  https://...
- Max 8-10 lines
- End with: "Shall I schedule a site visit?"
- Sound human, not AI. No "Certainly!" or "I'd be delighted"
- Max 1 emoji"""

                result = await llm_router.generate(
                    system_prompt=detail_prompt,
                    user_message=f"Tell me full details about properties in {location}",
                    context=context,
                    chat_history=chat_history,
                )
                if result.get("text"):
                    return {
                        "success": True,
                        "response": result["text"],
                        "next_state": "project_discussion",
                        "action": "details_sent",
                        "context_update": {**context, "details_sent": True}
                    }
            except Exception as e:
                logger.warning(f"AI details generation failed: {e}")

            # Fallback template
            detail_parts = [f"Project details for {location}:\n"]
            for proj in matches.get("projects", [])[:2]:
                detail_parts.append(f"*{proj.get('name', '')}*")
                if proj.get("description"):
                    detail_parts.append(f"{proj['description'][:200]}")
                if proj.get("amenities"):
                    amenities = proj["amenities"][:5] if isinstance(proj["amenities"], list) else []
                    if amenities:
                        detail_parts.append(f"Amenities: {', '.join(amenities)}")
                if proj.get("rera_number"):
                    detail_parts.append(f"RERA: {proj['rera_number']}")
                detail_parts.append("")
            detail_parts.append("Would you like to schedule a site visit?")
            detail_parts.append("_Reply 'yes' or '2' to book visit_")

            return {
                "success": True,
                "response": "\n".join(detail_parts),
                "next_state": "project_discussion",
                "action": "details_sent",
                "context_update": {**context, "details_sent": True}
            }

        return {"success": True, "response": "Please reply 1, 2 or 3.", "action": "invalid_option"}

    async def _handle_site_visit_scheduling(
        self, message: str, tenant_id: str, lead_id: str, phone: str,
        context: Dict, conversation: Dict
    ) -> Dict[str, Any]:
        visit_id = str(uuid.uuid4())
        visit = {
            "id": visit_id,
            "tenant_id": tenant_id,
            "lead_id": lead_id,
            "phone": phone,
            "location": context.get("location", ""),
            "preferred_time": message,
            "status": "scheduled",
            "source": "whatsapp_bot",
            "created_at": datetime.now(timezone.utc)
        }
        await self.db.site_visits.insert_one(visit)

        await self._update_lead(tenant_id, lead_id, {
            "status": "hot",
            "notes": f"WhatsApp: Site visit scheduled - {message}. Location: {context.get('location', 'N/A')}"
        })

        return {
            "success": True,
            "response": f"Visit confirmed ✅\n\nTime: {message}\nLocation: {context.get('location', 'N/A')}\n\nOur team will call to confirm.",
            "next_state": "site_visit_scheduled",
            "action": "visit_scheduled",
            "site_visit_id": visit_id,
            "context_update": {**context, "visit_scheduled": True, "visit_time": message},
            "human_followup_required": True
        }

    async def _update_lead(self, tenant_id: str, lead_id: str, updates: Dict):
        try:
            await self.db.leads.update_one(
                {"tenant_id": tenant_id, "id": lead_id},
                {"$set": {**updates, "updated_at": datetime.now(timezone.utc)}}
            )
        except Exception as e:
            logger.error(f"Failed to update lead: {e}")
