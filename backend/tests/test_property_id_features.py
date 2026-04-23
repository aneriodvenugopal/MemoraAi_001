"""
AgentApex Property ID Features Tests
Tests for: Property ID system, search-by-id, image management, share-data endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test phone for authentication
TEST_PHONE = "9908290239"


class TestPropertyIdFeatures:
    """Tests for Property ID system and related features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get OTP
        otp_res = self.session.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        assert otp_res.status_code == 200, f"Failed to send OTP: {otp_res.text}"
        demo_otp = otp_res.json().get("demo_otp")
        
        # Verify OTP and get token
        verify_res = self.session.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": demo_otp
        })
        assert verify_res.status_code == 200, f"Failed to verify OTP: {verify_res.text}"
        self.token = verify_res.json().get("token")
        self.user = verify_res.json().get("user")
        self.auth_headers = {"Authorization": f"Bearer {self.token}"}
    
    # ==================== PROPERTY ID GENERATION ====================
    
    def test_create_property_generates_property_id(self):
        """POST /api/agentapex/properties creates property with auto property_id (AX-P-xxxxx format)"""
        payload = {
            "property_type": "Plot",
            "price": 50,
            "price_unit": "Lakhs",
            "area": 200,
            "area_unit": "Sq. Yards",
            "location": "Test Location for Property ID",
            "latitude": 17.385,
            "longitude": 78.486,
            "negotiable": True
        }
        res = self.session.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=payload,
            headers=self.auth_headers
        )
        assert res.status_code == 200, f"Failed to create property: {res.text}"
        data = res.json()
        
        # Verify property_id is generated
        assert "property_id" in data, "property_id not in response"
        assert data["property_id"] is not None, "property_id is None"
        assert data["property_id"].startswith("AX-"), f"property_id should start with AX-, got: {data['property_id']}"
        
        # Verify format: AX-{type_code}-{number}
        parts = data["property_id"].split("-")
        assert len(parts) == 3, f"property_id should have 3 parts, got: {parts}"
        assert parts[0] == "AX", "First part should be AX"
        assert parts[1] == "P", f"Type code for Plot should be P, got: {parts[1]}"
        assert parts[2].isdigit(), f"Third part should be numeric, got: {parts[2]}"
        assert int(parts[2]) >= 10001, f"Number should be >= 10001, got: {parts[2]}"
        
        # Store for cleanup
        self.created_property_id = data["id"]
        self.created_property_ax_id = data["property_id"]
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{data['id']}", headers=self.auth_headers)
    
    def test_property_type_codes_mapping(self):
        """Verify different property types get correct type codes"""
        type_mappings = [
            ("Land", "P"),
            ("Villa", "V"),
            ("Apartment", "A"),
            ("Commercial", "C"),
            ("Farm", "F"),
            ("House", "H"),
        ]
        
        created_ids = []
        for prop_type, expected_code in type_mappings:
            payload = {
                "property_type": prop_type,
                "price": 10,
                "price_unit": "Lakhs",
                "area": 100,
                "area_unit": "Sq. Ft.",
                "location": f"Test {prop_type}",
                "latitude": 17.385,
                "longitude": 78.486
            }
            res = self.session.post(
                f"{BASE_URL}/api/agentapex/properties",
                json=payload,
                headers=self.auth_headers
            )
            if res.status_code == 200:
                data = res.json()
                created_ids.append(data["id"])
                parts = data["property_id"].split("-")
                assert parts[1] == expected_code, f"Type {prop_type} should have code {expected_code}, got {parts[1]}"
        
        # Cleanup
        for pid in created_ids:
            self.session.delete(f"{BASE_URL}/api/agentapex/properties/{pid}", headers=self.auth_headers)
    
    # ==================== SEARCH BY PROPERTY ID ====================
    
    def test_search_by_property_id_success(self):
        """GET /api/agentapex/properties/search-by-id?property_id=AX-P-10001 returns property + agent info"""
        # First, get an existing property ID
        my_props = self.session.get(f"{BASE_URL}/api/agentapex/properties/my", headers=self.auth_headers)
        if my_props.status_code == 200 and len(my_props.json()) > 0:
            existing_prop = my_props.json()[0]
            if existing_prop.get("property_id"):
                prop_id = existing_prop["property_id"]
            else:
                # Create a new property to test
                payload = {
                    "property_type": "Plot",
                    "price": 25,
                    "price_unit": "Lakhs",
                    "area": 150,
                    "area_unit": "Sq. Yards",
                    "location": "Search Test Location",
                    "latitude": 17.385,
                    "longitude": 78.486
                }
                create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
                prop_id = create_res.json()["property_id"]
        else:
            # Create a new property
            payload = {
                "property_type": "Plot",
                "price": 25,
                "price_unit": "Lakhs",
                "area": 150,
                "area_unit": "Sq. Yards",
                "location": "Search Test Location",
                "latitude": 17.385,
                "longitude": 78.486
            }
            create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
            prop_id = create_res.json()["property_id"]
        
        # Search by property ID (no auth required - public endpoint)
        res = self.session.get(f"{BASE_URL}/api/agentapex/properties/search-by-id?property_id={prop_id}")
        assert res.status_code == 200, f"Search failed: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert "property" in data, "Response should contain 'property'"
        assert "agent" in data, "Response should contain 'agent'"
        
        # Verify property data
        assert data["property"]["property_id"] == prop_id, "property_id mismatch"
        assert "location" in data["property"], "property should have location"
        assert "price" in data["property"], "property should have price"
        
        # Verify agent data
        assert "name" in data["agent"], "agent should have name"
        assert "designation" in data["agent"], "agent should have designation"
        assert data["agent"]["designation"] == "AgentApex Property Advisor" or data["agent"]["designation"], "agent should have designation"
    
    def test_search_by_property_id_not_found(self):
        """GET /api/agentapex/properties/search-by-id?property_id=INVALID returns 404"""
        res = self.session.get(f"{BASE_URL}/api/agentapex/properties/search-by-id?property_id=AX-X-99999")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        data = res.json()
        assert "detail" in data, "Response should contain error detail"
    
    def test_search_by_property_id_increments_views(self):
        """Search by property ID should increment view count"""
        # Create a property
        payload = {
            "property_type": "Plot",
            "price": 30,
            "price_unit": "Lakhs",
            "area": 200,
            "area_unit": "Sq. Yards",
            "location": "View Count Test",
            "latitude": 17.385,
            "longitude": 78.486
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_data = create_res.json()
        prop_id = prop_data["property_id"]
        internal_id = prop_data["id"]
        initial_views = prop_data.get("views", 0)
        
        # Search by property ID
        self.session.get(f"{BASE_URL}/api/agentapex/properties/search-by-id?property_id={prop_id}")
        
        # Get property again to check views
        get_res = self.session.get(f"{BASE_URL}/api/agentapex/properties/{internal_id}", headers=self.auth_headers)
        new_views = get_res.json().get("views", 0)
        
        assert new_views > initial_views, f"Views should have incremented. Initial: {initial_views}, New: {new_views}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{internal_id}", headers=self.auth_headers)
    
    # ==================== IMAGE MANAGEMENT ====================
    
    def test_set_cover_image(self):
        """PUT /api/agentapex/properties/{id}/cover-image?index=0 sets cover image"""
        # Create property with images
        payload = {
            "property_type": "Plot",
            "price": 40,
            "price_unit": "Lakhs",
            "area": 300,
            "area_unit": "Sq. Yards",
            "location": "Cover Image Test",
            "latitude": 17.385,
            "longitude": 78.486,
            "images": ["/api/agentapex/files/test1", "/api/agentapex/files/test2"]
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_id = create_res.json()["id"]
        
        # Set cover image to index 1
        res = self.session.put(
            f"{BASE_URL}/api/agentapex/properties/{prop_id}/cover-image?index=1",
            headers=self.auth_headers
        )
        assert res.status_code == 200, f"Failed to set cover image: {res.text}"
        data = res.json()
        assert data["cover_image_index"] == 1, f"cover_image_index should be 1, got {data['cover_image_index']}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{prop_id}", headers=self.auth_headers)
    
    def test_set_cover_image_invalid_index(self):
        """PUT /api/agentapex/properties/{id}/cover-image with invalid index returns 400"""
        # Create property with 1 image
        payload = {
            "property_type": "Plot",
            "price": 40,
            "price_unit": "Lakhs",
            "area": 300,
            "area_unit": "Sq. Yards",
            "location": "Invalid Cover Test",
            "latitude": 17.385,
            "longitude": 78.486,
            "images": ["/api/agentapex/files/test1"]
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_id = create_res.json()["id"]
        
        # Try to set cover to invalid index
        res = self.session.put(
            f"{BASE_URL}/api/agentapex/properties/{prop_id}/cover-image?index=5",
            headers=self.auth_headers
        )
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{prop_id}", headers=self.auth_headers)
    
    def test_reorder_images(self):
        """PUT /api/agentapex/properties/{id}/reorder-images reorders images array"""
        # Create property with images
        payload = {
            "property_type": "Plot",
            "price": 45,
            "price_unit": "Lakhs",
            "area": 350,
            "area_unit": "Sq. Yards",
            "location": "Reorder Test",
            "latitude": 17.385,
            "longitude": 78.486,
            "images": ["/api/agentapex/files/img1", "/api/agentapex/files/img2", "/api/agentapex/files/img3"]
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_id = create_res.json()["id"]
        
        # Reorder images
        new_order = ["/api/agentapex/files/img3", "/api/agentapex/files/img1", "/api/agentapex/files/img2"]
        res = self.session.put(
            f"{BASE_URL}/api/agentapex/properties/{prop_id}/reorder-images",
            json={"images": new_order},
            headers=self.auth_headers
        )
        assert res.status_code == 200, f"Failed to reorder images: {res.text}"
        data = res.json()
        assert data["images"] == new_order, f"Images not reordered correctly"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{prop_id}", headers=self.auth_headers)
    
    def test_delete_property_image_by_index(self):
        """DELETE /api/agentapex/properties/{id}/images/{index} deletes specific image"""
        # Create property with images
        payload = {
            "property_type": "Plot",
            "price": 50,
            "price_unit": "Lakhs",
            "area": 400,
            "area_unit": "Sq. Yards",
            "location": "Delete Image Test",
            "latitude": 17.385,
            "longitude": 78.486,
            "images": ["/api/agentapex/files/del1", "/api/agentapex/files/del2", "/api/agentapex/files/del3"]
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_id = create_res.json()["id"]
        
        # Delete image at index 1
        res = self.session.delete(
            f"{BASE_URL}/api/agentapex/properties/{prop_id}/images/1",
            headers=self.auth_headers
        )
        assert res.status_code == 200, f"Failed to delete image: {res.text}"
        data = res.json()
        assert len(data["images"]) == 2, f"Should have 2 images after delete, got {len(data['images'])}"
        assert "/api/agentapex/files/del2" not in data["images"], "Deleted image should not be in list"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{prop_id}", headers=self.auth_headers)
    
    # ==================== SHARE DATA ====================
    
    def test_get_share_data(self):
        """GET /api/agentapex/properties/{id}/share-data returns property_id, agent designation"""
        # Create property
        payload = {
            "property_type": "Villa",
            "price": 100,
            "price_unit": "Lakhs",
            "area": 2000,
            "area_unit": "Sq. Ft.",
            "location": "Share Data Test",
            "latitude": 17.385,
            "longitude": 78.486
        }
        create_res = self.session.post(f"{BASE_URL}/api/agentapex/properties", json=payload, headers=self.auth_headers)
        prop_id = create_res.json()["id"]
        
        # Get share data
        res = self.session.get(
            f"{BASE_URL}/api/agentapex/properties/{prop_id}/share-data",
            headers=self.auth_headers
        )
        assert res.status_code == 200, f"Failed to get share data: {res.text}"
        data = res.json()
        
        # Verify structure
        assert "property" in data, "Response should contain 'property'"
        assert "agent" in data, "Response should contain 'agent'"
        
        # Verify property data
        assert "property_id" in data["property"], "property should have property_id"
        assert data["property"]["property_id"].startswith("AX-V-"), f"Villa should have AX-V- prefix"
        assert "type" in data["property"], "property should have type"
        assert "price" in data["property"], "property should have price"
        assert "location" in data["property"], "property should have location"
        
        # Verify agent data
        assert "name" in data["agent"], "agent should have name"
        assert "designation" in data["agent"], "agent should have designation"
        # Designation should be "AgentApex Property Advisor" or custom
        assert data["agent"]["designation"], "agent designation should not be empty"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/agentapex/properties/{prop_id}", headers=self.auth_headers)
    
    # ==================== MIGRATION ENDPOINT ====================
    
    def test_migrate_property_ids(self):
        """POST /api/agentapex/migrate/property-ids assigns IDs to existing properties"""
        res = self.session.post(f"{BASE_URL}/api/agentapex/migrate/property-ids")
        assert res.status_code == 200, f"Migration failed: {res.text}"
        data = res.json()
        assert "message" in data, "Response should contain message"
        assert "count" in data, "Response should contain count"
        # Count can be 0 if all properties already have IDs
        assert isinstance(data["count"], int), "count should be integer"
    
    # ==================== MY PROPERTIES WITH PROPERTY ID ====================
    
    def test_my_properties_include_property_id(self):
        """GET /api/agentapex/properties/my returns properties with property_id"""
        res = self.session.get(f"{BASE_URL}/api/agentapex/properties/my", headers=self.auth_headers)
        assert res.status_code == 200, f"Failed to get my properties: {res.text}"
        data = res.json()
        
        # If there are properties, check they have property_id
        if len(data) > 0:
            for prop in data:
                # property_id might be None for very old properties, but should exist
                assert "property_id" in prop, f"Property {prop.get('id')} missing property_id field"


class TestSearchPropertyPublicAccess:
    """Test that search-by-id is a public endpoint (no auth required)"""
    
    def test_search_by_id_no_auth_required(self):
        """Search by property ID should work without authentication"""
        session = requests.Session()
        
        # First get a valid property ID (need auth for this)
        otp_res = session.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        demo_otp = otp_res.json().get("demo_otp")
        verify_res = session.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={"phone": TEST_PHONE, "otp": demo_otp})
        token = verify_res.json().get("token")
        
        # Get existing properties
        props_res = session.get(f"{BASE_URL}/api/agentapex/properties/my", headers={"Authorization": f"Bearer {token}"})
        if props_res.status_code == 200 and len(props_res.json()) > 0:
            prop = props_res.json()[0]
            if prop.get("property_id"):
                prop_id = prop["property_id"]
                
                # Now test without auth
                no_auth_session = requests.Session()
                res = no_auth_session.get(f"{BASE_URL}/api/agentapex/properties/search-by-id?property_id={prop_id}")
                assert res.status_code == 200, f"Public search should work without auth, got {res.status_code}"


class TestLeadCreationFromSearch:
    """Test lead creation from search results"""
    
    def test_create_lead_from_search_result(self):
        """Leads can be created for properties found via search"""
        session = requests.Session()
        
        # Get auth
        otp_res = session.post(f"{BASE_URL}/api/agentapex/auth/send-otp", json={"phone": TEST_PHONE})
        demo_otp = otp_res.json().get("demo_otp")
        verify_res = session.post(f"{BASE_URL}/api/agentapex/auth/verify-otp", json={"phone": TEST_PHONE, "otp": demo_otp})
        token = verify_res.json().get("token")
        
        # Create a property
        payload = {
            "property_type": "Plot",
            "price": 60,
            "price_unit": "Lakhs",
            "area": 500,
            "area_unit": "Sq. Yards",
            "location": "Lead Test Location",
            "latitude": 17.385,
            "longitude": 78.486
        }
        create_res = session.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        prop_data = create_res.json()
        internal_id = prop_data["id"]
        
        # Create lead (no auth required for lead creation)
        lead_payload = {
            "property_id": internal_id,
            "buyer_name": "TEST_Lead_Buyer",
            "buyer_phone": "9876543210",
            "message": "Interested in this property from search"
        }
        lead_res = session.post(f"{BASE_URL}/api/agentapex/leads", json=lead_payload)
        assert lead_res.status_code == 200, f"Failed to create lead: {lead_res.text}"
        lead_data = lead_res.json()
        assert lead_data["buyer_name"] == "TEST_Lead_Buyer"
        assert lead_data["property_id"] == internal_id
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/agentapex/properties/{internal_id}", headers={"Authorization": f"Bearer {token}"})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
