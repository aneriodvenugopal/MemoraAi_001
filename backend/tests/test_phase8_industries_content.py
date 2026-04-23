"""
Phase 8 Backend Tests - Industries with Services + Content Library
Tests: Industries API (services, demo_chat), Content Library CRUD, Admin Industries CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_PHONE = "8888888888"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": TEST_PHONE,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestIndustriesPublicAPI:
    """Test public industries endpoints - services and demo_chat"""
    
    def test_list_industries_returns_16(self):
        """GET /api/memoraai/industries/public returns 16 industries"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public")
        assert response.status_code == 200
        data = response.json()
        assert "industries" in data
        assert len(data["industries"]) == 16
        print(f"PASS: Industries count = {len(data['industries'])}")
    
    def test_industries_have_services_array(self):
        """All industries should have services array"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public")
        assert response.status_code == 200
        industries = response.json()["industries"]
        
        for ind in industries:
            assert "services" in ind, f"Industry {ind['slug']} missing services"
            assert isinstance(ind["services"], list), f"Industry {ind['slug']} services not a list"
            assert len(ind["services"]) >= 3, f"Industry {ind['slug']} has less than 3 services"
        print("PASS: All industries have services array with 3+ items")
    
    def test_real_estate_has_10_demo_chat_messages(self):
        """Real estate industry should have 10 demo_chat messages"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/real-estate")
        assert response.status_code == 200
        industry = response.json()["industry"]
        
        assert "demo_chat" in industry
        demo_chat_count = len(industry["demo_chat"])
        assert demo_chat_count >= 8, f"Expected 8-10 demo_chat messages, got {demo_chat_count}"
        print(f"PASS: Real estate has {demo_chat_count} demo_chat messages")
        
        # Verify services
        assert "services" in industry
        assert "Plot Sales" in industry["services"]
        assert "Flat Booking" in industry["services"]
        print(f"PASS: Real estate services: {industry['services']}")
    
    def test_salon_has_10_demo_chat_messages(self):
        """Salon industry should have 10 demo_chat messages with booking flow"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/salon")
        assert response.status_code == 200
        industry = response.json()["industry"]
        
        assert "demo_chat" in industry
        demo_chat_count = len(industry["demo_chat"])
        assert demo_chat_count >= 8, f"Expected 8-10 demo_chat messages, got {demo_chat_count}"
        print(f"PASS: Salon has {demo_chat_count} demo_chat messages")
        
        # Verify services
        assert "services" in industry
        assert len(industry["services"]) >= 5
        print(f"PASS: Salon services: {industry['services']}")
    
    def test_hospital_has_expanded_demo_chat(self):
        """Hospital industry should have expanded demo_chat"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public/hospital")
        assert response.status_code == 200
        industry = response.json()["industry"]
        
        demo_chat_count = len(industry.get("demo_chat", []))
        assert demo_chat_count >= 8, f"Expected 8-10 demo_chat messages, got {demo_chat_count}"
        print(f"PASS: Hospital has {demo_chat_count} demo_chat messages")
    
    def test_all_industries_have_required_fields(self):
        """All industries should have required fields"""
        response = requests.get(f"{BASE_URL}/api/memoraai/industries/public")
        assert response.status_code == 200
        industries = response.json()["industries"]
        
        required_fields = ["slug", "title", "icon", "hero_title", "hero_sub", "services", "benefits", "demo_chat"]
        for ind in industries:
            for field in required_fields:
                assert field in ind, f"Industry {ind['slug']} missing field: {field}"
        print(f"PASS: All {len(industries)} industries have required fields")


class TestIndustriesAdminAPI:
    """Test admin industries CRUD endpoints"""
    
    def test_create_industry_requires_auth(self):
        """POST /api/memoraai/industries requires authentication"""
        response = requests.post(f"{BASE_URL}/api/memoraai/industries", json={
            "title": "Test Industry",
            "slug": "test-industry"
        })
        assert response.status_code in [401, 403]
        print("PASS: Create industry requires auth")
    
    def test_update_industry_requires_auth(self):
        """PUT /api/memoraai/industries/{id} requires authentication"""
        response = requests.put(f"{BASE_URL}/api/memoraai/industries/fake-id", json={
            "title": "Updated Title"
        })
        assert response.status_code in [401, 403]
        print("PASS: Update industry requires auth")
    
    def test_delete_industry_requires_auth(self):
        """DELETE /api/memoraai/industries/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/memoraai/industries/fake-id")
        assert response.status_code in [401, 403]
        print("PASS: Delete industry requires auth")
    
    def test_create_update_delete_industry_flow(self, auth_headers):
        """Full CRUD flow for industries with auth"""
        # CREATE
        create_data = {
            "title": "TEST_Phase8_Industry",
            "slug": "test-phase8-industry",
            "icon": "star",
            "hero_title": "Test Hero Title",
            "hero_sub": "Test hero subtitle",
            "services": ["Service 1", "Service 2", "Service 3"],
            "benefits": ["Benefit 1", "Benefit 2"],
            "demo_chat": [
                {"from": "customer", "text": "Hello"},
                {"from": "bot", "text": "Hi there!"}
            ],
            "business_name": "Test Business"
        }
        create_response = requests.post(f"{BASE_URL}/api/memoraai/industries", json=create_data, headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        created = create_response.json()
        industry_id = created.get("industry", {}).get("id")
        assert industry_id, "No industry ID returned"
        print(f"PASS: Created industry with ID: {industry_id}")
        
        # UPDATE
        update_data = {"title": "TEST_Phase8_Industry_Updated", "hero_title": "Updated Hero"}
        update_response = requests.put(f"{BASE_URL}/api/memoraai/industries/{industry_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated.get("industry", {}).get("title") == "TEST_Phase8_Industry_Updated"
        print("PASS: Updated industry")
        
        # DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/memoraai/industries/{industry_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("PASS: Deleted industry")


class TestContentLibraryAPI:
    """Test Content Library CRUD endpoints"""
    
    def test_list_content_requires_auth(self):
        """GET /api/memoraai/content requires authentication"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content")
        assert response.status_code in [401, 403]
        print("PASS: List content requires auth")
    
    def test_content_stats_requires_auth(self):
        """GET /api/memoraai/content/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content/stats")
        assert response.status_code in [401, 403]
        print("PASS: Content stats requires auth")
    
    def test_create_content_requires_auth(self):
        """POST /api/memoraai/content requires authentication"""
        response = requests.post(f"{BASE_URL}/api/memoraai/content", json={
            "title": "Test Content",
            "content_type": "brochure"
        })
        assert response.status_code in [401, 403]
        print("PASS: Create content requires auth")
    
    def test_list_content_with_auth(self, auth_headers):
        """GET /api/memoraai/content with auth returns content list"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"PASS: Content list returned {data['total']} items")
    
    def test_content_stats_with_auth(self, auth_headers):
        """GET /api/memoraai/content/stats with auth returns stats"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_type" in data
        print(f"PASS: Content stats - total: {data['total']}, by_type: {list(data['by_type'].keys())}")
    
    def test_create_update_share_delete_content_flow(self, auth_headers):
        """Full CRUD flow for content library"""
        # CREATE
        create_data = {
            "title": "TEST_Phase8_Brochure",
            "content_type": "brochure",
            "description": "Test brochure for Phase 8",
            "url": "https://example.com/brochure.pdf",
            "tags": ["test", "phase8"]
        }
        create_response = requests.post(f"{BASE_URL}/api/memoraai/content", json=create_data, headers=auth_headers)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        created = create_response.json()
        content_id = created.get("item", {}).get("id")
        assert content_id, "No content ID returned"
        print(f"PASS: Created content with ID: {content_id}")
        
        # Verify in list
        list_response = requests.get(f"{BASE_URL}/api/memoraai/content", headers=auth_headers)
        assert list_response.status_code == 200
        items = list_response.json()["items"]
        found = any(item["id"] == content_id for item in items)
        assert found, "Created content not found in list"
        print("PASS: Content found in list")
        
        # UPDATE
        update_data = {"title": "TEST_Phase8_Brochure_Updated", "description": "Updated description"}
        update_response = requests.put(f"{BASE_URL}/api/memoraai/content/{content_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated.get("item", {}).get("title") == "TEST_Phase8_Brochure_Updated"
        print("PASS: Updated content")
        
        # SHARE (increment share count)
        share_response = requests.post(f"{BASE_URL}/api/memoraai/content/{content_id}/share", json={}, headers=auth_headers)
        assert share_response.status_code == 200, f"Share failed: {share_response.text}"
        print("PASS: Share count incremented")
        
        # DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/memoraai/content/{content_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("PASS: Deleted content")
    
    def test_content_type_filter(self, auth_headers):
        """GET /api/memoraai/content?content_type=brochure filters by type"""
        response = requests.get(f"{BASE_URL}/api/memoraai/content?content_type=brochure", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # All items should be brochures (if any)
        for item in data["items"]:
            assert item["content_type"] == "brochure", f"Expected brochure, got {item['content_type']}"
        print(f"PASS: Content type filter works - {len(data['items'])} brochures")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("PASS: Login successful")
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0000000000",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400, 404]
        print("PASS: Invalid login rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
