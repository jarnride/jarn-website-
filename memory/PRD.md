# HarvestBid - Farmers Auction Platform PRD

## Original Problem Statement
Build a Farmers Auction Platform with features including:
- Hero Banner with "Sell Your Produce Today"
- Upcoming Auctions Carousel
- Categories Grid
- Success Stories
- Product Listings with Filters (Category, Price, Location)
- Auction Detail page with Countdown Timer
- Current Bid, Bid Input, Bid History
- Real-time bidding updates
- User Authentication (JWT)
- Stripe Payment integration for auction winners

## User Personas
1. **Farmers (Sellers)**: List agricultural products for auction
2. **Buyers**: Browse and bid on produce auctions

## Core Requirements
- Real-time auction countdown timers
- JWT-based authentication with role-based access (farmer/buyer)
- Stripe payments for winning bidders
- Category filtering and search
- Mobile-responsive design

## What's Been Implemented (Dec 2025)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register, login, JWT tokens)
- [x] Auction CRUD operations
- [x] Bidding system with validation
- [x] Stripe checkout integration for payments
- [x] Payment transaction tracking
- [x] Demo data seeding endpoint
- [x] Statistics endpoint

### Frontend (React + Tailwind + Shadcn UI)
- [x] Home page with hero, stats, featured auctions carousel, categories, testimonials
- [x] Auctions listing with filters (category, location) and sorting
- [x] Auction detail page with countdown timer, bid interface, bid history
- [x] Authentication (login/register with role selection)
- [x] Dashboard for farmers (manage auctions) and buyers (track bids)
- [x] Create auction page (farmers only)
- [x] Payment success/cancel pages
- [x] Responsive design with Organic & Earthy theme

### Design System
- Font: Playfair Display (headings), Inter (body), JetBrains Mono (data)
- Colors: Forest Green primary (#1A4D2E), Harvest Gold accent (#F9A825)
- Mobile-first responsive layout

## Prioritized Backlog

### P0 - Done
- Core auction functionality
- Authentication
- Bidding
- Stripe payments

### P1 - Next
- WebSocket real-time updates (currently using polling)
- Email notifications on auction events
- Image upload for auction listings
- Seller ratings and reviews

### P2 - Later
- Advanced search with keywords
- Auction scheduling (start later)
- Bulk auction creation
- Mobile app

## Next Tasks
1. Add WebSocket support for instant bid updates
2. Implement email notifications (Resend or SendGrid)
3. Add image upload for auction products
4. User reviews and ratings system
