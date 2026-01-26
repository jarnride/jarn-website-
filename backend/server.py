from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import base64
import re
import random
import string
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

# Twilio config (MOCK MODE)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'MOCK_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', 'MOCK_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '+1234567890')
TWILIO_MOCK_MODE = TWILIO_ACCOUNT_SID == 'MOCK_SID'

# PayPal config (MOCK MODE)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', 'MOCK_CLIENT_ID')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', 'MOCK_SECRET')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_MOCK_MODE = PAYPAL_CLIENT_ID == 'MOCK_CLIENT_ID'

# Email config (MOCK MODE)
EMAIL_PROVIDER = os.environ.get('EMAIL_PROVIDER', 'MOCK')
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'noreply@jarnnmarket.com')
EMAIL_MOCK_MODE = EMAIL_PROVIDER == 'MOCK'

# Frontend URL for verification links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://agroauction-hub.preview.emergentagent.com')

# High-value bid threshold for notifications
HIGH_VALUE_BID_THRESHOLD = float(os.environ.get('HIGH_VALUE_BID_THRESHOLD', '100'))

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

def validate_password(password: str) -> tuple:
    """Validate password strength. Returns (is_valid, error_message)"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, None

def validate_phone(phone: str) -> bool:
    pattern = r'^\+?[1-9]\d{9,14}$'
    return bool(re.match(pattern, phone.replace(' ', '').replace('-', '')))

def sanitize_string(value: str) -> str:
    """Remove potentially dangerous characters to prevent XSS"""
    if not value:
        return value
    # Remove HTML tags and dangerous characters
    value = re.sub(r'<[^>]*>', '', value)
    value = re.sub(r'[<>"\'\;\(\)\{\}]', '', value)
    # Remove potential script injections
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    return value.strip()

def sanitize_search_query(query: str) -> str:
    """Sanitize search query for MongoDB"""
    if not query:
        return ""
    # Remove regex special characters
    query = re.sub(r'[$.*+?^{}()|[\]\\]', '', query)
    return sanitize_string(query)[:100]  # Limit length

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

def generate_verification_token() -> str:
    """Generate a secure verification token"""
    return str(uuid.uuid4()) + '-' + ''.join(random.choices(string.ascii_letters + string.digits, k=32))

# ================== EMAIL SERVICE (SENDGRID) ==================

class EmailService:
    """Email Service using SendGrid"""
    
    @staticmethod
    async def send_email(to: str, subject: str, html_body: str, text_body: str = None) -> dict:
        if EMAIL_MOCK_MODE:
            logger.info(f"[MOCK EMAIL] To: {to} | Subject: {subject}")
            logger.info(f"[MOCK EMAIL] Body: {text_body or html_body[:200]}...")
            return {
                "success": True,
                "mock": True,
                "message_id": f"MOCK_EMAIL_{uuid.uuid4().hex[:12]}",
                "to": to,
                "subject": subject
            }
        else:
            # Real SendGrid implementation
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail, Email, To, Content
                
                message = Mail(
                    from_email=Email(EMAIL_FROM, "Jarnnmarket"),
                    to_emails=To(to),
                    subject=subject,
                    html_content=html_body
                )
                if text_body:
                    message.add_content(Content("text/plain", text_body))
                
                sg = SendGridAPIClient(SENDGRID_API_KEY)
                response = sg.send(message)
                
                logger.info(f"[SENDGRID EMAIL] Sent to: {to} | Status: {response.status_code}")
                return {
                    "success": response.status_code in [200, 201, 202],
                    "mock": False,
                    "status_code": response.status_code,
                    "to": to,
                    "subject": subject
                }
            except Exception as e:
                logger.error(f"[SENDGRID EMAIL ERROR] {str(e)}")
                # Fallback to mock on error
                logger.info(f"[FALLBACK MOCK EMAIL] To: {to} | Subject: {subject}")
                return {
                    "success": True,
                    "mock": True,
                    "message_id": f"MOCK_EMAIL_{uuid.uuid4().hex[:12]}",
                    "to": to,
                    "subject": subject,
                    "error_note": str(e)
                }
    
    @staticmethod
    async def send_verification_email(email: str, name: str, token: str) -> dict:
        """Send email verification link to new user"""
        verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
        subject = "Verify Your Email - Jarnnmarket"
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Welcome to Jarnnmarket!</h2>
            <p>Hi {name},</p>
            <p>Thank you for registering at Jarnnmarket. Please verify your email address to complete your registration.</p>
            <div style="margin: 30px 0;">
                <a href="{verification_link}" 
                   style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
                    Verify My Email
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="{verification_link}" style="color: #16a34a;">{verification_link}</a>
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                If you didn't create an account at Jarnnmarket, please ignore this email.
            </p>
        </div>
        """
        text_body = f"Hi {name}, please verify your email by clicking this link: {verification_link}"
        return await EmailService.send_email(email, subject, html_body, text_body)
    
    @staticmethod
    async def send_new_bid_notification(seller_email: str, seller_name: str, auction_title: str, bid_amount: float, bidder_name: str):
        subject = f"New Bid on '{auction_title}' - ${bid_amount:.2f}"
        html_body = f"""
        <h2>New Bid Received!</h2>
        <p>Hi {seller_name},</p>
        <p>Great news! <strong>{bidder_name}</strong> placed a bid of <strong>${bid_amount:.2f}</strong> on your auction:</p>
        <p><strong>{auction_title}</strong></p>
        <p>Log in to jarnnmarket to view your auction.</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Hi {seller_name}, {bidder_name} placed a bid of ${bid_amount:.2f} on your auction '{auction_title}'."
        return await EmailService.send_email(seller_email, subject, html_body, text_body)
    
    @staticmethod
    async def send_outbid_notification(bidder_email: str, bidder_name: str, auction_title: str, new_bid: float):
        subject = f"You've been outbid on '{auction_title}'"
        html_body = f"""
        <h2>You've Been Outbid!</h2>
        <p>Hi {bidder_name},</p>
        <p>Someone placed a higher bid of <strong>${new_bid:.2f}</strong> on:</p>
        <p><strong>{auction_title}</strong></p>
        <p>Don't miss out! Place a higher bid now on jarnnmarket.</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Hi {bidder_name}, you've been outbid on '{auction_title}'. Current bid: ${new_bid:.2f}."
        return await EmailService.send_email(bidder_email, subject, html_body, text_body)
    
    @staticmethod
    async def send_auction_won_notification(winner_email: str, winner_name: str, auction_title: str, final_price: float):
        subject = f"Congratulations! You won '{auction_title}'"
        html_body = f"""
        <h2>Congratulations! You Won!</h2>
        <p>Hi {winner_name},</p>
        <p>You won the auction for:</p>
        <p><strong>{auction_title}</strong></p>
        <p>Final Price: <strong>${final_price:.2f}</strong></p>
        <p>Please complete your payment on jarnnmarket to finalize your purchase.</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Congratulations {winner_name}! You won '{auction_title}' for ${final_price:.2f}. Complete payment on jarnnmarket."
        return await EmailService.send_email(winner_email, subject, html_body, text_body)
    
    @staticmethod
    async def send_payment_received_notification(seller_email: str, seller_name: str, auction_title: str, amount: float, buyer_name: str):
        subject = f"Payment Received for '{auction_title}'"
        html_body = f"""
        <h2>Payment Received!</h2>
        <p>Hi {seller_name},</p>
        <p><strong>{buyer_name}</strong> has completed payment for:</p>
        <p><strong>{auction_title}</strong></p>
        <p>Amount: <strong>${amount:.2f}</strong></p>
        <p>The funds are held in escrow until the buyer confirms delivery.</p>
        <p>Please ship the item and provide tracking information.</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Hi {seller_name}, payment of ${amount:.2f} received for '{auction_title}' from {buyer_name}. Funds in escrow."
        return await EmailService.send_email(seller_email, subject, html_body, text_body)
    
    @staticmethod
    async def send_delivery_confirmed_notification(seller_email: str, seller_name: str, auction_title: str, amount: float):
        subject = f"Delivery Confirmed - Payment Released for '{auction_title}'"
        html_body = f"""
        <h2>Payment Released!</h2>
        <p>Hi {seller_name},</p>
        <p>The buyer has confirmed delivery for:</p>
        <p><strong>{auction_title}</strong></p>
        <p>Amount Released: <strong>${amount:.2f}</strong></p>
        <p>The funds have been released from escrow to your account.</p>
        <p>Thank you for using jarnnmarket!</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Hi {seller_name}, delivery confirmed for '{auction_title}'. ${amount:.2f} released from escrow."
        return await EmailService.send_email(seller_email, subject, html_body, text_body)
    
    @staticmethod
    async def send_review_received_notification(seller_email: str, seller_name: str, rating: int, reviewer_name: str):
        subject = f"New {rating}-Star Review from {reviewer_name}"
        stars = "⭐" * rating
        html_body = f"""
        <h2>New Review Received!</h2>
        <p>Hi {seller_name},</p>
        <p><strong>{reviewer_name}</strong> left you a review:</p>
        <p>{stars} ({rating}/5 stars)</p>
        <p>Log in to jarnnmarket to see the full review.</p>
        <p>Best regards,<br>jarnnmarket Team</p>
        """
        text_body = f"Hi {seller_name}, {reviewer_name} left you a {rating}-star review on jarnnmarket."
        return await EmailService.send_email(seller_email, subject, html_body, text_body)

# ================== SMS SERVICE (TWILIO) ==================

class SMSService:
    """SMS Service using Twilio"""
    
    @staticmethod
    async def send_sms(to: str, message: str) -> dict:
        if TWILIO_MOCK_MODE:
            logger.info(f"[MOCK SMS] To: {to} | Message: {message}")
            return {
                "success": True,
                "mock": True,
                "message_id": f"MOCK_{uuid.uuid4().hex[:12]}",
                "to": to
            }
        else:
            try:
                from twilio.rest import Client
                client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                msg = client.messages.create(
                    body=message,
                    from_=TWILIO_PHONE_NUMBER,
                    to=to
                )
                logger.info(f"[TWILIO SMS] Sent to: {to} | SID: {msg.sid}")
                return {
                    "success": True,
                    "mock": False,
                    "message_id": msg.sid,
                    "to": to,
                    "status": msg.status
                }
            except Exception as e:
                logger.error(f"[TWILIO SMS ERROR] {str(e)}")
                return {
                    "success": False,
                    "mock": False,
                    "error": str(e),
                    "to": to
                }
    
    @staticmethod
    async def send_verification_code(to: str, code: str) -> dict:
        message = f"Your jarnnmarket verification code is: {code}. Valid for 10 minutes."
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_bid_notification(to: str, auction_title: str, bid_amount: float, bidder_name: str) -> dict:
        message = f"New bid on '{auction_title}': ${bid_amount:.2f} by {bidder_name}. Log in to jarnnmarket to respond!"
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_outbid_notification(to: str, auction_title: str, new_bid: float) -> dict:
        message = f"You've been outbid on '{auction_title}'! Current bid: ${new_bid:.2f}. Place a higher bid now!"
        return await SMSService.send_sms(to, message)
    
    @staticmethod
    async def send_auction_won_notification(to: str, auction_title: str, final_price: float) -> dict:
        message = f"Congratulations! You won '{auction_title}' for ${final_price:.2f}. Complete payment on jarnnmarket."
        return await SMSService.send_sms(to, message)

# ================== PAYPAL SERVICE ==================

class PayPalService:
    """PayPal Service for payment processing"""
    
    @staticmethod
    def _get_paypal_client():
        """Get configured PayPal API client"""
        import paypalrestsdk
        paypalrestsdk.configure({
            "mode": PAYPAL_MODE,
            "client_id": PAYPAL_CLIENT_ID,
            "client_secret": PAYPAL_CLIENT_SECRET
        })
        return paypalrestsdk
    
    @staticmethod
    async def create_order(amount: float, currency: str, auction_id: str, description: str, return_url: str = None, cancel_url: str = None) -> dict:
        if PAYPAL_MOCK_MODE:
            order_id = f"PAYPAL_MOCK_{uuid.uuid4().hex[:12].upper()}"
            logger.info(f"[MOCK PAYPAL] Created order: {order_id} for ${amount}")
            return {
                "success": True,
                "mock": True,
                "order_id": order_id,
                "amount": amount,
                "currency": currency,
                "status": "CREATED",
                "approval_url": f"/api/paypal/mock-approve/{order_id}"
            }
        else:
            try:
                paypalrestsdk = PayPalService._get_paypal_client()
                
                payment = paypalrestsdk.Payment({
                    "intent": "sale",
                    "payer": {
                        "payment_method": "paypal"
                    },
                    "redirect_urls": {
                        "return_url": return_url or f"{FRONTEND_URL}/payment/success",
                        "cancel_url": cancel_url or f"{FRONTEND_URL}/payment/cancel"
                    },
                    "transactions": [{
                        "amount": {
                            "total": f"{amount:.2f}",
                            "currency": currency.upper()
                        },
                        "description": description,
                        "custom": auction_id
                    }]
                })
                
                if payment.create():
                    approval_url = None
                    for link in payment.links:
                        if link.rel == "approval_url":
                            approval_url = link.href
                            break
                    
                    logger.info(f"[PAYPAL] Created payment: {payment.id}")
                    return {
                        "success": True,
                        "mock": False,
                        "order_id": payment.id,
                        "amount": amount,
                        "currency": currency,
                        "status": payment.state,
                        "approval_url": approval_url
                    }
                else:
                    logger.error(f"[PAYPAL ERROR] {payment.error}")
                    return {
                        "success": False,
                        "mock": False,
                        "error": str(payment.error)
                    }
            except Exception as e:
                logger.error(f"[PAYPAL EXCEPTION] {str(e)}")
                # Fallback to mock on error
                order_id = f"PAYPAL_FALLBACK_{uuid.uuid4().hex[:12].upper()}"
                return {
                    "success": True,
                    "mock": True,
                    "order_id": order_id,
                    "amount": amount,
                    "currency": currency,
                    "status": "CREATED",
                    "approval_url": f"/api/paypal/mock-approve/{order_id}",
                    "error_note": str(e)
                }
    
    @staticmethod
    async def capture_order(order_id: str, payer_id: str = None) -> dict:
        if PAYPAL_MOCK_MODE or order_id.startswith("PAYPAL_MOCK") or order_id.startswith("PAYPAL_FALLBACK"):
            logger.info(f"[MOCK PAYPAL] Captured order: {order_id}")
            return {
                "success": True,
                "mock": True,
                "order_id": order_id,
                "status": "COMPLETED",
                "capture_id": f"CAPTURE_{uuid.uuid4().hex[:12].upper()}"
            }
        else:
            try:
                paypalrestsdk = PayPalService._get_paypal_client()
                payment = paypalrestsdk.Payment.find(order_id)
                
                if payment.execute({"payer_id": payer_id}):
                    logger.info(f"[PAYPAL] Captured payment: {order_id}")
                    return {
                        "success": True,
                        "mock": False,
                        "order_id": order_id,
                        "status": "COMPLETED",
                        "capture_id": payment.transactions[0].related_resources[0].sale.id if payment.transactions else None
                    }
                else:
                    logger.error(f"[PAYPAL CAPTURE ERROR] {payment.error}")
                    return {
                        "success": False,
                        "mock": False,
                        "error": str(payment.error)
                    }
            except Exception as e:
                logger.error(f"[PAYPAL CAPTURE EXCEPTION] {str(e)}")
                return {
                    "success": False,
                    "mock": False,
                    "error": str(e)
                }

# ================== ESCROW SERVICE ==================

class EscrowService:
    """Escrow management for secure transactions"""
    
    @staticmethod
    async def create_escrow(auction_id: str, buyer_id: str, seller_id: str, amount: float, payment_method: str, payment_id: str) -> dict:
        escrow_id = str(uuid.uuid4())
        escrow_doc = {
            "id": escrow_id,
            "auction_id": auction_id,
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "amount": amount,
            "currency": "usd",
            "payment_method": payment_method,
            "payment_id": payment_id,
            "status": "held",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "released_at": None,
            "refunded_at": None
        }
        await db.escrow.insert_one(escrow_doc)
        logger.info(f"Escrow created: {escrow_id} for auction {auction_id}")
        return {k: v for k, v in escrow_doc.items() if k != "_id"}
    
    @staticmethod
    async def release_escrow(escrow_id: str) -> dict:
        escrow = await db.escrow.find_one({"id": escrow_id}, {"_id": 0})
        if not escrow:
            raise HTTPException(status_code=404, detail="Escrow not found")
        
        if escrow["status"] != "held":
            raise HTTPException(status_code=400, detail=f"Cannot release escrow in {escrow['status']} status")
        
        await db.escrow.update_one(
            {"id": escrow_id},
            {"$set": {
                "status": "released",
                "released_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Escrow released: {escrow_id}")
        return {"success": True, "escrow_id": escrow_id, "status": "released"}

# ================== MODELS ==================

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: str = Field(default="buyer", pattern="^(buyer|farmer)$")
    # Seller payout details (required for farmers)
    bank_name: Optional[str] = Field(default=None, max_length=100)
    bank_account_number: Optional[str] = Field(default=None, max_length=20)
    national_id: Optional[str] = Field(default=None, max_length=30)
    
    @field_validator('name')
    @classmethod
    def sanitize_name(cls, v):
        return sanitize_string(v)
    
    @field_validator('bank_name', 'bank_account_number', 'national_id')
    @classmethod
    def sanitize_bank_fields(cls, v):
        if v:
            return sanitize_string(v)
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PhoneVerificationRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)

class PhoneVerificationVerify(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=6, max_length=6)

class EmailVerificationToken(BaseModel):
    token: str

class ResendVerificationEmail(BaseModel):
    email: EmailStr

# Supported currencies
SUPPORTED_CURRENCIES = ["USD", "NGN"]
CURRENCY_SYMBOLS = {"USD": "$", "NGN": "₦"}

# Subscription plan definitions
SUBSCRIPTION_PLANS = {
    "5_days": {
        "id": "5_days",
        "name": "5-Day Plan",
        "duration_days": 5,
        "price_usd": 4.99,
        "price_ngn": 7500,
        "features": ["Up to 10 listings", "Basic analytics", "Email support"]
    },
    "weekly": {
        "id": "weekly",
        "name": "Weekly Plan",
        "duration_days": 7,
        "price_usd": 6.99,
        "price_ngn": 10500,
        "features": ["Up to 25 listings", "Advanced analytics", "Priority support", "Featured listings"]
    },
    "monthly": {
        "id": "monthly",
        "name": "Monthly Plan",
        "duration_days": 30,
        "price_usd": 19.99,
        "price_ngn": 30000,
        "features": ["Unlimited listings", "Full analytics", "24/7 support", "Featured listings", "Promotional tools", "Verified seller badge"]
    }
}

class DeliveryOption(BaseModel):
    type: str = Field(..., pattern="^(local_pickup|city_to_city|international)$")
    price: float = Field(default=0, ge=0)
    estimated_days: Optional[int] = Field(default=None, ge=1)
    description: str = Field(default="", max_length=200)

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
    buy_now_only: bool = Field(default=False)
    accepts_offers: bool = Field(default=False)
    # New fields
    currency: str = Field(default="USD", pattern="^(USD|NGN)$")
    quantity: int = Field(default=1, ge=1, le=10000)
    weight: Optional[float] = Field(default=None, ge=0)  # in kg
    weight_unit: str = Field(default="kg", pattern="^(kg|lb|g)$")
    # Delivery options
    delivery_options: List[DeliveryOption] = Field(default_factory=list)
    local_pickup: bool = Field(default=True)
    city_to_city: bool = Field(default=False)
    international_shipping: bool = Field(default=False)
    shipping_from: str = Field(default="", max_length=100)
    
    @field_validator('title', 'description', 'category', 'location', 'shipping_from')
    @classmethod
    def sanitize_fields(cls, v):
        return sanitize_string(v) if v else v

class SubscriptionCreate(BaseModel):
    plan_id: str = Field(..., pattern="^(5_days|weekly|monthly)$")
    currency: str = Field(default="USD", pattern="^(USD|NGN)$")

class BidCreate(BaseModel):
    amount: float = Field(..., gt=0)

class PaymentCreate(BaseModel):
    auction_id: str
    origin_url: str

class BuyNowRequest(BaseModel):
    origin_url: str
    payment_method: str = Field(default="stripe", pattern="^(stripe|paypal)$")
    delivery_option: Optional[str] = Field(default=None)  # local_pickup, city_delivery, international
    delivery_address: Optional[str] = Field(default=None, max_length=500)

class DeliveryConfirmation(BaseModel):
    escrow_id: str
    rating: Optional[int] = Field(default=None, ge=1, le=5)  # Optional rating on delivery confirmation
    review_comment: Optional[str] = Field(default=None, max_length=1000)

class OfferCreate(BaseModel):
    amount: float = Field(..., gt=0)
    message: str = Field(default="", max_length=500)

class OfferResponse(BaseModel):
    offer_id: str
    status: str = Field(..., pattern="^(accepted|rejected)$")

class PayoutRequest(BaseModel):
    escrow_id: str

class CancelAuctionWin(BaseModel):
    auction_id: str
    reason: Optional[str] = Field(default=None, max_length=500)

class ReviewCreate(BaseModel):
    auction_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(default="", max_length=1000)
    
    @field_validator('comment')
    @classmethod
    def sanitize_comment(cls, v):
        return sanitize_string(v) if v else v

class ImageUploadResponse(BaseModel):
    url: str
    filename: str

# ================== BUYER SUSPENSION CONSTANTS ==================
MAX_CANCELLATIONS_BEFORE_SUSPENSION = 2
SUSPENSION_DURATION_DAYS = 30

# ================== FREE SELLER TRIAL CONSTANTS ==================
FREE_TRIAL_DAYS = 3
FREE_TRIAL_LISTINGS = 5

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

async def check_buyer_suspended(user_id: str) -> tuple[bool, Optional[str]]:
    """Check if a buyer is suspended due to cancellations"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return False, None
    
    # Check if currently suspended
    if user.get("is_suspended"):
        suspension_until = user.get("suspended_until")
        if suspension_until:
            if datetime.fromisoformat(suspension_until) > datetime.now(timezone.utc):
                return True, suspension_until
            else:
                # Suspension expired, clear it
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"is_suspended": False}, "$unset": {"suspended_until": ""}}
                )
    return False, None

async def record_buyer_cancellation(user_id: str, auction_id: str, reason: str = None) -> dict:
    """Record a buyer cancellation and suspend if threshold reached"""
    # Record the cancellation
    cancellation_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "auction_id": auction_id,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.buyer_cancellations.insert_one(cancellation_doc)
    
    # Count cancellations in last 90 days
    ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    cancellation_count = await db.buyer_cancellations.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": ninety_days_ago}
    })
    
    result = {
        "cancellation_recorded": True,
        "total_cancellations": cancellation_count,
        "suspended": False
    }
    
    # Suspend if threshold reached
    if cancellation_count >= MAX_CANCELLATIONS_BEFORE_SUSPENSION:
        suspension_until = datetime.now(timezone.utc) + timedelta(days=SUSPENSION_DURATION_DAYS)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "is_suspended": True,
                "suspended_until": suspension_until.isoformat(),
                "suspension_reason": f"Cancelled {cancellation_count} auction wins without payment"
            }}
        )
        result["suspended"] = True
        result["suspended_until"] = suspension_until.isoformat()
        logger.warning(f"Buyer {user_id} suspended until {suspension_until} for {cancellation_count} cancellations")
    
    return result

async def get_seller_listing_allowance(user_id: str) -> dict:
    """Get seller's current listing allowance based on free trial or subscription"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get("role") != "farmer":
        return {"can_list": False, "reason": "Not a seller account"}
    
    now = datetime.now(timezone.utc)
    
    # Check if on free trial
    free_trial_start = user.get("free_trial_start")
    free_trial_used = user.get("free_trial_listings_used", 0)
    
    if free_trial_start:
        trial_end = datetime.fromisoformat(free_trial_start) + timedelta(days=FREE_TRIAL_DAYS)
        if now < trial_end:
            # Still in free trial period
            remaining_free_listings = FREE_TRIAL_LISTINGS - free_trial_used
            if remaining_free_listings > 0:
                return {
                    "can_list": True,
                    "listing_type": "free_trial",
                    "remaining_listings": remaining_free_listings,
                    "trial_ends": trial_end.isoformat(),
                    "days_remaining": (trial_end - now).days
                }
            else:
                return {
                    "can_list": False,
                    "reason": "Free trial listings exhausted",
                    "trial_ends": trial_end.isoformat(),
                    "upgrade_required": True
                }
    
    # Check for active subscription
    subscription = await db.subscriptions.find_one({
        "user_id": user_id,
        "status": "active",
        "ends_at": {"$gt": now.isoformat()}
    }, {"_id": 0})
    
    if subscription:
        return {
            "can_list": True,
            "listing_type": "subscription",
            "plan": subscription.get("plan_id"),
            "ends_at": subscription.get("ends_at")
        }
    
    # Check if free trial has expired or not started
    if not free_trial_start:
        # New seller - start free trial
        return {
            "can_list": True,
            "listing_type": "free_trial_eligible",
            "message": "You're eligible for a free 3-day trial with 5 listings!"
        }
    
    # Trial expired, no subscription
    return {
        "can_list": False,
        "reason": "Free trial expired. Please subscribe to continue listing.",
        "upgrade_required": True
    }

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

async def broadcast_bid_update(auction_id: str, bid: dict, auction: dict):
    await sio.emit('bid_update', {
        'auction_id': auction_id,
        'bid': bid,
        'current_bid': auction['current_bid'],
        'bid_count': auction['bid_count']
    }, room=f"auction_{auction_id}")

async def broadcast_auction_sold(auction_id: str, auction: dict, buyer_name: str):
    await sio.emit('auction_sold', {
        'auction_id': auction_id,
        'final_price': auction['current_bid'],
        'buyer_name': buyer_name
    }, room=f"auction_{auction_id}")

# ================== AUTH ROUTES ==================

@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        # Check if email is already verified
        if existing.get("email_verified"):
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # User exists but email not verified - resend verification
            token = generate_verification_token()
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            
            await db.email_verifications.update_one(
                {"user_id": existing["id"]},
                {"$set": {
                    "user_id": existing["id"],
                    "email": existing["email"],
                    "token": token,
                    "expires_at": expires_at.isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            # Send verification email
            await EmailService.send_verification_email(existing["email"], existing["name"], token)
            
            return {
                "success": True,
                "message": "A verification email has been sent. Please check your inbox.",
                "email_verification_required": True,
                "mock_mode": EMAIL_MOCK_MODE,
                "mock_token": token if EMAIL_MOCK_MODE else None
            }
    
    # Enhanced password validation
    is_valid, error_msg = validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    if data.phone and not validate_phone(data.phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    user_id = str(uuid.uuid4())
    verification_token = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    user_doc = {
        "id": user_id,
        "name": sanitize_string(data.name),
        "email": data.email.lower(),
        "phone": data.phone,
        "phone_verified": False,
        "email_verified": False,  # New field
        "password_hash": hash_password(data.password),
        "role": data.role,
        "rating_avg": 0.0,
        "rating_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add seller payout details for farmers
    if data.role == "farmer":
        user_doc["bank_name"] = data.bank_name
        user_doc["bank_account_number"] = data.bank_account_number
        user_doc["national_id"] = data.national_id
        user_doc["payout_details_complete"] = bool(data.bank_name and data.bank_account_number and data.national_id)
    
    await db.users.insert_one(user_doc)
    
    # Store email verification token
    await db.email_verifications.insert_one({
        "user_id": user_id,
        "email": data.email.lower(),
        "token": verification_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send verification email
    await EmailService.send_verification_email(data.email.lower(), sanitize_string(data.name), verification_token)
    
    # Log registration (without sensitive data)
    logger.info(f"New user registered: {user_id}, role: {data.role}, email verification required")
    
    return {
        "success": True,
        "message": "Registration successful! Please check your email to verify your account.",
        "email_verification_required": True,
        "mock_mode": EMAIL_MOCK_MODE,
        "mock_token": verification_token if EMAIL_MOCK_MODE else None
    }

@api_router.post("/auth/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, data: EmailVerificationToken):
    """Verify user's email address"""
    verification = await db.email_verifications.find_one({"token": data.token})
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    if datetime.fromisoformat(verification["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token has expired. Please register again.")
    
    # Update user's email_verified status
    await db.users.update_one(
        {"id": verification["user_id"]},
        {"$set": {"email_verified": True}}
    )
    
    # Delete the verification record
    await db.email_verifications.delete_one({"token": data.token})
    
    logger.info(f"Email verified for user: {verification['user_id']}")
    
    return {
        "success": True,
        "message": "Email verified successfully! You can now login."
    }

@api_router.post("/auth/resend-verification")
@limiter.limit("3/minute")
async def resend_verification_email(request: Request, data: ResendVerificationEmail):
    """Resend email verification link"""
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If this email is registered, a verification link has been sent."}
    
    if user.get("email_verified"):
        return {"success": True, "message": "Email is already verified. Please login."}
    
    # Generate new token
    token = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    await db.email_verifications.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "email": user["email"],
            "token": token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Send verification email
    await EmailService.send_verification_email(user["email"], user["name"], token)
    
    return {
        "success": True,
        "message": "Verification email sent. Please check your inbox.",
        "mock_mode": EMAIL_MOCK_MODE,
        "mock_token": token if EMAIL_MOCK_MODE else None
    }

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if email is verified
    if not user.get("email_verified", False):
        # For demo users (seeded data), allow login without email verification
        if user["email"] not in ["john@farm.com", "sarah@farm.com", "peter@farm.com", "buyer@demo.com"]:
            raise HTTPException(
                status_code=403, 
                detail="Please verify your email before logging in. Check your inbox for the verification link."
            )
    
    token = create_token(user["id"])
    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "phone_verified": user.get("phone_verified", False),
            "email_verified": user.get("email_verified", True),  # For legacy users
            "role": user["role"],
            "rating_avg": user.get("rating_avg", 0.0),
            "rating_count": user.get("rating_count", 0),
            "created_at": user["created_at"]
        },
        "token": token
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    response = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user.get("phone"),
        "phone_verified": user.get("phone_verified", False),
        "email_verified": user.get("email_verified", True),  # For legacy users
        "role": user["role"],
        "rating_avg": user.get("rating_avg", 0.0),
        "rating_count": user.get("rating_count", 0),
        "created_at": user["created_at"]
    }
    
    # Include payout details for farmers
    if user["role"] == "farmer":
        response["bank_name"] = user.get("bank_name")
        response["bank_account_number"] = user.get("bank_account_number")
        response["national_id"] = user.get("national_id")
        response["payout_details_complete"] = user.get("payout_details_complete", False)
    
    return response

# Payout details update model
class PayoutDetailsUpdate(BaseModel):
    bank_name: str = Field(..., min_length=2, max_length=100)
    bank_account_number: str = Field(..., min_length=10, max_length=10)
    national_id: str = Field(..., min_length=11, max_length=11)

@api_router.put("/sellers/me/payout-details")
async def update_payout_details(data: PayoutDetailsUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only sellers can update payout details")
    
    # Validate account number is numeric
    if not data.bank_account_number.isdigit():
        raise HTTPException(status_code=400, detail="Account number must be numeric")
    
    # Validate NIN is numeric
    if not data.national_id.isdigit():
        raise HTTPException(status_code=400, detail="NIN must be numeric")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "bank_name": sanitize_string(data.bank_name),
            "bank_account_number": data.bank_account_number,
            "national_id": data.national_id,
            "payout_details_complete": True,
            "payout_details_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Payout details updated successfully"}

# ================== PHONE VERIFICATION ROUTES ==================

@api_router.post("/auth/phone/send-code")
@limiter.limit("3/minute")
async def send_phone_verification(request: Request, data: PhoneVerificationRequest, user: dict = Depends(get_current_user)):
    if not validate_phone(data.phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    existing = await db.users.find_one({"phone": data.phone, "phone_verified": True, "id": {"$ne": user["id"]}})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered to another account")
    
    otp = generate_otp(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.phone_verifications.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "phone": data.phone,
            "code": otp,
            "expires_at": expires_at.isoformat(),
            "verified": False,
            "attempts": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    await SMSService.send_verification_code(data.phone, otp)
    
    return {
        "success": True,
        "message": "Verification code sent",
        "mock_mode": TWILIO_MOCK_MODE,
        "mock_code": otp if TWILIO_MOCK_MODE else None
    }

@api_router.post("/auth/phone/verify")
@limiter.limit("5/minute")
async def verify_phone(request: Request, data: PhoneVerificationVerify, user: dict = Depends(get_current_user)):
    verification = await db.phone_verifications.find_one({"user_id": user["id"], "phone": data.phone})
    
    if not verification:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")
    
    if verification.get("attempts", 0) >= 5:
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")
    
    if datetime.fromisoformat(verification["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
    
    await db.phone_verifications.update_one(
        {"user_id": user["id"]},
        {"$inc": {"attempts": 1}}
    )
    
    if verification["code"] != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    await db.phone_verifications.update_one(
        {"user_id": user["id"]},
        {"$set": {"verified": True}}
    )
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"phone": data.phone, "phone_verified": True}}
    )
    
    return {"success": True, "message": "Phone number verified successfully"}

# ================== REVIEW ROUTES ==================

@api_router.post("/reviews")
@limiter.limit("10/minute")
async def create_review(request: Request, data: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if auction exists and user won it
    auction = await db.auctions.find_one({"id": data.auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction["winner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only auction winners can leave reviews")
    
    if not auction.get("is_paid"):
        raise HTTPException(status_code=400, detail="Please complete payment before leaving a review")
    
    # Check if review already exists
    existing_review = await db.reviews.find_one({"auction_id": data.auction_id, "reviewer_id": user["id"]})
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this seller for this auction")
    
    seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "auction_id": data.auction_id,
        "seller_id": auction["seller_id"],
        "reviewer_id": user["id"],
        "reviewer_name": user["name"],
        "rating": data.rating,
        "comment": data.comment,
        "auction_title": auction["title"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update seller's average rating
    all_reviews = await db.reviews.find({"seller_id": auction["seller_id"]}, {"_id": 0}).to_list(1000)
    total_rating = sum(r["rating"] for r in all_reviews)
    avg_rating = total_rating / len(all_reviews) if all_reviews else 0
    
    await db.users.update_one(
        {"id": auction["seller_id"]},
        {"$set": {
            "rating_avg": round(avg_rating, 2),
            "rating_count": len(all_reviews)
        }}
    )
    
    # Send email notification to seller
    await EmailService.send_review_received_notification(
        seller["email"],
        seller["name"],
        data.rating,
        user["name"]
    )
    
    return {k: v for k, v in review_doc.items() if k != "_id"}

@api_router.get("/reviews/seller/{seller_id}")
async def get_seller_reviews(seller_id: str, limit: int = 20):
    reviews = await db.reviews.find({"seller_id": seller_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get seller rating info
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "rating_avg": 1, "rating_count": 1, "name": 1})
    
    return {
        "reviews": reviews,
        "seller_name": seller.get("name") if seller else "Unknown",
        "rating_avg": seller.get("rating_avg", 0) if seller else 0,
        "rating_count": seller.get("rating_count", 0) if seller else 0
    }

@api_router.get("/reviews/auction/{auction_id}")
async def get_auction_review(auction_id: str):
    review = await db.reviews.find_one({"auction_id": auction_id}, {"_id": 0})
    return review

@api_router.get("/users/{user_id}/rating")
async def get_user_rating(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "name": user["name"],
        "rating_avg": user.get("rating_avg", 0.0),
        "rating_count": user.get("rating_count", 0)
    }

@api_router.get("/users/{user_id}/reviews")
async def get_user_reviews(user_id: str, limit: int = 20):
    """Get reviews for a seller"""
    reviews = await db.reviews.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reviews

# ================== IMAGE UPLOAD ==================

# Minimum image quality requirements
MIN_IMAGE_WIDTH = 400
MIN_IMAGE_HEIGHT = 300
MIN_IMAGE_SIZE_KB = 20  # Minimum 20KB to avoid very low quality images

def get_image_dimensions(content: bytes, content_type: str) -> tuple:
    """Get image dimensions from binary content"""
    import struct
    import imghdr
    
    # Try to get dimensions based on image type
    if content_type == 'image/png':
        # PNG: width and height are at bytes 16-24
        if len(content) >= 24:
            w, h = struct.unpack('>LL', content[16:24])
            return (w, h)
    elif content_type in ['image/jpeg', 'image/jpg']:
        # JPEG: need to parse markers
        try:
            # Skip to start of image data
            i = 2
            while i < len(content):
                if content[i] != 0xFF:
                    i += 1
                    continue
                marker = content[i+1]
                if marker == 0xC0 or marker == 0xC2:  # SOF0 or SOF2
                    h = struct.unpack('>H', content[i+5:i+7])[0]
                    w = struct.unpack('>H', content[i+7:i+9])[0]
                    return (w, h)
                elif marker == 0xD9:  # EOI
                    break
                else:
                    length = struct.unpack('>H', content[i+2:i+4])[0]
                    i += 2 + length
        except:
            pass
    elif content_type == 'image/webp':
        # WebP: dimensions at specific offset
        if len(content) >= 30 and content[12:16] == b'VP8 ':
            w = struct.unpack('<H', content[26:28])[0] & 0x3FFF
            h = struct.unpack('<H', content[28:30])[0] & 0x3FFF
            return (w, h)
        elif len(content) >= 30 and content[12:16] == b'VP8L':
            bits = struct.unpack('<I', content[21:25])[0]
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return (w, h)
    elif content_type == 'image/gif':
        if len(content) >= 10:
            w = struct.unpack('<H', content[6:8])[0]
            h = struct.unpack('<H', content[8:10])[0]
            return (w, h)
    
    return (0, 0)

@api_router.post("/upload/image", response_model=ImageUploadResponse)
@limiter.limit("10/minute")
async def upload_image(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    content = await file.read()
    content_size_kb = len(content) / 1024
    
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 5MB")
    
    # Check minimum file size (quality indicator)
    if content_size_kb < MIN_IMAGE_SIZE_KB:
        raise HTTPException(
            status_code=400, 
            detail=f"Image quality too low. Minimum file size: {MIN_IMAGE_SIZE_KB}KB. Your image: {content_size_kb:.1f}KB"
        )
    
    # Check image dimensions
    width, height = get_image_dimensions(content, file.content_type)
    if width > 0 and height > 0:
        if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
            raise HTTPException(
                status_code=400,
                detail=f"Image resolution too low. Minimum: {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT} pixels. Your image: {width}x{height} pixels"
            )
    
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    
    base64_data = base64.b64encode(content).decode()
    
    image_doc = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "content_type": file.content_type,
        "data": base64_data,
        "user_id": user["id"],
        "width": width,
        "height": height,
        "size_kb": round(content_size_kb, 2),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.images.insert_one(image_doc)
    
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
    
    # Add seller ratings to auctions
    for auction in auctions:
        seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0, "rating_avg": 1, "rating_count": 1, "is_verified": 1})
        auction["seller_rating"] = seller.get("rating_avg", 0) if seller else 0
        auction["seller_rating_count"] = seller.get("rating_count", 0) if seller else 0
        auction["seller_verified"] = seller.get("is_verified", False) if seller else False
        # Ensure new fields have default values for legacy auctions
        auction.setdefault("buy_now_only", False)
        auction.setdefault("accepts_offers", False)
    
    return auctions

@api_router.get("/auctions/featured")
async def get_featured_auctions(limit: int = 6):
    query = {
        "is_active": True,
        "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    }
    auctions = await db.auctions.find(query, {"_id": 0}).sort("bid_count", -1).limit(limit).to_list(limit)
    
    for auction in auctions:
        seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0, "rating_avg": 1, "rating_count": 1, "is_verified": 1})
        auction["seller_rating"] = seller.get("rating_avg", 0) if seller else 0
        auction["seller_rating_count"] = seller.get("rating_count", 0) if seller else 0
        auction["seller_verified"] = seller.get("is_verified", False) if seller else False
        # Ensure new fields have default values for legacy auctions
        auction.setdefault("buy_now_only", False)
        auction.setdefault("accepts_offers", False)
    
    return auctions

@api_router.get("/auctions/search")
async def search_auctions(
    q: str = "",
    category: str = "",
    min_price: float = 0,
    max_price: float = 0,
    currency: str = "",
    location: str = "",
    delivery: str = "",  # local_pickup, city_to_city, international
    sort_by: str = "nearest",  # nearest, newest, ending_soon, price_low, price_high, most_bids
    buyer_location: str = "",  # Buyer's location for proximity sorting
    page: int = 1,
    limit: int = 20
):
    """
    Search and filter auctions
    - q: Search query (searches title and description)
    - category: Filter by category
    - min_price, max_price: Price range filter
    - currency: Filter by currency (USD, NGN)
    - location: Filter by location
    - delivery: Filter by delivery option
    - sort_by: Sort results (nearest = proximity-based)
    - buyer_location: Buyer's location for proximity sorting
    - page, limit: Pagination
    """
    # Sanitize inputs
    q = sanitize_search_query(q)
    category = sanitize_string(category) if category else ""
    location = sanitize_string(location) if location else ""
    currency = currency.upper() if currency in ["USD", "NGN"] else ""
    
    # Build query
    query = {
        "is_active": True,
        "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    }
    
    # Text search on title and description
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    
    # Category filter
    if category:
        query["category"] = category
    
    # Currency filter
    if currency:
        query["currency"] = currency
    
    # Location filter (partial match)
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    # Price range filter
    if min_price > 0:
        query["current_bid"] = {"$gte": min_price}
    if max_price > 0:
        if "current_bid" in query:
            query["current_bid"]["$lte"] = max_price
        else:
            query["current_bid"] = {"$lte": max_price}
    
    # Delivery option filter
    if delivery:
        if delivery == "local_pickup":
            query["delivery_options.type"] = "local_pickup"
        elif delivery == "city_to_city":
            query["delivery_options.type"] = "city_to_city"
        elif delivery == "international":
            query["delivery_options.type"] = "international"
    
    # Nigerian states grouped by region for proximity sorting
    NIGERIAN_REGIONS = {
        # South West
        "Lagos": ["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
        "Ogun": ["Ogun", "Lagos", "Oyo", "Ondo"],
        "Oyo": ["Oyo", "Ogun", "Osun", "Kwara", "Lagos"],
        "Osun": ["Osun", "Oyo", "Ondo", "Ekiti", "Kwara"],
        "Ondo": ["Ondo", "Ekiti", "Osun", "Ogun", "Edo"],
        "Ekiti": ["Ekiti", "Osun", "Ondo", "Kogi", "Kwara"],
        # South South
        "Edo": ["Edo", "Delta", "Ondo", "Kogi", "Anambra"],
        "Delta": ["Delta", "Edo", "Anambra", "Bayelsa", "Rivers"],
        "Rivers": ["Rivers", "Bayelsa", "Delta", "Abia", "Akwa Ibom"],
        "Bayelsa": ["Bayelsa", "Rivers", "Delta"],
        "Akwa Ibom": ["Akwa Ibom", "Rivers", "Cross River", "Abia"],
        "Cross River": ["Cross River", "Akwa Ibom", "Ebonyi", "Benue"],
        # South East
        "Abia": ["Abia", "Imo", "Rivers", "Akwa Ibom", "Ebonyi", "Enugu"],
        "Imo": ["Imo", "Abia", "Anambra", "Rivers", "Enugu"],
        "Anambra": ["Anambra", "Imo", "Enugu", "Delta", "Kogi"],
        "Enugu": ["Enugu", "Anambra", "Ebonyi", "Abia", "Kogi", "Benue"],
        "Ebonyi": ["Ebonyi", "Enugu", "Cross River", "Abia", "Benue"],
        # North Central
        "Kwara": ["Kwara", "Oyo", "Niger", "Kogi", "Osun", "Ekiti"],
        "Kogi": ["Kogi", "Kwara", "Enugu", "Anambra", "Edo", "Benue", "Nassarawa"],
        "Benue": ["Benue", "Nassarawa", "Taraba", "Cross River", "Enugu", "Kogi"],
        "Plateau": ["Plateau", "Nassarawa", "Bauchi", "Kaduna", "Taraba"],
        "Nassarawa": ["Nassarawa", "Plateau", "Kogi", "Benue", "Kaduna", "FCT"],
        "Niger": ["Niger", "Kwara", "Kaduna", "FCT", "Kebbi"],
        "FCT": ["FCT", "Nassarawa", "Niger", "Kogi", "Kaduna"],
        # North West
        "Kaduna": ["Kaduna", "Niger", "Plateau", "Bauchi", "Katsina", "Zamfara", "Kano"],
        "Kano": ["Kano", "Kaduna", "Katsina", "Jigawa", "Bauchi"],
        "Katsina": ["Katsina", "Kano", "Kaduna", "Zamfara", "Jigawa"],
        "Jigawa": ["Jigawa", "Kano", "Katsina", "Bauchi", "Yobe"],
        "Zamfara": ["Zamfara", "Katsina", "Kaduna", "Kebbi", "Sokoto"],
        "Sokoto": ["Sokoto", "Zamfara", "Kebbi"],
        "Kebbi": ["Kebbi", "Sokoto", "Zamfara", "Niger"],
        # North East
        "Bauchi": ["Bauchi", "Kano", "Jigawa", "Plateau", "Gombe", "Yobe"],
        "Gombe": ["Gombe", "Bauchi", "Yobe", "Adamawa", "Borno", "Taraba"],
        "Yobe": ["Yobe", "Borno", "Gombe", "Jigawa", "Bauchi"],
        "Borno": ["Borno", "Yobe", "Gombe", "Adamawa"],
        "Adamawa": ["Adamawa", "Gombe", "Borno", "Taraba"],
        "Taraba": ["Taraba", "Adamawa", "Gombe", "Plateau", "Benue"],
    }
    
    def get_proximity_score(auction_location: str, buyer_loc: str) -> int:
        """Calculate proximity score (lower = closer)"""
        if not buyer_loc:
            return 999
        
        buyer_state = None
        auction_state = None
        
        # Extract state from location string
        for state in NIGERIAN_REGIONS.keys():
            if state.lower() in buyer_loc.lower():
                buyer_state = state
            if state.lower() in auction_location.lower():
                auction_state = state
        
        if not buyer_state or not auction_state:
            return 999
        
        if buyer_state == auction_state:
            return 0  # Same state
        
        nearby_states = NIGERIAN_REGIONS.get(buyer_state, [])
        if auction_state in nearby_states:
            return nearby_states.index(auction_state) + 1  # Nearby states
        
        return 50  # Far away
    
    # Sort options
    sort_options = {
        "newest": [("created_at", -1)],
        "ending_soon": [("ends_at", 1)],
        "price_low": [("current_bid", 1)],
        "price_high": [("current_bid", -1)],
        "most_bids": [("bid_count", -1)]
    }
    
    # Handle proximity sorting specially
    use_proximity_sort = sort_by == "nearest" and buyer_location
    
    if use_proximity_sort:
        # For proximity, we fetch more results and sort in memory
        sort = [("created_at", -1)]  # Default sort for initial fetch
    else:
        sort = sort_options.get(sort_by, [("created_at", -1)])
    
    # Pagination
    skip = (page - 1) * limit
    limit = min(limit, 50)  # Max 50 per page
    
    # Execute query
    total = await db.auctions.count_documents(query)
    
    if use_proximity_sort:
        # Fetch all matching auctions for proximity sorting
        all_auctions = await db.auctions.find(query, {"_id": 0}).to_list(500)
        
        # Sort by proximity
        for auction in all_auctions:
            auction["_proximity_score"] = get_proximity_score(auction.get("location", ""), buyer_location)
        
        all_auctions.sort(key=lambda x: (x.get("_proximity_score", 999), x.get("created_at", "")))
        
        # Apply pagination
        auctions = all_auctions[skip:skip + limit]
        
        # Remove proximity score from response
        for auction in auctions:
            auction.pop("_proximity_score", None)
    else:
        auctions = await db.auctions.find(query, {"_id": 0}).sort(sort).skip(skip).limit(limit).to_list(limit)
    
    # Add seller ratings and verification status
    for auction in auctions:
        seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0, "rating_avg": 1, "rating_count": 1, "is_verified": 1})
        auction["seller_rating"] = seller.get("rating_avg", 0) if seller else 0
        auction["seller_rating_count"] = seller.get("rating_count", 0) if seller else 0
        auction["seller_verified"] = seller.get("is_verified", False) if seller else False
        auction.setdefault("buy_now_only", False)
        auction.setdefault("accepts_offers", False)
        auction.setdefault("currency", "USD")
        auction.setdefault("quantity", 1)
    
    return {
        "auctions": auctions,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "query": q,
        "filters": {
            "category": category,
            "min_price": min_price,
            "max_price": max_price,
            "currency": currency,
            "location": location,
            "delivery": delivery
        }
    }

@api_router.get("/auctions/categories")
async def get_categories():
    categories = [
        {"name": "Vegetables", "image": "https://images.unsplash.com/photo-1669154777196-aca4d45b581a?crop=entropy&cs=srgb&fm=jpg&q=85", "count": 0},
        {"name": "Fruits", "image": "https://images.unsplash.com/photo-1650012048722-c81295ccbe79?crop=entropy&cs=srgb&fm=jpg&q=85", "count": 0},
        {"name": "Grains", "image": "https://images.pexels.com/photos/7843989/pexels-photo-7843989.jpeg", "count": 0},
        {"name": "Dairy", "image": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800", "count": 0},
        {"name": "Organic", "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", "count": 0},
        {"name": "Livestock", "image": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800", "count": 0},
        {"name": "Poultry", "image": "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800", "count": 0},
        {"name": "Fishery", "image": "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800", "count": 0},
        {"name": "Pest Control", "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800", "count": 0},
        {"name": "Piggery", "image": "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800", "count": 0},
        {"name": "Farm Books", "image": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800", "count": 0},
        {"name": "Machinery", "image": "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?w=800", "count": 0}
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
    
    if not user.get("phone_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your phone number before creating auctions")
    
    # Check listing allowance (free trial or subscription)
    allowance = await get_seller_listing_allowance(user["id"])
    
    if not allowance["can_list"]:
        raise HTTPException(
            status_code=403, 
            detail=allowance.get("reason", "You need an active subscription to create listings")
        )
    
    # Auto-activate free trial for eligible new sellers
    if allowance.get("listing_type") == "free_trial_eligible":
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "free_trial_start": datetime.now(timezone.utc).isoformat(),
                "free_trial_listings_used": 0
            }}
        )
        logger.info(f"Auto-activated free trial for new seller {user['id']}")
        raise HTTPException(status_code=403, detail="Phone verification is mandatory. Please verify your phone number before creating auctions.")
    
    # Check subscription status (if required in future)
    # subscription = await db.subscriptions.find_one({"user_id": user["id"], "status": "active"})
    
    # Validate buy_now_only requires buy_now_price
    if data.buy_now_only and not data.buy_now_price:
        raise HTTPException(status_code=400, detail="Buy Now price is required when listing as Buy Now only")
    
    if data.buy_now_price and data.buy_now_price <= data.starting_bid:
        raise HTTPException(status_code=400, detail="Buy Now price must be higher than starting bid")
    
    # At least one delivery option required
    if not data.local_pickup and not data.city_to_city and not data.international_shipping:
        raise HTTPException(status_code=400, detail="At least one delivery option is required")
    
    auction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(hours=data.duration_hours)
    
    # Build delivery options list
    delivery_options = []
    if data.local_pickup:
        delivery_options.append({
            "type": "local_pickup",
            "price": 0,
            "estimated_days": None,
            "description": "Pick up from seller location"
        })
    if data.city_to_city:
        delivery_options.append({
            "type": "city_to_city",
            "price": 0,  # Will be set by seller
            "estimated_days": 3,
            "description": "Delivery within Nigeria"
        })
    if data.international_shipping:
        delivery_options.append({
            "type": "international",
            "price": 0,  # Will be set by seller
            "estimated_days": 14,
            "description": "International shipping available"
        })
    
    # Add custom delivery options if provided
    for opt in data.delivery_options:
        delivery_options.append(opt.model_dump())
    
    auction_doc = {
        "id": auction_id,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_phone": user.get("phone"),
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "location": data.location,
        "image_url": data.image_url or "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800",
        "starting_bid": float(data.starting_bid),
        "current_bid": float(data.starting_bid),
        "buy_now_price": float(data.buy_now_price) if data.buy_now_price else None,
        "buy_now_only": data.buy_now_only,
        "accepts_offers": data.accepts_offers,
        "reserve_price": float(data.reserve_price) if data.reserve_price else None,
        # New fields
        "currency": data.currency,
        "quantity": data.quantity,
        "weight": data.weight,
        "weight_unit": data.weight_unit,
        "delivery_options": delivery_options,
        "shipping_from": data.shipping_from or data.location,
        # Timestamps
        "starts_at": now.isoformat(),
        "ends_at": ends_at.isoformat(),
        "is_active": True,
        "bid_count": 0,
        "winner_id": None,
        "escrow_id": None,
        "created_at": now.isoformat()
    }
    
    await db.auctions.insert_one(auction_doc)
    
    # Increment free trial usage if applicable
    if allowance.get("listing_type") in ["free_trial", "free_trial_eligible"]:
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"free_trial_listings_used": 1}}
        )
    
    return {k: v for k, v in auction_doc.items() if k != "_id"}

@api_router.get("/auctions/{auction_id}")
async def get_auction(auction_id: str):
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Add seller rating
    seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0, "rating_avg": 1, "rating_count": 1})
    auction["seller_rating"] = seller.get("rating_avg", 0) if seller else 0
    auction["seller_rating_count"] = seller.get("rating_count", 0) if seller else 0
    
    # Ensure new fields have default values for legacy auctions
    auction.setdefault("buy_now_only", False)
    auction.setdefault("accepts_offers", False)
    
    # Check if there's a review for this auction
    review = await db.reviews.find_one({"auction_id": auction_id}, {"_id": 0})
    auction["has_review"] = review is not None
    
    return auction

@api_router.get("/auctions/{auction_id}/bids")
async def get_auction_bids(auction_id: str, limit: int = 20):
    bids = await db.bids.find({"auction_id": auction_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bids

@api_router.post("/auctions/{auction_id}/bids")
@limiter.limit("30/minute")
async def place_bid(request: Request, auction_id: str, data: BidCreate, user: dict = Depends(get_current_user)):
    # Check if buyer is suspended
    is_suspended, suspended_until = await check_buyer_suspended(user["id"])
    if is_suspended:
        raise HTTPException(
            status_code=403, 
            detail=f"Your account is suspended until {suspended_until} due to multiple auction cancellations."
        )
    
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if auction.get("buy_now_only"):
        raise HTTPException(status_code=400, detail="This is a Buy Now only listing. Bidding is not allowed.")
    
    if datetime.fromisoformat(auction["ends_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if auction["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot bid on your own auction")
    
    if not user.get("phone_verified", False):
        raise HTTPException(status_code=403, detail="Phone verification is mandatory. Please verify your phone number before bidding.")
    
    if data.amount <= auction["current_bid"]:
        raise HTTPException(status_code=400, detail="Bid must be higher than current bid")
    
    previous_winner_id = auction.get("winner_id")
    
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
    
    await db.auctions.update_one(
        {"id": auction_id},
        {
            "$set": {"current_bid": float(data.amount), "winner_id": user["id"]},
            "$inc": {"bid_count": 1}
        }
    )
    
    updated_auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    
    await broadcast_bid_update(auction_id, {k: v for k, v in bid_doc.items() if k != "_id"}, updated_auction)
    
    # Get seller for notifications
    seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
    
    # Send notifications
    if data.amount >= HIGH_VALUE_BID_THRESHOLD:
        # SMS to seller
        if auction.get("seller_phone"):
            await SMSService.send_bid_notification(
                auction["seller_phone"],
                auction["title"],
                data.amount,
                user["name"]
            )
        
        # SMS to previous bidder
        if previous_winner_id and previous_winner_id != user["id"]:
            prev_bidder = await db.users.find_one({"id": previous_winner_id}, {"_id": 0})
            if prev_bidder and prev_bidder.get("phone") and prev_bidder.get("phone_verified"):
                await SMSService.send_outbid_notification(
                    prev_bidder["phone"],
                    auction["title"],
                    data.amount
                )
    
    # Email notifications (all bids)
    if seller:
        await EmailService.send_new_bid_notification(
            seller["email"],
            seller["name"],
            auction["title"],
            data.amount,
            user["name"]
        )
    
    if previous_winner_id and previous_winner_id != user["id"]:
        prev_bidder = await db.users.find_one({"id": previous_winner_id}, {"_id": 0})
        if prev_bidder:
            await EmailService.send_outbid_notification(
                prev_bidder["email"],
                prev_bidder["name"],
                auction["title"],
                data.amount
            )
    
    return {
        "bid": {k: v for k, v in bid_doc.items() if k != "_id"},
        "auction": updated_auction
    }

# ================== BUY NOW ==================

@api_router.post("/auctions/{auction_id}/buy-now")
@limiter.limit("10/minute")
async def buy_now(request: Request, auction_id: str, data: BuyNowRequest, user: dict = Depends(get_current_user)):
    # Check if buyer is suspended
    is_suspended, suspended_until = await check_buyer_suspended(user["id"])
    if is_suspended:
        raise HTTPException(
            status_code=403, 
            detail=f"Your account is suspended until {suspended_until} due to multiple auction cancellations."
        )
    
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if datetime.fromisoformat(auction["ends_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if auction["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own auction")
    
    if not user.get("phone_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your phone number before purchasing")
    
    if not auction.get("buy_now_price"):
        raise HTTPException(status_code=400, detail="This auction does not have a Buy Now option")
    
    # Validate delivery option
    available_delivery_options = auction.get("delivery_options", [])
    selected_delivery = data.delivery_option
    delivery_cost = 0.0
    
    if available_delivery_options and selected_delivery:
        # Find the selected delivery option
        delivery_match = None
        for opt in available_delivery_options:
            if opt.get("type") == selected_delivery:
                delivery_match = opt
                break
        
        if not delivery_match:
            raise HTTPException(status_code=400, detail=f"Invalid delivery option: {selected_delivery}")
        
        delivery_cost = delivery_match.get("cost", 0.0)
    elif available_delivery_options and not selected_delivery:
        # Default to first available delivery option
        selected_delivery = available_delivery_options[0].get("type", "local_pickup")
        delivery_cost = available_delivery_options[0].get("cost", 0.0)
    
    buy_now_price = float(auction["buy_now_price"])
    total_amount = buy_now_price + delivery_cost
    
    # Get currency from auction (default USD)
    currency = auction.get("currency", "USD").lower()
    currency_symbol = "₦" if currency == "ngn" else "$"
    
    # Store order details
    order_details = {
        "delivery_option": selected_delivery,
        "delivery_address": data.delivery_address,
        "delivery_cost": delivery_cost,
        "item_price": buy_now_price,
        "total_amount": total_amount,
        "currency": currency.upper()
    }
    
    if data.payment_method == "stripe":
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{data.origin_url}/payment/cancel"
        
        checkout_request = CheckoutSessionRequest(
            amount=total_amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "auction_id": auction_id,
                "user_id": user["id"],
                "auction_title": auction["title"],
                "type": "buy_now",
                "delivery_option": selected_delivery or "",
                "delivery_cost": str(delivery_cost)
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        payment_id = str(uuid.uuid4())
        payment_doc = {
            "id": payment_id,
            "session_id": session.session_id,
            "auction_id": auction_id,
            "user_id": user["id"],
            "amount": total_amount,
            "currency": currency.upper(),
            "payment_method": "stripe",
            "payment_status": "pending",
            "payment_type": "buy_now",
            "order_details": order_details,
            "metadata": {"auction_title": auction["title"]},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(payment_doc)
        
        await db.auctions.update_one(
            {"id": auction_id},
            {"$set": {
                "is_active": False,
                "winner_id": user["id"],
                "current_bid": buy_now_price,
                "sold_via": "buy_now",
                "order_details": order_details
            }}
        )
        
        await broadcast_auction_sold(auction_id, auction, user["name"])
        
        return {"url": session.url, "session_id": session.session_id, "payment_method": "stripe"}
    
    elif data.payment_method == "paypal":
        paypal_order = await PayPalService.create_order(
            amount=total_amount,
            currency=currency.upper(),
            auction_id=auction_id,
            description=f"Buy Now: {auction['title']} ({selected_delivery or 'No delivery'})"
        )
        
        payment_id = str(uuid.uuid4())
        payment_doc = {
            "id": payment_id,
            "paypal_order_id": paypal_order["order_id"],
            "auction_id": auction_id,
            "user_id": user["id"],
            "amount": total_amount,
            "currency": currency.upper(),
            "payment_method": "paypal",
            "payment_status": "pending",
            "payment_type": "buy_now",
            "order_details": order_details,
            "metadata": {"auction_title": auction["title"]},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(payment_doc)
        
        await db.auctions.update_one(
            {"id": auction_id},
            {"$set": {
                "is_active": False,
                "winner_id": user["id"],
                "current_bid": buy_now_price,
                "sold_via": "buy_now",
                "order_details": order_details
            }}
        )
        
        await broadcast_auction_sold(auction_id, auction, user["name"])
        
        return {
            "order_id": paypal_order["order_id"],
            "payment_method": "paypal",
            "mock_mode": PAYPAL_MOCK_MODE
        }

# ================== PAYPAL ROUTES ==================

@api_router.post("/paypal/capture/{order_id}")
async def capture_paypal_order(order_id: str, user: dict = Depends(get_current_user)):
    payment = await db.payment_transactions.find_one({"paypal_order_id": order_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await PayPalService.capture_order(order_id)
    
    if result["success"]:
        await db.payment_transactions.update_one(
            {"paypal_order_id": order_id},
            {"$set": {
                "payment_status": "paid",
                "capture_id": result.get("capture_id"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        auction = await db.auctions.find_one({"id": payment["auction_id"]}, {"_id": 0})
        escrow = await EscrowService.create_escrow(
            auction_id=payment["auction_id"],
            buyer_id=user["id"],
            seller_id=auction["seller_id"],
            amount=payment["amount"],
            payment_method="paypal",
            payment_id=order_id
        )
        
        await db.auctions.update_one(
            {"id": payment["auction_id"]},
            {"$set": {"escrow_id": escrow["id"], "is_paid": True}}
        )
        
        # Send notifications
        seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
        if seller:
            await EmailService.send_payment_received_notification(
                seller["email"],
                seller["name"],
                auction["title"],
                payment["amount"],
                user["name"]
            )
            if seller.get("phone") and seller.get("phone_verified"):
                await SMSService.send_sms(
                    seller["phone"],
                    f"Payment received for '{auction['title']}'! Amount: ${payment['amount']:.2f}. Funds in escrow."
                )
        
        return {"success": True, "escrow_id": escrow["id"], "mock_mode": PAYPAL_MOCK_MODE}
    
    raise HTTPException(status_code=400, detail="Failed to capture payment")

@api_router.get("/paypal/mock-approve/{order_id}")
async def mock_approve_paypal(order_id: str):
    if not PAYPAL_MOCK_MODE:
        raise HTTPException(status_code=404, detail="Not available")
    
    return {
        "message": "MOCK PayPal Approval Page",
        "order_id": order_id,
        "instructions": "Call POST /api/paypal/capture/{order_id} to complete the payment"
    }

# ================== ESCROW ROUTES ==================

@api_router.post("/escrow/confirm-delivery")
async def confirm_delivery(data: DeliveryConfirmation, user: dict = Depends(get_current_user)):
    escrow = await db.escrow.find_one({"id": data.escrow_id}, {"_id": 0})
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    
    if escrow["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm delivery")
    
    result = await EscrowService.release_escrow(data.escrow_id)
    
    # Get auction and seller for notifications
    auction = await db.auctions.find_one({"id": escrow["auction_id"]}, {"_id": 0})
    seller = await db.users.find_one({"id": escrow["seller_id"]}, {"_id": 0})
    
    # Create review if rating provided
    if data.rating and auction and seller:
        existing_review = await db.reviews.find_one({
            "auction_id": escrow["auction_id"],
            "reviewer_id": user["id"]
        })
        
        if not existing_review:
            review_id = str(uuid.uuid4())
            review_doc = {
                "id": review_id,
                "auction_id": escrow["auction_id"],
                "seller_id": escrow["seller_id"],
                "reviewer_id": user["id"],
                "reviewer_name": user["name"],
                "rating": data.rating,
                "comment": data.review_comment or "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.reviews.insert_one(review_doc)
            
            # Update seller's average rating
            all_reviews = await db.reviews.find({"seller_id": escrow["seller_id"]}, {"_id": 0}).to_list(1000)
            total_rating = sum(r["rating"] for r in all_reviews)
            avg_rating = total_rating / len(all_reviews) if all_reviews else 0
            
            await db.users.update_one(
                {"id": escrow["seller_id"]},
                {"$set": {"rating_avg": round(avg_rating, 2), "rating_count": len(all_reviews)}}
            )
            
            # Notify seller of review
            await EmailService.send_review_received_notification(
                seller["email"],
                seller["name"],
                data.rating,
                user["name"]
            )
            
            result["review_created"] = True
    
    if seller and auction:
        await EmailService.send_delivery_confirmed_notification(
            seller["email"],
            seller["name"],
            auction["title"],
            escrow["amount"]
        )
        if seller.get("phone") and seller.get("phone_verified"):
            currency = auction.get("currency", "USD")
            symbol = "₦" if currency == "NGN" else "$"
            await SMSService.send_sms(
                seller["phone"],
                f"Payment released! {symbol}{escrow['amount']:.2f} from escrow is now available. Thank you for using Jarnnmarket!"
            )
    
    return result

@api_router.get("/escrow/{escrow_id}")
async def get_escrow(escrow_id: str, user: dict = Depends(get_current_user)):
    escrow = await db.escrow.find_one({"id": escrow_id}, {"_id": 0})
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    
    if escrow["buyer_id"] != user["id"] and escrow["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return escrow

@api_router.get("/users/me/escrows")
async def get_my_escrows(user: dict = Depends(get_current_user)):
    escrows = await db.escrow.find(
        {"$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return escrows

# ================== BUYER CANCELLATION ROUTES ==================

@api_router.post("/auctions/{auction_id}/cancel-win")
async def cancel_auction_win(auction_id: str, data: CancelAuctionWin, user: dict = Depends(get_current_user)):
    """Cancel a winning bid - counts towards suspension threshold"""
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.get("winner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You are not the winner of this auction")
    
    # Check if already paid
    if auction.get("is_paid"):
        raise HTTPException(status_code=400, detail="Cannot cancel - auction already paid")
    
    # Record the cancellation
    result = await record_buyer_cancellation(user["id"], auction_id, data.reason)
    
    # Reset auction to allow rebidding or relist
    await db.auctions.update_one(
        {"id": auction_id},
        {"$set": {
            "winner_id": None,
            "is_active": True,
            "cancelled_by_winner": True,
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify seller
    seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
    if seller:
        await EmailService.send_email(
            seller["email"],
            f"Buyer Cancelled - {auction['title']}",
            f"""<div style="font-family: Arial, sans-serif;">
                <h2>Buyer Cancelled Their Win</h2>
                <p>Hi {seller['name']},</p>
                <p>Unfortunately, the winning buyer has cancelled their purchase of "{auction['title']}".</p>
                <p>Your listing has been automatically reactivated for new bids.</p>
                <p>Reason given: {data.reason or 'No reason provided'}</p>
            </div>""",
            f"Hi {seller['name']}, the buyer cancelled their win for '{auction['title']}'. Your listing has been reactivated."
        )
    
    response = {
        "success": True,
        "message": "Auction win cancelled",
        "cancellation_count": result["total_cancellations"],
        "max_before_suspension": MAX_CANCELLATIONS_BEFORE_SUSPENSION
    }
    
    if result["suspended"]:
        response["warning"] = f"Your account has been suspended until {result['suspended_until']} due to multiple cancellations."
        response["suspended"] = True
        response["suspended_until"] = result["suspended_until"]
    elif result["total_cancellations"] == MAX_CANCELLATIONS_BEFORE_SUSPENSION - 1:
        response["warning"] = "Warning: One more cancellation will result in account suspension."
    
    return response

@api_router.get("/users/me/cancellations")
async def get_my_cancellations(user: dict = Depends(get_current_user)):
    """Get buyer's cancellation history"""
    ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    cancellations = await db.buyer_cancellations.find(
        {"user_id": user["id"], "created_at": {"$gte": ninety_days_ago}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    is_suspended, suspended_until = await check_buyer_suspended(user["id"])
    
    return {
        "cancellations": cancellations,
        "count": len(cancellations),
        "max_before_suspension": MAX_CANCELLATIONS_BEFORE_SUSPENSION,
        "is_suspended": is_suspended,
        "suspended_until": suspended_until
    }

# ================== SELLER FREE TRIAL ROUTES ==================

@api_router.get("/sellers/me/listing-allowance")
async def get_my_listing_allowance(user: dict = Depends(get_current_user)):
    """Get seller's current listing allowance"""
    if user.get("role") != "farmer":
        raise HTTPException(status_code=403, detail="Only sellers can access this")
    
    return await get_seller_listing_allowance(user["id"])

@api_router.post("/sellers/activate-free-trial")
async def activate_free_trial(user: dict = Depends(get_current_user)):
    """Activate free trial for new sellers"""
    if user.get("role") != "farmer":
        raise HTTPException(status_code=403, detail="Only sellers can activate free trial")
    
    # Check if already used free trial
    if user.get("free_trial_start"):
        raise HTTPException(status_code=400, detail="Free trial already used")
    
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=FREE_TRIAL_DAYS)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "free_trial_start": now.isoformat(),
            "free_trial_listings_used": 0
        }}
    )
    
    logger.info(f"Free trial activated for seller {user['id']}")
    
    return {
        "success": True,
        "message": f"Free trial activated! You can create up to {FREE_TRIAL_LISTINGS} listings in the next {FREE_TRIAL_DAYS} days.",
        "trial_start": now.isoformat(),
        "trial_end": trial_end.isoformat(),
        "free_listings": FREE_TRIAL_LISTINGS
    }

# ================== OFFER ROUTES ==================

@api_router.post("/auctions/{auction_id}/offers")
@limiter.limit("10/minute")
async def create_offer(request: Request, auction_id: str, data: OfferCreate, user: dict = Depends(get_current_user)):
    """Create an offer on an auction that accepts offers"""
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction.get("accepts_offers"):
        raise HTTPException(status_code=400, detail="This auction does not accept offers")
    
    if not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if auction["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot make an offer on your own auction")
    
    if not user.get("phone_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your phone number before making offers")
    
    # Check if user already has a pending offer
    existing_offer = await db.offers.find_one({
        "auction_id": auction_id,
        "buyer_id": user["id"],
        "status": "pending"
    })
    if existing_offer:
        raise HTTPException(status_code=400, detail="You already have a pending offer on this auction")
    
    offer_id = str(uuid.uuid4())
    offer_doc = {
        "id": offer_id,
        "auction_id": auction_id,
        "buyer_id": user["id"],
        "buyer_name": user["name"],
        "seller_id": auction["seller_id"],
        "amount": float(data.amount),
        "message": data.message,
        "status": "pending",  # pending, accepted, rejected, expired
        "created_at": datetime.now(timezone.utc).isoformat(),
        "responded_at": None
    }
    
    await db.offers.insert_one(offer_doc)
    
    # Notify seller
    seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
    if seller:
        await EmailService.send_email(
            seller["email"],
            f"New Offer on '{auction['title']}'",
            f"<p>{user['name']} made an offer of ${data.amount:.2f} on your auction '{auction['title']}'.</p>",
            f"{user['name']} made an offer of ${data.amount:.2f} on '{auction['title']}'."
        )
    
    return {k: v for k, v in offer_doc.items() if k != "_id"}

@api_router.get("/auctions/{auction_id}/offers")
async def get_auction_offers(auction_id: str, user: dict = Depends(get_current_user)):
    """Get offers for an auction (seller only)"""
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the seller can view all offers")
    
    offers = await db.offers.find({"auction_id": auction_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return offers

@api_router.post("/offers/{offer_id}/respond")
async def respond_to_offer(offer_id: str, data: OfferResponse, user: dict = Depends(get_current_user)):
    """Accept or reject an offer"""
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the seller can respond to offers")
    
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Offer is no longer pending")
    
    auction = await db.auctions.find_one({"id": offer["auction_id"]}, {"_id": 0})
    if not auction or not auction["is_active"]:
        raise HTTPException(status_code=400, detail="Auction is no longer active")
    
    await db.offers.update_one(
        {"id": offer_id},
        {"$set": {
            "status": data.status,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If accepted, mark auction as sold
    if data.status == "accepted":
        await db.auctions.update_one(
            {"id": offer["auction_id"]},
            {"$set": {
                "is_active": False,
                "winner_id": offer["buyer_id"],
                "current_bid": offer["amount"],
                "sold_via": "offer"
            }}
        )
        
        # Reject all other pending offers
        await db.offers.update_many(
            {"auction_id": offer["auction_id"], "id": {"$ne": offer_id}, "status": "pending"},
            {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Notify buyer
        buyer = await db.users.find_one({"id": offer["buyer_id"]}, {"_id": 0})
        if buyer:
            await EmailService.send_email(
                buyer["email"],
                f"Your Offer on '{auction['title']}' Was Accepted!",
                f"<p>Congratulations! Your offer of ${offer['amount']:.2f} on '{auction['title']}' was accepted. Please complete the payment.</p>",
                f"Your offer of ${offer['amount']:.2f} on '{auction['title']}' was accepted!"
            )
    else:
        # Notify buyer of rejection
        buyer = await db.users.find_one({"id": offer["buyer_id"]}, {"_id": 0})
        if buyer:
            await EmailService.send_email(
                buyer["email"],
                f"Your Offer on '{auction['title']}' Was Declined",
                f"<p>Unfortunately, your offer of ${offer['amount']:.2f} on '{auction['title']}' was declined by the seller.</p>",
                f"Your offer of ${offer['amount']:.2f} on '{auction['title']}' was declined."
            )
    
    return {"success": True, "status": data.status}

@api_router.get("/users/me/offers")
async def get_my_offers(user: dict = Depends(get_current_user)):
    """Get offers made by the current user"""
    offers = await db.offers.find({"buyer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add auction details
    auction_ids = list(set([o["auction_id"] for o in offers]))
    auctions = await db.auctions.find({"id": {"$in": auction_ids}}, {"_id": 0}).to_list(100)
    auctions_map = {a["id"]: a for a in auctions}
    
    for offer in offers:
        offer["auction"] = auctions_map.get(offer["auction_id"])
    
    return offers

# ================== PAYOUT ROUTES ==================

@api_router.get("/users/me/payouts")
async def get_my_payouts(user: dict = Depends(get_current_user)):
    """Get payout history for seller"""
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can view payouts")
    
    payouts = await db.payouts.find({"seller_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_released = sum(p["amount"] for p in payouts if p["status"] == "completed")
    total_pending = sum(p["amount"] for p in payouts if p["status"] == "pending")
    
    return {
        "payouts": payouts,
        "total_released": total_released,
        "total_pending": total_pending
    }

@api_router.post("/payouts/request")
async def request_payout(data: PayoutRequest, user: dict = Depends(get_current_user)):
    """Request payout for released escrow funds"""
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can request payouts")
    
    escrow = await db.escrow.find_one({"id": data.escrow_id}, {"_id": 0})
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    
    if escrow["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if escrow["status"] != "released":
        raise HTTPException(status_code=400, detail="Escrow funds have not been released yet")
    
    # Check if payout already exists
    existing_payout = await db.payouts.find_one({"escrow_id": data.escrow_id})
    if existing_payout:
        raise HTTPException(status_code=400, detail="Payout already requested for this escrow")
    
    payout_id = str(uuid.uuid4())
    payout_doc = {
        "id": payout_id,
        "escrow_id": data.escrow_id,
        "auction_id": escrow["auction_id"],
        "seller_id": user["id"],
        "amount": escrow["amount"],
        "currency": escrow.get("currency", "usd"),
        "status": "pending",  # pending, processing, completed, failed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None
    }
    
    await db.payouts.insert_one(payout_doc)
    
    # In a real system, this would trigger actual bank transfer
    # For now, we'll auto-complete the payout (mock)
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {
            "status": "completed",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[MOCK PAYOUT] Processed payout {payout_id} for ${escrow['amount']:.2f} to seller {user['id']}")
    
    return {
        "success": True,
        "payout_id": payout_id,
        "amount": escrow["amount"],
        "status": "completed",
        "mock": True
    }

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

# ================== NOTIFICATIONS ROUTES ==================

@api_router.get("/users/me/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get notifications for the current user (pending offers, outbid alerts, won auctions)"""
    notifications = []
    now = datetime.now(timezone.utc)
    
    if user["role"] == "farmer":
        # For sellers: pending offers on their auctions
        pending_offers = await db.offers.find({
            "seller_id": user["id"],
            "status": "pending"
        }, {"_id": 0}).sort("created_at", -1).to_list(20)
        
        for offer in pending_offers:
            auction = await db.auctions.find_one({"id": offer["auction_id"]}, {"_id": 0, "title": 1})
            notifications.append({
                "id": f"offer-{offer['id']}",
                "type": "offer_received",
                "title": "New Offer",
                "message": f"{offer['buyer_name']} offered ${offer['amount']:.2f} on '{auction['title'] if auction else 'your listing'}'",
                "amount": offer["amount"],
                "auction_id": offer["auction_id"],
                "created_at": offer["created_at"],
                "read": False
            })
        
        # For sellers: escrows awaiting delivery confirmation
        held_escrows = await db.escrow.find({
            "seller_id": user["id"],
            "status": "held"
        }, {"_id": 0}).to_list(10)
        
        for escrow in held_escrows:
            notifications.append({
                "id": f"escrow-{escrow['id']}",
                "type": "escrow_held",
                "title": "Awaiting Delivery",
                "message": f"${escrow['amount']:.2f} held in escrow - awaiting buyer confirmation",
                "amount": escrow["amount"],
                "auction_id": escrow["auction_id"],
                "created_at": escrow["created_at"],
                "read": False
            })
        
        # For sellers: released escrows ready for payout
        released_escrows = await db.escrow.find({
            "seller_id": user["id"],
            "status": "released"
        }, {"_id": 0}).to_list(10)
        
        for escrow in released_escrows:
            # Check if payout already requested
            payout = await db.payouts.find_one({"escrow_id": escrow["id"]})
            if not payout:
                notifications.append({
                    "id": f"payout-{escrow['id']}",
                    "type": "payout_ready",
                    "title": "Payout Ready",
                    "message": f"${escrow['amount']:.2f} ready for payout - delivery confirmed",
                    "amount": escrow["amount"],
                    "auction_id": escrow["auction_id"],
                    "escrow_id": escrow["id"],
                    "created_at": escrow.get("released_at", escrow["created_at"]),
                    "read": False
                })
    else:
        # For buyers: offer responses
        my_offers = await db.offers.find({
            "buyer_id": user["id"],
            "status": {"$in": ["accepted", "rejected"]},
            "responded_at": {"$ne": None}
        }, {"_id": 0}).sort("responded_at", -1).to_list(10)
        
        for offer in my_offers:
            auction = await db.auctions.find_one({"id": offer["auction_id"]}, {"_id": 0, "title": 1})
            notifications.append({
                "id": f"offer-response-{offer['id']}",
                "type": f"offer_{offer['status']}",
                "title": f"Offer {offer['status'].capitalize()}",
                "message": f"Your ${offer['amount']:.2f} offer on '{auction['title'] if auction else 'listing'}' was {offer['status']}",
                "amount": offer["amount"],
                "auction_id": offer["auction_id"],
                "created_at": offer["responded_at"],
                "read": False
            })
        
        # For buyers: won auctions needing payment
        won_auctions = await db.auctions.find({
            "winner_id": user["id"],
            "is_paid": {"$ne": True}
        }, {"_id": 0}).to_list(10)
        
        for auction in won_auctions:
            notifications.append({
                "id": f"won-{auction['id']}",
                "type": "auction_won",
                "title": "You Won!",
                "message": f"Pay ${auction['current_bid']:.2f} for '{auction['title']}'",
                "amount": auction["current_bid"],
                "auction_id": auction["id"],
                "created_at": auction.get("ends_at", auction["created_at"]),
                "read": False
            })
        
        # For buyers: pending delivery confirmations
        buyer_escrows = await db.escrow.find({
            "buyer_id": user["id"],
            "status": "held"
        }, {"_id": 0}).to_list(10)
        
        for escrow in buyer_escrows:
            auction = await db.auctions.find_one({"id": escrow["auction_id"]}, {"_id": 0, "title": 1})
            notifications.append({
                "id": f"delivery-{escrow['id']}",
                "type": "pending_delivery",
                "title": "Confirm Delivery",
                "message": f"Received '{auction['title'] if auction else 'your order'}'? Confirm to release payment",
                "amount": escrow["amount"],
                "auction_id": escrow["auction_id"],
                "escrow_id": escrow["id"],
                "created_at": escrow["created_at"],
                "read": False
            })
        
        # For buyers: outbid on auctions
        my_bids = await db.bids.find({"bidder_id": user["id"]}, {"_id": 0}).to_list(50)
        auction_ids = list(set([b["auction_id"] for b in my_bids]))
        
        for auction_id in auction_ids[:10]:
            auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
            if auction and auction["is_active"] and auction.get("winner_id") != user["id"]:
                # User is outbid
                highest_bid = await db.bids.find_one(
                    {"auction_id": auction_id},
                    {"_id": 0},
                    sort=[("amount", -1)]
                )
                if highest_bid and highest_bid["bidder_id"] != user["id"]:
                    notifications.append({
                        "id": f"outbid-{auction_id}",
                        "type": "outbid",
                        "title": "Outbid!",
                        "message": f"You've been outbid on '{auction['title']}' - current: ${auction['current_bid']:.2f}",
                        "amount": auction["current_bid"],
                        "auction_id": auction_id,
                        "created_at": highest_bid["created_at"],
                        "read": False
                    })
    
    # Sort by created_at descending
    notifications.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "notifications": notifications[:20],
        "unread_count": len(notifications)
    }

# ================== SUBSCRIPTION ROUTES ==================

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "plans": list(SUBSCRIPTION_PLANS.values()),
        "currencies": SUPPORTED_CURRENCIES
    }

@api_router.get("/users/me/subscription")
async def get_my_subscription(user: dict = Depends(get_current_user)):
    """Get current user's subscription status"""
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can have subscriptions")
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user["id"], "status": "active"},
        {"_id": 0}
    )
    
    if subscription:
        # Check if expired
        if datetime.fromisoformat(subscription["expires_at"]) < datetime.now(timezone.utc):
            await db.subscriptions.update_one(
                {"id": subscription["id"]},
                {"$set": {"status": "expired"}}
            )
            subscription["status"] = "expired"
    
    return {
        "has_subscription": subscription is not None and subscription.get("status") == "active",
        "subscription": subscription
    }

@api_router.post("/subscriptions/subscribe")
@limiter.limit("5/minute")
async def create_subscription(request: Request, data: SubscriptionCreate, user: dict = Depends(get_current_user)):
    """Subscribe to a plan"""
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can subscribe")
    
    if not user.get("phone_verified", False):
        raise HTTPException(status_code=403, detail="Phone verification required before subscribing")
    
    plan = SUBSCRIPTION_PLANS.get(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Check for existing active subscription
    existing = await db.subscriptions.find_one({
        "user_id": user["id"],
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active subscription")
    
    # Get price based on currency
    price = plan["price_ngn"] if data.currency == "NGN" else plan["price_usd"]
    currency_symbol = CURRENCY_SYMBOLS.get(data.currency, "$")
    
    subscription_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=plan["duration_days"])
    
    subscription_doc = {
        "id": subscription_id,
        "user_id": user["id"],
        "plan_id": data.plan_id,
        "plan_name": plan["name"],
        "price": price,
        "currency": data.currency,
        "duration_days": plan["duration_days"],
        "features": plan["features"],
        "status": "pending",  # Will be active after payment
        "created_at": now.isoformat(),
        "starts_at": None,
        "expires_at": None,
        "payment_id": None
    }
    
    await db.subscriptions.insert_one(subscription_doc)
    
    # For now, mock the payment and activate immediately
    # In production, this would redirect to Stripe/PayPal
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {
            "status": "active",
            "starts_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "payment_id": f"MOCK_SUB_{uuid.uuid4().hex[:12]}"
        }}
    )
    
    logger.info(f"[MOCK SUBSCRIPTION] User {user['id']} subscribed to {plan['name']} for {currency_symbol}{price}")
    
    return {
        "success": True,
        "subscription_id": subscription_id,
        "plan": plan["name"],
        "price": price,
        "currency": data.currency,
        "expires_at": expires_at.isoformat(),
        "mock": True
    }

@api_router.post("/subscriptions/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel current subscription"""
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can have subscriptions")
    
    subscription = await db.subscriptions.find_one({
        "user_id": user["id"],
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Subscription cancelled"}

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
        "payment_method": "stripe",
        "payment_status": "pending",
        "metadata": {"auction_title": auction["title"]},
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
                auction = await db.auctions.find_one({"id": payment["auction_id"]}, {"_id": 0})
                
                escrow = await EscrowService.create_escrow(
                    auction_id=payment["auction_id"],
                    buyer_id=user["id"],
                    seller_id=auction["seller_id"],
                    amount=payment["amount"],
                    payment_method="stripe",
                    payment_id=session_id
                )
                
                await db.auctions.update_one(
                    {"id": payment["auction_id"]},
                    {"$set": {"is_paid": True, "escrow_id": escrow["id"]}}
                )
                
                # Send notifications
                seller = await db.users.find_one({"id": auction["seller_id"]}, {"_id": 0})
                if seller:
                    await EmailService.send_payment_received_notification(
                        seller["email"],
                        seller["name"],
                        auction["title"],
                        payment["amount"],
                        user["name"]
                    )
                    if seller.get("phone") and seller.get("phone_verified"):
                        await SMSService.send_sms(
                            seller["phone"],
                            f"Payment received for '{auction['title']}'! Amount: ${payment['amount']:.2f}. Funds in escrow."
                        )
                
                # Notify winner
                await EmailService.send_auction_won_notification(
                    user["email"],
                    user["name"],
                    auction["title"],
                    payment["amount"]
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
            payment = await db.payment_transactions.find_one({"session_id": event.session_id})
            if payment:
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "event_id": event.event_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                auction = await db.auctions.find_one({"id": payment["auction_id"]})
                if auction and not auction.get("escrow_id"):
                    escrow = await EscrowService.create_escrow(
                        auction_id=payment["auction_id"],
                        buyer_id=payment["user_id"],
                        seller_id=auction["seller_id"],
                        amount=payment["amount"],
                        payment_method="stripe",
                        payment_id=event.session_id
                    )
                    
                    await db.auctions.update_one(
                        {"id": payment["auction_id"]},
                        {"$set": {"is_paid": True, "escrow_id": escrow["id"]}}
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
    total_reviews = await db.reviews.count_documents({})
    
    return {
        "total_auctions": total_auctions,
        "active_auctions": active_auctions,
        "total_users": total_users,
        "total_bids": total_bids,
        "total_reviews": total_reviews
    }

# ================== ADMIN ROUTES ==================

ADMIN_EMAILS = ['admin@jarnnmarket.com', 'info@jarnnmarket.com']

async def verify_admin(user: dict = Depends(get_current_user)):
    if user['email'] not in ADMIN_EMAILS and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(verify_admin)):
    total_users = await db.users.count_documents({})
    total_farmers = await db.users.count_documents({"role": "farmer"})
    total_buyers = await db.users.count_documents({"role": "buyer"})
    total_auctions = await db.auctions.count_documents({})
    active_auctions = await db.auctions.count_documents({
        "is_active": True,
        "ends_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    # Calculate total volume
    all_escrows = await db.escrow.find({}, {"_id": 0, "amount": 1, "status": 1}).to_list(None)
    total_escrow = sum(e['amount'] for e in all_escrows if e.get('status') == 'held')
    total_volume = sum(e['amount'] for e in all_escrows if e.get('status') == 'released')
    
    pending_payouts = await db.payouts.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_auctions": total_auctions,
        "active_auctions": active_auctions,
        "total_volume": total_volume,
        "total_escrow": total_escrow,
        "pending_payouts": pending_payouts
    }

@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(verify_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    return users

@api_router.get("/admin/auctions")
async def admin_get_auctions(admin: dict = Depends(verify_admin)):
    auctions = await db.auctions.find({}, {"_id": 0}).to_list(None)
    # Add seller names
    for auction in auctions:
        seller = await db.users.find_one({"id": auction.get("seller_id")}, {"_id": 0, "name": 1})
        auction['seller_name'] = seller['name'] if seller else 'Unknown'
    return auctions

@api_router.get("/admin/payouts")
async def admin_get_payouts(admin: dict = Depends(verify_admin)):
    payouts = await db.payouts.find({}, {"_id": 0}).to_list(None)
    # Add seller names
    for payout in payouts:
        seller = await db.users.find_one({"id": payout.get("seller_id")}, {"_id": 0, "name": 1})
        payout['seller_name'] = seller['name'] if seller else 'Unknown'
    return payouts

@api_router.post("/admin/payouts/{payout_id}/approve")
async def admin_approve_payout(payout_id: str, admin: dict = Depends(verify_admin)):
    payout = await db.payouts.find_one({"id": payout_id})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Payout is not pending")
    
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    logger.info(f"Admin {admin['email']} approved payout {payout_id}")
    return {"success": True, "message": "Payout approved"}

@api_router.post("/admin/payouts/{payout_id}/reject")
async def admin_reject_payout(payout_id: str, admin: dict = Depends(verify_admin)):
    payout = await db.payouts.find_one({"id": payout_id})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    if payout['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Payout is not pending")
    
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    logger.info(f"Admin {admin['email']} rejected payout {payout_id}")
    return {"success": True, "message": "Payout rejected"}

@api_router.post("/admin/users/{user_id}/toggle-status")
async def admin_toggle_user_status(user_id: str, admin: dict = Depends(verify_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get('is_active', True)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    logger.info(f"Admin {admin['email']} toggled user {user_id} status to {new_status}")
    return {"success": True, "is_active": new_status}

@api_router.post("/admin/users/{user_id}/verify")
async def admin_verify_seller(user_id: str, admin: dict = Depends(verify_admin)):
    """Verify a seller (adds verified badge)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user['role'] != 'farmer':
        raise HTTPException(status_code=400, detail="Only sellers can be verified")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": admin['email']
        }}
    )
    logger.info(f"Admin {admin['email']} verified seller {user_id}")
    return {"success": True, "message": "Seller verified successfully"}

@api_router.post("/admin/users/{user_id}/unverify")
async def admin_unverify_seller(user_id: str, admin: dict = Depends(verify_admin)):
    """Remove verified badge from seller"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": False}, "$unset": {"verified_at": "", "verified_by": ""}}
    )
    logger.info(f"Admin {admin['email']} unverified seller {user_id}")
    return {"success": True, "message": "Seller verification removed"}

@api_router.post("/admin/bulk/payouts")
async def admin_bulk_process_payouts(
    action: str = Query(..., description="Action: 'approve' or 'reject'"),
    payout_ids: str = Query(..., description="Comma-separated payout IDs"),
    admin: dict = Depends(verify_admin)
):
    """Bulk approve or reject payouts"""
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    # Parse comma-separated IDs
    ids_list = [id.strip() for id in payout_ids.split(',') if id.strip()]
    if not ids_list:
        raise HTTPException(status_code=400, detail="No payout IDs provided")
    
    status = 'completed' if action == 'approve' else 'rejected'
    timestamp_field = 'completed_at' if action == 'approve' else 'rejected_at'
    
    result = await db.payouts.update_many(
        {"id": {"$in": ids_list}, "status": "pending"},
        {"$set": {"status": status, timestamp_field: datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Admin {admin['email']} bulk {action}d {result.modified_count} payouts")
    return {"success": True, "processed": result.modified_count}

@api_router.post("/admin/bulk/users")
async def admin_bulk_update_users(
    action: str = Query(..., description="Action: 'activate', 'deactivate', 'verify', 'unverify'"),
    user_ids: str = Query(..., description="Comma-separated user IDs"),
    admin: dict = Depends(verify_admin)
):
    """Bulk update users"""
    # Parse comma-separated IDs
    ids_list = [id.strip() for id in user_ids.split(',') if id.strip()]
    if not ids_list:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    if action == 'activate':
        update = {"$set": {"is_active": True}}
    elif action == 'deactivate':
        update = {"$set": {"is_active": False}}
    elif action == 'verify':
        update = {"$set": {
            "is_verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_by": admin['email']
        }}
    elif action == 'unverify':
        update = {"$set": {"is_verified": False}, "$unset": {"verified_at": "", "verified_by": ""}}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # For verify/unverify, only apply to farmers
    query = {"id": {"$in": ids_list}}
    if action in ['verify', 'unverify']:
        query["role"] = "farmer"
    
    result = await db.users.update_many(query, update)
    
    logger.info(f"Admin {admin['email']} bulk {action} {result.modified_count} users")
    return {"success": True, "processed": result.modified_count}

@api_router.get("/admin/export/users")
async def admin_export_users(format: str = "json", admin: dict = Depends(verify_admin)):
    """Export users data"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    
    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        if users:
            # Collect all unique keys from all users
            all_keys = set()
            for u in users:
                all_keys.update(u.keys())
            all_keys = sorted(all_keys)
            
            # Ensure all users have all keys
            flat_users = []
            for u in users:
                flat = {}
                for k in all_keys:
                    v = u.get(k, '')
                    flat[k] = str(v) if isinstance(v, (list, dict)) else v
                flat_users.append(flat)
            
            writer = csv.DictWriter(output, fieldnames=all_keys)
            writer.writeheader()
            writer.writerows(flat_users)
        return {"format": "csv", "data": output.getvalue(), "count": len(users)}
    
    return {"format": "json", "data": users, "count": len(users)}

@api_router.get("/admin/export/auctions")
async def admin_export_auctions(format: str = "json", admin: dict = Depends(verify_admin)):
    """Export auctions data"""
    auctions = await db.auctions.find({}, {"_id": 0}).to_list(None)
    
    # Add seller names
    for auction in auctions:
        seller = await db.users.find_one({"id": auction.get("seller_id")}, {"_id": 0, "name": 1})
        auction['seller_name'] = seller['name'] if seller else 'Unknown'
    
    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        if auctions:
            # Collect all unique keys from all auctions
            all_keys = set()
            for a in auctions:
                all_keys.update(a.keys())
            all_keys = sorted(all_keys)
            
            # Flatten complex fields for CSV
            flat_auctions = []
            for a in auctions:
                flat = {}
                for k in all_keys:
                    v = a.get(k, '')
                    flat[k] = str(v) if isinstance(v, (list, dict)) else v
                flat_auctions.append(flat)
            
            writer = csv.DictWriter(output, fieldnames=all_keys)
            writer.writeheader()
            writer.writerows(flat_auctions)
        return {"format": "csv", "data": output.getvalue(), "count": len(auctions)}
    
    return {"format": "json", "data": auctions, "count": len(auctions)}

@api_router.get("/admin/export/transactions")
async def admin_export_transactions(format: str = "json", admin: dict = Depends(verify_admin)):
    """Export all transactions (escrow + payouts)"""
    escrows = await db.escrow.find({}, {"_id": 0}).to_list(None)
    payouts = await db.payouts.find({}, {"_id": 0}).to_list(None)
    
    # Combine and add type field
    transactions = []
    for e in escrows:
        e['type'] = 'escrow'
        transactions.append(e)
    for p in payouts:
        p['type'] = 'payout'
        transactions.append(p)
    
    # Sort by created_at
    transactions.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    if format == "csv":
        import csv
        import io
        output = io.StringIO()
        if transactions:
            all_keys = set()
            for t in transactions:
                all_keys.update(t.keys())
            writer = csv.DictWriter(output, fieldnames=sorted(all_keys))
            writer.writeheader()
            writer.writerows(transactions)
        return {"format": "csv", "data": output.getvalue(), "count": len(transactions)}
    
    return {"format": "json", "data": transactions, "count": len(transactions)}

# ================== SELLER ANALYTICS ROUTES ==================

@api_router.get("/sellers/me/analytics")
async def get_seller_analytics(user: dict = Depends(get_current_user)):
    if user['role'] != 'farmer':
        raise HTTPException(status_code=403, detail="Seller access required")
    
    seller_id = user['id']
    
    # Get all auctions by seller
    auctions = await db.auctions.find({"seller_id": seller_id}, {"_id": 0}).to_list(None)
    
    active_listings = sum(1 for a in auctions if a.get('is_active') and datetime.fromisoformat(a['ends_at']) > datetime.now(timezone.utc))
    
    # Get completed sales (paid auctions)
    completed_sales = sum(1 for a in auctions if a.get('is_paid'))
    
    # Calculate total revenue from escrow
    escrows = await db.escrow.find({"seller_id": seller_id}, {"_id": 0}).to_list(None)
    total_revenue = sum(e['amount'] for e in escrows if e.get('status') == 'released')
    
    # Calculate views (simple metric - count of unique viewers would require more tracking)
    total_views = sum(a.get('view_count', 0) for a in auctions)
    
    # Get total bids on seller's auctions
    auction_ids = [a['id'] for a in auctions]
    total_bids = await db.bids.count_documents({"auction_id": {"$in": auction_ids}})
    
    # Calculate conversion rate
    conversion_rate = (completed_sales / len(auctions) * 100) if auctions else 0
    
    # Average sale price
    avg_sale_price = total_revenue / completed_sales if completed_sales > 0 else 0
    
    # Get categories count
    category_count = {}
    for a in auctions:
        cat = a.get('category', 'Other')
        category_count[cat] = category_count.get(cat, 0) + 1
    top_categories = [{"name": k, "count": v} for k, v in sorted(category_count.items(), key=lambda x: -x[1])[:5]]
    
    return {
        "total_sales": completed_sales,
        "total_revenue": total_revenue,
        "total_views": total_views,
        "total_bids": total_bids,
        "conversion_rate": round(conversion_rate, 1),
        "avg_sale_price": round(avg_sale_price, 2),
        "active_listings": active_listings,
        "completed_sales": completed_sales,
        "rating_avg": user.get('rating_avg', 0),
        "rating_count": user.get('rating_count', 0),
        "revenue_trend": 0,  # Would require historical data tracking
        "top_categories": top_categories
    }

# ================== SEED DATA ==================

@api_router.post("/seed")
async def seed_data():
    existing = await db.auctions.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    farmers = [
        {"id": str(uuid.uuid4()), "name": "John Mwangi", "email": "john@farm.com", "phone": "+2348189275367", "phone_verified": True, "password_hash": hash_password("password123"), "role": "farmer", "rating_avg": 4.5, "rating_count": 12, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sarah Ochieng", "email": "sarah@farm.com", "phone": "+2348189275368", "phone_verified": True, "password_hash": hash_password("password123"), "role": "farmer", "rating_avg": 4.8, "rating_count": 8, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Peter Kamau", "email": "peter@farm.com", "phone": "+2348189275369", "phone_verified": True, "password_hash": hash_password("password123"), "role": "farmer", "rating_avg": 4.2, "rating_count": 5, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(farmers)
    
    buyer = {"id": str(uuid.uuid4()), "name": "Demo Buyer", "email": "buyer@demo.com", "phone": "+2348189275370", "phone_verified": True, "password_hash": hash_password("password123"), "role": "buyer", "rating_avg": 0, "rating_count": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.users.insert_one(buyer)
    
    now = datetime.now(timezone.utc)
    demo_auctions = [
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[0]["id"],
            "seller_name": farmers[0]["name"],
            "seller_phone": farmers[0]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[1]["id"],
            "seller_name": farmers[1]["name"],
            "seller_phone": farmers[1]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[2]["id"],
            "seller_name": farmers[2]["name"],
            "seller_phone": farmers[2]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[0]["id"],
            "seller_name": farmers[0]["name"],
            "seller_phone": farmers[0]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[1]["id"],
            "seller_name": farmers[1]["name"],
            "seller_phone": farmers[1]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "seller_id": farmers[2]["id"],
            "seller_name": farmers[2]["name"],
            "seller_phone": farmers[2]["phone"],
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
            "escrow_id": None,
            "created_at": now.isoformat()
        }
    ]
    
    await db.auctions.insert_many(demo_auctions)
    
    return {"message": "Seeded successfully", "auctions": len(demo_auctions), "users": len(farmers) + 1}

@api_router.get("/")
async def root():
    return {
        "message": "jarnnmarket API",
        "version": "3.0.0",
        "features": {
            "sms_verification": "mock" if TWILIO_MOCK_MODE else "live",
            "paypal": "mock" if PAYPAL_MOCK_MODE else "live",
            "email": "mock" if EMAIL_MOCK_MODE else "live",
            "escrow": "enabled",
            "reviews": "enabled"
        }
    }

# Include the router in the main app
app.include_router(api_router)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # Don't set strict CSP as it may break the frontend
    return response

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Limit"]
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Export the socket app for uvicorn
app = socket_app
