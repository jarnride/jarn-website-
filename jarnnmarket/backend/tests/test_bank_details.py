"""
Test Bank Details Feature for Farmer Registration
- Farmer registration with bank details (bank_name, bank_account_number, national_id)
- Bank details validation (10-digit account, 11-digit NIN)
- GET /api/auth/me returns bank details for farmers
- PUT /api/sellers/me/payout-details updates seller payout details
- Buyer registration should NOT require bank details
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFarmerRegistrationWithBankDetails:
    """Test farmer registration with bank details"""
    
    def test_farmer_registration_with_valid_bank_details(self):
        """Register a new farmer with valid bank details"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Farmer_{unique_id}",
            "email": f"testfarmer_{unique_id}@test.com",
            "password": "Password123!",
            "role": "farmer",
            "phone": "+2348012345678",
            "bank_name": "First Bank",
            "bank_account_number": "1234567890",  # 10 digits
            "national_id": "12345678901"  # 11 digits
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print(f"Registration response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should require email verification
        assert data.get("success") == True
        assert data.get("email_verification_required") == True
        # In mock mode, we get a token for testing
        assert "mock_token" in data or "message" in data
        
    def test_farmer_registration_without_bank_details(self):
        """Register a farmer without bank details - should still work but payout_details_complete=False"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_FarmerNoBankDetails_{unique_id}",
            "email": f"testfarmer_nobank_{unique_id}@test.com",
            "password": "Password123!",
            "role": "farmer",
            "phone": "+2348012345679"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print(f"Registration response: {response.status_code} - {response.text[:500]}")
        
        # Should succeed - bank details are optional at registration
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


class TestBuyerRegistration:
    """Test buyer registration - should NOT require bank details"""
    
    def test_buyer_registration_without_bank_details(self):
        """Register a buyer without bank details - should succeed"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Buyer_{unique_id}",
            "email": f"testbuyer_{unique_id}@test.com",
            "password": "Password123!",
            "role": "buyer",
            "phone": "+2348012345680"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print(f"Buyer registration response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True


class TestBankDetailsValidation:
    """Test bank details validation"""
    
    def test_invalid_account_number_length(self):
        """Account number must be 10 digits for payout update"""
        # First login as existing farmer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as farmer")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to update with invalid account number (not 10 digits)
        payload = {
            "bank_name": "First Bank",
            "bank_account_number": "12345",  # Only 5 digits - invalid
            "national_id": "12345678901"
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", 
                               json=payload, headers=headers)
        print(f"Invalid account number response: {response.status_code} - {response.text}")
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for invalid account number, got {response.status_code}"
    
    def test_invalid_nin_length(self):
        """NIN must be 11 digits for payout update"""
        # First login as existing farmer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as farmer")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to update with invalid NIN (not 11 digits)
        payload = {
            "bank_name": "First Bank",
            "bank_account_number": "1234567890",
            "national_id": "12345"  # Only 5 digits - invalid
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", 
                               json=payload, headers=headers)
        print(f"Invalid NIN response: {response.status_code} - {response.text}")
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for invalid NIN, got {response.status_code}"
    
    def test_non_numeric_account_number(self):
        """Account number must be numeric"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as farmer")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "bank_name": "First Bank",
            "bank_account_number": "123456789A",  # Contains letter - invalid
            "national_id": "12345678901"
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", 
                               json=payload, headers=headers)
        print(f"Non-numeric account response: {response.status_code} - {response.text}")
        
        # Should fail validation
        assert response.status_code == 400, f"Expected 400 for non-numeric account, got {response.status_code}"


class TestGetAuthMeWithBankDetails:
    """Test GET /api/auth/me returns bank details for farmers"""
    
    def test_farmer_auth_me_returns_bank_details(self):
        """GET /api/auth/me should return bank details for farmers"""
        # Login as farmer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get user profile
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"Auth/me response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify farmer-specific fields are present
        assert data.get("role") == "farmer"
        assert "bank_name" in data, "bank_name field should be present for farmers"
        assert "bank_account_number" in data, "bank_account_number field should be present for farmers"
        assert "national_id" in data, "national_id field should be present for farmers"
        assert "payout_details_complete" in data, "payout_details_complete field should be present for farmers"
    
    def test_buyer_auth_me_does_not_return_bank_details(self):
        """GET /api/auth/me should NOT return bank details for buyers"""
        # Login as buyer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get user profile
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"Buyer auth/me response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify buyer does NOT have bank details fields
        assert data.get("role") == "buyer"
        # Bank details should NOT be present for buyers
        assert "bank_name" not in data or data.get("bank_name") is None, "bank_name should not be present for buyers"


class TestUpdatePayoutDetails:
    """Test PUT /api/sellers/me/payout-details"""
    
    def test_farmer_can_update_payout_details(self):
        """Farmer should be able to update payout details"""
        # Login as farmer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update payout details
        payload = {
            "bank_name": "GTBank",
            "bank_account_number": "0123456789",  # 10 digits
            "national_id": "98765432101"  # 11 digits
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", 
                               json=payload, headers=headers)
        print(f"Update payout details response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        # Verify the update by getting user profile
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        me_data = me_response.json()
        
        assert me_data.get("bank_name") == "GTBank"
        assert me_data.get("bank_account_number") == "0123456789"
        assert me_data.get("national_id") == "98765432101"
        assert me_data.get("payout_details_complete") == True
    
    def test_buyer_cannot_update_payout_details(self):
        """Buyer should NOT be able to update payout details"""
        # Login as buyer
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to update payout details
        payload = {
            "bank_name": "GTBank",
            "bank_account_number": "0123456789",
            "national_id": "98765432101"
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", 
                               json=payload, headers=headers)
        print(f"Buyer update payout response: {response.status_code} - {response.text}")
        
        # Should be forbidden for buyers
        assert response.status_code == 403, f"Expected 403 for buyer, got {response.status_code}"
    
    def test_unauthenticated_cannot_update_payout_details(self):
        """Unauthenticated user should NOT be able to update payout details"""
        payload = {
            "bank_name": "GTBank",
            "bank_account_number": "0123456789",
            "national_id": "98765432101"
        }
        
        response = requests.put(f"{BASE_URL}/api/sellers/me/payout-details", json=payload)
        print(f"Unauthenticated update response: {response.status_code} - {response.text}")
        
        # Should be unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestFullFarmerRegistrationFlow:
    """Test complete farmer registration flow with bank details"""
    
    def test_full_farmer_registration_and_verify_flow(self):
        """Complete flow: Register farmer with bank details -> Verify email -> Login -> Check profile"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"testfarmer_full_{unique_id}@test.com"
        
        # Step 1: Register farmer with bank details
        register_payload = {
            "name": f"TEST_FullFlowFarmer_{unique_id}",
            "email": email,
            "password": "Password123!",
            "role": "farmer",
            "phone": "+2348012345681",
            "bank_name": "Access Bank",
            "bank_account_number": "9876543210",
            "national_id": "11122233344"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        print(f"Register response: {register_response.status_code} - {register_response.text[:500]}")
        
        assert register_response.status_code == 200
        register_data = register_response.json()
        
        # Check if mock mode is enabled
        mock_mode = register_data.get("mock_mode", False)
        mock_token = register_data.get("mock_token")
        
        if not mock_mode or not mock_token:
            # Email is in real mode (SendGrid) - skip verification flow test
            # Just verify registration was successful
            assert register_data.get("success") == True
            assert register_data.get("email_verification_required") == True
            print("Email is in real mode - skipping verification flow (SendGrid sender not verified)")
            pytest.skip("Email is in real mode - cannot complete verification flow without real email")
        
        # Step 2: Verify email (only in mock mode)
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": mock_token
        })
        print(f"Verify email response: {verify_response.status_code} - {verify_response.text}")
        
        assert verify_response.status_code == 200
        
        # Step 3: Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
        print(f"Login response: {login_response.status_code} - {login_response.text}")
        
        assert login_response.status_code == 200
        token = login_response.json().get("token")
        
        # Step 4: Get profile and verify bank details
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"Profile response: {me_response.status_code} - {me_response.text}")
        
        assert me_response.status_code == 200
        profile = me_response.json()
        
        assert profile.get("role") == "farmer"
        assert profile.get("bank_name") == "Access Bank"
        assert profile.get("bank_account_number") == "9876543210"
        assert profile.get("national_id") == "11122233344"
        assert profile.get("payout_details_complete") == True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
