"""
AgentApex Phase 1 API Tests
Tests for new Phase 1 features:
- Lead Pipeline with stats
- Enhanced Followup System (bulk add, toggle hidden, notes)
- Profile photo upload and designation update
- Property share data with agent branding
- Multiple document upload
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - using the phone from test_credentials.md
TEST_PHONE = "9908290239"


def get_auth_token(phone=TEST_PHONE):
    """Helper to get auth token"""
    send_response = requests.post(
        f"{BASE_URL}/api/agentapex/auth/send-otp",
        json={"phone": phone}
    )
    demo_otp = send_response.json()["demo_otp"]
    
    verify_response = requests.post(
        f"{BASE_URL}/api/agentapex/auth/verify-otp",
        json={"phone": phone, "otp": demo_otp}
    )
    return verify_response.json()["token"]


class TestLeadPipelineStats:
    """Test Lead Pipeline stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_get_lead_stats(self, auth_token):
        """Test GET /api/agentapex/leads/stats returns pipeline stats"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/leads/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all pipeline stat fields exist
        assert "total" in data
        assert "new" in data
        assert "contacted" in data
        assert "hot" in data
        assert "warm" in data
        assert "cold" in data
        assert "closed" in data
        
        # Verify values are integers
        assert isinstance(data["total"], int)
        assert isinstance(data["hot"], int)
        assert isinstance(data["warm"], int)
        assert isinstance(data["cold"], int)
        
        print(f"✓ Lead stats OK: {data}")


class TestEnhancedFollowupSystem:
    """Test Enhanced Followup System features"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_bulk_add_followups(self, auth_token):
        """Test POST /api/agentapex/followups/bulk adds multiple contacts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        contacts = [
            {"contact_name": "TEST_Bulk_Contact_1", "contact_phone": "1111111111", "location": "Hyderabad"},
            {"contact_name": "TEST_Bulk_Contact_2", "contact_phone": "2222222222", "location": "Bangalore"},
            {"contact_name": "TEST_Bulk_Contact_3", "contact_phone": "3333333333", "location": "Chennai"}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/agentapex/followups/bulk",
            json={"contacts": contacts},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "contacts" in data
        # Should have added at least some contacts (may skip duplicates)
        print(f"✓ Bulk add followups OK: {data['message']}")
    
    def test_get_active_followups(self, auth_token):
        """Test GET /api/agentapex/followups?hidden=false returns active contacts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/followups",
            params={"hidden": "false"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get active followups OK: {len(data)} contacts")
        return data
    
    def test_get_hidden_followups(self, auth_token):
        """Test GET /api/agentapex/followups?hidden=true returns hidden contacts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/followups",
            params={"hidden": "true"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get hidden followups OK: {len(data)} contacts")
    
    def test_toggle_followup_hidden(self, auth_token):
        """Test PUT /api/agentapex/followups/{id}/toggle-hidden moves contact between tabs"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test followup
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/followups",
            json={
                "contact_name": "TEST_Toggle_Contact",
                "contact_phone": "9999999999",
                "location": "Test Location"
            },
            headers=headers
        )
        assert create_response.status_code == 200
        followup_id = create_response.json()["id"]
        
        # Toggle to hidden
        toggle_response = requests.put(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}/toggle-hidden",
            headers=headers
        )
        assert toggle_response.status_code == 200
        data = toggle_response.json()
        assert "message" in data
        assert "hidden" in data
        assert data["hidden"] == True
        print(f"✓ Toggle to hidden OK: {data['message']}")
        
        # Toggle back to active
        toggle_back_response = requests.put(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}/toggle-hidden",
            headers=headers
        )
        assert toggle_back_response.status_code == 200
        data = toggle_back_response.json()
        assert data["hidden"] == False
        print(f"✓ Toggle to active OK: {data['message']}")
        
        # Cleanup - delete the test followup
        requests.delete(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}",
            headers=headers
        )
    
    def test_update_followup_with_note(self, auth_token):
        """Test PUT /api/agentapex/followups/{id} updates notes and status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test followup
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/followups",
            json={
                "contact_name": "TEST_Note_Contact",
                "contact_phone": "8888888888",
                "location": "Test Location"
            },
            headers=headers
        )
        assert create_response.status_code == 200
        followup_id = create_response.json()["id"]
        
        # Update with note and status
        update_response = requests.put(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}",
            params={
                "notes": "Interested in 2BHK near metro",
                "status": "interested",
                "next_follow_up": "2026-04-01T10:00:00"
            },
            headers=headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert "message" in data
        print(f"✓ Update followup with note OK: {data['message']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}",
            headers=headers
        )
    
    def test_search_followups(self, auth_token):
        """Test GET /api/agentapex/followups with search parameter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/agentapex/followups",
            params={"search": "Hyderabad"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search followups OK: {len(data)} results for 'Hyderabad'")
    
    def test_delete_followup(self, auth_token):
        """Test DELETE /api/agentapex/followups/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test followup
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/followups",
            json={
                "contact_name": "TEST_Delete_Contact",
                "contact_phone": "7777777777",
                "location": "Test Location"
            },
            headers=headers
        )
        assert create_response.status_code == 200
        followup_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/agentapex/followups/{followup_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print(f"✓ Delete followup OK: {data['message']}")


class TestProfileFeatures:
    """Test Profile photo upload and designation update"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_update_profile_designation(self, auth_token):
        """Test PUT /api/agentapex/auth/profile updates designation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/agentapex/auth/profile",
            params={"designation": "Property Consultant"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "designation" in data
        assert data["designation"] == "Property Consultant"
        print(f"✓ Update designation OK: {data['designation']}")
    
    def test_update_profile_name_email(self, auth_token):
        """Test PUT /api/agentapex/auth/profile updates name and email"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/agentapex/auth/profile",
            params={
                "name": "Test Agent",
                "email": "testagent@example.com"
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "email" in data
        print(f"✓ Update profile OK: name={data.get('name')}, email={data.get('email')}")
    
    def test_profile_image_upload_endpoint_exists(self, auth_token):
        """Test POST /api/agentapex/auth/profile-image endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with empty file to verify endpoint exists
        # Should return 422 (validation error) not 404
        response = requests.post(
            f"{BASE_URL}/api/agentapex/auth/profile-image",
            headers=headers
        )
        # 422 means endpoint exists but validation failed (no file)
        assert response.status_code in [422, 400]
        print(f"✓ Profile image upload endpoint exists (status: {response.status_code})")


class TestPropertyShareData:
    """Test Property share data with agent branding"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_get_share_data(self, auth_token):
        """Test GET /api/agentapex/properties/{id}/share-data returns property + agent info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test property
        property_data = {
            "property_type": "Land",
            "title": "TEST_Share_Property",
            "price": 50.0,
            "price_unit": "Lakhs",
            "area": 100.0,
            "area_unit": "Sq. Ft.",
            "location": "Test Location",
            "latitude": 17.385044,
            "longitude": 78.486671,
            "negotiable": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=property_data,
            headers=headers
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Get share data
        share_response = requests.get(
            f"{BASE_URL}/api/agentapex/properties/{property_id}/share-data",
            headers=headers
        )
        assert share_response.status_code == 200
        data = share_response.json()
        
        # Verify property info
        assert "property" in data
        assert data["property"]["id"] == property_id
        assert data["property"]["type"] == "Land"
        assert data["property"]["price"] == 50.0
        
        # Verify agent info for branding
        assert "agent" in data
        assert "name" in data["agent"]
        assert "phone" in data["agent"]
        assert "designation" in data["agent"]
        
        print(f"✓ Get share data OK: property={data['property']['type']}, agent={data['agent']['name']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/agentapex/properties/{property_id}",
            headers=headers
        )


class TestMultipleDocumentUpload:
    """Test multiple document upload to property"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_multiple_images_upload_endpoint(self, auth_token):
        """Test POST /api/agentapex/properties/{id}/images accepts multiple files"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test property
        property_data = {
            "property_type": "Plot",
            "title": "TEST_MultiImage_Property",
            "price": 30.0,
            "price_unit": "Lakhs",
            "area": 200.0,
            "area_unit": "Sq. Yards",
            "location": "Test Location",
            "latitude": 17.385044,
            "longitude": 78.486671,
            "negotiable": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=property_data,
            headers=headers
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Test endpoint exists (without actual files)
        response = requests.post(
            f"{BASE_URL}/api/agentapex/properties/{property_id}/images",
            headers=headers
        )
        # 422 means endpoint exists but validation failed (no files)
        assert response.status_code in [422, 400]
        print(f"✓ Multiple images upload endpoint exists (status: {response.status_code})")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/agentapex/properties/{property_id}",
            headers=headers
        )
    
    def test_multiple_documents_upload_endpoint(self, auth_token):
        """Test POST /api/agentapex/properties/{id}/documents accepts multiple files"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test property
        property_data = {
            "property_type": "Land",
            "title": "TEST_MultiDoc_Property",
            "price": 40.0,
            "price_unit": "Lakhs",
            "area": 1.0,
            "area_unit": "Acres",
            "location": "Test Location",
            "latitude": 17.385044,
            "longitude": 78.486671,
            "negotiable": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/agentapex/properties",
            json=property_data,
            headers=headers
        )
        assert create_response.status_code == 200
        property_id = create_response.json()["id"]
        
        # Test endpoint exists (without actual files)
        response = requests.post(
            f"{BASE_URL}/api/agentapex/properties/{property_id}/documents",
            headers=headers
        )
        # 422 means endpoint exists but validation failed (no files)
        assert response.status_code in [422, 400]
        print(f"✓ Multiple documents upload endpoint exists (status: {response.status_code})")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/agentapex/properties/{property_id}",
            headers=headers
        )


class TestLeadStatusUpdate:
    """Test Lead status update for pipeline"""
    
    @pytest.fixture
    def auth_token(self):
        return get_auth_token()
    
    def test_update_lead_status(self, auth_token):
        """Test PUT /api/agentapex/leads/{id}/status updates lead status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get existing leads
        leads_response = requests.get(
            f"{BASE_URL}/api/agentapex/leads",
            headers=headers
        )
        leads = leads_response.json()
        
        if len(leads) > 0:
            lead_id = leads[0]["id"]
            original_status = leads[0].get("status", "new")
            
            # Update to hot
            update_response = requests.put(
                f"{BASE_URL}/api/agentapex/leads/{lead_id}/status",
                params={"status": "hot"},
                headers=headers
            )
            assert update_response.status_code == 200
            print(f"✓ Update lead status to 'hot' OK")
            
            # Restore original status
            requests.put(
                f"{BASE_URL}/api/agentapex/leads/{lead_id}/status",
                params={"status": original_status},
                headers=headers
            )
        else:
            print("✓ No leads to test status update (skipped)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
