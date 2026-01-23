# Jarnnmarket - Farmers Auction Platform

## Overview
A full-stack auction platform connecting farmers directly with buyers through real-time auctions, featuring escrow-protected payments, email and phone verification, and comprehensive buyer/seller policies.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Payments:** Stripe (integrated), PayPal (integrated with fallback)
- **Email:** SendGrid (integrated with fallback)
- **SMS:** Twilio (integrated with fallback)
- **Real-time:** WebSockets (socket.io)
- **Authentication:** JWT

## Core Features

### Authentication & Verification
- [x] User registration (Farmer/Buyer roles)
- [x] JWT-based authentication
- [x] **Email verification (MANDATORY)** - Required before login for both buyers and sellers
- [x] **Phone verification (MANDATORY)** - Required for bidding/listing
- [x] Phone verification via SMS (Twilio integrated)
- [x] Demo users bypass email verification (for testing)

### Customer Support
- [x] **WhatsApp Support** - Floating button on all pages (+447449858053)
- [x] **WhatsApp Link in Footer** - Easy access to customer service

### Auction Management
- [x] Create auctions with images
- [x] **Image quality validation** (min 400x300px, min 20KB)
- [x] **Buy Now Only option** - Disables bidding entirely, shows only fixed price
- [x] **Accepts Offers option** - Allows buyers to make offers
- [x] Real-time bidding via WebSockets
- [x] Buy Now instant purchase
- [x] Auction countdown timer
- [x] Category filtering
- [x] Search functionality with filters (query, category, price range, delivery, currency)

### Delivery Options
- [x] **Local Pickup** - Free pickup from seller location
- [x] **City-to-City Delivery** - Delivery within Nigeria (2-5 days)
- [x] **International Shipping** - Worldwide delivery (7-21 days)
- [x] Ship-from location configuration

### Quantity & Weight
- [x] Quantity field (1-10,000 units)
- [x] Weight field with unit selection (kg, lb, g)

### Multi-Currency Support
- [x] **USD ($)** - US Dollars
- [x] **NGN (₦)** - Nigerian Naira
- [x] Currency selection during listing creation

### Seller Subscription Plans
- [x] **5-Day Plan** - $4.99 / ₦7,500
- [x] **Weekly Plan** - $6.99 / ₦10,500
- [x] **Monthly Plan** - $19.99 / ₦30,000

### Notifications System
- [x] Real-time notification bell in navbar
- [x] Notifications for sellers and buyers
- [x] Notification count badge with animation

### Offers System
- [x] Buyers can make offers on listings that accept offers
- [x] Sellers can view, accept, or reject offers
- [x] Email notifications for offer updates

### Payment & Escrow
- [x] Stripe payment integration
- [x] PayPal payment integration (with fallback)
- [x] Escrow system - funds held until delivery confirmation
- [x] Payout system - Sellers request payout after escrow release

### Policies & Legal
- [x] Terms & Conditions
- [x] Privacy Policy
- [x] Return & Refund Policy
- [x] Seller Guidelines
- [x] Buyer Guidelines

## API Endpoints

### Authentication (Updated)
- `POST /api/auth/register` - Register with email verification required
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/login` - Login (blocked for unverified users)
- `GET /api/auth/me` - Get current user profile

### Subscriptions
- `GET /api/subscriptions/plans` - Get all subscription plans
- `GET /api/users/me/subscription` - Get current subscription
- `POST /api/subscriptions/subscribe` - Subscribe to a plan

### Auctions
- `GET /api/auctions/search` - Search with filters (q, category, price, currency, delivery, sort)
- `POST /api/auctions` - Create auction with all new fields

## Database Collections
- `users` - User accounts with email_verified and phone_verified status
- `email_verifications` - Email verification tokens
- `phone_verifications` - Phone verification OTPs
- `auctions` - Listings with delivery options, currency, quantity, weight
- `subscriptions` - Seller subscription records
- `bids` - Bid history
- `offers` - Make offer submissions
- `escrow` - Payment escrow records
- `payouts` - Seller payout history
- `reviews` - Seller ratings
- `images` - Uploaded images
- `notifications` - User notifications

## Contact Information
- Email: info@jarnnmarket.com
- Phone: +2348189275367
- WhatsApp: +447449858053
- Location: Abia State, Nigeria

## Integration Status

### Active Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Stripe | ✅ Active | Test mode |
| Twilio SMS | ⚠️ Configured | API key provided, ready to use |
| SendGrid Email | ⚠️ Fallback | API key may need verification, falls back to mock |
| PayPal | ⚠️ Configured | Credentials provided, sandbox mode |

### Integration Notes
- **SendGrid**: The provided API key returns 401 Unauthorized. This may be because:
  - The API key format appears incomplete (SendGrid keys typically start with `SG.` and are ~69 chars)
  - The sender domain (jarnnmarket.com) may need verification in SendGrid
  - System gracefully falls back to mock email with verification links shown in UI

- **Twilio**: Configured with provided credentials. The WhatsApp number (+447449858053) is used for customer support.

---

## Changelog

### January 2026 - Email Verification & Integrations
- Added mandatory email verification for all new users (buyers & sellers)
- Added WhatsApp customer support floating button (+447449858053)
- Added WhatsApp Support link in footer
- Integrated Twilio for SMS (with fallback)
- Integrated SendGrid for email (with fallback)
- Integrated PayPal for payments (with fallback)
- Demo users bypass email verification for testing
- Added verification pending screen with resend option
- Added verify email page

### December 2025 - eBay-style Features
- Added delivery options: Local Pickup, City-to-City, International Shipping
- Added seller subscription plans (5-day, Weekly, Monthly) with NGN/USD pricing
- Added Nigerian Naira (NGN) currency support
- Changed branding from "jarnnmarket" to "Jarnnmarket" (capital J)
- Added quantity and weight fields for listings
- Created Subscription page for sellers
- Added search functionality with filters

### Previous Updates
- Notification bell with real-time updates
- Buy Now Only listings without bidding
- Make Offer feature
- Image quality validation
- Mandatory phone verification
- Seller payout system
- Comprehensive policy pages

## Upcoming Features
- [ ] Delivery tracking integration (AfterShip)
- [ ] Push notifications
- [ ] Admin dashboard
- [ ] Analytics for sellers
