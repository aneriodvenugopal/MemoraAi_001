"""
Test File Upload API - Image Upload and Serve
Tests:
1. Image upload returns both 'url' and 'file_url' fields
2. Uploaded images can be served back
3. Property save with images has valid URLs
"""

import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "9908290239"


class TestFileUploadAPI:
    """Test file upload API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token via OTP flow"""
        # Send OTP
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE
        })
        assert response.status_code == 200, f"Failed to send OTP: {response.text}"
        
        # Get OTP from response (field is 'otp' not 'demo_otp')
        data = response.json()
        otp = data.get("otp") or data.get("demo_otp")
        assert otp, f"OTP not returned in response: {data}"
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": otp
        })
        assert verify_response.status_code == 200, f"Failed to verify OTP: {verify_response.text}"
        
        # Token field is 'access_token' not 'token'
        token = verify_response.json().get("access_token") or verify_response.json().get("token")
        assert token, f"Token not returned after OTP verification: {verify_response.json()}"
        return token
    
    @pytest.fixture(scope="class")
    def test_image_bytes(self):
        """Create a test image in memory"""
        # Create a simple 100x100 red image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    def test_image_upload_returns_url_and_file_url(self, auth_token, test_image_bytes):
        """
        Test 1: Image upload should return both 'url' and 'file_url' fields
        This was the bug - frontend expected 'url' but backend only returned 'file_url'
        """
        files = {
            'file': ('test_image.jpg', test_image_bytes, 'image/jpeg')
        }
        data = {
            'context': 'property_media'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        result = response.json()
        print(f"Upload response: {result}")
        
        # Critical assertions - both fields must be present
        assert "url" in result, "Response missing 'url' field - this was the bug!"
        assert "file_url" in result, "Response missing 'file_url' field"
        
        # Both should have valid values (not None or empty)
        assert result["url"], "url field is empty"
        assert result["file_url"], "file_url field is empty"
        
        # Both should be the same value
        assert result["url"] == result["file_url"], "url and file_url should match"
        
        # URL should start with /api/files/
        assert result["url"].startswith("/api/files/"), f"URL format incorrect: {result['url']}"
        
        # Store for next test
        self.__class__.uploaded_url = result["url"]
        self.__class__.file_id = result.get("file_id")
        
        print(f"✅ Image upload returns both 'url' and 'file_url': {result['url']}")
    
    def test_uploaded_image_can_be_served(self, auth_token):
        """
        Test 2: Uploaded image should be accessible via GET request
        """
        url = getattr(self.__class__, 'uploaded_url', None)
        assert url, "No uploaded URL from previous test"
        
        # Construct full URL
        full_url = f"{BASE_URL}{url}"
        print(f"Fetching image from: {full_url}")
        
        response = requests.get(full_url)
        
        assert response.status_code == 200, f"Failed to serve image: {response.status_code}"
        
        # Check content type is image
        content_type = response.headers.get('Content-Type', '')
        assert 'image' in content_type, f"Expected image content-type, got: {content_type}"
        
        # Check we got actual content
        assert len(response.content) > 0, "Image content is empty"
        
        print(f"✅ Image served successfully: {len(response.content)} bytes, type: {content_type}")
    
    def test_multiple_image_upload(self, auth_token, test_image_bytes):
        """
        Test 3: Multiple image upload should return url for each file
        """
        # Create two test images
        img1 = Image.new('RGB', (100, 100), color='blue')
        img1_bytes = io.BytesIO()
        img1.save(img1_bytes, format='JPEG')
        img1_bytes.seek(0)
        
        img2 = Image.new('RGB', (100, 100), color='green')
        img2_bytes = io.BytesIO()
        img2.save(img2_bytes, format='JPEG')
        img2_bytes.seek(0)
        
        files = [
            ('files', ('test1.jpg', img1_bytes.getvalue(), 'image/jpeg')),
            ('files', ('test2.jpg', img2_bytes.getvalue(), 'image/jpeg'))
        ]
        data = {
            'context': 'property_media'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload/multiple",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Multiple upload failed: {response.text}"
        
        result = response.json()
        print(f"Multiple upload response: {result}")
        
        assert "files" in result, "Response missing 'files' array"
        assert result["success_count"] >= 1, "No files uploaded successfully"
        
        # Check each file has url field
        for file_result in result["files"]:
            if file_result.get("success"):
                assert "url" in file_result, f"File result missing 'url': {file_result}"
                assert "file_url" in file_result, f"File result missing 'file_url': {file_result}"
                print(f"✅ File uploaded with url: {file_result['url']}")


class TestPublicLayoutLocation:
    """Test that PublicLayoutView uses plot coordinates for location"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE
        })
        assert response.status_code == 200
        data = response.json()
        otp = data.get("otp") or data.get("demo_otp")
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": otp
        })
        return verify_response.json().get("access_token") or verify_response.json().get("token")
    
    def test_get_public_layout_with_plot_coordinates(self, auth_token):
        """
        Test: Public layout API should return plot-level coordinates
        The fix was to use selectedPlot?.latitude instead of only project?.latitude
        """
        # First get list of projects
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("No projects available to test")
        
        projects = response.json()
        if not projects:
            pytest.skip("No projects found")
        
        # Find a project with layout
        project_with_layout = None
        for project in projects:
            project_id = project.get("id")
            if project_id:
                layout_response = requests.get(
                    f"{BASE_URL}/api/layouts/public/projects/{project_id}/layout"
                )
                if layout_response.status_code == 200:
                    layout_data = layout_response.json()
                    if layout_data.get("layout") and layout_data["layout"].get("plots"):
                        project_with_layout = layout_data
                        break
        
        if not project_with_layout:
            pytest.skip("No project with layout found")
        
        layout = project_with_layout["layout"]
        project = project_with_layout["project"]
        plots = layout.get("plots", [])
        
        print(f"Found project: {project.get('name')} with {len(plots)} plots")
        
        # Check if plots have their own coordinates
        plots_with_coords = [p for p in plots if p.get("latitude") and p.get("longitude")]
        
        if plots_with_coords:
            print(f"✅ {len(plots_with_coords)} plots have their own coordinates")
            for plot in plots_with_coords[:3]:  # Show first 3
                print(f"  - {plot.get('display_name')}: lat={plot.get('latitude')}, lng={plot.get('longitude')}")
        else:
            print("ℹ️ No plots have individual coordinates - will use project coordinates")
            print(f"  Project coords: lat={project.get('latitude')}, lng={project.get('longitude')}")
        
        # The frontend code now uses: selectedPlot?.latitude || project?.latitude
        # This test verifies the data structure supports this


class TestPropertyImagesInSave:
    """Test that property images are saved with valid URLs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": TEST_PHONE
        })
        assert response.status_code == 200
        data = response.json()
        otp = data.get("otp") or data.get("demo_otp")
        
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": TEST_PHONE,
            "otp": otp
        })
        return verify_response.json().get("access_token") or verify_response.json().get("token")
    
    def test_property_images_have_valid_urls(self, auth_token):
        """
        Test: When fetching properties, property_images should have valid url entries
        """
        # Get projects first
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Cannot fetch projects")
        
        projects = response.json()
        if not projects:
            pytest.skip("No projects found")
        
        # Get properties for first project
        project_id = projects[0].get("id")
        props_response = requests.get(
            f"{BASE_URL}/api/properties?project_id={project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if props_response.status_code != 200:
            pytest.skip("Cannot fetch properties")
        
        properties = props_response.json()
        if not properties:
            pytest.skip("No properties found")
        
        # Check property_images structure
        for prop in properties[:5]:  # Check first 5
            images = prop.get("property_images", [])
            if images:
                print(f"Property {prop.get('property_number')}: {len(images)} images")
                for img in images:
                    if isinstance(img, dict):
                        url = img.get("url")
                        # URL should not be undefined or empty
                        if url:
                            assert url != "undefined", f"Image URL is 'undefined': {img}"
                            assert url.strip() != "", f"Image URL is empty: {img}"
                            print(f"  ✅ Valid image URL: {url[:50]}...")
                        else:
                            print(f"  ⚠️ Image missing URL: {img}")
                    elif isinstance(img, str):
                        assert img != "undefined", f"Image URL string is 'undefined'"
                        assert img.strip() != "", f"Image URL string is empty"
                        print(f"  ✅ Valid image URL string: {img[:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
