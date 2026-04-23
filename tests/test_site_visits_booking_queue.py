"""
Test Suite for Site Visits and Booking Queue Features
- Site Visit Management: Schedule, confirm, start, complete, cancel, reschedule
- Booking Queue: Add to queue, notify, respond, move up, cancel
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "rajam@retoerp.com"
TEST_PASSWORD = "12345678"
TEST_PROJECT_ID = "42941e3b-03ee-4fa1-b676-a17c734dcc54"
TEST_USER_ID = "6fee62a2-19c0-43bf-b617-f67bc8e48a0c"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


# ==================== SITE VISITS TESTS ====================

class TestSiteVisitsBasic:
    """Basic Site Visit API tests"""
    
    def test_get_all_visits(self, api_client):
        """Test GET /api/site-visits - List all visits"""
        response = api_client.get(f"{BASE_URL}/api/site-visits")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "visits" in data
        assert "total" in data
        assert isinstance(data["visits"], list)
    
    def test_get_today_visits(self, api_client):
        """Test GET /api/site-visits/today - Get today's visits"""
        response = api_client.get(f"{BASE_URL}/api/site-visits/today")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "visits" in data
        assert "date" in data
        assert "count" in data
    
    def test_get_upcoming_visits(self, api_client):
        """Test GET /api/site-visits/upcoming - Get upcoming visits"""
        response = api_client.get(f"{BASE_URL}/api/site-visits/upcoming?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "visits" in data
        assert "from_date" in data
        assert "to_date" in data
    
    def test_get_my_visits(self, api_client):
        """Test GET /api/site-visits/my-visits - Get visits assigned to current user"""
        response = api_client.get(f"{BASE_URL}/api/site-visits/my-visits")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "visits" in data
        assert "count" in data
    
    def test_get_visit_stats(self, api_client):
        """Test GET /api/site-visits/stats - Get visit statistics"""
        response = api_client.get(f"{BASE_URL}/api/site-visits/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total" in data
        assert "by_status" in data
        assert "by_outcome" in data
        assert "conversion_rate" in data
        # Verify all status types are present
        expected_statuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"]
        for status in expected_statuses:
            assert status in data["by_status"]


class TestSiteVisitWorkflow:
    """Test complete site visit workflow: Schedule -> Confirm -> Start -> Complete"""
    
    def test_schedule_visit(self, api_client):
        """Test POST /api/site-visits - Schedule a new visit"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        visit_data = {
            "project_id": TEST_PROJECT_ID,
            "visitor_type": "lead",
            "visitor_name": "TEST_Visitor_Schedule",
            "visitor_mobile": "9999888877",
            "visitor_email": "test@example.com",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "duration_minutes": 60,
            "assigned_to": TEST_USER_ID,
            "staff_notes": "Test visit for automation"
        }
        
        response = api_client.post(f"{BASE_URL}/api/site-visits", json=visit_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "visit" in data
        assert data["visit"]["visitor_name"] == "TEST_Visitor_Schedule"
        assert data["visit"]["status"] == "scheduled"
        
        # Store visit ID for subsequent tests
        TestSiteVisitWorkflow.visit_id = data["visit"]["id"]
    
    def test_get_visit_by_id(self, api_client):
        """Test GET /api/site-visits/{visit_id} - Get visit details"""
        visit_id = getattr(TestSiteVisitWorkflow, 'visit_id', None)
        if not visit_id:
            pytest.skip("No visit ID from previous test")
        
        response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["visit"]["id"] == visit_id
        assert data["visit"]["visitor_name"] == "TEST_Visitor_Schedule"
    
    def test_confirm_visit(self, api_client):
        """Test POST /api/site-visits/{visit_id}/confirm - Confirm a scheduled visit"""
        visit_id = getattr(TestSiteVisitWorkflow, 'visit_id', None)
        if not visit_id:
            pytest.skip("No visit ID from previous test")
        
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/confirm")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Visit confirmed"
        
        # Verify status changed
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert get_response.json()["visit"]["status"] == "confirmed"
    
    def test_start_visit(self, api_client):
        """Test POST /api/site-visits/{visit_id}/start - Start a confirmed visit"""
        visit_id = getattr(TestSiteVisitWorkflow, 'visit_id', None)
        if not visit_id:
            pytest.skip("No visit ID from previous test")
        
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/start")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Visit started"
        
        # Verify status changed
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert get_response.json()["visit"]["status"] == "in_progress"
    
    def test_complete_visit(self, api_client):
        """Test POST /api/site-visits/{visit_id}/complete - Complete a visit with outcome"""
        visit_id = getattr(TestSiteVisitWorkflow, 'visit_id', None)
        if not visit_id:
            pytest.skip("No visit ID from previous test")
        
        complete_data = {
            "outcome": "interested",
            "feedback": "Customer liked the property",
            "staff_notes": "Good prospect, follow up next week",
            "properties_shown": [],
            "followup_required": True,
            "followup_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "followup_notes": "Call to discuss pricing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/complete", json=complete_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["outcome"] == "interested"
        
        # Verify status and outcome
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        visit = get_response.json()["visit"]
        assert visit["status"] == "completed"
        assert visit["outcome"] == "interested"
        assert visit["followup_required"] is True


class TestSiteVisitCancelReschedule:
    """Test cancel and reschedule workflows"""
    
    def test_schedule_and_cancel_visit(self, api_client):
        """Test cancel visit workflow"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        visit_data = {
            "project_id": TEST_PROJECT_ID,
            "visitor_type": "walk_in",
            "visitor_name": "TEST_Visitor_Cancel",
            "visitor_mobile": "9999777766",
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "duration_minutes": 30,
            "assigned_to": TEST_USER_ID
        }
        
        # Create visit
        response = api_client.post(f"{BASE_URL}/api/site-visits", json=visit_data)
        assert response.status_code == 200
        visit_id = response.json()["visit"]["id"]
        
        # Cancel visit
        cancel_data = {
            "cancellation_reason": "Customer requested cancellation"
        }
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/cancel", json=cancel_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cancelled" in data["message"].lower()
        
        # Verify status
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert get_response.json()["visit"]["status"] == "cancelled"
    
    def test_schedule_and_reschedule_visit(self, api_client):
        """Test reschedule visit workflow"""
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        new_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        visit_data = {
            "project_id": TEST_PROJECT_ID,
            "visitor_type": "customer",
            "visitor_name": "TEST_Visitor_Reschedule",
            "visitor_mobile": "9999666655",
            "scheduled_date": tomorrow,
            "scheduled_time": "15:00",
            "duration_minutes": 60,
            "assigned_to": TEST_USER_ID
        }
        
        # Create visit
        response = api_client.post(f"{BASE_URL}/api/site-visits", json=visit_data)
        assert response.status_code == 200
        visit_id = response.json()["visit"]["id"]
        
        # Reschedule visit
        reschedule_data = {
            "cancellation_reason": "Customer requested reschedule",
            "reschedule_date": new_date,
            "reschedule_time": "16:00"
        }
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/cancel", json=reschedule_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "rescheduled" in data["message"].lower()
        assert "new_visit_id" in data
        
        # Verify original visit is rescheduled
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert get_response.json()["visit"]["status"] == "rescheduled"
        
        # Verify new visit was created
        new_visit_id = data["new_visit_id"]
        new_visit_response = api_client.get(f"{BASE_URL}/api/site-visits/{new_visit_id}")
        assert new_visit_response.status_code == 200
        new_visit = new_visit_response.json()["visit"]
        assert new_visit["scheduled_date"] == new_date
        assert new_visit["status"] == "scheduled"


class TestSiteVisitNoShow:
    """Test no-show workflow"""
    
    def test_mark_no_show(self, api_client):
        """Test POST /api/site-visits/{visit_id}/no-show - Mark visitor as no-show"""
        tomorrow = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        visit_data = {
            "project_id": TEST_PROJECT_ID,
            "visitor_type": "lead",
            "visitor_name": "TEST_Visitor_NoShow",
            "visitor_mobile": "9999555544",
            "scheduled_date": tomorrow,
            "scheduled_time": "09:00",
            "duration_minutes": 60,
            "assigned_to": TEST_USER_ID
        }
        
        # Create and confirm visit
        response = api_client.post(f"{BASE_URL}/api/site-visits", json=visit_data)
        visit_id = response.json()["visit"]["id"]
        api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/confirm")
        
        # Mark as no-show
        response = api_client.post(f"{BASE_URL}/api/site-visits/{visit_id}/no-show")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify status
        get_response = api_client.get(f"{BASE_URL}/api/site-visits/{visit_id}")
        assert get_response.json()["visit"]["status"] == "no_show"


class TestSiteVisitFilters:
    """Test filtering and search"""
    
    def test_filter_by_status(self, api_client):
        """Test filtering visits by status"""
        response = api_client.get(f"{BASE_URL}/api/site-visits?status=scheduled")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # All returned visits should have scheduled status
        for visit in data["visits"]:
            assert visit["status"] == "scheduled"
    
    def test_filter_by_project(self, api_client):
        """Test filtering visits by project"""
        response = api_client.get(f"{BASE_URL}/api/site-visits?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        for visit in data["visits"]:
            assert visit["project_id"] == TEST_PROJECT_ID


# ==================== BOOKING QUEUE TESTS ====================

class TestBookingQueueBasic:
    """Basic Booking Queue API tests"""
    
    def test_get_all_queue_entries(self, api_client):
        """Test GET /api/booking-queue - List all queue entries"""
        response = api_client.get(f"{BASE_URL}/api/booking-queue")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "entries" in data
        assert "total" in data
        assert isinstance(data["entries"], list)
    
    def test_get_queue_stats(self, api_client):
        """Test GET /api/booking-queue/stats - Get queue statistics"""
        response = api_client.get(f"{BASE_URL}/api/booking-queue/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total" in data
        assert "by_status" in data
        assert "properties_with_queue" in data
        assert "conversion_rate" in data
        # Verify all status types are present
        expected_statuses = ["waiting", "notified", "converted", "expired", "cancelled", "skipped"]
        for status in expected_statuses:
            assert status in data["by_status"]


class TestBookingQueueWorkflow:
    """Test complete booking queue workflow: Add -> Notify -> Respond"""
    
    def test_add_to_queue(self, api_client):
        """Test POST /api/booking-queue - Add customer to waitlist"""
        queue_data = {
            "project_id": TEST_PROJECT_ID,
            "property_id": "TEST-plot-001",
            "customer_name": "TEST_Queue_Customer",
            "customer_mobile": "9988001122",
            "customer_email": "queue@test.com",
            "max_price": 6000000,
            "notes": "Test queue entry",
            "priority": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "entry" in data
        assert data["entry"]["customer_name"] == "TEST_Queue_Customer"
        assert data["entry"]["status"] == "waiting"
        assert data["entry"]["position"] == 1  # First in queue for this property
        
        # Store entry ID for subsequent tests
        TestBookingQueueWorkflow.entry_id = data["entry"]["id"]
    
    def test_get_queue_entry_by_id(self, api_client):
        """Test GET /api/booking-queue/{entry_id} - Get queue entry details"""
        entry_id = getattr(TestBookingQueueWorkflow, 'entry_id', None)
        if not entry_id:
            pytest.skip("No entry ID from previous test")
        
        response = api_client.get(f"{BASE_URL}/api/booking-queue/{entry_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["entry"]["id"] == entry_id
    
    def test_notify_queue_member(self, api_client):
        """Test POST /api/booking-queue/{entry_id}/notify - Notify customer"""
        entry_id = getattr(TestBookingQueueWorkflow, 'entry_id', None)
        if not entry_id:
            pytest.skip("No entry ID from previous test")
        
        notify_data = {
            "message": "Property is now available",
            "response_hours": 48
        }
        
        response = api_client.post(f"{BASE_URL}/api/booking-queue/{entry_id}/notify", json=notify_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deadline" in data
        
        # Verify status changed
        get_response = api_client.get(f"{BASE_URL}/api/booking-queue/{entry_id}")
        entry = get_response.json()["entry"]
        assert entry["status"] == "notified"
        assert entry["notified_at"] is not None
        assert entry["response_deadline"] is not None
    
    def test_record_interested_response(self, api_client):
        """Test POST /api/booking-queue/{entry_id}/respond - Record interested response"""
        entry_id = getattr(TestBookingQueueWorkflow, 'entry_id', None)
        if not entry_id:
            pytest.skip("No entry ID from previous test")
        
        response_data = {
            "response": "interested",
            "notes": "Customer wants to proceed with booking"
        }
        
        response = api_client.post(f"{BASE_URL}/api/booking-queue/{entry_id}/respond", json=response_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["new_status"] == "converted"
        
        # Verify status changed
        get_response = api_client.get(f"{BASE_URL}/api/booking-queue/{entry_id}")
        entry = get_response.json()["entry"]
        assert entry["status"] == "converted"
        assert entry["response_received"] == "interested"


class TestBookingQueueNotInterested:
    """Test not interested response workflow"""
    
    def test_add_and_respond_not_interested(self, api_client):
        """Test not interested response - should skip to next in queue"""
        import time
        unique_suffix = str(int(time.time() * 1000))[-6:]
        
        # Add first customer
        queue_data1 = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-notint-{unique_suffix}",
            "customer_name": "TEST_First_Customer",
            "customer_mobile": f"998800{unique_suffix[:4]}",
            "priority": 0
        }
        response1 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data1)
        assert response1.status_code == 200, f"Failed to create first entry: {response1.text}"
        entry1_id = response1.json()["entry"]["id"]
        
        # Add second customer
        queue_data2 = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-notint-{unique_suffix}",
            "customer_name": "TEST_Second_Customer",
            "customer_mobile": f"998801{unique_suffix[:4]}",
            "priority": 0
        }
        response2 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data2)
        assert response2.status_code == 200, f"Failed to create second entry: {response2.text}"
        entry2_id = response2.json()["entry"]["id"]
        
        # Notify first customer
        api_client.post(f"{BASE_URL}/api/booking-queue/{entry1_id}/notify", json={"response_hours": 48})
        
        # First customer not interested
        response_data = {
            "response": "not_interested",
            "notes": "Customer found another property"
        }
        response = api_client.post(f"{BASE_URL}/api/booking-queue/{entry1_id}/respond", json=response_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # When there's a next person in queue, response includes next_in_queue
        # Otherwise it includes new_status
        if "next_in_queue" in data:
            assert data["next_in_queue"]["id"] == entry2_id
        else:
            assert data["new_status"] == "skipped"
        
        # Verify first entry status changed to skipped
        get_response = api_client.get(f"{BASE_URL}/api/booking-queue/{entry1_id}")
        assert get_response.json()["entry"]["status"] == "skipped"


class TestBookingQueueMoveUp:
    """Test move up in queue functionality"""
    
    def test_move_up_in_queue(self, api_client):
        """Test POST /api/booking-queue/{entry_id}/move-up - Move entry up in queue"""
        import time
        unique_suffix = str(int(time.time() * 1000))[-6:]
        
        # Add two customers to same property
        queue_data1 = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-moveup-{unique_suffix}",
            "customer_name": "TEST_Position1",
            "customer_mobile": f"998803{unique_suffix[:4]}",
            "priority": 0
        }
        response1 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data1)
        assert response1.status_code == 200
        entry1_id = response1.json()["entry"]["id"]
        
        queue_data2 = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-moveup-{unique_suffix}",
            "customer_name": "TEST_Position2",
            "customer_mobile": f"998804{unique_suffix[:4]}",
            "priority": 0
        }
        response2 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data2)
        assert response2.status_code == 200
        entry2_id = response2.json()["entry"]["id"]
        
        # Verify initial positions
        get1 = api_client.get(f"{BASE_URL}/api/booking-queue/{entry1_id}")
        get2 = api_client.get(f"{BASE_URL}/api/booking-queue/{entry2_id}")
        assert get1.json()["entry"]["position"] == 1
        assert get2.json()["entry"]["position"] == 2
        
        # Move second entry up
        response = api_client.post(f"{BASE_URL}/api/booking-queue/{entry2_id}/move-up")
        assert response.status_code == 200
        
        # Verify positions swapped
        get1_after = api_client.get(f"{BASE_URL}/api/booking-queue/{entry1_id}")
        get2_after = api_client.get(f"{BASE_URL}/api/booking-queue/{entry2_id}")
        assert get2_after.json()["entry"]["position"] == 1
        assert get1_after.json()["entry"]["position"] == 2


class TestBookingQueueCancel:
    """Test cancel queue entry"""
    
    def test_cancel_queue_entry(self, api_client):
        """Test POST /api/booking-queue/{entry_id}/cancel - Cancel queue entry"""
        import time
        unique_suffix = str(int(time.time() * 1000))[-6:]
        
        queue_data = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-cancel-{unique_suffix}",
            "customer_name": "TEST_Cancel_Customer",
            "customer_mobile": f"998805{unique_suffix[:4]}",
            "priority": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data)
        entry_id = response.json()["entry"]["id"]
        
        # Cancel entry
        response = api_client.post(f"{BASE_URL}/api/booking-queue/{entry_id}/cancel?reason=Customer%20changed%20mind")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify status
        get_response = api_client.get(f"{BASE_URL}/api/booking-queue/{entry_id}")
        assert get_response.json()["entry"]["status"] == "cancelled"


class TestBookingQueueDuplicateCheck:
    """Test duplicate entry prevention"""
    
    def test_prevent_duplicate_queue_entry(self, api_client):
        """Test that same customer cannot be added twice to same property queue"""
        import time
        unique_suffix = str(int(time.time() * 1000))[-6:]
        
        queue_data = {
            "project_id": TEST_PROJECT_ID,
            "property_id": f"TEST-plot-dup-{unique_suffix}",
            "customer_name": "TEST_Duplicate_Customer",
            "customer_mobile": f"998806{unique_suffix[:4]}",
            "priority": 0
        }
        
        # First entry should succeed
        response1 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data)
        assert response1.status_code == 200
        
        # Second entry with same mobile should fail
        response2 = api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data)
        assert response2.status_code == 400
        assert "already in queue" in response2.json()["detail"].lower()


class TestBookingQueuePropertyQueue:
    """Test property-specific queue operations"""
    
    def test_get_property_queue(self, api_client):
        """Test GET /api/booking-queue/property/{property_id} - Get queue for specific property"""
        import time
        unique_suffix = str(int(time.time() * 1000))[-6:]
        property_id = f"TEST-plot-propq-{unique_suffix}"
        
        # First add some entries
        queue_data = {
            "project_id": TEST_PROJECT_ID,
            "property_id": property_id,
            "customer_name": "TEST_Property_Queue",
            "customer_mobile": f"998807{unique_suffix[:4]}",
            "priority": 0
        }
        api_client.post(f"{BASE_URL}/api/booking-queue", json=queue_data)
        
        # Get property queue
        response = api_client.get(f"{BASE_URL}/api/booking-queue/property/{property_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "queue" in data
        assert "queue_length" in data


class TestBookingQueueFilters:
    """Test filtering queue entries"""
    
    def test_filter_by_status(self, api_client):
        """Test filtering queue entries by status"""
        response = api_client.get(f"{BASE_URL}/api/booking-queue?status=waiting")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        for entry in data["entries"]:
            assert entry["status"] == "waiting"
    
    def test_filter_by_project(self, api_client):
        """Test filtering queue entries by project"""
        response = api_client.get(f"{BASE_URL}/api/booking-queue?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        for entry in data["entries"]:
            assert entry["project_id"] == TEST_PROJECT_ID


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_visits(self, api_client):
        """Delete test site visits"""
        response = api_client.get(f"{BASE_URL}/api/site-visits")
        if response.status_code == 200:
            visits = response.json().get("visits", [])
            for visit in visits:
                if visit["visitor_name"].startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/site-visits/{visit['id']}")
        assert True  # Cleanup is best effort
    
    def test_cleanup_test_queue_entries(self, api_client):
        """Delete test queue entries"""
        response = api_client.get(f"{BASE_URL}/api/booking-queue")
        if response.status_code == 200:
            entries = response.json().get("entries", [])
            for entry in entries:
                if entry["customer_name"].startswith("TEST_") or entry["property_id"].startswith("TEST-"):
                    api_client.delete(f"{BASE_URL}/api/booking-queue/{entry['id']}")
        assert True  # Cleanup is best effort


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
