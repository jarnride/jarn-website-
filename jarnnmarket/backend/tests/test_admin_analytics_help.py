"""
Test suite for Admin Dashboard, Seller Analytics, and Help Center features
Tests: Admin API endpoints, Seller Analytics API, Help Center page
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminEndpoints:
    """Admin API endpoint tests - requires admin authentication"""
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer (non-admin) token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Farmer login failed")
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer (non-admin) token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Buyer login failed")
    
    def test_admin_stats_requires_auth(self):
        """Admin stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin stats requires authentication")
    
    def test_admin_stats_denies_non_admin(self, farmer_token):
        """Admin stats endpoint denies non-admin users"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin stats denies non-admin users")
    
    def test_admin_users_requires_auth(self):
        """Admin users endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin users requires authentication")
    
    def test_admin_users_denies_non_admin(self, buyer_token):
        """Admin users endpoint denies non-admin users"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin users denies non-admin users")
    
    def test_admin_auctions_requires_auth(self):
        """Admin auctions endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/auctions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin auctions requires authentication")
    
    def test_admin_auctions_denies_non_admin(self, farmer_token):
        """Admin auctions endpoint denies non-admin users"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/auctions", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin auctions denies non-admin users")
    
    def test_admin_payouts_requires_auth(self):
        """Admin payouts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payouts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin payouts requires authentication")
    
    def test_admin_payouts_denies_non_admin(self, buyer_token):
        """Admin payouts endpoint denies non-admin users"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payouts", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin payouts denies non-admin users")


class TestSellerAnalytics:
    """Seller Analytics API tests - requires farmer authentication"""
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Farmer login failed")
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Buyer login failed")
    
    def test_seller_analytics_requires_auth(self):
        """Seller analytics endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sellers/me/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Seller analytics requires authentication")
    
    def test_seller_analytics_denies_buyer(self, buyer_token):
        """Seller analytics endpoint denies buyer users"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/sellers/me/analytics", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Seller analytics denies buyer users")
    
    def test_seller_analytics_returns_data_for_farmer(self, farmer_token):
        """Seller analytics returns data for farmer users"""
        headers = {"Authorization": f"Bearer {farmer_token}"}
        response = requests.get(f"{BASE_URL}/api/sellers/me/analytics", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify response structure
        expected_fields = [
            'total_sales', 'total_revenue', 'total_views', 'total_bids',
            'conversion_rate', 'avg_sale_price', 'active_listings',
            'completed_sales', 'rating_avg', 'rating_count', 'top_categories'
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data['total_sales'], (int, float))
        assert isinstance(data['total_revenue'], (int, float))
        assert isinstance(data['conversion_rate'], (int, float))
        assert isinstance(data['top_categories'], list)
        
        print(f"✓ Seller analytics returns valid data: {data['active_listings']} active listings, ${data['total_revenue']} revenue")


class TestDemoUserLogin:
    """Test demo user login functionality"""
    
    def test_farmer_login(self):
        """Demo farmer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "farmer"
        print(f"✓ Farmer login successful: {data['user']['name']}")
    
    def test_buyer_login(self):
        """Demo buyer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "buyer"
        print(f"✓ Buyer login successful: {data['user']['name']}")
    
    def test_invalid_credentials(self):
        """Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials return 401")


class TestAPIEndpoints:
    """General API endpoint tests"""
    
    def test_api_root(self):
        """API root returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        print(f"✓ API version: {data['version']}")
    
    def test_auctions_list(self):
        """Auctions list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Auctions list: {len(data)} auctions")
    
    def test_categories_list(self):
        """Categories list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories list: {len(data)} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
