"""
Test Suite for Remember Me and Stripe Payment Features
- Remember Me functionality for 30-day session persistence
- Stripe Payment Gateway Integration
"""

import pytest
import requests
import os
import jwt
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@retoerp.com"
TEST_PASSWORD = "admin123"


class TestRememberMeFunctionality:
    """Tests for Remember Me login feature"""
    
    def test_login_with_remember_me_true(self):
        """Test login with remember_me=true returns 30-day token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "remember_me": True
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert "expires_in" in data, "Missing expires_in in response"
        assert "remember_me" in data, "Missing remember_me in response"
        
        # Verify remember_me is True
        assert data["remember_me"] == True, "remember_me should be True"
        
        # Verify expires_in is 30 days (30 * 24 * 60 * 60 = 2592000 seconds)
        expected_expiry = 30 * 24 * 60 * 60
        assert data["expires_in"] == expected_expiry, f"Expected expires_in={expected_expiry}, got {data['expires_in']}"
        
        # Decode JWT and verify expiration
        token = data["access_token"]
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        assert "exp" in decoded, "JWT missing exp claim"
        assert "remember_me" in decoded, "JWT missing remember_me claim"
        assert decoded["remember_me"] == True, "JWT remember_me should be True"
        
        # Verify expiration is approximately 30 days from now
        exp_timestamp = decoded["exp"]
        now = datetime.now(timezone.utc).timestamp()
        days_until_expiry = (exp_timestamp - now) / (24 * 60 * 60)
        
        assert 29 < days_until_expiry <= 30, f"Token should expire in ~30 days, got {days_until_expiry:.2f} days"
        
        print(f"✓ Login with remember_me=true: Token expires in {days_until_expiry:.2f} days")
    
    def test_login_with_remember_me_false(self):
        """Test login with remember_me=false returns 24-hour token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "remember_me": False
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "expires_in" in data, "Missing expires_in in response"
        assert "remember_me" in data, "Missing remember_me in response"
        
        # Verify remember_me is False
        assert data["remember_me"] == False, "remember_me should be False"
        
        # Verify expires_in is 24 hours (24 * 60 * 60 = 86400 seconds)
        expected_expiry = 24 * 60 * 60
        assert data["expires_in"] == expected_expiry, f"Expected expires_in={expected_expiry}, got {data['expires_in']}"
        
        # Decode JWT and verify expiration
        token = data["access_token"]
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        assert "exp" in decoded, "JWT missing exp claim"
        
        # Verify expiration is approximately 24 hours from now
        exp_timestamp = decoded["exp"]
        now = datetime.now(timezone.utc).timestamp()
        hours_until_expiry = (exp_timestamp - now) / (60 * 60)
        
        assert 23 < hours_until_expiry <= 24, f"Token should expire in ~24 hours, got {hours_until_expiry:.2f} hours"
        
        print(f"✓ Login with remember_me=false: Token expires in {hours_until_expiry:.2f} hours")
    
    def test_login_without_remember_me_defaults_to_false(self):
        """Test login without remember_me parameter defaults to 24-hour token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        
        # Verify remember_me defaults to False
        assert data.get("remember_me") == False, "remember_me should default to False"
        
        # Verify expires_in is 24 hours
        expected_expiry = 24 * 60 * 60
        assert data["expires_in"] == expected_expiry, f"Expected expires_in={expected_expiry}, got {data['expires_in']}"
        
        print("✓ Login without remember_me defaults to 24-hour token")
    
    def test_login_user_data_returned(self):
        """Test login returns correct user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "remember_me": True
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data.get("user", {})
        
        # Verify user data
        assert "id" in user, "Missing user id"
        assert "name" in user, "Missing user name"
        assert "email" in user, "Missing user email"
        assert "role" in user, "Missing user role"
        assert "tenant_id" in user, "Missing user tenant_id"
        
        assert user["email"] == TEST_EMAIL, f"Expected email={TEST_EMAIL}, got {user['email']}"
        
        print(f"✓ User data returned: {user['name']} ({user['role']})")


class TestStripePaymentPackages:
    """Tests for Stripe Payment Packages API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_payment_packages(self):
        """Test GET /api/payments/packages returns available packages"""
        response = requests.get(
            f"{BASE_URL}/api/payments/packages",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get packages: {response.text}"
        
        data = response.json()
        assert "packages" in data, "Missing packages in response"
        
        packages = data["packages"]
        assert len(packages) > 0, "No packages returned"
        
        # Verify package structure
        for pkg in packages:
            assert "id" in pkg, "Package missing id"
            assert "name" in pkg, "Package missing name"
            assert "amount" in pkg, "Package missing amount"
            assert "currency" in pkg, "Package missing currency"
            
        print(f"✓ Found {len(packages)} payment packages")
        for pkg in packages:
            print(f"  - {pkg['name']}: {pkg['currency']} {pkg['amount']}")


class TestStripePaymentStats:
    """Tests for Stripe Payment Statistics API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_payment_stats(self):
        """Test GET /api/payments/stats returns payment statistics"""
        response = requests.get(
            f"{BASE_URL}/api/payments/stats",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        
        # Verify stats structure
        assert "total_transactions" in data, "Missing total_transactions"
        assert "completed" in data, "Missing completed count"
        assert "pending" in data, "Missing pending count"
        assert "failed" in data, "Missing failed count"
        assert "total_collected" in data, "Missing total_collected"
        
        # Verify values are numbers
        assert isinstance(data["total_transactions"], int), "total_transactions should be int"
        assert isinstance(data["completed"], int), "completed should be int"
        assert isinstance(data["pending"], int), "pending should be int"
        assert isinstance(data["failed"], int), "failed should be int"
        assert isinstance(data["total_collected"], (int, float)), "total_collected should be numeric"
        
        print(f"✓ Payment stats retrieved:")
        print(f"  - Total transactions: {data['total_transactions']}")
        print(f"  - Completed: {data['completed']}")
        print(f"  - Pending: {data['pending']}")
        print(f"  - Failed: {data['failed']}")
        print(f"  - Total collected: {data['total_collected']}")


class TestStripeCheckoutSession:
    """Tests for Stripe Checkout Session API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_checkout_session_with_custom_amount(self):
        """Test POST /api/payments/checkout/session creates Stripe checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            headers=self.headers,
            json={
                "package_id": "custom",
                "custom_amount": 1000,  # 1000 INR
                "origin_url": "https://retomerp-memora.preview.emergentagent.com",
                "description": "Test payment for automated testing"
            }
        )
        
        assert response.status_code == 200, f"Failed to create checkout session: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "checkout_url" in data, "Missing checkout_url in response"
        assert "transaction_id" in data, "Missing transaction_id in response"
        assert "session_id" in data, "Missing session_id in response"
        
        # Verify checkout URL is valid Stripe URL
        checkout_url = data["checkout_url"]
        assert "stripe.com" in checkout_url or "checkout" in checkout_url, f"Invalid checkout URL: {checkout_url}"
        
        print(f"✓ Checkout session created:")
        print(f"  - Transaction ID: {data['transaction_id']}")
        print(f"  - Stripe Session ID: {data['session_id']}")
        print(f"  - Checkout URL: {checkout_url[:80]}...")
    
    def test_create_checkout_session_with_booking_token_package(self):
        """Test creating checkout session with booking_token package"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            headers=self.headers,
            json={
                "package_id": "booking_token",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com",
                "description": "Booking token payment"
            }
        )
        
        assert response.status_code == 200, f"Failed to create checkout session: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "Missing checkout_url"
        assert "transaction_id" in data, "Missing transaction_id"
        
        print(f"✓ Booking token checkout session created: {data['transaction_id']}")
    
    def test_create_checkout_session_works_without_auth(self):
        """Test checkout session creation works without authentication (public payments)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "package_id": "custom",
                "custom_amount": 1000,
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        
        # Note: This endpoint allows unauthenticated access for public payments
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Checkout session works without authentication (public payments enabled)")


class TestStripeTransactions:
    """Tests for Stripe Transactions API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert response.status_code == 200, "Failed to get auth token"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_transactions_list(self):
        """Test GET /api/payments/transactions returns transaction list"""
        response = requests.get(
            f"{BASE_URL}/api/payments/transactions",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get transactions: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "transactions" in data, "Missing transactions in response"
        assert "total" in data, "Missing total count"
        assert "limit" in data, "Missing limit"
        assert "skip" in data, "Missing skip"
        
        transactions = data["transactions"]
        assert isinstance(transactions, list), "transactions should be a list"
        
        print(f"✓ Retrieved {len(transactions)} transactions (total: {data['total']})")
        
        # If there are transactions, verify structure
        if len(transactions) > 0:
            txn = transactions[0]
            assert "id" in txn, "Transaction missing id"
            assert "amount" in txn, "Transaction missing amount"
            assert "status" in txn, "Transaction missing status"
            print(f"  - Latest: {txn['id']} - {txn.get('status', 'unknown')} - {txn.get('amount', 0)}")
    
    def test_get_transactions_with_status_filter(self):
        """Test filtering transactions by status"""
        response = requests.get(
            f"{BASE_URL}/api/payments/transactions?status=pending",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to filter transactions: {response.text}"
        
        data = response.json()
        transactions = data.get("transactions", [])
        
        # All returned transactions should have pending status
        for txn in transactions:
            assert txn.get("status") == "pending" or txn.get("payment_status") in ["initiated", "pending"], \
                f"Transaction {txn.get('id')} has unexpected status: {txn.get('status')}"
        
        print(f"✓ Filtered transactions by status=pending: {len(transactions)} results")


class TestAuthenticationEndpoints:
    """Additional auth endpoint tests"""
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("✓ Invalid credentials rejected")
    
    def test_login_missing_password(self):
        """Test login without password returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing password rejected")
    
    def test_get_current_user(self):
        """Test GET /api/auth/me returns current user info"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get current user: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing user id"
        assert "email" in data, "Missing user email"
        assert data["email"] == TEST_EMAIL, f"Expected email={TEST_EMAIL}"
        
        print(f"✓ Current user retrieved: {data.get('name', 'Unknown')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
