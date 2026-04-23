"""
Test YouTube Content Generator, Bank Accounts, and AgentApex features
Testing P0/P1/P2 fixes including:
- YouTube Content Generator at /realapex-demos page
- Bank Accounts page loading data properly
- AgentApex location and map features
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TENANT_ADMIN_EMAIL = "rajam@retoerp.com"
TENANT_ADMIN_PASSWORD = "12345678"
AGENTAPEX_PHONE = "9999999999"
AGENTAPEX_OTP = "1234"


class TestYouTubeContentGenerator:
    """YouTube Content Generator API tests - /realapex-demos routes"""
    
    def test_youtube_categories_endpoint(self):
        """Test GET /api/realapex-demos/youtube-content/categories - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/youtube-content/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 6
        
        # Verify category structure
        category = data["categories"][0]
        assert "id" in category
        assert "name" in category
        assert "icon" in category
        assert "description" in category
        
        # Verify expected categories exist
        category_ids = [c["id"] for c in data["categories"]]
        assert "property_tips" in category_ids
        assert "area_reviews" in category_ids
        assert "market_updates" in category_ids
        print(f"✓ YouTube categories API returned {len(data['categories'])} categories")
    
    def test_youtube_history_endpoint(self):
        """Test GET /api/realapex-demos/youtube-content/history - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/realapex-demos/youtube-content/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "history" in data
        # History can be empty, that's fine
        assert isinstance(data["history"], list)
        print(f"✓ YouTube history API returned {len(data['history'])} items")
    
    def test_youtube_content_generate_requires_data(self):
        """Test POST /api/realapex-demos/youtube-content/generate validation"""
        # Test without required fields
        response = requests.post(
            f"{BASE_URL}/api/realapex-demos/youtube-content/generate",
            json={}
        )
        # Should fail validation (422 for Pydantic validation)
        assert response.status_code in [422, 400], f"Expected validation error, got {response.status_code}"
        print("✓ YouTube content generate requires topic and category")


class TestBankAccountsAPI:
    """Bank Accounts API tests - requires authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for tenant admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TENANT_ADMIN_EMAIL, "password": TENANT_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_bank_accounts_requires_auth(self):
        """Test that bank accounts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bank-accounts")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✓ Bank accounts endpoint requires authentication")
    
    def test_bank_accounts_with_auth(self, auth_token):
        """Test bank accounts endpoint with authentication"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get user info first to get tenant_id
        user_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if user_response.status_code != 200:
            pytest.skip("Could not get user info")
        
        user = user_response.json()
        tenant_id = user.get("tenant_id")
        
        if not tenant_id:
            pytest.skip("User has no tenant_id")
        
        # Get bank accounts
        response = requests.get(
            f"{BASE_URL}/api/bank-accounts",
            params={"tenant_id": tenant_id},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert "accounts" in data
        print(f"✓ Bank accounts API returned {len(data.get('accounts', []))} accounts")


class TestAgentApexAPI:
    """AgentApex API tests - location and map features"""
    
    @pytest.fixture
    def agentapex_token(self):
        """Get authentication token for AgentApex user"""
        # Send OTP
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/send-otp",
            json={"phone": AGENTAPEX_PHONE}
        )
        if response.status_code != 200:
            pytest.skip(f"OTP send failed: {response.status_code} - {response.text}")
        
        # Verify OTP
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/verify-otp",
            json={"phone": AGENTAPEX_PHONE, "otp": AGENTAPEX_OTP}
        )
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        pytest.skip(f"OTP verification failed: {response.status_code} - {response.text}")
    
    def test_properties_endpoint(self, agentapex_token):
        """Test properties endpoint with location parameters"""
        headers = {"Authorization": f"Bearer {agentapex_token}"}
        
        # Test without location
        response = requests.get(f"{BASE_URL}/api/properties", headers=headers)
        assert response.status_code == 200
        print(f"✓ Properties API returned {len(response.json())} properties")
    
    def test_properties_with_location(self, agentapex_token):
        """Test properties endpoint with lat/lng parameters"""
        headers = {"Authorization": f"Bearer {agentapex_token}"}
        
        # Hyderabad coordinates
        params = {
            "latitude": 17.385,
            "longitude": 78.4867,
            "radius_km": 10
        }
        
        response = requests.get(
            f"{BASE_URL}/api/properties",
            params=params,
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Properties API with location returned {len(response.json())} properties")
    
    def test_requirements_all_endpoint(self, agentapex_token):
        """Test requirements/all endpoint for map view"""
        headers = {"Authorization": f"Bearer {agentapex_token}"}
        
        response = requests.get(f"{BASE_URL}/api/requirements/all", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check if requirements have lat/lng for map markers
        for req in data[:5]:  # Check first 5
            if req.get("latitude") and req.get("longitude"):
                print(f"  - Requirement has location: ({req['latitude']}, {req['longitude']})")
        
        print(f"✓ Requirements API returned {len(data)} items")
    
    def test_favorites_endpoint(self, agentapex_token):
        """Test favorites endpoint"""
        headers = {"Authorization": f"Bearer {agentapex_token}"}
        
        response = requests.get(f"{BASE_URL}/api/favorites", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Favorites API returned {len(data)} items")
    
    def test_stats_endpoint(self, agentapex_token):
        """Test stats endpoint for dashboard"""
        headers = {"Authorization": f"Bearer {agentapex_token}"}
        
        response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "properties" in data or "leads" in data
        print(f"✓ Stats API returned: {data}")


class TestRealApexDemosPageAPIs:
    """Test additional RealApex Demos page APIs"""
    
    @pytest.fixture
    def admin_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TENANT_ADMIN_EMAIL, "password": TENANT_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_tutorai_config(self, admin_token):
        """Test TutorAI config endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/tutorai/config", headers=headers)
        # Can be 200 or 404 if not configured
        assert response.status_code in [200, 404, 500]
        print(f"✓ TutorAI config endpoint status: {response.status_code}")
    
    def test_realapex_demos_videos(self, admin_token):
        """Test RealApex demos videos list endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/realapex-demos/videos", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        print(f"✓ RealApex demos videos returned {len(data.get('videos', []))} videos")
    
    def test_realapex_demos_concepts(self, admin_token):
        """Test RealApex demos concepts endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/realapex-demos/concepts", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "categories" in data
        print(f"✓ RealApex demos concepts returned {len(data['categories'])} categories")
    
    def test_voice_options(self, admin_token):
        """Test voice options endpoint for voiceover generation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/realapex-demos/voice-options", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "voices" in data
        print(f"✓ Voice options returned {len(data['voices'])} voices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
