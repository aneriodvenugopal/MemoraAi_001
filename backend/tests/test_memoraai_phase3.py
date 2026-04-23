"""
MemoraAI Phase 3 Testing - Category Dashboard Widgets, Enhanced RAG, RealApex Cleanup
Tests:
1. Category-specific dashboard stats API
2. Semantic memory search API
3. RAG context API
4. RealApex text removal verification
5. Existing MemoraAI APIs still working
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TENANT_ADMIN_PHONE = "8888888888"
TENANT_ADMIN_PASSWORD = "admin123"
TEST_CUSTOMER_PHONE = "9876543210"


class TestMemoraAIPhase3:
    """Phase 3 feature tests for MemoraAI"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TENANT_ADMIN_PHONE,
            "password": TENANT_ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Auth failed: {login_response.status_code} - {login_response.text}")
    
    # ==================== API Root Tests ====================
    
    def test_api_root_no_realapex(self):
        """Test that API root returns MemoraAI, not RealApex"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        
        # Should say MemoraAI
        assert "MemoraAI" in data.get("message", ""), f"Expected 'MemoraAI' in message, got: {data}"
        
        # Should NOT contain RealApex
        message = data.get("message", "").lower()
        assert "realapex" not in message, f"Found 'RealApex' in API root message: {data}"
    
    # ==================== Category Dashboard Stats Tests ====================
    
    def test_category_stats_endpoint_exists(self):
        """Test that category-stats endpoint exists and requires auth"""
        # Without auth should fail
        response = requests.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_category_stats_returns_widgets(self):
        """Test that category-stats returns widgets for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should have category info
        assert "category" in data, f"Missing 'category' in response: {data}"
        assert "category_name" in data, f"Missing 'category_name' in response: {data}"
        assert "widgets" in data, f"Missing 'widgets' in response: {data}"
        
        # Widgets should be a list
        assert isinstance(data["widgets"], list), f"widgets should be a list: {data}"
    
    def test_category_stats_astrology_widgets(self):
        """Test that astrology category returns correct widget labels"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats")
        assert response.status_code == 200
        
        data = response.json()
        
        # Primary category is astrology per context
        if data.get("category") == "astrology":
            widgets = data.get("widgets", [])
            widget_labels = [w.get("label") for w in widgets]
            
            # Check expected astrology widget labels
            expected_labels = ["Consultations Today", "Pending Readings", "Total Customers", "Revenue (Month)"]
            for label in expected_labels:
                assert label in widget_labels, f"Missing widget label '{label}' in {widget_labels}"
    
    def test_category_stats_widget_structure(self):
        """Test that each widget has required fields"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats")
        assert response.status_code == 200
        
        data = response.json()
        widgets = data.get("widgets", [])
        
        for widget in widgets:
            assert "key" in widget, f"Widget missing 'key': {widget}"
            assert "label" in widget, f"Widget missing 'label': {widget}"
            assert "icon" in widget, f"Widget missing 'icon': {widget}"
            assert "color" in widget, f"Widget missing 'color': {widget}"
            assert "value" in widget, f"Widget missing 'value': {widget}"
    
    def test_category_stats_summary(self):
        """Test that category-stats returns summary section"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/dashboard/category-stats")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should have summary
        assert "summary" in data, f"Missing 'summary' in response: {data}"
        summary = data["summary"]
        
        # Summary should have expected fields
        assert "total_services" in summary, f"Missing 'total_services' in summary: {summary}"
        assert "hot_sales" in summary, f"Missing 'hot_sales' in summary: {summary}"
        assert "new_alerts" in summary, f"Missing 'new_alerts' in summary: {summary}"
        assert "memories" in summary, f"Missing 'memories' in summary: {summary}"
    
    # ==================== Semantic Search Tests ====================
    
    def test_semantic_search_endpoint_exists(self):
        """Test that semantic search endpoint exists and requires auth"""
        # Without auth should fail
        response = requests.post(f"{BASE_URL}/api/memoraai/memory/search", json={"query": "test"})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_semantic_search_basic(self):
        """Test basic semantic search functionality"""
        response = self.session.post(f"{BASE_URL}/api/memoraai/memory/search", json={
            "query": "horoscope reading consultation",
            "limit": 5
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should have results array
        assert "results" in data, f"Missing 'results' in response: {data}"
        assert isinstance(data["results"], list), f"results should be a list: {data}"
        
        # Should have count
        assert "count" in data, f"Missing 'count' in response: {data}"
        
        # Should echo query
        assert "query" in data, f"Missing 'query' in response: {data}"
    
    def test_semantic_search_with_phone_filter(self):
        """Test semantic search with phone filter"""
        response = self.session.post(f"{BASE_URL}/api/memoraai/memory/search", json={
            "query": "consultation",
            "phone": TEST_CUSTOMER_PHONE,
            "limit": 3
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "results" in data
    
    def test_semantic_search_empty_query(self):
        """Test semantic search with empty query returns empty results"""
        response = self.session.post(f"{BASE_URL}/api/memoraai/memory/search", json={
            "query": "",
            "limit": 5
        })
        assert response.status_code == 200
        
        data = response.json()
        # Empty query should return empty results or message
        assert "results" in data
        assert len(data["results"]) == 0 or "message" in data
    
    # ==================== RAG Context Tests ====================
    
    def test_rag_context_endpoint_exists(self):
        """Test that RAG context endpoint exists and requires auth"""
        # Without auth should fail
        response = requests.get(f"{BASE_URL}/api/memoraai/memory/customer/{TEST_CUSTOMER_PHONE}/rag-context")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_rag_context_basic(self):
        """Test basic RAG context retrieval"""
        response = self.session.get(
            f"{BASE_URL}/api/memoraai/memory/customer/{TEST_CUSTOMER_PHONE}/rag-context",
            params={"message": "I want to book a consultation"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should have rag_context
        assert "rag_context" in data, f"Missing 'rag_context' in response: {data}"
        assert isinstance(data["rag_context"], str), f"rag_context should be string: {data}"
        
        # Should have phone
        assert "phone" in data, f"Missing 'phone' in response: {data}"
        assert data["phone"] == TEST_CUSTOMER_PHONE
    
    def test_rag_context_new_customer(self):
        """Test RAG context for new customer returns appropriate message"""
        new_phone = "1111111111"
        response = self.session.get(
            f"{BASE_URL}/api/memoraai/memory/customer/{new_phone}/rag-context",
            params={"message": "Hello"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # New customer should get "New customer" message or empty context
        assert "rag_context" in data
    
    # ==================== Existing MemoraAI APIs Still Working ====================
    
    def test_categories_available(self):
        """Test that categories/available endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/categories/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "categories" in data, f"Missing 'categories' in response: {data}"
        assert len(data["categories"]) > 0, "Should have at least one category"
    
    def test_categories_my(self):
        """Test that categories/my endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/categories/my")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "selected_categories" in data or "categories" in data, f"Missing categories in response: {data}"
    
    def test_services_list(self):
        """Test that services endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "services" in data, f"Missing 'services' in response: {data}"
    
    def test_hot_sales_list(self):
        """Test that hot sales endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/sales/hot")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "hot_sales" in data, f"Missing 'hot_sales' in response: {data}"
    
    def test_hot_sales_stats(self):
        """Test that hot sales stats endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/sales/hot/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sales_alerts(self):
        """Test that sales alerts endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/sales/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_waba_config(self):
        """Test that WABA config endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/waba/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_memory_stats(self):
        """Test that memory stats endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/memory/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_memories" in data, f"Missing 'total_memories' in response: {data}"
    
    def test_customer_memory(self):
        """Test that customer memory endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/memoraai/memory/customer/{TEST_CUSTOMER_PHONE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "memories" in data, f"Missing 'memories' in response: {data}"
        assert "context" in data, f"Missing 'context' in response: {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
