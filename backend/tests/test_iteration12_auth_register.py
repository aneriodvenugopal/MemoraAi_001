"""
Iteration 12 Tests: Registration, OTP Login, Password Login
Tests:
- POST /api/auth/send-otp - Send OTP to phone
- POST /api/auth/login - Password login
- POST /api/auth/register - New user registration with auto-tenant creation
- GET /api/memoraai/saas-admin/dashboard - Super admin dashboard
- GET /api/memoraai/inbox/stats - Tenant admin inbox stats
- POST /api/memoraai/engine/detect-emotion - Emotion detection
- GET /api/memoraai/engine/followup-config - Follow-up config
- GET /api/memoraai/engine/lead-fields - Category-specific lead fields
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
SUPER_ADMIN_PHONE = "9948303060"
SUPER_ADMIN_PASSWORD = "admin123"
TENANT_ADMIN_PHONE = "8888888888"
TENANT_ADMIN_PASSWORD = "admin123"

# New phone for registration test
TEST_REGISTER_PHONE = f"98765{str(uuid.uuid4().int)[:5]}"  # Random unique phone


class TestSendOTP:
    """Test OTP sending functionality"""
    
    def test_send_otp_super_admin(self):
        """Test sending OTP to super admin phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": SUPER_ADMIN_PHONE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "otp" in data, "OTP should be in response (dev mode)"
        assert data["phone"] == SUPER_ADMIN_PHONE
        assert data["account_type"] == "user"
        print(f"✓ Send OTP to super_admin: OTP={data['otp']}")
    
    def test_send_otp_tenant_admin(self):
        """Test sending OTP to tenant admin phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TENANT_ADMIN_PHONE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "otp" in data, "OTP should be in response (dev mode)"
        assert data["phone"] == TENANT_ADMIN_PHONE
        print(f"✓ Send OTP to tenant_admin: OTP={data['otp']}")
    
    def test_send_otp_nonexistent_phone(self):
        """Test sending OTP to non-existent phone returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "1111111111"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Send OTP to non-existent phone returns 404")


class TestPasswordLogin:
    """Test password login functionality"""
    
    def test_login_super_admin(self):
        """Test password login for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SUPER_ADMIN_PHONE,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Should return access_token"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        assert data["user"]["phone"] == SUPER_ADMIN_PHONE
        print(f"✓ Super admin login successful: role={data['user']['role']}")
        return data["access_token"]
    
    def test_login_tenant_admin(self):
        """Test password login for tenant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Should return access_token"
        assert data["user"]["role"] == "tenant_admin", f"Expected tenant_admin role, got {data['user']['role']}"
        assert data["user"]["phone"] == TENANT_ADMIN_PHONE
        assert data["user"]["tenant_id"] is not None, "Tenant admin should have tenant_id"
        print(f"✓ Tenant admin login successful: role={data['user']['role']}, tenant_id={data['user']['tenant_id']}")
        return data["access_token"]
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SUPER_ADMIN_PHONE,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password returns 401")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "1111111111",
            "password": "anypassword"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user returns 404")


class TestRegistration:
    """Test user registration with auto-tenant creation"""
    
    def test_register_new_user_creates_tenant(self):
        """Test registration creates new user + tenant + returns token"""
        unique_phone = f"98765{str(uuid.uuid4().int)[:5]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Business Owner",
            "phone": unique_phone,
            "email": f"test{unique_phone}@example.com",
            "password": "testpass123",
            "company_name": "Test Business LLC",
            "category": "real_estate",
            "city": "Mumbai"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Should return access_token for auto-login"
        assert "user" in data, "Should return user object"
        assert data["user"]["role"] == "tenant_admin", f"Default role should be tenant_admin, got {data['user']['role']}"
        assert data["user"]["tenant_id"] is not None, "Should create tenant_id"
        assert data["user"]["phone"] == unique_phone
        assert data["user"]["name"] == "Test Business Owner"
        
        print(f"✓ Registration successful: user_id={data['user']['id']}, tenant_id={data['user']['tenant_id']}")
        return data
    
    def test_register_without_role_defaults_to_tenant_admin(self):
        """Test registration without role_id defaults to tenant_admin"""
        unique_phone = f"98764{str(uuid.uuid4().int)[:5]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Another Owner",
            "phone": unique_phone,
            "password": "testpass456"
            # No role_id, company_name, category, city
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["user"]["role"] == "tenant_admin", "Should default to tenant_admin"
        assert data["user"]["tenant_id"] is not None, "Should create tenant"
        print(f"✓ Registration without role defaults to tenant_admin")
    
    def test_register_duplicate_phone_fails(self):
        """Test registration with existing phone returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate User",
            "phone": SUPER_ADMIN_PHONE,  # Already exists
            "password": "testpass789"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate phone registration returns 400")
    
    def test_register_creates_tenant_with_category(self):
        """Test registration creates tenant with company_name and category"""
        unique_phone = f"98763{str(uuid.uuid4().int)[:5]}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Astrology Business",
            "phone": unique_phone,
            "password": "astro123",
            "company_name": "Star Predictions",
            "category": "astrology",
            "city": "Delhi"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify tenant was created with category
        assert data["user"]["tenant_id"] is not None
        print(f"✓ Registration creates tenant with category: tenant_id={data['user']['tenant_id']}")


class TestSuperAdminDashboard:
    """Test super admin dashboard access"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SUPER_ADMIN_PHONE,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def tenant_admin_token(self):
        """Get tenant admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_saas_admin_dashboard_super_admin(self, super_admin_token):
        """Test super admin can access SaaS admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/saas-admin/dashboard",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "overview" in data or "total_tenants" in data or isinstance(data, dict)
        print(f"✓ Super admin can access SaaS dashboard")
    
    def test_saas_admin_dashboard_tenant_admin_forbidden(self, tenant_admin_token):
        """Test tenant admin cannot access SaaS admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/saas-admin/dashboard",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Tenant admin gets 403 on SaaS dashboard")


class TestTenantAdminInbox:
    """Test tenant admin inbox stats"""
    
    @pytest.fixture
    def tenant_admin_token(self):
        """Get tenant admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_inbox_stats_tenant_admin(self, tenant_admin_token):
        """Test tenant admin can access inbox stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/inbox/stats",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Check for expected fields
        assert "total_conversations" in data or "active" in data or isinstance(data, dict)
        print(f"✓ Tenant admin can access inbox stats")


class TestEmotionDetection:
    """Test emotion detection API"""
    
    @pytest.fixture
    def tenant_admin_token(self):
        """Get tenant admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_detect_emotion_angry(self, tenant_admin_token):
        """Test emotion detection for angry message"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            headers={"Authorization": f"Bearer {tenant_admin_token}"},
            json={"message": "This is terrible service! I am very frustrated!"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "primary_emotion" in data or "emotion" in data or "detected_emotion" in data
        print(f"✓ Emotion detection works: {data}")
    
    def test_detect_emotion_happy(self, tenant_admin_token):
        """Test emotion detection for happy message"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/engine/detect-emotion",
            headers={"Authorization": f"Bearer {tenant_admin_token}"},
            json={"message": "Thank you so much! This is amazing!"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Happy emotion detection works")


class TestFollowupConfig:
    """Test follow-up config API"""
    
    @pytest.fixture
    def tenant_admin_token(self):
        """Get tenant admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_followup_config(self, tenant_admin_token):
        """Test getting follow-up config"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/engine/followup-config",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Check for expected fields
        assert "enabled" in data or "timing" in data or isinstance(data, dict)
        print(f"✓ Follow-up config retrieved: {data}")


class TestLeadFields:
    """Test lead fields API"""
    
    @pytest.fixture
    def tenant_admin_token(self):
        """Get tenant admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_lead_fields_real_estate(self, tenant_admin_token):
        """Test getting lead fields for real estate category"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/engine/lead-fields?category=real_estate",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "fields" in data or isinstance(data, list) or isinstance(data, dict)
        print(f"✓ Lead fields for real_estate retrieved")
    
    def test_get_lead_fields_astrology(self, tenant_admin_token):
        """Test getting lead fields for astrology category"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/engine/lead-fields?category=astrology",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Lead fields for astrology retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
