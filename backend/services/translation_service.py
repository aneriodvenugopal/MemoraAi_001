"""
AI-Powered Translation Service using OpenAI GPT-5
Translates UI text from English to Telugu and Hindi
"""
import os
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the correct path
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

class TranslationService:
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        # Cache for translations to avoid repeated API calls
        self.cache = {}
    
    async def translate_text(self, text: str, target_language: str) -> str:
        """
        Translate text to target language using GPT-5
        
        Args:
            text: Text to translate
            target_language: 'telugu' or 'hindi'
        
        Returns:
            Translated text
        """
        # Check cache first
        cache_key = f"{text}_{target_language}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Prepare system message for translation
        if target_language.lower() == 'telugu':
            system_message = """You are a professional translator specializing in English to Telugu translation.
Translate the given text to Telugu accurately while maintaining the original meaning and tone.
Return ONLY the translated text without any explanations or additional commentary."""
        elif target_language.lower() == 'hindi':
            system_message = """You are a professional translator specializing in English to Hindi translation.
Translate the given text to Hindi accurately while maintaining the original meaning and tone.
Return ONLY the translated text without any explanations or additional commentary."""
        else:
            return text  # Return original if language not supported
        
        try:
            # Initialize LLM chat for translation
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"translation_{target_language}",
                system_message=system_message
            ).with_model("openai", "gpt-5")
            
            # Create translation request
            user_message = UserMessage(text=text)
            
            # Get translation
            translated = await chat.send_message(user_message)
            
            # Cache the result
            self.cache[cache_key] = translated
            
            return translated
        
        except Exception as e:
            print(f"Translation error: {e}")
            return text  # Return original text if translation fails
    
    async def translate_batch(self, texts: list[str], target_language: str) -> dict[str, str]:
        """
        Translate multiple texts in batch
        
        Args:
            texts: List of texts to translate
            target_language: 'telugu' or 'hindi'
        
        Returns:
            Dictionary mapping original text to translated text
        """
        translations = {}
        
        # Create translation tasks
        tasks = []
        for text in texts:
            tasks.append(self.translate_text(text, target_language))
        
        # Execute all translations concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Map results
        for text, result in zip(texts, results):
            if isinstance(result, Exception):
                translations[text] = text  # Return original on error
            else:
                translations[text] = result
        
        return translations

# Global instance
translation_service = TranslationService()
