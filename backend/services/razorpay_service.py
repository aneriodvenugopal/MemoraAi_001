import razorpay
import os
import hashlib
import hmac
from typing import Dict, Optional

class RazorpayService:
    """Service for Razorpay payment gateway integration"""
    
    def __init__(self):
        self.key_id = os.getenv('RAZORPAY_KEY_ID')
        self.key_secret = os.getenv('RAZORPAY_KEY_SECRET')
        
        if self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
        else:
            self.client = None
            print("⚠️ Razorpay credentials not configured. Using mock mode.")
    
    def create_order(
        self,
        amount: float,
        currency: str = "INR",
        receipt: str = None,
        notes: Dict = None
    ) -> Dict:
        """
        Create a Razorpay order
        
        Args:
            amount: Amount in smallest currency unit (paise for INR)
            currency: Currency code (default INR)
            receipt: Receipt ID for reference
            notes: Additional notes/metadata
        
        Returns:
            Order details including order_id
        """
        
        if not self.client:
            # Mock mode for testing
            mock_order_id = f"order_mock_{receipt}"
            return {
                "id": mock_order_id,
                "entity": "order",
                "amount": amount,
                "amount_paid": 0,
                "amount_due": amount,
                "currency": currency,
                "receipt": receipt,
                "status": "created",
                "notes": notes or {},
                "mock": True
            }
        
        try:
            # Amount should be in paise for INR (multiply by 100)
            amount_in_paise = int(amount * 100)
            
            order_data = {
                "amount": amount_in_paise,
                "currency": currency,
                "receipt": receipt,
            }
            
            if notes:
                order_data["notes"] = notes
            
            order = self.client.order.create(data=order_data)
            return order
            
        except Exception as e:
            print(f"❌ Razorpay order creation failed: {str(e)}")
            raise Exception(f"Failed to create Razorpay order: {str(e)}")
    
    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> bool:
        """
        Verify Razorpay payment signature for security
        
        Args:
            razorpay_order_id: Order ID from Razorpay
            razorpay_payment_id: Payment ID from Razorpay
            razorpay_signature: Signature from Razorpay
        
        Returns:
            True if signature is valid, False otherwise
        """
        
        if not self.client:
            # Mock mode - always return True for testing
            print("⚠️ Mock mode: Skipping signature verification")
            return True
        
        try:
            # Create signature string
            message = f"{razorpay_order_id}|{razorpay_payment_id}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                self.key_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            return hmac.compare_digest(expected_signature, razorpay_signature)
            
        except Exception as e:
            print(f"❌ Signature verification failed: {str(e)}")
            return False
    
    def fetch_payment(self, payment_id: str) -> Dict:
        """
        Fetch payment details from Razorpay
        
        Args:
            payment_id: Razorpay payment ID
        
        Returns:
            Payment details
        """
        
        if not self.client:
            # Mock mode
            return {
                "id": payment_id,
                "entity": "payment",
                "status": "captured",
                "method": "upi",
                "mock": True
            }
        
        try:
            payment = self.client.payment.fetch(payment_id)
            return payment
        except Exception as e:
            print(f"❌ Failed to fetch payment: {str(e)}")
            raise Exception(f"Failed to fetch payment details: {str(e)}")
    
    def capture_payment(self, payment_id: str, amount: float, currency: str = "INR") -> Dict:
        """
        Capture a payment (for authorized payments)
        
        Args:
            payment_id: Razorpay payment ID
            amount: Amount to capture in smallest currency unit
            currency: Currency code
        
        Returns:
            Captured payment details
        """
        
        if not self.client:
            return {
                "id": payment_id,
                "status": "captured",
                "amount": amount,
                "currency": currency,
                "mock": True
            }
        
        try:
            amount_in_paise = int(amount * 100)
            payment = self.client.payment.capture(payment_id, amount_in_paise, {"currency": currency})
            return payment
        except Exception as e:
            print(f"❌ Failed to capture payment: {str(e)}")
            raise Exception(f"Failed to capture payment: {str(e)}")
    
    def refund_payment(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        notes: Optional[Dict] = None
    ) -> Dict:
        """
        Refund a payment (full or partial)
        
        Args:
            payment_id: Razorpay payment ID
            amount: Amount to refund (None for full refund)
            notes: Additional notes
        
        Returns:
            Refund details
        """
        
        if not self.client:
            return {
                "id": f"rfnd_mock_{payment_id}",
                "payment_id": payment_id,
                "amount": amount,
                "status": "processed",
                "mock": True
            }
        
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = int(amount * 100)
            if notes:
                refund_data["notes"] = notes
            
            refund = self.client.payment.refund(payment_id, refund_data)
            return refund
        except Exception as e:
            print(f"❌ Failed to process refund: {str(e)}")
            raise Exception(f"Failed to process refund: {str(e)}")

# Singleton instance
razorpay_service = RazorpayService()
