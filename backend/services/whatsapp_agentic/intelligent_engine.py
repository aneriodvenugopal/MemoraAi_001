"""
Intelligent Reply Engine — content-driven, memory-aware AI replies.

Replaces the canned `SalesEngine` flow with a generic, category-agnostic
pipeline that:

1. Pulls the tenant's BUSINESS CONTENT first (services, FAQs, rules,
   uploaded brochures/website text).
2. Adds CUSTOMER MEMORY (per-phone facts: name, prior asks, sentiment,
   commitments, language).
3. Adds SHORT-TERM CHAT HISTORY (last N turns of this conversation).
4. Detects LANGUAGE + SENTIMENT from the latest message.
5. Calls the LLM with a strict, grounded system prompt.
6. Persists reply metadata: source_used, memory_used, language_detected,
   sentiment, confidence_score.
"""
from __future__ import annotations
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .llm_router import llm_router

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────
# Heuristic detectors (fast, free, no LLM call)
# ────────────────────────────────────────────
_TELUGU_WORDS = (
    "meeru", "naaku", "naku", "miru", "mee", "ela", "enti", "cheppandi",
    "cheyyandi", "ledu", "undi", "kavali", "vunna", "evaru", "ekkada",
    "rate", "ela", "manchi", "thanks", "kaalam", "nadustundi"
)
_HINGLISH_WORDS = (
    "hai", "hain", "kya", "kaise", "kahan", "kab", "nahi", "haan", "ji",
    "kar", "karenge", "dijiye", "bhai", "bhaiya", "sahab", "bhai", "kaisa",
    "kitna", "kitne", "milega", "chahiye", "thik"
)
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097f]")
_TELUGU_SCRIPT_RE = re.compile(r"[\u0c00-\u0c7f]")


def detect_language(text: str) -> str:
    """Return one of: telugu, hindi, hinglish, english, mixed."""
    if not text:
        return "english"
    if _TELUGU_SCRIPT_RE.search(text):
        return "telugu"
    if _DEVANAGARI_RE.search(text):
        return "hindi"
    low = text.lower()
    tel = sum(1 for w in _TELUGU_WORDS if f" {w} " in f" {low} ")
    hin = sum(1 for w in _HINGLISH_WORDS if f" {w} " in f" {low} ")
    if tel >= 1 and hin == 0:
        return "telugu_english"
    if hin >= 1 and tel == 0:
        return "hinglish"
    if tel + hin >= 2:
        return "mixed"
    return "english"


_NEG = ("angry", "frustrat", "useless", "stupid", "garbage", "worst", "hate",
        "complain", "refund", "cheat", "fraud", "no need", "stop")
_POS = ("thanks", "thank you", "great", "good", "perfect", "love", "interested",
        "buy", "book", "pay", "price", "cost", "rate")
_CONFUSED = ("?", "what", "why", "how", "explain", "samajh", "ardham", "confused")


def detect_sentiment(text: str) -> str:
    """interested | confused | angry | neutral | happy"""
    if not text:
        return "neutral"
    low = text.lower()
    if any(w in low for w in _NEG):
        return "angry"
    if any(w in low for w in _POS):
        return "interested"
    if any(w in low for w in _CONFUSED):
        return "confused"
    return "neutral"


def detect_buying_intent(text: str) -> bool:
    if not text:
        return False
    low = text.lower()
    keywords = ("price", "cost", "rate", "fees", "fee", "book", "buy",
                "purchase", "appointment", "schedule", "order", "available",
                "demo", "trial", "interested", "kavali", "kitna", "kitne")
    return any(k in low for k in keywords)


# ────────────────────────────────────────────
# Engine
# ────────────────────────────────────────────
SYSTEM_PROMPT = """You are {business_role} for *{business_name}* — {business_category}.
You speak warmly and naturally, like a senior, helpful staff member who knows
this business inside-out. You remember every customer.

## Reply rules
- Reply in the SAME language/style the customer is using ({language_detected}).
- 1–4 short lines. WhatsApp tone. No long paragraphs.
- *bold* the key info (price, time, name). Use • for short lists.
- ALWAYS read RECENT CONVERSATION before replying. If the customer's
  current message is short (e.g. "Price?", "Time?", "OK", "Send"), assume
  it refers to whatever was discussed in the last 1–2 turns and answer
  THAT topic specifically. Do NOT ask "which service?" if the previous
  turn already named a service.
- Never say "I don't know", "no information", "expert will explain over a call"
  unless the customer explicitly asks for a human handover.
- If the customer is *angry* or says "no need", "stop", "useless", DO NOT
  pitch anything. Apologize briefly, acknowledge the issue, and offer to
  connect them with a human team-member. Never push a service.
- Use ONLY the BUSINESS DATA below. Never invent prices, services, or claims.
- If the data really doesn't have the answer, say so briefly and offer the
  closest helpful service or to share details with the team.
- Do NOT keep asking the same qualifying questions you already asked
  (see CUSTOMER MEMORY).
- Tone for sentiment "{sentiment}":
    - interested → warm, guiding, gently move toward a next step
    - confused → patient, clear, simplify, offer to walk through it
    - angry → calm, apologetic, solution-focused, NEVER pitch a service,
      offer to escalate to a human
    - neutral/happy → friendly and helpful

## BUSINESS DATA (ground truth — use these only)
{business_content}

## CUSTOMER MEMORY (what you already know about this person)
{customer_memory}

## RECENT CONVERSATION
{recent_history}
"""


class IntelligentReplyEngine:
    """Content-first, memory-aware reply engine."""

    MAX_HISTORY = 8
    MAX_SERVICES = 25
    MAX_RULES = 20
    MAX_CONTENT_DOCS = 8
    MAX_MEMORY_FACTS = 20
    MAX_CONTENT_CHARS = 3500

    def __init__(self, db):
        self.db = db

    # ───────── public API ─────────
    async def process(
        self,
        tenant_id: str,
        lead_id: str,
        phone: str,
        message: str,
        conversation: Dict[str, Any],
        message_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            tenant = await self.db.tenants.find_one({"id": tenant_id}, {"_id": 0}) or {}
            business_name = (
                tenant.get("company_name")
                or tenant.get("name")
                or "our business"
            )
            category_slug = (
                tenant.get("business_category")
                or tenant.get("category_slug")
                or "general"
            )
            category_doc = await self.db.memoraai_industries.find_one(
                {"slug": category_slug}, {"_id": 0, "title": 1, "hero_sub": 1}
            ) or {}
            business_category = category_doc.get("title") or category_slug
            business_role = self._role_for_category(category_slug)

            language = detect_language(message)
            sentiment = detect_sentiment(message)
            intent_buying = detect_buying_intent(message)

            content_block, content_sources = await self._load_business_content(
                tenant_id, message
            )
            memory_block, memory_used = await self._load_customer_memory(
                tenant_id, phone, lead_id
            )
            history_block, recent_messages = await self._load_recent_history(
                conversation.get("id"), phone, tenant_id
            )

            system_prompt = SYSTEM_PROMPT.format(
                business_role=business_role,
                business_name=business_name,
                business_category=business_category,
                language_detected=language,
                sentiment=sentiment,
                business_content=content_block or "(no business data uploaded yet)",
                customer_memory=memory_block or "(first interaction with this customer)",
                recent_history=history_block or "(no prior messages)",
            )

            llm_result = await llm_router.generate(
                system_prompt=system_prompt,
                user_message=message,
                chat_history=recent_messages,
                context={"tenant_id": tenant_id, "phone": phone},
            )

            response_text = (
                llm_result.get("response")
                or llm_result.get("text")
                or ""
            ).strip()

            if not response_text:
                response_text = self._fallback_reply(
                    language, sentiment, business_name
                )
                used_source = "fallback"
                confidence = 0.2
            else:
                used_source = self._detect_source_used(
                    response_text, content_sources, memory_used
                )
                confidence = 0.85 if content_sources else 0.65

            await self._update_customer_memory(
                tenant_id, phone, lead_id, message, response_text,
                language, sentiment, intent_buying,
            )

            await self._log_reply_metadata(
                tenant_id=tenant_id,
                conversation_id=conversation.get("id"),
                phone=phone,
                message=message,
                response=response_text,
                source_used=used_source,
                memory_used=memory_used,
                language_detected=language,
                sentiment=sentiment,
                confidence=confidence,
                content_sources=content_sources,
                buying_intent=intent_buying,
                model=llm_result.get("model_used", "unknown"),
            )

            return {
                "success": True,
                "response": response_text,
                "intent": "ai_intelligent_reply",
                "action": "intelligent_reply",
                "metadata": {
                    "source_used": used_source,
                    "memory_used": memory_used,
                    "language_detected": language,
                    "sentiment": sentiment,
                    "confidence": confidence,
                    "buying_intent": intent_buying,
                },
            }
        except Exception as e:
            logger.exception(f"IntelligentReplyEngine failed: {e}")
            return {
                "success": False,
                "response": "",
                "error": str(e),
            }

    # ───────── helpers ─────────
    def _role_for_category(self, slug: str) -> str:
        mapping = {
            "real_estate": "Property Expert",
            "astrology": "Astrology Consultant",
            "hospitals": "Patient Care Coordinator",
            "clinics": "Clinic Coordinator",
            "luxury_boutique": "Boutique Concierge",
            "education": "Admissions Counselor",
            "saloon": "Salon Coordinator",
            "spa": "Wellness Coordinator",
            "restaurant": "Restaurant Host",
            "law": "Legal Coordinator",
            "ca": "Tax Advisor",
            "software": "Solutions Consultant",
        }
        return mapping.get(slug, "Customer Specialist")

    async def _load_business_content(
        self, tenant_id: str, query: str
    ) -> tuple[str, List[str]]:
        sources: List[str] = []
        sections: List[str] = []

        # PRIORITY #1: Website indexed chunks (semantic-ish, query-aware)
        try:
            from services import website_crawler
            hits = await website_crawler.search_chunks(self.db, tenant_id, query, k=4)
            if hits:
                sources.append("website_page")
                lines = ["### WEBSITE CONTENT (most relevant pages):"]
                for h in hits:
                    title = h.get("title") or h.get("url", "")
                    url = h.get("url") or ""
                    snippet = (h.get("text") or "").replace("\n", " ")[:380]
                    lines.append(f"- *{title}* ({url}): {snippet}")
                sections.append("\n".join(lines))
        except Exception as e:
            logger.warning(f"website_chunks search failed: {e}")

        # Structured services from website (extracted)
        try:
            wstruct = await self.db.website_structured_data.find_one(
                {"tenant_id": tenant_id}, {"_id": 0}
            )
        except Exception:
            wstruct = None
        if wstruct and (wstruct.get("services") or wstruct.get("faqs") or wstruct.get("business")):
            sources.append("website_structured")
            lines = ["### WEBSITE STRUCTURED DATA:"]
            for s in (wstruct.get("services") or [])[:8]:
                price = s.get("price")
                cur = s.get("currency") or ""
                price_part = f" — *{cur} {price}*" if price not in (None, "", 0) else ""
                lines.append(f"• *{s.get('name','')}*{price_part}")
            for f in (wstruct.get("faqs") or [])[:6]:
                lines.append(f"- Q: {f.get('question','')[:120]}\n  A: {f.get('answer','')[:240]}")
            biz = wstruct.get("business") or {}
            if biz:
                bits = [f"{k}: {v}" for k, v in biz.items() if v]
                if bits:
                    lines.append("- Business info: " + " | ".join(bits[:4]))
            sections.append("\n".join(lines))

        services = await self.db.business_services.find(
            {"tenant_id": tenant_id, "is_active": {"$ne": False}},
            {"_id": 0, "name": 1, "description": 1, "duration_mins": 1,
             "price": 1, "currency": 1, "category_slug": 1},
        ).to_list(self.MAX_SERVICES)
        if services:
            sources.append("services")
            lines = ["### SERVICES OFFERED:"]
            for s in services:
                price = s.get("price")
                cur = s.get("currency") or "INR"
                price_part = (
                    f" — *{cur} {price}*" if price not in (None, 0, "") else ""
                )
                dur = s.get("duration_mins")
                dur_part = f" ({dur} min)" if dur else ""
                desc = (s.get("description") or "").strip()
                desc_part = f" — {desc[:160]}" if desc else ""
                lines.append(
                    f"• *{s.get('name','')}*{price_part}{dur_part}{desc_part}"
                )
            sections.append("\n".join(lines))

        rules = await self.db.memoraai_rules.find(
            {"tenant_id": tenant_id, "is_active": {"$ne": False}},
            {"_id": 0, "title": 1, "rule": 1, "category": 1},
        ).sort("sort_order", 1).to_list(self.MAX_RULES)
        if rules:
            sources.append("rules")
            lines = ["### BUSINESS RULES / FAQ:"]
            for r in rules:
                t = r.get("title", "")
                body = (r.get("rule") or "").strip()[:240]
                lines.append(f"- *{t}*: {body}")
            sections.append("\n".join(lines))

        content_query: Dict[str, Any] = {"tenant_id": tenant_id}
        content_docs = await self.db.memoraai_content.find(
            content_query,
            {"_id": 0, "title": 1, "description": 1, "content_type": 1,
             "url": 1, "extracted_text": 1, "summary": 1},
        ).to_list(self.MAX_CONTENT_DOCS)
        if content_docs:
            sources.append("content")
            lines = ["### UPLOADED CONTENT (website / brochures / FAQs):"]
            for c in content_docs:
                title = c.get("title", "Document")
                snippet = (
                    c.get("summary")
                    or c.get("description")
                    or c.get("extracted_text", "")
                ).strip().replace("\n", " ")
                snippet = snippet[:300]
                url = c.get("url") or ""
                url_part = f" ({url})" if url else ""
                lines.append(f"- *{title}*{url_part}: {snippet}")
            sections.append("\n".join(lines))

        corrections = await self.db.memoraai_corrections.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "original_message": 1, "suggested_response": 1,
             "correction_note": 1, "keywords": 1},
        ).sort("created_at", -1).to_list(10)
        if corrections:
            sources.append("corrections")
            lines = ["### STAFF-APPROVED ANSWERS (always prefer when relevant):"]
            for c in corrections:
                kw = ", ".join(c.get("keywords") or [])
                lines.append(
                    f"- if customer asks about [{kw}]: \"{(c.get('suggested_response') or '')[:240]}\""
                )
            sections.append("\n".join(lines))

        block = "\n\n".join(sections).strip()
        if len(block) > self.MAX_CONTENT_CHARS:
            block = block[: self.MAX_CONTENT_CHARS] + "\n…(truncated)"
        return block, sources

    async def _load_customer_memory(
        self, tenant_id: str, phone: str, lead_id: str
    ) -> tuple[str, bool]:
        memories = await self.db.business_memories.find(
            {"tenant_id": tenant_id, "customer_phone": phone},
            {"_id": 0, "memory_type": 1, "content": 1, "metadata": 1,
             "created_at": 1},
        ).sort("created_at", -1).to_list(self.MAX_MEMORY_FACTS)

        lead = await self.db.memoraai_leads.find_one(
            {"tenant_id": tenant_id, "$or": [{"id": lead_id}, {"phone": phone}]},
            {"_id": 0, "name": 1, "captured_fields": 1, "score": 1, "status": 1},
        ) or {}

        contact = await self.db.memoraai_contacts.find_one(
            {"tenant_id": tenant_id, "phone": phone},
            {"_id": 0, "name": 1, "description": 1, "tags": 1},
        ) or {}

        used = bool(memories or lead or contact)
        if not used:
            return "", False

        lines: List[str] = []
        name = contact.get("name") or lead.get("name")
        if name:
            lines.append(f"- Name: *{name}*")
        tags = contact.get("tags") or []
        if tags:
            lines.append(f"- Tags: {', '.join(tags)}")
        score = lead.get("score")
        status = lead.get("status")
        if score is not None or status:
            lines.append(
                f"- Lead status: {status or 'new'} (score {score if score is not None else '–'})"
            )
        captured = lead.get("captured_fields") or {}
        if captured:
            cap_str = ", ".join(f"{k}={v}" for k, v in list(captured.items())[:6])
            lines.append(f"- Captured: {cap_str}")
        if contact.get("description"):
            lines.append(f"- Note: {contact['description'][:200]}")
        for m in memories:
            mtype = m.get("memory_type", "fact")
            content = (m.get("content") or "").strip()[:200]
            if content:
                lines.append(f"- [{mtype}] {content}")

        return "\n".join(lines), True

    async def _load_recent_history(
        self, conversation_id: Optional[str], phone: str, tenant_id: str
    ) -> tuple[str, List[Dict[str, str]]]:
        query: Dict[str, Any] = (
            {"conversation_id": conversation_id}
            if conversation_id
            else {"tenant_id": tenant_id, "phone": phone}
        )
        msgs = await self.db.whatsapp_messages.find(
            query, {"_id": 0, "role": 1, "content": 1, "timestamp": 1}
        ).sort("timestamp", -1).to_list(self.MAX_HISTORY)
        msgs.reverse()
        if not msgs:
            return "", []
        chat_history = [
            {"role": m["role"], "content": (m.get("content") or "")[:600]}
            for m in msgs if m.get("role") in ("user", "assistant")
        ]
        text_lines = [
            f"{'Customer' if m['role'] == 'user' else 'You'}: {m['content']}"
            for m in chat_history
        ]
        return "\n".join(text_lines), chat_history

    def _detect_source_used(
        self, response: str, content_sources: List[str], memory_used: bool
    ) -> str:
        if content_sources:
            return ",".join(content_sources)
        if memory_used:
            return "memory"
        return "general"

    def _fallback_reply(self, language: str, sentiment: str, business_name: str) -> str:
        if language in ("telugu", "telugu_english"):
            return (
                f"Namaskaram! *{business_name}* nundi. "
                "Mee question ki answer ivvali — meeru konchem clarify cheyagalara?"
            )
        if language in ("hindi", "hinglish"):
            return (
                f"Namaste! *{business_name}* se. "
                "Aapka sawaal samajhne mein madad chahiye — thoda clear bata sakte hain?"
            )
        return (
            f"Hi! Thanks for reaching *{business_name}*. "
            "Could you share a bit more so I can help with the right info?"
        )

    async def _update_customer_memory(
        self, tenant_id: str, phone: str, lead_id: str,
        user_msg: str, ai_reply: str,
        language: str, sentiment: str, buying_intent: bool,
    ) -> None:
        try:
            await self.db.business_memories.update_one(
                {"tenant_id": tenant_id, "customer_phone": phone,
                 "memory_type": "preference"},
                {"$set": {
                    "tenant_id": tenant_id,
                    "customer_phone": phone,
                    "memory_type": "preference",
                    "content": (
                        f"language={language}; sentiment={sentiment}; "
                        f"buying_intent={buying_intent}"
                    ),
                    "metadata": {
                        "language": language,
                        "sentiment": sentiment,
                        "buying_intent": buying_intent,
                        "last_message": user_msg[:160],
                    },
                    "updated_at": datetime.now(timezone.utc),
                }, "$setOnInsert": {
                    "id": f"mem_{phone}_pref",
                    "created_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"customer memory upsert failed: {e}")

    async def _log_reply_metadata(self, **kw) -> None:
        try:
            doc = {
                "id": f"replymeta_{datetime.now(timezone.utc).timestamp()}",
                "logged_at": datetime.now(timezone.utc),
                **kw,
            }
            await self.db.ai_reply_logs.insert_one(doc)
        except Exception as e:
            logger.warning(f"ai_reply_logs insert failed: {e}")
