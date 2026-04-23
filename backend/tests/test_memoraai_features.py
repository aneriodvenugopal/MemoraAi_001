"""
MemoraAI Features Test Suite - Iteration 2
Tests all new MemoraAI endpoints:
- Categories & Services
- Hot Sales Mode
- Sales Alerts
- WABA Setup
- Memory AI
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials from test_credentials.md
TEST_PHONE = "8888888888"
TEST_PASSWORD = "admin123"


class TestMemoraAIAuth:
    """Authentication tests for MemoraAI"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful, user role: {data['user'].get('role')}")


class TestMemoraAICategories:
    """Category Management Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_available_categories(self):
        """GET /api/memoraai/categories/available - should return 7 categories"""
        response = requests.get(f"{BASE_URL}/api/memoraai/categories/available")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) == 7, f"Expected 7 categories, got {len(categories)}"
        
        # Verify all expected categories exist
        expected_slugs = ["real_estate", "astrology", "doctor_clinic", "function_hall", 
                         "pesticides_fertilizer", "beauty_salon", "coaching_center"]
        actual_slugs = [c["slug"] for c in categories]
        for slug in expected_slugs:
            assert slug in actual_slugs, f"Missing category: {slug}"
        
        print(f"✓ Found all 7 categories: {actual_slugs}")
    
    def test_select_beauty_salon_category(self, headers):
        """POST /api/memoraai/categories/select - select beauty_salon category"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/categories/select",
            json={"category_slug": "beauty_salon"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        # Either newly selected or already selected
        assert "beauty_salon" in data.get("message", "").lower() or "category" in data.get("message", "").lower()
        print(f"✓ Category selection response: {data['message']}")
    
    def test_get_my_categories(self, headers):
        """GET /api/memoraai/categories/my - should return categories for tenant"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/categories/my",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        assert len(categories) > 0, "No categories found for tenant"
        
        # Verify beauty_salon is in the list
        slugs = [c["category_slug"] for c in categories]
        assert "beauty_salon" in slugs, f"beauty_salon not in tenant categories: {slugs}"
        print(f"✓ Tenant has {len(categories)} categories: {slugs}")


class TestMemoraAIServices:
    """Services CRUD Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    created_service_id = None
    
    def test_get_services(self, headers):
        """GET /api/memoraai/services - should return auto-populated services"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/services?active_only=false",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "services" in data
        assert "count" in data
        services = data["services"]
        assert len(services) > 0, "No services found"
        print(f"✓ Found {len(services)} services")
    
    def test_create_custom_service(self, headers):
        """POST /api/memoraai/services - create a custom service"""
        service_data = {
            "name": "TEST_Custom Facial Treatment",
            "category_slug": "beauty_salon",
            "description": "Premium facial treatment for testing",
            "duration_mins": 60,
            "price": 1500,
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/memoraai/services",
            json=service_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "service" in data
        service = data["service"]
        assert service["name"] == service_data["name"]
        assert service["price"] == service_data["price"]
        TestMemoraAIServices.created_service_id = service["id"]
        print(f"✓ Created service: {service['name']} (ID: {service['id']})")
    
    def test_update_service(self, headers):
        """PUT /api/memoraai/services/{id} - update a service"""
        if not TestMemoraAIServices.created_service_id:
            pytest.skip("No service created to update")
        
        update_data = {
            "name": "TEST_Updated Facial Treatment",
            "price": 1800
        }
        response = requests.put(
            f"{BASE_URL}/api/memoraai/services/{TestMemoraAIServices.created_service_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "service" in data
        assert data["service"]["name"] == update_data["name"]
        assert data["service"]["price"] == update_data["price"]
        print(f"✓ Updated service: {data['service']['name']}")
    
    def test_toggle_service(self, headers):
        """POST /api/memoraai/services/{id}/toggle - toggle service active state"""
        if not TestMemoraAIServices.created_service_id:
            pytest.skip("No service created to toggle")
        
        response = requests.post(
            f"{BASE_URL}/api/memoraai/services/{TestMemoraAIServices.created_service_id}/toggle",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "is_active" in data
        print(f"✓ Toggled service, is_active: {data['is_active']}")


class TestMemoraAIHotSales:
    """Hot Sales Mode Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    created_sale_id = None
    
    def test_create_hot_sale(self, headers):
        """POST /api/memoraai/sales/hot - create hot sale entry"""
        sale_data = {
            "customer_phone": "9876543210",
            "customer_name": "TEST_Hot Lead Customer",
            "service_name": "Bridal Makeup",
            "notes": "Interested in wedding package",
            "priority": "urgent",
            "amount": 25000
        }
        response = requests.post(
            f"{BASE_URL}/api/memoraai/sales/hot",
            json=sale_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "hot_sale" in data
        sale = data["hot_sale"]
        assert sale["customer_phone"] == sale_data["customer_phone"]
        assert sale["priority"] == "urgent"
        TestMemoraAIHotSales.created_sale_id = sale["id"]
        print(f"✓ Created hot sale: {sale['customer_name']} (ID: {sale['id']})")
    
    def test_list_hot_sales(self, headers):
        """GET /api/memoraai/sales/hot - list hot sales"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/hot?status=all",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "hot_sales" in data
        assert "count" in data
        print(f"✓ Found {data['count']} hot sales")
    
    def test_hot_sales_stats(self, headers):
        """GET /api/memoraai/sales/hot/stats - get hot sales stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/hot/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "active" in data
        assert "converted" in data
        assert "urgent" in data
        assert "total" in data
        print(f"✓ Hot sales stats: active={data['active']}, urgent={data['urgent']}, converted={data['converted']}")


class TestMemoraAISalesAlerts:
    """Sales Alerts Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_list_sales_alerts(self, headers):
        """GET /api/memoraai/sales/alerts - list sales alerts"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/alerts?status=all",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "alerts" in data
        assert "count" in data
        print(f"✓ Found {data['count']} sales alerts")
    
    def test_alert_stats(self, headers):
        """GET /api/memoraai/sales/alerts/stats - get alert stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/sales/alerts/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "new" in data
        assert "acknowledged" in data
        assert "actioned" in data
        assert "total" in data
        print(f"✓ Alert stats: new={data['new']}, acknowledged={data['acknowledged']}, actioned={data['actioned']}")


class TestMemoraAIWABA:
    """WABA Setup Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_waba_config(self, headers):
        """GET /api/memoraai/waba/config - get WABA config"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/waba/config",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Config may or may not exist
        assert "config" in data or "message" in data
        print(f"✓ WABA config response: {data.get('message', 'Config exists')}")
    
    def test_save_waba_config(self, headers):
        """POST /api/memoraai/waba/config - save WABA config"""
        config_data = {
            "business_name": "TEST_Beauty Salon",
            "business_description": "Premium beauty services",
            "greeting_message": "Welcome to our salon! How can we help you today?",
            "ai_persona": "Friendly beauty consultant"
        }
        response = requests.post(
            f"{BASE_URL}/api/memoraai/waba/config",
            json=config_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "config" in data
        print(f"✓ WABA config saved: {data['message']}")
    
    def test_generate_templates(self, headers):
        """POST /api/memoraai/waba/generate-templates - generate templates"""
        response = requests.post(
            f"{BASE_URL}/api/memoraai/waba/generate-templates",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "templates" in data
        assert "count" in data
        templates = data["templates"]
        assert len(templates) > 0, "No templates generated"
        print(f"✓ Generated {len(templates)} templates: {[t['name'] for t in templates]}")


class TestMemoraAIMemory:
    """Memory AI Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    test_phone = "9876543210"
    
    def test_add_customer_memory(self, headers):
        """POST /api/memoraai/memory/customer/{phone}/add - add customer memory"""
        memory_data = {
            "memory_type": "preference",
            "content": "Customer prefers organic products and natural treatments",
            "metadata": {"source": "test"}
        }
        response = requests.post(
            f"{BASE_URL}/api/memoraai/memory/customer/{self.test_phone}/add",
            json=memory_data,
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "memory" in data
        memory = data["memory"]
        assert memory["memory_type"] == "preference"
        print(f"✓ Added memory: {memory['content'][:50]}...")
    
    def test_get_customer_memories(self, headers):
        """GET /api/memoraai/memory/customer/{phone} - get customer memories"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/memory/customer/{self.test_phone}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "memories" in data
        assert "context" in data
        assert "count" in data
        print(f"✓ Found {data['count']} memories for customer")
    
    def test_memory_stats(self, headers):
        """GET /api/memoraai/memory/stats - get memory stats"""
        response = requests.get(
            f"{BASE_URL}/api/memoraai/memory/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_memories" in data
        assert "by_type" in data
        assert "unique_customers" in data
        print(f"✓ Memory stats: total={data['total_memories']}, customers={data['unique_customers']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_cleanup_test_service(self, headers):
        """Delete test service if created"""
        if TestMemoraAIServices.created_service_id:
            response = requests.delete(
                f"{BASE_URL}/api/memoraai/services/{TestMemoraAIServices.created_service_id}",
                headers=headers
            )
            # May already be deleted or not found
            print(f"✓ Cleanup: service delete status {response.status_code}")
    
    def test_cleanup_test_hot_sale(self, headers):
        """Delete test hot sale if created"""
        if TestMemoraAIHotSales.created_sale_id:
            response = requests.delete(
                f"{BASE_URL}/api/memoraai/sales/hot/{TestMemoraAIHotSales.created_sale_id}",
                headers=headers
            )
            print(f"✓ Cleanup: hot sale delete status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
