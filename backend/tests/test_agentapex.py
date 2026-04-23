"""
AgentApex API Tests
Tests for the AgentApex mobile property management app APIs
Endpoint prefix: /api/agentapex/
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "9876543210"


class TestAgentApexRoot:
    """Test AgentApex root endpoint"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns API info"""
        response = requests.get(f"{BASE_URL}/api/agentapex/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "AgentApex API"
        assert "version" in data
        print(f"✓ Root endpoint OK: {data}")


class TestAgentApexAuth:
    """Test AgentApex OTP authentication flow"""
    
    def test_send_otp(self):
        """Test send OTP endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "demo_otp" in data  # Demo OTP for testing
        assert len(data["demo_otp"]) == 6
        print(f"✓ Send OTP OK: Demo OTP = {data['demo_otp']}")
        return data["demo_otp"]
    
    def test_verify_otp_success(self):
        """Test verify OTP endpoint with correct OTP"""
        # First send OTP
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        # Verify OTP
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["phone"] == TEST_PHONE
        print(f"✓ Verify OTP OK: User ID = {data['user']['id']}")
        return data["token"]
    
    def test_verify_otp_invalid(self):
        """Test verify OTP endpoint with incorrect OTP"""
        # First send OTP to ensure phone is in system
        requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": "1111111111"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": "1111111111", "otp": "000000"}
        )
        assert response.status_code == 400
        print("✓ Invalid OTP correctly rejected")
    
    def test_auth_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/agentapex/auth/me")
        assert response.status_code == 401
        print("✓ Unauthorized access correctly rejected")


class TestAgentApexProperties:
    """Test AgentApex properties endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_properties(self):
        """Test get properties (public endpoint)"""
        response = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get properties OK: {len(data)} properties found")
    
    def test_create_property(self, auth_token):
        """Test create property endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        property_data = {
            "property_type": "Land",
            "title": "TEST_Sample Land Property",
            "price": 50.0,
            "price_unit": "Lakhs",
            "area": 100.0,
            "area_unit": "Sq. Ft.",
            "location": "Test Location",
            "city": "Hyderabad",
            "state": "Telangana",
            "country": "India",
            "latitude": 17.385044,
            "longitude": 78.486671,
            "negotiable": True,
            "description": "Test property for API testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=property_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["property_type"] == "Land"
        assert data["status"] == "active"
        print(f"✓ Create property OK: ID = {data['id']}")
        return data["id"]
    
    def test_get_my_properties(self, auth_token):
        """Test get user's own properties"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/properties/my",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my properties OK: {len(data)} properties")


class TestAgentApexStats:
    """Test AgentApex stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_stats(self, auth_token):
        """Test stats endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "leads" in data
        assert "followups" in data
        assert "favorites" in data
        print(f"✓ Get stats OK: {data}")


class TestAgentApexAdmin:
    """Test AgentApex admin endpoints"""
    
    def test_admin_get_users(self):
        """Test admin users endpoint"""
        response = requests.get(f"{BASE_URL}/api/agentapex/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin get users OK: {len(data)} users")
    
    def test_admin_get_leads(self):
        """Test admin leads endpoint"""
        response = requests.get(f"{BASE_URL}/api/agentapex/admin/leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin get leads OK: {len(data)} leads")
    
    def test_admin_get_stats(self):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/agentapex/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_properties" in data
        assert "total_leads" in data
        assert "total_requirements" in data
        print(f"✓ Admin stats OK: {data}")


class TestAgentApexLeads:
    """Test AgentApex leads endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_leads(self, auth_token):
        """Test get user's leads"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/leads",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get leads OK: {len(data)} leads")


class TestAgentApexFollowups:
    """Test AgentApex followups endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_followups(self, auth_token):
        """Test get user's followups"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/followups",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get followups OK: {len(data)} followups")


class TestAgentApexFavorites:
    """Test AgentApex favorites endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_favorites(self, auth_token):
        """Test get user's favorites"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/favorites",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get favorites OK: {len(data)} favorites")


class TestAgentApexRequirements:
    """Test AgentApex requirements endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        send_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": TEST_PHONE}
        )
        demo_otp = send_response.json()["demo_otp"]
        
        verify_response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": TEST_PHONE, "otp": demo_otp}
        )
        return verify_response.json()["token"]
    
    def test_get_all_requirements(self):
        """Test get all requirements (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/agentapex/requirements/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get all requirements OK: {len(data)} requirements")
    
    def test_get_my_requirements(self, auth_token):
        """Test get user's requirements"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/requirements",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get my requirements OK: {len(data)} requirements")


class TestAgentApexDocumentTypes:
    """Test document types endpoint"""
    
    def test_get_document_types(self):
        """Test get document types"""
        response = requests.get(f"{BASE_URL}/api/agentapex/document-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "name" in data[0]
        print(f"✓ Get document types OK: {len(data)} types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
