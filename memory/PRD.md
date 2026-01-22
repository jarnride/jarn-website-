# jarnnmarket - Farmers Auction Platform PRD

## Original Problem Statement
Build a Farmers Auction Platform with features including:
- Hero Banner, Upcoming Auctions Carousel, Categories Grid
- Product Listings with Filters (Category, Price, Location)
- Auction Detail page with Countdown Timer
- Real-time bidding with WebSocket updates
- User Authentication (JWT)
- Stripe Payment integration
- Buy It Now option
- Image upload for auctions
- Security improvements

## User Personas
1. **Farmers (Sellers)**: List agricultural products for auction
2. **Buyers**: Browse and bid on produce auctions

## Core Requirements
- Real-time auction countdown timers
- JWT-based authentication with role-based access (farmer/buyer)
- Stripe payments for winning bidders
- WebSocket for instant bid updates
- Buy Now instant purchase option
- Image upload for auction products

## What's Been Implemented

### Phase 1 (Dec 2025) - COMPLETE
- [x] WebSocket real-time bid updates (socket.io)
- [x] Buy It Now option with instant purchase
- [x] Image upload for auctions (base64 in MongoDB)
- [x] Duplicate email prevention
- [x] Security improvements:
  - Rate limiting (slowapi): 5/min register, 10/min login, 30/min bids
  - Input validation with Pydantic validators
  - bcrypt password hashing
  - Sanitized user inputs

### Backend (FastAPI + MongoDB)
- [x] User authentication (register, login, JWT tokens)
- [x] Auction CRUD with buy_now_price support
- [x] Bidding system with WebSocket broadcast
- [x] Buy Now checkout flow
- [x] Image upload endpoint (/api/upload/image)
- [x] Stripe checkout integration
- [x] Rate limiting on all sensitive endpoints
- [x] Input validation and sanitization

### Frontend (React + Tailwind + Shadcn UI)
- [x] jarnnmarket branding (renamed from HarvestBid)
- [x] Buy Now badges on auction cards
- [x] Buy Now section on auction detail page
- [x] Image upload in create auction (file upload + URL + samples)
- [x] WebSocket connection for real-time bid updates
- [x] Toast notifications for new bids
- [x] Updated contact info for Nigeria

## Prioritized Backlog

### P0 - Phase 1 Done ✓
- WebSocket for real-time bid updates
- Buy It Now option
- Image upload for auctions
- Duplicate email prevention
- Security improvements (rate-limiting, input validation)

### P1 - Phase 2 (Next)
- PayPal payment integration
- SMS verification via Twilio (buyer/seller)
- SMS notifications for high-value bids
- Escrow system for payments

### P2 - Phase 3 (Later)
- Email notifications (bid events)
- Seller ratings/reviews system

### P3 - Phase 4 (DevOps)
- Unit & integration tests
- Docker deployment

## Demo Credentials
- Farmer: john@farm.com / password123
- Buyer: buyer@demo.com / password123

## Contact Info
- Email: info@jarnnmarket.com
- Phone: +2348189275367
- Location: Abia State, Nigeria
