# Jarnnmarket - Farmers Auction Platform

## Overview
A full-stack auction platform connecting farmers directly with buyers through real-time auctions, featuring escrow-protected payments, email and phone verification, and comprehensive buyer/seller policies.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Payments:** Stripe (integrated), PayPal (sandbox mode)
- **Email:** SendGrid (configured - needs sender verification)
- **SMS:** Twilio (configured)
- **Real-time:** WebSockets (socket.io)
- **Authentication:** JWT
- **Mobile:** PWA (Progressive Web App)

## Core Features

### Authentication & Verification
- [x] User registration (Farmer/Buyer/Admin roles)
- [x] JWT-based authentication
- [x] **Email verification (MANDATORY)**
- [x] **Phone verification (MANDATORY)**
- [x] Admin user support (admin@jarnnmarket.com)

### Seller Verification Badge ✨ NEW
- [x] **Verified badge** - Blue shield icon for verified sellers
- [x] **Admin verification** - Admins can verify/unverify sellers
- [x] **Badge display** - Shows on auction cards and profiles
- [x] **Trust indicator** - Builds buyer confidence

### Admin Dashboard
- [x] **User management** - View, activate/deactivate, verify sellers
- [x] **Auction management** - View all auctions
- [x] **Payout management** - Approve/reject payouts
- [x] **Platform statistics** - Users, auctions, escrow, revenue

### Bulk Operations ✨ NEW
- [x] **Bulk user actions** - Activate, deactivate, verify multiple users
- [x] **Bulk payout actions** - Approve, reject multiple payouts
- [x] **Selection UI** - Checkbox selection with action bar

### Advanced Reporting & Exports ✨ NEW
- [x] **Export Users** - JSON and CSV format
- [x] **Export Auctions** - JSON and CSV format
- [x] **Export Transactions** - Escrow + Payouts in JSON/CSV
- [x] **Download files** - Automatic file download with date-stamped names

### Mobile App (PWA) ✨ NEW
- [x] **Progressive Web App** - Install on mobile/desktop
- [x] **Standalone mode** - Full-screen app experience
- [x] **App shortcuts** - Quick access to Auctions, Dashboard, Help
- [x] **Theme color** - Jarnnmarket green (#16a34a)
- [x] **Offline capable** - Service worker ready

### Customer Support
- [x] **WhatsApp Support** - Floating button (+447449858053)
- [x] **Help Center / FAQ** - Searchable FAQs with categories
- [x] **Contact options** - WhatsApp, Email, Phone

### Seller Analytics
- [x] **Revenue metrics** - Total revenue, avg sale price
- [x] **Performance metrics** - Conversion rate, views, bids
- [x] **Listing stats** - Active listings, completed sales

### Auction Management
- [x] Create auctions with images
- [x] **Buy Now Only option**
- [x] **Accepts Offers option**
- [x] Real-time bidding via WebSockets
- [x] Search with filters

### Multi-Currency & Delivery
- [x] **USD ($)** and **NGN (₦)** support
- [x] **Delivery options** - Local Pickup, City-to-City, International

### Payment & Escrow
- [x] Stripe integration
- [x] PayPal integration (sandbox)
- [x] Escrow protection
- [x] Seller payouts

## API Endpoints

### Admin (Restricted)
- `POST /api/admin/users/{id}/verify` - Verify seller
- `POST /api/admin/users/{id}/unverify` - Remove verification
- `POST /api/admin/bulk/users?action=X&user_ids=X,Y,Z` - Bulk user actions
- `POST /api/admin/bulk/payouts?action=X&payout_ids=X,Y,Z` - Bulk payout actions
- `GET /api/admin/export/users?format=json|csv` - Export users
- `GET /api/admin/export/auctions?format=json|csv` - Export auctions
- `GET /api/admin/export/transactions?format=json|csv` - Export transactions

### Seller Analytics
- `GET /api/sellers/me/analytics` - Seller performance metrics

## Integration Status

| Service | Status | Notes |
|---------|--------|-------|
| Stripe | ✅ Active | Test mode |
| Twilio SMS | ✅ Configured | API keys provided |
| SendGrid Email | ⚠️ Pending | Needs sender verification |
| PayPal | ✅ Configured | Sandbox mode |

## Test Credentials
- **Farmer:** john@farm.com / password123
- **Buyer:** buyer@demo.com / password123
- **Admin:** admin@jarnnmarket.com / AdminPass123!

## PWA Installation
1. Visit the site on mobile browser
2. Tap "Add to Home Screen" or install prompt
3. App will be available as standalone app

---

## Changelog

### January 2026 - Seller Verification, Bulk Ops, Exports, PWA
- Added Seller Verification Badge (blue shield icon)
- Added Admin verify/unverify seller endpoints
- Added Bulk operations for users and payouts
- Added Data export to JSON and CSV formats
- Added PWA manifest for mobile app installation
- Added seller_verified field to auction API responses
- Fixed bulk operations to use query params
- Fixed CSV export for records with different fields

### January 2026 - Admin Dashboard, Analytics & Help Center
- Added Admin Dashboard
- Added Seller Analytics
- Added Help Center with FAQ

### January 2026 - Email Verification & Integrations
- Added mandatory email verification
- Integrated Twilio, SendGrid, PayPal

## All Features Complete ✅
- Seller Verification Badge
- Mobile App (PWA)
- Advanced Reporting & Exports
- Bulk Operations in Admin
- Admin Dashboard
- Seller Analytics
- Help Center
- Email/Phone Verification
- Search & Filters
- Multi-currency
- Delivery Options
