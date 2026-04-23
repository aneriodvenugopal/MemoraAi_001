"""
Test Suite for Project Landing Pages (P5)
Tests public project pages accessible at /p/{project_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"
TEST_TENANT_ID = "f18f7bd6-3a1f-472d-acf9-c2fb181787e7"


class TestProjectPublicAPI:
    """Tests for GET /api/public/project/{project_id}"""
    
    def test_get_project_landing_page_success(self):
        """Test successful retrieval of project landing page data"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Verify project data structure
        assert "project" in data, "Response should contain project"
        project = data["project"]
        assert project.get("id") == TEST_PROJECT_ID, "Project ID should match"
        assert "name" in project, "Project should have name"
        assert "description" in project, "Project should have description"
        assert "location" in project or "city" in project, "Project should have location"
        
        print(f"✅ Project name: {project.get('name')}")
        print(f"✅ Project location: {project.get('location')}")
    
    def test_project_has_tenant_info(self):
        """Test that project response includes tenant information"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "tenant" in data, "Response should contain tenant info"
        tenant = data["tenant"]
        assert tenant.get("id") == TEST_TENANT_ID, "Tenant ID should match"
        assert "company_name" in tenant, "Tenant should have company_name"
        
        print(f"✅ Tenant company: {tenant.get('company_name')}")
    
    def test_project_has_properties(self):
        """Test that project response includes properties list"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "properties" in data, "Response should contain properties"
        properties = data["properties"]
        assert isinstance(properties, list), "Properties should be a list"
        
        print(f"✅ Total properties: {len(properties)}")
        
        # Check property structure if properties exist
        if len(properties) > 0:
            prop = properties[0]
            assert "id" in prop, "Property should have id"
            assert "project_id" in prop, "Property should have project_id"
            assert prop["project_id"] == TEST_PROJECT_ID, "Property project_id should match"
    
    def test_project_has_statistics(self):
        """Test that project response includes statistics"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "statistics" in data, "Response should contain statistics"
        stats = data["statistics"]
        
        assert "total_properties" in stats, "Stats should have total_properties"
        assert "available" in stats, "Stats should have available count"
        assert "booked" in stats, "Stats should have booked count"
        assert "sold" in stats, "Stats should have sold count"
        
        print(f"✅ Statistics: Total={stats.get('total_properties')}, Available={stats.get('available')}")
    
    def test_project_has_price_range(self):
        """Test that project response includes price range"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "price_range" in data, "Response should contain price_range"
        price_range = data["price_range"]
        
        assert "min" in price_range, "Price range should have min"
        assert "max" in price_range, "Price range should have max"
        
        print(f"✅ Price range: ₹{price_range.get('min')} - ₹{price_range.get('max')}")
    
    def test_project_has_properties_by_status(self):
        """Test that project response includes properties grouped by status"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "properties_by_status" in data, "Response should contain properties_by_status"
        by_status = data["properties_by_status"]
        
        assert "available" in by_status, "Should have available properties list"
        assert "booked" in by_status, "Should have booked properties list"
        assert "sold" in by_status, "Should have sold properties list"
        
        print(f"✅ Properties by status: Available={len(by_status.get('available', []))}")
    
    def test_project_not_found(self):
        """Test 404 response for non-existent project"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/public/project/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Returns 404 for non-existent project")
    
    def test_project_has_amenities(self):
        """Test that project includes amenities"""
        response = requests.get(f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        project = data.get("project", {})
        amenities = project.get("amenities", [])
        
        assert isinstance(amenities, list), "Amenities should be a list"
        print(f"✅ Amenities: {amenities}")


class TestTenantPublicAPI:
    """Tests for GET /api/public/tenant/{tenant_id}"""
    
    def test_get_tenant_landing_page_success(self):
        """Test successful retrieval of tenant landing page data"""
        response = requests.get(f"{BASE_URL}/api/public/tenant/{TEST_TENANT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Verify tenant data structure
        assert "tenant" in data, "Response should contain tenant"
        tenant = data["tenant"]
        assert tenant.get("id") == TEST_TENANT_ID, "Tenant ID should match"
        assert "company_name" in tenant, "Tenant should have company_name"
        
        print(f"✅ Tenant: {tenant.get('company_name')}")
    
    def test_tenant_has_projects(self):
        """Test that tenant response includes projects list"""
        response = requests.get(f"{BASE_URL}/api/public/tenant/{TEST_TENANT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "projects" in data, "Response should contain projects"
        projects = data["projects"]
        assert isinstance(projects, list), "Projects should be a list"
        assert len(projects) > 0, "Tenant should have at least one project"
        
        print(f"✅ Total projects: {len(projects)}")
        
        # Check project structure
        project = projects[0]
        assert "id" in project, "Project should have id"
        assert "name" in project, "Project should have name"
        assert "property_count" in project, "Project should have property_count"
        assert "available_count" in project, "Project should have available_count"
    
    def test_tenant_has_statistics(self):
        """Test that tenant response includes statistics"""
        response = requests.get(f"{BASE_URL}/api/public/tenant/{TEST_TENANT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "statistics" in data, "Response should contain statistics"
        stats = data["statistics"]
        
        assert "total_projects" in stats, "Stats should have total_projects"
        assert "total_properties" in stats, "Stats should have total_properties"
        
        print(f"✅ Tenant stats: Projects={stats.get('total_projects')}, Properties={stats.get('total_properties')}")
    
    def test_tenant_not_found(self):
        """Test 404 response for non-existent tenant"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/public/tenant/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Returns 404 for non-existent tenant")


class TestContactInquiryAPI:
    """Tests for POST /api/public/contact-inquiry"""
    
    def test_submit_inquiry_success(self):
        """Test successful inquiry submission"""
        inquiry_data = {
            "name": "TEST_Playwright User",
            "email": "test_playwright@example.com",
            "phone": "+91 9876543210",
            "subject": "Project Inquiry: Test Project",
            "message": "I am interested in this project - automated test",
            "tenant_id": TEST_TENANT_ID,
            "project_id": TEST_PROJECT_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/contact-inquiry",
            json=inquiry_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "inquiry_id" in data, "Response should contain inquiry_id"
        assert "message" in data, "Response should contain message"
        
        print(f"✅ Inquiry submitted: {data.get('inquiry_id')}")
    
    def test_submit_inquiry_without_project(self):
        """Test inquiry submission without project_id"""
        inquiry_data = {
            "name": "TEST_General User",
            "email": "test_general@example.com",
            "subject": "General Inquiry",
            "message": "General inquiry without project",
            "tenant_id": TEST_TENANT_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/contact-inquiry",
            json=inquiry_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Inquiry without project_id accepted")
    
    def test_submit_inquiry_missing_required_fields(self):
        """Test inquiry submission with missing required fields"""
        inquiry_data = {
            "name": "Test User"
            # Missing email, subject, message
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/contact-inquiry",
            json=inquiry_data
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✅ Returns 422 for missing required fields")


class TestPublicPagesNoAuth:
    """Tests to verify public pages don't require authentication"""
    
    def test_project_page_no_auth_required(self):
        """Test that project page is accessible without auth"""
        response = requests.get(
            f"{BASE_URL}/api/public/project/{TEST_PROJECT_ID}",
            headers={}  # No auth headers
        )
        
        assert response.status_code == 200, "Project page should be accessible without auth"
        print("✅ Project page accessible without authentication")
    
    def test_tenant_page_no_auth_required(self):
        """Test that tenant page is accessible without auth"""
        response = requests.get(
            f"{BASE_URL}/api/public/tenant/{TEST_TENANT_ID}",
            headers={}  # No auth headers
        )
        
        assert response.status_code == 200, "Tenant page should be accessible without auth"
        print("✅ Tenant page accessible without authentication")
    
    def test_contact_inquiry_no_auth_required(self):
        """Test that contact inquiry is accessible without auth"""
        inquiry_data = {
            "name": "TEST_NoAuth User",
            "email": "test_noauth@example.com",
            "subject": "No Auth Test",
            "message": "Testing without authentication"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/contact-inquiry",
            json=inquiry_data,
            headers={}  # No auth headers
        )
        
        assert response.status_code == 200, "Contact inquiry should work without auth"
        print("✅ Contact inquiry works without authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
