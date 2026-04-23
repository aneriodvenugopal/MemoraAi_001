"""
Test Suite for P4 Features: Complaint System and Referral/Wallet System
- Complaint CRUD and workflow operations
- Referral creation and management
- Wallet balance and transactions
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TENANT_ADMIN_EMAIL = "rajam@retoerp.com"
TENANT_ADMIN_PASSWORD = "12345678"


class TestAuthentication:
    """Authentication tests - run first"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TENANT_ADMIN_EMAIL, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API uses 'access_token' not 'token'
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 10
        print(f"✓ Login successful, token obtained")


class TestComplaintSystem:
    """Complaint System API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TENANT_ADMIN_EMAIL, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    @pytest.fixture(scope="class")
    def test_complaint_id(self, headers):
        """Create a test complaint and return its ID"""
        complaint_data = {
            "customer_name": "TEST_Complaint_Customer",
            "customer_phone": "9876543210",
            "customer_email": "test.complaint@example.com",
            "category": "construction",
            "subject": "TEST_Water leakage in bathroom",
            "description": "There is water leakage from the ceiling in the master bathroom. This needs urgent attention.",
            "priority": "high"
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        assert response.status_code == 200, f"Failed to create test complaint: {response.text}"
        data = response.json()
        assert data.get("success") == True
        return data["complaint"]["id"]
    
    # ==================== Complaint CRUD Tests ====================
    
    def test_create_complaint(self, headers):
        """Test creating a new complaint"""
        complaint_data = {
            "customer_name": "TEST_John Doe",
            "customer_phone": "9876543211",
            "customer_email": "john.doe@example.com",
            "category": "payment",
            "subject": "TEST_Payment not reflected",
            "description": "I made a payment 3 days ago but it's not showing in my account.",
            "priority": "medium"
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        assert response.status_code == 200, f"Create complaint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "complaint_number" in data
        assert data["complaint_number"].startswith("CMP-")
        assert "complaint" in data
        assert data["complaint"]["customer_name"] == "TEST_John Doe"
        assert data["complaint"]["status"] == "open"
        assert data["complaint"]["priority"] == "medium"
        print(f"✓ Created complaint: {data['complaint_number']}")
    
    def test_list_complaints(self, headers):
        """Test listing all complaints"""
        response = requests.get(
            f"{BASE_URL}/api/complaints",
            headers=headers
        )
        assert response.status_code == 200, f"List complaints failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "complaints" in data
        assert "total" in data
        assert isinstance(data["complaints"], list)
        print(f"✓ Listed {data['total']} complaints")
    
    def test_list_complaints_with_status_filter(self, headers):
        """Test listing complaints with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/complaints?status=open",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        # All returned complaints should have status 'open'
        for complaint in data["complaints"]:
            assert complaint["status"] == "open"
        print(f"✓ Filtered complaints by status=open: {len(data['complaints'])} found")
    
    def test_list_complaints_with_priority_filter(self, headers):
        """Test listing complaints with priority filter"""
        response = requests.get(
            f"{BASE_URL}/api/complaints?priority=high",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        for complaint in data["complaints"]:
            assert complaint["priority"] == "high"
        print(f"✓ Filtered complaints by priority=high: {len(data['complaints'])} found")
    
    def test_list_complaints_with_category_filter(self, headers):
        """Test listing complaints with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/complaints?category=construction",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        for complaint in data["complaints"]:
            assert complaint["category"] == "construction"
        print(f"✓ Filtered complaints by category=construction: {len(data['complaints'])} found")
    
    def test_get_complaint_details(self, headers, test_complaint_id):
        """Test getting single complaint with comments"""
        response = requests.get(
            f"{BASE_URL}/api/complaints/{test_complaint_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Get complaint failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "complaint" in data
        assert "comments" in data
        assert data["complaint"]["id"] == test_complaint_id
        print(f"✓ Got complaint details with {len(data['comments'])} comments")
    
    def test_get_complaint_not_found(self, headers):
        """Test getting non-existent complaint returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/complaints/non-existent-id-12345",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Non-existent complaint returns 404")
    
    # ==================== Complaint Workflow Tests ====================
    
    def test_assign_complaint(self, headers, test_complaint_id):
        """Test assigning complaint to staff"""
        # First get a user to assign to
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert users_response.status_code == 200
        users_data = users_response.json()
        
        if users_data.get("users") and len(users_data["users"]) > 0:
            assign_to = users_data["users"][0]["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/complaints/assign?complaint_id={test_complaint_id}&assign_to={assign_to}",
                headers=headers
            )
            assert response.status_code == 200, f"Assign complaint failed: {response.text}"
            data = response.json()
            
            assert data.get("success") == True
            assert "message" in data
            print(f"✓ Assigned complaint to staff")
        else:
            pytest.skip("No users available for assignment")
    
    def test_add_comment_to_complaint(self, headers, test_complaint_id):
        """Test adding comment to complaint"""
        comment_data = {
            "complaint_id": test_complaint_id,
            "comment": "TEST_Investigating the issue. Will update soon.",
            "is_internal": False
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/comments/add",
            headers=headers,
            json=comment_data
        )
        assert response.status_code == 200, f"Add comment failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "comment" in data
        assert data["comment"]["comment"] == "TEST_Investigating the issue. Will update soon."
        print("✓ Added comment to complaint")
    
    def test_add_internal_comment(self, headers, test_complaint_id):
        """Test adding internal comment (not visible to customer)"""
        comment_data = {
            "complaint_id": test_complaint_id,
            "comment": "TEST_Internal note: Customer has history of similar complaints",
            "is_internal": True
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/comments/add",
            headers=headers,
            json=comment_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data["comment"]["is_internal"] == True
        print("✓ Added internal comment to complaint")
    
    def test_escalate_complaint(self, headers, test_complaint_id):
        """Test escalating complaint"""
        # Get a manager/admin user to escalate to
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users_data = users_response.json()
        
        admin_users = [u for u in users_data.get("users", []) if u.get("role") in ["admin", "manager", "tenant_admin"]]
        
        if admin_users:
            escalate_to = admin_users[0]["id"]
            
            escalate_data = {
                "complaint_id": test_complaint_id,
                "escalate_to": escalate_to,
                "reason": "TEST_Customer is very upset and needs immediate attention"
            }
            response = requests.post(
                f"{BASE_URL}/api/complaints/escalate",
                headers=headers,
                json=escalate_data
            )
            assert response.status_code == 200, f"Escalate complaint failed: {response.text}"
            data = response.json()
            
            assert data.get("success") == True
            print("✓ Escalated complaint")
        else:
            pytest.skip("No admin/manager users available for escalation")
    
    def test_resolve_complaint(self, headers):
        """Test resolving a complaint"""
        # Create a new complaint to resolve
        complaint_data = {
            "customer_name": "TEST_Resolve_Customer",
            "customer_phone": "9876543212",
            "category": "maintenance",
            "subject": "TEST_AC not working",
            "description": "Air conditioning unit is not cooling properly.",
            "priority": "medium"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        assert create_response.status_code == 200
        complaint_id = create_response.json()["complaint"]["id"]
        
        # Resolve the complaint
        resolve_data = {
            "complaint_id": complaint_id,
            "resolution": "TEST_AC unit serviced and gas refilled. Now working properly."
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/resolve",
            headers=headers,
            json=resolve_data
        )
        assert response.status_code == 200, f"Resolve complaint failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        
        # Verify complaint is now resolved
        get_response = requests.get(f"{BASE_URL}/api/complaints/{complaint_id}", headers=headers)
        assert get_response.json()["complaint"]["status"] == "resolved"
        print("✓ Resolved complaint")
    
    def test_close_complaint(self, headers):
        """Test closing a resolved complaint"""
        # Create and resolve a complaint first
        complaint_data = {
            "customer_name": "TEST_Close_Customer",
            "customer_phone": "9876543213",
            "category": "documentation",
            "subject": "TEST_Missing documents",
            "description": "Need copy of agreement.",
            "priority": "low"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        complaint_id = create_response.json()["complaint"]["id"]
        
        # Resolve first
        resolve_data = {"complaint_id": complaint_id, "resolution": "Documents provided via email."}
        requests.post(f"{BASE_URL}/api/complaints/resolve", headers=headers, json=resolve_data)
        
        # Now close
        response = requests.post(
            f"{BASE_URL}/api/complaints/{complaint_id}/close",
            headers=headers
        )
        assert response.status_code == 200, f"Close complaint failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        
        # Verify complaint is closed
        get_response = requests.get(f"{BASE_URL}/api/complaints/{complaint_id}", headers=headers)
        assert get_response.json()["complaint"]["status"] == "closed"
        print("✓ Closed complaint")
    
    def test_reopen_complaint(self, headers):
        """Test reopening a closed complaint"""
        # Create, resolve, and close a complaint
        complaint_data = {
            "customer_name": "TEST_Reopen_Customer",
            "customer_phone": "9876543214",
            "category": "quality",
            "subject": "TEST_Paint peeling",
            "description": "Paint is peeling off walls.",
            "priority": "medium"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        complaint_id = create_response.json()["complaint"]["id"]
        
        # Resolve and close
        resolve_data = {"complaint_id": complaint_id, "resolution": "Repainted the affected area."}
        requests.post(f"{BASE_URL}/api/complaints/resolve", headers=headers, json=resolve_data)
        requests.post(f"{BASE_URL}/api/complaints/{complaint_id}/close", headers=headers)
        
        # Reopen
        response = requests.post(
            f"{BASE_URL}/api/complaints/{complaint_id}/reopen?reason=Issue%20reoccurred",
            headers=headers
        )
        assert response.status_code == 200, f"Reopen complaint failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        
        # Verify complaint is reopened
        get_response = requests.get(f"{BASE_URL}/api/complaints/{complaint_id}", headers=headers)
        assert get_response.json()["complaint"]["status"] == "reopened"
        print("✓ Reopened complaint")
    
    def test_submit_customer_feedback(self, headers):
        """Test submitting customer satisfaction feedback"""
        # Create and resolve a complaint
        complaint_data = {
            "customer_name": "TEST_Feedback_Customer",
            "customer_phone": "9876543215",
            "category": "staff_behavior",
            "subject": "TEST_Staff was rude",
            "description": "Staff member was rude during site visit.",
            "priority": "high"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/complaints/create",
            headers=headers,
            json=complaint_data
        )
        complaint_id = create_response.json()["complaint"]["id"]
        
        # Resolve
        resolve_data = {"complaint_id": complaint_id, "resolution": "Apologized to customer. Staff counseled."}
        requests.post(f"{BASE_URL}/api/complaints/resolve", headers=headers, json=resolve_data)
        
        # Submit feedback
        feedback_data = {
            "complaint_id": complaint_id,
            "satisfaction_rating": 4,
            "feedback": "TEST_Issue was resolved satisfactorily. Thank you."
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/feedback",
            headers=headers,
            json=feedback_data
        )
        assert response.status_code == 200, f"Submit feedback failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        
        # Verify feedback is saved
        get_response = requests.get(f"{BASE_URL}/api/complaints/{complaint_id}", headers=headers)
        assert get_response.json()["complaint"]["satisfaction_rating"] == 4
        print("✓ Submitted customer feedback")
    
    def test_feedback_invalid_rating(self, headers, test_complaint_id):
        """Test feedback with invalid rating returns error"""
        feedback_data = {
            "complaint_id": test_complaint_id,
            "satisfaction_rating": 10,  # Invalid - should be 1-5
            "feedback": "Test"
        }
        response = requests.post(
            f"{BASE_URL}/api/complaints/feedback",
            headers=headers,
            json=feedback_data
        )
        assert response.status_code == 400
        print("✓ Invalid rating returns 400 error")
    
    # ==================== Stats Tests ====================
    
    def test_complaint_stats_summary(self, headers):
        """Test getting complaint statistics"""
        response = requests.get(
            f"{BASE_URL}/api/complaints/stats/summary",
            headers=headers
        )
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "stats" in data
        stats = data["stats"]
        
        # Verify stats structure
        assert "total" in stats
        assert "open" in stats
        assert "by_status" in stats
        assert "by_priority" in stats
        assert "by_category" in stats
        assert "sla_breached" in stats
        assert "escalated" in stats
        assert "avg_resolution_hours" in stats
        assert "avg_satisfaction" in stats
        
        print(f"✓ Got complaint stats: Total={stats['total']}, Open={stats['open']}, SLA Breached={stats['sla_breached']}")
    
    # ==================== Authentication Tests ====================
    
    def test_complaints_require_auth(self):
        """Test that complaint endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/complaints")
        assert response.status_code == 401
        print("✓ Complaints endpoint requires authentication")


class TestReferralWalletSystem:
    """Referral & Wallet System API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TENANT_ADMIN_EMAIL, "password": TENANT_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }
    
    @pytest.fixture(scope="class")
    def test_customer_id(self, headers):
        """Get or create a test customer for referral/wallet tests"""
        # First try to get existing customers
        response = requests.get(
            f"{BASE_URL}/api/customers?limit=10",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("customers") and len(data["customers"]) > 0:
                return data["customers"][0]["id"]
        
        # If no customers, create one
        customer_data = {
            "name": "TEST_Referral_Customer",
            "phone": "9876543220",
            "email": "test.referral@example.com"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/customers",
            headers=headers,
            json=customer_data
        )
        if create_response.status_code == 200:
            return create_response.json().get("customer", {}).get("id")
        
        pytest.skip("Could not get or create test customer")
    
    # ==================== Referral Tests ====================
    
    def test_create_referral(self, headers, test_customer_id):
        """Test creating a referral code"""
        referral_data = {
            "referrer_id": test_customer_id,
            "reward_amount": 1500,
            "reward_type": "cash",
            "qualification_type": "site_visit",
            "expires_days": 60
        }
        response = requests.post(
            f"{BASE_URL}/api/referral-wallet/referrals/create",
            headers=headers,
            json=referral_data
        )
        assert response.status_code == 200, f"Create referral failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "referral_code" in data
        assert len(data["referral_code"]) == 8  # Default code length
        assert "referral" in data
        assert data["referral"]["reward_amount"] == 1500
        print(f"✓ Created referral code: {data['referral_code']}")
    
    def test_list_referrals(self, headers):
        """Test listing all referrals"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/referrals",
            headers=headers
        )
        assert response.status_code == 200, f"List referrals failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "referrals" in data
        assert "total" in data
        print(f"✓ Listed {data['total']} referrals")
    
    def test_list_referrals_with_status_filter(self, headers):
        """Test listing referrals with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/referrals?status=pending",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        for referral in data["referrals"]:
            assert referral["status"] == "pending"
        print(f"✓ Filtered referrals by status=pending: {len(data['referrals'])} found")
    
    def test_get_referral_by_code(self, headers, test_customer_id):
        """Test getting referral by code"""
        # First create a referral
        referral_data = {
            "referrer_id": test_customer_id,
            "reward_amount": 1000,
            "reward_type": "cash",
            "qualification_type": "registration",
            "expires_days": 30
        }
        create_response = requests.post(
            f"{BASE_URL}/api/referral-wallet/referrals/create",
            headers=headers,
            json=referral_data
        )
        referral_code = create_response.json()["referral_code"]
        
        # Get by code
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/referrals/code/{referral_code}",
            headers=headers
        )
        assert response.status_code == 200, f"Get referral by code failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("valid") == True
        assert "referrer_name" in data
        assert "reward_amount" in data
        print(f"✓ Got referral by code: {referral_code}")
    
    def test_get_invalid_referral_code(self, headers):
        """Test getting invalid referral code returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/referrals/code/INVALID123",
            headers=headers
        )
        assert response.status_code == 404
        print("✓ Invalid referral code returns 404")
    
    def test_referral_stats(self, headers):
        """Test getting referral statistics"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/referrals/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Get referral stats failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "stats" in data
        stats = data["stats"]
        
        assert "total_referrals" in stats
        assert "by_status" in stats
        assert "total_rewards_paid" in stats
        assert "pending_rewards" in stats
        assert "conversion_rate" in stats
        print(f"✓ Got referral stats: Total={stats['total_referrals']}, Conversion={stats['conversion_rate']}%")
    
    # ==================== Wallet Tests ====================
    
    def test_get_wallet_balance(self, headers, test_customer_id):
        """Test getting customer wallet balance"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/wallet/{test_customer_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Get wallet failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "wallet" in data
        wallet = data["wallet"]
        
        assert "balance" in wallet
        assert "total_earned" in wallet
        assert "total_withdrawn" in wallet
        assert "total_used" in wallet
        print(f"✓ Got wallet balance: ₹{wallet['balance']}")
    
    def test_wallet_transactions(self, headers, test_customer_id):
        """Test getting wallet transaction history"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/wallet/{test_customer_id}/transactions",
            headers=headers
        )
        assert response.status_code == 200, f"Get transactions failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "transactions" in data
        assert "total" in data
        print(f"✓ Got {data['total']} wallet transactions")
    
    def test_wallet_credit_adjustment(self, headers, test_customer_id):
        """Test crediting wallet balance (admin adjustment)"""
        adjustment_data = {
            "customer_id": test_customer_id,
            "amount": 500,  # Positive for credit
            "description": "TEST_Promotional credit for testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/referral-wallet/wallet/adjust",
            headers=headers,
            json=adjustment_data
        )
        assert response.status_code == 200, f"Credit wallet failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "new_balance" in data
        assert "transaction" in data
        print(f"✓ Credited wallet: New balance = ₹{data['new_balance']}")
    
    def test_wallet_debit_adjustment(self, headers, test_customer_id):
        """Test debiting wallet balance (admin adjustment)"""
        # First credit some amount
        credit_data = {
            "customer_id": test_customer_id,
            "amount": 1000,
            "description": "TEST_Credit for debit test"
        }
        requests.post(f"{BASE_URL}/api/referral-wallet/wallet/adjust", headers=headers, json=credit_data)
        
        # Now debit
        adjustment_data = {
            "customer_id": test_customer_id,
            "amount": -200,  # Negative for debit
            "description": "TEST_Debit for testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/referral-wallet/wallet/adjust",
            headers=headers,
            json=adjustment_data
        )
        assert response.status_code == 200, f"Debit wallet failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print(f"✓ Debited wallet: New balance = ₹{data['new_balance']}")
    
    # ==================== Wallet Stats Tests ====================
    
    def test_wallet_stats(self, headers):
        """Test getting overall wallet statistics"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Get wallet stats failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "stats" in data
        stats = data["stats"]
        
        assert "total_wallets" in stats
        assert "total_balance" in stats
        assert "total_earned" in stats
        assert "total_withdrawn" in stats
        assert "pending_withdrawals" in stats
        assert "pending_withdrawal_amount" in stats
        print(f"✓ Got wallet stats: {stats['total_wallets']} wallets, Total balance=₹{stats['total_balance']}")
    
    # ==================== Withdrawal Tests ====================
    
    def test_list_withdrawals(self, headers):
        """Test listing withdrawal requests"""
        response = requests.get(
            f"{BASE_URL}/api/referral-wallet/withdrawals",
            headers=headers
        )
        assert response.status_code == 200, f"List withdrawals failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "withdrawals" in data
        assert "total" in data
        print(f"✓ Listed {data['total']} withdrawal requests")
    
    def test_request_withdrawal(self, headers, test_customer_id):
        """Test requesting a withdrawal"""
        # First ensure wallet has balance
        credit_data = {
            "customer_id": test_customer_id,
            "amount": 5000,
            "description": "TEST_Credit for withdrawal test"
        }
        requests.post(f"{BASE_URL}/api/referral-wallet/wallet/adjust", headers=headers, json=credit_data)
        
        # Request withdrawal
        withdrawal_data = {
            "amount": 1000,
            "bank_name": "TEST_Bank",
            "account_number": "1234567890",
            "ifsc_code": "TEST0001234",
            "account_holder_name": "Test Customer",
            "upi_id": "test@upi"
        }
        response = requests.post(
            f"{BASE_URL}/api/referral-wallet/withdrawals/request?customer_id={test_customer_id}",
            headers=headers,
            json=withdrawal_data
        )
        assert response.status_code == 200, f"Request withdrawal failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "withdrawal" in data
        assert data["withdrawal"]["status"] == "pending"
        print(f"✓ Created withdrawal request for ₹{withdrawal_data['amount']}")
    
    def test_withdrawal_insufficient_balance(self, headers, test_customer_id):
        """Test withdrawal with insufficient balance returns error"""
        withdrawal_data = {
            "amount": 9999999,  # Very large amount
            "bank_name": "TEST_Bank",
            "account_number": "1234567890",
            "ifsc_code": "TEST0001234",
            "account_holder_name": "Test Customer"
        }
        response = requests.post(
            f"{BASE_URL}/api/referral-wallet/withdrawals/request?customer_id={test_customer_id}",
            headers=headers,
            json=withdrawal_data
        )
        assert response.status_code == 400
        print("✓ Insufficient balance returns 400 error")
    
    # ==================== Authentication Tests ====================
    
    def test_referral_wallet_requires_auth(self):
        """Test that referral-wallet endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/referral-wallet/referrals")
        assert response.status_code == 401
        print("✓ Referral-wallet endpoint requires authentication")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
