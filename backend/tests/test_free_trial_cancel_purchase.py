"""
Test Free Trial Banner and Cancel Purchase Features
- Seller Free Trial: GET /api/sellers/me/listing-allowance
- Cancel Purchase: POST /api/auctions/{auction_id}/cancel-win
- Buyer Suspension Logic
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FARMER_EMAIL = "john@farm.com"
FARMER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"


class TestAuth:
    """Authentication tests"""
    
    def test_farmer_login(self):
        """Test farmer login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "farmer"
        assert data["user"]["email"] == FARMER_EMAIL
    
    def test_buyer_login(self):
        """Test buyer login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "buyer"
        assert data["user"]["email"] == BUYER_EMAIL


class TestSellerFreeTrialAPI:
    """Test Seller Free Trial Listing Allowance API"""
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_listing_allowance_for_farmer(self, farmer_token):
        """Test GET /api/sellers/me/listing-allowance returns proper trial status for farmer"""
        response = requests.get(
            f"{BASE_URL}/api/sellers/me/listing-allowance",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have can_list field
        assert "can_list" in data
        
        # Should have listing_type field
        assert "listing_type" in data
        
        # Valid listing types
        valid_types = ["free_trial_eligible", "free_trial", "subscription"]
        assert data["listing_type"] in valid_types or data.get("upgrade_required") == True
    
    def test_listing_allowance_denied_for_buyer(self, buyer_token):
        """Test GET /api/sellers/me/listing-allowance returns 403 for buyer"""
        response = requests.get(
            f"{BASE_URL}/api/sellers/me/listing-allowance",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 403
        data = response.json()
        assert "Only sellers can access this" in data.get("detail", "")
    
    def test_listing_allowance_unauthorized(self):
        """Test GET /api/sellers/me/listing-allowance returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/sellers/me/listing-allowance")
        assert response.status_code in [401, 403]
    
    def test_free_trial_eligible_response_structure(self, farmer_token):
        """Test free trial eligible response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/sellers/me/listing-allowance",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("listing_type") == "free_trial_eligible":
            assert data["can_list"] == True
            assert "message" in data
            assert "5" in data["message"] or "free" in data["message"].lower()
        elif data.get("listing_type") == "free_trial":
            assert "remaining_listings" in data
            assert "days_remaining" in data
            assert "trial_ends" in data


class TestCancelPurchaseAPI:
    """Test Cancel Purchase (Cancel Win) API"""
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def buyer_id(self, buyer_token):
        """Get buyer user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        return response.json()["id"]
    
    def test_cancel_win_not_winner(self, farmer_token):
        """Test cancel-win returns 403 if user is not the winner"""
        # Get any auction
        auctions = requests.get(f"{BASE_URL}/api/auctions?active_only=false").json()
        if auctions:
            auction_id = auctions[0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/auctions/{auction_id}/cancel-win",
                headers={"Authorization": f"Bearer {farmer_token}"},
                json={"auction_id": auction_id, "reason": "Test"}
            )
            # Should be 403 (not winner) or 400 (already paid) or 404 (not found)
            assert response.status_code in [403, 400, 404]
    
    def test_cancel_win_invalid_auction(self, buyer_token):
        """Test cancel-win returns 404 for invalid auction ID"""
        fake_auction_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/auctions/{fake_auction_id}/cancel-win",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={"auction_id": fake_auction_id, "reason": "Test"}
        )
        assert response.status_code == 404
    
    def test_get_cancellations_endpoint(self, buyer_token):
        """Test GET /api/users/me/cancellations returns cancellation history"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/cancellations",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have required fields
        assert "cancellations" in data
        assert "count" in data
        assert "max_before_suspension" in data
        assert "is_suspended" in data
        
        # max_before_suspension should be 2
        assert data["max_before_suspension"] == 2
        
        # cancellations should be a list
        assert isinstance(data["cancellations"], list)


class TestCancelPurchaseFlow:
    """Test full cancel purchase flow with auction creation"""
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def buyer_id(self, buyer_token):
        """Get buyer user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        return response.json()["id"]
    
    def test_full_cancel_flow(self, farmer_token, buyer_token, buyer_id):
        """Test complete cancel purchase flow: create auction -> buy now -> cancel"""
        # Step 1: Create auction
        auction_data = {
            "title": f"TEST_CancelFlow_{uuid.uuid4().hex[:8]}",
            "description": "Testing cancel purchase flow",
            "category": "Vegetables",
            "location": "Test Location",
            "starting_bid": 10,
            "buy_now_price": 20,
            "duration_hours": 24,
            "buy_now_only": True,
            "image_url": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/auctions",
            headers={"Authorization": f"Bearer {farmer_token}"},
            json=auction_data
        )
        assert create_response.status_code == 200
        auction = create_response.json()
        auction_id = auction["id"]
        
        try:
            # Step 2: Buy Now as buyer
            buy_response = requests.post(
                f"{BASE_URL}/api/auctions/{auction_id}/buy-now",
                headers={"Authorization": f"Bearer {buyer_token}"},
                json={
                    "origin_url": "https://test.com",
                    "payment_method": "paystack"
                }
            )
            assert buy_response.status_code == 200
            
            # Step 3: Verify buyer is winner
            auction_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
            assert auction_response.status_code == 200
            auction_data = auction_response.json()
            assert auction_data["winner_id"] == buyer_id
            assert auction_data["is_active"] == False
            
            # Step 4: Cancel the win
            cancel_response = requests.post(
                f"{BASE_URL}/api/auctions/{auction_id}/cancel-win",
                headers={"Authorization": f"Bearer {buyer_token}"},
                json={
                    "auction_id": auction_id,
                    "reason": "Testing cancel flow"
                }
            )
            assert cancel_response.status_code == 200
            cancel_data = cancel_response.json()
            
            # Verify cancel response
            assert cancel_data["success"] == True
            assert "cancellation_count" in cancel_data
            assert "max_before_suspension" in cancel_data
            
            # Step 5: Verify auction is reactivated
            auction_response = requests.get(f"{BASE_URL}/api/auctions/{auction_id}")
            assert auction_response.status_code == 200
            auction_data = auction_response.json()
            assert auction_data["winner_id"] is None
            assert auction_data["is_active"] == True
            assert auction_data.get("cancelled_by_winner") == True
            
        finally:
            # Cleanup: Delete test auction (if endpoint exists) or leave for manual cleanup
            pass


class TestDashboardAPI:
    """Test Dashboard related APIs"""
    
    @pytest.fixture
    def farmer_token(self):
        """Get farmer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def farmer_id(self, farmer_token):
        """Get farmer user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        return response.json()["id"]
    
    def test_farmer_auctions_endpoint(self, farmer_token, farmer_id):
        """Test GET /api/users/{user_id}/auctions returns farmer's auctions"""
        response = requests.get(
            f"{BASE_URL}/api/users/{farmer_id}/auctions",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_farmer_escrows_endpoint(self, farmer_token):
        """Test GET /api/users/me/escrows returns escrow data"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/escrows",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_farmer_payouts_endpoint(self, farmer_token):
        """Test GET /api/users/me/payouts returns payout data"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/payouts",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "payouts" in data
        assert "total_released" in data
        assert "total_pending" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
