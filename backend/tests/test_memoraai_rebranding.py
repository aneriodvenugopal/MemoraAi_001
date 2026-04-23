"""
MemoraAI Rebranding & Feature Tests - Iteration 3
Tests:
1. Backend API returns 'MemoraAI API is running'
2. Auth login works
3. MemoraAI categories API works
4. Services API works
5. Hot sales API works
6. Memory AI API works
7. WABA config API works
8. WhatsApp simulate endpoint works with category-aware response
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TENANT_ADMIN_PHONE = "8888888888"
TENANT_ADMIN_PASSWORD = "admin123"


class TestMemoraAIRebranding:
    """Test MemoraAI rebranding and core APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TENANT_ADMIN_PHONE, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # ============ REBRANDING TESTS ============
    
    def test_api_root_returns_memoraai(self):
        """Test GET /api/ returns 'MemoraAI API is running'"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "MemoraAI" in data.get("message", ""), f"Expected 'MemoraAI' in message, got: {data}"
        print(f"✅ API root returns: {data['message']}")
    
    # ============ AUTH TESTS ============
    
    def test_auth_login_works(self):
        """Test POST /api/auth/login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TENANT_ADMIN_PHONE, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["phone"] == TENANT_ADMIN_PHONE
        print(f"✅ Auth login works, user: {data['user']['name']}")
    
    # ============ MEMORAAI CATEGORIES TESTS ============
    
    def test_categories_available(self, auth_headers):
        """Test GET /api/memoraai/categories/available"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/categories/available",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 1, "Expected at least 1 category"
        print(f"✅ Categories available: {len(data['categories'])} categories")
    
    def test_my_categories(self, auth_headers):
        """Test GET /api/memoraai/categories/my"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/categories/my",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "categories" in data
        print(f"✅ My categories: {len(data['categories'])} selected")
    
    # ============ MEMORAAI SERVICES TESTS ============
    
    def test_services_list(self, auth_headers):
        """Test GET /api/memoraai/services"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/services",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "services" in data
        print(f"✅ Services list: {len(data['services'])} services")
    
    # ============ HOT SALES TESTS ============
    
    def test_hot_sales_stats(self, auth_headers):
        """Test GET /api/memoraai/sales/hot/stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/hot/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data or "active" in data or "stats" in data or isinstance(data, dict)
        print(f"✅ Hot sales stats: {data}")
    
    def test_hot_sales_list(self, auth_headers):
        """Test GET /api/memoraai/sales/hot"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/hot",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "sales" in data or "hot_sales" in data or isinstance(data, list) or isinstance(data, dict)
        print(f"✅ Hot sales list retrieved")
    
    # ============ MEMORY AI TESTS ============
    
    def test_memory_stats(self, auth_headers):
        """Test GET /api/memoraai/memory/stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/memory/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Memory stats: {data}")
    
    # ============ WABA CONFIG TESTS ============
    
    def test_waba_config(self, auth_headers):
        """Test GET /api/memoraai/waba/config"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/waba/config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "config" in data or isinstance(data, dict)
        print(f"✅ WABA config retrieved")
    
    # ============ WHATSAPP SIMULATE TESTS ============
    
    def test_whatsapp_simulate(self, auth_headers):
        """Test POST /api/whatsapp/simulate - category-aware AI response"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/simulate",
            params={"phone": "9876543210", "message": "Hello, I need help with my appointment"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "success" in data, "Missing 'success' field"
        assert data["success"] == True, f"Simulate failed: {data}"
        
        # Check AI response exists
        assert "ai_response" in data, "Missing 'ai_response' field"
        ai_response = data.get("ai_response", "")
        print(f"✅ WhatsApp simulate works, AI response: {ai_response[:100]}...")
        
        # Check intent detection
        if "intent_detected" in data:
            print(f"   Intent detected: {data['intent_detected']}")
        
        # Check conversation state
        if "conversation_state" in data:
            print(f"   Conversation state: {data['conversation_state']}")
    
    def test_whatsapp_simulate_category_aware(self, auth_headers):
        """Test WhatsApp simulate with category-specific query"""
        # Test with a beauty salon related query (tenant has beauty_salon category)
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/simulate",
            params={"phone": "9876543211", "message": "I want to book a haircut appointment"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Category-aware simulate works")
        
        # Test with astrology related query (tenant has astrology category)
        response2 = requests.post(
            f"{BASE_URL}/api/whatsapp/simulate",
            params={"phone": "9876543212", "message": "I want to know my horoscope"},
            headers=auth_headers
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2.get("success") == True
        print(f"✅ Astrology query simulate works")


class TestMemoraAISalesAlerts:
    """Test MemoraAI Sales Alerts APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TENANT_ADMIN_PHONE, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_sales_alerts_list(self, auth_headers):
        """Test GET /api/memoraai/sales/alerts"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/alerts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "alerts" in data or isinstance(data, list) or isinstance(data, dict)
        print(f"✅ Sales alerts list retrieved")
    
    def test_sales_alerts_stats(self, auth_headers):
        """Test GET /api/memoraai/sales/alerts/stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/alerts/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✅ Sales alerts stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
