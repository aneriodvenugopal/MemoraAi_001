"""
Test Payments Dashboard Backend APIs
Tests the EMI payments endpoints used by the Payments Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

class TestPaymentsDashboardAPIs:
    """Test EMI Payments APIs used by Payments Dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9908290239", "password": "12345678"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_emi_stats_endpoint(self):
        """Test GET /api/emi-payments/stats - Used for dashboard stat cards"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "stats" in data
        
        stats = data["stats"]
        # Verify all required fields for dashboard
        assert "total_emis" in stats
        assert "total_paid" in stats
        assert "total_pending" in stats
        assert "total_late_fees" in stats
        assert "collection_rate" in stats
        assert "by_status" in stats
        assert "overdue_count" in stats
        assert "overdue_amount" in stats
        assert "due_this_week_count" in stats
        assert "due_this_week_amount" in stats
        
        print(f"Stats: Total EMIs={stats['total_emis']}, Paid={stats['total_paid']}, Pending={stats['total_pending']}")
    
    def test_emi_stats_with_project_filter(self):
        """Test GET /api/emi-payments/stats?project_id=xxx - Filter by project"""
        # First get a project ID
        projects_response = requests.get(
            f"{BASE_URL}/api/projects/",
            headers=self.headers
        )
        if projects_response.status_code == 200:
            projects = projects_response.json()
            if projects and len(projects) > 0:
                project_id = projects[0].get("id")
                
                response = requests.get(
                    f"{BASE_URL}/api/emi-payments/stats?project_id={project_id}",
                    headers=self.headers
                )
                assert response.status_code == 200
                data = response.json()
                assert data.get("success") == True
                print(f"Stats with project filter: {data['stats']}")
    
    def test_overdue_emis_endpoint(self):
        """Test GET /api/emi-payments/overdue - Used for Overdue tab"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/overdue?limit=100",
            headers=self.headers
        )
        assert response.status_code == 200, f"Overdue endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "overdue_emis" in data
        assert "total" in data
        assert "total_overdue_amount" in data
        
        print(f"Overdue: Total={data['total']}, Amount={data['total_overdue_amount']}")
    
    def test_due_soon_endpoint(self):
        """Test GET /api/emi-payments/due-soon - Used for Due Soon tab"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/due-soon?days=14",
            headers=self.headers
        )
        assert response.status_code == 200, f"Due soon endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "due_soon" in data
        assert "count" in data
        assert "total_amount" in data
        
        print(f"Due Soon: Count={data['count']}, Amount={data['total_amount']}")
    
    def test_emi_schedules_endpoint(self):
        """Test GET /api/emi-payments/schedules - List all EMI schedules"""
        response = requests.get(
            f"{BASE_URL}/api/emi-payments/schedules?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Schedules endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "schedules" in data
        assert "total" in data
        
        print(f"Schedules: Total={data['total']}")
    
    def test_projects_endpoint(self):
        """Test GET /api/projects/ - Used for project filter dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/projects/",
            headers=self.headers
        )
        assert response.status_code == 200, f"Projects endpoint failed: {response.text}"
        data = response.json()
        
        # Should return a list of projects
        assert isinstance(data, list)
        print(f"Projects: Count={len(data)}")
    
    def test_authentication_required(self):
        """Test that all endpoints require authentication"""
        endpoints = [
            "/api/emi-payments/stats",
            "/api/emi-payments/overdue",
            "/api/emi-payments/due-soon",
            "/api/emi-payments/schedules"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require auth"
        
        print("All endpoints require authentication - PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
