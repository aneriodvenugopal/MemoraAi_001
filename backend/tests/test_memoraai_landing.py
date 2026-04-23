"""
MemoraAI Landing Page & Industries API Tests - Iteration 8
Tests for the new SaaS landing page with 16 industry pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health check endpoints"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API root check passed")


class TestIndustriesPublicAPI:
    """Public industries API tests - no auth required"""
    
    def test_list_industries_returns_16(self):
        """Test that /api/memoraai/industries/public returns 16 industries"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public")
        assert response.status_code == 200
        data = response.json()
        assert "industries" in data
        assert "count" in data
        assert data["count"] == 16, f"Expected 16 industries, got {data['count']}"
        print(f"✓ Industries list returned {data['count']} industries")
    
    def test_industries_have_required_fields(self):
        """Test that industries have all required fields"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["slug", "title", "icon", "hero_title", "hero_sub", "benefits", "demo_chat", "business_name"]
        
        for industry in data["industries"]:
            for field in required_fields:
                assert field in industry, f"Industry {industry.get('slug', 'unknown')} missing field: {field}"
        
        print("✓ All industries have required fields")
    
    def test_get_real_estate_industry(self):
        """Test GET /api/memoraai/industries/public/real-estate"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/real-estate")
        assert response.status_code == 200
        data = response.json()
        
        assert "industry" in data
        industry = data["industry"]
        assert industry["slug"] == "real-estate"
        assert industry["title"] == "Real Estate"
        assert len(industry.get("demo_chat", [])) > 0, "Real estate should have demo_chat"
        assert len(industry.get("benefits", [])) > 0, "Real estate should have benefits"
        
        print(f"✓ Real Estate industry loaded with {len(industry['demo_chat'])} demo messages")
    
    def test_get_astrology_industry(self):
        """Test GET /api/memoraai/industries/public/astrology"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/astrology")
        assert response.status_code == 200
        data = response.json()
        
        assert "industry" in data
        industry = data["industry"]
        assert industry["slug"] == "astrology"
        assert industry["title"] == "Astrology / Numerology"
        assert len(industry.get("demo_chat", [])) > 0
        
        print(f"✓ Astrology industry loaded with {len(industry['demo_chat'])} demo messages")
    
    def test_get_hospital_industry(self):
        """Test GET /api/memoraai/industries/public/hospital"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/hospital")
        assert response.status_code == 200
        data = response.json()
        
        assert "industry" in data
        industry = data["industry"]
        assert industry["slug"] == "hospital"
        assert industry["title"] == "Hospitals / Clinics"
        assert len(industry.get("demo_chat", [])) > 0
        
        print(f"✓ Hospital industry loaded with {len(industry['demo_chat'])} demo messages")
    
    def test_get_nonexistent_industry_returns_404(self):
        """Test that non-existent industry returns 404"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/nonexistent-industry")
        assert response.status_code == 404
        print("✓ Non-existent industry returns 404")
    
    def test_all_16_industries_accessible(self):
        """Test that all 16 industries are accessible by slug"""
        expected_slugs = [
            "real-estate", "hospital", "astrology", "salon", "gym", "car-rental",
            "function-hall", "restaurant", "education", "lawyer", "finance",
            "ecommerce", "retail", "construction", "agriculture", "software"
        ]
        
        for slug in expected_slugs:
            response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/{slug}")
            assert response.status_code == 200, f"Industry {slug} not accessible"
        
        print(f"✓ All {len(expected_slugs)} industries accessible by slug")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid tenant admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "8888888888", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["phone"] == "8888888888"
        print("✓ Login with valid credentials passed")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401 or 404"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0000000000", "password": "wrongpassword"}
        )
        # API returns 404 for user not found, 401 for wrong password
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✓ Login with invalid credentials returns {response.status_code}")


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "8888888888", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_categories_available(self, auth_token):
        """Test GET /api/memoraai/categories/available"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/categories/available", headers=headers)
        assert response.status_code == 200
        print("✓ Categories available endpoint works")
    
    def test_services_list(self, auth_token):
        """Test GET /api/memoraai/services"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/services", headers=headers)
        assert response.status_code == 200
        print("✓ Services list endpoint works")
    
    def test_memory_stats(self, auth_token):
        """Test GET /api/memoraai/memory/stats"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/memoraai/memory/stats", headers=headers)
        assert response.status_code == 200
        print("✓ Memory stats endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
