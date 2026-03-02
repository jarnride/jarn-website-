#!/usr/bin/env python3
"""
Test Paystack with alternative buyer account (john@farm.com)
"""

import requests
import json

def test_with_john_farm():
    """Test Paystack with john@farm.com account"""
    base_url = "https://paystack-jarnn.preview.emergentagent.com/api"
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    print("🚀 Testing Paystack with john@farm.com account")
    print("=" * 50)
    
    # Login as john@farm.com
    print("🔐 Logging in as john@farm.com...")
    login_data = {
        "email": "john@farm.com",
        "password": "password123"
    }
    
    try:
        response = session.post(f"{base_url}/auth/login", json=login_data)
        if response.status_code == 200:
            login_result = response.json()
            token = login_result.get('token')
            user_info = login_result.get('user', {})
            print(f"✅ Logged in as: {user_info.get('name')} ({user_info.get('email')})")
            print(f"   Role: {user_info.get('role')}")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Get an auction
    print("\n📋 Getting auction for payment test...")
    try:
        response = session.get(f"{base_url}/auctions")
        if response.status_code == 200:
            auctions = response.json()
            if len(auctions) > 0:
                test_auction = auctions[0]
                auction_id = test_auction['id']
                auction_title = test_auction['title']
                print(f"✅ Found auction: {auction_title}")
            else:
                print("❌ No auctions available")
                return False
        else:
            print(f"❌ Failed to get auctions: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting auctions: {e}")
        return False
    
    # Test Paystack initialization
    print("\n💰 Testing Paystack Payment Initialization...")
    paystack_data = {
        "auction_id": auction_id,
        "amount": 75000.00  # 75,000 NGN
    }
    
    try:
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        response = session.post(f"{base_url}/paystack/initialize", json=paystack_data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            auth_url = result.get('authorization_url')
            reference = result.get('reference')
            mock_mode = result.get('mock_mode', True)
            
            print(f"✅ Paystack initialization successful!")
            print(f"   Reference: {reference}")
            print(f"   URL: {auth_url[:50]}...")
            
            if 'paystack.co' in auth_url and not mock_mode:
                print("✅ Real Paystack URL (LIVE mode)")
                return True
            else:
                print("❌ Mock mode or invalid URL")
                return False
        else:
            print(f"❌ Paystack failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Paystack error: {e}")
        return False

if __name__ == "__main__":
    success = test_with_john_farm()
    print(f"\n📊 Test Result: {'SUCCESS' if success else 'FAILED'}")
    exit(0 if success else 1)