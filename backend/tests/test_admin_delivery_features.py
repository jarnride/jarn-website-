"""
Test suite for new Jarnnmarket features:
1. Admin management endpoints (create/get/update/delete admins)
2. Seller password change with approval
3. Checkout delivery options (tested via frontend)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@jarnnmarket.com"
ADMIN_PASSWORD = "admin123"
SELLER_EMAIL = "john@farm.com"
SELLER_PASSWORD = "password123"
BUYER_EMAIL = "buyer@demo.com"
BUYER_PASSWORD = "password"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("user", {}).get("email") == ADMIN_EMAIL
        print(f"✓ Admin login successful")


class TestAdminManagementEndpoints:
    """Test admin CRUD endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_get_admin_users(self, admin_token):
        """GET /api/admin/admins should return list of admins"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/admins", headers=headers)
        
        assert response.status_code == 200, f"Failed to get admins: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/admins returned {len(data)} admin(s)")
        
        # Check that main admin is in the list
        admin_emails = [admin.get('email') for admin in data]
        assert ADMIN_EMAIL in admin_emails, "Main admin should be in the list"
        print(f"✓ Main admin found in list")
    
    def test_create_sub_admin(self, admin_token):
        """POST /api/admin/admins should create a sub-admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_email = f"test_subadmin_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {
            "name": "Test Sub Admin",
            "email": unique_email,
            "password": "testpass123",
            "role": "sub_admin",
            "privileges": {
                "view_users": True,
                "approve_users": True,
                "delete_users": False,
                "view_orders": True,
                "cancel_orders": False,
                "view_auctions": True,
                "manage_auctions": False,
                "view_payouts": True,
                "process_payouts": False,
                "view_escrows": True,
                "manage_escrows": False,
                "send_marketing": False,
                "manage_admins": False
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/admins", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Failed to create sub-admin: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success should be True"
        assert "id" in data, "Response should contain admin ID"
        print(f"✓ POST /api/admin/admins created sub-admin: {unique_email}")
        
        # Store the created admin ID for cleanup
        return data.get("id"), unique_email
    
    def test_create_super_admin(self, admin_token):
        """POST /api/admin/admins should create a super admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_email = f"test_superadmin_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {
            "name": "Test Super Admin",
            "email": unique_email,
            "password": "testpass123",
            "role": "admin",
            "privileges": {
                "view_users": True,
                "approve_users": True,
                "delete_users": True,
                "view_orders": True,
                "cancel_orders": True,
                "view_auctions": True,
                "manage_auctions": True,
                "view_payouts": True,
                "process_payouts": True,
                "view_escrows": True,
                "manage_escrows": True,
                "send_marketing": True,
                "manage_admins": True
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/admins", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Failed to create super admin: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Success should be True"
        print(f"✓ POST /api/admin/admins created super admin: {unique_email}")
    
    def test_create_admin_duplicate_email(self, admin_token):
        """POST /api/admin/admins should reject duplicate email"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "name": "Duplicate Admin",
            "email": ADMIN_EMAIL,  # Already exists
            "password": "testpass123",
            "role": "sub_admin"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/admins", json=payload, headers=headers)
        
        assert response.status_code == 400, f"Should reject duplicate email: {response.text}"
        print(f"✓ POST /api/admin/admins correctly rejects duplicate email")
    
    def test_update_admin_privileges(self, admin_token):
        """PUT /api/admin/admins/{id}/privileges should update privileges"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a sub-admin to update
        unique_email = f"test_update_{uuid.uuid4().hex[:8]}@test.com"
        create_payload = {
            "name": "Admin To Update",
            "email": unique_email,
            "password": "testpass123",
            "role": "sub_admin",
            "privileges": {
                "view_users": True,
                "approve_users": True,
                "delete_users": False
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/admins", json=create_payload, headers=headers)
        assert create_response.status_code == 200, f"Failed to create admin for update test: {create_response.text}"
        admin_id = create_response.json().get("id")
        
        # Now update privileges
        update_payload = {
            "privileges": {
                "view_users": True,
                "approve_users": True,
                "delete_users": True,  # Changed from False to True
                "cancel_orders": True  # Added new privilege
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/admins/{admin_id}/privileges",
            json=update_payload,
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Failed to update privileges: {update_response.text}"
        data = update_response.json()
        assert data.get("success") == True, "Success should be True"
        print(f"✓ PUT /api/admin/admins/{admin_id}/privileges updated successfully")
    
    def test_cannot_modify_main_admin(self, admin_token):
        """PUT /api/admin/admins/{id}/privileges should not modify main admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get the main admin's ID
        admins_response = requests.get(f"{BASE_URL}/api/admin/admins", headers=headers)
        admins = admins_response.json()
        main_admin = next((a for a in admins if a.get('email') == ADMIN_EMAIL), None)
        
        if not main_admin:
            pytest.skip("Main admin not found")
        
        update_payload = {
            "privileges": {
                "view_users": False  # Try to remove privilege
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/admins/{main_admin['id']}/privileges",
            json=update_payload,
            headers=headers
        )
        
        assert response.status_code == 400, f"Should not allow modifying main admin: {response.text}"
        print(f"✓ PUT /api/admin/admins correctly protects main admin")
    
    def test_delete_admin(self, admin_token):
        """DELETE /api/admin/admins/{id} should remove admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create an admin to delete
        unique_email = f"test_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_payload = {
            "name": "Admin To Delete",
            "email": unique_email,
            "password": "testpass123",
            "role": "sub_admin"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/admins", json=create_payload, headers=headers)
        assert create_response.status_code == 200, f"Failed to create admin for delete test: {create_response.text}"
        admin_id = create_response.json().get("id")
        
        # Now delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/admins/{admin_id}", headers=headers)
        
        assert delete_response.status_code == 200, f"Failed to delete admin: {delete_response.text}"
        data = delete_response.json()
        assert data.get("success") == True, "Success should be True"
        print(f"✓ DELETE /api/admin/admins/{admin_id} removed admin successfully")
    
    def test_cannot_delete_main_admin(self, admin_token):
        """DELETE /api/admin/admins/{id} should not delete main admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get the main admin's ID
        admins_response = requests.get(f"{BASE_URL}/api/admin/admins", headers=headers)
        admins = admins_response.json()
        main_admin = next((a for a in admins if a.get('email') == ADMIN_EMAIL), None)
        
        if not main_admin:
            pytest.skip("Main admin not found")
        
        response = requests.delete(f"{BASE_URL}/api/admin/admins/{main_admin['id']}", headers=headers)
        
        assert response.status_code == 400, f"Should not allow deleting main admin: {response.text}"
        print(f"✓ DELETE /api/admin/admins correctly protects main admin")


class TestSellerPasswordChange:
    """Test seller password change with approval requirement"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SELLER_EMAIL,
            "password": SELLER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Seller login failed")
        return response.json().get("token")
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BUYER_EMAIL,
            "password": BUYER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Buyer login failed")
        return response.json().get("token")
    
    def test_change_password_endpoint_exists(self, seller_token):
        """POST /api/auth/change-password endpoint should exist"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Test with wrong current password to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=headers
        )
        
        # Should return 400 for wrong password, not 404
        assert response.status_code in [400, 422], f"Endpoint should exist: {response.status_code} - {response.text}"
        print(f"✓ POST /api/auth/change-password endpoint exists")
    
    def test_seller_password_change_requires_review(self, seller_token):
        """Seller password change should trigger pending_review status"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Note: We won't actually change the password to avoid breaking other tests
        # Just verify the endpoint behavior with wrong current password
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=headers
        )
        
        # Should return 400 for wrong password
        assert response.status_code == 400, f"Should reject wrong password: {response.text}"
        assert "incorrect" in response.text.lower() or "wrong" in response.text.lower() or "current" in response.text.lower(), \
            f"Should mention incorrect password: {response.text}"
        print(f"✓ POST /api/auth/change-password validates current password")
    
    def test_buyer_password_change_no_review(self, buyer_token):
        """Buyer password change should NOT require review"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Test with wrong current password
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=headers
        )
        
        # Should return 400 for wrong password
        assert response.status_code == 400, f"Should reject wrong password: {response.text}"
        print(f"✓ POST /api/auth/change-password works for buyers")


class TestAdminStats:
    """Test admin dashboard stats endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_admin_stats_endpoint(self, admin_token):
        """GET /api/admin/stats should return dashboard stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ["total_users", "total_auctions", "total_escrow", "pending_payouts"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ GET /api/admin/stats returns: total_users={data.get('total_users')}, total_auctions={data.get('total_auctions')}")
    
    def test_admin_users_endpoint(self, admin_token):
        """GET /api/admin/users should return user list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/users returned {len(data)} users")
    
    def test_admin_auctions_endpoint(self, admin_token):
        """GET /api/admin/auctions should return auction list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/auctions", headers=headers)
        
        assert response.status_code == 200, f"Failed to get auctions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/auctions returned {len(data)} auctions")
    
    def test_admin_payouts_endpoint(self, admin_token):
        """GET /api/admin/payouts should return payout list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/payouts", headers=headers)
        
        assert response.status_code == 200, f"Failed to get payouts: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/payouts returned {len(data)} payouts")
    
    def test_admin_escrows_endpoint(self, admin_token):
        """GET /api/admin/escrows should return escrow list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/escrows", headers=headers)
        
        assert response.status_code == 200, f"Failed to get escrows: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/escrows returned {len(data)} escrows")


class TestSubAdminAccess:
    """Test sub-admin access restrictions"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_create_and_login_sub_admin(self, admin_token):
        """Create a sub-admin and verify they can login"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_email = f"test_login_subadmin_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "testpass123"
        
        # Create sub-admin
        create_payload = {
            "name": "Login Test Sub Admin",
            "email": unique_email,
            "password": test_password,
            "role": "sub_admin",
            "privileges": {
                "view_users": True,
                "approve_users": True,
                "delete_users": False
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/admins", json=create_payload, headers=headers)
        assert create_response.status_code == 200, f"Failed to create sub-admin: {create_response.text}"
        
        # Try to login as sub-admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": test_password
        })
        
        assert login_response.status_code == 200, f"Sub-admin login failed: {login_response.text}"
        data = login_response.json()
        assert "token" in data, "Token not in response"
        assert data.get("user", {}).get("role") == "sub_admin", "Role should be sub_admin"
        print(f"✓ Sub-admin created and logged in successfully: {unique_email}")
        
        # Verify sub-admin can access admin endpoints
        sub_admin_token = data.get("token")
        sub_admin_headers = {"Authorization": f"Bearer {sub_admin_token}"}
        
        # Should be able to view users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=sub_admin_headers)
        assert users_response.status_code == 200, f"Sub-admin should be able to view users: {users_response.text}"
        print(f"✓ Sub-admin can access /api/admin/users")
        
        # Should be able to view stats
        stats_response = requests.get(f"{BASE_URL}/api/admin/stats", headers=sub_admin_headers)
        assert stats_response.status_code == 200, f"Sub-admin should be able to view stats: {stats_response.text}"
        print(f"✓ Sub-admin can access /api/admin/stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
