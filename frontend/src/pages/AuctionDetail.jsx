import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CountdownTimer from '@/components/CountdownTimer';
import PhoneVerification from '@/components/PhoneVerification';
import { MapPin, User, Calendar, Clock, TrendingUp, AlertCircle, CreditCard, Zap, ShoppingCart, Shield, Package, MessageSquare, Star, Send, DollarSign } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [escrow, setEscrow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const socketRef = useRef(null);

  const fetchAuction = useCallback(async () => {
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        axios.get(`${API}/auctions/${id}`),
        axios.get(`${API}/auctions/${id}/bids`)
      ]);
      setAuction(auctionRes.data);
      setBids(bidsRes.data);
      
      const endTime = new Date(auctionRes.data.ends_at).getTime();
      setIsExpired(Date.now() > endTime);
      setIsSold(auctionRes.data.sold_via === 'buy_now' || !auctionRes.data.is_active);
      
      if (!bidAmount) {
        setBidAmount((auctionRes.data.current_bid + 1).toFixed(2));
      }

      // Fetch escrow if paid
      if (auctionRes.data.escrow_id && token) {
        try {
          const escrowRes = await axios.get(`${API}/escrow/${auctionRes.data.escrow_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setEscrow(escrowRes.data);
        } catch (e) {
          // User might not have access
        }
      }
    } catch (error) {
      console.error('Failed to fetch auction:', error);
      toast.error('Auction not found');
      navigate('/auctions');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, bidAmount, token]);

  // WebSocket connection
  useEffect(() => {
    if (!id) return;

    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      socketRef.current.emit('join_auction', id);
    });

    socketRef.current.on('bid_update', (data) => {
      if (data.auction_id === id) {
        setAuction(prev => ({
          ...prev,
          current_bid: data.current_bid,
          bid_count: data.bid_count
        }));
        
        setBids(prev => [data.bid, ...prev]);
        setBidAmount((data.current_bid + 1).toFixed(2));
        
        if (user && data.bid.bidder_id !== user.id) {
          toast.info(`New bid: $${data.bid.amount.toFixed(2)} by ${data.bid.bidder_name}`);
        }
      }
    });

    socketRef.current.on('auction_sold', (data) => {
      if (data.auction_id === id) {
        setIsSold(true);
        setAuction(prev => ({
          ...prev,
          is_active: false,
          current_bid: data.final_price
        }));
        toast.success(`Auction sold to ${data.buyer_name} for $${data.final_price.toFixed(2)}!`);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_auction', id);
        socketRef.current.disconnect();
      }
    };
  }, [id, user]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  const checkPhoneVerification = () => {
    if (!user?.phone_verified) {
      setShowPhoneVerification(true);
      return false;
    }
    return true;
  };

  const handleBid = async () => {
    if (!user) {
      toast.error('Please login to place a bid');
      navigate('/auth');
      return;
    }

    if (!checkPhoneVerification()) return;

    if (!bidAmount || parseFloat(bidAmount) <= auction.current_bid) {
      toast.error('Bid must be higher than current bid');
      return;
    }

    setBidding(true);
    try {
      const response = await axios.post(
        `${API}/auctions/${id}/bids`,
        { amount: parseFloat(bidAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAuction(response.data.auction);
      setBids(prev => [response.data.bid, ...prev]);
      setBidAmount((response.data.auction.current_bid + 1).toFixed(2));
      toast.success('Bid placed successfully!');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to place bid';
      if (detail.includes('phone')) {
        setShowPhoneVerification(true);
      }
      toast.error(detail);
    } finally {
      setBidding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please login to buy');
      navigate('/auth');
      return;
    }

    if (!checkPhoneVerification()) return;

    setBuyingNow(true);
    try {
      const response = await axios.post(
        `${API}/auctions/${id}/buy-now`,
        { origin_url: window.location.origin, payment_method: paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (paymentMethod === 'stripe') {
        window.location.href = response.data.url;
      } else if (paymentMethod === 'paypal') {
        // For PayPal mock mode, show instructions
        if (response.data.mock_mode) {
          toast.success('PayPal order created (Mock Mode). Complete payment via API.');
          // In production, would redirect to PayPal
          navigate('/dashboard');
        } else {
          // Real PayPal would redirect here
        }
      }
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to process Buy Now';
      if (detail.includes('phone')) {
        setShowPhoneVerification(true);
      }
      toast.error(detail);
      setBuyingNow(false);
    }
  };

  const handlePayment = async () => {
    try {
      const response = await axios.post(
        `${API}/payments/create-checkout`,
        { 
          auction_id: id,
          origin_url: window.location.origin 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate payment');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!escrow) return;
    
    setConfirmingDelivery(true);
    try {
      await axios.post(
        `${API}/escrow/confirm-delivery`,
        { escrow_id: escrow.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery confirmed! Payment released to seller.');
      setEscrow(prev => ({ ...prev, status: 'released' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!user) {
      toast.error('Please login to make an offer');
      navigate('/auth');
      return;
    }

    if (!checkPhoneVerification()) return;

    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    setSubmittingOffer(true);
    try {
      await axios.post(
        `${API}/auctions/${id}/offers`,
        { 
          amount: parseFloat(offerAmount),
          message: offerMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Offer submitted! The seller will review it.');
      setShowOfferModal(false);
      setOfferAmount('');
      setOfferMessage('');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to submit offer';
      if (detail.includes('phone')) {
        setShowPhoneVerification(true);
      }
      toast.error(detail);
    } finally {
      setSubmittingOffer(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!auction) return null;

  const isWinner = user && auction.winner_id === user.id && (isExpired || isSold);
  const isSeller = user && auction.seller_id === user.id;
  const isBuyNowOnly = auction.buy_now_only;
  const acceptsOffers = auction.accepts_offers;
  const canBid = user && !isSeller && !isExpired && !isSold && auction.is_active && !isBuyNowOnly;
  const canBuyNow = user && !isSeller && !isExpired && !isSold && auction.is_active && auction.buy_now_price;
  const canMakeOffer = user && !isSeller && !isExpired && !isSold && auction.is_active && acceptsOffers;
  const canConfirmDelivery = isWinner && escrow && escrow.status === 'held' && escrow.buyer_id === user?.id;

  return (
    <div className="min-h-screen bg-background" data-testid="auction-detail-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Image & Description */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
              <img
                src={auction.image_url}
                alt={auction.title}
                className="w-full h-full object-cover"
                data-testid="auction-image"
              />
              <Badge className="absolute top-4 left-4 bg-primary">{auction.category}</Badge>
              {isBuyNowOnly && !isSold && (
                <Badge className="absolute top-4 left-28 bg-harvest text-black">
                  <Zap className="w-3 h-3 mr-1" />
                  Buy Now Only
                </Badge>
              )}
              {acceptsOffers && !isSold && (
                <Badge className="absolute top-4 right-4 bg-blue-500 text-white">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Accepts Offers
                </Badge>
              )}
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge className="bg-accent text-white text-2xl px-6 py-3">SOLD</Badge>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-card rounded-xl border p-6" data-testid="auction-details">
              <h1 
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ fontFamily: 'Playfair Display, serif' }}
                data-testid="auction-title"
              >
                {auction.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{auction.seller_name}</span>
                  {auction.seller_rating > 0 && (
                    <span className="flex items-center gap-1 text-harvest">
                      <Star className="w-3 h-3 fill-harvest" />
                      {auction.seller_rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{auction.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Started {new Date(auction.starts_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Separator className="my-6" />

              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Description
              </h2>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="auction-description">
                {auction.description}
              </p>
            </div>

            {/* Escrow Status for Winner */}
            {escrow && (isWinner || isSeller) && (
              <div className="bg-card rounded-xl border p-6" data-testid="escrow-section">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Shield className="w-5 h-5 text-primary" />
                  Escrow Status
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount in Escrow</span>
                    <span className="font-bold font-mono text-lg">${escrow.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={escrow.status === 'released' ? 'success' : 'secondary'}>
                      {escrow.status === 'held' ? 'Funds Held' : 
                       escrow.status === 'released' ? 'Released to Seller' : 
                       escrow.status}
                    </Badge>
                  </div>
                  
                  {canConfirmDelivery && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        Received your order? Confirm delivery to release payment to the seller.
                      </p>
                      <Button
                        className="w-full rounded-full bg-green-600 hover:bg-green-700"
                        onClick={handleConfirmDelivery}
                        disabled={confirmingDelivery}
                        data-testid="confirm-delivery-btn"
                      >
                        {confirmingDelivery ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Confirming...
                          </span>
                        ) : (
                          <>
                            <Package className="w-4 h-4 mr-2" />
                            Confirm Delivery & Release Payment
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {isSeller && escrow.status === 'held' && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      Payment is held in escrow until the buyer confirms delivery.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Bidding Interface */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              {/* Timer & Status */}
              <div className="bg-card rounded-xl border p-6" data-testid="bid-interface">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {isSold ? 'Sold' : isExpired ? 'Auction Ended' : 'Time Remaining'}
                  </span>
                  {!isExpired && !isSold && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      <Clock className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>

                {!isSold && (
                  <CountdownTimer 
                    endsAt={auction.ends_at} 
                    onExpire={() => setIsExpired(true)}
                  />
                )}

                <Separator className="my-6" />

                {/* Current Bid */}
                <div className="mb-6">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {isSold ? 'Final Price' : 'Current Bid'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span 
                      className="text-4xl font-bold text-primary font-mono"
                      data-testid="current-bid"
                    >
                      ${auction.current_bid.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      ({auction.bid_count} bids)
                    </span>
                  </div>
                  {auction.reserve_price && auction.current_bid < auction.reserve_price && !isSold && (
                    <p className="text-sm text-accent mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Reserve not met
                    </p>
                  )}
                </div>

                {/* Buy Now Price */}
                {auction.buy_now_price && !isSold && !isExpired && (
                  <div className="mb-6 p-4 bg-harvest/10 rounded-lg border border-harvest/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-harvest uppercase tracking-wide flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          Buy Now Price
                        </span>
                        <span className="text-2xl font-bold text-harvest font-mono">
                          ${auction.buy_now_price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bid Actions */}
                {isWinner && !auction.is_paid ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">
                        Congratulations! You won this auction.
                      </p>
                    </div>
                    <Button 
                      className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-lg"
                      onClick={handlePayment}
                      data-testid="pay-now-btn"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay ${auction.current_bid.toFixed(2)}
                    </Button>
                  </div>
                ) : canBid ? (
                  <div className="space-y-4">
                    {/* Phone verification notice */}
                    {user && !user.phone_verified && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Verify your phone to bid.{' '}
                        <button 
                          onClick={() => setShowPhoneVerification(true)}
                          className="underline font-medium"
                        >
                          Verify now
                        </button>
                      </div>
                    )}

                    {/* Bid Input */}
                    <div className="bid-input-group">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-mono text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min={auction.current_bid + 0.01}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="bid-input pl-8"
                          placeholder="Enter bid"
                          data-testid="bid-input"
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-lg btn-hover-lift"
                      onClick={handleBid}
                      disabled={bidding || !bidAmount}
                      data-testid="place-bid-btn"
                    >
                      {bidding ? (
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Placing bid...
                        </span>
                      ) : (
                        <>
                          <TrendingUp className="w-5 h-5 mr-2" />
                          Place Bid
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Minimum bid: ${(auction.current_bid + 0.01).toFixed(2)}
                    </p>

                    {/* Buy Now Section */}
                    {canBuyNow && (
                      <>
                        <div className="relative flex items-center justify-center">
                          <Separator className="flex-1" />
                          <span className="px-3 text-xs text-muted-foreground uppercase">or buy now</span>
                          <Separator className="flex-1" />
                        </div>

                        {/* Payment Method Selection */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Payment Method</Label>
                          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="stripe" id="stripe" />
                              <Label htmlFor="stripe" className="cursor-pointer flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Card (Stripe)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="paypal" id="paypal" />
                              <Label htmlFor="paypal" className="cursor-pointer flex items-center gap-2">
                                <span className="text-blue-600 font-bold text-sm">PayPal</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full rounded-full border-2 border-harvest text-harvest hover:bg-harvest hover:text-white py-6 text-lg"
                          onClick={handleBuyNow}
                          disabled={buyingNow}
                          data-testid="buy-now-btn"
                        >
                          {buyingNow ? (
                            <span className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-harvest/30 border-t-harvest rounded-full animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5 mr-2" />
                              Buy Now - ${auction.buy_now_price.toFixed(2)}
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                          <Shield className="w-3 h-3" />
                          Secure payment • Funds held in escrow
                        </p>
                      </>
                    )}
                  </div>
                ) : isSold ? (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-muted-foreground">This item has been sold</p>
                  </div>
                ) : isExpired ? (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-muted-foreground">This auction has ended</p>
                  </div>
                ) : isSeller ? (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-muted-foreground">You cannot bid on your own auction</p>
                  </div>
                ) : (
                  <Button 
                    className="w-full rounded-full" 
                    onClick={() => navigate('/auth')}
                    data-testid="login-to-bid-btn"
                  >
                    Login to Bid
                  </Button>
                )}
              </div>

              {/* Bid History */}
              <div className="bg-card rounded-xl border p-6" data-testid="bid-history">
                <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Bid History
                </h3>
                
                {bids.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {bids.map((bid, index) => (
                        <div 
                          key={bid.id} 
                          className={`bid-history-item ${index === 0 ? 'bg-green-50' : ''} rounded px-2`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{bid.bidder_name}</span>
                            {index === 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                Highest
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-semibold">${bid.amount.toFixed(2)}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(bid.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No bids yet. Be the first!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Verification Modal */}
      <PhoneVerification 
        open={showPhoneVerification}
        onOpenChange={setShowPhoneVerification}
        onVerified={fetchAuction}
      />
    </div>
  );
}
