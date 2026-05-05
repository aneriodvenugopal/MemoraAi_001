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


def _wrap_system_prompt(system_prompt: str, file_search: bool = False) -> str:
    """Inject heartbeat + tone + precision rules in front of caller's prompt.

    When ``file_search`` is True, we add an explicit instruction that the
    attached File Search store is the PRIMARY source of truth and the
    model should use the retrieval tool BEFORE answering factual queries.
    """
    prefix = _EXPERT_SALES_PREFIX.format(ist_now=_now_ist_str())
    if file_search:
        prefix += (
            "\n[FILE_SEARCH]: Use the attached File Search store as your "
            "PRIMARY source of truth for prices, RERA numbers, inventory, "
            "service details, business hours and contacts. ALWAYS retrieve "
            "before answering factual questions. Numbers must be reproduced "
            "verbatim. For general location/landmark info you may use your "
            "internal knowledge.\n"
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

        # 1️⃣ Inject Expert-Sales prefix + IST heartbeat
        wrapped_system = _wrap_system_prompt(system_prompt, file_search=bool(vector_store_id))
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
        contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))
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
        messages.append({"role": "user", "content": user_message})
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
