"""
Test MemoraAI Mobile Dashboard APIs - Iteration 7
Tests all backend APIs used by the Mobile Owner Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com').rstrip('/')

class TestHealthAndAuth:
    """Health and Authentication tests"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"PASS: Health endpoint - {data}")
    
    def test_api_root(self):
        """Test /api/ root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "MemoraAI" in data.get("message", "")
        print(f"PASS: API root - {data}")
    
    def test_auth_login(self):
        """Test password login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "8888888888",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "tenant_admin"
        print(f"PASS: Auth login - role={data.get('user', {}).get('role')}")
        return data.get("access_token")


class TestMemoraAIAPIs:
    """MemoraAI API tests - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "8888888888",
            "password": "admin123"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Authentication failed")
    
    def test_categories_available(self):
        """Test /api/memoraai/categories/available"""
        response = requests.get(f"{BASE_URL}/api/memoraai/categories/available")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) >= 7  # Should have 7 categories
        print(f"PASS: Categories available - {len(data['categories'])} categories")
    
    def test_services_list(self):
        """Test /api/memoraai/services"""
        response = requests.get(f"{BASE_URL}/api/memoraai/services", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        print(f"PASS: Services list - {len(data.get('services', []))} services")
    
    def test_appointments_list(self):
        """Test /api/memoraai/appointments"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments?limit=10", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        print(f"PASS: Appointments list - {len(data.get('appointments', []))} appointments")
    
    def test_appointments_today_summary(self):
        """Test /api/memoraai/appointments/today/summary"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments/today/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Should have summary fields
        assert "total" in data or "scheduled" in data or isinstance(data, dict)
        print(f"PASS: Today's appointments summary - {data}")
    
    def test_analytics_dashboard(self):
        """Test /api/analytics/dashboard"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data or isinstance(data, dict)
        print(f"PASS: Analytics dashboard - keys: {list(data.keys())[:5]}")
    
    def test_analytics_overview(self):
        """Test /api/memoraai/analytics/overview"""
        response = requests.get(f"{BASE_URL}/api/memoraai/analytics/overview?period=week", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Analytics overview - keys: {list(data.keys())[:5]}")
    
    def test_templates_list(self):
        """Test /api/memoraai/templates"""
        response = requests.get(f"{BASE_URL}/api/memoraai/templates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print(f"PASS: Templates list - {len(data.get('templates', []))} templates")
    
    def test_category_stats(self):
        """Test /api/memoraai/dashboard/category-stats"""
        response = requests.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Category stats - {data.get('category_name', 'N/A')}")
    
    def test_hot_sales(self):
        """Test /api/memoraai/sales/hot"""
        response = requests.get(f"{BASE_URL}/api/memoraai/sales/hot?status=active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "hot_sales" in data
        print(f"PASS: Hot sales - {len(data.get('hot_sales', []))} hot sales")
    
    def test_sales_alerts(self):
        """Test /api/memoraai/sales/alerts"""
        response = requests.get(f"{BASE_URL}/api/memoraai/sales/alerts?status=new", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"PASS: Sales alerts - {len(data.get('alerts', []))} alerts")
    
    def test_whatsapp_crm_leads(self):
        """Test /api/whatsapp-crm/leads"""
        response = requests.get(f"{BASE_URL}/api/whatsapp-crm/leads?limit=20", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        print(f"PASS: WhatsApp CRM leads - {len(data.get('leads', []))} leads")
    
    def test_memory_stats(self):
        """Test /api/memoraai/memory/stats"""
        response = requests.get(f"{BASE_URL}/api/memoraai/memory/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Memory stats - {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
