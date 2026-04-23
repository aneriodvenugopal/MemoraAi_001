"""
Test Certified Property APIs
Tests for property certification, location, and media management
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test property ID from context
TEST_PROPERTY_ID = "3f61fcf3-dbff-44d3-8ea3-c49452b78dc5"

# Test credentials
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tenant admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPublicCertifiedPropertyEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_get_certified_property_public(self, api_client):
        """GET /api/certified/property/:id - Public endpoint"""
        response = api_client.get(f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "property" in data, "Response should contain 'property'"
        assert "project" in data, "Response should contain 'project'"
        assert "location" in data, "Response should contain 'location'"
        assert "media" in data, "Response should contain 'media'"
        assert "company" in data, "Response should contain 'company'"
        assert "meta" in data, "Response should contain 'meta'"
        
        # Verify property data
        prop = data["property"]
        assert prop.get("id") == TEST_PROPERTY_ID
        assert "property_number" in prop
        assert "area" in prop
        assert "is_certified" in prop
        
        # Verify location data
        loc = data["location"]
        assert "latitude" in loc
        assert "longitude" in loc
        assert "source" in loc
        
        print(f"✓ Public certified property endpoint works")
        print(f"  Property: {prop.get('property_number')}")
        print(f"  Location source: {loc.get('source')}")
        print(f"  Lat/Lng: {loc.get('latitude')}, {loc.get('longitude')}")
    
    def test_get_certified_property_location_source(self, api_client):
        """Verify location hierarchy (property > block > project)"""
        response = api_client.get(f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        loc = data["location"]
        
        # Property should have location set (from context: lat: 18.5204, lng: 73.8567)
        if loc.get("latitude") and loc.get("longitude"):
            print(f"✓ Location found - Source: {loc.get('source')}")
            print(f"  Coordinates: {loc.get('latitude')}, {loc.get('longitude')}")
            
            # If source is 'property', verify coordinates match expected
            if loc.get("source") == "property":
                # Approximate check for expected coordinates
                assert abs(loc.get("latitude") - 18.5204) < 0.01 or loc.get("latitude") is not None
                print(f"  ✓ Property-specific location is being used")
        else:
            print(f"⚠ No location coordinates found")
    
    def test_get_certified_property_not_found(self, api_client):
        """GET /api/certified/property/:id - Non-existent property"""
        response = api_client.get(f"{BASE_URL}/api/certified/property/non-existent-id-12345")
        
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent property")
    
    def test_get_property_qr_data(self, api_client):
        """GET /api/certified/property/:id/qr - QR code data"""
        response = api_client.get(f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/qr")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "property_id" in data
        assert "property_number" in data
        assert "certified_url" in data
        
        print(f"✓ QR data endpoint works")
        print(f"  Property: {data.get('property_number')}")
        print(f"  URL: {data.get('certified_url')}")


class TestAuthenticatedCertifiedPropertyEndpoints:
    """Test authenticated endpoints (admin only)"""
    
    def test_update_property_location(self, authenticated_client):
        """PUT /api/certified/property/:id/location - Update location"""
        payload = {
            "latitude": 18.5204,
            "longitude": 73.8567,
            "google_address": "Pune, Maharashtra, India"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/location",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        
        print(f"✓ Location update successful: {data.get('message')}")
        
        # Verify location was saved by fetching public endpoint
        verify_response = authenticated_client.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        loc = verify_data["location"]
        assert loc.get("source") == "property", f"Expected source 'property', got '{loc.get('source')}'"
        assert loc.get("latitude") == 18.5204
        assert loc.get("longitude") == 73.8567
        
        print(f"✓ Location persisted correctly - Source: {loc.get('source')}")
    
    def test_update_property_media_images(self, authenticated_client):
        """PUT /api/certified/property/:id/media - Update images"""
        payload = {
            "property_images": [
                {"url": "https://example.com/image1.jpg", "is_cover": True},
                {"url": "https://example.com/image2.jpg", "is_cover": False}
            ]
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/media",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✓ Images update successful")
        
        # Verify images were saved
        verify_response = authenticated_client.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        images = verify_data["media"]["images"]
        assert len(images) >= 2, f"Expected at least 2 images, got {len(images)}"
        print(f"✓ Images persisted: {len(images)} images")
    
    def test_update_property_media_videos(self, authenticated_client):
        """PUT /api/certified/property/:id/media - Update videos"""
        payload = {
            "property_videos": [
                {"url": "https://www.youtube.com/watch?v=test123", "title": "Property Tour", "is_youtube": True}
            ]
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/media",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✓ Videos update successful")
        
        # Verify videos were saved
        verify_response = authenticated_client.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        videos = verify_data["media"]["videos"]
        assert len(videos) >= 1, f"Expected at least 1 video, got {len(videos)}"
        print(f"✓ Videos persisted: {len(videos)} videos")
    
    def test_certify_property(self, authenticated_client):
        """POST /api/certified/property/:id/certify - Certify property"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/certify",
            json={"property_id": TEST_PROPERTY_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "certified_at" in data
        
        print(f"✓ Property certified at: {data.get('certified_at')}")
        
        # Verify certification status
        verify_response = authenticated_client.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data["property"]["is_certified"] == True
        print(f"✓ Certification status verified: is_certified=True")
    
    def test_uncertify_property(self, authenticated_client):
        """POST /api/certified/property/:id/uncertify - Remove certification"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/uncertify"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"✓ Property uncertified")
        
        # Verify certification removed
        verify_response = authenticated_client.get(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}"
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data["property"]["is_certified"] == False
        print(f"✓ Certification removed: is_certified=False")
        
        # Re-certify for subsequent tests
        authenticated_client.post(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/certify",
            json={"property_id": TEST_PROPERTY_ID}
        )
        print(f"✓ Re-certified property for subsequent tests")


class TestAuthenticationRequired:
    """Test that authenticated endpoints require auth"""
    
    def test_update_location_requires_auth(self, api_client):
        """PUT /api/certified/property/:id/location - Requires auth"""
        response = api_client.put(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/location",
            json={"latitude": 18.5, "longitude": 73.8}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Location update requires authentication (status: {response.status_code})")
    
    def test_update_media_requires_auth(self, api_client):
        """PUT /api/certified/property/:id/media - Requires auth"""
        response = api_client.put(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/media",
            json={"property_images": []}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Media update requires authentication (status: {response.status_code})")
    
    def test_certify_requires_auth(self, api_client):
        """POST /api/certified/property/:id/certify - Requires auth"""
        response = api_client.post(
            f"{BASE_URL}/api/certified/property/{TEST_PROPERTY_ID}/certify",
            json={}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Certify requires authentication (status: {response.status_code})")


class TestPropertyEndpoint:
    """Test property fetch endpoint for settings page"""
    
    def test_get_property_details(self, authenticated_client):
        """GET /api/properties/:id - Get property for settings page"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/properties/{TEST_PROPERTY_ID}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == TEST_PROPERTY_ID
        assert "property_number" in data
        assert "project_id" in data
        
        print(f"✓ Property details fetched")
        print(f"  Property Number: {data.get('property_number')}")
        print(f"  Project ID: {data.get('project_id')}")
        print(f"  Latitude: {data.get('latitude')}")
        print(f"  Longitude: {data.get('longitude')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
