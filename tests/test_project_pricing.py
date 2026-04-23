"""
Test Project Pricing Configuration APIs
Tests unit pricing, booking amounts, additional charges, and price calculations
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"
TEST_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"
TEST_PROPERTY_ID = "3f61fcf3-dbff-44d3-8ea3-c49452b78dc5"


class TestProjectPricingAPIs:
    """Test Project Pricing Configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    # ==================== Unit Types API ====================
    
    def test_get_unit_types(self):
        """GET /api/project-pricing/unit-types - Get available unit types"""
        response = self.session.get(f"{BASE_URL}/api/project-pricing/unit-types")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unit_types" in data, "Response should contain 'unit_types' key"
        
        unit_types = data["unit_types"]
        assert isinstance(unit_types, list), "unit_types should be a list"
        assert len(unit_types) > 0, "Should have at least one unit type"
        
        # Verify structure of unit types
        first_unit = unit_types[0]
        assert "value" in first_unit, "Unit type should have 'value'"
        assert "label" in first_unit, "Unit type should have 'label'"
        
        # Check for common Indian real estate units
        unit_values = [u["value"] for u in unit_types]
        assert "sq.yard" in unit_values, "Should include sq.yard"
        assert "sq.ft" in unit_values, "Should include sq.ft"
        print(f"✓ Found {len(unit_types)} unit types: {unit_values}")
    
    # ==================== Charge Presets API ====================
    
    def test_get_charge_presets(self):
        """GET /api/project-pricing/charge-presets - Get preset additional charges"""
        response = self.session.get(f"{BASE_URL}/api/project-pricing/charge-presets")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "presets" in data, "Response should contain 'presets' key"
        
        presets = data["presets"]
        assert isinstance(presets, list), "presets should be a list"
        assert len(presets) > 0, "Should have at least one preset"
        
        # Verify structure
        first_preset = presets[0]
        assert "label" in first_preset, "Preset should have 'label'"
        assert "charge_type" in first_preset, "Preset should have 'charge_type'"
        assert "value" in first_preset, "Preset should have 'value'"
        
        # Check for common charges
        preset_labels = [p["label"] for p in presets]
        assert "Registration Charges" in preset_labels, "Should include Registration Charges"
        print(f"✓ Found {len(presets)} charge presets: {preset_labels[:5]}...")
    
    # ==================== Project Pricing Config API ====================
    
    def test_get_project_pricing_config(self):
        """GET /api/project-pricing/project/{id} - Get pricing config for project"""
        response = self.session.get(f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "project_id" in data or "unit_type" in data, "Response should have pricing config fields"
        assert "unit_type" in data, "Should have unit_type"
        assert "base_price_per_unit" in data, "Should have base_price_per_unit"
        assert "booking_amount_type" in data, "Should have booking_amount_type"
        assert "booking_amount_value" in data, "Should have booking_amount_value"
        
        print(f"✓ Project pricing config: unit_type={data.get('unit_type')}, base_price={data.get('base_price_per_unit')}")
        print(f"  Booking: {data.get('booking_amount_type')} - {data.get('booking_amount_value')}")
        print(f"  Additional charges: {len(data.get('additional_charges', []))}")
    
    def test_get_project_pricing_nonexistent_project(self):
        """GET /api/project-pricing/project/{id} - Should return 404 for non-existent project"""
        fake_project_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/project-pricing/project/{fake_project_id}")
        
        assert response.status_code == 404, f"Expected 404 for non-existent project, got {response.status_code}"
        print("✓ Returns 404 for non-existent project")
    
    # ==================== Create/Update Pricing Config ====================
    
    def test_create_or_update_project_pricing(self):
        """POST /api/project-pricing/project/{id} - Create/update pricing config"""
        config_data = {
            "unit_type": "sq.yard",
            "unit_label": "Sq. Yard",
            "base_price_per_unit": 10000,
            "booking_amount_type": "fixed",
            "booking_amount_value": 5000,
            "additional_charges": [
                {
                    "id": str(uuid.uuid4()),
                    "label": "Registration Charges",
                    "charge_type": "percentage",
                    "value": 6,
                    "is_mandatory": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "label": "Documentation Fee",
                    "charge_type": "fixed",
                    "value": 5000,
                    "is_mandatory": True
                }
            ],
            "apply_gst": False,
            "gst_percentage": 0,
            "allow_property_override": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}",
            json=config_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "config" in data, "Response should have config"
        
        config = data["config"]
        assert config["unit_type"] == "sq.yard", "Unit type should be sq.yard"
        assert config["base_price_per_unit"] == 10000, "Base price should be 10000"
        
        print(f"✓ Pricing config saved: {data['message']}")
    
    def test_partial_update_project_pricing(self):
        """PATCH /api/project-pricing/project/{id} - Partial update pricing config"""
        update_data = {
            "base_price_per_unit": 12000
        }
        
        response = self.session.patch(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "config" in data, "Response should have config"
        assert data["config"]["base_price_per_unit"] == 12000, "Base price should be updated to 12000"
        
        print(f"✓ Partial update successful: base_price_per_unit = {data['config']['base_price_per_unit']}")
        
        # Restore original value
        self.session.patch(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}",
            json={"base_price_per_unit": 10000}
        )
    
    # ==================== Additional Charges Management ====================
    
    def test_add_additional_charge(self):
        """POST /api/project-pricing/project/{id}/charges - Add additional charge"""
        charge_data = {
            "id": str(uuid.uuid4()),
            "label": "TEST_Legal Charges",
            "charge_type": "fixed",
            "value": 10000,
            "is_mandatory": True,
            "description": "Test legal charges"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}/charges",
            json=charge_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "charge" in data, "Response should have charge"
        assert data["charge"]["label"] == "TEST_Legal Charges", "Charge label should match"
        
        print(f"✓ Additional charge added: {data['charge']['label']}")
        
        # Store charge ID for cleanup
        self.test_charge_id = charge_data["id"]
    
    def test_remove_additional_charge(self):
        """DELETE /api/project-pricing/project/{id}/charges/{charge_id} - Remove charge"""
        # First add a charge to remove
        charge_id = str(uuid.uuid4())
        charge_data = {
            "id": charge_id,
            "label": "TEST_Temp Charge",
            "charge_type": "fixed",
            "value": 1000
        }
        
        add_response = self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}/charges",
            json=charge_data
        )
        assert add_response.status_code == 200, "Failed to add charge for removal test"
        
        # Now remove it
        response = self.session.delete(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}/charges/{charge_id}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        
        print(f"✓ Additional charge removed successfully")
    
    # ==================== Price Breakdown API ====================
    
    def test_get_property_price_breakdown(self):
        """GET /api/project-pricing/property/{id}/breakdown - Calculate price breakdown"""
        response = self.session.get(
            f"{BASE_URL}/api/project-pricing/property/{TEST_PROPERTY_ID}/breakdown"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify breakdown structure
        assert "property_id" in data, "Should have property_id"
        assert "area" in data, "Should have area"
        assert "base_price_per_unit" in data, "Should have base_price_per_unit"
        assert "base_cost" in data, "Should have base_cost"
        assert "total_property_cost" in data, "Should have total_property_cost"
        assert "calculated_booking_amount" in data, "Should have calculated_booking_amount"
        assert "balance_amount" in data, "Should have balance_amount"
        
        # Verify calculations make sense
        assert data["base_cost"] == data["area"] * data["base_price_per_unit"], \
            "Base cost should equal area × base_price_per_unit"
        
        print(f"✓ Price breakdown for property {TEST_PROPERTY_ID}:")
        print(f"  Area: {data['area']} {data.get('unit_label', 'units')}")
        print(f"  Base cost: ₹{data['base_cost']:,.2f}")
        print(f"  Additional charges: ₹{data.get('total_additional_charges', 0):,.2f}")
        print(f"  Total: ₹{data['total_property_cost']:,.2f}")
        print(f"  Booking amount: ₹{data['calculated_booking_amount']:,.2f}")
    
    def test_get_property_breakdown_nonexistent(self):
        """GET /api/project-pricing/property/{id}/breakdown - Should return 404 for non-existent property"""
        fake_property_id = str(uuid.uuid4())
        response = self.session.get(
            f"{BASE_URL}/api/project-pricing/property/{fake_property_id}/breakdown"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent property, got {response.status_code}"
        print("✓ Returns 404 for non-existent property")
    
    # ==================== Apply to Properties API ====================
    
    def test_apply_pricing_to_properties(self):
        """POST /api/project-pricing/project/{id}/apply-to-properties - Apply pricing to all properties"""
        response = self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}/apply-to-properties"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "updated_count" in data, "Response should have updated_count"
        
        print(f"✓ Applied pricing to {data['updated_count']} properties")
    
    # ==================== Booking Amount Type Tests ====================
    
    def test_booking_amount_percentage_type(self):
        """Test booking amount with percentage type"""
        config_data = {
            "unit_type": "sq.yard",
            "unit_label": "Sq. Yard",
            "base_price_per_unit": 10000,
            "booking_amount_type": "percentage",
            "booking_amount_value": 10,  # 10% of total
            "min_booking_amount": 50000,
            "max_booking_amount": 500000,
            "additional_charges": [],
            "apply_gst": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}",
            json=config_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        config = data["config"]
        assert config["booking_amount_type"] == "percentage", "Booking type should be percentage"
        assert config["booking_amount_value"] == 10, "Booking value should be 10%"
        
        print(f"✓ Percentage booking amount configured: {config['booking_amount_value']}%")
        print(f"  Min: ₹{config.get('min_booking_amount', 'N/A')}, Max: ₹{config.get('max_booking_amount', 'N/A')}")
        
        # Restore to fixed
        self.session.post(
            f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}",
            json={
                "unit_type": "sq.yard",
                "unit_label": "Sq. Yard",
                "base_price_per_unit": 10000,
                "booking_amount_type": "fixed",
                "booking_amount_value": 5000,
                "additional_charges": [
                    {"id": str(uuid.uuid4()), "label": "Registration Charges", "charge_type": "percentage", "value": 6},
                    {"id": str(uuid.uuid4()), "label": "Documentation Fee", "charge_type": "fixed", "value": 5000}
                ]
            }
        )
    
    # ==================== Cleanup ====================
    
    def test_cleanup_test_charges(self):
        """Cleanup: Remove TEST_ prefixed charges"""
        # Get current config
        response = self.session.get(f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}")
        if response.status_code == 200:
            config = response.json()
            charges = config.get("additional_charges", [])
            
            # Remove TEST_ charges
            for charge in charges:
                if charge.get("label", "").startswith("TEST_"):
                    self.session.delete(
                        f"{BASE_URL}/api/project-pricing/project/{TEST_PROJECT_ID}/charges/{charge['id']}"
                    )
                    print(f"  Cleaned up: {charge['label']}")
        
        print("✓ Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
