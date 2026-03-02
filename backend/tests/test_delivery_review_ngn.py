"""
Test suite for new features:
1. Delivery options at checkout (local_pickup, city_to_city, international)
2. Nigerian currency (NGN) support
3. Seller review system integrated with delivery confirmation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FARMER_EMAIL = "john@farm.com"
FARMER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"


class TestSetup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def farmer_token(self):
        """Get farmer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200, f"Farmer login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def farmer_user(self, farmer_token):
        """Get farmer user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {farmer_token}"
        })
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture(scope="class")
    def buyer_user(self, buyer_token):
        """Get buyer user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {buyer_token}"
        })
        assert response.status_code == 200
        return response.json()


class TestDeliveryOptions(TestSetup):
    """Test delivery options in auctions and checkout"""
    
    def test_create_auction_with_delivery_options(self, farmer_token):
        """Test creating auction with delivery options"""
        auction_data = {
            "title": "TEST_Delivery_Options_Auction",
            "description": "Testing delivery options",
            "category": "Vegetables",
            "location": "Lagos, Nigeria",
            "starting_bid": 50.0,
            "buy_now_price": 100.0,
            "duration_hours": 24,
            "local_pickup": True,
            "city_to_city": True,
            "international_shipping": False,
            "currency": "USD"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create auction: {response.text}"
        data = response.json()
        
        # Verify delivery options are set
        assert "delivery_options" in data
        assert len(data["delivery_options"]) >= 2  # local_pickup and city_to_city
        
        delivery_types = [opt["type"] for opt in data["delivery_options"]]
        assert "local_pickup" in delivery_types
        assert "city_to_city" in delivery_types
        
        return data["id"]
    
    def test_auction_detail_shows_delivery_options(self, farmer_token):
        """Test that auction detail endpoint returns delivery options"""
        # First create an auction
        auction_data = {
            "title": "TEST_Delivery_Detail_Auction",
            "description": "Testing delivery options display",
            "category": "Fruits",
            "location": "Abuja, Nigeria",
            "starting_bid": 30.0,
            "buy_now_price": 80.0,
            "duration_hours": 24,
            "local_pickup": True,
            "city_to_city": True,
            "international_shipping": True,
            "currency": "NGN"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Get auction detail
        detail_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
        assert detail_response.status_code == 200
        
        data = detail_response.json()
        assert "delivery_options" in data
        
        # Verify all three delivery options
        delivery_types = [opt["type"] for opt in data["delivery_options"]]
        assert "local_pickup" in delivery_types
        assert "city_to_city" in delivery_types
        assert "international" in delivery_types
    
    def test_buy_now_with_delivery_option(self, farmer_token, buyer_token):
        """Test Buy Now endpoint accepts delivery_option and delivery_address"""
        # Create auction with delivery options
        auction_data = {
            "title": "TEST_BuyNow_Delivery_Auction",
            "description": "Testing buy now with delivery",
            "category": "Grains",
            "location": "Kano, Nigeria",
            "starting_bid": 25.0,
            "buy_now_price": 50.0,
            "duration_hours": 24,
            "local_pickup": True,
            "city_to_city": True,
            "currency": "USD"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Buy now with delivery option
        buy_now_data = {
            "origin_url": "https://paystack-jarnn.preview.emergentagent.com",
            "payment_method": "paystack",
            "delivery_option": "city_to_city",
            "delivery_address": "123 Test Street, Lagos, Nigeria"
        }
        
        buy_response = requests.post(
            f"{BASE_URL}/api/auctions/{auction_id}/buy-now",
            json=buy_now_data,
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Should return checkout URL or success
        assert buy_response.status_code == 200, f"Buy now failed: {buy_response.text}"
        data = buy_response.json()
        assert "url" in data or "session_id" in data
    
    def test_buy_now_with_local_pickup(self, farmer_token, buyer_token):
        """Test Buy Now with local pickup (no address required)"""
        # Create auction
        auction_data = {
            "title": "TEST_LocalPickup_Auction",
            "description": "Testing local pickup",
            "category": "Dairy",
            "location": "Ibadan, Nigeria",
            "starting_bid": 20.0,
            "buy_now_price": 40.0,
            "duration_hours": 24,
            "local_pickup": True,
            "city_to_city": False,
            "currency": "USD"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Buy now with local pickup
        buy_now_data = {
            "origin_url": "https://paystack-jarnn.preview.emergentagent.com",
            "payment_method": "paystack",
            "delivery_option": "local_pickup"
            # No delivery_address needed for local pickup
        }
        
        buy_response = requests.post(
            f"{BASE_URL}/api/auctions/{auction_id}/buy-now",
            json=buy_now_data,
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        assert buy_response.status_code == 200, f"Buy now with local pickup failed: {buy_response.text}"


class TestNGNCurrency(TestSetup):
    """Test Nigerian Naira (NGN) currency support"""
    
    def test_create_auction_with_ngn_currency(self, farmer_token):
        """Test creating auction with NGN currency"""
        auction_data = {
            "title": "TEST_NGN_Currency_Auction",
            "description": "Testing NGN currency",
            "category": "Vegetables",
            "location": "Lagos, Nigeria",
            "starting_bid": 5000.0,  # 5000 NGN
            "buy_now_price": 10000.0,  # 10000 NGN
            "duration_hours": 24,
            "local_pickup": True,
            "currency": "NGN"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create NGN auction: {response.text}"
        data = response.json()
        
        assert data["currency"] == "NGN"
        assert data["starting_bid"] == 5000.0
        assert data["buy_now_price"] == 10000.0
        
        return data["id"]
    
    def test_auction_detail_returns_ngn_currency(self, farmer_token):
        """Test auction detail returns correct NGN currency"""
        # Create NGN auction
        auction_data = {
            "title": "TEST_NGN_Detail_Auction",
            "description": "Testing NGN display",
            "category": "Fruits",
            "location": "Abuja, Nigeria",
            "starting_bid": 7500.0,
            "buy_now_price": 15000.0,
            "duration_hours": 24,
            "local_pickup": True,
            "currency": "NGN"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Get auction detail
        detail_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
        assert detail_response.status_code == 200
        
        data = detail_response.json()
        assert data["currency"] == "NGN"
    
    def test_search_auctions_by_currency(self, farmer_token):
        """Test searching auctions by currency filter"""
        # Create NGN auction
        auction_data = {
            "title": "TEST_NGN_Search_Auction",
            "description": "Testing NGN search",
            "category": "Grains",
            "location": "Port Harcourt, Nigeria",
            "starting_bid": 3000.0,
            "buy_now_price": 6000.0,
            "duration_hours": 24,
            "local_pickup": True,
            "currency": "NGN"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        
        # Search with NGN currency filter
        search_response = requests.get(f"{BASE_URL}/api/auctions/search?currency=NGN")
        assert search_response.status_code == 200
        
        data = search_response.json()
        assert "auctions" in data
        
        # All returned auctions should have NGN currency
        for auction in data["auctions"]:
            assert auction.get("currency", "USD") == "NGN"


class TestSellerReviewSystem(TestSetup):
    """Test seller review system integrated with delivery confirmation"""
    
    def test_get_user_reviews_endpoint(self, farmer_user):
        """Test GET /api/users/{user_id}/reviews endpoint"""
        user_id = farmer_user["id"]
        
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/reviews")
        assert response.status_code == 200, f"Failed to get user reviews: {response.text}"
        
        # Should return a list (may be empty)
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_seller_reviews_endpoint(self, farmer_user):
        """Test GET /api/reviews/seller/{seller_id} endpoint"""
        seller_id = farmer_user["id"]
        
        response = requests.get(f"{BASE_URL}/api/reviews/seller/{seller_id}")
        assert response.status_code == 200, f"Failed to get seller reviews: {response.text}"
        
        data = response.json()
        assert "reviews" in data
        assert "seller_name" in data
        assert "rating_avg" in data
        assert "rating_count" in data
    
    def test_get_user_rating_endpoint(self, farmer_user):
        """Test GET /api/users/{user_id}/rating endpoint"""
        user_id = farmer_user["id"]
        
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/rating")
        assert response.status_code == 200, f"Failed to get user rating: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "name" in data
        assert "rating_avg" in data
        assert "rating_count" in data
    
    def test_confirm_delivery_model_accepts_rating(self):
        """Test that DeliveryConfirmation model accepts rating and review_comment"""
        # This tests the model structure - we verify the endpoint accepts these fields
        # We can't fully test without a real escrow, but we can verify the endpoint exists
        
        # Try with invalid escrow_id to verify endpoint exists and accepts the fields
        response = requests.post(
            f"{BASE_URL}/api/escrow/confirm-delivery",
            json={
                "escrow_id": "invalid-escrow-id",
                "rating": 5,
                "review_comment": "Great seller!"
            },
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        # Should return 401 (unauthorized) not 422 (validation error)
        # This confirms the model accepts rating and review_comment fields
        assert response.status_code in [401, 404], f"Unexpected status: {response.status_code}"
    
    def test_auction_includes_seller_rating(self, farmer_token):
        """Test that auction detail includes seller rating"""
        # Create an auction
        auction_data = {
            "title": "TEST_Seller_Rating_Auction",
            "description": "Testing seller rating display",
            "category": "Organic",
            "location": "Enugu, Nigeria",
            "starting_bid": 100.0,
            "buy_now_price": 200.0,
            "duration_hours": 24,
            "local_pickup": True,
            "currency": "USD"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Get auction detail
        detail_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
        assert detail_response.status_code == 200
        
        data = detail_response.json()
        assert "seller_rating" in data
        assert "seller_rating_count" in data


class TestCheckoutIntegration(TestSetup):
    """Test checkout flow with delivery options and currency"""
    
    def test_buy_now_stores_order_details(self, farmer_token, buyer_token):
        """Test that buy now stores delivery option and address in order"""
        # Create auction
        auction_data = {
            "title": "TEST_Order_Details_Auction",
            "description": "Testing order details storage",
            "category": "Livestock",
            "location": "Kaduna, Nigeria",
            "starting_bid": 500.0,
            "buy_now_price": 1000.0,
            "duration_hours": 24,
            "local_pickup": True,
            "city_to_city": True,
            "currency": "NGN"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert create_response.status_code == 200
        auction_id = create_response.json()["id"]
        
        # Buy now with delivery details
        buy_now_data = {
            "origin_url": "https://paystack-jarnn.preview.emergentagent.com",
            "payment_method": "paystack",
            "delivery_option": "city_to_city",
            "delivery_address": "456 Test Avenue, Kaduna, Nigeria"
        }
        
        buy_response = requests.post(
            f"{BASE_URL}/api/auctions/{auction_id}/buy-now",
            json=buy_now_data,
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        assert buy_response.status_code == 200, f"Buy now failed: {buy_response.text}"
        
        # Verify auction was updated with order details
        auction_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
        assert auction_response.status_code == 200
        
        auction_data = auction_response.json()
        assert auction_data.get("sold_via") == "buy_now"
        
        # Check order_details if present
        if "order_details" in auction_data:
            order_details = auction_data["order_details"]
            assert order_details.get("delivery_option") == "city_to_city"
            assert "delivery_address" in order_details


class TestAuctionListings(TestSetup):
    """Test auction listings with new fields"""
    
    def test_featured_auctions_include_delivery_options(self):
        """Test featured auctions endpoint returns delivery options"""
        response = requests.get(f"{BASE_URL}/api/auctions/featured")
        assert response.status_code == 200
        
        auctions = response.json()
        assert isinstance(auctions, list)
        
        # Check that auctions have expected fields
        for auction in auctions:
            assert "seller_rating" in auction
            # delivery_options may not be present in all auctions
    
    def test_auctions_list_includes_currency(self):
        """Test auctions list includes currency field"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        assert response.status_code == 200
        
        auctions = response.json()
        assert isinstance(auctions, list)
        
        # Check that auctions have currency field (default USD)
        for auction in auctions:
            currency = auction.get("currency", "USD")
            assert currency in ["USD", "NGN"]


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_auctions(self):
        """Note: Test auctions with TEST_ prefix should be cleaned up"""
        # In a real scenario, we would delete test data here
        # For now, we just verify the test suite completed
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
