"""
P1 Features Backend Tests
- Document Locker: Physical location mapping, document CRUD, search
- Festival Greetings: Config, recipients, send greetings

Test credentials: rajam@retoerp.com / 12345678 (Tenant Admin)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tenant admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful, user role: {data['user'].get('role')}")


class TestDocumentLockerPhysicalLocations:
    """Document Locker - Physical Location tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_physical_locations(self, headers):
        """Test getting physical locations list"""
        response = requests.get(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "locations" in data
        print(f"✅ Got {len(data['locations'])} physical locations")
    
    def test_create_physical_location(self, headers):
        """Test creating a new physical location"""
        import uuid
        location_name = f"TEST-STORAGE-{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers,
            json={
                "name": location_name,
                "description": "Test storage location for automated testing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "location" in data
        assert data["location"]["name"] == location_name.upper()
        print(f"✅ Created physical location: {data['location']['name']}")
        return data["location"]
    
    def test_create_duplicate_location_fails(self, headers):
        """Test that duplicate location names are rejected"""
        # First create a location
        import uuid
        location_name = f"TEST-DUP-{uuid.uuid4().hex[:6].upper()}"
        
        response1 = requests.post(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers,
            json={"name": location_name, "description": "First"}
        )
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers,
            json={"name": location_name, "description": "Duplicate"}
        )
        assert response2.status_code == 400
        print(f"✅ Duplicate location correctly rejected")


class TestDocumentLockerDocuments:
    """Document Locker - Document CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_location(self, headers):
        """Create a test location for document tests"""
        import uuid
        location_name = f"TEST-DOC-LOC-{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers,
            json={"name": location_name, "description": "For document tests"}
        )
        return response.json()["location"]
    
    def test_get_documents(self, headers):
        """Test getting documents list"""
        response = requests.get(
            f"{BASE_URL}/api/document-locker/documents",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documents" in data
        assert "total" in data
        print(f"✅ Got {len(data['documents'])} documents (total: {data['total']})")
    
    def test_upload_file(self, headers):
        """Test file upload endpoint"""
        # Create a simple test file
        import io
        test_content = b"Test PDF content for document locker"
        files = {
            'file': ('test_document.pdf', io.BytesIO(test_content), 'application/pdf')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/upload",
            headers=headers,
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "file_url" in data
        assert "file_type" in data
        print(f"✅ File uploaded: {data['file_url']}")
        return data
    
    def test_create_document_with_physical_location(self, headers, test_location):
        """Test creating a document with physical location mapping"""
        import uuid
        
        # First upload a file
        test_content = b"Test document content"
        files = {'file': ('test.pdf', test_content, 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/document-locker/upload",
            headers=headers,
            files=files
        )
        file_data = upload_response.json()
        
        # Create document with physical location
        doc_data = {
            "customer_name": f"TEST Customer {uuid.uuid4().hex[:6]}",
            "customer_mobile": "9876543210",
            "customer_email": "test@example.com",
            "document_name": f"TEST Sale Deed {uuid.uuid4().hex[:6]}",
            "document_type": "Sale Deed",
            "file_url": file_data["file_url"],
            "file_type": file_data["file_type"],
            "file_size": file_data["file_size"],
            "keywords": ["test", "sale-deed", "automated"],
            "physical_location_id": test_location["id"],
            "notes": "Automated test document"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/documents",
            headers=headers,
            json=doc_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "document" in data
        assert "physical_code" in data
        
        # Verify physical code format (e.g., LOCATION-NAME-001)
        physical_code = data["physical_code"]
        assert test_location["name"] in physical_code
        print(f"✅ Document created with physical code: {physical_code}")
        return data["document"]
    
    def test_get_document_by_id(self, headers, test_location):
        """Test getting a single document"""
        # First create a document
        test_content = b"Test content"
        files = {'file': ('test.pdf', test_content, 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/document-locker/upload",
            headers=headers,
            files=files
        )
        file_data = upload_response.json()
        
        doc_data = {
            "customer_name": "TEST Get Doc Customer",
            "customer_mobile": "9876543211",
            "document_name": "TEST Get Document",
            "document_type": "Agreement",
            "file_url": file_data["file_url"],
            "file_type": file_data["file_type"],
            "file_size": file_data["file_size"],
            "keywords": ["test"],
            "physical_location_id": test_location["id"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/document-locker/documents",
            headers=headers,
            json=doc_data
        )
        created_doc = create_response.json()["document"]
        
        # Get the document
        response = requests.get(
            f"{BASE_URL}/api/document-locker/documents/{created_doc['id']}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["document"]["id"] == created_doc["id"]
        # Admin should see physical_code
        assert "physical_code" in data["document"]
        print(f"✅ Got document by ID with physical code: {data['document']['physical_code']}")


class TestDocumentLockerSearch:
    """Document Locker - Search tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_document(self, headers):
        """Create a test document for search tests"""
        import uuid
        
        # Create location
        location_name = f"TEST-SEARCH-{uuid.uuid4().hex[:6].upper()}"
        loc_response = requests.post(
            f"{BASE_URL}/api/document-locker/physical-locations",
            headers=headers,
            json={"name": location_name}
        )
        location = loc_response.json()["location"]
        
        # Upload file
        files = {'file': ('test.pdf', b"Test", 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/document-locker/upload",
            headers=headers,
            files=files
        )
        file_data = upload_response.json()
        
        # Create document with unique identifiers
        unique_id = uuid.uuid4().hex[:8]
        doc_data = {
            "customer_name": f"SearchTest Customer {unique_id}",
            "customer_mobile": f"98765{unique_id[:5]}",
            "document_name": f"SearchTest Document {unique_id}",
            "document_type": "NOC",
            "file_url": file_data["file_url"],
            "file_type": file_data["file_type"],
            "file_size": file_data["file_size"],
            "keywords": [f"searchkeyword{unique_id}", "noc", "test"],
            "physical_location_id": location["id"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/documents",
            headers=headers,
            json=doc_data
        )
        return response.json()["document"]
    
    def test_search_by_customer_name(self, headers, test_document):
        """Test searching documents by customer name"""
        search_term = test_document["customer_name"].split()[0]  # "SearchTest"
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/documents/search",
            headers=headers,
            json={"customer_name": search_term}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["count"] >= 1
        # Verify our test document is in results
        doc_ids = [d["id"] for d in data["documents"]]
        assert test_document["id"] in doc_ids
        print(f"✅ Search by customer name found {data['count']} documents")
    
    def test_search_by_mobile(self, headers, test_document):
        """Test searching documents by mobile number"""
        mobile = test_document["customer_mobile"]
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/documents/search",
            headers=headers,
            json={"customer_mobile": mobile}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["count"] >= 1
        print(f"✅ Search by mobile found {data['count']} documents")
    
    def test_search_by_keyword(self, headers, test_document):
        """Test searching documents by keyword"""
        # Get the unique keyword from test document
        keyword = test_document["keywords"][0]  # searchkeyword{unique_id}
        
        response = requests.post(
            f"{BASE_URL}/api/document-locker/documents/search",
            headers=headers,
            json={"keyword": keyword}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["count"] >= 1
        print(f"✅ Search by keyword '{keyword}' found {data['count']} documents")


class TestFestivalGreetingsConfig:
    """Festival Greetings - Configuration tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_greeting_config(self, headers):
        """Test getting greeting configuration"""
        response = requests.get(
            f"{BASE_URL}/api/festival-greetings/config",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "config" in data
        assert "greeting_dates" in data or "greeting_dates" in data.get("config", {})
        print(f"✅ Got greeting config, enabled: {data['config'].get('is_enabled', False)}")
    
    def test_update_greeting_config_enable(self, headers):
        """Test enabling greetings with company name"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/config?is_enabled=true&company_name=Test%20Company%20Ltd",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["is_enabled"] == True
        assert data["config"]["company_name"] == "Test Company Ltd"
        print(f"✅ Greetings enabled with company: {data['config']['company_name']}")
    
    def test_update_greeting_config_disable(self, headers):
        """Test disabling greetings"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/config?is_enabled=false&company_name=Test%20Company%20Ltd",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["is_enabled"] == False
        print(f"✅ Greetings disabled")
    
    def test_config_requires_company_name(self, headers):
        """Test that config update requires company name"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/config?is_enabled=true&company_name=",
            headers=headers
        )
        assert response.status_code == 400
        print(f"✅ Empty company name correctly rejected")


class TestFestivalGreetingsRecipients:
    """Festival Greetings - Recipient management tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_recipients(self, headers):
        """Test getting recipients list"""
        response = requests.get(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "recipients" in data
        assert "total" in data
        print(f"✅ Got {data['total']} recipients")
    
    def test_add_customer_recipient(self, headers):
        """Test adding a customer as recipient"""
        import uuid
        
        recipient_data = {
            "name": f"TEST Customer {uuid.uuid4().hex[:6]}",
            "mobile": f"98765{uuid.uuid4().hex[:5]}",
            "source_type": "customer"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["recipient"]["source_type"] == "customer"
        print(f"✅ Added customer recipient: {data['recipient']['name']}")
        return data["recipient"]
    
    def test_add_past_customer_recipient(self, headers):
        """Test adding a past customer as recipient"""
        import uuid
        
        recipient_data = {
            "name": f"TEST Past Customer {uuid.uuid4().hex[:6]}",
            "mobile": f"98764{uuid.uuid4().hex[:5]}",
            "source_type": "past_customer"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["recipient"]["source_type"] == "past_customer"
        print(f"✅ Added past customer recipient")
    
    def test_add_internal_contact_recipient(self, headers):
        """Test adding an internal contact as recipient"""
        import uuid
        
        recipient_data = {
            "name": f"TEST Internal {uuid.uuid4().hex[:6]}",
            "mobile": f"98763{uuid.uuid4().hex[:5]}",
            "source_type": "internal_contact"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["recipient"]["source_type"] == "internal_contact"
        print(f"✅ Added internal contact recipient")
    
    def test_reject_lead_as_recipient(self, headers):
        """Test that leads are NOT allowed as recipients"""
        import uuid
        
        recipient_data = {
            "name": f"TEST Lead {uuid.uuid4().hex[:6]}",
            "mobile": f"98762{uuid.uuid4().hex[:5]}",
            "source_type": "lead"  # This should be rejected
        }
        
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        assert response.status_code == 400
        assert "lead" in response.json().get("detail", "").lower() or "invalid" in response.json().get("detail", "").lower()
        print(f"✅ Lead correctly rejected as recipient")
    
    def test_remove_recipient(self, headers):
        """Test removing a recipient"""
        import uuid
        
        # First add a recipient
        recipient_data = {
            "name": f"TEST ToRemove {uuid.uuid4().hex[:6]}",
            "mobile": f"98761{uuid.uuid4().hex[:5]}",
            "source_type": "customer"
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        recipient_id = add_response.json()["recipient"]["id"]
        
        # Remove the recipient
        response = requests.delete(
            f"{BASE_URL}/api/festival-greetings/recipients/{recipient_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Recipient removed successfully")


class TestFestivalGreetingsSend:
    """Festival Greetings - Send greetings tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "rajam@retoerp.com", "password": "12345678"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def setup_for_send(self, headers):
        """Setup: Enable greetings and add a recipient"""
        import uuid
        
        # Enable greetings
        requests.post(
            f"{BASE_URL}/api/festival-greetings/config?is_enabled=true&company_name=Test%20Company",
            headers=headers
        )
        
        # Add a recipient
        recipient_data = {
            "name": f"TEST SendTest {uuid.uuid4().hex[:6]}",
            "mobile": f"98760{uuid.uuid4().hex[:5]}",
            "source_type": "customer"
        }
        requests.post(
            f"{BASE_URL}/api/festival-greetings/recipients",
            headers=headers,
            json=recipient_data
        )
        
        return True
    
    def test_send_republic_day_greetings(self, headers, setup_for_send):
        """Test sending Republic Day greetings (MOCKED SMS)"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/send?festival=republic_day",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "sent" in data
        print(f"✅ Republic Day greetings sent: {data['sent']} (MOCKED)")
    
    def test_send_independence_day_greetings(self, headers, setup_for_send):
        """Test sending Independence Day greetings (MOCKED SMS)"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/send?festival=independence_day",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "sent" in data
        print(f"✅ Independence Day greetings sent: {data['sent']} (MOCKED)")
    
    def test_reject_invalid_festival(self, headers, setup_for_send):
        """Test that invalid festival names are rejected"""
        response = requests.post(
            f"{BASE_URL}/api/festival-greetings/send?festival=diwali",
            headers=headers
        )
        assert response.status_code == 400
        print(f"✅ Invalid festival 'diwali' correctly rejected")
    
    def test_get_greeting_logs(self, headers, setup_for_send):
        """Test getting greeting send logs"""
        response = requests.get(
            f"{BASE_URL}/api/festival-greetings/logs?limit=50",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "logs" in data
        print(f"✅ Got {len(data['logs'])} greeting logs")
    
    def test_check_today_greetings(self, headers):
        """Test the cron check endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/festival-greetings/check-today",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_greeting_day" in data
        print(f"✅ Today is greeting day: {data['is_greeting_day']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
