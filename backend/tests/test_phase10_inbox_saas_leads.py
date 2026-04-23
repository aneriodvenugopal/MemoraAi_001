"""
Phase 10 Testing: MemoraAI Revenue Modules
- Team Inbox + Human Handover
- Lead Capture Funnel
- Follow-up Automation Config
- Emotional Intelligence
- SaaS Admin Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SAAS_ADMIN = {"phone": "9948303060", "password": "admin123"}  # super_admin
TENANT_ADMIN = {"phone": "8888888888", "password": "admin123"}  # tenant_admin


@pytest.fixture(scope="module")
def saas_token():
    """Get SaaS admin token (super_admin)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SAAS_ADMIN)
    assert response.status_code == 200, f"SaaS admin login failed: {response.text}"
    data = response.json()
    # API returns access_token, not token
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def tenant_token():
    """Get tenant admin token (tenant_admin)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
    assert response.status_code == 200, f"Tenant admin login failed: {response.text}"
    data = response.json()
    # API returns access_token, not token
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


class TestTeamInboxAPI:
    """Team Inbox + Human Handover API Tests"""
    
    def test_list_conversations(self, tenant_token):
        """GET /api/memoraai/inbox/conversations - List team inbox conversations"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/inbox/conversations", headers=headers)
        assert response.status_code == 200, f"List conversations failed: {response.text}"
        data = response.json()
        assert "conversations" in data, "Response should have 'conversations' key"
        assert "count" in data, "Response should have 'count' key"
        assert isinstance(data["conversations"], list), "conversations should be a list"
        print(f"Found {data['count']} conversations")
    
    def test_inbox_stats(self, tenant_token):
        """GET /api/memoraai/inbox/stats - Inbox statistics"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/inbox/stats", headers=headers)
        assert response.status_code == 200, f"Inbox stats failed: {response.text}"
        data = response.json()
        # Verify expected stats fields
        expected_fields = ["total_conversations", "active", "human_mode", "ai_mode", "messages_today", "unread"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Inbox stats: {data}")
    
    def test_inbox_requires_auth(self):
        """Inbox endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/memoraai/inbox/conversations")
        assert response.status_code in [401, 403], "Should require auth"
        
        response = requests.get(f"{BASE_URL}/api/memoraai/inbox/stats")
        assert response.status_code in [401, 403], "Should require auth"


class TestEmotionDetectionAPI:
    """Emotional Intelligence API Tests"""
    
    def test_detect_angry_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects angry tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "This is terrible service! I am very frustrated and upset!"}
        )
        assert response.status_code == 200, f"Emotion detection failed: {response.text}"
        data = response.json()
        assert data.get("primary_emotion") == "angry", f"Expected angry, got {data.get('primary_emotion')}"
        assert "confidence" in data
        assert "recommended_style" in data
        assert data.get("recommended_style") == "empathetic_calm"
        print(f"Angry detection: {data}")
    
    def test_detect_happy_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects happy tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "Thank you so much! This is amazing and wonderful service!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("primary_emotion") == "happy", f"Expected happy, got {data.get('primary_emotion')}"
        assert data.get("recommended_style") == "appreciative"
        print(f"Happy detection: {data}")
    
    def test_detect_urgent_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects urgent tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "This is urgent! I need help immediately, cannot wait!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("primary_emotion") == "urgent", f"Expected urgent, got {data.get('primary_emotion')}"
        assert data.get("recommended_style") == "quick_action"
        print(f"Urgent detection: {data}")
    
    def test_detect_confused_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects confused tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "I don't understand, can you explain? Not clear what you mean."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("primary_emotion") == "confused", f"Expected confused, got {data.get('primary_emotion')}"
        assert data.get("recommended_style") == "explanatory"
        print(f"Confused detection: {data}")
    
    def test_detect_bargaining_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects bargaining tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "Can you give me a discount? This is too expensive, need best price."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("primary_emotion") == "bargaining", f"Expected bargaining, got {data.get('primary_emotion')}"
        assert data.get("recommended_style") == "value_justification"
        print(f"Bargaining detection: {data}")
    
    def test_detect_neutral_emotion(self):
        """POST /api/memoraai/engine/detect-emotion - Detects neutral tone"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            json={"message": "I would like to book an appointment for next week."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("primary_emotion") == "neutral", f"Expected neutral, got {data.get('primary_emotion')}"
        assert data.get("recommended_style") == "friendly_professional"
        print(f"Neutral detection: {data}")


class TestFollowupConfigAPI:
    """Follow-up Automation Config API Tests"""
    
    def test_get_followup_config(self, tenant_token):
        """GET /api/memoraai/engine/followup-config - Returns follow-up timing config"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/engine/followup-config", headers=headers)
        assert response.status_code == 200, f"Get followup config failed: {response.text}"
        data = response.json()
        assert "config" in data, "Response should have 'config' key"
        config = data["config"]
        # Verify default config structure
        assert "enabled" in config
        assert "timing" in config
        assert isinstance(config["timing"], list)
        assert len(config["timing"]) >= 3, "Should have at least 3 timing options"
        assert "max_followups" in config
        assert "stop_on_reply" in config
        print(f"Followup config: {config}")
    
    def test_update_followup_config(self, tenant_token):
        """PUT /api/memoraai/engine/followup-config - Update follow-up settings"""
        headers = {"Authorization": f"Bearer {tenant_token}", "Content-Type": "application/json"}
        update_data = {
            "enabled": True,
            "max_followups": 5,
            "stop_on_reply": True
        }
        response = requests.put(
            f"{BASE_URL}/api/memoraai/engine/followup-config",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update followup config failed: {response.text}"
        data = response.json()
        assert "config" in data
        assert data["config"]["max_followups"] == 5
        print(f"Updated followup config: {data['config']}")
    
    def test_followup_config_requires_auth(self):
        """Follow-up config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/memoraai/engine/followup-config")
        assert response.status_code in [401, 403], "Should require auth"


class TestLeadCaptureAPI:
    """Lead Capture Funnel API Tests"""
    
    def test_get_lead_fields_astrology(self, tenant_token):
        """GET /api/memoraai/engine/lead-fields?category=astrology - Returns 5 structured lead fields"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(
            f"{BASE_URL}/api/memoraai/engine/lead-fields?category=astrology",
            headers=headers
        )
        assert response.status_code == 200, f"Get lead fields failed: {response.text}"
        data = response.json()
        assert "category" in data
        assert data["category"] == "astrology"
        assert "fields" in data
        fields = data["fields"]
        assert len(fields) == 5, f"Expected 5 fields for astrology, got {len(fields)}"
        # Verify astrology-specific fields
        field_names = [f["field"] for f in fields]
        assert "birth_date" in field_names, "Astrology should have birth_date field"
        assert "birth_time" in field_names, "Astrology should have birth_time field"
        assert "birth_place" in field_names, "Astrology should have birth_place field"
        print(f"Astrology lead fields: {field_names}")
    
    def test_get_lead_fields_real_estate(self, tenant_token):
        """GET /api/memoraai/engine/lead-fields?category=real_estate - Returns real estate fields"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(
            f"{BASE_URL}/api/memoraai/engine/lead-fields?category=real_estate",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "real_estate"
        fields = data["fields"]
        field_names = [f["field"] for f in fields]
        assert "budget" in field_names, "Real estate should have budget field"
        assert "location" in field_names, "Real estate should have location field"
        assert "property_type" in field_names, "Real estate should have property_type field"
        print(f"Real estate lead fields: {field_names}")
    
    def test_capture_lead(self, tenant_token):
        """POST /api/memoraai/engine/capture-lead - Captures structured lead"""
        headers = {"Authorization": f"Bearer {tenant_token}", "Content-Type": "application/json"}
        lead_data = {
            "phone": "TEST_9876543210",
            "name": "TEST_Lead User",
            "category_slug": "astrology",
            "fields": {
                "birth_date": "1990-01-15",
                "birth_time": "10:30 AM",
                "birth_place": "Mumbai",
                "concern": "Career"
            },
            "source": "whatsapp",
            "score": "hot",
            "tags": ["test", "phase10"]
        }
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/capture-lead",
            headers=headers,
            json=lead_data
        )
        assert response.status_code == 200, f"Capture lead failed: {response.text}"
        data = response.json()
        assert "lead" in data
        lead = data["lead"]
        assert lead["phone"] == "TEST_9876543210"
        assert lead["name"] == "TEST_Lead User"
        assert lead["score"] == "hot"
        assert "id" in lead
        print(f"Captured lead: {lead['id']}")
    
    def test_list_leads(self, tenant_token):
        """GET /api/memoraai/engine/leads - Lists captured leads"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/engine/leads", headers=headers)
        assert response.status_code == 200, f"List leads failed: {response.text}"
        data = response.json()
        assert "leads" in data
        assert "count" in data
        assert isinstance(data["leads"], list)
        print(f"Found {data['count']} leads")
    
    def test_lead_stats(self, tenant_token):
        """GET /api/memoraai/engine/leads/stats - Lead funnel stats"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/engine/leads/stats", headers=headers)
        assert response.status_code == 200, f"Lead stats failed: {response.text}"
        data = response.json()
        # Verify funnel stats
        assert "total" in data
        assert "hot" in data
        assert "warm" in data
        assert "cold" in data
        print(f"Lead stats: {data}")


class TestSaaSAdminDashboardAPI:
    """SaaS Admin Dashboard API Tests"""
    
    def test_saas_dashboard_super_admin(self, saas_token):
        """GET /api/memoraai/saas-admin/dashboard - SaaS admin overview (super_admin only)"""
        headers = {"Authorization": f"Bearer {saas_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/saas-admin/dashboard", headers=headers)
        assert response.status_code == 200, f"SaaS dashboard failed: {response.text}"
        data = response.json()
        # Verify overview structure
        assert "overview" in data
        overview = data["overview"]
        expected_fields = [
            "total_tenants", "total_users", "total_conversations",
            "total_messages", "total_memories", "waba_configured", "waba_pending"
        ]
        for field in expected_fields:
            assert field in overview, f"Missing overview field: {field}"
        # Verify tenants list
        assert "tenants" in data
        assert isinstance(data["tenants"], list)
        print(f"SaaS dashboard overview: {overview}")
    
    def test_saas_dashboard_forbidden_for_tenant_admin(self, tenant_token):
        """SaaS admin dashboard returns 403 for tenant_admin"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/saas-admin/dashboard", headers=headers)
        assert response.status_code == 403, f"Expected 403 for tenant_admin, got {response.status_code}"
        print("Correctly returned 403 for tenant_admin")
    
    def test_list_all_users_super_admin(self, saas_token):
        """GET /api/memoraai/saas-admin/users - List all users (super_admin only)"""
        headers = {"Authorization": f"Bearer {saas_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/saas-admin/users", headers=headers)
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        assert "users" in data
        assert "count" in data
        assert isinstance(data["users"], list)
        # Verify no sensitive data exposed
        if data["users"]:
            user = data["users"][0]
            assert "password_hash" not in user, "Should not expose password_hash"
            assert "otp" not in user, "Should not expose otp"
        print(f"Found {data['count']} users")
    
    def test_list_users_forbidden_for_tenant_admin(self, tenant_token):
        """List users returns 403 for tenant_admin"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/saas-admin/users", headers=headers)
        assert response.status_code == 403, f"Expected 403 for tenant_admin, got {response.status_code}"
        print("Correctly returned 403 for tenant_admin")


class TestBusinessRulesStillWorks:
    """Verify /business-rules page still works (regression test)"""
    
    def test_get_business_rules(self, tenant_token):
        """GET /api/memoraai/rules - Business rules still accessible"""
        headers = {"Authorization": f"Bearer {tenant_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/rules", headers=headers)
        assert response.status_code == 200, f"Get rules failed: {response.text}"
        data = response.json()
        assert "rules" in data
        print(f"Found {len(data['rules'])} business rules")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
