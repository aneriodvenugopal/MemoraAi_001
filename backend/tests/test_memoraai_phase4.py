"""
MemoraAI Phase 4 Backend Tests
- Appointment/Booking Management System
- Category-Specific Analytics & Reports
- WhatsApp Template Approval Workflow
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TENANT_ADMIN_PHONE = "8888888888"
TENANT_ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tenant admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": TENANT_ADMIN_PHONE, "password": TENANT_ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Auth failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============== APPOINTMENT MANAGEMENT TESTS ==============

class TestAppointmentCRUD:
    """Appointment CRUD operations"""
    
    created_appointment_id = None
    
    def test_create_appointment(self, headers):
        """POST /api/memoraai/appointments - Create appointment"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "customer_phone": "TEST_9876543210",
            "customer_name": "Test Customer",
            "service_name": "Horoscope Reading",
            "appointment_date": today,
            "appointment_time": "14:00",
            "duration_mins": 45,
            "amount": 500,
            "notes": "Test appointment for Phase 4",
            "source": "manual"
        }
        response = requests.post(f"{BASE_URL}/api/memoraai/appointments", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "appointment" in data
        assert data["appointment"]["customer_phone"] == "TEST_9876543210"
        assert data["appointment"]["service_name"] == "Horoscope Reading"
        assert data["appointment"]["status"] == "scheduled"
        assert "id" in data["appointment"]
        
        TestAppointmentCRUD.created_appointment_id = data["appointment"]["id"]
        print(f"Created appointment: {TestAppointmentCRUD.created_appointment_id}")
    
    def test_list_appointments(self, headers):
        """GET /api/memoraai/appointments - List appointments"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments", headers=headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert "appointments" in data
        assert "total" in data
        assert isinstance(data["appointments"], list)
        print(f"Total appointments: {data['total']}")
    
    def test_list_appointments_with_status_filter(self, headers):
        """GET /api/memoraai/appointments?status=scheduled - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments?status=scheduled", headers=headers)
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        assert "appointments" in data
        # All returned appointments should be scheduled
        for apt in data["appointments"]:
            assert apt["status"] == "scheduled"
        print(f"Scheduled appointments: {len(data['appointments'])}")
    
    def test_list_appointments_with_date_filter(self, headers):
        """GET /api/memoraai/appointments?date=YYYY-MM-DD - Filter by date"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments?date={today}", headers=headers)
        assert response.status_code == 200, f"Date filter failed: {response.text}"
        
        data = response.json()
        assert "appointments" in data
        print(f"Today's appointments: {len(data['appointments'])}")
    
    def test_get_today_summary(self, headers):
        """GET /api/memoraai/appointments/today/summary - Today's summary"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments/today/summary", headers=headers)
        assert response.status_code == 200, f"Summary failed: {response.text}"
        
        data = response.json()
        assert "date" in data
        assert "total" in data
        assert "scheduled" in data
        assert "completed" in data
        assert "cancelled" in data
        assert "no_show" in data
        assert "upcoming" in data
        
        print(f"Today summary: total={data['total']}, scheduled={data['scheduled']}, completed={data['completed']}")
    
    def test_update_appointment(self, headers):
        """PUT /api/memoraai/appointments/{id} - Update appointment"""
        if not TestAppointmentCRUD.created_appointment_id:
            pytest.skip("No appointment created")
        
        apt_id = TestAppointmentCRUD.created_appointment_id
        payload = {
            "notes": "Updated notes for testing",
            "amount": 600
        }
        response = requests.put(f"{BASE_URL}/api/memoraai/appointments/{apt_id}", json=payload, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        assert "appointment" in data
        assert data["appointment"]["notes"] == "Updated notes for testing"
        assert data["appointment"]["amount"] == 600
        print(f"Updated appointment: {apt_id}")
    
    def test_mark_appointment_completed(self, headers):
        """POST /api/memoraai/appointments/{id}/complete - Mark completed"""
        # Create a new appointment to mark as completed
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "customer_phone": "TEST_1111111111",
            "customer_name": "Complete Test",
            "service_name": "Marriage Matching",
            "appointment_date": today,
            "appointment_time": "10:00",
            "amount": 1000,
            "source": "manual"
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/appointments", json=payload, headers=headers)
        assert create_resp.status_code == 200
        apt_id = create_resp.json()["appointment"]["id"]
        
        # Mark as completed
        response = requests.post(f"{BASE_URL}/api/memoraai/appointments/{apt_id}/complete", json={}, headers=headers)
        assert response.status_code == 200, f"Complete failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Appointment marked as completed"
        
        # Verify status changed
        get_resp = requests.get(f"{BASE_URL}/api/memoraai/appointments?status=completed", headers=headers)
        completed_apts = get_resp.json()["appointments"]
        assert any(a["id"] == apt_id for a in completed_apts), "Appointment not found in completed list"
        print(f"Marked appointment {apt_id} as completed")
    
    def test_mark_appointment_no_show(self, headers):
        """POST /api/memoraai/appointments/{id}/no-show - Mark no-show"""
        # Create a new appointment to mark as no-show
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "customer_phone": "TEST_2222222222",
            "customer_name": "No Show Test",
            "service_name": "Vastu Consultation",
            "appointment_date": today,
            "appointment_time": "11:00",
            "amount": 800,
            "source": "manual"
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/appointments", json=payload, headers=headers)
        assert create_resp.status_code == 200
        apt_id = create_resp.json()["appointment"]["id"]
        
        # Mark as no-show
        response = requests.post(f"{BASE_URL}/api/memoraai/appointments/{apt_id}/no-show", json={}, headers=headers)
        assert response.status_code == 200, f"No-show failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Appointment marked as no-show"
        print(f"Marked appointment {apt_id} as no-show")
    
    def test_delete_appointment(self, headers):
        """DELETE /api/memoraai/appointments/{id} - Delete appointment"""
        # Create a new appointment to delete
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "customer_phone": "TEST_3333333333",
            "customer_name": "Delete Test",
            "service_name": "Numerology",
            "appointment_date": today,
            "appointment_time": "15:00",
            "amount": 300,
            "source": "manual"
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/appointments", json=payload, headers=headers)
        assert create_resp.status_code == 200
        apt_id = create_resp.json()["appointment"]["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/memoraai/appointments/{apt_id}", headers=headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Appointment deleted"
        
        # Verify deleted - should get 404
        get_resp = requests.get(f"{BASE_URL}/api/memoraai/appointments/{apt_id}", headers=headers)
        assert get_resp.status_code == 404
        print(f"Deleted appointment {apt_id}")


# ============== ANALYTICS TESTS ==============

class TestAnalytics:
    """Category-specific analytics tests"""
    
    def test_analytics_overview_default(self, headers):
        """GET /api/memoraai/analytics/overview - Default period (month)"""
        response = requests.get(f"{BASE_URL}/api/memoraai/analytics/overview", headers=headers)
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        
        data = response.json()
        assert "category" in data
        assert "category_name" in data
        assert "period" in data
        assert data["period"] == "month"
        
        # Check appointments section
        assert "appointments" in data
        apts = data["appointments"]
        assert "total" in apts
        assert "this_period" in apts
        assert "completed" in apts
        assert "cancelled" in apts
        assert "no_show" in apts
        assert "completion_rate" in apts
        
        # Check revenue section
        assert "revenue" in data
        assert "total" in data["revenue"]
        assert "this_period" in data["revenue"]
        
        # Check popular services
        assert "popular_services" in data
        assert isinstance(data["popular_services"], list)
        
        # Check daily trend
        assert "daily_trend" in data
        assert len(data["daily_trend"]) == 7  # 7 days
        
        # Check customers
        assert "customers" in data
        assert "unique" in data["customers"]
        assert "repeat" in data["customers"]
        assert "retention_rate" in data["customers"]
        
        # Check whatsapp stats
        assert "whatsapp" in data
        
        print(f"Analytics overview: category={data['category_name']}, total_appointments={apts['total']}")
    
    def test_analytics_overview_week(self, headers):
        """GET /api/memoraai/analytics/overview?period=week - Weekly analytics"""
        response = requests.get(f"{BASE_URL}/api/memoraai/analytics/overview?period=week", headers=headers)
        assert response.status_code == 200, f"Week analytics failed: {response.text}"
        
        data = response.json()
        assert data["period"] == "week"
        print(f"Week analytics: appointments this period={data['appointments']['this_period']}")
    
    def test_analytics_overview_today(self, headers):
        """GET /api/memoraai/analytics/overview?period=today - Today's analytics"""
        response = requests.get(f"{BASE_URL}/api/memoraai/analytics/overview?period=today", headers=headers)
        assert response.status_code == 200, f"Today analytics failed: {response.text}"
        
        data = response.json()
        assert data["period"] == "today"
        print(f"Today analytics: appointments this period={data['appointments']['this_period']}")
    
    def test_services_breakdown(self, headers):
        """GET /api/memoraai/analytics/services-breakdown - Service performance"""
        response = requests.get(f"{BASE_URL}/api/memoraai/analytics/services-breakdown", headers=headers)
        assert response.status_code == 200, f"Breakdown failed: {response.text}"
        
        data = response.json()
        assert "breakdown" in data
        assert "count" in data
        assert isinstance(data["breakdown"], list)
        
        # Check breakdown structure if data exists
        if data["breakdown"]:
            item = data["breakdown"][0]
            assert "service" in item
            assert "total_bookings" in item
            assert "completed" in item
            assert "revenue" in item
            assert "cancelled" in item
            assert "completion_rate" in item
        
        print(f"Services breakdown: {data['count']} services")


# ============== TEMPLATE WORKFLOW TESTS ==============

class TestTemplateWorkflow:
    """WhatsApp template approval workflow tests"""
    
    created_template_id = None
    
    def test_auto_generate_templates(self, headers):
        """POST /api/memoraai/templates/auto-generate - Auto-generate templates"""
        response = requests.post(f"{BASE_URL}/api/memoraai/templates/auto-generate", json={}, headers=headers)
        assert response.status_code == 200, f"Auto-generate failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "templates" in data
        # May return 0 if templates already exist
        print(f"Auto-generated: {data['message']}")
    
    def test_list_templates(self, headers):
        """GET /api/memoraai/templates - List all templates"""
        response = requests.get(f"{BASE_URL}/api/memoraai/templates", headers=headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert "templates" in data
        assert "count" in data
        assert isinstance(data["templates"], list)
        
        print(f"Total templates: {data['count']}")
    
    def test_list_templates_by_status(self, headers):
        """GET /api/memoraai/templates?status=draft - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/memoraai/templates?status=draft", headers=headers)
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        assert "templates" in data
        # All returned should be draft
        for tpl in data["templates"]:
            assert tpl["status"] == "draft"
        
        print(f"Draft templates: {len(data['templates'])}")
    
    def test_create_template(self, headers):
        """POST /api/memoraai/templates - Create template draft"""
        payload = {
            "name": "TEST_phase4_template",
            "category": "MARKETING",
            "language": "en",
            "header_text": "Special Offer!",
            "body_text": "Hello {{1}}, we have a special offer for you on {{2}}. Valid till {{3}}.",
            "footer_text": "Reply STOP to unsubscribe"
        }
        response = requests.post(f"{BASE_URL}/api/memoraai/templates", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "template" in data
        assert data["template"]["name"] == "TEST_phase4_template"
        assert data["template"]["status"] == "draft"
        assert data["template"]["category"] == "MARKETING"
        assert "id" in data["template"]
        
        TestTemplateWorkflow.created_template_id = data["template"]["id"]
        print(f"Created template: {TestTemplateWorkflow.created_template_id}")
    
    def test_update_template(self, headers):
        """PUT /api/memoraai/templates/{id} - Edit template"""
        if not TestTemplateWorkflow.created_template_id:
            pytest.skip("No template created")
        
        tpl_id = TestTemplateWorkflow.created_template_id
        payload = {
            "body_text": "Hello {{1}}, updated offer for {{2}}. Valid till {{3}}. Book now!",
            "footer_text": "Updated footer"
        }
        response = requests.put(f"{BASE_URL}/api/memoraai/templates/{tpl_id}", json=payload, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        assert "template" in data
        assert "updated offer" in data["template"]["body_text"]
        print(f"Updated template: {tpl_id}")
    
    def test_submit_template(self, headers):
        """POST /api/memoraai/templates/{id}/submit - Submit for review"""
        if not TestTemplateWorkflow.created_template_id:
            pytest.skip("No template created")
        
        tpl_id = TestTemplateWorkflow.created_template_id
        response = requests.post(f"{BASE_URL}/api/memoraai/templates/{tpl_id}/submit", json={}, headers=headers)
        assert response.status_code == 200, f"Submit failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "status" in data
        # Status should be either 'submitted' (if Meta connected) or 'pending_review'
        assert data["status"] in ["submitted", "pending_review"]
        print(f"Submitted template: status={data['status']}")
    
    def test_approve_template(self, headers):
        """POST /api/memoraai/templates/{id}/approve - Approve template"""
        # Create a new template to approve
        payload = {
            "name": "TEST_approve_template",
            "category": "UTILITY",
            "body_text": "Your appointment is confirmed for {{1}} at {{2}}."
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/templates", json=payload, headers=headers)
        assert create_resp.status_code == 200
        tpl_id = create_resp.json()["template"]["id"]
        
        # Submit first
        requests.post(f"{BASE_URL}/api/memoraai/templates/{tpl_id}/submit", json={}, headers=headers)
        
        # Approve
        response = requests.post(f"{BASE_URL}/api/memoraai/templates/{tpl_id}/approve", json={}, headers=headers)
        assert response.status_code == 200, f"Approve failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Template approved"
        
        # Verify status
        get_resp = requests.get(f"{BASE_URL}/api/memoraai/templates?status=approved", headers=headers)
        approved = get_resp.json()["templates"]
        assert any(t["id"] == tpl_id for t in approved), "Template not in approved list"
        print(f"Approved template: {tpl_id}")
    
    def test_reject_template(self, headers):
        """POST /api/memoraai/templates/{id}/reject - Reject template"""
        # Create a new template to reject
        payload = {
            "name": "TEST_reject_template",
            "category": "MARKETING",
            "body_text": "This is a test template to be rejected."
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/templates", json=payload, headers=headers)
        assert create_resp.status_code == 200
        tpl_id = create_resp.json()["template"]["id"]
        
        # Submit first
        requests.post(f"{BASE_URL}/api/memoraai/templates/{tpl_id}/submit", json={}, headers=headers)
        
        # Reject with reason
        response = requests.post(
            f"{BASE_URL}/api/memoraai/templates/{tpl_id}/reject",
            json={"reason": "Does not meet WhatsApp guidelines"},
            headers=headers
        )
        assert response.status_code == 200, f"Reject failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Template rejected"
        
        # Verify status and reason
        get_resp = requests.get(f"{BASE_URL}/api/memoraai/templates?status=rejected", headers=headers)
        rejected = get_resp.json()["templates"]
        rejected_tpl = next((t for t in rejected if t["id"] == tpl_id), None)
        assert rejected_tpl is not None, "Template not in rejected list"
        assert rejected_tpl["rejection_reason"] == "Does not meet WhatsApp guidelines"
        print(f"Rejected template: {tpl_id}")
    
    def test_delete_template(self, headers):
        """DELETE /api/memoraai/templates/{id} - Delete template"""
        # Create a new template to delete
        payload = {
            "name": "TEST_delete_template",
            "category": "UTILITY",
            "body_text": "This template will be deleted."
        }
        create_resp = requests.post(f"{BASE_URL}/api/memoraai/templates", json=payload, headers=headers)
        assert create_resp.status_code == 200
        tpl_id = create_resp.json()["template"]["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/memoraai/templates/{tpl_id}", headers=headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        data = response.json()
        assert data["message"] == "Template deleted"
        print(f"Deleted template: {tpl_id}")


# ============== CLEANUP ==============

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_appointments(self, headers):
        """Clean up TEST_ prefixed appointments"""
        response = requests.get(f"{BASE_URL}/api/memoraai/appointments?limit=100", headers=headers)
        if response.status_code == 200:
            appointments = response.json().get("appointments", [])
            deleted = 0
            for apt in appointments:
                if apt.get("customer_phone", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/memoraai/appointments/{apt['id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test appointments")
    
    def test_cleanup_test_templates(self, headers):
        """Clean up TEST_ prefixed templates"""
        response = requests.get(f"{BASE_URL}/api/memoraai/templates", headers=headers)
        if response.status_code == 200:
            templates = response.json().get("templates", [])
            deleted = 0
            for tpl in templates:
                if tpl.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/memoraai/templates/{tpl['id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
