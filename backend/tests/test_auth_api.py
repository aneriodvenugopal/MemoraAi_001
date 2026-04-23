"""
Backend API Tests for MemoraAI (forked from RealApex SaaS)
Tests: Health checks, Auth endpoints (login, OTP)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com').rstrip('/')

# Test credentials from seed data
TEST_TENANT_ADMIN = {
    "phone": "8888888888",
    "password": "admin123"
}

TEST_SUPER_ADMIN = {
    "phone": "9999999999",
    "password": "admin123"
}


class TestHealthEndpoints:
    """Health check endpoint tests"""
    
    def test_api_root_health(self):
        """GET /api/ should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "message" in data
        assert "version" in data
        print(f"✓ API root health check passed: {data}")
    
    def test_api_health_endpoint(self):
        """GET /api/health should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "realapex-api"
        print(f"✓ API health endpoint passed: {data}")


class TestAuthLogin:
    """Authentication login tests"""
    
    def test_login_tenant_admin_success(self):
        """POST /api/auth/login with tenant admin credentials should return access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_TENANT_ADMIN,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["phone"] == TEST_TENANT_ADMIN["phone"]
        assert data["user"]["role"] == "tenant_admin"
        print(f"✓ Tenant admin login successful: user_id={data['user']['id']}")
    
    def test_login_super_admin_success(self):
        """POST /api/auth/login with super admin credentials should return access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_SUPER_ADMIN,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["phone"] == TEST_SUPER_ADMIN["phone"]
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Super admin login successful: user_id={data['user']['id']}")
    
    def test_login_invalid_password(self):
        """POST /api/auth/login with wrong password should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "8888888888", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected with 401")
    
    def test_login_nonexistent_user(self):
        """POST /api/auth/login with non-existent user should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "1111111111", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404
        print("✓ Non-existent user correctly rejected with 404")
    
    def test_login_missing_password(self):
        """POST /api/auth/login without password should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "8888888888"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400
        print("✓ Missing password correctly rejected with 400")


class TestAuthOTP:
    """OTP authentication tests"""
    
    def test_send_otp_success(self):
        """POST /api/auth/send-otp with valid phone should return OTP"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"phone": "8888888888"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "OTP sent successfully"
        assert data["phone"] == "8888888888"
        assert data["account_type"] == "user"
        # OTP is returned in dev mode
        assert "otp" in data
        print(f"✓ OTP sent successfully: {data['otp']}")
    
    def test_send_otp_nonexistent_phone(self):
        """POST /api/auth/send-otp with non-existent phone should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"phone": "1111111111"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404
        print("✓ Non-existent phone correctly rejected with 404")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_get_current_user_with_token(self):
        """GET /api/auth/me with valid token should return user info"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_TENANT_ADMIN,
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["phone"] == TEST_TENANT_ADMIN["phone"]
        assert "role" in data
        assert "tenant_id" in data
        print(f"✓ Get current user successful: {data['name']}")
    
    def test_get_current_user_without_token(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ Unauthorized access correctly rejected")


class TestAuthRoles:
    """Auth roles endpoint tests"""
    
    def test_get_all_roles(self):
        """GET /api/auth/roles should return list of roles"""
        response = requests.get(f"{BASE_URL}/api/auth/roles")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check for expected roles
        role_slugs = [r["slug"] for r in data]
        assert "super_admin" in role_slugs
        assert "tenant_admin" in role_slugs
        print(f"✓ Roles fetched successfully: {role_slugs}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
