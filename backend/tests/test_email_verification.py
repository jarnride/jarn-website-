"""
Test Email Verification and WhatsApp Support Features
Tests for:
- Email verification flow (register, verify, login)
- Demo user login (bypass email verification)
- Login blocked for unverified users
- Search functionality
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://jarnnmarket-1.preview.emergentagent.com').rstrip('/')


class TestDemoUserLogin:
    """Test demo users can login without email verification"""
    
    def test_buyer_demo_login(self):
        """Demo buyer should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "buyer@demo.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "buyer@demo.com"
        assert data["user"]["role"] == "buyer"
        print(f"✅ Demo buyer login successful: {data['user']['name']}")
    
    def test_farmer_demo_login(self):
        """Demo farmer should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "john@farm.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "john@farm.com"
        assert data["user"]["role"] == "farmer"
        print(f"✅ Demo farmer login successful: {data['user']['name']}")
    
    def test_invalid_credentials(self):
        """Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestEmailVerificationFlow:
    """Test email verification flow"""
    
    def test_register_requires_email_verification(self):
        """New user registration should require email verification"""
        test_email = f"testuser_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["email_verification_required"] == True
        assert data["mock_mode"] == True
        assert "mock_token" in data
        print(f"✅ Registration successful, email verification required")
        return test_email, data["mock_token"]
    
    def test_login_blocked_for_unverified_user(self):
        """Unverified user should not be able to login"""
        # First register a new user
        test_email = f"testuser_unverified_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Unverified User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        assert reg_response.status_code == 200
        
        # Try to login without verifying email
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "Password123"
        })
        assert login_response.status_code == 403
        data = login_response.json()
        assert "verify your email" in data["detail"].lower()
        print(f"✅ Login correctly blocked for unverified user: {data['detail']}")
    
    def test_verify_email_endpoint(self):
        """Email verification endpoint should work with valid token"""
        # Register a new user
        test_email = f"testuser_verify_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Verify Test User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        assert reg_response.status_code == 200
        mock_token = reg_response.json()["mock_token"]
        
        # Verify email
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": mock_token
        })
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] == True
        assert "verified" in data["message"].lower()
        print(f"✅ Email verification successful: {data['message']}")
    
    def test_login_after_verification(self):
        """User should be able to login after email verification"""
        # Register a new user
        test_email = f"testuser_login_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Login Test User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        assert reg_response.status_code == 200
        mock_token = reg_response.json()["mock_token"]
        
        # Verify email
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": mock_token
        })
        assert verify_response.status_code == 200
        
        # Now login should work
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "Password123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert "token" in data
        assert data["user"]["email_verified"] == True
        print(f"✅ Login successful after email verification")
    
    def test_invalid_verification_token(self):
        """Invalid verification token should return error"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": "invalid-token-12345"
        })
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"✅ Invalid token correctly rejected: {data['detail']}")
    
    def test_resend_verification_email(self):
        """Resend verification email should work for unverified users"""
        # Register a new user
        test_email = f"testuser_resend_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Resend Test User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        assert reg_response.status_code == 200
        
        # Resend verification
        resend_response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": test_email
        })
        assert resend_response.status_code == 200
        data = resend_response.json()
        assert data["success"] == True
        assert "mock_token" in data  # Mock mode returns token
        print(f"✅ Resend verification email successful")
    
    def test_resend_for_verified_user(self):
        """Resend verification for already verified user should indicate already verified"""
        # Register and verify a user
        test_email = f"testuser_already_{int(time.time())}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Already Verified User",
            "email": test_email,
            "password": "Password123",
            "role": "buyer"
        })
        mock_token = reg_response.json()["mock_token"]
        
        # Verify email
        requests.post(f"{BASE_URL}/api/auth/verify-email", json={"token": mock_token})
        
        # Try to resend
        resend_response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": test_email
        })
        assert resend_response.status_code == 200
        data = resend_response.json()
        assert "already verified" in data["message"].lower()
        print(f"✅ Resend correctly indicates already verified")


class TestSearchFunctionality:
    """Test search functionality on auctions"""
    
    def test_search_by_query(self):
        """Search should return matching auctions"""
        response = requests.get(f"{BASE_URL}/api/auctions/search?q=mango")
        assert response.status_code == 200
        data = response.json()
        assert "auctions" in data
        assert "total" in data
        assert data["total"] >= 0
        print(f"✅ Search returned {data['total']} results for 'mango'")
    
    def test_search_by_category(self):
        """Search should filter by category"""
        response = requests.get(f"{BASE_URL}/api/auctions/search?category=Vegetables")
        assert response.status_code == 200
        data = response.json()
        assert "auctions" in data
        # All results should be in Vegetables category
        for auction in data["auctions"]:
            assert auction["category"] == "Vegetables"
        print(f"✅ Category filter returned {data['total']} Vegetables auctions")
    
    def test_search_pagination(self):
        """Search should support pagination"""
        response = requests.get(f"{BASE_URL}/api/auctions/search?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "page" in data
        assert "limit" in data
        assert "total_pages" in data
        assert data["page"] == 1
        assert data["limit"] == 5
        print(f"✅ Pagination working: page {data['page']}/{data['total_pages']}")


class TestAPIHealth:
    """Test API health and basic endpoints"""
    
    def test_api_root(self):
        """API root should return version and features"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "features" in data
        assert data["features"]["email"] == "mock"
        print(f"✅ API version: {data['version']}, email mode: {data['features']['email']}")
    
    def test_auctions_list(self):
        """Auctions list should return auctions"""
        response = requests.get(f"{BASE_URL}/api/auctions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Auctions list returned {len(data)} auctions")
    
    def test_categories_list(self):
        """Categories should return list of categories"""
        response = requests.get(f"{BASE_URL}/api/auctions/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Categories returned: {[c['name'] for c in data]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
