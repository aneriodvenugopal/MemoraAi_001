"""
Test Suite for SaaS Subscription & Billing APIs
Tests subscription packages, checkout, cancel/reactivate, invoices, and usage limits
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://retomerp-memora.preview.emergentagent.com')


class TestSubscriptionPackages:
    """Test subscription packages endpoints (public)"""
    
    def test_get_all_packages(self):
        """GET /api/subscriptions/packages - List all subscription packages"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages")
        assert response.status_code == 200
        
        data = response.json()
        assert "packages" in data
        packages = data["packages"]
        
        # Should have 3 packages: starter, pro, enterprise
        assert len(packages) == 3
        
        # Verify package IDs
        package_ids = [p["id"] for p in packages]
        assert "starter" in package_ids
        assert "pro" in package_ids
        assert "enterprise" in package_ids
        
        # Verify starter package details
        starter = next(p for p in packages if p["id"] == "starter")
        assert starter["name"] == "Starter"
        assert starter["monthly_price"] == 999.0
        assert starter["yearly_price"] == 9990.0
        assert starter["currency"] == "inr"
        assert "features" in starter
        assert starter["features"]["max_projects"] == 3
        assert starter["features"]["max_users"] == 2
        
        # Verify pro package details
        pro = next(p for p in packages if p["id"] == "pro")
        assert pro["name"] == "Pro"
        assert pro["monthly_price"] == 2999.0
        assert pro["features"]["max_projects"] == 15
        assert pro["features"]["max_users"] == 10
        assert pro["features"]["whatsapp_enabled"] == True
        
        # Verify enterprise package details
        enterprise = next(p for p in packages if p["id"] == "enterprise")
        assert enterprise["name"] == "Enterprise"
        assert enterprise["monthly_price"] == 9999.0
        assert enterprise["features"]["max_projects"] == -1  # Unlimited
        assert enterprise["features"]["max_users"] == -1  # Unlimited
        assert enterprise["features"]["ai_features"] == True
    
    def test_get_single_package_starter(self):
        """GET /api/subscriptions/packages/starter - Get starter package details"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/starter")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "starter"
        assert data["name"] == "Starter"
        assert data["description"] == "Perfect for small real estate businesses"
        assert data["monthly_price"] == 999.0
        assert data["yearly_price"] == 9990.0
        assert "savings_yearly" in data
        assert data["savings_yearly"] == 1998.0  # 12 * 999 - 9990
    
    def test_get_single_package_pro(self):
        """GET /api/subscriptions/packages/pro - Get pro package details"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/pro")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "pro"
        assert data["name"] == "Pro"
        assert data["monthly_price"] == 2999.0
        assert data["features"]["priority_support"] == True
    
    def test_get_single_package_enterprise(self):
        """GET /api/subscriptions/packages/enterprise - Get enterprise package details"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/enterprise")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "enterprise"
        assert data["name"] == "Enterprise"
        assert data["monthly_price"] == 9999.0
        assert data["features"]["api_access"] == True
    
    def test_get_invalid_package(self):
        """GET /api/subscriptions/packages/invalid - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/invalid_package")
        assert response.status_code == 404
        assert "Package not found" in response.json().get("detail", "")


class TestAuthenticatedSubscriptionEndpoints:
    """Test authenticated subscription endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9908290239", "password": "12345678"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_current_subscription(self):
        """GET /api/subscriptions/current - Get current tenant subscription"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/current",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify subscription structure
        assert "subscription" in data
        assert "package" in data
        assert "usage" in data
        assert "credits" in data
        
        # Verify subscription fields
        subscription = data["subscription"]
        assert "package_id" in subscription
        assert "package_name" in subscription
        assert "status" in subscription
        assert "billing_cycle" in subscription
        assert "cancel_at_period_end" in subscription
        
        # Verify package fields
        package = data["package"]
        assert "name" in package
        assert "monthly_price" in package
        assert "yearly_price" in package
        assert "features" in package
        
        # Verify usage fields
        usage = data["usage"]
        assert "projects" in usage
        assert "users" in usage
        assert "properties" in usage
        assert "leads_this_month" in usage
        
        # Verify usage structure
        assert "used" in usage["projects"]
        assert "limit" in usage["projects"]
        assert "unlimited" in usage["projects"]
        
        # Verify credits fields
        credits = data["credits"]
        assert "sms" in credits
        assert "email" in credits
        assert "remaining" in credits["sms"]
        assert "used" in credits["sms"]
        assert "monthly_allocation" in credits["sms"]
    
    def test_get_current_subscription_without_auth(self):
        """GET /api/subscriptions/current without auth - Should return 401"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/current")
        assert response.status_code == 401
    
    def test_get_invoices(self):
        """GET /api/subscriptions/invoices - Get invoice history"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/invoices",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "invoices" in data
        assert "total" in data
        assert "limit" in data
        assert "skip" in data
        
        # Invoices should be a list
        assert isinstance(data["invoices"], list)
    
    def test_get_invoices_with_pagination(self):
        """GET /api/subscriptions/invoices with pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/invoices?limit=5&skip=0",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["limit"] == 5
        assert data["skip"] == 0
    
    def test_get_invoices_without_auth(self):
        """GET /api/subscriptions/invoices without auth - Should return 401"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/invoices")
        assert response.status_code == 401
    
    def test_usage_check(self):
        """GET /api/subscriptions/usage-check - Check usage limits"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/usage-check",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "package_name" in data
        assert "limits_exceeded" in data
        assert "warnings" in data
        assert "can_create_project" in data
        assert "can_create_user" in data
        assert "can_create_property" in data
        assert "can_send_sms" in data
        
        # limits_exceeded and warnings should be lists
        assert isinstance(data["limits_exceeded"], list)
        assert isinstance(data["warnings"], list)
        
        # Boolean flags
        assert isinstance(data["can_create_project"], bool)
        assert isinstance(data["can_create_user"], bool)
        assert isinstance(data["can_create_property"], bool)
        assert isinstance(data["can_send_sms"], bool)
    
    def test_usage_check_without_auth(self):
        """GET /api/subscriptions/usage-check without auth - Should return 401"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/usage-check")
        assert response.status_code == 401


class TestSubscriptionCheckout:
    """Test subscription checkout endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9908290239", "password": "12345678"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_create_checkout_session_monthly(self):
        """POST /api/subscriptions/checkout - Create monthly checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            headers=self.headers,
            json={
                "package_id": "starter",
                "billing_cycle": "monthly",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert "subscription_id" in data
        
        # Verify checkout URL is a valid Stripe URL
        assert data["checkout_url"].startswith("https://checkout.stripe.com")
        
        # Verify session_id format
        assert data["session_id"].startswith("cs_test_")
        
        # Verify subscription_id format
        assert data["subscription_id"].startswith("sub_")
    
    def test_create_checkout_session_yearly(self):
        """POST /api/subscriptions/checkout - Create yearly checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            headers=self.headers,
            json={
                "package_id": "pro",
                "billing_cycle": "yearly",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "checkout_url" in data
        assert data["checkout_url"].startswith("https://checkout.stripe.com")
    
    def test_create_checkout_invalid_package(self):
        """POST /api/subscriptions/checkout with invalid package - Should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            headers=self.headers,
            json={
                "package_id": "invalid_package",
                "billing_cycle": "monthly",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400
        assert "Invalid subscription package" in response.json().get("detail", "")
    
    def test_create_checkout_without_auth(self):
        """POST /api/subscriptions/checkout without auth - Should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            json={
                "package_id": "starter",
                "billing_cycle": "monthly",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        assert response.status_code == 401
    
    def test_get_checkout_status(self):
        """GET /api/subscriptions/checkout/status/{session_id} - Check checkout status"""
        # First create a checkout session
        create_response = requests.post(
            f"{BASE_URL}/api/subscriptions/checkout",
            headers=self.headers,
            json={
                "package_id": "enterprise",
                "billing_cycle": "monthly",
                "origin_url": "https://retomerp-memora.preview.emergentagent.com"
            }
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Check status
        status_response = requests.get(
            f"{BASE_URL}/api/subscriptions/checkout/status/{session_id}",
            headers=self.headers
        )
        assert status_response.status_code == 200
        
        data = status_response.json()
        assert "status" in data
        assert "payment_status" in data
        assert "subscription_id" in data
        assert "package_id" in data
        assert "package_name" in data
        assert "amount" in data
        assert "currency" in data
        
        # Verify values
        assert data["package_id"] == "enterprise"
        assert data["package_name"] == "Enterprise"
        assert data["currency"] == "inr"
    
    def test_get_checkout_status_invalid_session(self):
        """GET /api/subscriptions/checkout/status/invalid - Should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/checkout/status/invalid_session_id",
            headers=self.headers
        )
        assert response.status_code == 404


class TestSubscriptionCancelReactivate:
    """Test subscription cancel and reactivate endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "9908290239", "password": "12345678"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_cancel_subscription_no_active(self):
        """POST /api/subscriptions/cancel - No active subscription returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/cancel",
            headers=self.headers
        )
        # Should return 404 if no active subscription
        assert response.status_code == 404
        assert "No active subscription found" in response.json().get("detail", "")
    
    def test_reactivate_subscription_no_pending(self):
        """POST /api/subscriptions/reactivate - No pending cancellation returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/reactivate",
            headers=self.headers
        )
        # Should return 404 if no subscription pending cancellation
        assert response.status_code == 404
        assert "No subscription pending cancellation found" in response.json().get("detail", "")
    
    def test_cancel_without_auth(self):
        """POST /api/subscriptions/cancel without auth - Should return 401"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/cancel")
        assert response.status_code == 401
    
    def test_reactivate_without_auth(self):
        """POST /api/subscriptions/reactivate without auth - Should return 401"""
        response = requests.post(f"{BASE_URL}/api/subscriptions/reactivate")
        assert response.status_code == 401


class TestPackageFeatures:
    """Test package features are correctly defined"""
    
    def test_starter_features(self):
        """Verify Starter package features"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/starter")
        features = response.json()["features"]
        
        assert features["max_projects"] == 3
        assert features["max_users"] == 2
        assert features["max_properties"] == 50
        assert features["max_leads_per_month"] == 100
        assert features["storage_gb"] == 1
        assert features["sms_credits"] == 100
        assert features["email_credits"] == 500
        assert features["whatsapp_enabled"] == False
        assert features["ai_features"] == False
        assert features["custom_branding"] == False
        assert features["api_access"] == False
        assert features["priority_support"] == False
    
    def test_pro_features(self):
        """Verify Pro package features"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/pro")
        features = response.json()["features"]
        
        assert features["max_projects"] == 15
        assert features["max_users"] == 10
        assert features["max_properties"] == 500
        assert features["max_leads_per_month"] == 500
        assert features["storage_gb"] == 10
        assert features["sms_credits"] == 500
        assert features["email_credits"] == 2000
        assert features["whatsapp_enabled"] == True
        assert features["ai_features"] == False
        assert features["custom_branding"] == True
        assert features["api_access"] == False
        assert features["priority_support"] == True
    
    def test_enterprise_features(self):
        """Verify Enterprise package features"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/packages/enterprise")
        features = response.json()["features"]
        
        assert features["max_projects"] == -1  # Unlimited
        assert features["max_users"] == -1  # Unlimited
        assert features["max_properties"] == -1  # Unlimited
        assert features["max_leads_per_month"] == -1  # Unlimited
        assert features["storage_gb"] == 100
        assert features["sms_credits"] == 2000
        assert features["email_credits"] == 10000
        assert features["whatsapp_enabled"] == True
        assert features["ai_features"] == True
        assert features["custom_branding"] == True
        assert features["api_access"] == True
        assert features["priority_support"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
