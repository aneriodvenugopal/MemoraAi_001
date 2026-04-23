"""
Leonas WhatsApp BSP Client
Based on Leonas API Documentation v3
https://partnersv1.pinbot.ai/v3/
"""

import os
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv
import json

load_dotenv()


class LeonasWhatsAppClient:
    """
    Client for Leonas WhatsApp Business API (Pinbot v3)
    Documentation: Partners API documentation_WABA.pdf
    """
    
    def __init__(self):
        self.base_url = os.getenv("LEONAS_API_URL", "https://partnersv1.pinbot.ai/v3")
        self.api_key = os.getenv("LEONAS_API_KEY", "")
        self.phone_number_id = os.getenv("LEONAS_PHONE_NUMBER_ID", "")
        self.timeout = 30
        
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers"""
        return {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def send_text_message(
        self, 
        phone: str, 
        message: str,
        tenant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a text message via WhatsApp
        
        Endpoint: POST /{phone_number_id}/messages
        """
        phone = self._normalize_phone(phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                print(f"📤 WhatsApp Send Response: {response.status_code} - {result}")
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "wamid": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except httpx.TimeoutException:
            print(f"⚠️ WhatsApp timeout sending to {phone}")
            return {"success": False, "error": "timeout", "message": "Request timed out"}
        except Exception as e:
            print(f"❌ WhatsApp error: {e}")
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_template_message(
        self,
        phone: str,
        template_name: str,
        template_params: List[str],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Send a pre-approved template message
        
        Endpoint: POST /{phone_number_id}/messages
        """
        phone = self._normalize_phone(phone)
        
        # Build components with parameters
        components = []
        if template_params:
            body_params = [{"type": "text", "text": param} for param in template_params]
            components.append({
                "type": "body",
                "parameters": body_params
            })
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language
                },
                "components": components
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_image_message(
        self,
        phone: str,
        image_url: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send image message
        
        Endpoint: POST /{phone_number_id}/messages
        """
        phone = self._normalize_phone(phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "image",
            "image": {
                "link": image_url
            }
        }
        
        if caption:
            payload["image"]["caption"] = caption
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_document_message(
        self,
        phone: str,
        document_url: str,
        filename: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send document message (PDF, etc.)
        
        Endpoint: POST /{phone_number_id}/messages
        """
        phone = self._normalize_phone(phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "document",
            "document": {
                "link": document_url,
                "filename": filename
            }
        }
        
        if caption:
            payload["document"]["caption"] = caption
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_location_message(
        self,
        phone: str,
        latitude: float,
        longitude: float,
        name: str,
        address: str
    ) -> Dict[str, Any]:
        """
        Send location message
        """
        phone = self._normalize_phone(phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "location",
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "name": name,
                "address": address
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_interactive_buttons(
        self,
        phone: str,
        body_text: str,
        buttons: List[Dict[str, str]],
        header: Optional[str] = None,
        footer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send interactive message with buttons
        
        buttons format: [{"id": "btn_1", "title": "Button 1"}, ...]
        Max 3 buttons allowed
        """
        phone = self._normalize_phone(phone)
        
        interactive = {
            "type": "button",
            "body": {
                "text": body_text
            },
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {
                            "id": btn.get("id", f"btn_{i}"),
                            "title": btn.get("title", "Button")[:20]  # Max 20 chars
                        }
                    }
                    for i, btn in enumerate(buttons[:3])  # Max 3 buttons
                ]
            }
        }
        
        if header:
            interactive["header"] = {"type": "text", "text": header}
        if footer:
            interactive["footer"] = {"text": footer}
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "interactive",
            "interactive": interactive
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_list_message(
        self,
        phone: str,
        body_text: str,
        button_text: str,
        sections: List[Dict[str, Any]],
        header: Optional[str] = None,
        footer: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send interactive list message
        
        sections format:
        [
            {
                "title": "Section 1",
                "rows": [
                    {"id": "row_1", "title": "Row 1", "description": "Description"}
                ]
            }
        ]
        """
        phone = self._normalize_phone(phone)
        
        interactive = {
            "type": "list",
            "body": {
                "text": body_text
            },
            "action": {
                "button": button_text[:20],  # Max 20 chars
                "sections": sections
            }
        }
        
        if header:
            interactive["header"] = {"type": "text", "text": header}
        if footer:
            interactive["footer"] = {"text": footer}
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone,
            "type": "interactive",
            "interactive": interactive
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/messages",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "message_id": result.get("messages", [{}])[0].get("id") if result.get("messages") else None,
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def set_webhook(self, webhook_url: str, headers: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Set webhook URL to receive callbacks from Meta
        
        Endpoint: POST /{phone_number_id}/setwebhook
        """
        payload = {
            "webhook_url": webhook_url,
            "headers": headers or {}
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/{self.phone_number_id}/setwebhook",
                    headers=self._get_headers(),
                    json=payload
                )
                
                result = response.json() if response.status_code in [200, 201] else {}
                
                print(f"🔗 Webhook Setup Response: {response.status_code} - {result}")
                
                return {
                    "success": response.status_code in [200, 201],
                    "status_code": response.status_code,
                    "response": result
                }
                
        except Exception as e:
            print(f"❌ Webhook setup error: {e}")
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def get_webhook(self) -> Dict[str, Any]:
        """
        Get current webhook configuration
        
        Endpoint: GET /{phone_number_id}/getwebhook
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/{self.phone_number_id}/getwebhook",
                    headers=self._get_headers()
                )
                
                result = response.json() if response.status_code == 200 else {}
                
                return {
                    "success": response.status_code == 200,
                    "status_code": response.status_code,
                    "webhook_url": result.get("webhook_url"),
                    "response": result
                }
                
        except Exception as e:
            return {"success": False, "error": "exception", "message": str(e)}
    
    async def send_with_retry(
        self,
        phone: str,
        message: str,
        max_retries: int = 3,
        delay: float = 1.0
    ) -> Dict[str, Any]:
        """
        Send message with retry mechanism
        """
        for attempt in range(max_retries):
            result = await self.send_text_message(phone, message)
            
            if result.get("success"):
                return result
            
            if attempt < max_retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
        
        return {
            "success": False,
            "error": "max_retries_exceeded",
            "message": f"Failed after {max_retries} attempts"
        }
    
    def _normalize_phone(self, phone: str) -> str:
        """
        Normalize phone number to international format
        """
        phone = ''.join(filter(str.isdigit, str(phone)))
        
        if len(phone) == 10:
            phone = f"91{phone}"
        
        return phone
    
    def parse_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse incoming webhook payload from Leonas/Meta
        
        Returns standardized message dict
        """
        try:
            # Handle different payload structures
            # Structure 1: Direct message object
            if "messages" in payload:
                messages = payload.get("messages", [])
                if messages:
                    msg = messages[0]
                    return {
                        "phone": msg.get("from", ""),
                        "message_id": msg.get("id", ""),
                        "text": msg.get("text", {}).get("body", "") if msg.get("type") == "text" else "",
                        "timestamp": msg.get("timestamp", ""),
                        "type": msg.get("type", "text"),
                        "button_reply": msg.get("interactive", {}).get("button_reply", {}).get("id") if msg.get("type") == "interactive" else None,
                        "list_reply": msg.get("interactive", {}).get("list_reply", {}).get("id") if msg.get("type") == "interactive" else None,
                        "raw": payload
                    }
            
            # Structure 2: Wrapped in "message" object
            message_data = payload.get("message", payload)
            
            # Handle text in different formats
            text = ""
            if isinstance(message_data.get("text"), dict):
                text = message_data["text"].get("body", "")
            elif isinstance(message_data.get("text"), str):
                text = message_data["text"]
            elif message_data.get("body"):
                text = message_data["body"]
            
            return {
                "phone": message_data.get("from", message_data.get("phone", "")),
                "message_id": message_data.get("id", message_data.get("message_id", "")),
                "text": text,
                "timestamp": message_data.get("timestamp", datetime.utcnow().isoformat()),
                "type": message_data.get("type", "text"),
                "media_url": message_data.get("media", {}).get("url") if isinstance(message_data.get("media"), dict) else None,
                "button_reply": message_data.get("button", {}).get("payload") if isinstance(message_data.get("button"), dict) else None,
                "list_reply": message_data.get("list_reply", {}).get("id") if isinstance(message_data.get("list_reply"), dict) else None,
                "raw": payload
            }
        except Exception as e:
            print(f"⚠️ Webhook parse error: {e}")
            return {
                "error": str(e),
                "raw": payload
            }


# Singleton instance
leonas_client = LeonasWhatsAppClient()
