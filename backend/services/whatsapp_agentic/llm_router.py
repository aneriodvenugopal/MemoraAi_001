"""
LLM Router — cost-optimized dual-LLM routing for the MemoraAI WhatsApp brain.

Primary  : Gemini 2.5 Flash-Lite (cheapest, fastest)
Fallback : GPT-4o-mini (complex reasoning, emotional intelligence)

This file implements the "Expert Sales Manager" upgrade plan:
  1. System Heartbeat   — every request carries `[CURRENT_IST_TIME: ...]` so
     the model can correctly schedule appointments, mention "tomorrow"
     accurately, etc.
  2. Precision Control  — `temperature = 0.1` keeps numbers (₹75.0, RERA
     numbers) verbatim; no rounding, no creative paraphrasing of facts.
  3. Sales-Manager Tone — system instruction adds a warm, persuasive,
     human-like wrapper around every reply.
  4. Hybrid Knowledge   — explicit policy: factual data (prices, project
     details, services) MUST come from provided files / business content,
     while general location/landmark knowledge MAY use the model's own.
  5. Cross-language     — preserves caller's language style (Telugu / English
     / Hinglish / mixed).
"""

import os
import logging
import time
from datetime import datetime
from typing import Optional, Dict, Any, List

import pytz
from google import genai
from google.genai import types
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Complexity keywords that trigger GPT-4o-mini fallback
COMPLEX_KEYWORDS = [
    "negotiate", "bargain", "discount", "reduce price", "too expensive",
    "compare", "which is better", "confused", "not sure", "problem",
    "complaint", "unhappy", "angry", "frustrated", "disappointed",
    "legal", "registration", "loan", "emi calculation", "tax",
    "vastu", "feng shui", "investment advice", "roi",
]

_IST = pytz.timezone("Asia/Kolkata")

# Behavioural rules pre-pended to every system_prompt (any caller).
# Kept short so it doesn't blow up token count, but explicit enough that
# the model can't ignore it.
_EXPERT_SALES_PREFIX = """\
[CURRENT_IST_TIME: {ist_now}]
[ROLE]: You are an expert Sales Manager and Business Advisor — warm, persuasive,
human-like, and genuinely helpful. Speak naturally, not robotically.
[PRECISION]: Numbers (prices like 75.0, RERA numbers, phone numbers, dates)
must be REPRODUCED VERBATIM from the supplied data. Never round, never
paraphrase, never invent. If a number is not in the data, say so clearly.
[KNOWLEDGE POLICY]:
  • For PROJECT / PRODUCT / SERVICE / PRICING / INVENTORY / RERA details:
    use ONLY the facts in the supplied business data. If missing, say
    "I will check this with the team and confirm."
  • For GENERAL location / landmarks / city highlights / well-known facts:
    you MAY use your own knowledge as a local advisor would.
[TIME AWARENESS]:
  • The current date/time above is the source of truth.
  • If the customer asks about "tomorrow", "next week", a specific date like
    "May 10, 2026" — calculate from CURRENT_IST_TIME above. Never use stale
    dates or training cut-offs.
[STYLE]: Reply in the same language style the customer uses (English /
Telugu / Telugu-English / Hinglish / Hindi / mixed). 1–4 short WhatsApp
lines. *bold* the key info.
"""


def _now_ist_str() -> str:
    now = datetime.now(_IST)
    # Human-friendly + ISO so the model can both read and reason
    return now.strftime("%A, %d %B %Y, %I:%M %p IST (ISO: %Y-%m-%dT%H:%M:%S%z)")


def _strong_heartbeat() -> str:
    """Hard time-override directive to defeat training-cutoff hallucinations.

    Gemini's File Search retrieval and chat-history echoing can drown out a
    soft heartbeat. This block is intentionally loud, ALL-CAPS, and is
    injected TWICE: once at the very top of the system instruction, and
    once again right before the live user message inside ``contents``.
    """
    tz = pytz.timezone('Asia/Kolkata')
    now = datetime.now(tz)
    return (
        "\n[CRITICAL SYSTEM TIME OVERRIDE - HIGHEST PRIORITY - NEVER IGNORE THIS]\n"
        f"TODAY IS: {now.strftime('%A, %B %d, %Y')}\n"
        f"CURRENT TIME: {now.strftime('%I:%M %p IST')}\n\n"
        "ABSOLUTE RULES (Must follow every single time):\n"
        "- This is the ONLY valid current date and time. Ignore all previous "
        "training data and old dates.\n"
        "- When user asks \"today\", \"today date\", \"current date\", \"now\", "
        "\"date today\", \"What is today's date?\" → reply with EXACTLY the above date.\n"
        "- Calculate relative dates (tomorrow, next week, May 10 2026, etc.) "
        "ONLY from this timestamp.\n"
        "- Even when using File Search tool, respect this time directive first.\n"
    )


_CATEGORY_RETRIEVAL_HINTS = {
    "real_estate": (
        "This tenant sells/rents REAL ESTATE. When retrieving:\n"
        "- Prioritize documents tagged content_type=project, content_type=property, "
        "or source=projects/properties.\n"
        "- Customers typically ask for: RERA number, project name, plot/unit "
        "number, area (sqyards/sqft), price (per unit & per sqft), availability "
        "(available/blocked/booked/sold), location, amenities, completion date, "
        "brochure links.\n"
        "- ALWAYS quote prices, RERA numbers and plot IDs character-for-character.\n"
        "- If multiple plots/units match, list 2–3 with their numbers + prices.\n"
    ),
    "astrology": (
        "This tenant offers ASTROLOGY / SPIRITUAL SERVICES. When retrieving:\n"
        "- Prioritize documents about consultations, horoscope readings, "
        "remedies (poojas, gemstones, yantras), service prices and durations, "
        "JIBAN KUNDALI / Kundali Milan / Numerology / Vastu reports.\n"
        "- Quote service fees and timing/duration verbatim.\n"
    ),
    "hospitals": (
        "This tenant is a HOSPITAL / MULTI-SPECIALTY CLINIC. When retrieving:\n"
        "- Prioritize doctor names, departments, OPD timings, consultation "
        "fees, packages, insurance/cashless tie-ups, emergency contacts.\n"
        "- Quote fees and timings verbatim. Never invent doctor names.\n"
    ),
    "clinics": (
        "This tenant is a CLINIC. When retrieving:\n"
        "- Prioritize doctor names, services, appointment slots, fees, "
        "address, parking, payment options.\n"
    ),
    "luxury_boutique": (
        "This tenant is a LUXURY / FASHION BOUTIQUE. When retrieving:\n"
        "- Prioritize product names, materials, sizes, prices, designer "
        "info, store address, appointment booking links.\n"
    ),
    "education": (
        "This tenant is an EDUCATION / COACHING / SCHOOL business. When retrieving:\n"
        "- Prioritize courses, fees, batch timings, faculty, eligibility, "
        "syllabus, demo class, fee structure, payment plans.\n"
    ),
    "saloon": (
        "This tenant is a SALON. When retrieving:\n"
        "- Prioritize service names, durations, prices, stylists, package "
        "deals, booking slots, address.\n"
    ),
    "spa": (
        "This tenant is a SPA / WELLNESS centre. When retrieving:\n"
        "- Prioritize therapy names, durations, prices, package combos, "
        "therapists, booking slots.\n"
    ),
    "restaurant": (
        "This tenant is a RESTAURANT. When retrieving:\n"
        "- Prioritize menu items, prices, cuisines, timings, reservations, "
        "delivery options, address.\n"
    ),
    "law": (
        "This tenant is a LAW FIRM. When retrieving:\n"
        "- Prioritize practice areas, lawyer names, consultation fees, "
        "office address, available slots.\n"
    ),
    "ca": (
        "This tenant is a CA / TAX firm. When retrieving:\n"
        "- Prioritize service names (ITR, GST, audit), fees, deadlines, "
        "documents required.\n"
    ),
    "software": (
        "This tenant is a SOFTWARE / IT services firm. When retrieving:\n"
        "- Prioritize products, plans, pricing, features, demo links, "
        "integration partners, contact email.\n"
    ),
    "ecommerce": (
        "This tenant is an ECOMMERCE / RETAIL business. When retrieving:\n"
        "- Prioritize product names, SKUs, prices, stock availability, "
        "delivery time, return policy, payment options.\n"
    ),
}


def _category_hint(category: str) -> str:
    return _CATEGORY_RETRIEVAL_HINTS.get(
        (category or "general").lower(),
        "Prioritize documents whose business_category metadata matches this "
        "tenant. Use exact prices, codes, dates from retrieved chunks.\n",
    )


def _wrap_system_prompt(
    system_prompt: str,
    file_search: bool = False,
    business_category: str = "general",
    project_id: Optional[str] = None,
    project_type: Optional[str] = None,
) -> str:
    """Inject heartbeat + tone + precision rules in front of caller's prompt.

    When ``file_search`` is True, we add an explicit instruction that the
    attached File Search store is the PRIMARY source of truth and the
    model should use the retrieval tool BEFORE answering factual queries.
    """
    # 🔥 Strong heartbeat at the absolute top — beats training-cutoff bias.
    prefix = _strong_heartbeat() + "\n"
    prefix += _EXPERT_SALES_PREFIX.format(ist_now=_now_ist_str())
    if file_search:
        prefix += (
            "\n[FILE_SEARCH — PRIMARY KNOWLEDGE SOURCE]\n"
            "Use the File Search tool as the PRIMARY source for ALL business "
            "facts. ALWAYS retrieve before answering — never guess.\n"
            "Search the store for: exact project name, RERA number, prices, "
            "availability, plot/unit details, area, location, amenities, "
            "service rates, business hours, contacts, FAQ answers.\n"
            "Return numbers and codes EXACTLY as stored — copy them character-"
            "for-character from the retrieved document. NEVER round, "
            "abbreviate, paraphrase, fabricate, or substitute placeholder "
            "values for prices, RERA numbers, phone numbers, plot/flat IDs, "
            "or addresses. If you cannot find the EXACT value in the store, "
            "DO NOT invent one — instead reply: \"I'll check with the team "
            "and confirm shortly.\"\n"
            "For general location/landmark/city info you MAY use your own "
            "knowledge as a local advisor would.\n"
            "\n[CONTEXT-AWARE RETRIEVAL — multi-business store]\n"
            "Documents are tagged with custom_metadata: business_category, "
            "content_type (project|property|website_page|document|brochure|faq|"
            "image|service|product), source, project_id, project_type, rera, "
            "tenant_id. When multiple chunks match, prefer those whose "
            f"business_category equals \"{(business_category or 'general').lower()}\""
            f"{' and project_id equals ' + project_id if project_id else ''}"
            f"{' or project_type equals ' + project_type if project_type else ''}.\n"
            f"\n[CURRENT BUSINESS PROFILE]\n{_category_hint(business_category)}"
        )
    return prefix + "\n" + (system_prompt or "")


def classify_complexity(message: str, context: Dict) -> str:
    msg_lower = message.lower()
    questions_asked = context.get("questions_asked", 0)
    if any(kw in msg_lower for kw in COMPLEX_KEYWORDS):
        return "complex"
    if len(message) > 300:
        return "complex"
    if questions_asked >= 5:
        return "complex"
    return "simple"


class LLMRouter:
    """Cost-optimized LLM router with full conversation history support."""

    # Lower temperature → factual precision (won't reword numbers/RERA codes).
    DEFAULT_TEMP = 0.1
    MAX_OUTPUT = 500

    def __init__(self):
        self.gemini_key = os.environ.get("GEMINI_API_KEY")
        self.openai_key = os.environ.get("OPENAI_API_KEY")
        self._gemini_client = None
        if self.gemini_key:
            self._gemini_client = genai.Client(api_key=self.gemini_key)
        self._openai_client = None
        if self.openai_key:
            self._openai_client = AsyncOpenAI(api_key=self.openai_key)
        self._request_count = {"gemini": 0, "openai": 0, "errors": 0}

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict] = None,
        force_model: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        temperature: Optional[float] = None,
        vector_store_id: Optional[str] = None,
        business_category: str = "general",
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        project_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate AI response with smart routing + heartbeat + precision.

        When ``vector_store_id`` is supplied, Gemini's native File Search
        tool is attached and the manual knowledge prefix is suppressed —
        the model retrieves grounded facts server-side instead of reading
        them from a prompt prefix.
        """
        ctx = context or {}
        history = chat_history or []
        complexity = force_model or classify_complexity(user_message, ctx)
        # Force Gemini when File Search is requested (only Gemini supports it)
        if vector_store_id:
            model_choice = "gemini"
        else:
            model_choice = "gemini" if complexity == "simple" else "openai"

        # 1️⃣ Inject Expert-Sales prefix + IST heartbeat + category-aware hint
        wrapped_system = _wrap_system_prompt(
            system_prompt,
            file_search=bool(vector_store_id),
            business_category=business_category,
            project_id=project_id,
            project_type=project_type,
        )
        temp = self.DEFAULT_TEMP if temperature is None else float(temperature)

        start = time.time()
        try:
            if model_choice == "gemini" and self._gemini_client:
                result = await self._call_gemini(
                    wrapped_system, user_message, history, temp,
                    vector_store_id=vector_store_id,
                )
                self._request_count["gemini"] += 1
            elif self._openai_client:
                result = await self._call_openai(wrapped_system, user_message, history, temp)
                self._request_count["openai"] += 1
            else:
                if self._gemini_client:
                    result = await self._call_gemini(
                        wrapped_system, user_message, history, temp,
                        vector_store_id=vector_store_id,
                    )
                    model_choice = "gemini"
                    self._request_count["gemini"] += 1
                elif self._openai_client:
                    result = await self._call_openai(wrapped_system, user_message, history, temp)
                    model_choice = "openai"
                    self._request_count["openai"] += 1
                else:
                    raise ValueError("No LLM API keys configured")
        except Exception as e:
            logger.warning(f"Primary model ({model_choice}) failed: {e}, trying fallback...")
            self._request_count["errors"] += 1
            try:
                if model_choice == "gemini" and self._openai_client:
                    # OpenAI doesn't support Gemini File Search — drop the store
                    # but keep the heartbeat/precision rules.
                    result = await self._call_openai(wrapped_system, user_message, history, temp)
                    model_choice = "openai"
                    self._request_count["openai"] += 1
                elif model_choice == "openai" and self._gemini_client:
                    result = await self._call_gemini(
                        wrapped_system, user_message, history, temp,
                        vector_store_id=vector_store_id,
                    )
                    model_choice = "gemini"
                    self._request_count["gemini"] += 1
                else:
                    raise
            except Exception as fallback_error:
                logger.error(f"Both LLMs failed: {fallback_error}")
                return {
                    "text": "",
                    "response": "",
                    "model": "none",
                    "model_used": "none",
                    "error": str(fallback_error),
                    "cost_estimate": 0,
                    "latency_ms": int((time.time() - start) * 1000),
                }

        latency = int((time.time() - start) * 1000)

        history_tokens = sum(len(m.get("content", "")) for m in history) // 4
        input_tokens = (len(wrapped_system + user_message) // 4) + history_tokens
        output_tokens = len(result) // 4
        if model_choice == "gemini":
            cost = (input_tokens * 0.10 + output_tokens * 0.40) / 1_000_000
        else:
            cost = (input_tokens * 0.15 + output_tokens * 0.60) / 1_000_000

        logger.info(
            f"LLM [{model_choice}] temp={temp} latency={latency}ms cost~${cost:.6f} history_msgs={len(history)}"
        )

        return {
            "text": result,
            "response": result,
            "model": model_choice,
            "model_used": model_choice,
            "cost_estimate": cost,
            "latency_ms": latency,
        }

    async def _call_gemini(
        self,
        system_prompt: str,
        user_message: str,
        history: List[Dict[str, str]],
        temperature: float,
        vector_store_id: Optional[str] = None,
    ) -> str:
        config_kwargs = {
            "system_instruction": system_prompt,
            "thinking_config": types.ThinkingConfig(thinking_budget=0),
            "temperature": temperature,
            "max_output_tokens": self.MAX_OUTPUT,
        }
        if vector_store_id:
            try:
                config_kwargs["tools"] = [
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[vector_store_id]
                        )
                    )
                ]
                logger.info(f"Gemini File Search ENABLED store={vector_store_id}")
            except Exception as e:
                logger.warning(f"Could not attach File Search tool: {e}")
        config = types.GenerateContentConfig(**config_kwargs)
        contents = []
        for msg in history:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        # 🔥 Second heartbeat injection — placed RIGHT BEFORE the live user
        # message to override any stale dates surfaced by File Search docs
        # or chat history contamination.
        heartbeat_now = _strong_heartbeat()
        fused_user_text = f"{heartbeat_now}\n\n[USER_MESSAGE]:\n{user_message}"
        contents.append(types.Content(role="user", parts=[types.Part(text=fused_user_text)]))
        response = await self._gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=config,
        )
        return response.text or ""

    async def _call_openai(
        self,
        system_prompt: str,
        user_message: str,
        history: List[Dict[str, str]],
        temperature: float,
    ) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        # 🔥 Second heartbeat injection — right before live user message.
        heartbeat_now = _strong_heartbeat()
        fused_user_text = f"{heartbeat_now}\n\n[USER_MESSAGE]:\n{user_message}"
        messages.append({"role": "user", "content": fused_user_text})
        response = await self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=self.MAX_OUTPUT,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    def get_stats(self) -> Dict[str, Any]:
        return {
            "gemini_calls": self._request_count["gemini"],
            "openai_calls": self._request_count["openai"],
            "errors": self._request_count["errors"],
            "total": self._request_count["gemini"] + self._request_count["openai"],
        }


# Singleton
llm_router = LLMRouter()
