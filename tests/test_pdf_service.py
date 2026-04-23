"""
PDF Generation Service API Tests
Tests for:
- GET /api/pdf/booking-confirmation/:property_id - Booking confirmation PDF
- GET /api/pdf/payment-receipt/:payment_id - Payment receipt PDF
- GET /api/pdf/payment-schedule/:property_id - Payment schedule PDF
- GET /api/pdf/allotment-letter/:property_id - Allotment letter PDF
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test property ID from previous testing
TEST_PROPERTY_ID = "3f61fcf3-dbff-44d3-8ea3-c49452b78dc5"

# Test credentials
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"


class TestPDFServiceAuth:
    """Test authentication for PDF endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login to get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        print(f"✓ Login successful")


class TestBookingConfirmationPDF:
    """Tests for Booking Confirmation PDF endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_booking_confirmation_pdf_returns_pdf(self, auth_headers):
        """Test that booking confirmation endpoint returns a PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/booking-confirmation/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Check PDF has content
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment disposition"
        assert ".pdf" in content_disposition, "Missing .pdf extension in filename"
        
        print(f"✓ Booking confirmation PDF generated: {len(response.content)} bytes")
    
    def test_booking_confirmation_pdf_invalid_id(self, auth_headers):
        """Test booking confirmation with invalid property ID"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/booking-confirmation/invalid-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid property ID returns 404")
    
    def test_booking_confirmation_pdf_no_auth(self):
        """Test booking confirmation without authentication"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/booking-confirmation/{TEST_PROPERTY_ID}"
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Unauthenticated request returns {response.status_code}")


class TestPaymentSchedulePDF:
    """Tests for Payment Schedule PDF endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_payment_schedule_pdf_returns_pdf(self, auth_headers):
        """Test that payment schedule endpoint returns a PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/payment-schedule/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Check PDF has content
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment disposition"
        assert "Payment_Schedule" in content_disposition, "Missing Payment_Schedule in filename"
        
        print(f"✓ Payment schedule PDF generated: {len(response.content)} bytes")
    
    def test_payment_schedule_pdf_invalid_id(self, auth_headers):
        """Test payment schedule with invalid property ID"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/payment-schedule/invalid-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid property ID returns 404")


class TestAllotmentLetterPDF:
    """Tests for Allotment Letter PDF endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_allotment_letter_pdf_returns_pdf(self, auth_headers):
        """Test that allotment letter endpoint returns a PDF"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/allotment-letter/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Check PDF has content
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Check Content-Disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment disposition"
        assert "Allotment_Letter" in content_disposition, "Missing Allotment_Letter in filename"
        
        print(f"✓ Allotment letter PDF generated: {len(response.content)} bytes")
    
    def test_allotment_letter_pdf_invalid_id(self, auth_headers):
        """Test allotment letter with invalid property ID"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/allotment-letter/invalid-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid property ID returns 404")


class TestPaymentReceiptPDF:
    """Tests for Payment Receipt PDF endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def payment_id(self, auth_headers):
        """Get a valid payment ID from the database"""
        # First try to get payments for the test property
        response = requests.get(
            f"{BASE_URL}/api/payments",
            headers=auth_headers,
            params={"property_id": TEST_PROPERTY_ID}
        )
        
        if response.status_code == 200:
            data = response.json()
            payments = data if isinstance(data, list) else data.get("payments", [])
            if payments:
                return payments[0].get("id")
        
        # Try EMI payments
        response = requests.get(
            f"{BASE_URL}/api/emi-payments",
            headers=auth_headers,
            params={"property_id": TEST_PROPERTY_ID}
        )
        
        if response.status_code == 200:
            data = response.json()
            payments = data if isinstance(data, list) else data.get("payments", [])
            if payments:
                return payments[0].get("id")
        
        return None
    
    def test_payment_receipt_pdf_returns_pdf(self, auth_headers, payment_id):
        """Test that payment receipt endpoint returns a PDF"""
        if not payment_id:
            pytest.skip("No payment found for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/pdf/payment-receipt/{payment_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Check PDF has content
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"✓ Payment receipt PDF generated: {len(response.content)} bytes")
    
    def test_payment_receipt_pdf_invalid_id(self, auth_headers):
        """Test payment receipt with invalid payment ID"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/payment-receipt/invalid-payment-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid payment ID returns 404")


class TestCustomerStatementPDF:
    """Tests for Customer Statement PDF endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def customer_id(self, auth_headers):
        """Get a valid customer ID from the property"""
        response = requests.get(
            f"{BASE_URL}/api/properties/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("customer_id")
        
        return None
    
    def test_customer_statement_pdf_returns_pdf(self, auth_headers, customer_id):
        """Test that customer statement endpoint returns a PDF"""
        if not customer_id:
            pytest.skip("No customer found for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/pdf/customer-statement/{customer_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Check PDF has content
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        # Check PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"✓ Customer statement PDF generated: {len(response.content)} bytes")
    
    def test_customer_statement_pdf_invalid_id(self, auth_headers):
        """Test customer statement with invalid customer ID"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/customer-statement/invalid-customer-id-12345",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid customer ID returns 404")


class TestPDFContentValidation:
    """Tests to validate PDF content contains expected data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        token = response.json().get("token") or response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_booking_confirmation_pdf_size(self, auth_headers):
        """Test booking confirmation PDF has reasonable size"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/booking-confirmation/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            # PDF should be between 1KB and 500KB
            size = len(response.content)
            assert 1000 < size < 500000, f"PDF size {size} bytes is outside expected range"
            print(f"✓ Booking confirmation PDF size: {size} bytes (valid range)")
    
    def test_payment_schedule_pdf_size(self, auth_headers):
        """Test payment schedule PDF has reasonable size"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/payment-schedule/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            # PDF should be between 1KB and 500KB
            size = len(response.content)
            assert 1000 < size < 500000, f"PDF size {size} bytes is outside expected range"
            print(f"✓ Payment schedule PDF size: {size} bytes (valid range)")
    
    def test_allotment_letter_pdf_size(self, auth_headers):
        """Test allotment letter PDF has reasonable size"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/allotment-letter/{TEST_PROPERTY_ID}",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            # PDF should be between 1KB and 500KB
            size = len(response.content)
            assert 1000 < size < 500000, f"PDF size {size} bytes is outside expected range"
            print(f"✓ Allotment letter PDF size: {size} bytes (valid range)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
