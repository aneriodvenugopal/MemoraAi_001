"""
Comprehensive P2 Features Test Suite
Tests: Resale/Release System, EMI Payment Module, Receipt Generation, Vendor Management
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "rajam@retoerp.com"
TEST_PASSWORD = "12345678"

# Known test data from previous iterations
KNOWN_PAYMENT_ID = "67642298-f3cd-46c4-9c33-fbd9ccd83b3f"
KNOWN_BOOKING_ID = "5d3f65ac-6be8-4913-9a42-f2a6f2fa8e37"
KNOWN_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


# ==================== RESALE/RELEASE SYSTEM TESTS ====================

class TestResaleReleaseSystem:
    """Tests for Resale/Release Management"""
    
    def test_releases_requires_auth(self):
        """Test releases endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/resale-release/releases")
        assert response.status_code == 401
    
    def test_get_releases_list(self, headers):
        """Test getting releases list"""
        response = requests.get(f"{BASE_URL}/api/resale-release/releases", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "releases" in data
        assert "total" in data
    
    def test_get_releases_with_project_filter(self, headers):
        """Test releases with project filter"""
        response = requests.get(
            f"{BASE_URL}/api/resale-release/releases?project_id={KNOWN_PROJECT_ID}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_create_release(self, headers):
        """Test creating a property release"""
        release_data = {
            "project_id": KNOWN_PROJECT_ID,
            "property_id": f"TEST-PROP-{uuid.uuid4().hex[:8]}",
            "previous_customer_name": "TEST_Customer",
            "release_reason": "customer_request",
            "release_notes": "Test release for P2 comprehensive testing",
            "refund_amount": 50000,
            "deduction_amount": 5000,
            "deduction_reason": "Processing fee"
        }
        response = requests.post(
            f"{BASE_URL}/api/resale-release/releases",
            headers=headers,
            json=release_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "release" in data
        assert data["release"]["release_reason"] == "customer_request"
    
    def test_resales_requires_auth(self):
        """Test resales endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales")
        assert response.status_code == 401
    
    def test_get_resales_list(self, headers):
        """Test getting resales list"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "resales" in data
        assert "total" in data
    
    def test_get_resales_with_status_filter(self, headers):
        """Test resales with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/resale-release/resales?status=pending_approval",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_resale_stats(self, headers):
        """Test resale statistics API"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total" in data
        assert "by_status" in data
        assert "total_commission_earned" in data
    
    def test_get_listed_resales(self, headers):
        """Test getting publicly listed resales"""
        response = requests.get(f"{BASE_URL}/api/resale-release/resales/listed", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "resales" in data


# ==================== EMI PAYMENT MODULE TESTS ====================

class TestEMIPaymentModule:
    """Tests for EMI Payment Management"""
    
    def test_emi_stats_requires_auth(self):
        """Test EMI stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/stats")
        assert response.status_code == 401
    
    def test_get_emi_stats(self, headers):
        """Test EMI statistics with collection rate"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "total_emis" in stats
        assert "total_paid" in stats
        assert "total_pending" in stats
        assert "collection_rate" in stats
        assert "overdue_count" in stats
        assert "total_late_fees" in stats
    
    def test_get_emi_schedules(self, headers):
        """Test getting EMI schedules"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/schedules", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "schedules" in data
        assert "total" in data
    
    def test_get_emi_schedules_with_filters(self, headers):
        """Test EMI schedules with filters"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/schedules?status=pending",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_get_booking_emi_schedule(self, headers):
        """Test getting EMI schedule for a specific booking"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/schedules/booking/{KNOWN_BOOKING_ID}",
            headers=headers
        )
        # May return 404 if no EMI schedule exists for this booking
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert "summary" in data
            assert "schedules" in data
    
    def test_get_overdue_emis(self, headers):
        """Test getting overdue EMIs list"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/overdue", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "overdue_emis" in data
        assert "total" in data
        assert "total_overdue_amount" in data
    
    def test_get_due_soon_emis(self, headers):
        """Test getting EMIs due soon"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/due-soon?days=7", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "due_soon" in data
        assert "count" in data
        assert "total_amount" in data
    
    def test_waive_late_fee_requires_admin(self, headers):
        """Test waive late fee requires admin role"""
        # This should work for tenant_admin
        response = requests.post(
            f"{BASE_URL}/api/emi-payments/late-fees/waive",
            headers=headers,
            json={
                "emi_id": "non-existent-id",
                "reason": "Test waiver"
            }
        )
        # Should return 404 (not found) not 403 (forbidden) since user is admin
        assert response.status_code in [400, 404]


# ==================== RECEIPT GENERATION TESTS ====================

class TestReceiptGeneration:
    """Tests for Receipt Generation"""
    
    def test_receipt_requires_auth(self):
        """Test receipt generation requires authentication"""
        response = requests.get(f"{BASE_URL}/api/receipts/payment/{KNOWN_PAYMENT_ID}")
        assert response.status_code == 401
    
    def test_generate_payment_receipt_pdf(self, headers):
        """Test generating payment receipt PDF"""
        response = requests.get(
            f"{BASE_URL}/api/receipts/payment/{KNOWN_PAYMENT_ID}",
            headers=headers
        )
        # May return 404 if payment doesn't exist
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            assert len(response.content) > 0
    
    def test_generate_emi_schedule_pdf(self, headers):
        """Test generating EMI schedule PDF"""
        response = requests.get(
            f"{BASE_URL}/api/receipts/emi-schedule/{KNOWN_BOOKING_ID}",
            headers=headers
        )
        # May return 404 if no EMI schedule exists
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            assert len(response.content) > 0
    
    def test_receipt_history(self, headers):
        """Test receipt history API"""
        response = requests.get(f"{BASE_URL}/api/receipts/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "receipts" in data
        assert "total" in data
    
    def test_regenerate_receipt(self, headers):
        """Test regenerating receipt with new number"""
        response = requests.post(
            f"{BASE_URL}/api/receipts/regenerate/{KNOWN_PAYMENT_ID}",
            headers=headers
        )
        # May return 200 even if payment not found (just no modification)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "new_receipt_number" in data


# ==================== VENDOR MANAGEMENT TESTS ====================

class TestVendorManagement:
    """Tests for Vendor Management"""
    
    created_vendor_id = None
    created_bill_id = None
    
    def test_vendor_stats_requires_auth(self):
        """Test vendor stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/stats")
        assert response.status_code == 401
    
    def test_get_vendor_stats(self, headers):
        """Test vendor statistics API"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "total_vendors" in stats
        assert "active_vendors" in stats
        assert "total_billed" in stats
        assert "total_paid" in stats
        assert "total_outstanding" in stats
    
    def test_create_vendor(self, headers):
        """Test creating a vendor with all fields"""
        vendor_data = {
            "name": f"TEST_Vendor_{uuid.uuid4().hex[:6]}",
            "company_name": "Test Company Ltd",
            "category": "construction",
            "phone": f"98765{uuid.uuid4().hex[:5]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@vendor.com",
            "address": "123 Test Street",
            "city": "Mumbai",
            "gstin": "27AABCU9603R1ZM",
            "pan": "AABCU9603R",
            "bank_name": "Test Bank",
            "bank_account": "1234567890",
            "ifsc_code": "TEST0001234",
            "notes": "Test vendor for P2 comprehensive testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers,
            json=vendor_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "vendor" in data
        TestVendorManagement.created_vendor_id = data["vendor"]["id"]
    
    def test_get_vendors_list(self, headers):
        """Test getting vendors list"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/vendors", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "vendors" in data
        assert "total" in data
    
    def test_get_vendors_with_search(self, headers):
        """Test vendors with search filter"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors?search=TEST",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_get_vendors_with_category_filter(self, headers):
        """Test vendors with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors?category=construction",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_update_vendor(self, headers):
        """Test updating vendor details"""
        if not TestVendorManagement.created_vendor_id:
            pytest.skip("No vendor created to update")
        
        update_data = {
            "company_name": "Updated Test Company",
            "notes": "Updated notes"
        }
        response = requests.put(
            f"{BASE_URL}/api/vendor-management/vendors/{TestVendorManagement.created_vendor_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_create_vendor_bill(self, headers):
        """Test creating a vendor bill"""
        if not TestVendorManagement.created_vendor_id:
            pytest.skip("No vendor created for bill")
        
        bill_data = {
            "vendor_id": TestVendorManagement.created_vendor_id,
            "bill_number": f"TEST-BILL-{uuid.uuid4().hex[:6]}",
            "bill_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "amount": 50000,
            "tax_amount": 9000,
            "description": "Test bill for P2 comprehensive testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/bills",
            headers=headers,
            json=bill_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "bill" in data
        assert data["bill"]["total_amount"] == 59000  # amount + tax
        TestVendorManagement.created_bill_id = data["bill"]["id"]
    
    def test_get_bills_list(self, headers):
        """Test getting bills list"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/bills", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "bills" in data
        assert "total" in data
    
    def test_record_vendor_payment(self, headers):
        """Test recording payment to vendor"""
        if not TestVendorManagement.created_vendor_id or not TestVendorManagement.created_bill_id:
            pytest.skip("No vendor/bill created for payment")
        
        payment_data = {
            "vendor_id": TestVendorManagement.created_vendor_id,
            "bill_id": TestVendorManagement.created_bill_id,
            "amount": 30000,
            "payment_method": "bank_transfer",
            "reference_number": f"REF-{uuid.uuid4().hex[:8]}",
            "description": "Partial payment for test bill"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/payments",
            headers=headers,
            json=payment_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "payment" in data
    
    def test_bill_status_updates_after_payment(self, headers):
        """Test bill status updates to partial after payment"""
        if not TestVendorManagement.created_bill_id:
            pytest.skip("No bill created to check")
        
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/bills/{TestVendorManagement.created_bill_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Bill should be partial since we paid 30000 of 59000
        assert data["bill"]["status"] == "partial"
        assert data["bill"]["paid_amount"] == 30000
    
    def test_get_payments_list(self, headers):
        """Test getting payments list"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/payments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "payments" in data
        assert "total" in data
    
    def test_get_vendor_details(self, headers):
        """Test getting single vendor details with bills and payments"""
        if not TestVendorManagement.created_vendor_id:
            pytest.skip("No vendor created to view")
        
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors/{TestVendorManagement.created_vendor_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "vendor" in data
        assert "bills" in data
        assert "payments" in data
        assert "summary" in data
    
    def test_delete_vendor_with_pending_bills_fails(self, headers):
        """Test deleting vendor with pending bills fails"""
        if not TestVendorManagement.created_vendor_id:
            pytest.skip("No vendor created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/vendor-management/vendors/{TestVendorManagement.created_vendor_id}",
            headers=headers
        )
        # Should fail because vendor has pending bills
        assert response.status_code == 400
        data = response.json()
        assert "pending bills" in data.get("detail", "").lower()


# ==================== INTEGRATION TESTS ====================

class TestP2Integration:
    """Integration tests across P2 modules"""
    
    def test_all_p2_pages_accessible(self, headers):
        """Test all P2 API endpoints are accessible"""
        endpoints = [
            "/api/resale-release/releases",
            "/api/resale-release/resales",
            "/api/resale-release/resales/stats",
            "/api/emi-payments/stats",
            "/api/emi-payments/schedules",
            "/api/emi-payments/overdue",
            "/api/emi-payments/due-soon",
            "/api/receipts/history",
            "/api/vendor-management/stats",
            "/api/vendor-management/vendors",
            "/api/vendor-management/bills",
            "/api/vendor-management/payments"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 200, f"Failed for {endpoint}: {response.status_code}"
    
    def test_stats_consistency(self, headers):
        """Test stats are consistent across modules"""
        # Get vendor stats
        vendor_stats = requests.get(
            f"{BASE_URL}/api/vendor-management/stats",
            headers=headers
        ).json()
        
        # Get EMI stats
        emi_stats = requests.get(
            f"{BASE_URL}/api/emi-payments/stats",
            headers=headers
        ).json()
        
        # Get resale stats
        resale_stats = requests.get(
            f"{BASE_URL}/api/resale-release/resales/stats",
            headers=headers
        ).json()
        
        # All should return success
        assert vendor_stats["success"] == True
        assert emi_stats["success"] == True
        assert resale_stats["success"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
