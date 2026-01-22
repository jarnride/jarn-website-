from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import base64
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
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
JWT_SECRET = os.environ.get('JWT_SECRET', 'jarnnmarket-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

# Stripe config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# Create the main FastAPI app
app = FastAPI(title="jarnnmarket API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== VALIDATION HELPERS ==================

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password(password: str) -> bool:
    # At least 6 characters
    return len(password) >= 6

def sanitize_string(value: str) -> str:
    # Remove potential XSS characters
    return re.sub(r'[<>"\']', '', value.strip())

# ================== MODELS ==================

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="buyer", pattern="^(buyer|farmer)$")
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v):
        return sanitize_string(v)

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
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(default="", max_length=2000)
    category: str = Field(..., min_length=2, max_length=50)
    location: str = Field(default="", max_length=100)
    image_url: Optional[str] = None
    starting_bid: float = Field(..., gt=0)
    buy_now_price: Optional[float] = Field(default=None, gt=0)
    reserve_price: Optional[float] = Field(default=None, gt=0)
    duration_hours: int = Field(default=24, ge=1, le=168)
    
    @field_validator('title', 'description', 'category', 'location')
    @classmethod
    def sanitize_fields(cls, v):
        return sanitize_string(v) if v else v

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
    buy_now_price: Optional[float]
    reserve_price: Optional[float]
    starts_at: str
    ends_at: str
    is_active: bool
    bid_count: int
    winner_id: Optional[str] = None
    created_at: str

class BidCreate(BaseModel):
    amount: float = Field(..., gt=0)

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

class BuyNowRequest(BaseModel):
    origin_url: str

class ImageUploadResponse(BaseModel):
    url: str
    filename: str

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

# ================== SOCKET.IO EVENTS ==================

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_auction(sid, auction_id):
    await sio.enter_room(sid, f"auction_{auction_id}")
    logger.info(f"Client {sid} joined auction room: {auction_id}")

@sio.event
async def leave_auction(sid, auction_id):
    await sio.leave_room(sid, f"auction_{auction_id}")
    logger.info(f"Client {sid} left auction room: {auction_id}")

async def broadcast_bid_update(auction_id: str, bid: dict, auction: dict):
    """Broadcast bid update to all clients in the auction room"""
    await sio.emit('bid_update', {
        'auction_id': auction_id,
        'bid': bid,
        'current_bid': auction['current_bid'],
        'bid_count': auction['bid_count']
    }, room=f"auction_{auction_id}")

async def broadcast_auction_sold(auction_id: str, auction: dict, buyer_name: str):
    """Broadcast when auction is sold via Buy Now"""
    await sio.emit('auction_sold', {
        'auction_id': auction_id,
        'final_price': auction['current_bid'],
        'buyer_name': buyer_name
    }, room=f"auction_{auction_id}")

# ================== AUTH ROUTES ==================

@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate):
    # Check for duplicate email
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password strength
    if not validate_password(data.password):
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email.lower(),  # Store lowercase for consistency
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
            "email": data.email.lower(),
            "role": data.role,
            "created_at": user_doc["created_at"]
        },
        "token": token
    }

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
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

# ================== IMAGE UPLOAD ==================

@api_router.post("/upload/image", response_model=ImageUploadResponse)
@limiter.limit("10/minute")
async def upload_image(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Read file and check size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 5MB")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    
    # Store as base64 in MongoDB (for simplicity - in production use S3/CloudStorage)
    base64_data = base64.b64encode(content).decode()
    
    image_doc = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "content_type": file.content_type,
        "data": base64_data,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.images.insert_one(image_doc)
    
    # Return URL that can be used to fetch the image
    return {
        "url": f"/api/images/{image_doc['id']}",
        "filename": filename
    }

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    from fastapi.responses import Response
    
    image = await db.images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    content = base64.b64decode(image["data"])
    return Response(content=content, media_type=image["content_type"])

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
    
    for cat in categories:
        count = await db.auctions.count_documents({
            "category": cat["name"],
            "is_active": True,
            "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        cat["count"] = count
    
    return categories

@api_router.post("/auctions")
@limiter.limit("10/minute")
async def create_auction(request: Request, data: AuctionCreate, user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can create auctions")
    
    # Validate buy_now_price is higher than starting_bid
    if data.buy_now_price and data.buy_now_price <= data.starting_bid:
        raise HTTPException(status_code=400, detail="Buy Now price must be higher than starting bid")
    
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
        "buy_now_price": float(data.buy_now_price) if data.buy_now_price else None,
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
@limiter.limit("30/minute")
async def place_bid(request: Request, auction_id: str, data: BidCreate, user: dict = Depends(get_current_user)):
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
    
    # Broadcast bid update via WebSocket
    await broadcast_bid_update(auction_id, {k: v for k, v in bid_doc.items() if k != "_id"}, updated_auction)
    
    return {
        "bid": {k: v for k, v in bid_doc.items() if k != "_id"},
        "auction": updated_auction
    }

# ================== BUY NOW ==================

@api_router.post("/auctions/{auction_id}/buy-now")
@limiter.limit("10/minute")
async def buy_now(request: Request, auction_id: str, data: BuyNowRequest, user: dict = Depends(get_current_user)):
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if datetime.fromisoformat(auction["ends_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if auction["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own auction")
    
    if not auction.get("buy_now_price"):
        raise HTTPException(status_code=400, detail="This auction does not have a Buy Now option")
    
    # Create Stripe checkout for Buy Now price
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/payment/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(auction["buy_now_price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "auction_id": auction_id,
            "user_id": user["id"],
            "auction_title": auction["title"],
            "type": "buy_now"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "session_id": session.session_id,
        "auction_id": auction_id,
        "user_id": user["id"],
        "amount": float(auction["buy_now_price"]),
        "currency": "usd",
        "payment_status": "pending",
        "payment_type": "buy_now",
        "metadata": {
            "auction_title": auction["title"]
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    # Mark auction as sold immediately (will be confirmed after payment)
    await db.auctions.update_one(
        {"id": auction_id},
        {
            "$set": {
                "is_active": False,
                "winner_id": user["id"],
                "current_bid": float(auction["buy_now_price"]),
                "sold_via": "buy_now"
            }
        }
    )
    
    # Broadcast auction sold
    await broadcast_auction_sold(auction_id, auction, user["name"])
    
    return {"url": session.url, "session_id": session.session_id}

# ================== USER ROUTES ==================

@api_router.get("/users/{user_id}/auctions")
async def get_user_auctions(user_id: str):
    auctions = await db.auctions.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return auctions

@api_router.get("/users/me/bids")
async def get_my_bids(user: dict = Depends(get_current_user)):
    bids = await db.bids.find({"bidder_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
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
        "$or": [
            {"ends_at": {"$lt": now}},
            {"sold_via": "buy_now"}
        ]
    }, {"_id": 0}).to_list(100)
    return auctions

# ================== PAYMENT ROUTES ==================

@api_router.post("/payments/create-checkout")
@limiter.limit("10/minute")
async def create_checkout(request: Request, data: PaymentCreate, user: dict = Depends(get_current_user)):
    auction = await db.auctions.find_one({"id": data.auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.get("winner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Only the auction winner can pay")
    
    if datetime.fromisoformat(auction["ends_at"]) > datetime.now(timezone.utc) and auction.get("sold_via") != "buy_now":
        raise HTTPException(status_code=400, detail="Auction has not ended yet")
    
    existing_payment = await db.payment_transactions.find_one({
        "auction_id": data.auction_id,
        "payment_status": "paid"
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="Already paid for this auction")
    
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
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status != payment.get("payment_status"):
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": status.payment_status,
                    "stripe_status": status.status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if status.payment_status == "paid":
                await db.auctions.update_one(
                    {"id": payment["auction_id"]},
                    {"$set": {"is_paid": True}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,
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
    existing = await db.auctions.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    farmers = [
        {"id": str(uuid.uuid4()), "name": "John Mwangi", "email": "john@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sarah Ochieng", "email": "sarah@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peter Kamau", "email": "peter@farm.com", "password_hash": hash_password("password123"), "role": "farmer", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(farmers)
    
    buyer = {"id": str(uuid.uuid4()), "name": "Demo Buyer", "email": "buyer@demo.com", "password_hash": hash_password("password123"), "role": "buyer", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(buyer)
    
    now = datetime.now(timezone.utc)
    demo_auctions = [
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[0]["id"],
            "seller_name": farmers[0]["name"],
            "title": "Fresh Organic Tomatoes - 50kg",
            "description": "Premium quality organic tomatoes, freshly harvested from our farm. Perfect for restaurants and markets.",
            "category": "Vegetables",
            "location": "Abia State, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800",
            "starting_bid": 50.00,
            "current_bid": 75.00,
            "buy_now_price": 150.00,
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
            "location": "Lagos, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=800",
            "starting_bid": 120.00,
            "current_bid": 180.00,
            "buy_now_price": 300.00,
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
            "location": "Kano, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800",
            "starting_bid": 300.00,
            "current_bid": 350.00,
            "buy_now_price": 500.00,
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
            "location": "Ogun State, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800",
            "starting_bid": 80.00,
            "current_bid": 95.00,
            "buy_now_price": 180.00,
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
            "location": "Abia State, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800",
            "starting_bid": 25.00,
            "current_bid": 35.00,
            "buy_now_price": 60.00,
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
            "location": "Kaduna, Nigeria",
            "image_url": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800",
            "starting_bid": 200.00,
            "current_bid": 250.00,
            "buy_now_price": 400.00,
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

@api_router.get("/")
async def root():
    return {"message": "jarnnmarket API", "version": "1.0.0"}

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

# Export the socket app for uvicorn
app = socket_app
