"""
Resale/Release Management API Tests
Tests for P2: Resale/Release System
- Release: Properties returned to inventory (cancelled/defaulted bookings)
- Resale: Customer-initiated property sales
- Auto-notify interested parties in booking queue
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "rajam@retoerp.com"
TEST_PASSWORD = "12345678"
TEST_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"  # Oberoi Plaza Pune


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestReleasesAPI:
    """Tests for Property Releases (Return to Inventory)"""
    
    created_release_id = None
    
    def test_get_releases_list(self, headers):
        """Test GET /api/resale-release/releases - List all releases"""
        response = requests.get(f"{BASE_URL}/api/resale-release/releases", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "releases" in data
        assert "total" in data
        assert isinstance(data["releases"], list)
        print(f"✓ GET releases: Found {data['total']} releases")
    
    def test_get_releases_with_project_filter(self, headers):
        """Test GET /api/resale-release/releases with project_id filter"""
        response = requests.get(
            f"{BASE_URL}/api/resale-release/releases?project_id={TEST_PROJECT_ID}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # All returned releases should be for the specified project
        for release in data["releases"]:
            assert release["project_id"] == TEST_PROJECT_ID
        print(f"✓ GET releases with project filter: Found {len(data['releases'])} releases")
    
    def test_create_release(self, headers):
        """Test POST /api/resale-release/releases - Create new release"""
        test_property_id = f"TEST-release-{uuid.uuid4().hex[:8]}"
        
        payload = {
            "project_id": TEST_PROJECT_ID,
            "property_id": test_property_id,
            "previous_customer_name": "TEST Release Customer",
            "release_reason": "booking_cancelled",
            "release_notes": "Test release created by pytest",
            "refund_amount": 30000,
            "deduction_amount": 3000,
            "deduction_reason": "Processing fee"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/resale-release/releases",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "release" in data
        assert data["release"]["project_id"] == TEST_PROJECT_ID
        assert data["release"]["property_id"] == test_property_id
        assert data["release"]["release_reason"] == "booking_cancelled"
        assert data["release"]["refund_amount"] == 30000
        assert data["release"]["deduction_amount"] == 3000
        assert data["release"]["is_processed"] is False
        
        # Store for later tests
        TestReleasesAPI.created_release_id = data["release"]["id"]
        print(f"✓ POST release: Created release {data['release']['id']}")
    
    def test_create_release_invalid_project(self, headers):
        """Test POST /api/resale-release/releases with invalid project"""
        payload = {
            "project_id": "invalid-project-id",
            "property_id": "test-property",
            "release_reason": "customer_request"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/resale-release/releases",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Project not found" in data.get("detail", "")
        print("✓ POST release with invalid project: Returns 404")
    
    def test_notify_queue_for_release(self, headers):
        """Test POST /api/resale-release/releases/{id}/notify-queue"""
        if not TestReleasesAPI.created_release_id:
            pytest.skip("No release created to test notify")
        
        response = requests.post(
            f"{BASE_URL}/api/resale-release/releases/{TestReleasesAPI.created_release_id}/notify-queue",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # May have no one in queue, which is valid
        assert "message" in data
        assert "notified" in data
        print(f"✓ POST notify-queue: {data['message']}")
    
    def test_notify_queue_invalid_release(self, headers):
        """Test POST /api/resale-release/releases/{id}/notify-queue with invalid ID"""
        response = requests.post(
            f"{BASE_URL}/api/resale-release/releases/invalid-release-id/notify-queue",
            headers=headers
        )
        
        assert response.status_code == 404
        print("✓ POST notify-queue with invalid ID: Returns 404")


class TestResalesAPI:
    """Tests for Property Resales (Customer Selling)"""
    
    def test_get_resales_list(self, headers):
        """Test GET /api/resale-release/resales - List all resales"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "resales" in data
        assert "total" in data
        assert isinstance(data["resales"], list)
        print(f"✓ GET resales: Found {data['total']} resales")
    
    def test_get_resales_with_filters(self, headers):
        """Test GET /api/resale-release/resales with filters"""
        # Test with project filter
        response = requests.get(
            f"{BASE_URL}/api/resale-release/resales?project_id={TEST_PROJECT_ID}",
            headers=headers
        )
        assert response.status_code == 200
        
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/resale-release/resales?status=pending_approval",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print("✓ GET resales with filters: Works correctly")
    
    def test_get_resales_stats(self, headers):
        """Test GET /api/resale-release/resales/stats"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total" in data
        assert "by_status" in data
        assert "total_commission_earned" in data
        
        # Verify all status types are present
        expected_statuses = ["pending_approval", "approved", "listed", "under_negotiation", "sold", "withdrawn", "rejected"]
        for status in expected_statuses:
            assert status in data["by_status"], f"Missing status: {status}"
        
        print(f"✓ GET resales stats: Total={data['total']}, Commission=₹{data['total_commission_earned']}")
    
    def test_get_listed_resales(self, headers):
        """Test GET /api/resale-release/resales/listed"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales/listed", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "resales" in data
        assert "count" in data
        print(f"✓ GET listed resales: Found {data['count']} listed properties")
    
    def test_get_resale_not_found(self, headers):
        """Test GET /api/resale-release/resales/{id} with invalid ID"""
        response = requests.get(
            f"{BASE_URL}/api/resale-release/resales/invalid-resale-id",
            headers=headers
        )
        
        assert response.status_code == 404
        print("✓ GET resale with invalid ID: Returns 404")


class TestResaleWorkflow:
    """Tests for complete resale workflow (requires booking data)"""
    
    def test_create_resale_without_booking(self, headers):
        """Test POST /api/resale-release/resales - Should fail without valid booking"""
        payload = {
            "project_id": TEST_PROJECT_ID,
            "property_id": "test-property",
            "booking_id": "invalid-booking-id",
            "seller_customer_id": "test-customer",
            "seller_name": "Test Seller",
            "seller_phone": "9876543210",
            "original_price": 5000000,
            "asking_price": 5500000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/resale-release/resales",
            headers=headers,
            json=payload
        )
        
        # Should fail because booking doesn't exist
        assert response.status_code == 404
        data = response.json()
        assert "Booking not found" in data.get("detail", "")
        print("✓ POST resale without valid booking: Returns 404")


class TestInquiriesAPI:
    """Tests for Resale Inquiries"""
    
    def test_create_inquiry_without_listed_resale(self, headers):
        """Test POST /api/resale-release/inquiries - Should fail without listed resale"""
        payload = {
            "resale_id": "invalid-resale-id",
            "inquirer_name": "Test Inquirer",
            "inquirer_phone": "9876543210",
            "offered_price": 5000000,
            "message": "Interested in this property"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/resale-release/inquiries",
            headers=headers,
            json=payload
        )
        
        # Should fail because resale doesn't exist or isn't listed
        assert response.status_code == 404
        print("✓ POST inquiry without valid resale: Returns 404")


class TestAuthenticationRequired:
    """Tests to verify authentication is required"""
    
    def test_releases_requires_auth(self):
        """Test that releases endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/resale-release/releases")
        assert response.status_code == 401
        print("✓ GET releases without auth: Returns 401")
    
    def test_resales_requires_auth(self):
        """Test that resales endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales")
        assert response.status_code == 401
        print("✓ GET resales without auth: Returns 401")
    
    def test_stats_requires_auth(self):
        """Test that stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales/stats")
        assert response.status_code == 401
        print("✓ GET stats without auth: Returns 401")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_releases(self, headers):
        """Clean up TEST_ prefixed releases"""
        # Get all releases
        response = requests.get(f"{BASE_URL}/api/resale-release/releases?limit=100", headers=headers)
        if response.status_code == 200:
            data = response.json()
            test_releases = [r for r in data.get("releases", []) if "TEST" in r.get("property_id", "")]
            print(f"✓ Found {len(test_releases)} test releases to clean up (manual cleanup may be needed)")
        else:
            print("✓ Cleanup check completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
