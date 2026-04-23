"""
Backend API Tests for RETOERP Layout Features
Tests: Public Layout API, Layout Editor API, Plot Status Colors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')
TEST_PROJECT_ID = "23dde7ab-0d13-45cc-8886-bcceb3d9d35e"

# Test credentials
TENANT_ADMIN_EMAIL = "rajam@retoerp.com"
TENANT_ADMIN_PASSWORD = "12345678"
SUPER_ADMIN_EMAIL = "superadmin@retoerp.com"
SUPER_ADMIN_PASSWORD = "admin123"


class TestPublicLayoutAPI:
    """Tests for public layout API - no auth required"""
    
    def test_public_layout_endpoint_returns_200(self):
        """Test that public layout endpoint is accessible without auth"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_public_layout_returns_layout_data(self):
        """Test that public layout returns layout with plots"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        assert 'layout' in data, "Response should contain 'layout' key"
        assert 'project' in data, "Response should contain 'project' key"
        
        layout = data['layout']
        assert 'plots' in layout, "Layout should contain 'plots'"
        assert 'svg_url' in layout, "Layout should contain 'svg_url'"
        
    def test_public_layout_has_correct_plot_count(self):
        """Test that layout has expected number of plots (12)"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        plots = data['layout']['plots']
        assert len(plots) == 12, f"Expected 12 plots, got {len(plots)}"
        
    def test_public_layout_plot_statuses(self):
        """Test that plots have correct status distribution"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        plots = data['layout']['plots']
        status_counts = {}
        for plot in plots:
            status = plot.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Expected: 7 Available, 3 Booked, 2 Blocked, 0 Sold
        assert status_counts.get('available', 0) == 7, f"Expected 7 available, got {status_counts.get('available', 0)}"
        assert status_counts.get('booked', 0) == 3, f"Expected 3 booked, got {status_counts.get('booked', 0)}"
        assert status_counts.get('blocked', 0) == 2, f"Expected 2 blocked, got {status_counts.get('blocked', 0)}"
        
    def test_public_layout_plot_coordinates_structure(self):
        """Test that each plot has valid coordinates array"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        plots = data['layout']['plots']
        for plot in plots:
            assert 'coordinates' in plot, f"Plot {plot.get('display_name')} missing coordinates"
            coords = plot['coordinates']
            assert len(coords) >= 3, f"Plot {plot.get('display_name')} should have at least 3 coordinates"
            
            for coord in coords:
                assert 'x' in coord, f"Coordinate missing 'x'"
                assert 'y' in coord, f"Coordinate missing 'y'"
                assert isinstance(coord['x'], (int, float)), f"x should be numeric"
                assert isinstance(coord['y'], (int, float)), f"y should be numeric"
                
    def test_public_layout_plot_has_required_fields(self):
        """Test that each plot has required fields for display"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        plots = data['layout']['plots']
        required_fields = ['id', 'display_name', 'status', 'coordinates']
        
        for plot in plots:
            for field in required_fields:
                assert field in plot, f"Plot missing required field: {field}"
                
    def test_public_layout_project_info(self):
        """Test that project info is returned correctly"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        project = data['project']
        assert project['id'] == TEST_PROJECT_ID
        assert 'name' in project
        assert project['name'] == 'SATTENAPALLI Layout Plan'
        
    def test_public_layout_svg_url_accessible(self):
        """Test that SVG URL is accessible"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/{TEST_PROJECT_ID}/layout")
        data = response.json()
        
        svg_url = data['layout']['svg_url']
        assert svg_url, "SVG URL should not be empty"
        
        # Build full URL if relative
        if svg_url.startswith('/'):
            full_svg_url = f"{BASE_URL}{svg_url}"
        else:
            full_svg_url = svg_url
            
        svg_response = requests.get(full_svg_url)
        assert svg_response.status_code == 200, f"SVG file not accessible: {svg_response.status_code}"
        
    def test_public_layout_invalid_project_returns_404(self):
        """Test that invalid project ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/layouts/public/projects/invalid-project-id/layout")
        assert response.status_code == 404


class TestAuthenticatedLayoutAPI:
    """Tests for authenticated layout API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for tenant admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TENANT_ADMIN_EMAIL,
            "password": TENANT_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
        
    def test_authenticated_layout_endpoint(self, auth_token):
        """Test authenticated layout endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/layouts/projects/{TEST_PROJECT_ID}/layout",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_authenticated_layout_returns_full_data(self, auth_token):
        """Test that authenticated endpoint returns full layout data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/layouts/projects/{TEST_PROJECT_ID}/layout",
            headers=headers
        )
        data = response.json()
        
        assert data.get('success') == True
        assert 'layout' in data
        assert 'project' in data


class TestProjectsAPI:
    """Tests for projects API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TENANT_ADMIN_EMAIL,
            "password": TENANT_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip(f"Authentication failed: {response.status_code}")
        
    def test_projects_list_endpoint(self, auth_token):
        """Test projects list endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert response.status_code == 200
        
    def test_project_detail_endpoint(self, auth_token):
        """Test project detail endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}", headers=headers)
        assert response.status_code == 200


class TestAuthAPI:
    """Tests for authentication API"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid tenant admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TENANT_ADMIN_EMAIL,
            "password": TENANT_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert 'token' in data or 'access_token' in data, "Response should contain token"
        
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400, 404], f"Expected auth error, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
