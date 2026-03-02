#!/usr/bin/env python3
"""
Backend Test Suite - Stripe Removal Testing
Tests the backend after removing Stripe payment system from Jarnnmarket.
"""

import requests
import json
import sys
from datetime import datetime

# Test configuration
BACKEND_URL = "https://paystack-jarnn.preview.emergentagent.com/api"
TEST_USER_EMAIL = "buyer@demo.com"
TEST_USER_PASSWORD = "password123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"    Details: {details}")

    def test_backend_health(self):
        """Test 1: Verify backend starts without errors (no Stripe import issues)"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                # Check for Stripe-related errors in response
                response_text = json.dumps(data, default=str).lower()
                
                if 'stripe' in response_text and 'error' in response_text:
                    self.log_result(
                        "Backend Health Check", 
                        False, 
                        "Stripe-related errors found in API response",
                        f"Response: {data}"
                    )
                    return False
                    
                self.log_result(
                    "Backend Health Check", 
                    True, 
                    "Backend running successfully without Stripe errors",
                    f"Status: {response.status_code}, API: {data.get('message', 'OK')}"
                )
                return True
            else:
                self.log_result(
                    "Backend Health Check", 
                    False, 
                    f"Backend returned status {response.status_code}",
                    f"Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Backend Health Check", 
                False, 
                f"Failed to connect to backend: {str(e)}",
                f"URL: {BACKEND_URL}"
            )
            return False

    def authenticate_user(self):
        """Authenticate test user to get auth token"""
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                
                self.log_result(
                    "User Authentication", 
                    True, 
                    f"Successfully authenticated user: {TEST_USER_EMAIL}",
                    f"Token length: {len(self.auth_token) if self.auth_token else 0}"
                )
                return True
            else:
                self.log_result(
                    "User Authentication", 
                    False, 
                    f"Authentication failed with status {response.status_code}",
                    f"Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "User Authentication", 
                False, 
                f"Authentication error: {str(e)}"
            )
            return False

    def test_paystack_initialize_endpoint(self):
        """Test 3: Verify Paystack initialize endpoint still works"""
        try:
            # First get an auction ID for testing
            auctions_response = self.session.get(f"{BACKEND_URL}/auctions")
            
            if auctions_response.status_code != 200:
                self.log_result(
                    "Paystack Initialize Test", 
                    False, 
                    "Could not fetch auctions for testing",
                    f"Auctions API returned: {auctions_response.status_code}"
                )
                return False
                
            auctions_data = auctions_response.json()
            if not isinstance(auctions_data, list) or len(auctions_data) == 0:
                self.log_result(
                    "Paystack Initialize Test", 
                    False, 
                    "No auctions available for testing Paystack"
                )
                return False
                
            # Get first auction with buy_now_price
            test_auction = None
            for auction in auctions_data:
                if auction.get('buy_now_price') and auction.get('buy_now_price') > 0:
                    test_auction = auction
                    break
                    
            if not test_auction:
                self.log_result(
                    "Paystack Initialize Test", 
                    False, 
                    "No auctions with buy_now_price found for testing"
                )
                return False
            
            # Test Paystack initialize endpoint
            paystack_data = {
                "auction_id": test_auction['id'],
                "amount": test_auction['buy_now_price']
            }
            
            response = self.session.post(f"{BACKEND_URL}/paystack/initialize", json=paystack_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required Paystack response fields
                required_fields = ['authorization_url', 'reference']
                missing_fields = [field for field in required_fields if not data.get(field)]
                
                if missing_fields:
                    self.log_result(
                        "Paystack Initialize Test", 
                        False, 
                        f"Missing required fields in Paystack response: {missing_fields}",
                        f"Response: {data}"
                    )
                    return False
                    
                # Check if it's a real Paystack URL (not mocked)
                auth_url = data.get('authorization_url', '')
                if 'checkout.paystack.com' in auth_url:
                    self.log_result(
                        "Paystack Initialize Test", 
                        True, 
                        "Paystack initialize endpoint working with live API",
                        f"Auth URL: {auth_url}, Reference: {data.get('reference')}"
                    )
                    return True
                else:
                    self.log_result(
                        "Paystack Initialize Test", 
                        True, 
                        "Paystack initialize endpoint working (test/mock mode)",
                        f"Auth URL: {auth_url}, Reference: {data.get('reference')}"
                    )
                    return True
                    
            else:
                self.log_result(
                    "Paystack Initialize Test", 
                    False, 
                    f"Paystack initialize failed with status {response.status_code}",
                    f"Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Paystack Initialize Test", 
                False, 
                f"Error testing Paystack initialize: {str(e)}"
            )
            return False

    def test_payment_method_validation(self):
        """Test 4: Test that only paystack and paypal are accepted payment methods"""
        try:
            # Get an auction for testing
            auctions_response = self.session.get(f"{BACKEND_URL}/auctions")
            
            if auctions_response.status_code != 200:
                self.log_result(
                    "Payment Method Validation", 
                    False, 
                    "Could not fetch auctions for validation testing"
                )
                return False
                
            auctions_data = auctions_response.json()
            if not isinstance(auctions_data, list) or len(auctions_data) == 0:
                self.log_result(
                    "Payment Method Validation", 
                    False, 
                    "No auctions available for testing payment validation"
                )
                return False
                
            test_auction = auctions_data[0]
            
            # Test valid payment methods
            valid_methods = ['paystack', 'paypal']
            valid_results = []
            
            for method in valid_methods:
                buy_now_data = {
                    "origin_url": f"{BACKEND_URL}/test",
                    "payment_method": method,
                    "delivery_option": "local_pickup",
                    "delivery_address": "Test Address"
                }
                
                response = self.session.post(
                    f"{BACKEND_URL}/auctions/{test_auction['id']}/buy-now", 
                    json=buy_now_data
                )
                
                # We expect this to work (even if user isn't the seller, it should pass validation)
                if response.status_code in [200, 400]:  # 400 might be business logic error, not validation
                    response_text = response.text.lower()
                    if 'payment_method' not in response_text or 'invalid' not in response_text:
                        valid_results.append((method, True))
                    else:
                        valid_results.append((method, False))
                else:
                    valid_results.append((method, False))
            
            # Test invalid payment method (stripe)
            invalid_method_data = {
                "origin_url": f"{BACKEND_URL}/test",
                "payment_method": "stripe",  # This should be rejected
                "delivery_option": "local_pickup",
                "delivery_address": "Test Address"
            }
            
            stripe_response = self.session.post(
                f"{BACKEND_URL}/auctions/{test_auction['id']}/buy-now", 
                json=invalid_method_data
            )
            
            # Should get validation error for stripe
            stripe_rejected = stripe_response.status_code == 422
            
            # Analyze results
            all_valid_passed = all(result[1] for result in valid_results)
            
            if all_valid_passed and stripe_rejected:
                self.log_result(
                    "Payment Method Validation", 
                    True, 
                    "Payment method validation working correctly",
                    f"Valid methods ({valid_methods}) accepted, stripe rejected (422)"
                )
                return True
            else:
                details = f"Valid methods results: {valid_results}, Stripe rejected: {stripe_rejected}"
                self.log_result(
                    "Payment Method Validation", 
                    False, 
                    "Payment method validation not working as expected",
                    details
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Payment Method Validation", 
                False, 
                f"Error testing payment method validation: {str(e)}"
            )
            return False

    def test_api_status_endpoint(self):
        """Test API status endpoint for payment configurations"""
        try:
            response = self.session.get(f"{BACKEND_URL}/status")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check that Stripe is not mentioned in status
                status_text = json.dumps(data, default=str).lower()
                
                # Should have paystack and paypal, but not stripe
                has_paystack = 'paystack' in status_text
                has_paypal = 'paypal' in status_text  
                has_stripe = 'stripe' in status_text
                
                if has_paystack and has_paypal and not has_stripe:
                    self.log_result(
                        "API Status Check", 
                        True, 
                        "API status correctly shows paystack and paypal, no stripe",
                        f"Paystack: {has_paystack}, PayPal: {has_paypal}, Stripe: {has_stripe}"
                    )
                    return True
                else:
                    self.log_result(
                        "API Status Check", 
                        False, 
                        "API status configuration unexpected",
                        f"Paystack: {has_paystack}, PayPal: {has_paypal}, Stripe: {has_stripe}"
                    )
                    return False
            else:
                self.log_result(
                    "API Status Check", 
                    False, 
                    f"API status endpoint returned {response.status_code}",
                    f"Response: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "API Status Check", 
                False, 
                f"Error checking API status: {str(e)}"
            )
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Backend Test Suite - Stripe Removal Testing")
        print(f"📡 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Backend Health
        health_ok = self.test_backend_health()
        
        # Test 2: Authentication (needed for other tests)
        if health_ok:
            auth_ok = self.authenticate_user()
        else:
            auth_ok = False
            
        # Test 3: API Status
        if health_ok:
            self.test_api_status_endpoint()
            
        # Test 4: Paystack endpoint
        if auth_ok:
            self.test_paystack_initialize_endpoint()
            
        # Test 5: Payment method validation
        if auth_ok:
            self.test_payment_method_validation()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if "✅ PASS" in r['status'])
        failed = sum(1 for r in self.test_results if "❌ FAIL" in r['status'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  • {result['test']}: {result['message']}")
                    if result['details']:
                        print(f"    Details: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if "✅ PASS" in result['status']:
                print(f"  • {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Backend successfully running without Stripe!")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED - Backend issues detected!")
        sys.exit(1)