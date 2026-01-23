# Jarnnmarket - Farmers Auction Platform

## Overview
A full-stack auction platform connecting farmers directly with buyers through real-time auctions, featuring escrow-protected payments, email and phone verification, and comprehensive buyer/seller policies.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Payments:** Stripe (integrated), PayPal (integrated with sandbox mode)
- **Email:** SendGrid (configured - needs sender verification)
- **SMS:** Twilio (configured)
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
- [x] **Help Center / FAQ** - Comprehensive help page with searchable FAQs

### Admin Dashboard
- [x] **Admin-only access** - Restricted to admin@jarnnmarket.com, info@jarnnmarket.com
- [x] **User management** - View all users, toggle user status
- [x] **Auction management** - View all auctions with seller details
- [x] **Payout management** - Approve/reject seller payouts
- [x] **Platform statistics** - Total users, auctions, escrow, revenue

### Seller Analytics
- [x] **Analytics tab in seller dashboard** - Only visible to farmers
- [x] **Revenue metrics** - Total revenue, average sale price
- [x] **Performance metrics** - Conversion rate, views, bids
- [x] **Listing stats** - Active listings, completed sales
- [x] **Top categories** - Category breakdown of listings
- [x] **Tips for sellers** - Guidance to improve sales

### Auction Management
- [x] Create auctions with images
- [x] **Image quality validation** (min 400x300px, min 20KB)
- [x] **Buy Now Only option** - Disables bidding entirely
- [x] **Accepts Offers option** - Allows buyers to make offers
- [x] Real-time bidding via WebSockets
- [x] Buy Now instant purchase
- [x] Auction countdown timer
- [x] Category filtering
- [x] Search functionality with filters

### Delivery Options
- [x] **Local Pickup** - Free pickup from seller location
- [x] **City-to-City Delivery** - Delivery within Nigeria (2-5 days)
- [x] **International Shipping** - Worldwide delivery (7-21 days)

### Multi-Currency Support
- [x] **USD ($)** - US Dollars
- [x] **NGN (₦)** - Nigerian Naira

### Seller Subscription Plans
- [x] **5-Day Plan** - $4.99 / ₦7,500
- [x] **Weekly Plan** - $6.99 / ₦10,500
- [x] **Monthly Plan** - $19.99 / ₦30,000

### Notifications System
- [x] Real-time notification bell in navbar
- [x] Notifications for sellers and buyers

### Payment & Escrow
- [x] Stripe payment integration
- [x] PayPal payment integration (sandbox mode)
- [x] Escrow system - funds held until delivery confirmation
- [x] Payout system - Sellers request payout after escrow release

### Help Center
- [x] **Searchable FAQ** - Find answers quickly
- [x] **Category filters** - Buying, Selling, Payments, Delivery, Account, Security
- [x] **Contact options** - WhatsApp, Email, Phone
- [x] **Quick links** - Direct access to policies

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email verification required
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/login` - Login (blocked for unverified users)

### Admin (Restricted)
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - All users list
- `GET /api/admin/auctions` - All auctions with seller names
- `GET /api/admin/payouts` - All payout requests
- `POST /api/admin/payouts/{id}/approve` - Approve payout
- `POST /api/admin/payouts/{id}/reject` - Reject payout
- `POST /api/admin/users/{id}/toggle-status` - Enable/disable user

### Seller Analytics
- `GET /api/sellers/me/analytics` - Seller performance metrics

## Integration Status

| Service | Status | Notes |
|---------|--------|-------|
| Stripe | ✅ Active | Test mode |
| Twilio SMS | ✅ Configured | API keys provided |
| SendGrid Email | ⚠️ Pending | Needs sender verification for info@jarnnmarket.com |
| PayPal | ✅ Configured | Sandbox mode |

## Contact Information
- Email: info@jarnnmarket.com
- Phone: +2348189275367
- WhatsApp: +447449858053
- Location: Abia State, Nigeria

---

## Changelog

### January 2026 - Admin Dashboard, Analytics & Help Center
- Added Admin Dashboard with user/auction/payout management
- Added Seller Analytics with revenue and performance metrics
- Added Help Center with searchable FAQ and category filters
- Added Help link in navbar and footer
- Admin access restricted to specific email addresses

### January 2026 - Email Verification & Integrations
- Added mandatory email verification for all new users
- Added WhatsApp customer support floating button
- Integrated Twilio for SMS
- Integrated SendGrid for email (pending sender verification)
- Integrated PayPal for payments

### December 2025 - eBay-style Features
- Added delivery options
- Added seller subscription plans
- Added Nigerian Naira currency support
- Added quantity and weight fields
- Added search functionality

## Test Credentials
- **Farmer:** john@farm.com / password123
- **Buyer:** buyer@demo.com / password123
- **Admin Emails:** admin@jarnnmarket.com, info@jarnnmarket.com

## Upcoming Features
- [ ] Create admin user accounts
- [ ] Delivery tracking integration (AfterShip)
- [ ] Push notifications
- [ ] Complete SendGrid sender verification
