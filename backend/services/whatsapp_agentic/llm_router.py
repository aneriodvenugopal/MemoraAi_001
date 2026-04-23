"""
LLM Router - Cost-optimized dual-LLM routing for WhatsApp AI
Primary: Gemini 2.5 Flash-Lite (cheapest, fastest)
Fallback: GPT-4o-mini (complex reasoning, emotional intelligence)

Supports full conversation history for multi-turn context.
"""

import os
import logging
import time
from typing import Optional, Dict, Any, List
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
    """
    Cost-optimized LLM router with full conversation history support.
    """

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
    ) -> Dict[str, Any]:
        """
        Generate AI response with smart routing and conversation history.

        Args:
            system_prompt: System instructions
            user_message: Current user message
            context: Conversation context for complexity classification
            force_model: Force 'gemini' or 'openai'
            chat_history: List of {"role": "user"|"assistant", "content": "..."}
        """
        ctx = context or {}
        history = chat_history or []
        complexity = force_model or classify_complexity(user_message, ctx)
        model_choice = "gemini" if complexity == "simple" else "openai"

        start = time.time()

        try:
            if model_choice == "gemini" and self._gemini_client:
                result = await self._call_gemini(system_prompt, user_message, history)
                self._request_count["gemini"] += 1
            elif self._openai_client:
                result = await self._call_openai(system_prompt, user_message, history)
                self._request_count["openai"] += 1
            else:
                if self._gemini_client:
                    result = await self._call_gemini(system_prompt, user_message, history)
                    model_choice = "gemini"
                    self._request_count["gemini"] += 1
                elif self._openai_client:
                    result = await self._call_openai(system_prompt, user_message, history)
                    model_choice = "openai"
                    self._request_count["openai"] += 1
                else:
                    raise ValueError("No LLM API keys configured")
        except Exception as e:
            logger.warning(f"Primary model ({model_choice}) failed: {e}, trying fallback...")
            self._request_count["errors"] += 1
            try:
                if model_choice == "gemini" and self._openai_client:
                    result = await self._call_openai(system_prompt, user_message, history)
                    model_choice = "openai"
                    self._request_count["openai"] += 1
                elif model_choice == "openai" and self._gemini_client:
                    result = await self._call_gemini(system_prompt, user_message, history)
                    model_choice = "gemini"
                    self._request_count["gemini"] += 1
                else:
                    raise
            except Exception as fallback_error:
                logger.error(f"Both LLMs failed: {fallback_error}")
                return {
                    "text": "",
                    "model": "none",
                    "error": str(fallback_error),
                    "cost_estimate": 0,
                    "latency_ms": int((time.time() - start) * 1000),
                }

        latency = int((time.time() - start) * 1000)

        # Estimate cost
        history_tokens = sum(len(m.get("content", "")) for m in history) // 4
        input_tokens = (len(system_prompt + user_message) // 4) + history_tokens
        output_tokens = len(result) // 4
        if model_choice == "gemini":
            cost = (input_tokens * 0.10 + output_tokens * 0.40) / 1_000_000
        else:
            cost = (input_tokens * 0.15 + output_tokens * 0.60) / 1_000_000

        logger.info(f"LLM [{model_choice}] latency={latency}ms cost~${cost:.6f} history_msgs={len(history)}")

        return {
            "text": result,
            "model": model_choice,
            "cost_estimate": cost,
            "latency_ms": latency,
        }

    async def _call_gemini(
        self, system_prompt: str, user_message: str, history: List[Dict[str, str]]
    ) -> str:
        """Call Gemini with full conversation history."""
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
            temperature=0.7,
            max_output_tokens=500,
        )

        # Build multi-turn contents
        contents = []
        for msg in history:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        # Add current message
        contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

        response = await self._gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=contents,
            config=config,
        )
        return response.text or ""

    async def _call_openai(
        self, system_prompt: str, user_message: str, history: List[Dict[str, str]]
    ) -> str:
        """Call GPT-4o-mini with full conversation history."""
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        response = await self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
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
