"""
Customer Portal API Tests
Tests for OTP-based authentication and customer self-service portal endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test customer credentials
TEST_PHONE = "9876543210"
TEST_CUSTOMER_ID = "063e04d0-3ab5-4b41-a164-8b1680c72f7c"
TEST_BOOKING_ID = "757d0be7-5bd0-4368-ae12-af4f08b125f0"


class TestCustomerPortalAuth:
    """Authentication flow tests - OTP login/logout"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_login_request_otp(self):
        """POST /api/customer-portal/login - Request OTP with valid phone"""
        response = self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "mock_otp" in data, "Mock OTP should be in response"
        assert data.get("mock_mode") is True
        assert "phone_masked" in data
        print(f"✓ OTP requested successfully, mock_otp: {data.get('mock_otp')}")
    
    def test_02_login_invalid_phone(self):
        """POST /api/customer-portal/login - Invalid phone returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": "0000000000"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid phone correctly returns 404")
    
    def test_03_verify_otp_success(self):
        """POST /api/customer-portal/verify-otp - Verify OTP and create session"""
        # First request OTP
        login_response = self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        assert login_response.status_code == 200
        otp = login_response.json().get("mock_otp")
        
        # Verify OTP
        response = self.session.post(
            f"{BASE_URL}/api/customer-portal/verify-otp",
            json={"phone": TEST_PHONE, "otp": otp}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "session_id" in data
        assert "customer" in data
        assert data["customer"]["id"] == TEST_CUSTOMER_ID
        assert data["customer"]["phone"] == TEST_PHONE
        print(f"✓ OTP verified, session_id: {data.get('session_id')[:8]}...")
    
    def test_04_verify_otp_invalid(self):
        """POST /api/customer-portal/verify-otp - Invalid OTP returns 400"""
        # First request OTP
        self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        
        # Try invalid OTP
        response = self.session.post(
            f"{BASE_URL}/api/customer-portal/verify-otp",
            json={"phone": TEST_PHONE, "otp": "000000"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid OTP correctly returns 400")


class TestCustomerPortalEndpoints:
    """Protected endpoint tests - require valid session"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get OTP
        login_response = self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        otp = login_response.json().get("mock_otp")
        
        # Verify OTP and get session
        verify_response = self.session.post(
            f"{BASE_URL}/api/customer-portal/verify-otp",
            json={"phone": TEST_PHONE, "otp": otp}
        )
        self.session_id = verify_response.json().get("session_id")
        self.session.headers.update({"X-Portal-Session": self.session_id})
    
    def test_05_get_profile_authenticated(self):
        """GET /api/customer-portal/me - Get customer profile with session"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == TEST_CUSTOMER_ID
        assert data.get("phone") == TEST_PHONE
        print(f"✓ Profile retrieved: {data.get('name')}")
    
    def test_06_get_profile_unauthenticated(self):
        """GET /api/customer-portal/me - Returns 401 without session"""
        response = requests.get(f"{BASE_URL}/api/customer-portal/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated request correctly returns 401")
    
    def test_07_get_dashboard(self):
        """GET /api/customer-portal/dashboard - Get dashboard overview"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "customer" in data
        assert "overview" in data
        assert "total_properties" in data["overview"]
        assert "total_invested" in data["overview"]
        assert "total_paid" in data["overview"]
        assert "total_pending" in data["overview"]
        print(f"✓ Dashboard: {data['overview']['total_properties']} properties, ₹{data['overview']['total_invested']} invested")
    
    def test_08_get_properties(self):
        """GET /api/customer-portal/properties - List customer properties"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/properties")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "properties" in data
        properties = data["properties"]
        print(f"✓ Properties: {len(properties)} found")
        
        if properties:
            prop = properties[0]
            assert "id" in prop
            assert "property_number" in prop
            print(f"  - Property: {prop.get('property_number')}")
    
    def test_09_get_payments(self):
        """GET /api/customer-portal/payments - List payment history"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/payments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payments" in data
        print(f"✓ Payments: {len(data['payments'])} found")
    
    def test_10_get_payment_schedule(self):
        """GET /api/customer-portal/payment-schedule - Get EMI schedule"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/payment-schedule")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "schedules" in data
        print(f"✓ Payment schedules: {len(data['schedules'])} found")
    
    def test_11_get_documents(self):
        """GET /api/customer-portal/documents - List available documents"""
        response = self.session.get(f"{BASE_URL}/api/customer-portal/documents")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "documents" in data
        documents = data["documents"]
        print(f"✓ Documents: {len(documents)} available")
        
        # Check document types
        doc_types = set(d.get("type") for d in documents)
        print(f"  - Types: {doc_types}")


class TestDocumentDownloads:
    """PDF document download tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get OTP
        login_response = self.session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        otp = login_response.json().get("mock_otp")
        
        # Verify OTP and get session
        verify_response = self.session.post(
            f"{BASE_URL}/api/customer-portal/verify-otp",
            json={"phone": TEST_PHONE, "otp": otp}
        )
        self.session_id = verify_response.json().get("session_id")
        self.session.headers.update({"X-Portal-Session": self.session_id})
        
        # Get documents list
        docs_response = self.session.get(f"{BASE_URL}/api/customer-portal/documents")
        self.documents = docs_response.json().get("documents", [])
    
    def test_12_download_booking_confirmation(self):
        """GET /api/customer-portal/download/booking-confirmation/{id} - Download PDF"""
        response = self.session.get(
            f"{BASE_URL}/api/customer-portal/download/booking-confirmation/{TEST_BOOKING_ID}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✓ Booking confirmation PDF downloaded ({len(response.content)} bytes)")
    
    def test_13_download_payment_schedule(self):
        """GET /api/customer-portal/download/payment-schedule/{id} - Download PDF"""
        # Get property ID from documents
        property_id = None
        for doc in self.documents:
            if doc.get("type") == "payment_schedule" and doc.get("property_id"):
                property_id = doc["property_id"]
                break
        
        if not property_id:
            pytest.skip("No property found for payment schedule download")
        
        response = self.session.get(
            f"{BASE_URL}/api/customer-portal/download/payment-schedule/{property_id}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"✓ Payment schedule PDF downloaded ({len(response.content)} bytes)")
    
    def test_14_download_allotment_letter(self):
        """GET /api/customer-portal/download/allotment-letter/{id} - Download PDF"""
        # Get property ID from documents
        property_id = None
        for doc in self.documents:
            if doc.get("type") == "allotment_letter" and doc.get("property_id"):
                property_id = doc["property_id"]
                break
        
        if not property_id:
            pytest.skip("No property found for allotment letter download")
        
        response = self.session.get(
            f"{BASE_URL}/api/customer-portal/download/allotment-letter/{property_id}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"✓ Allotment letter PDF downloaded ({len(response.content)} bytes)")
    
    def test_15_download_unauthorized(self):
        """Download without session returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/customer-portal/download/booking-confirmation/{TEST_BOOKING_ID}"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized download correctly returns 401")
    
    def test_16_download_invalid_booking(self):
        """Download with invalid booking ID returns 403"""
        response = self.session.get(
            f"{BASE_URL}/api/customer-portal/download/booking-confirmation/invalid-id"
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Invalid booking ID correctly returns 403")


class TestLogout:
    """Logout functionality tests"""
    
    def test_17_logout(self):
        """POST /api/customer-portal/logout - Logout and invalidate session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/customer-portal/login",
            json={"phone": TEST_PHONE}
        )
        otp = login_response.json().get("mock_otp")
        
        verify_response = session.post(
            f"{BASE_URL}/api/customer-portal/verify-otp",
            json={"phone": TEST_PHONE, "otp": otp}
        )
        session_id = verify_response.json().get("session_id")
        session.headers.update({"X-Portal-Session": session_id})
        
        # Logout
        response = session.post(f"{BASE_URL}/api/customer-portal/logout")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") is True
        print("✓ Logout successful")
        
        # Verify session is invalidated
        me_response = session.get(f"{BASE_URL}/api/customer-portal/me")
        assert me_response.status_code == 401, "Session should be invalidated after logout"
        print("✓ Session invalidated after logout")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
