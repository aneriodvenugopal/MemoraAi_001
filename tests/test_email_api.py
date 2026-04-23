"""
Email API Tests for ExlainERP
Tests email service endpoints including status, templates, test emails, logs, stats, and preview
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials for tenant_admin
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"


class TestEmailPublicEndpoints:
    """Test public email endpoints (no auth required)"""
    
    def test_email_status_returns_mock_mode(self):
        """GET /api/email/status - Should return mock mode when RESEND_API_KEY not configured"""
        response = requests.get(f"{BASE_URL}/api/email/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "configured" in data
        assert "provider" in data
        assert "message" in data
        
        # Since RESEND_API_KEY is not configured, should be in mock mode
        assert data["configured"] == False
        assert data["provider"] == "mock"
        assert "MOCK mode" in data["message"]
    
    def test_email_templates_list(self):
        """GET /api/email/templates - Should return list of available templates"""
        response = requests.get(f"{BASE_URL}/api/email/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        
        # Should have 8 templates
        assert len(templates) == 8
        
        # Verify expected template IDs
        template_ids = [t["id"] for t in templates]
        expected_ids = ["welcome", "otp", "password_reset", "booking_confirmation", 
                       "payment_confirmation", "payment_reminder", "site_visit", "lead_inquiry"]
        for expected_id in expected_ids:
            assert expected_id in template_ids, f"Missing template: {expected_id}"
        
        # Verify template structure
        for template in templates:
            assert "id" in template
            assert "name" in template
            assert "description" in template
            assert "variables" in template
            assert isinstance(template["variables"], list)


class TestEmailAuthenticatedEndpoints:
    """Test authenticated email endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping authenticated tests")
        
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_email_stats(self):
        """GET /api/email/stats - Should return email statistics"""
        response = requests.get(
            f"{BASE_URL}/api/email/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify expected fields
        assert "total_sent" in data
        assert "successful" in data
        assert "failed" in data
        assert "mock_mode" in data
        assert "resend" in data
        assert "service_configured" in data
        assert "current_provider" in data
        
        # Verify data types
        assert isinstance(data["total_sent"], int)
        assert isinstance(data["successful"], int)
        assert isinstance(data["failed"], int)
        assert data["service_configured"] == False  # No RESEND_API_KEY
        assert data["current_provider"] == "mock"
    
    def test_email_logs(self):
        """GET /api/email/logs - Should return email logs"""
        response = requests.get(
            f"{BASE_URL}/api/email/logs",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "logs" in data
        assert "limit" in data
        assert "offset" in data
        
        # Verify log structure if logs exist
        if data["logs"]:
            log = data["logs"][0]
            assert "id" in log
            assert "to_email" in log
            assert "subject" in log
            assert "type" in log
            assert "provider" in log
            assert "status" in log
            assert "success" in log
            assert "created_at" in log
    
    def test_email_logs_with_pagination(self):
        """GET /api/email/logs - Should support pagination"""
        response = requests.get(
            f"{BASE_URL}/api/email/logs?limit=5&offset=0",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["limit"] == 5
        assert data["offset"] == 0
        assert len(data["logs"]) <= 5
    
    def test_send_test_email_welcome(self):
        """POST /api/email/test - Should send test welcome email in mock mode"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "welcome"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["provider"] == "mock"
        assert data["status"] == "sent"
        assert data["mock"] == True
        assert data["template_type"] == "welcome"
        assert "message_id" in data
        assert "test@example.com" in data["message"]
    
    def test_send_test_email_otp(self):
        """POST /api/email/test - Should send test OTP email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "otp"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "otp"
    
    def test_send_test_email_password_reset(self):
        """POST /api/email/test - Should send test password reset email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "password_reset"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "password_reset"
    
    def test_send_test_email_booking_confirmation(self):
        """POST /api/email/test - Should send test booking confirmation email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "booking_confirmation"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "booking_confirmation"
    
    def test_send_test_email_payment_confirmation(self):
        """POST /api/email/test - Should send test payment confirmation email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "payment_confirmation"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "payment_confirmation"
    
    def test_send_test_email_payment_reminder(self):
        """POST /api/email/test - Should send test payment reminder email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "payment_reminder"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "payment_reminder"
    
    def test_send_test_email_site_visit(self):
        """POST /api/email/test - Should send test site visit email"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "site_visit"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["template_type"] == "site_visit"
    
    def test_send_test_email_invalid_template(self):
        """POST /api/email/test - Should return 400 for invalid template type"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            headers=self.headers,
            json={"to_email": "test@example.com", "template_type": "invalid_template"}
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "Invalid template type" in data["detail"]
    
    def test_preview_email_welcome(self):
        """POST /api/email/preview - Should return welcome email HTML preview"""
        response = requests.post(
            f"{BASE_URL}/api/email/preview",
            headers=self.headers,
            json={"template_type": "welcome"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_type"] == "welcome"
        assert "html" in data
        assert len(data["html"]) > 1000  # Should have substantial HTML content
        assert "ExlainERP" in data["html"]  # Should have branding
        assert "Welcome" in data["html"]
    
    def test_preview_email_booking_confirmation(self):
        """POST /api/email/preview - Should return booking confirmation email HTML preview"""
        response = requests.post(
            f"{BASE_URL}/api/email/preview",
            headers=self.headers,
            json={"template_type": "booking_confirmation"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_type"] == "booking_confirmation"
        assert "html" in data
        assert "Booking" in data["html"]
        assert "Green Valley Villas" in data["html"]  # Sample project name
    
    def test_preview_email_payment_reminder(self):
        """POST /api/email/preview - Should return payment reminder email HTML preview"""
        response = requests.post(
            f"{BASE_URL}/api/email/preview",
            headers=self.headers,
            json={"template_type": "payment_reminder"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["template_type"] == "payment_reminder"
        assert "html" in data
        assert "Payment" in data["html"]
    
    def test_preview_email_invalid_template(self):
        """POST /api/email/preview - Should return 400 for invalid template type"""
        response = requests.post(
            f"{BASE_URL}/api/email/preview",
            headers=self.headers,
            json={"template_type": "invalid_template"}
        )
        assert response.status_code == 400


class TestEmailAuthorizationErrors:
    """Test authorization errors for email endpoints"""
    
    def test_stats_without_auth(self):
        """GET /api/email/stats - Should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/email/stats")
        assert response.status_code == 401
    
    def test_logs_without_auth(self):
        """GET /api/email/logs - Should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/email/logs")
        assert response.status_code == 401
    
    def test_send_test_without_auth(self):
        """POST /api/email/test - Should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/email/test",
            json={"to_email": "test@example.com", "template_type": "welcome"}
        )
        assert response.status_code == 401
    
    def test_preview_without_auth(self):
        """POST /api/email/preview - Should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/email/preview",
            json={"template_type": "welcome"}
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
