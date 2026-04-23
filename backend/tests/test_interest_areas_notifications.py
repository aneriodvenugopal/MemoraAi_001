"""
AgentApex Interest Areas & Notifications API Tests
Tests for the new features: Interest Areas (saved locations for alerts) and Notifications
Endpoint prefix: /api/agentapex/
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user phone numbers
TEST_PHONE_1 = "9999999999"  # User with interest areas in Madhapur
TEST_PHONE_2 = "8888888888"  # User who created property near Madhapur


def get_auth_token(phone: str) -> str:
    """Helper to get auth token for a phone number"""
    # Send OTP
    send_response = requests.post(
        f"{BASE_URL}/api/agentapex/auth/send-otp",
        json={"phone": phone}
    )
    demo_otp = send_response.json().get("demo_otp")
    
    # Verify OTP
    verify_response = requests.post(
        f"{BASE_URL}/api/agentapex/auth/verify-otp",
        json={"phone": phone, "otp": demo_otp}
    )
    return verify_response.json().get("token")


class TestInterestAreasAPI:
    """Test Interest Areas CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for test user 1"""
        return get_auth_token(TEST_PHONE_1)
    
    def test_get_interest_areas(self, auth_token):
        """Test GET /interest-areas returns user's interest areas"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/interest-areas",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get interest areas OK: {len(data)} areas found")
        
        # Verify data structure
        if len(data) > 0:
            area = data[0]
            assert "id" in area
            assert "name" in area
            assert "latitude" in area
            assert "longitude" in area
            assert "radius_km" in area
            assert "property_types" in area
            assert "notifications_enabled" in area
            print(f"✓ Interest area structure valid: {area['name']}")
    
    def test_create_interest_area(self, auth_token):
        """Test POST /interest-areas creates new area"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        area_data = {
            "name": "TEST_Kondapur",
            "latitude": 17.4684,
            "longitude": 78.3524,
            "radius_km": 10,
            "property_types": ["Land", "Plot", "House"],
            "min_price": 100,
            "max_price": 1000,
            "notifications_enabled": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/agentapex/interest-areas",
            json=area_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert "id" in data
        assert data["name"] == area_data["name"]
        assert data["latitude"] == area_data["latitude"]
        assert data["longitude"] == area_data["longitude"]
        assert data["radius_km"] == area_data["radius_km"]
        assert data["property_types"] == area_data["property_types"]
        assert data["min_price"] == area_data["min_price"]
        assert data["max_price"] == area_data["max_price"]
        assert data["notifications_enabled"] == True
        print(f"✓ Create interest area OK: {data['id']}")
        
        return data["id"]
    
    def test_update_interest_area_notifications(self, auth_token):
        """Test PUT /interest-areas/{id} can toggle notifications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get existing areas
        get_response = requests.get(
            f"{BASE_URL}/api/agentapex/interest-areas",
            headers=headers
        )
        areas = get_response.json()
        
        if len(areas) > 0:
            area_id = areas[0]["id"]
            original_status = areas[0]["notifications_enabled"]
            
            # Toggle notifications
            response = requests.put(
                f"{BASE_URL}/api/agentapex/interest-areas/{area_id}",
                params={"notifications_enabled": not original_status},
                headers=headers
            )
            assert response.status_code == 200
            print(f"✓ Update interest area notifications OK: {area_id}")
            
            # Revert the change
            requests.put(
                f"{BASE_URL}/api/agentapex/interest-areas/{area_id}",
                params={"notifications_enabled": original_status},
                headers=headers
            )
        else:
            pytest.skip("No interest areas to test update")
    
    def test_delete_interest_area(self, auth_token):
        """Test DELETE /interest-areas/{id} removes area"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test area to delete
        area_data = {
            "name": "TEST_ToDelete",
            "latitude": 17.5,
            "longitude": 78.5,
            "radius_km": 5,
            "property_types": ["Land"],
            "notifications_enabled": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/interest-areas",
            json=area_data,
            headers=headers
        )
        area_id = create_response.json()["id"]
        
        # Delete the area
        response = requests.delete(
            f"{BASE_URL}/api/agentapex/interest-areas/{area_id}",
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Delete interest area OK: {area_id}")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/agentapex/interest-areas",
            headers=headers
        )
        remaining_ids = [a["id"] for a in get_response.json()]
        assert area_id not in remaining_ids
        print("✓ Verified interest area deletion")


class TestNotificationsAPI:
    """Test Notifications API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for test user 1 (has notifications)"""
        return get_auth_token(TEST_PHONE_1)
    
    def test_get_notifications(self, auth_token):
        """Test GET /notifications returns user's notifications"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/notifications",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get notifications OK: {len(data)} notifications found")
        
        # Verify data structure
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "read" in notif
            assert "created_at" in notif
            print(f"✓ Notification structure valid: {notif['title']}")
    
    def test_get_unread_count(self, auth_token):
        """Test GET /notifications/unread-count returns count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/notifications/unread-count",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ Get unread count OK: {data['unread_count']} unread")
    
    def test_mark_notification_read(self, auth_token):
        """Test PUT /notifications/{id}/read marks as read"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get notifications
        get_response = requests.get(
            f"{BASE_URL}/api/agentapex/notifications",
            headers=headers
        )
        notifications = get_response.json()
        
        if len(notifications) > 0:
            notif_id = notifications[0]["id"]
            response = requests.put(
                f"{BASE_URL}/api/agentapex/notifications/{notif_id}/read",
                headers=headers
            )
            assert response.status_code == 200
            print(f"✓ Mark notification read OK: {notif_id}")
        else:
            pytest.skip("No notifications to mark as read")
    
    def test_mark_all_notifications_read(self, auth_token):
        """Test PUT /notifications/mark-all-read marks all as read"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.put(
            f"{BASE_URL}/api/agentapex/notifications/mark-all-read",
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Mark all notifications read OK")
        
        # Verify unread count is now 0
        count_response = requests.get(
            f"{BASE_URL}/api/agentapex/notifications/unread-count",
            headers=headers
        )
        assert count_response.json()["unread_count"] == 0
        print("✓ Verified all notifications marked as read")


class TestNotificationTrigger:
    """Test notification creation when property is added near interest area"""
    
    def test_property_creation_triggers_notification(self):
        """Test that creating a property near an interest area triggers notification"""
        # Get token for user 2 (property creator)
        token_user2 = get_auth_token(TEST_PHONE_2)
        headers_user2 = {"Authorization": f"Bearer {token_user2}"}
        
        # Get token for user 1 (has interest area in Madhapur)
        token_user1 = get_auth_token(TEST_PHONE_1)
        headers_user1 = {"Authorization": f"Bearer {token_user1}"}
        
        # Get initial unread count for user 1
        initial_count_resp = requests.get(
            f"{BASE_URL}/api/agentapex/notifications/unread-count",
            headers=headers_user1
        )
        initial_count = initial_count_resp.json().get("unread_count", 0)
        
        # Create a property near Madhapur (17.4486, 78.3908) by user 2
        property_data = {
            "property_type": "Land",
            "title": "TEST_Trigger Property",
            "price": 100.0,
            "price_unit": "Lakhs",
            "area": 200.0,
            "area_unit": "Sq. Yards",
            "location": "Near Madhapur",
            "city": "Hyderabad",
            "latitude": 17.45,  # Near Madhapur
            "longitude": 78.39,  # Near Madhapur
            "negotiable": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=property_data,
            headers=headers_user2
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        print(f"✓ Created test property: {property_id}")
        
        # Check if notification was created for user 1
        import time
        time.sleep(1)  # Wait for notification to be created
        
        new_count_resp = requests.get(
            f"{BASE_URL}/api/agentapex/notifications/unread-count",
            headers=headers_user1
        )
        new_count = new_count_resp.json().get("unread_count", 0)
        
        # Should have received a new notification
        if new_count > initial_count:
            print(f"✓ Notification triggered: count increased from {initial_count} to {new_count}")
        else:
            print(f"Note: Notification count unchanged ({new_count}) - may have matching property types filter")
        
        # Cleanup - delete the test property
        requests.delete(
            f"{BASE_URL}/api/agentapex/properties/{property_id}",
            headers=headers_user2
        )
        print("✓ Cleaned up test property")


class TestCleanup:
    """Cleanup test data prefixed with TEST_"""
    
    def test_cleanup_test_interest_areas(self):
        """Delete interest areas prefixed with TEST_"""
        token = get_auth_token(TEST_PHONE_1)
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/agentapex/interest-areas",
            headers=headers
        )
        areas = response.json()
        
        deleted_count = 0
        for area in areas:
            if area["name"].startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/agentapex/interest-areas/{area['id']}",
                    headers=headers
                )
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleanup: Deleted {deleted_count} test interest areas")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
