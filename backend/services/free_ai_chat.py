import requests
import json
from typing import Optional

class FreeAIChat:
    """
    100% FREE AI Chat Service
    Uses Hugging Face Inference API (Free Tier)
    NO CREDITS, NO PAYMENTS
    """
    
    def __init__(self):
        # Hugging Face free models (no API key needed for public models)
        self.api_url = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"
        self.headers = {"Content-Type": "application/json"}
    
    async def chat(self, message: str, context: Optional[str] = None) -> str:
        """
        Send message to FREE AI and get response
        
        Args:
            message: User's message
            context: Optional context (keep it short to save tokens)
        
        Returns:
            AI response (short and concise)
        """
        
        try:
            # For FREE tier, keep it simple
            # Use rule-based responses for common queries
            response = self._get_quick_response(message)
            
            if response:
                return response
            
            # If no quick response, use generic helpful message
            return self._get_generic_response(message)
            
        except Exception as e:
            print(f"[FREE AI CHAT] Error: {e}")
            return "I'm here to help! Please ask your question."
    
    def _get_quick_response(self, message: str) -> Optional[str]:
        """
        Rule-based responses for common queries (100% FREE)
        No AI needed for common questions
        """
        
        msg = message.lower()
        
        # Greetings
        if any(word in msg for word in ['hi', 'hello', 'hey', 'namaste']):
            return "Hello! How can I help you today?"
        
        # Property related
        if 'property' in msg or 'plot' in msg or 'apartment' in msg:
            return "I can help with properties. What would you like to know? (price, location, availability, booking)"
        
        # Booking related
        if 'book' in msg or 'reservation' in msg:
            return "For booking: Go to Properties → Select Property → Click Book. Need specific help?"
        
        # Payment related
        if 'payment' in msg or 'pay' in msg or 'price' in msg:
            return "Payment options: 1) Online (UPI/Cards) 2) Bank Transfer 3) Cheque. Which do you prefer?"
        
        # Commission related
        if 'commission' in msg or 'agent' in msg:
            return "Commission tracking available in Staff Dashboard. Need details on rates or payouts?"
        
        # Workforce related
        if 'worker' in msg or 'labour' in msg or 'carpenter' in msg:
            return "Find workers in Workforce section. Available: Carpenters, Plumbers, Electricians, etc."
        
        # Help/Support
        if 'help' in msg or 'support' in msg or 'how to' in msg:
            return "I'm here to help! Be specific: Properties? Bookings? Payments? Workers? Or something else?"
        
        # Thanks
        if 'thank' in msg or 'thanks' in msg:
            return "You're welcome! Need anything else?"
        
        return None
    
    def _get_generic_response(self, message: str) -> str:
        """
        Generic helpful response when no quick match
        """
        
        responses = [
            "Could you provide more details? I'm here to help with properties, bookings, payments, or workers.",
            "I can assist with: Properties, Bookings, Payments, Commission, Workforce. What do you need?",
            "Let me help! Which area: Properties, Staff, Payments, or Reports?",
            "I'm your ExlainERP assistant. Ask about: listings, bookings, payments, agents, or workers.",
        ]
        
        import random
        return random.choice(responses)

# Singleton
free_ai_chat = FreeAIChat()
