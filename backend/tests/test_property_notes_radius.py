"""
Test cases for AgentApex Property Notes and Radius Filtering features
Features tested:
- #21: Property Edit - Notes field (add/delete notes)
- #24: Radius filtering in map search
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TEST_PHONE = "9908290239"


class TestPropertyNotes:
    """Test cases for Property Notes feature (#21)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        # Send OTP
        otp_res = requests.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        assert otp_res.status_code == 200
        otp = otp_res.json().get("demo_otp")
        
        # Verify OTP
        verify_res = requests.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={"phone": TEST_PHONE, "otp": otp})
        assert verify_res.status_code == 200
        self.token = verify_res.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        
        # Get user's properties
        props_res = requests.get(f"{BASE_URL}/api/agentapex/properties/my", headers=self.headers)
        assert props_res.status_code == 200
        props = props_res.json()
        if props:
            self.property_id = props[0]["id"]
        else:
            # Create a test property
            create_res = requests.post(f"{BASE_URL}/api/agentapex/properties", headers=self.headers, json={
                "property_type": "Plot",
                "price": 100,
                "price_unit": "Lakhs",
                "area": 200,
                "area_unit": "Sq.Yds",
                "location": "Test Location",
                "latitude": 17.385,
                "longitude": 78.4867
            })
            assert create_res.status_code == 200
            self.property_id = create_res.json()["id"]
    
    def test_add_notes_to_property(self):
        """Test adding notes to a property via PUT endpoint"""
        notes = [
            {"text": "Test note 1", "created_at": datetime.utcnow().isoformat()},
            {"text": "Test note 2", "created_at": datetime.utcnow().isoformat()}
        ]
        
        # Update property with notes
        res = requests.put(
            f"{BASE_URL}/api/agentapex/properties/{self.property_id}",
            headers=self.headers,
            json={"notes": notes}
        )
        assert res.status_code == 200
        assert res.json()["message"] == "Property updated successfully"
        
        # Verify notes were saved
        get_res = requests.get(f"{BASE_URL}/api/agentapex/properties/{self.property_id}", headers=self.headers)
        assert get_res.status_code == 200
        saved_notes = get_res.json().get("notes", [])
        assert len(saved_notes) == 2
        assert saved_notes[0]["text"] == "Test note 1"
        assert saved_notes[1]["text"] == "Test note 2"
    
    def test_partial_update_only_notes(self):
        """Test that partial update works - only sending notes field"""
        # First get current property data
        get_res = requests.get(f"{BASE_URL}/api/agentapex/properties/{self.property_id}", headers=self.headers)
        original_price = get_res.json().get("price")
        
        # Update only notes
        notes = [{"text": "Partial update note", "created_at": datetime.utcnow().isoformat()}]
        res = requests.put(
            f"{BASE_URL}/api/agentapex/properties/{self.property_id}",
            headers=self.headers,
            json={"notes": notes}
        )
        assert res.status_code == 200
        
        # Verify notes updated but price unchanged
        get_res = requests.get(f"{BASE_URL}/api/agentapex/properties/{self.property_id}", headers=self.headers)
        assert get_res.json().get("price") == original_price
        assert get_res.json().get("notes")[0]["text"] == "Partial update note"
    
    def test_delete_note_from_property(self):
        """Test deleting a note by updating with filtered notes array"""
        # Add multiple notes
        notes = [
            {"text": "Note to keep", "created_at": datetime.utcnow().isoformat()},
            {"text": "Note to delete", "created_at": datetime.utcnow().isoformat()}
        ]
        requests.put(
            f"{BASE_URL}/api/agentapex/properties/{self.property_id}",
            headers=self.headers,
            json={"notes": notes}
        )
        
        # Delete second note by updating with only first note
        filtered_notes = [notes[0]]
        res = requests.put(
            f"{BASE_URL}/api/agentapex/properties/{self.property_id}",
            headers=self.headers,
            json={"notes": filtered_notes}
        )
        assert res.status_code == 200
        
        # Verify only one note remains
        get_res = requests.get(f"{BASE_URL}/api/agentapex/properties/{self.property_id}", headers=self.headers)
        saved_notes = get_res.json().get("notes", [])
        assert len(saved_notes) == 1
        assert saved_notes[0]["text"] == "Note to keep"
    
    def test_add_youtube_videos_to_property(self):
        """Test adding YouTube videos to a property"""
        videos = ["https://www.youtube.com/watch?v=test123", "https://youtu.be/test456"]
        
        res = requests.put(
            f"{BASE_URL}/api/agentapex/properties/{self.property_id}",
            headers=self.headers,
            json={"youtube_videos": videos}
        )
        assert res.status_code == 200
        
        # Verify videos were saved
        get_res = requests.get(f"{BASE_URL}/api/agentapex/properties/{self.property_id}", headers=self.headers)
        saved_videos = get_res.json().get("youtube_videos", [])
        assert len(saved_videos) == 2
        assert "test123" in saved_videos[0]


class TestRadiusFiltering:
    """Test cases for Radius Filtering feature (#24)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        otp_res = requests.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        assert otp_res.status_code == 200
        otp = otp_res.json().get("demo_otp")
        
        verify_res = requests.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={"phone": TEST_PHONE, "otp": otp})
        assert verify_res.status_code == 200
        self.token = verify_res.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_get_properties_with_radius_filter(self):
        """Test GET /properties with radius_km parameter"""
        # Hyderabad coordinates
        lat, lng = 17.385, 78.4867
        
        # Test with 10km radius
        res = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"latitude": lat, "longitude": lng, "radius_km": 10}
        )
        assert res.status_code == 200
        properties = res.json()
        assert isinstance(properties, list)
        
        # All returned properties should have distance_km <= 10
        for prop in properties:
            if "distance_km" in prop:
                assert prop["distance_km"] <= 10
    
    def test_radius_filter_with_different_values(self):
        """Test radius filtering with different radius values"""
        lat, lng = 17.385, 78.4867
        
        # Test with 5km radius
        res_5km = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"latitude": lat, "longitude": lng, "radius_km": 5}
        )
        assert res_5km.status_code == 200
        count_5km = len(res_5km.json())
        
        # Test with 50km radius - should return more or equal properties
        res_50km = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"latitude": lat, "longitude": lng, "radius_km": 50}
        )
        assert res_50km.status_code == 200
        count_50km = len(res_50km.json())
        
        # Larger radius should return >= properties
        assert count_50km >= count_5km
    
    def test_properties_sorted_by_distance(self):
        """Test that properties are sorted by distance when radius filter is applied"""
        lat, lng = 17.385, 78.4867
        
        res = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"latitude": lat, "longitude": lng, "radius_km": 50}
        )
        assert res.status_code == 200
        properties = res.json()
        
        # Check if sorted by distance
        distances = [p.get("distance_km", 0) for p in properties if "distance_km" in p]
        if len(distances) > 1:
            assert distances == sorted(distances), "Properties should be sorted by distance"
    
    def test_radius_filter_with_property_type(self):
        """Test combining radius filter with property type filter"""
        lat, lng = 17.385, 78.4867
        
        res = requests.get(
            f"{BASE_URL}/api/agentapex/properties",
            params={"latitude": lat, "longitude": lng, "radius_km": 20, "property_type": "Land"}
        )
        assert res.status_code == 200
        properties = res.json()
        
        # All returned properties should be Land type
        for prop in properties:
            assert prop.get("property_type") == "Land"


class TestPropertyCreateModel:
    """Test PropertyCreate model accepts notes and youtube_videos fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        otp_res = requests.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        assert otp_res.status_code == 200
        otp = otp_res.json().get("demo_otp")
        
        verify_res = requests.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={"phone": TEST_PHONE, "otp": otp})
        assert verify_res.status_code == 200
        self.token = verify_res.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_create_property_with_notes(self):
        """Test creating a property with notes field"""
        notes = [{"text": "Initial note", "created_at": datetime.utcnow().isoformat()}]
        
        res = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            headers=self.headers,
            json={
                "property_type": "Plot",
                "price": 50,
                "price_unit": "Lakhs",
                "area": 100,
                "area_unit": "Sq.Yds",
                "location": "Test Location with Notes",
                "latitude": 17.385,
                "longitude": 78.4867,
                "notes": notes
            }
        )
        assert res.status_code == 200
        created = res.json()
        assert "id" in created
        assert created.get("property_id", "").startswith("AX-P-")
        
        # Cleanup - delete the test property
        requests.delete(f"{BASE_URL}/api/agentapex/properties/{created['id']}", headers=self.headers)
    
    def test_create_property_with_youtube_videos(self):
        """Test creating a property with youtube_videos field"""
        videos = ["https://www.youtube.com/watch?v=test123"]
        
        res = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            headers=self.headers,
            json={
                "property_type": "Land",
                "price": 100,
                "price_unit": "Lakhs",
                "area": 5,
                "area_unit": "Acres",
                "location": "Test Location with Videos",
                "latitude": 17.385,
                "longitude": 78.4867,
                "youtube_videos": videos
            }
        )
        assert res.status_code == 200
        created = res.json()
        assert "id" in created
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/agentapex/properties/{created['id']}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
