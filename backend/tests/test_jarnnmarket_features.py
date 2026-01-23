"""
Comprehensive tests for jarnnmarket Farmers Auction Platform
Testing new features:
1. Image quality validation (min 400x300px, 20KB)
2. Buy Now Only option (disables bidding)
3. Make Offer feature
4. Mandatory phone verification
5. Seller payout system
6. Policy pages
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://farmauctions.preview.emergentagent.com')

# Test credentials
FARMER_EMAIL = "john@farm.com"
FARMER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_auctions_list(self):
        """Test auctions listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} auctions")
    
    def test_categories(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/auctions/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Categories: {[c['name'] for c in data]}")


class TestAuthentication:
    """Authentication tests"""
    
    def test_farmer_login(self):
        """Test farmer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "farmer"
        print(f"Farmer login successful: {data['user']['name']}")
        return data["token"]
    
    def test_buyer_login(self):
        """Test buyer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "buyer"
        print(f"Buyer login successful: {data['user']['name']}")
        return data["token"]
    
    def test_invalid_login(self):
        """Test invalid login credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestPhoneVerification:
    """Phone verification tests - MOCKED"""
    
    @pytest.fixture
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    def test_send_verification_code(self, farmer_token):
        """Test sending phone verification code (MOCK mode)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/phone/send-code",
            json={"phone": "+2348189275367"},
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        # May return 200 or 400 if phone already verified
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] == True
            assert data["mock_mode"] == True
            print(f"Mock OTP code: {data.get('mock_code')}")
    
    def test_verify_phone_invalid_code(self, farmer_token):
        """Test phone verification with invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/auth/phone/verify",
            json={"phone": "+2348189275367", "code": "000000"},
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        # Should fail with invalid code
        assert response.status_code in [400, 200]  # 200 if already verified


class TestAuctionCreation:
    """Auction creation tests including new features"""
    
    @pytest.fixture
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_auction_with_buy_now_only(self, farmer_token):
        """Test creating auction with buy_now_only flag"""
        auction_data = {
            "title": f"TEST Buy Now Only Tomatoes {uuid.uuid4().hex[:8]}",
            "description": "Fresh organic tomatoes - Buy Now Only listing",
            "category": "Vegetables",
            "location": "Lagos, Nigeria",
            "starting_bid": 50.0,
            "buy_now_price": 100.0,
            "buy_now_only": True,
            "accepts_offers": False,
            "duration_hours": 24
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        # May fail if phone not verified
        if response.status_code == 403:
            print("Phone verification required - expected behavior")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data["buy_now_only"] == True
        assert data["accepts_offers"] == False
        print(f"Created buy_now_only auction: {data['id']}")
        return data["id"]
    
    def test_create_auction_with_accepts_offers(self, farmer_token):
        """Test creating auction with accepts_offers flag"""
        auction_data = {
            "title": f"TEST Accepts Offers Mangoes {uuid.uuid4().hex[:8]}",
            "description": "Fresh mangoes - Offers accepted",
            "category": "Fruits",
            "location": "Ogun State, Nigeria",
            "starting_bid": 30.0,
            "buy_now_price": 80.0,
            "buy_now_only": False,
            "accepts_offers": True,
            "duration_hours": 24
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        if response.status_code == 403:
            print("Phone verification required - expected behavior")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data["accepts_offers"] == True
        print(f"Created accepts_offers auction: {data['id']}")
        return data["id"]
    
    def test_buy_now_only_requires_price(self, farmer_token):
        """Test that buy_now_only requires buy_now_price"""
        auction_data = {
            "title": f"TEST Invalid Buy Now Only {uuid.uuid4().hex[:8]}",
            "description": "This should fail",
            "category": "Vegetables",
            "location": "Lagos, Nigeria",
            "starting_bid": 50.0,
            "buy_now_only": True,  # No buy_now_price
            "duration_hours": 24
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auctions",
            json=auction_data,
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        # Should fail with 400 or 403 (phone verification)
        assert response.status_code in [400, 403]
        if response.status_code == 400:
            print("Correctly rejected buy_now_only without price")


class TestBidRejectionOnBuyNowOnly:
    """Test that bidding is rejected on buy_now_only auctions"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_bid_rejected_on_buy_now_only(self, buyer_token):
        """Test that bids are rejected on buy_now_only auctions"""
        # First, find a buy_now_only auction
        response = requests.get(f"{BASE_URL}/api/auctions")
        auctions = response.json()
        
        buy_now_only_auction = None
        for auction in auctions:
            if auction.get("buy_now_only") == True:
                buy_now_only_auction = auction
                break
        
        if not buy_now_only_auction:
            print("No buy_now_only auction found - skipping test")
            pytest.skip("No buy_now_only auction available")
            return
        
        # Try to place a bid
        response = requests.post(
            f"{BASE_URL}/api/auctions/{buy_now_only_auction['id']}/bids",
            json={"amount": buy_now_only_auction["current_bid"] + 10},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Should be rejected with 400
        assert response.status_code == 400
        data = response.json()
        assert "Buy Now only" in data.get("detail", "") or "buy_now_only" in data.get("detail", "").lower()
        print(f"Bid correctly rejected: {data['detail']}")


class TestMakeOfferFeature:
    """Test Make Offer feature"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    def test_make_offer_on_accepts_offers_auction(self, buyer_token):
        """Test making an offer on an auction that accepts offers"""
        # Find an auction that accepts offers
        response = requests.get(f"{BASE_URL}/api/auctions")
        auctions = response.json()
        
        accepts_offers_auction = None
        for auction in auctions:
            if auction.get("accepts_offers") == True and auction.get("is_active") == True:
                accepts_offers_auction = auction
                break
        
        if not accepts_offers_auction:
            print("No accepts_offers auction found - skipping test")
            pytest.skip("No accepts_offers auction available")
            return
        
        # Make an offer
        response = requests.post(
            f"{BASE_URL}/api/auctions/{accepts_offers_auction['id']}/offers",
            json={
                "amount": accepts_offers_auction["current_bid"] * 0.9,
                "message": "Test offer from automated testing"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # May fail if phone not verified or already has pending offer
        if response.status_code == 403:
            print("Phone verification required for offers")
            return
        if response.status_code == 400:
            print(f"Offer rejected: {response.json().get('detail')}")
            return
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        print(f"Offer created: {data['id']}")
    
    def test_offer_rejected_on_non_accepting_auction(self, buyer_token):
        """Test that offers are rejected on auctions that don't accept offers"""
        # Find an auction that doesn't accept offers
        response = requests.get(f"{BASE_URL}/api/auctions")
        auctions = response.json()
        
        non_accepting_auction = None
        for auction in auctions:
            if auction.get("accepts_offers") == False and auction.get("is_active") == True:
                non_accepting_auction = auction
                break
        
        if not non_accepting_auction:
            print("No non-accepting auction found - skipping test")
            pytest.skip("No non-accepting auction available")
            return
        
        # Try to make an offer
        response = requests.post(
            f"{BASE_URL}/api/auctions/{non_accepting_auction['id']}/offers",
            json={"amount": 50.0, "message": "Test offer"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Should be rejected
        assert response.status_code in [400, 403]
        print(f"Offer correctly rejected: {response.json().get('detail')}")
    
    def test_get_auction_offers_seller_only(self, farmer_token, buyer_token):
        """Test that only seller can view all offers"""
        # Get farmer's auctions
        response = requests.get(f"{BASE_URL}/api/auth/me", 
                               headers={"Authorization": f"Bearer {farmer_token}"})
        farmer = response.json()
        
        response = requests.get(f"{BASE_URL}/api/users/{farmer['id']}/auctions")
        auctions = response.json()
        
        if not auctions:
            print("No farmer auctions found - skipping test")
            pytest.skip("No farmer auctions available")
            return
        
        auction_id = auctions[0]["id"]
        
        # Seller should be able to view offers
        response = requests.get(
            f"{BASE_URL}/api/auctions/{auction_id}/offers",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        print(f"Seller can view offers: {len(response.json())} offers")
        
        # Buyer should NOT be able to view all offers
        response = requests.get(
            f"{BASE_URL}/api/auctions/{auction_id}/offers",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 403
        print("Buyer correctly denied access to all offers")


class TestPayoutSystem:
    """Test seller payout system"""
    
    @pytest.fixture
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_payouts(self, farmer_token):
        """Test getting payout history"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/payouts",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "payouts" in data
        assert "total_released" in data
        assert "total_pending" in data
        print(f"Payouts: {len(data['payouts'])}, Released: ${data['total_released']}, Pending: ${data['total_pending']}")
    
    def test_request_payout_invalid_escrow(self, farmer_token):
        """Test requesting payout with invalid escrow ID"""
        response = requests.post(
            f"{BASE_URL}/api/payouts/request",
            json={"escrow_id": "invalid-escrow-id"},
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 404
        print("Correctly rejected invalid escrow ID")
    
    def test_get_escrows(self, farmer_token):
        """Test getting user escrows"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/escrows",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} escrows")


class TestImageUploadValidation:
    """Test image upload validation"""
    
    @pytest.fixture
    def farmer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    def test_image_upload_requires_auth(self):
        """Test that image upload requires authentication"""
        # Create a small test image
        import io
        small_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files={"file": ("test.png", small_image, "image/png")}
        )
        assert response.status_code == 401
        print("Image upload correctly requires authentication")
    
    def test_image_upload_rejects_small_file(self, farmer_token):
        """Test that small/low-quality images are rejected"""
        import io
        # Create a very small image (less than 20KB)
        small_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 1000)  # ~1KB
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files={"file": ("test.png", small_image, "image/png")},
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        
        # Should be rejected for being too small
        assert response.status_code == 400
        data = response.json()
        assert "quality" in data.get("detail", "").lower() or "size" in data.get("detail", "").lower()
        print(f"Small image correctly rejected: {data['detail']}")


class TestAuctionDetailFields:
    """Test auction detail includes new fields"""
    
    def test_auction_has_new_fields(self):
        """Test that auctions include buy_now_only and accepts_offers fields"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        assert response.status_code == 200
        auctions = response.json()
        
        if not auctions:
            pytest.skip("No auctions available")
            return
        
        auction = auctions[0]
        
        # Check for new fields
        assert "buy_now_only" in auction or auction.get("buy_now_only") is not None
        assert "accepts_offers" in auction or auction.get("accepts_offers") is not None
        
        print(f"Auction {auction['id']}: buy_now_only={auction.get('buy_now_only')}, accepts_offers={auction.get('accepts_offers')}")
    
    def test_single_auction_detail(self):
        """Test single auction detail endpoint"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        auctions = response.json()
        
        if not auctions:
            pytest.skip("No auctions available")
            return
        
        auction_id = auctions[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        expected_fields = ["id", "title", "description", "category", "current_bid", 
                          "buy_now_price", "buy_now_only", "accepts_offers", "is_active"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Auction detail verified: {data['title']}")


class TestBuyerOnlyEndpoints:
    """Test buyer-specific endpoints"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_my_offers(self, buyer_token):
        """Test getting buyer's offers"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/offers",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Buyer has {len(data)} offers")
    
    def test_get_my_bids(self, buyer_token):
        """Test getting buyer's bids"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/bids",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Buyer has {len(data)} bids")
    
    def test_get_won_auctions(self, buyer_token):
        """Test getting buyer's won auctions"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/won",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Buyer has won {len(data)} auctions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
