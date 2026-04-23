"""
RealApex ERP - Comprehensive Backend API Tests
Tests for critical endpoints after branding changes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')

# Test credentials
TENANT_ADMIN_CREDS = {"email": "rajam@realapex.in", "password": "12345678"}
SUPER_ADMIN_CREDS = {"email": "superadmin@realapex.in", "password": "admin123"}


class TestHealthCheck:
    """Health check tests"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "ExlainERP" in data["message"] or "RealApex" in data["message"]


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_tenant_admin_login(self):
        """Test tenant admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "tenant_admin"
        assert data["user"]["email"] == TENANT_ADMIN_CREDS["email"]
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
    
    def test_invalid_login(self):
        """Test invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404]


@pytest.fixture
def tenant_admin_token():
    """Get tenant admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_ADMIN_CREDS)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Tenant admin login failed")


@pytest.fixture
def super_admin_token():
    """Get super admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Super admin login failed")


class TestProjectsAPI:
    """Projects endpoint tests"""
    
    def test_get_projects(self, tenant_admin_token):
        """Test fetching projects list"""
        response = requests.get(
            f"{BASE_URL}/api/projects/",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Should have projects
        
        # Verify project structure
        project = data[0]
        assert "id" in project
        assert "name" in project
        assert "tenant_id" in project


class TestLeadsAPI:
    """Leads endpoint tests"""
    
    def test_get_leads(self, tenant_admin_token):
        """Test fetching leads list"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=10",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data or isinstance(data, list)


class TestBookingsAPI:
    """Bookings endpoint tests - Critical after fix"""
    
    def test_get_bookings(self, tenant_admin_token):
        """Test fetching bookings list - was failing before fix"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/?limit=10",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify booking structure if data exists
        if len(data) > 0:
            booking = data[0]
            assert "id" in booking
            assert "tenant_id" in booking
            assert "customer_id" in booking
            # payment_plan_type should now be optional with default
            assert "payment_plan_type" in booking


class TestAnalyticsAPI:
    """Analytics endpoint tests"""
    
    def test_dashboard_analytics(self, tenant_admin_token):
        """Test dashboard analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data
        assert "total_leads" in data["overview"]
        assert "total_bookings" in data["overview"]
        assert "total_projects" in data["overview"]


class TestPropertiesAPI:
    """Properties endpoint tests"""
    
    def test_get_properties_by_project(self, tenant_admin_token):
        """Test fetching properties for a project"""
        # First get a project
        projects_response = requests.get(
            f"{BASE_URL}/api/projects/",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/properties/?project_id={project_id}",
                headers={"Authorization": f"Bearer {tenant_admin_token}"}
            )
            assert response.status_code == 200


class TestLayoutsAPI:
    """Layouts endpoint tests"""
    
    def test_get_project_layout(self, tenant_admin_token):
        """Test fetching project layout"""
        # First get a project
        projects_response = requests.get(
            f"{BASE_URL}/api/projects/",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/layouts/projects/{project_id}/layout",
                headers={"Authorization": f"Bearer {tenant_admin_token}"}
            )
            # Layout may or may not exist
            assert response.status_code in [200, 404]


class TestSaaSAdminAPI:
    """SaaS Admin endpoint tests"""
    
    def test_saas_dashboard(self, super_admin_token):
        """Test SaaS admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/saas/dashboard",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        # May return 200 or 403 depending on permissions
        assert response.status_code in [200, 403]


class TestTenantsAPI:
    """Tenants endpoint tests"""
    
    def test_get_my_tenant(self, tenant_admin_token):
        """Test fetching current tenant info"""
        response = requests.get(
            f"{BASE_URL}/api/tenants/my-tenant",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "tenant_id" in data


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_categories(self, tenant_admin_token):
        """Test fetching categories"""
        response = requests.get(
            f"{BASE_URL}/api/categories/",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200


class TestSubscriptionsAPI:
    """Subscriptions endpoint tests"""
    
    def test_get_current_subscription(self, tenant_admin_token):
        """Test fetching current subscription"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/current",
            headers={"Authorization": f"Bearer {tenant_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "package" in data or "subscription" in data or "usage" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
