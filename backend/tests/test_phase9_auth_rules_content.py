"""
Phase 9 Backend Tests - Auth, Business Rules, Content Library
Tests:
- SaaS Admin login (9948303060 as super_admin)
- Tenant Admin login (8888888888 as tenant_admin)
- OTP send/verify flow
- Business Rules CRUD (8 default rules auto-seeded)
- Content Library CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SAAS_ADMIN = {"phone": "9948303060", "password": "admin123"}
TENANT_ADMIN = {"phone": "8888888888", "password": "admin123"}


class TestAuthLogin:
    """Authentication endpoint tests"""

    def test_saas_admin_login_returns_super_admin_role(self):
        """SaaS Admin 9948303060 should login with super_admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SAAS_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["phone"] == "9948303060"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin, got {data['user']['role']}"
        assert data["user"]["tenant_id"] is None, "SaaS admin should have no tenant_id"
        print(f"✓ SaaS Admin login: role={data['user']['role']}, tenant_id={data['user']['tenant_id']}")

    def test_tenant_admin_login_returns_tenant_admin_role(self):
        """Tenant Admin 8888888888 should login with tenant_admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["phone"] == "8888888888"
        assert data["user"]["role"] == "tenant_admin", f"Expected tenant_admin, got {data['user']['role']}"
        assert data["user"]["tenant_id"] is not None, "Tenant admin should have tenant_id"
        print(f"✓ Tenant Admin login: role={data['user']['role']}, tenant_id={data['user']['tenant_id'][:8]}...")

    def test_login_invalid_password(self):
        """Invalid password should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "9948303060",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password returns 401")


class TestOTPFlow:
    """OTP send and verify tests"""

    def test_send_otp_for_saas_admin(self):
        """Send OTP to SaaS admin phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": "9948303060"})
        assert response.status_code == 200, f"Send OTP failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "OTP sent successfully"
        assert data["phone"] == "9948303060"
        assert data["account_type"] == "user"
        assert "otp" in data  # OTP returned for testing
        print(f"✓ OTP sent to 9948303060: {data['otp']}")
        return data["otp"]

    def test_verify_otp_for_saas_admin(self):
        """Verify OTP and get token for SaaS admin"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": "9948303060"})
        assert send_response.status_code == 200
        otp = send_response.json()["otp"]
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "9948303060",
            "otp": otp
        })
        assert verify_response.status_code == 200, f"Verify OTP failed: {verify_response.text}"
        
        data = verify_response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ OTP verified for 9948303060, role={data['user']['role']}")

    def test_send_otp_for_tenant_admin(self):
        """Send OTP to tenant admin phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": "8888888888"})
        assert response.status_code == 200, f"Send OTP failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "OTP sent successfully"
        assert data["account_type"] == "user"
        print(f"✓ OTP sent to 8888888888")

    def test_send_otp_invalid_phone(self):
        """Send OTP to non-existent phone should return 404"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": "1111111111"})
        assert response.status_code == 404
        print("✓ Invalid phone returns 404")


class TestBusinessRules:
    """Business Rules API tests"""

    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for tenant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_list_rules_returns_8_defaults(self, auth_headers):
        """GET /api/memoraai/rules should return 8 default rules"""
        response = requests.get(f"{BASE_URL}/api/memoraai/rules", headers=auth_headers)
        assert response.status_code == 200, f"List rules failed: {response.text}"
        
        data = response.json()
        assert "rules" in data
        assert data["count"] >= 8, f"Expected at least 8 rules, got {data['count']}"
        
        # Check default rule categories
        categories = [r["category"] for r in data["rules"]]
        expected_categories = ["greeting", "language", "pricing", "followup", "escalation", "booking", "closing", "sensitive"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        
        print(f"✓ Rules list: {data['count']} rules, categories: {set(categories)}")

    def test_create_rule(self, auth_headers):
        """POST /api/memoraai/rules should create new rule"""
        new_rule = {
            "title": "TEST_Custom Rule",
            "category": "custom",
            "rule": "This is a test rule for automated testing"
        }
        response = requests.post(f"{BASE_URL}/api/memoraai/rules", json=new_rule, headers=auth_headers)
        assert response.status_code == 200, f"Create rule failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Rule created"
        assert data["rule"]["title"] == "TEST_Custom Rule"
        assert data["rule"]["is_active"] == True
        print(f"✓ Rule created: {data['rule']['id'][:8]}...")
        return data["rule"]["id"]

    def test_toggle_rule(self, auth_headers):
        """POST /api/memoraai/rules/{id}/toggle should toggle active state"""
        # First get rules to find one to toggle
        list_response = requests.get(f"{BASE_URL}/api/memoraai/rules", headers=auth_headers)
        rules = list_response.json()["rules"]
        rule_id = rules[0]["id"]
        original_state = rules[0]["is_active"]
        
        # Toggle
        toggle_response = requests.post(f"{BASE_URL}/api/memoraai/rules/{rule_id}/toggle", headers=auth_headers)
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        
        data = toggle_response.json()
        assert data["is_active"] != original_state
        print(f"✓ Rule toggled: {original_state} -> {data['is_active']}")
        
        # Toggle back
        requests.post(f"{BASE_URL}/api/memoraai/rules/{rule_id}/toggle", headers=auth_headers)

    def test_get_active_rules_with_rules_text(self, auth_headers):
        """GET /api/memoraai/rules/active should return active rules with rules_text"""
        response = requests.get(f"{BASE_URL}/api/memoraai/rules/active", headers=auth_headers)
        assert response.status_code == 200, f"Get active rules failed: {response.text}"
        
        data = response.json()
        assert "rules" in data
        assert "rules_text" in data
        assert "count" in data
        assert len(data["rules_text"]) > 0, "rules_text should not be empty"
        
        # All returned rules should be active
        for rule in data["rules"]:
            assert rule["is_active"] == True
        
        print(f"✓ Active rules: {data['count']}, rules_text length: {len(data['rules_text'])}")


class TestContentLibrary:
    """Content Library API tests"""

    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for tenant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_list_content(self, auth_headers):
        """GET /api/memoraai/content should return content items"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content", headers=auth_headers)
        assert response.status_code == 200, f"List content failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✓ Content list: {data['total']} items")

    def test_create_content(self, auth_headers):
        """POST /api/memoraai/content should create content item"""
        new_content = {
            "title": "TEST_Brochure",
            "content_type": "brochure",
            "description": "Test brochure for automated testing",
            "url": "https://example.com/test.pdf",
            "tags": ["test", "automated"]
        }
        response = requests.post(f"{BASE_URL}/api/memoraai/content", json=new_content, headers=auth_headers)
        assert response.status_code == 200, f"Create content failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Content created"
        assert data["item"]["title"] == "TEST_Brochure"
        assert data["item"]["content_type"] == "brochure"
        assert data["item"]["share_count"] == 0
        print(f"✓ Content created: {data['item']['id'][:8]}...")
        return data["item"]["id"]

    def test_get_content_stats(self, auth_headers):
        """GET /api/memoraai/content/stats should return stats"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content/stats", headers=auth_headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        
        data = response.json()
        assert "total" in data
        assert "by_type" in data
        print(f"✓ Content stats: total={data['total']}, types={list(data['by_type'].keys())}")

    def test_share_content_increments_count(self, auth_headers):
        """POST /api/memoraai/content/{id}/share should increment share count"""
        # First create content
        new_content = {
            "title": "TEST_ShareTest",
            "content_type": "image",
            "url": "https://example.com/test.jpg"
        }
        create_response = requests.post(f"{BASE_URL}/api/memoraai/content", json=new_content, headers=auth_headers)
        item_id = create_response.json()["item"]["id"]
        
        # Share it
        share_response = requests.post(f"{BASE_URL}/api/memoraai/content/{item_id}/share", headers=auth_headers)
        assert share_response.status_code == 200
        
        # Verify count increased
        list_response = requests.get(f"{BASE_URL}/api/memoraai/content", headers=auth_headers)
        items = list_response.json()["items"]
        shared_item = next((i for i in items if i["id"] == item_id), None)
        assert shared_item is not None
        assert shared_item["share_count"] >= 1
        print(f"✓ Share count incremented: {shared_item['share_count']}")

    def test_filter_content_by_type(self, auth_headers):
        """GET /api/memoraai/content?content_type=brochure should filter"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content?content_type=brochure", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert item["content_type"] == "brochure"
        print(f"✓ Content filtered by type: {len(data['items'])} brochures")


class TestCleanup:
    """Cleanup test data"""

    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_cleanup_test_rules(self, auth_headers):
        """Delete TEST_ prefixed rules"""
        response = requests.get(f"{BASE_URL}/api/memoraai/rules", headers=auth_headers)
        rules = response.json()["rules"]
        deleted = 0
        for rule in rules:
            if rule["title"].startswith("TEST_"):
                del_response = requests.delete(f"{BASE_URL}/api/memoraai/rules/{rule['id']}", headers=auth_headers)
                if del_response.status_code == 200:
                    deleted += 1
        print(f"✓ Cleaned up {deleted} test rules")

    def test_cleanup_test_content(self, auth_headers):
        """Delete TEST_ prefixed content"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content", headers=auth_headers)
        items = response.json()["items"]
        deleted = 0
        for item in items:
            if item["title"].startswith("TEST_"):
                del_response = requests.delete(f"{BASE_URL}/api/memoraai/content/{item['id']}", headers=auth_headers)
                if del_response.status_code == 200:
                    deleted += 1
        print(f"✓ Cleaned up {deleted} test content items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
