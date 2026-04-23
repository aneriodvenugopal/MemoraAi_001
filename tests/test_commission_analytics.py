"""
Commission Analytics API Tests
Tests for the new Commission Analytics Dashboard feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"


class TestCommissionAnalyticsAPI:
    """Commission Analytics API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            # API returns access_token, not token
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_login_success(self):
        """Test login works with provided credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data or "token" in data
        assert data.get("user", {}).get("role") == "tenant_admin"
        print(f"✓ Login successful - User: {data.get('user', {}).get('name')}")
    
    def test_dashboard_endpoint(self):
        """Test /api/commission-analytics/dashboard returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/commission-analytics/dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify success flag
        assert data.get("success") == True, "Response should have success=True"
        
        # Verify overview structure
        assert "overview" in data, "Response should have 'overview' field"
        overview = data["overview"]
        assert "total_commission" in overview
        assert "total_tds" in overview
        assert "total_net" in overview
        assert "total_transactions" in overview
        assert "average_commission" in overview
        
        # Verify this_month structure
        assert "this_month" in data, "Response should have 'this_month' field"
        this_month = data["this_month"]
        assert "commission" in this_month
        assert "net" in this_month
        assert "transactions" in this_month
        assert "mom_growth" in this_month
        
        # Verify ytd structure
        assert "ytd" in data, "Response should have 'ytd' field"
        ytd = data["ytd"]
        assert "commission" in ytd
        assert "net" in ytd
        assert "transactions" in ytd
        
        # Verify by_status structure
        assert "by_status" in data, "Response should have 'by_status' field"
        by_status = data["by_status"]
        assert "pending" in by_status
        assert "approved" in by_status
        assert "paid" in by_status
        
        # Verify by_type structure
        assert "by_type" in data, "Response should have 'by_type' field"
        by_type = data["by_type"]
        assert "direct" in by_type
        assert "gap" in by_type
        
        print(f"✓ Dashboard API returns correct structure")
        print(f"  - Total Commission: {overview['total_commission']}")
        print(f"  - Total TDS: {overview['total_tds']}")
        print(f"  - Total Transactions: {overview['total_transactions']}")
    
    def test_dashboard_with_project_filter(self):
        """Test dashboard endpoint with project_id filter"""
        # First get a project ID
        projects_response = self.session.get(f"{BASE_URL}/api/projects/")
        if projects_response.status_code == 200:
            projects = projects_response.json()
            if projects and len(projects) > 0:
                project_id = projects[0].get("id")
                
                response = self.session.get(
                    f"{BASE_URL}/api/commission-analytics/dashboard?project_id={project_id}"
                )
                assert response.status_code == 200
                data = response.json()
                assert data.get("success") == True
                print(f"✓ Dashboard with project filter works - Project: {projects[0].get('name')}")
            else:
                print("⚠ No projects found to test filter")
        else:
            print("⚠ Could not fetch projects for filter test")
    
    def test_trends_endpoint(self):
        """Test /api/commission-analytics/trends returns trend data"""
        response = self.session.get(
            f"{BASE_URL}/api/commission-analytics/trends?period=monthly&months=12"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True
        assert "period" in data
        assert "trends" in data
        assert isinstance(data["trends"], list)
        
        # If there are trends, verify structure
        if len(data["trends"]) > 0:
            trend = data["trends"][0]
            assert "period" in trend
            assert "label" in trend
            assert "commission" in trend
            assert "net" in trend
            assert "tds" in trend
            assert "count" in trend
            print(f"✓ Trends API returns {len(data['trends'])} periods")
        else:
            print("✓ Trends API returns empty list (no commission data)")
    
    def test_trends_quarterly(self):
        """Test trends endpoint with quarterly period"""
        response = self.session.get(
            f"{BASE_URL}/api/commission-analytics/trends?period=quarterly&months=4"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("period") == "quarterly"
        print(f"✓ Quarterly trends API works")
    
    def test_top_performers_endpoint(self):
        """Test /api/commission-analytics/top-performers returns leaderboard"""
        response = self.session.get(
            f"{BASE_URL}/api/commission-analytics/top-performers?limit=10&period=this_month"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True
        assert "period" in data
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        
        # If there are performers, verify structure
        if len(data["leaderboard"]) > 0:
            performer = data["leaderboard"][0]
            assert "rank" in performer
            assert "staff_id" in performer
            assert "staff_name" in performer
            assert "total_commission" in performer
            assert "transaction_count" in performer
            print(f"✓ Top Performers API returns {len(data['leaderboard'])} performers")
            print(f"  - Top performer: {performer['staff_name']} with {performer['total_commission']}")
        else:
            print("✓ Top Performers API returns empty list (no commission data)")
    
    def test_top_performers_all_time(self):
        """Test top performers with all_time period"""
        response = self.session.get(
            f"{BASE_URL}/api/commission-analytics/top-performers?limit=5&period=all_time"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("period") == "all_time"
        print(f"✓ All-time top performers API works")
    
    def test_project_breakdown_endpoint(self):
        """Test /api/commission-analytics/project-breakdown returns project data"""
        response = self.session.get(f"{BASE_URL}/api/commission-analytics/project-breakdown")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True
        assert "total_commission" in data
        assert "project_count" in data
        assert "breakdown" in data
        assert isinstance(data["breakdown"], list)
        
        # If there are projects, verify structure
        if len(data["breakdown"]) > 0:
            project = data["breakdown"][0]
            assert "project_id" in project
            assert "project_name" in project
            assert "total_commission" in project
            assert "transaction_count" in project
            assert "percentage_of_total" in project
            print(f"✓ Project Breakdown API returns {len(data['breakdown'])} projects")
        else:
            print("✓ Project Breakdown API returns empty list (no commission data)")
    
    def test_payout_summary_endpoint(self):
        """Test /api/commission-analytics/payout-summary returns payout data"""
        response = self.session.get(f"{BASE_URL}/api/commission-analytics/payout-summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True
        assert "payouts" in data
        assert "pending" in data
        assert "by_payment_mode" in data
        
        payouts = data["payouts"]
        assert "total_paid" in payouts
        assert "total_tds_deducted" in payouts
        assert "payout_count" in payouts
        
        print(f"✓ Payout Summary API works")
        print(f"  - Total Paid: {payouts['total_paid']}")
        print(f"  - Pending: {data['pending']['amount']}")
    
    def test_unauthorized_access(self):
        """Test endpoints return 401 without auth token"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            "/api/commission-analytics/dashboard",
            "/api/commission-analytics/trends",
            "/api/commission-analytics/top-performers",
            "/api/commission-analytics/project-breakdown"
        ]
        
        for endpoint in endpoints:
            response = no_auth_session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"Expected 401 for {endpoint}, got {response.status_code}"
        
        print(f"✓ All endpoints properly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
