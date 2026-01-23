"""
Test Suite for Seller Verification, Bulk Operations, and Export Features
Tests:
- Seller verification badge (verify/unverify)
- Bulk user operations (activate, deactivate, verify)
- Bulk payout operations (approve, reject)
- Export endpoints (users, auctions, transactions in JSON/CSV)
- PWA manifest configuration
- seller_verified field in auction responses
"""

import pytest
import requests
import os
import json
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://jarnnmarket.preview.emergentagent.com').rstrip('/')

# Test credentials
FARMER_EMAIL = "john@farm.com"
FARMER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@jarnnmarket.com"
ADMIN_PASSWORD = "AdminPass123!"


class TestSetup:
    """Setup tests - create admin user if needed"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_create_admin_user(self, session):
        """Create admin user for testing (if not exists)"""
        # Try to login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
            return
        
        # Register admin user
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Admin User",
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "phone": "+2348189275399",
            "role": "farmer"  # Will be admin by email check
        })
        
        # Admin registration may fail if email verification is required
        # In that case, we'll use mock token
        if register_response.status_code in [200, 201]:
            data = register_response.json()
            if data.get("mock_token"):
                # Verify email using mock token
                verify_response = session.post(f"{BASE_URL}/api/auth/verify-email", json={
                    "token": data["mock_token"]
                })
                print(f"Admin email verified: {verify_response.status_code}")
        
        print(f"Admin registration response: {register_response.status_code}")


class TestSellerVerification:
    """Test seller verification badge functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try with info@jarnnmarket.com
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@jarnnmarket.com",
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed - admin user not available")
    
    @pytest.fixture(scope="class")
    def farmer_data(self):
        """Get farmer user data"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {"token": data["token"], "user": data["user"]}
        pytest.skip("Farmer authentication failed")
    
    def test_verify_seller_endpoint(self, admin_token, farmer_data):
        """Test POST /api/admin/users/{user_id}/verify"""
        user_id = farmer_data["user"]["id"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/verify",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "verified" in data.get("message", "").lower()
        print(f"Seller verified successfully: {user_id}")
    
    def test_unverify_seller_endpoint(self, admin_token, farmer_data):
        """Test POST /api/admin/users/{user_id}/unverify"""
        user_id = farmer_data["user"]["id"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/unverify",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Seller unverified successfully: {user_id}")
    
    def test_verify_non_farmer_fails(self, admin_token):
        """Test that verifying a non-farmer user fails"""
        # Get buyer user ID
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Buyer login failed")
        
        buyer_id = login_response.json()["user"]["id"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{buyer_id}/verify",
            headers=headers
        )
        
        # Should fail because buyer is not a farmer
        assert response.status_code == 400, f"Expected 400 for non-farmer, got {response.status_code}"
        print("Correctly rejected verification for non-farmer user")
    
    def test_verify_requires_admin(self, farmer_data):
        """Test that verify endpoint requires admin authentication"""
        user_id = farmer_data["user"]["id"]
        headers = {"Authorization": f"Bearer {farmer_data['token']}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/verify",
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly denied non-admin access to verify endpoint")


class TestAuctionSellerVerifiedField:
    """Test that auctions API returns seller_verified field"""
    
    def test_auctions_list_has_seller_verified(self):
        """Test GET /api/auctions returns seller_verified field"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        
        assert response.status_code == 200
        auctions = response.json()
        
        if len(auctions) > 0:
            auction = auctions[0]
            assert "seller_verified" in auction, "seller_verified field missing from auction"
            assert isinstance(auction["seller_verified"], bool), "seller_verified should be boolean"
            print(f"Auction has seller_verified: {auction['seller_verified']}")
        else:
            print("No auctions found to test")
    
    def test_featured_auctions_has_seller_verified(self):
        """Test GET /api/auctions/featured returns seller_verified field"""
        response = requests.get(f"{BASE_URL}/api/auctions/featured")
        
        assert response.status_code == 200
        auctions = response.json()
        
        if len(auctions) > 0:
            auction = auctions[0]
            assert "seller_verified" in auction, "seller_verified field missing from featured auction"
            print(f"Featured auction has seller_verified: {auction['seller_verified']}")
    
    def test_search_auctions_has_seller_verified(self):
        """Test GET /api/auctions/search returns seller_verified field"""
        response = requests.get(f"{BASE_URL}/api/auctions/search")
        
        assert response.status_code == 200
        data = response.json()
        auctions = data.get("auctions", [])
        
        if len(auctions) > 0:
            auction = auctions[0]
            assert "seller_verified" in auction, "seller_verified field missing from search results"
            print(f"Search result has seller_verified: {auction['seller_verified']}")


class TestBulkUserOperations:
    """Test bulk user operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@jarnnmarket.com",
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def farmer_id(self):
        """Get farmer user ID"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["user"]["id"]
        pytest.skip("Farmer login failed")
    
    def test_bulk_verify_users(self, admin_token, farmer_id):
        """Test POST /api/admin/bulk/users with action=verify"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/users",
            headers=headers,
            params={"action": "verify", "user_ids": farmer_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "processed" in data
        print(f"Bulk verify processed: {data.get('processed')} users")
    
    def test_bulk_deactivate_users(self, admin_token, farmer_id):
        """Test POST /api/admin/bulk/users with action=deactivate"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/users",
            headers=headers,
            params={"action": "deactivate", "user_ids": farmer_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Bulk deactivate processed: {data.get('processed')} users")
    
    def test_bulk_activate_users(self, admin_token, farmer_id):
        """Test POST /api/admin/bulk/users with action=activate"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/users",
            headers=headers,
            params={"action": "activate", "user_ids": farmer_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Bulk activate processed: {data.get('processed')} users")
    
    def test_bulk_invalid_action_fails(self, admin_token, farmer_id):
        """Test that invalid action returns error"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/users",
            headers=headers,
            params={"action": "invalid_action", "user_ids": farmer_id}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
        print("Correctly rejected invalid bulk action")


class TestBulkPayoutOperations:
    """Test bulk payout operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@jarnnmarket.com",
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_bulk_approve_payouts(self, admin_token):
        """Test POST /api/admin/bulk/payouts with action=approve"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Use a fake payout ID - should still return success with 0 processed
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/payouts",
            headers=headers,
            params={"action": "approve", "payout_ids": "fake-payout-id"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "processed" in data
        print(f"Bulk approve payouts processed: {data.get('processed')}")
    
    def test_bulk_reject_payouts(self, admin_token):
        """Test POST /api/admin/bulk/payouts with action=reject"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/payouts",
            headers=headers,
            params={"action": "reject", "payout_ids": "fake-payout-id"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Bulk reject payouts processed: {data.get('processed')}")
    
    def test_bulk_invalid_payout_action_fails(self, admin_token):
        """Test that invalid payout action returns error"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk/payouts",
            headers=headers,
            params={"action": "invalid", "payout_ids": "fake-id"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
        print("Correctly rejected invalid bulk payout action")


class TestExportEndpoints:
    """Test data export endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "info@jarnnmarket.com",
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_export_users_json(self, admin_token):
        """Test GET /api/admin/export/users?format=json"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers=headers,
            params={"format": "json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "json"
        assert "data" in data
        assert "count" in data
        assert isinstance(data["data"], list)
        print(f"Exported {data['count']} users in JSON format")
    
    def test_export_users_csv(self, admin_token):
        """Test GET /api/admin/export/users?format=csv"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers=headers,
            params={"format": "csv"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "csv"
        assert "data" in data
        assert isinstance(data["data"], str)  # CSV is a string
        print(f"Exported {data['count']} users in CSV format")
    
    def test_export_auctions_json(self, admin_token):
        """Test GET /api/admin/export/auctions?format=json"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/auctions",
            headers=headers,
            params={"format": "json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "json"
        assert "data" in data
        assert "count" in data
        print(f"Exported {data['count']} auctions in JSON format")
    
    def test_export_auctions_csv(self, admin_token):
        """Test GET /api/admin/export/auctions?format=csv"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/auctions",
            headers=headers,
            params={"format": "csv"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "csv"
        assert "data" in data
        print(f"Exported {data['count']} auctions in CSV format")
    
    def test_export_transactions_json(self, admin_token):
        """Test GET /api/admin/export/transactions?format=json"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/transactions",
            headers=headers,
            params={"format": "json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "json"
        assert "data" in data
        assert "count" in data
        print(f"Exported {data['count']} transactions in JSON format")
    
    def test_export_transactions_csv(self, admin_token):
        """Test GET /api/admin/export/transactions?format=csv"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/transactions",
            headers=headers,
            params={"format": "csv"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("format") == "csv"
        assert "data" in data
        print(f"Exported {data['count']} transactions in CSV format")
    
    def test_export_requires_admin(self):
        """Test that export endpoints require admin authentication"""
        # Get farmer token
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FARMER_EMAIL,
            "password": FARMER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Farmer login failed")
        
        farmer_token = response.json()["token"]
        headers = {"Authorization": f"Bearer {farmer_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/export/users",
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Correctly denied non-admin access to export endpoint")


class TestPWAManifest:
    """Test PWA manifest configuration"""
    
    def test_manifest_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PWA manifest is accessible")
    
    def test_manifest_has_required_fields(self):
        """Test that manifest has required PWA fields"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        
        assert response.status_code == 200
        manifest = response.json()
        
        # Required fields for PWA
        required_fields = ["name", "short_name", "start_url", "display", "icons"]
        for field in required_fields:
            assert field in manifest, f"Missing required field: {field}"
        
        print(f"PWA manifest has all required fields")
        print(f"  - name: {manifest.get('name')}")
        print(f"  - short_name: {manifest.get('short_name')}")
        print(f"  - display: {manifest.get('display')}")
    
    def test_manifest_has_icons(self):
        """Test that manifest has proper icon configuration"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        
        assert response.status_code == 200
        manifest = response.json()
        
        icons = manifest.get("icons", [])
        assert len(icons) > 0, "Manifest should have at least one icon"
        
        # Check for 192x192 and 512x512 icons (recommended for PWA)
        icon_sizes = [icon.get("sizes") for icon in icons]
        assert any("192" in str(size) for size in icon_sizes), "Should have 192x192 icon"
        assert any("512" in str(size) for size in icon_sizes), "Should have 512x512 icon"
        
        print(f"PWA manifest has {len(icons)} icons configured")
    
    def test_manifest_display_standalone(self):
        """Test that manifest has standalone display mode"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        
        assert response.status_code == 200
        manifest = response.json()
        
        assert manifest.get("display") == "standalone", "PWA should use standalone display mode"
        print("PWA manifest uses standalone display mode")
    
    def test_manifest_has_theme_color(self):
        """Test that manifest has theme color"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        
        assert response.status_code == 200
        manifest = response.json()
        
        assert "theme_color" in manifest, "Manifest should have theme_color"
        assert "background_color" in manifest, "Manifest should have background_color"
        
        print(f"PWA theme_color: {manifest.get('theme_color')}")
        print(f"PWA background_color: {manifest.get('background_color')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
