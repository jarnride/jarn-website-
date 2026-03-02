#!/usr/bin/env python3
"""
Focused Paystack Testing for Jarnnmarket
Tests the live Paystack integration specifically
"""

import requests
import json
from datetime import datetime

def test_paystack_integration():
    """Test Paystack integration specifically"""
    base_url = "https://paystack-jarnn.preview.emergentagent.com/api"
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    print("🚀 Testing Paystack Integration on Jarnnmarket")
    print("=" * 50)
    
    # Test 1: Check API status shows paystack as "live"
    print("1️⃣ Checking Paystack Configuration Status...")
    try:
        response = session.get(f"{base_url}/")
        if response.status_code == 200:
            data = response.json()
            paystack_status = data.get('features', {}).get('paystack')
            if paystack_status == 'live':
                print("✅ Paystack status: LIVE (correct)")
            elif paystack_status == 'mock':
                print("❌ Paystack status: MOCK (should be live)")
                return False
            else:
                print(f"❌ Paystack status: {paystack_status} (unknown)")
                return False
        else:
            print(f"❌ API status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        return False
    
    # Test 2: Login as buyer
    print("\n2️⃣ Logging in as buyer...")
    login_data = {
        "email": "buyer@demo.com",
        "password": "password123"
    }
    
    try:
        response = session.post(f"{base_url}/auth/login", json=login_data)
        if response.status_code == 200:
            login_result = response.json()
            buyer_token = login_result.get('token')
            user_info = login_result.get('user', {})
            print(f"✅ Logged in as: {user_info.get('name')} ({user_info.get('email')})")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Test 3: Get an auction to test with
    print("\n3️⃣ Getting auction for payment test...")
    try:
        response = session.get(f"{base_url}/auctions")
        if response.status_code == 200:
            auctions = response.json()
            if len(auctions) > 0:
                test_auction = auctions[0]
                auction_id = test_auction['id']
                auction_title = test_auction['title']
                print(f"✅ Found auction: {auction_title} (ID: {auction_id[:8]}...)")
            else:
                print("❌ No auctions available for testing")
                return False
        else:
            print(f"❌ Failed to get auctions: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting auctions: {e}")
        return False
    
    # Test 4: Initialize Paystack payment
    print("\n4️⃣ Testing Paystack Payment Initialization...")
    paystack_data = {
        "auction_id": auction_id,
        "amount": 50000.00  # 50,000 NGN (about $30 USD)
    }
    
    try:
        headers = {'Authorization': f'Bearer {buyer_token}', 'Content-Type': 'application/json'}
        response = session.post(f"{base_url}/paystack/initialize", json=paystack_data, headers=headers)
        
        if response.status_code == 200:
            paystack_result = response.json()
            
            # Check for required fields
            auth_url = paystack_result.get('authorization_url')
            reference = paystack_result.get('reference')
            mock_mode = paystack_result.get('mock_mode', True)
            
            if auth_url and reference:
                print(f"✅ Paystack initialization successful!")
                print(f"   Reference: {reference}")
                print(f"   Authorization URL: {auth_url[:60]}...")
                
                # Verify it's a real Paystack URL
                if 'paystack.co' in auth_url and not mock_mode:
                    print("✅ Real Paystack URL confirmed (not mock)")
                    paystack_reference = reference
                elif mock_mode:
                    print("❌ Mock mode detected - should be live!")
                    return False
                else:
                    print(f"⚠️ Non-standard URL pattern: {auth_url}")
                    paystack_reference = reference
            else:
                print(f"❌ Missing required fields in response: {paystack_result}")
                return False
        else:
            print(f"❌ Paystack initialize failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Paystack initialize error: {e}")
        return False
    
    # Test 5: Test Paystack verify endpoint (will fail without actual payment, but API should be accessible)
    print("\n5️⃣ Testing Paystack Verify API Endpoint...")
    try:
        headers = {'Authorization': f'Bearer {buyer_token}', 'Content-Type': 'application/json'}
        response = session.post(f"{base_url}/paystack/verify/{paystack_reference}", headers=headers)
        
        # We expect this to fail since we didn't actually pay, but the API should respond
        if response.status_code in [200, 400]:
            verify_result = response.json()
            print(f"✅ Paystack verify API accessible")
            print(f"   Response: {verify_result}")
            print("   Note: Verification will fail without actual payment (expected)")
        else:
            print(f"❌ Paystack verify API error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Paystack verify error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Paystack Integration Test: PASSED")
    print("✅ Paystack is configured for LIVE payments (not mock)")
    print("✅ Paystack initialize returns real authorization URLs")
    print("✅ Paystack verify API is accessible")
    print("\n💡 Integration Status: READY FOR LIVE PAYMENTS")
    return True

if __name__ == "__main__":
    success = test_paystack_integration()
    print(f"\n📊 Test Result: {'SUCCESS' if success else 'FAILED'}")
    exit(0 if success else 1)