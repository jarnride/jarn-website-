# Jarnnmarket - Farmers Auction Platform

## Overview
A full-stack auction platform connecting farmers directly with buyers through real-time auctions, featuring escrow-protected payments, multi-currency support, and comprehensive buyer/seller policies.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Payments:** Stripe (integrated), PayPal (sandbox mode)
- **Email:** SendGrid (configured)
- **SMS:** Twilio (configured)
- **Real-time:** WebSockets (socket.io)
- **Authentication:** JWT
- **Mobile:** PWA (Progressive Web App)

## Core Features

### Checkout & Delivery Options ✨ NEW
- [x] **Delivery selection at checkout** - Buyers choose from seller's delivery options
- [x] **Delivery address input** - Required for non-local pickup options
- [x] **Delivery cost calculation** - Added to total at checkout
- [x] **Multiple delivery types**:
  - Local Pickup (FREE)
  - City-to-City Delivery
  - International Shipping

### Multi-Currency Support ✨ ENHANCED
- [x] **USD ($)** - US Dollars
- [x] **NGN (₦)** - Nigerian Naira
- [x] **Currency display at checkout** - Shows correct symbol and currency code
- [x] **Currency in payment processing** - Stripe/PayPal use auction currency

### Seller Reviews ✨ NEW
- [x] **Review on delivery confirmation** - Buyers can rate sellers (1-5 stars)
- [x] **Review comments** - Optional feedback text (up to 1000 chars)
- [x] **Seller rating aggregation** - Average rating calculated automatically
- [x] **Reviews display on auction page** - Shows seller's review history
- [x] **Review notification** - Seller notified of new reviews

### Authentication & Verification
- [x] Email verification (MANDATORY)
- [x] Phone verification (MANDATORY)
- [x] Admin user support

### Seller Verification Badge
- [x] Verified badge for trusted sellers
- [x] Admin can verify/unverify sellers

### Admin Dashboard
- [x] User management with bulk operations
- [x] Auction management
- [x] Payout management with bulk approve/reject
- [x] Data export (JSON/CSV)

### Seller Analytics
- [x] Revenue and performance metrics
- [x] Conversion rate tracking
- [x] Rating display

### Customer Support
- [x] WhatsApp Support (+447449858053)
- [x] Help Center / FAQ
- [x] Email and phone contact

### Payment & Escrow
- [x] Stripe and PayPal integration
- [x] Escrow protection
- [x] Seller payouts

## API Endpoints

### Checkout & Delivery
- `POST /api/auctions/{id}/buy-now` - Buy now with delivery option selection
  - Body: `{ origin_url, payment_method, delivery_option, delivery_address }`
  - Returns: Stripe/PayPal checkout URL with delivery cost included

### Reviews
- `GET /api/users/{user_id}/reviews` - Get seller's reviews
- `POST /api/escrow/confirm-delivery` - Confirm delivery with optional review
  - Body: `{ escrow_id, rating (1-5), review_comment }`

### Currency Support
- All prices displayed in auction's currency (USD or NGN)
- Payment processors handle currency conversion

## Database Schema Updates

### auctions collection
- `currency`: "USD" | "NGN"
- `delivery_options`: Array of { type, cost, estimated_days }
- `order_details`: { delivery_option, delivery_address, delivery_cost, item_price, total_amount, currency }

### reviews collection
- `id`, `auction_id`, `seller_id`
- `reviewer_id`, `reviewer_name`
- `rating` (1-5), `comment`
- `created_at`

## Test Credentials
- **Farmer:** john@farm.com / password123
- **Buyer:** buyer@demo.com / password123
- **Admin:** admin@jarnnmarket.com, info@jarnnmarket.com

---

## Changelog

### January 2026 - Delivery Options, Currency & Reviews
- Added delivery option selection at checkout
- Added delivery address input for shipping options
- Added delivery cost calculation in checkout totals
- Enhanced currency support with proper symbols (₦ for NGN, $ for USD)
- Added seller review system integrated with delivery confirmation
- Added star rating (1-5) on delivery confirmation
- Added optional review comments
- Added reviews display on auction detail page
- Updated payment processing to use auction currency

### Previous Updates
- Seller Verification Badge
- Admin Dashboard with bulk operations
- Data exports (JSON/CSV)
- Mobile PWA support
- Help Center / FAQ
- Email/Phone verification
- Search & filters
- Multi-currency listing

## All Features Complete ✅
All requested features have been implemented and tested.
