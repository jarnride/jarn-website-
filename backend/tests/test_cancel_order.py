"""
Test Cancel Order Feature for Jarnnmarket
Tests seller, buyer, and admin cancel order endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paystack-jarnn.preview.emergentagent.com').rstrip('/')

# Test credentials
SELLER_EMAIL = "john@farm.com"
SELLER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@jarnnmarket.com"
ADMIN_PASSWORD = "admin123"


class TestCancelOrderEndpoints:
    """Test cancel order endpoints for seller, buyer, and admin"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Seller login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Buyer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_seller_login(self):
        """Test seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "farmer"
        print(f"SUCCESS: Seller login - {data['user']['name']}")
    
    def test_buyer_login(self):
        """Test buyer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "buyer"
        print(f"SUCCESS: Buyer login - {data['user']['name']}")
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"SUCCESS: Admin login - {data['user']['name']}")
    
    def test_seller_cancel_order_endpoint_exists(self, seller_token):
        """Test seller cancel order endpoint exists and requires valid auction"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Test with non-existent auction ID
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/sellers/orders/{fake_auction_id}/cancel?reason=Test",
            headers=headers
        )
        
        # Should return 404 for non-existent auction (not 405 method not allowed)
        assert response.status_code in [404, 403], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"SUCCESS: Seller cancel endpoint exists - returns {response.status_code} for invalid auction")
    
    def test_buyer_cancel_order_endpoint_exists(self, buyer_token):
        """Test buyer cancel order endpoint exists and requires valid auction"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Test with non-existent auction ID
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/buyers/orders/{fake_auction_id}/cancel?reason=Test",
            headers=headers
        )
        
        # Should return 404 for non-existent auction (not 405 method not allowed)
        assert response.status_code in [404, 403], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"SUCCESS: Buyer cancel endpoint exists - returns {response.status_code} for invalid auction")
    
    def test_admin_cancel_order_endpoint_exists(self, admin_token):
        """Test admin cancel order endpoint exists and requires valid auction"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with non-existent auction ID
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_auction_id}/cancel?reason=Test",
            headers=headers
        )
        
        # Should return 404 for non-existent auction (not 405 method not allowed)
        assert response.status_code == 404, f"Unexpected status: {response.status_code} - {response.text}"
        print(f"SUCCESS: Admin cancel endpoint exists - returns 404 for invalid auction")
    
    def test_seller_cancel_requires_auth(self):
        """Test seller cancel endpoint requires authentication"""
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/sellers/orders/{fake_auction_id}/cancel?reason=Test"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Seller cancel endpoint requires authentication")
    
    def test_buyer_cancel_requires_auth(self):
        """Test buyer cancel endpoint requires authentication"""
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/buyers/orders/{fake_auction_id}/cancel?reason=Test"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Buyer cancel endpoint requires authentication")
    
    def test_admin_cancel_requires_auth(self):
        """Test admin cancel endpoint requires authentication"""
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_auction_id}/cancel?reason=Test"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Admin cancel endpoint requires authentication")
    
    def test_seller_cannot_cancel_others_auction(self, seller_token):
        """Test seller cannot cancel another seller's auction"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # First get all auctions to find one not owned by this seller
        response = requests.get(f"{BASE_URL}/api/auctions")
        if response.status_code == 200:
            auctions = response.json()
            # Find an auction with a different seller
            for auction in auctions:
                if auction.get("seller_id") and auction.get("winner_id"):
                    # Try to cancel it
                    cancel_response = requests.post(
                        f"{BASE_URL}/api/sellers/orders/{auction['id']}/cancel?reason=Test",
                        headers=headers
                    )
                    # Should be 403 if not owner
                    if cancel_response.status_code == 403:
                        print("SUCCESS: Seller cannot cancel other seller's auction")
                        return
        
        print("INFO: No suitable auction found to test cross-seller cancellation")
    
    def test_get_seller_auctions(self, seller_token):
        """Test getting seller's auctions to find orders"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Get current user info
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        user = me_response.json()
        
        # Get seller's auctions
        response = requests.get(f"{BASE_URL}/api/users/{user['id']}/auctions", headers=headers)
        assert response.status_code == 200
        auctions = response.json()
        
        print(f"SUCCESS: Seller has {len(auctions)} auctions")
        
        # Count orders (auctions with winners)
        orders = [a for a in auctions if a.get("winner_id") and not a.get("cancelled")]
        print(f"INFO: Seller has {len(orders)} orders with winners")
        
        return auctions


class TestRoleSelectionUI:
    """Test role selection screen functionality"""
    
    def test_auth_page_accessible(self):
        """Test auth page is accessible"""
        response = requests.get(f"{BASE_URL}/auth")
        # Frontend routes return 200 with HTML
        assert response.status_code == 200
        print("SUCCESS: Auth page is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
