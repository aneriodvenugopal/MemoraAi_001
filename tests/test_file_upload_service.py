"""
Test File Upload Service API
Tests for file upload, retrieval, deletion, and validation
"""

import pytest
import requests
import os
import base64
import uuid

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "9908290239"
TEST_PASSWORD = "12345678"
TENANT_ID = "f18f7bd6-3a1f-472d-acf9-c2fb181787e7"

# Test PNG image (1x1 red pixel)
TEST_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

# Test PDF header (minimal valid PDF)
TEST_PDF_CONTENT = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"


class TestFileUploadService:
    """File Upload Service API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.uploaded_file_ids = []  # Track uploaded files for cleanup
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
            
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": TEST_PHONE, "password": TEST_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            # API returns access_token, not token
            self.token = data.get("access_token") or data.get("token")
            return self.token
        print(f"Auth failed: {response.status_code} - {response.text}")
        return None
    
    def get_auth_headers(self):
        """Get headers with auth token"""
        token = self.get_auth_token()
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    # ==================== Authentication Tests ====================
    
    def test_upload_requires_authentication(self):
        """Test that upload endpoint requires authentication"""
        # Create test image
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("test.png", image_data, "image/png")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            data=data
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Upload requires authentication - returns 401")
    
    def test_list_files_requires_authentication(self):
        """Test that list files endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/files/")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ List files requires authentication - returns 401")
    
    # ==================== Single File Upload Tests ====================
    
    def test_upload_single_image_png(self):
        """Test uploading a single PNG image"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("test_image.png", image_data, "image/png")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Upload should succeed"
        assert "file_url" in result, "Response should contain file_url"
        assert "file_id" in result, "Response should contain file_id"
        assert result.get("category") == "image", "Category should be 'image'"
        assert "thumbnail_url" in result, "Image should have thumbnail_url"
        
        # Store file_id for cleanup
        self.uploaded_file_ids.append(result.get("file_id"))
        
        print(f"✓ Single PNG upload successful - file_url: {result.get('file_url')}")
        print(f"  - file_id: {result.get('file_id')}")
        print(f"  - thumbnail_url: {result.get('thumbnail_url')}")
        
        return result
    
    def test_upload_single_image_jpeg(self):
        """Test uploading a JPEG image"""
        headers = self.get_auth_headers()
        
        # Create a minimal JPEG (1x1 pixel)
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xA9,
            0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {"file": ("test_image.jpg", jpeg_data, "image/jpeg")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Upload should succeed"
        assert result.get("category") == "image", "Category should be 'image'"
        
        self.uploaded_file_ids.append(result.get("file_id"))
        print(f"✓ JPEG upload successful - file_url: {result.get('file_url')}")
    
    def test_upload_pdf_document(self):
        """Test uploading a PDF document"""
        headers = self.get_auth_headers()
        
        files = {"file": ("test_document.pdf", TEST_PDF_CONTENT, "application/pdf")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Upload should succeed"
        assert result.get("category") == "document", "Category should be 'document'"
        assert result.get("thumbnail_url") is None, "PDF should not have thumbnail"
        
        self.uploaded_file_ids.append(result.get("file_id"))
        print(f"✓ PDF upload successful - file_url: {result.get('file_url')}")
    
    def test_upload_with_context_property_media(self):
        """Test uploading with property_media context"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("property_image.png", image_data, "image/png")}
        data = {
            "context": "property_media",
            "related_id": "test-property-123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        assert "/api/files/property_media/" in result.get("file_url", ""), "URL should contain property_media context"
        
        self.uploaded_file_ids.append(result.get("file_id"))
        print(f"✓ Upload with property_media context successful")
    
    def test_upload_with_description(self):
        """Test uploading with description metadata"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("described_image.png", image_data, "image/png")}
        data = {
            "context": "general",
            "description": "Test image with description"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True
        
        self.uploaded_file_ids.append(result.get("file_id"))
        print(f"✓ Upload with description successful")
    
    # ==================== Multiple File Upload Tests ====================
    
    def test_upload_multiple_files(self):
        """Test uploading multiple files at once"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = [
            ("files", ("image1.png", image_data, "image/png")),
            ("files", ("image2.png", image_data, "image/png")),
            ("files", ("document.pdf", TEST_PDF_CONTENT, "application/pdf"))
        ]
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload/multiple",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("total") == 3, "Should have 3 total files"
        assert result.get("success_count") == 3, "All 3 files should succeed"
        assert result.get("failed_count") == 0, "No files should fail"
        assert len(result.get("files", [])) == 3, "Should return 3 file results"
        
        # Store file IDs for cleanup
        for file_result in result.get("files", []):
            if file_result.get("file_id"):
                self.uploaded_file_ids.append(file_result.get("file_id"))
        
        print(f"✓ Multiple file upload successful - {result.get('success_count')}/{result.get('total')} files")
    
    def test_upload_multiple_files_max_limit(self):
        """Test that multiple upload rejects more than 10 files"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        # Create 11 files
        files = [
            ("files", (f"image{i}.png", image_data, "image/png"))
            for i in range(11)
        ]
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload/multiple",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Multiple upload rejects >10 files - returns 400")
    
    # ==================== File Validation Tests ====================
    
    def test_reject_unsupported_file_type(self):
        """Test that unsupported file types are rejected"""
        headers = self.get_auth_headers()
        
        # Create a fake executable file
        exe_content = b"MZ" + b"\x00" * 100  # Minimal PE header
        
        files = {"file": ("malicious.exe", exe_content, "application/x-msdownload")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        result = response.json()
        assert "not allowed" in result.get("detail", "").lower() or "not allowed" in str(result).lower(), \
            "Error should mention file type not allowed"
        
        print(f"✓ Unsupported file type rejected - .exe returns 400")
    
    def test_reject_empty_file(self):
        """Test that empty files are rejected"""
        headers = self.get_auth_headers()
        
        files = {"file": ("empty.png", b"", "image/png")}
        data = {"context": "general"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Empty file rejected - returns 400")
    
    def test_reject_invalid_context(self):
        """Test that invalid context is rejected"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("test.png", image_data, "image/png")}
        data = {"context": "invalid_context_xyz"}
        
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Invalid context rejected - returns 400")
    
    # ==================== File Listing Tests ====================
    
    def test_list_files_for_tenant(self):
        """Test listing files for current tenant"""
        headers = self.get_auth_headers()
        
        response = requests.get(
            f"{BASE_URL}/api/files/",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "files" in result, "Response should contain 'files' array"
        assert "count" in result, "Response should contain 'count'"
        assert isinstance(result.get("files"), list), "Files should be a list"
        
        print(f"✓ List files successful - {result.get('count')} files found")
    
    def test_list_files_with_context_filter(self):
        """Test listing files filtered by context"""
        headers = self.get_auth_headers()
        
        response = requests.get(
            f"{BASE_URL}/api/files/",
            headers=headers,
            params={"context": "general"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        # All returned files should have context "general"
        for file in result.get("files", []):
            assert file.get("context") == "general", f"File context should be 'general', got {file.get('context')}"
        
        print(f"✓ List files with context filter successful")
    
    def test_list_files_with_category_filter(self):
        """Test listing files filtered by category"""
        headers = self.get_auth_headers()
        
        response = requests.get(
            f"{BASE_URL}/api/files/",
            headers=headers,
            params={"category": "image"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        # All returned files should have category "image"
        for file in result.get("files", []):
            assert file.get("category") == "image", f"File category should be 'image', got {file.get('category')}"
        
        print(f"✓ List files with category filter successful")
    
    # ==================== File Serving Tests ====================
    
    def test_serve_uploaded_file(self):
        """Test serving an uploaded file"""
        # First upload a file
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("serve_test.png", image_data, "image/png")}
        data = {"context": "general"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert upload_response.status_code == 200, "Upload should succeed"
        
        result = upload_response.json()
        file_url = result.get("file_url")
        self.uploaded_file_ids.append(result.get("file_id"))
        
        # Now try to serve the file
        serve_response = requests.get(f"{BASE_URL}{file_url}")
        
        assert serve_response.status_code == 200, f"Expected 200, got {serve_response.status_code}"
        assert serve_response.headers.get("content-type") == "image/png", "Content-type should be image/png"
        assert len(serve_response.content) > 0, "File content should not be empty"
        
        print(f"✓ File serving successful - {len(serve_response.content)} bytes")
    
    def test_serve_thumbnail(self):
        """Test serving thumbnail for uploaded image"""
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("thumb_test.png", image_data, "image/png")}
        data = {"context": "general"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert upload_response.status_code == 200, "Upload should succeed"
        
        result = upload_response.json()
        thumbnail_url = result.get("thumbnail_url")
        self.uploaded_file_ids.append(result.get("file_id"))
        
        if thumbnail_url:
            # Serve the thumbnail
            thumb_response = requests.get(f"{BASE_URL}{thumbnail_url}")
            
            assert thumb_response.status_code == 200, f"Expected 200, got {thumb_response.status_code}"
            assert "image" in thumb_response.headers.get("content-type", ""), "Should be an image"
            
            print(f"✓ Thumbnail serving successful - {len(thumb_response.content)} bytes")
        else:
            print("⚠ No thumbnail generated (may be expected for small images)")
    
    def test_serve_nonexistent_file(self):
        """Test serving a non-existent file returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/files/general/{TENANT_ID}/nonexistent_file_xyz.png"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent file returns 404")
    
    def test_serve_file_path_traversal_blocked(self):
        """Test that path traversal attempts are blocked"""
        response = requests.get(
            f"{BASE_URL}/api/files/general/{TENANT_ID}/../../../etc/passwd"
        )
        
        # Should return 400 or 404, not the actual file
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        print(f"✓ Path traversal blocked - returns {response.status_code}")
    
    # ==================== File Deletion Tests ====================
    
    def test_delete_file(self):
        """Test deleting an uploaded file"""
        # First upload a file
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("delete_test.png", image_data, "image/png")}
        data = {"context": "general"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert upload_response.status_code == 200, "Upload should succeed"
        
        result = upload_response.json()
        file_id = result.get("file_id")
        
        # Delete the file
        delete_response = requests.delete(
            f"{BASE_URL}/api/files/{file_id}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        delete_result = delete_response.json()
        assert delete_result.get("success") == True, "Delete should succeed"
        
        print(f"✓ File deletion successful")
    
    def test_delete_nonexistent_file(self):
        """Test deleting a non-existent file returns 404"""
        headers = self.get_auth_headers()
        
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/files/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Delete non-existent file returns 404")
    
    # ==================== Property Media Endpoint Tests ====================
    
    def test_get_property_media(self):
        """Test getting media files for a property"""
        headers = self.get_auth_headers()
        
        # Use a test property ID
        property_id = "3f61fcf3-dbff-44d3-8ea3-c49452b78dc5"
        
        response = requests.get(
            f"{BASE_URL}/api/files/property/{property_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert "property_id" in result, "Response should contain property_id"
        assert "images" in result, "Response should contain images array"
        assert "videos" in result, "Response should contain videos array"
        assert "documents" in result, "Response should contain documents array"
        assert "total" in result, "Response should contain total count"
        
        print(f"✓ Get property media successful - {result.get('total')} files")
        print(f"  - Images: {len(result.get('images', []))}")
        print(f"  - Videos: {len(result.get('videos', []))}")
        print(f"  - Documents: {len(result.get('documents', []))}")
    
    # ==================== Get File By ID Tests ====================
    
    def test_get_file_by_id(self):
        """Test getting file metadata by ID"""
        # First upload a file
        headers = self.get_auth_headers()
        image_data = base64.b64decode(TEST_PNG_BASE64)
        
        files = {"file": ("getbyid_test.png", image_data, "image/png")}
        data = {"context": "general"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        assert upload_response.status_code == 200, "Upload should succeed"
        
        result = upload_response.json()
        file_id = result.get("file_id")
        self.uploaded_file_ids.append(file_id)
        
        # Get file by ID
        get_response = requests.get(
            f"{BASE_URL}/api/files/by-id/{file_id}",
            headers=headers
        )
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        file_data = get_response.json()
        assert file_data.get("id") == file_id, "File ID should match"
        assert "file_url" in file_data, "Should contain file_url"
        assert "original_filename" in file_data, "Should contain original_filename"
        assert "content_type" in file_data, "Should contain content_type"
        
        print(f"✓ Get file by ID successful")
    
    def test_get_file_by_id_not_found(self):
        """Test getting non-existent file by ID returns 404"""
        headers = self.get_auth_headers()
        
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/files/by-id/{fake_id}",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Get non-existent file by ID returns 404")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
