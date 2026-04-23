"""
Block Location Editor API Tests
Tests for the block-wise location editor feature for certified property pages
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"

# Test project - Oberoi Plaza Pune
TEST_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"

# Test properties in different blocks
TEST_PROPERTY_BLOCK_A = "e5e7c88d-c8f1-47bb-b5c8-428636ca03ca"  # G-439 in Block A
TEST_PROPERTY_BLOCK_C = "f7fc2cfd-cd4a-4362-bfe7-ab28c52ef6cd"  # B-869 in Block C


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tenant admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestProjectsAPI:
    """Test projects list API for block location editor"""
    
    def test_get_projects_list(self, auth_headers):
        """GET /api/projects/ - Returns list of projects"""
        response = requests.get(f"{BASE_URL}/api/projects/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify project structure
        project = data[0]
        assert "id" in project
        assert "name" in project
        assert "location" in project
        
    def test_projects_include_oberoi_plaza(self, auth_headers):
        """Verify test project Oberoi Plaza Pune exists"""
        response = requests.get(f"{BASE_URL}/api/projects/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        project_ids = [p["id"] for p in data]
        assert TEST_PROJECT_ID in project_ids, "Test project Oberoi Plaza Pune not found"


class TestBlockLocationsAPI:
    """Test block locations CRUD operations"""
    
    def test_get_block_locations(self, auth_headers):
        """GET /api/certified/projects/{project_id}/block-locations - Returns blocks with locations"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "project_id" in data
        assert "project_name" in data
        assert "blocks" in data
        assert data["project_id"] == TEST_PROJECT_ID
        assert data["project_name"] == "Oberoi Plaza Pune"
        
    def test_block_locations_structure(self, auth_headers):
        """Verify block location data structure"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        blocks = data["blocks"]
        assert len(blocks) >= 4, "Expected at least 4 blocks (A, B, C, D)"
        
        # Verify block structure
        for block in blocks:
            assert "block_name" in block
            assert "latitude" in block
            assert "longitude" in block
            assert "google_address" in block
            
    def test_blocks_a_b_have_locations(self, auth_headers):
        """Verify blocks A and B have locations set"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        blocks_dict = {b["block_name"]: b for b in data["blocks"]}
        
        # Block A should have location
        assert blocks_dict["A"]["latitude"] is not None
        assert blocks_dict["A"]["longitude"] is not None
        
        # Block B should have location
        assert blocks_dict["B"]["latitude"] is not None
        assert blocks_dict["B"]["longitude"] is not None
        
    def test_update_block_location(self, auth_headers):
        """PUT /api/certified/projects/{project_id}/block-locations - Update block locations"""
        # First get current locations
        get_response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        current_blocks = get_response.json()["blocks"]
        
        # Prepare update with existing locations plus new one for block D
        block_locations = []
        for block in current_blocks:
            if block["latitude"] and block["longitude"]:
                block_locations.append({
                    "block_name": block["block_name"],
                    "latitude": block["latitude"],
                    "longitude": block["longitude"],
                    "google_address": block.get("google_address", "")
                })
        
        # Add/update block D
        block_locations.append({
            "block_name": "D",
            "latitude": 18.5215,
            "longitude": 73.8575,
            "google_address": "Test Location Block D"
        })
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers,
            json={
                "project_id": TEST_PROJECT_ID,
                "block_locations": block_locations
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "block_locations" in data
        
        # Verify block D was updated
        updated_blocks = {b["block_name"]: b for b in data["block_locations"]}
        assert "D" in updated_blocks
        assert updated_blocks["D"]["latitude"] == 18.5215
        assert updated_blocks["D"]["longitude"] == 73.8575
        
    def test_block_location_persists(self, auth_headers):
        """Verify block location update persists in database"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        blocks_dict = {b["block_name"]: b for b in data["blocks"]}
        
        # Block D should now have location
        assert blocks_dict["D"]["latitude"] is not None
        assert blocks_dict["D"]["longitude"] is not None
        
    def test_invalid_project_returns_404(self, auth_headers):
        """GET with invalid project ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/invalid-project-id/block-locations",
            headers=auth_headers
        )
        assert response.status_code == 404
        
    def test_unauthorized_access(self):
        """Block locations API requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations"
        )
        assert response.status_code == 401


class TestCertifiedPropertyLocationInheritance:
    """Test that certified property page inherits location from block"""
    
    def test_property_inherits_block_location(self):
        """Property without own location inherits from block"""
        response = requests.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_BLOCK_A}"
        )
        assert response.status_code == 200
        
        data = response.json()
        location = data["location"]
        
        # Should inherit from block
        assert location["source"] == "block"
        assert location["latitude"] is not None
        assert location["longitude"] is not None
        
    def test_property_block_c_inherits_location(self):
        """Property in Block C inherits block C location"""
        response = requests.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_BLOCK_C}"
        )
        assert response.status_code == 200
        
        data = response.json()
        location = data["location"]
        
        # Should inherit from block
        assert location["source"] == "block"
        assert location["latitude"] is not None
        assert location["longitude"] is not None
        
    def test_certified_property_structure(self):
        """Verify certified property response structure"""
        response = requests.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_BLOCK_A}"
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify main sections
        assert "property" in data
        assert "project" in data
        assert "location" in data
        assert "media" in data
        assert "company" in data
        assert "meta" in data
        
        # Verify location structure
        location = data["location"]
        assert "latitude" in location
        assert "longitude" in location
        assert "google_address" in location
        assert "source" in location
        
    def test_invalid_property_returns_404(self):
        """GET with invalid property ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/certified/property/invalid-property-id"
        )
        assert response.status_code == 404


class TestBlockLocationValidation:
    """Test input validation for block locations"""
    
    def test_invalid_latitude_rejected(self, auth_headers):
        """Invalid latitude values should be rejected"""
        response = requests.put(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers,
            json={
                "project_id": TEST_PROJECT_ID,
                "block_locations": [
                    {"block_name": "A", "latitude": "invalid", "longitude": 73.8567}
                ]
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422
        
    def test_missing_block_name_rejected(self, auth_headers):
        """Missing block_name should be rejected"""
        response = requests.put(
            f"{BASE_URL}/api/certified/projects/{TEST_PROJECT_ID}/block-locations",
            headers=auth_headers,
            json={
                "project_id": TEST_PROJECT_ID,
                "block_locations": [
                    {"latitude": 18.5204, "longitude": 73.8567}
                ]
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
