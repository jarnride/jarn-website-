# jarnnmarket - Farmers Auction Platform

## Overview
A full-stack auction platform connecting farmers directly with buyers through real-time auctions, featuring escrow-protected payments, phone verification, and comprehensive buyer/seller policies.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Payments:** Stripe (integrated), PayPal (MOCKED)
- **Real-time:** WebSockets (socket.io)
- **Authentication:** JWT

## Core Features

### Authentication & Verification
- [x] User registration (Farmer/Buyer roles)
- [x] JWT-based authentication
- [x] **Phone verification (MANDATORY)** - Required for bidding/listing
- [x] Phone verification via SMS (MOCKED)

### Auction Management
- [x] Create auctions with images
- [x] **Image quality validation** (min 400x300px, min 20KB)
- [x] **Buy Now Only option** - Disables bidding entirely
- [x] **Accepts Offers option** - Allows buyers to make offers
- [x] Real-time bidding via WebSockets
- [x] Buy Now instant purchase
- [x] Auction countdown timer
- [x] Category filtering
- [x] Search functionality

### Offers System (NEW)
- [x] Buyers can make offers on listings that accept offers
- [x] Sellers can view, accept, or reject offers
- [x] Accepted offers mark auction as sold
- [x] Email notifications for offer updates (MOCKED)

### Payment & Escrow
- [x] Stripe payment integration
- [x] PayPal payment option (MOCKED)
- [x] Escrow system - funds held until delivery confirmation
- [x] **Payout system** - Sellers request payout after escrow release (MOCKED)
- [x] Delivery confirmation by buyer releases funds

### Policies & Legal
- [x] **Terms & Conditions**
- [x] **Privacy Policy**
- [x] **Return & Refund Policy**
- [x] **Seller Guidelines**
- [x] **Buyer Guidelines**

### Dashboard Features
- [x] Farmer dashboard: Active auctions, ended auctions, escrows, offers, payouts
- [x] Buyer dashboard: Bids, won auctions, offers, delivery confirmations
- [x] Phone verification status
- [x] Escrow balance tracking

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/phone/send-code`
- `POST /api/auth/phone/verify`

### Auctions
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/featured` - Featured auctions
- `GET /api/auctions/categories` - Categories
- `POST /api/auctions` - Create auction
- `GET /api/auctions/{id}` - Get auction details
- `POST /api/auctions/{id}/bids` - Place bid
- `POST /api/auctions/{id}/buy` - Buy Now

### Offers (NEW)
- `POST /api/auctions/{id}/offers` - Make offer
- `GET /api/auctions/{id}/offers` - Get auction offers (seller only)
- `POST /api/offers/{id}/respond` - Accept/reject offer
- `GET /api/users/me/offers` - Get my offers

### Payments & Escrow
- `POST /api/payments/stripe/create-session`
- `GET /api/payments/stripe/verify-session`
- `POST /api/payments/paypal/create-order` (MOCKED)
- `GET /api/users/me/escrows`
- `POST /api/escrow/confirm-delivery`

### Payouts (NEW)
- `GET /api/users/me/payouts`
- `POST /api/payouts/request`

### Images
- `POST /api/upload/image` - Upload with quality validation
- `GET /api/images/{id}` - Retrieve image

## Database Collections
- `users` - User accounts with phone verification status
- `auctions` - Listings with buy_now_only and accepts_offers flags
- `bids` - Bid history
- `offers` - Make offer submissions
- `escrow` - Payment escrow records
- `payouts` - Seller payout history
- `reviews` - Seller ratings
- `images` - Uploaded images

## Contact Information
- Email: info@jarnnmarket.com
- Phone: +2348189275367
- Location: Abia State, Nigeria

## Test Credentials
- Farmer: john@farm.com / password123
- Buyer: buyer@demo.com / password123

## Mocked Services
- Phone SMS verification
- PayPal payments
- Email notifications
- Payout processing

---

## Changelog

### December 2025 - Phase 3 Complete
- Added image quality validation (400x300px min, 20KB min)
- Added Buy Now Only listing option
- Added Make Offer feature
- Made phone verification mandatory (cannot skip)
- Added seller payout system
- Added comprehensive policy pages (Terms, Privacy, Returns, Seller, Buyer)
- Updated Dashboard with Offers and Payouts tabs
- Added footer links to policy pages

### Previous Updates
- Phase 1: WebSocket real-time bidding, Buy Now feature, image uploads
- Phase 2: Phone verification (mock), PayPal (mock), Escrow system (mock)
- MVP: Core auction platform with Stripe payments

## Future Tasks
- Replace mock services with real integrations:
  - Twilio SMS for phone verification
  - PayPal SDK for payments
  - SendGrid/Resend for email notifications
  - Real bank transfer for payouts
- Security hardening:
  - bcrypt password hashing
  - Input validation
  - Rate limiting (partially implemented)
- Unit and integration tests
- Seller ratings/reviews UI completion
