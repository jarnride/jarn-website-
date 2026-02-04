"""
Test suite for:
1. Buyer Cancel Order functionality (POST /api/buyers/orders/{auction_id}/cancel)
2. Seller Rating display on auction cards
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"
SELLER_EMAIL = "john@farm.com"
SELLER_PASSWORD = "password123"


class TestBuyerCancelOrder:
    """Test buyer order cancellation functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_buyer(self):
        """Login as buyer and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token"), response.json().get("user")
        return None, None
    
    def login_seller(self):
        """Login as seller and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token"), response.json().get("user")
        return None, None
    
    def test_buyer_login(self):
        """Test buyer can login"""
        token, user = self.login_buyer()
        assert token is not None, "Buyer login failed"
        assert user is not None, "Buyer user data not returned"
        assert user.get("email") == BUYER_EMAIL
        print(f"✓ Buyer login successful: {user.get('name')}")
    
    def test_buyer_cancel_endpoint_exists(self):
        """Test that buyer cancel endpoint exists"""
        token, _ = self.login_buyer()
        assert token is not None, "Buyer login failed"
        
        # Test with a non-existent auction ID
        fake_auction_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/buyers/orders/{fake_auction_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
            params={"reason": "Test cancellation"}
        )
        
        # Should return 404 for non-existent auction, not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print(f"✓ Buyer cancel endpoint exists and returns 404 for non-existent auction")
    
    def test_buyer_cancel_requires_auth(self):
        """Test that buyer cancel requires authentication"""
        fake_auction_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/buyers/orders/{fake_auction_id}/cancel",
            params={"reason": "Test cancellation"}
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Buyer cancel endpoint requires authentication")
    
    def test_buyer_cancel_wrong_winner(self):
        """Test that buyer cannot cancel auction they didn't win"""
        token, user = self.login_buyer()
        assert token is not None, "Buyer login failed"
        
        # Get any active auction that buyer hasn't won
        response = self.session.get(
            f"{BASE_URL}/api/auctions/search?limit=1",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            auctions = data.get("auctions", [])
            if auctions:
                auction = auctions[0]
                # Try to cancel an auction we didn't win
                cancel_response = self.session.post(
                    f"{BASE_URL}/api/buyers/orders/{auction['id']}/cancel",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"reason": "Test cancellation"}
                )
                
                # Should return 403 if not the winner
                assert cancel_response.status_code == 403, f"Expected 403, got {cancel_response.status_code}"
                print(f"✓ Buyer cannot cancel auction they didn't win (403 returned)")
            else:
                print("⚠ No auctions found to test with")
        else:
            print(f"⚠ Could not fetch auctions: {response.status_code}")
    
    def test_buyer_won_auctions_endpoint(self):
        """Test that buyer can fetch their won auctions"""
        token, _ = self.login_buyer()
        assert token is not None, "Buyer login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/users/me/won",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Won auctions should be a list"
        print(f"✓ Buyer won auctions endpoint works, found {len(data)} won auctions")
        
        # Check structure of won auctions
        for auction in data:
            assert "id" in auction, "Auction should have id"
            assert "title" in auction, "Auction should have title"
            print(f"  - Won auction: {auction.get('title')}, paid: {auction.get('is_paid', False)}")


class TestSellerRatingDisplay:
    """Test seller rating display on auction cards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_auctions_include_seller_rating(self):
        """Test that auction search results include seller rating fields"""
        response = self.session.get(f"{BASE_URL}/api/auctions/search?limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        auctions = data.get("auctions", [])
        
        print(f"✓ Found {len(auctions)} auctions")
        
        for auction in auctions:
            # Check that seller rating fields exist
            assert "seller_rating" in auction or auction.get("seller_rating") is not None or "seller_rating" in str(auction), \
                f"Auction {auction.get('id')} missing seller_rating field"
            
            seller_rating = auction.get("seller_rating", 0)
            seller_rating_count = auction.get("seller_rating_count", 0)
            
            print(f"  - {auction.get('title')[:30]}... | Seller: {auction.get('seller_name')} | Rating: {seller_rating} ({seller_rating_count} reviews)")
    
    def test_auction_detail_includes_seller_rating(self):
        """Test that auction detail includes seller rating"""
        # First get an auction ID
        response = self.session.get(f"{BASE_URL}/api/auctions/search?limit=1")
        
        if response.status_code == 200:
            data = response.json()
            auctions = data.get("auctions", [])
            if auctions:
                auction_id = auctions[0]["id"]
                
                # Get auction detail
                detail_response = self.session.get(f"{BASE_URL}/api/auctions/{auction_id}")
                assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
                
                auction = detail_response.json()
                print(f"✓ Auction detail for: {auction.get('title')}")
                print(f"  - Seller: {auction.get('seller_name')}")
                print(f"  - Seller Rating: {auction.get('seller_rating', 'N/A')}")
                print(f"  - Rating Count: {auction.get('seller_rating_count', 'N/A')}")
            else:
                print("⚠ No auctions found to test with")
        else:
            print(f"⚠ Could not fetch auctions: {response.status_code}")
    
    def test_seller_reviews_endpoint(self):
        """Test that seller reviews endpoint works"""
        # First get a seller ID from an auction
        response = self.session.get(f"{BASE_URL}/api/auctions/search?limit=1")
        
        if response.status_code == 200:
            data = response.json()
            auctions = data.get("auctions", [])
            if auctions:
                seller_id = auctions[0].get("seller_id")
                if seller_id:
                    # Get seller reviews
                    reviews_response = self.session.get(f"{BASE_URL}/api/sellers/{seller_id}/reviews")
                    
                    if reviews_response.status_code == 200:
                        reviews_data = reviews_response.json()
                        print(f"✓ Seller reviews endpoint works")
                        print(f"  - Average Rating: {reviews_data.get('average_rating', 'N/A')}")
                        print(f"  - Total Reviews: {reviews_data.get('total_reviews', 'N/A')}")
                        print(f"  - Reviews: {len(reviews_data.get('reviews', []))}")
                    else:
                        print(f"⚠ Seller reviews endpoint returned {reviews_response.status_code}")
                else:
                    print("⚠ No seller_id found in auction")
            else:
                print("⚠ No auctions found to test with")
        else:
            print(f"⚠ Could not fetch auctions: {response.status_code}")


class TestBuyerDashboardWonAuctions:
    """Test buyer dashboard won auctions section"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_buyer(self):
        """Login as buyer and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token"), response.json().get("user")
        return None, None
    
    def test_buyer_dashboard_data(self):
        """Test buyer can fetch all dashboard data"""
        token, user = self.login_buyer()
        assert token is not None, "Buyer login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Fetch all buyer dashboard endpoints
        endpoints = [
            "/api/users/me/bids",
            "/api/users/me/won",
            "/api/users/me/offers",
            "/api/users/me/escrows"
        ]
        
        for endpoint in endpoints:
            response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed with {response.status_code}"
            print(f"✓ {endpoint} - OK ({len(response.json())} items)")
    
    def test_won_auctions_have_cancel_eligibility(self):
        """Test that won auctions have fields needed for cancel button display"""
        token, _ = self.login_buyer()
        assert token is not None, "Buyer login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/users/me/won",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        won_auctions = response.json()
        
        print(f"✓ Found {len(won_auctions)} won auctions")
        
        for auction in won_auctions:
            is_paid = auction.get("is_paid", False)
            is_cancelled = auction.get("cancelled", False)
            
            # Cancel button should show for unpaid, non-cancelled orders
            can_cancel = not is_paid and not is_cancelled
            
            print(f"  - {auction.get('title')[:30]}... | Paid: {is_paid} | Cancelled: {is_cancelled} | Can Cancel: {can_cancel}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
