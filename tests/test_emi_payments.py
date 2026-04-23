"""
EMI Payment Module API Tests
Tests for:
- EMI schedule creation
- EMI stats retrieval
- EMI schedules listing
- Overdue EMIs
- Due soon EMIs
- Payment recording
- Late fee waiver
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "rajam@retoerp.com"
TEST_PASSWORD = "12345678"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestEMIPaymentStats:
    """Tests for EMI Payment Statistics API"""
    
    def test_get_stats_success(self, api_client):
        """Test GET /api/emi-payments/stats returns valid stats"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_emis" in stats
        assert "total_due_amount" in stats
        assert "total_paid" in stats
        assert "total_pending" in stats
        assert "total_late_fees" in stats
        assert "collection_rate" in stats
        assert "by_status" in stats
        assert "overdue_count" in stats
        assert "overdue_amount" in stats
        assert "due_this_week_count" in stats
        assert "due_this_week_amount" in stats
    
    def test_get_stats_requires_auth(self):
        """Test stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/stats")
        assert response.status_code == 401


class TestEMISchedules:
    """Tests for EMI Schedules API"""
    
    def test_get_schedules_success(self, api_client):
        """Test GET /api/emi-payments/schedules returns schedules list"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/schedules")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "schedules" in data
        assert "total" in data
        assert isinstance(data["schedules"], list)
    
    def test_get_schedules_with_limit(self, api_client):
        """Test schedules endpoint respects limit parameter"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/schedules?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["schedules"]) <= 5
    
    def test_get_schedules_with_status_filter(self, api_client):
        """Test schedules endpoint filters by status"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/schedules?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        for schedule in data["schedules"]:
            assert schedule["status"] == "pending"
    
    def test_get_schedules_requires_auth(self):
        """Test schedules endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/schedules")
        assert response.status_code == 401


class TestEMIOverdue:
    """Tests for Overdue EMIs API"""
    
    def test_get_overdue_success(self, api_client):
        """Test GET /api/emi-payments/overdue returns overdue list"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/overdue")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "overdue_emis" in data
        assert "total" in data
        assert "total_overdue_amount" in data
        assert isinstance(data["overdue_emis"], list)
    
    def test_get_overdue_with_min_days(self, api_client):
        """Test overdue endpoint filters by minimum days overdue"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/overdue?min_days_overdue=7")
        assert response.status_code == 200
        
        data = response.json()
        for emi in data["overdue_emis"]:
            assert emi.get("days_overdue", 0) >= 7
    
    def test_get_overdue_requires_auth(self):
        """Test overdue endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/overdue")
        assert response.status_code == 401


class TestEMIDueSoon:
    """Tests for Due Soon EMIs API"""
    
    def test_get_due_soon_success(self, api_client):
        """Test GET /api/emi-payments/due-soon returns due soon list"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/due-soon?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "due_soon" in data
        assert "count" in data
        assert "total_amount" in data
        assert isinstance(data["due_soon"], list)
    
    def test_get_due_soon_with_days_param(self, api_client):
        """Test due soon endpoint respects days parameter"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/due-soon?days=30")
        assert response.status_code == 200
        
        data = response.json()
        for emi in data["due_soon"]:
            assert emi.get("days_until_due", 0) <= 30
    
    def test_get_due_soon_requires_auth(self):
        """Test due soon endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/due-soon")
        assert response.status_code == 401


class TestEMIScheduleCreation:
    """Tests for EMI Schedule Creation API"""
    
    def test_create_schedule_requires_booking(self, api_client):
        """Test create schedule fails without valid booking"""
        response = api_client.post(
            f"{BASE_URL}/api/emi-payments/schedules/create",
            json={
                "booking_id": "invalid-booking-id",
                "total_amount": 1000000,
                "down_payment": 100000,
                "emi_months": 12,
                "late_fee_percentage": 2.0
            }
        )
        assert response.status_code == 404
    
    def test_create_schedule_requires_auth(self):
        """Test create schedule endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/emi-payments/schedules/create",
            json={
                "booking_id": "test-booking",
                "total_amount": 1000000,
                "emi_months": 12
            }
        )
        assert response.status_code == 401


class TestEMIPaymentRecording:
    """Tests for Payment Recording API"""
    
    def test_record_payment_requires_valid_emi(self, api_client):
        """Test record payment fails with invalid EMI ID"""
        response = api_client.post(
            f"{BASE_URL}/api/emi-payments/payments/record",
            json={
                "emi_id": "invalid-emi-id",
                "amount": 10000,
                "payment_method": "bank_transfer"
            }
        )
        assert response.status_code == 404
    
    def test_record_payment_requires_auth(self):
        """Test record payment endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/emi-payments/payments/record",
            json={
                "emi_id": "test-emi",
                "amount": 10000,
                "payment_method": "cash"
            }
        )
        assert response.status_code == 401


class TestEMILateFeeWaiver:
    """Tests for Late Fee Waiver API"""
    
    def test_waive_late_fee_requires_valid_emi(self, api_client):
        """Test waive late fee fails with invalid EMI ID"""
        response = api_client.post(
            f"{BASE_URL}/api/emi-payments/late-fees/waive",
            json={
                "emi_id": "invalid-emi-id",
                "reason": "Test waiver"
            }
        )
        assert response.status_code == 404
    
    def test_waive_late_fee_requires_auth(self):
        """Test waive late fee endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/emi-payments/late-fees/waive",
            json={
                "emi_id": "test-emi",
                "reason": "Test waiver"
            }
        )
        assert response.status_code == 401


class TestEMIBookingSchedule:
    """Tests for Booking EMI Schedule API"""
    
    def test_get_booking_schedule_requires_valid_booking(self, api_client):
        """Test get booking schedule fails with invalid booking ID"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/schedules/booking/invalid-booking-id")
        assert response.status_code == 404
    
    def test_get_booking_schedule_requires_auth(self):
        """Test get booking schedule endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/schedules/booking/test-booking")
        assert response.status_code == 401


class TestEMISingleSchedule:
    """Tests for Single EMI Schedule API"""
    
    def test_get_single_schedule_requires_valid_id(self, api_client):
        """Test get single schedule fails with invalid EMI ID"""
        response = api_client.get(f"{BASE_URL}/api/emi-payments/schedules/invalid-emi-id")
        assert response.status_code == 404
    
    def test_get_single_schedule_requires_auth(self):
        """Test get single schedule endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emi-payments/schedules/test-emi")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
