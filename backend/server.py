from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'harvestbid-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

# Stripe config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="HarvestBid API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== MODELS ==================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "buyer"  # buyer or farmer

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: str

class AuctionCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    image_url: Optional[str] = None
    starting_bid: float
    reserve_price: Optional[float] = None
    duration_hours: int = 24

class AuctionResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: str
    category: str
    location: str
    image_url: Optional[str]
    starting_bid: float
    current_bid: float
    reserve_price: Optional[float]
    starts_at: str
    ends_at: str
    is_active: bool
    bid_count: int
    winner_id: Optional[str] = None
    created_at: str

class BidCreate(BaseModel):
    amount: float

class BidResponse(BaseModel):
    id: str
    auction_id: str
    bidder_id: str
    bidder_name: str
    amount: float
    created_at: str

class PaymentCreate(BaseModel):
    auction_id: str
    origin_url: str

# ================== AUTH HELPERS ==================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None

# ================== AUTH ROUTES ==================

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return {
        "user": {
            "id": user_id,
            "name": data.name,
            "email": data.email,
            "role": data.role,
            "created_at": user_doc["created_at"]
        },
        "token": token
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "created_at": user["created_at"]
        },
        "token": token
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"]
    }

# ================== AUCTION ROUTES ==================

@api_router.get("/auctions")
async def get_auctions(
    category: Optional[str] = None,
    location: Optional[str] = None,
    active_only: bool = True,
    limit: int = 50
):
    query = {}
    if category:
        query["category"] = category
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if active_only:
        query["is_active"] = True
        query["ends_at"] = {"$gt": datetime.now(timezone.utc).isoformat()}
    
    auctions = await db.auctions.find(query, {"_id": 0}).sort("ends_at", 1).limit(limit).to_list(limit)
    return auctions

@api_router.get("/auctions/featured")
async def get_featured_auctions(limit: int = 6):
    query = {
        "is_active": True,
        "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    }
    auctions = await db.auctions.find(query, {"_id": 0}).sort("bid_count", -1).limit(limit).to_list(limit)
    return auctions

@api_router.get("/auctions/categories")
async def get_categories():
    categories = [
        {"name": "Vegetables", "image": "https://images.unsplash.com/photo-1669154777196-aca4d45b581a?crop=entropy&cs=srgb&fm=jpg&q=85", "count": 0},
        {"name": "Fruits", "image": "https://images.unsplash.com/photo-1650012048722-c81295ccbe79?crop=entropy&cs=srgb&fm=jpg&q=85", "count": 0},
        {"name": "Grains", "image": "https://images.pexels.com/photos/7843989/pexels-photo-7843989.jpeg", "count": 0},
        {"name": "Dairy", "image": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800", "count": 0},
        {"name": "Organic", "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", "count": 0},
        {"name": "Livestock", "image": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800", "count": 0}
    ]
    
    # Get counts for each category
    for cat in categories:
        count = await db.auctions.count_documents({
            "category": cat["name"],
            "is_active": True,
            "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        cat["count"] = count
    
    return categories

@api_router.post("/auctions")
async def create_auction(data: AuctionCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can create auctions")
    
    auction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(hours=data.duration_hours)
    
    auction_doc = {
        "id": auction_id,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "location": data.location,
        "image_url": data.image_url or "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800",
        "starting_bid": float(data.starting_bid),
        "current_bid": float(data.starting_bid),
        "reserve_price": float(data.reserve_price) if data.reserve_price else None,
        "starts_at": now.isoformat(),
        "ends_at": ends_at.isoformat(),
        "is_active": True,
        "bid_count": 0,
        "winner_id": None,
        "created_at": now.isoformat()
    }
    
    await db.auctions.insert_one(auction_doc)
    return {k: v for k, v in auction_doc.items() if k != "_id"}

@api_router.get("/auctions/{auction_id}")
async def get_auction(auction_id: str):
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction

@api_router.get("/auctions/{auction_id}/bids")
async def get_auction_bids(auction_id: str, limit: int = 20):
    bids = await db.bids.find({"auction_id": auction_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bids

@api_router.post("/auctions/{auction_id}/bids")
async def place_bid(auction_id: str, data: BidCreate, user: dict = Depends(get_current_user)):
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if datetime.fromisoformat(auction["ends_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if auction["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot bid on your own auction")
    
    if data.amount <= auction["current_bid"]:
        raise HTTPException(status_code=400, detail="Bid must be higher than current bid")
    
    bid_id = str(uuid.uuid4())
    bid_doc = {
        "id": bid_id,
        "auction_id": auction_id,
        "bidder_id": user["id"],
        "bidder_name": user["name"],
        "amount": float(data.amount),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bids.insert_one(bid_doc)
    
    # Update auction
    await db.auctions.update_one(
        {"id": auction_id},
        {
            "$set": {"current_bid": float(data.amount), "winner_id": user["id"]},
            "$inc": {"bid_count": 1}
        }
    )
    
    updated_auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    
    return {
        "bid": {k: v for k, v in bid_doc.items() if k != "_id"},
        "auction": updated_auction
    }

# ================== USER ROUTES ==================

@api_router.get("/users/{user_id}/auctions")
async def get_user_auctions(user_id: str):
    auctions = await db.auctions.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return auctions

@api_router.get("/users/me/bids")
async def get_my_bids(user: dict = Depends(get_current_user)):
    bids = await db.bids.find({"bidder_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get associated auctions
    auction_ids = list(set([b["auction_id"] for b in bids]))
    auctions = await db.auctions.find({"id": {"$in": auction_ids}}, {"_id": 0}).to_list(100)
    auctions_map = {a["id"]: a for a in auctions}
    
    for bid in bids:
        bid["auction"] = auctions_map.get(bid["auction_id"])
    
    return bids

@api_router.get("/users/me/won")
async def get_won_auctions(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    auctions = await db.auctions.find({
        "winner_id": user["id"],
        "ends_at": {"$lt": now}
    }, {"_id": 0}).to_list(100)
    return auctions

# ================== PAYMENT ROUTES ==================

@api_router.post("/payments/create-checkout")
async def create_checkout(data: PaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    auction = await db.auctions.find_one({"id": data.auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Only winner can pay
    if auction.get("winner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the auction winner can pay")
    
    # Check if auction ended
    if datetime.fromisoformat(auction["ends_at"]) > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has not ended yet")
    
    # Check if already paid
    existing_payment = await db.payment_transactions.find_one({
        "auction_id": data.auction_id,
        "payment_status": "paid"
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="Already paid for this auction")
    
    # Create Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/payment/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(auction["current_bid"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "auction_id": data.auction_id,
            "user_id": user["id"],
            "auction_title": auction["title"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "session_id": session.session_id,
        "auction_id": data.auction_id,
        "user_id": user["id"],
        "amount": float(auction["current_bid"]),
        "currency": "usd",
        "payment_status": "pending",
        "metadata": {
            "auction_title": auction["title"]
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check with Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment status if changed
        if status.payment_status != payment.get("payment_status"):
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": status.payment_status,
                    "stripe_status": status.status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Mark auction as paid if successful
            if status.payment_status == "paid":
                await db.auctions.update_one(
                    {"id": payment["auction_id"]},
                    {"$set": {"is_paid": True}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert from cents
            "auction_id": payment["auction_id"]
        }
    except Exception as e:
        logger.error(f"Stripe status check failed: {e}")
        return {
            "status": payment.get("stripe_status", "pending"),
            "payment_status": payment.get("payment_status", "pending"),
            "amount": payment["amount"],
            "auction_id": payment["auction_id"]
        }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "event_id": event.event_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Get auction from payment
            payment = await db.payment_transactions.find_one({"session_id": event.session_id})
            if payment:
                await db.auctions.update_one(
                    {"id": payment["auction_id"]},
                    {"$set": {"is_paid": True}}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

# ================== STATS ROUTES ==================

@api_router.get("/stats")
async def get_stats():
    total_auctions = await db.auctions.count_documents({})
    active_auctions = await db.auctions.count_documents({
        "is_active": True,
        "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    total_users = await db.users.count_documents({})
    total_bids = await db.bids.count_documents({})
    
    return {
        "total_auctions": total_auctions,
        "active_auctions": active_auctions,
        "total_users": total_users,
        "total_bids": total_bids
    }

# ================== SEED DATA ==================

@api_router.post("/seed")
async def seed_data():
    """Seed demo data for testing"""
    
    # Check if data exists
    existing = await db.auctions.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # Create demo farmers
    farmers = [
        {"id": str(uuid.uuid4()), "name": "John Mwangi", "email": "john@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sarah Ochieng", "email": "sarah@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peter Kamau", "email": "peter@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(farmers)
    
    # Create demo buyer
    buyer = {"id": str(uuid.uuid4()), "name": "Demo Buyer", "email": "buyer@demo.com", "password_hash": hash_password("password123"), "role": "buyer", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(buyer)
    
    # Create demo auctions
    now = datetime.now(timezone.utc)
    demo_auctions = [
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[0]["id"],
            "seller_name": farmers[0]["name"],
            "title": "Fresh Organic Tomatoes - 50kg",
            "description": "Premium quality organic tomatoes, freshly harvested from our farm. Perfect for restaurants and markets.",
            "category": "Vegetables",
            "location": "Nairobi, Kenya",
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800",
            "starting_bid": 50.00,
            "current_bid": 75.00,
            "reserve_price": 100.00,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=12)).isoformat(),
            "is_active": True,
            "bid_count": 5,
            "winner_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[1]["id"],
            "seller_name": farmers[1]["name"],
            "title": "Premium Mangoes - 100kg Batch",
            "description": "Sweet and juicy mangoes, perfect ripeness. Ideal for export quality requirements.",
            "category": "Fruits",
            "location": "Mombasa, Kenya",
            "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
            "starting_bid": 120.00,
            "current_bid": 180.00,
            "reserve_price": 200.00,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=24)).isoformat(),
            "is_active": True,
            "bid_count": 8,
            "winner_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[2]["id"],
            "seller_name": farmers[2]["name"],
            "title": "Organic Maize - 1 Tonne",
            "description": "High quality organic maize, perfect for milling or animal feed. Certified organic.",
            "category": "Grains",
            "location": "Nakuru, Kenya",
            "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800",
            "starting_bid": 300.00,
            "current_bid": 350.00,
            "reserve_price": 400.00,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=48)).isoformat(),
            "is_active": True,
            "bid_count": 3,
            "winner_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[0]["id"],
            "seller_name": farmers[0]["name"],
            "title": "Fresh Avocados - 200 pieces",
            "description": "Hass avocados, export quality. Perfect for guacamole and salads.",
            "category": "Fruits",
            "location": "Kiambu, Kenya",
            "image_url": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800",
            "starting_bid": 80.00,
            "current_bid": 95.00,
            "reserve_price": None,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=6)).isoformat(),
            "is_active": True,
            "bid_count": 4,
            "winner_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[1]["id"],
            "seller_name": farmers[1]["name"],
            "title": "Organic Spinach - 30kg Fresh",
            "description": "Freshly harvested organic spinach, pesticide-free. Great for healthy cooking.",
            "category": "Vegetables",
            "location": "Nairobi, Kenya",
            "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800",
            "starting_bid": 25.00,
            "current_bid": 35.00,
            "reserve_price": None,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=8)).isoformat(),
            "is_active": True,
            "bid_count": 6,
            "winner_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[2]["id"],
            "seller_name": farmers[2]["name"],
            "title": "Fresh Milk - 500 Liters Daily",
            "description": "Farm fresh milk, pasteurized and ready for distribution. Weekly contract available.",
            "category": "Dairy",
            "location": "Eldoret, Kenya",
            "image_url": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800",
            "starting_bid": 200.00,
            "current_bid": 250.00,
            "reserve_price": 280.00,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(hours=36)).isoformat(),
            "is_active": True,
            "bid_count": 2,
            "winner_id": None,
            "created_at": now.isoformat()
        }
    ]
    
    await db.auctions.insert_many(demo_auctions)
    
    return {"message": "Seeded successfully", "auctions": len(demo_auctions), "users": len(farmers) + 1}

# Basic health check
@api_router.get("/")
async def root():
    return {"message": "HarvestBid API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
