# Jarnnmarket - Farmers Auction Platform

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
- [x] **Buy Now Only option** - Disables bidding entirely, shows only fixed price
- [x] **Accepts Offers option** - Allows buyers to make offers
- [x] Real-time bidding via WebSockets
- [x] Buy Now instant purchase
- [x] Auction countdown timer
- [x] Category filtering
- [x] Search functionality

### NEW: Delivery Options
- [x] **Local Pickup** - Free pickup from seller location
- [x] **City-to-City Delivery** - Delivery within Nigeria (2-5 days)
- [x] **International Shipping** - Worldwide delivery (7-21 days)
- [x] Ship-from location configuration

### NEW: Quantity & Weight
- [x] Quantity field (1-10,000 units)
- [x] Weight field with unit selection (kg, lb, g)

### NEW: Multi-Currency Support
- [x] **USD ($)** - US Dollars
- [x] **NGN (₦)** - Nigerian Naira
- [x] Currency selection during listing creation

### NEW: Seller Subscription Plans
- [x] **5-Day Plan** - $4.99 / ₦7,500
  - Up to 10 listings
  - Basic analytics
  - Email support
- [x] **Weekly Plan** - $6.99 / ₦10,500
  - Up to 25 listings
  - Advanced analytics
  - Priority support
  - Featured listings
- [x] **Monthly Plan** - $19.99 / ₦30,000
  - Unlimited listings
  - Full analytics
  - 24/7 support
  - Featured listings
  - Promotional tools
  - Verified seller badge

### Notifications System
- [x] Real-time notification bell in navbar (desktop & mobile)
- [x] Notifications for sellers: new offers, escrow held, payouts ready
- [x] Notifications for buyers: offer responses, won auctions, delivery confirmations, outbid alerts
- [x] Notification count badge with animation
- [x] Auto-refresh every 30 seconds

### Offers System
- [x] Buyers can make offers on listings that accept offers
- [x] Sellers can view, accept, or reject offers
- [x] Accepted offers mark auction as sold
- [x] Email notifications for offer updates (MOCKED)

### Payment & Escrow
- [x] Stripe payment integration
- [x] PayPal payment option (MOCKED)
- [x] Escrow system - funds held until delivery confirmation
- [x] Payout system - Sellers request payout after escrow release (MOCKED)
- [x] Delivery confirmation by buyer releases funds

### Policies & Legal
- [x] Terms & Conditions
- [x] Privacy Policy
- [x] Return & Refund Policy
- [x] Seller Guidelines
- [x] Buyer Guidelines

## API Endpoints

### Subscriptions (NEW)
- `GET /api/subscriptions/plans` - Get all subscription plans
- `GET /api/users/me/subscription` - Get current subscription
- `POST /api/subscriptions/subscribe` - Subscribe to a plan
- `POST /api/subscriptions/cancel` - Cancel subscription

### Auctions (Updated)
- `POST /api/auctions` - Now accepts: currency, quantity, weight, weight_unit, delivery_options, shipping_from

## Database Collections
- `users` - User accounts with phone verification status
- `auctions` - Listings with delivery options, currency, quantity, weight
- `subscriptions` - Seller subscription records (NEW)
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

## Mocked Services
- Phone SMS verification
- PayPal payments
- Email notifications
- Payout processing
- Subscription payments

---

## Changelog

### December 2025 - eBay-style Features
- Added delivery options: Local Pickup, City-to-City, International Shipping
- Added seller subscription plans (5-day, Weekly, Monthly) with NGN/USD pricing
- Added Nigerian Naira (NGN) currency support
- Changed branding from "jarnnmarket" to "Jarnnmarket" (capital J)
- Added quantity and weight fields for listings
- Created Subscription page for sellers

### Previous Updates
- Notification bell with real-time updates
- Buy Now Only listings without bidding
- Make Offer feature
- Image quality validation
- Mandatory phone verification
- Seller payout system
- Comprehensive policy pages
