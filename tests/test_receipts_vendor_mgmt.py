"""
Test Suite for P2 Features: Receipt Generation and Vendor Management
- Receipt Generation APIs (PDF generation for payments and EMI schedules)
- Vendor Management CRUD operations
- Bill Management
- Payment Recording
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "rajam@retoerp.com"


class TestReceiptGeneration:
    """Receipt Generation API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_payment_receipt_generation(self, headers):
        """Test payment receipt PDF generation"""
        payment_id = "67642298-f3cd-46c4-9c33-fbd9ccd83b3f"
        response = requests.get(
            f"{BASE_URL}/api/receipts/payment/{payment_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Receipt generation failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0, "PDF content is empty"
    
    def test_payment_receipt_download(self, headers):
        """Test payment receipt PDF download mode"""
        payment_id = "67642298-f3cd-46c4-9c33-fbd9ccd83b3f"
        response = requests.get(
            f"{BASE_URL}/api/receipts/payment/{payment_id}?download=true",
            headers=headers
        )
        assert response.status_code == 200
        assert "attachment" in response.headers.get("content-disposition", "")
    
    def test_emi_schedule_pdf_generation(self, headers):
        """Test EMI schedule PDF generation"""
        booking_id = "5d3f65ac-6be8-4913-9a42-f2a6f2fa8e37"
        response = requests.get(
            f"{BASE_URL}/api/receipts/emi-schedule/{booking_id}",
            headers=headers
        )
        assert response.status_code == 200, f"EMI schedule PDF failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0, "PDF content is empty"
    
    def test_receipt_history(self, headers):
        """Test receipt history API"""
        response = requests.get(
            f"{BASE_URL}/api/receipts/history",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "receipts" in data
        assert "total" in data
    
    def test_receipt_not_found(self, headers):
        """Test receipt generation with invalid payment ID"""
        response = requests.get(
            f"{BASE_URL}/api/receipts/payment/invalid-payment-id",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_receipt_requires_auth(self):
        """Test receipt generation requires authentication"""
        payment_id = "67642298-f3cd-46c4-9c33-fbd9ccd83b3f"
        response = requests.get(f"{BASE_URL}/api/receipts/payment/{payment_id}")
        assert response.status_code == 401


class TestVendorManagement:
    """Vendor Management CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_vendor_id(self, headers):
        """Create a test vendor and return its ID"""
        unique_phone = f"98765{str(uuid.uuid4())[:5].replace('-', '')}"
        vendor_data = {
            "name": f"TEST_Pytest Vendor {uuid.uuid4().hex[:6]}",
            "company_name": "Pytest Test Company",
            "category": "electrical",
            "phone": unique_phone,
            "email": f"pytest_{uuid.uuid4().hex[:6]}@test.com",
            "address": "Test Address",
            "city": "Test City"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers,
            json=vendor_data
        )
        assert response.status_code == 200, f"Vendor creation failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        return data["vendor"]["id"]
    
    def test_vendor_stats(self, headers):
        """Test vendor statistics API"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        stats = data["stats"]
        assert "total_vendors" in stats
        assert "active_vendors" in stats
        assert "total_billed" in stats
        assert "total_paid" in stats
        assert "total_outstanding" in stats
        assert "overdue_count" in stats
    
    def test_get_vendors(self, headers):
        """Test get all vendors"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "vendors" in data
        assert "total" in data
    
    def test_get_vendor_by_id(self, headers, test_vendor_id):
        """Test get vendor by ID"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors/{test_vendor_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "vendor" in data
        assert data["vendor"]["id"] == test_vendor_id
        assert "bills" in data
        assert "payments" in data
        assert "summary" in data
    
    def test_update_vendor(self, headers, test_vendor_id):
        """Test update vendor"""
        update_data = {
            "name": "TEST_Updated Vendor Name",
            "rating": 4.5
        }
        response = requests.put(
            f"{BASE_URL}/api/vendor-management/vendors/{test_vendor_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors/{test_vendor_id}",
            headers=headers
        )
        vendor = get_response.json()["vendor"]
        assert vendor["name"] == "TEST_Updated Vendor Name"
        assert vendor["rating"] == 4.5
    
    def test_vendor_search_filter(self, headers):
        """Test vendor search filter"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors?search=TEST",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_vendor_category_filter(self, headers):
        """Test vendor category filter"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors?category=construction",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_vendor_status_filter(self, headers):
        """Test vendor status filter"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors?status=active",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_vendor_requires_auth(self):
        """Test vendor API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/vendor-management/vendors")
        assert response.status_code == 401


class TestBillManagement:
    """Bill Management tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_vendor_id(self, headers):
        """Create a test vendor for bill tests"""
        unique_phone = f"98764{str(uuid.uuid4())[:5].replace('-', '')}"
        vendor_data = {
            "name": f"TEST_Bill Vendor {uuid.uuid4().hex[:6]}",
            "category": "plumbing",
            "phone": unique_phone
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers,
            json=vendor_data
        )
        return response.json()["vendor"]["id"]
    
    @pytest.fixture(scope="class")
    def test_bill_id(self, headers, test_vendor_id):
        """Create a test bill and return its ID"""
        bill_data = {
            "vendor_id": test_vendor_id,
            "bill_number": f"TEST-BILL-{uuid.uuid4().hex[:6]}",
            "bill_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "amount": 25000,
            "tax_amount": 4500,
            "description": "Test bill for pytest"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/bills",
            headers=headers,
            json=bill_data
        )
        assert response.status_code == 200, f"Bill creation failed: {response.text}"
        data = response.json()
        assert data["success"] is True
        return data["bill"]["id"]
    
    def test_create_bill(self, headers, test_vendor_id):
        """Test create bill"""
        bill_data = {
            "vendor_id": test_vendor_id,
            "bill_number": f"TEST-BILL-{uuid.uuid4().hex[:6]}",
            "bill_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=15)).isoformat(),
            "amount": 10000,
            "tax_amount": 1800,
            "description": "Test bill creation"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/bills",
            headers=headers,
            json=bill_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "bill" in data
        bill = data["bill"]
        assert bill["amount"] == 10000
        assert bill["tax_amount"] == 1800
        assert bill["total_amount"] == 11800
        assert bill["status"] == "pending"
    
    def test_get_bills(self, headers):
        """Test get all bills"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/bills",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "bills" in data
        assert "total" in data
    
    def test_get_bill_by_id(self, headers, test_bill_id):
        """Test get bill by ID"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/bills/{test_bill_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "bill" in data
        assert data["bill"]["id"] == test_bill_id
    
    def test_update_bill(self, headers, test_bill_id):
        """Test update bill"""
        update_data = {
            "description": "Updated test bill description"
        }
        response = requests.put(
            f"{BASE_URL}/api/vendor-management/bills/{test_bill_id}",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestPaymentRecording:
    """Payment Recording tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_vendor_and_bill(self, headers):
        """Create test vendor and bill for payment tests"""
        # Create vendor
        unique_phone = f"98763{str(uuid.uuid4())[:5].replace('-', '')}"
        vendor_data = {
            "name": f"TEST_Payment Vendor {uuid.uuid4().hex[:6]}",
            "category": "interior",
            "phone": unique_phone
        }
        vendor_response = requests.post(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers,
            json=vendor_data
        )
        vendor_id = vendor_response.json()["vendor"]["id"]
        
        # Create bill
        bill_data = {
            "vendor_id": vendor_id,
            "bill_number": f"TEST-PAY-BILL-{uuid.uuid4().hex[:6]}",
            "bill_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "amount": 50000,
            "tax_amount": 9000,
            "description": "Test bill for payment"
        }
        bill_response = requests.post(
            f"{BASE_URL}/api/vendor-management/bills",
            headers=headers,
            json=bill_data
        )
        bill_id = bill_response.json()["bill"]["id"]
        
        return {"vendor_id": vendor_id, "bill_id": bill_id}
    
    def test_record_payment(self, headers, test_vendor_and_bill):
        """Test record payment"""
        payment_data = {
            "vendor_id": test_vendor_and_bill["vendor_id"],
            "bill_id": test_vendor_and_bill["bill_id"],
            "amount": 20000,
            "payment_method": "bank_transfer",
            "reference_number": f"TXN-{uuid.uuid4().hex[:8]}",
            "description": "Partial payment test"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/payments",
            headers=headers,
            json=payment_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "payment" in data
        payment = data["payment"]
        assert payment["amount"] == 20000
        assert payment["payment_method"] == "bank_transfer"
    
    def test_payment_updates_bill_status(self, headers, test_vendor_and_bill):
        """Test that payment updates bill status to partial"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/bills/{test_vendor_and_bill['bill_id']}",
            headers=headers
        )
        assert response.status_code == 200
        bill = response.json()["bill"]
        assert bill["status"] == "partial"
        assert bill["paid_amount"] == 20000
        assert bill["balance_amount"] == 39000  # 59000 - 20000
    
    def test_get_payments(self, headers):
        """Test get all payments"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-management/payments",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "payments" in data
        assert "total" in data
        assert "total_amount" in data
    
    def test_full_payment_marks_bill_paid(self, headers, test_vendor_and_bill):
        """Test that full payment marks bill as paid"""
        # Pay remaining balance
        payment_data = {
            "vendor_id": test_vendor_and_bill["vendor_id"],
            "bill_id": test_vendor_and_bill["bill_id"],
            "amount": 39000,  # Remaining balance
            "payment_method": "upi",
            "reference_number": f"UPI-{uuid.uuid4().hex[:8]}"
        }
        response = requests.post(
            f"{BASE_URL}/api/vendor-management/payments",
            headers=headers,
            json=payment_data
        )
        assert response.status_code == 200
        
        # Verify bill is now paid
        bill_response = requests.get(
            f"{BASE_URL}/api/vendor-management/bills/{test_vendor_and_bill['bill_id']}",
            headers=headers
        )
        bill = bill_response.json()["bill"]
        assert bill["status"] == "paid"
        assert bill["balance_amount"] <= 0


class TestVendorDeletion:
    """Vendor deletion tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_delete_vendor_without_pending_bills(self, headers):
        """Test deleting vendor without pending bills"""
        # Create vendor
        unique_phone = f"98762{str(uuid.uuid4())[:5].replace('-', '')}"
        vendor_data = {
            "name": f"TEST_Delete Vendor {uuid.uuid4().hex[:6]}",
            "category": "security",
            "phone": unique_phone
        }
        create_response = requests.post(
            f"{BASE_URL}/api/vendor-management/vendors",
            headers=headers,
            json=vendor_data
        )
        vendor_id = create_response.json()["vendor"]["id"]
        
        # Delete vendor
        delete_response = requests.delete(
            f"{BASE_URL}/api/vendor-management/vendors/{vendor_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["success"] is True
        
        # Verify vendor is inactive
        get_response = requests.get(
            f"{BASE_URL}/api/vendor-management/vendors/{vendor_id}",
            headers=headers
        )
        vendor = get_response.json()["vendor"]
        assert vendor["status"] == "inactive"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
