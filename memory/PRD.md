# jarnnmarket - Farmers Auction Platform PRD

## Original Problem Statement
Build a Farmers Auction Platform with comprehensive features including real-time bidding, multiple payment options, SMS verification, and escrow system.

## User Personas
1. **Farmers (Sellers)**: List agricultural products for auction
2. **Buyers**: Browse and bid on produce auctions

## What's Been Implemented

### Phase 1 (Complete)
- [x] WebSocket real-time bid updates (socket.io)
- [x] Buy It Now option with instant purchase
- [x] Image upload for auctions (base64 in MongoDB)
- [x] Duplicate email prevention
- [x] Security improvements (rate limiting, input validation, bcrypt)

### Phase 2 (Complete - MOCK MODE)
- [x] SMS Verification via Twilio (MOCK - shows OTP in response for testing)
- [x] PayPal payment option (MOCK - creates order without redirect)
- [x] SMS notifications for high-value bids ($100+ threshold)
- [x] Escrow system for secure payments
  - Funds held until buyer confirms delivery
  - Seller notified when payment received
  - Buyer can release funds after delivery

### Backend Features
- User authentication with phone verification requirement
- Auction CRUD with buy_now_price support
- Bidding system with WebSocket broadcast
- Multiple payment methods (Stripe + PayPal)
- Escrow table with status tracking (held, released, refunded)
- SMS service for verification and notifications
- Rate limiting on all sensitive endpoints

### Frontend Features
- jarnnmarket branding
- Phone verification modal
- Dashboard with escrow information
- Payment method selection (Stripe/PayPal)
- Delivery confirmation button for buyers
- Phone verification status indicators

## Mock Services (Replace with Real Credentials)

### Twilio SMS
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

### PayPal
```
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_MODE=sandbox|live
```

## Demo Credentials
- Farmer: john@farm.com / password123 (phone_verified=true)
- Buyer: buyer@demo.com / password123 (phone_verified=true)

## Prioritized Backlog

### P0 - Phase 1 & 2 Done ✓

### P1 - Phase 3 (Next)
- Email notifications (bid events, auction won)
- Seller ratings/reviews system

### P2 - Phase 4 (DevOps)
- Unit & integration tests
- Docker deployment

## Contact Info
- Email: info@jarnnmarket.com
- Phone: +2348189275367
- Location: Abia State, Nigeria
