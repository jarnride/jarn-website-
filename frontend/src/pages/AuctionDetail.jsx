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
import CountdownTimer from '@/components/CountdownTimer';
import { MapPin, User, Calendar, Clock, TrendingUp, AlertCircle, CreditCard, Zap, ShoppingCart } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSold, setIsSold] = useState(false);
  const socketRef = useRef(null);

  const fetchAuction = useCallback(async () => {
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        axios.get(`${API}/auctions/${id}`),
        axios.get(`${API}/auctions/${id}/bids`)
      ]);
      setAuction(auctionRes.data);
      setBids(bidsRes.data);
      
      // Check if expired or sold
      const endTime = new Date(auctionRes.data.ends_at).getTime();
      setIsExpired(Date.now() > endTime);
      setIsSold(auctionRes.data.sold_via === 'buy_now' || !auctionRes.data.is_active);
      
      // Set minimum bid
      if (!bidAmount) {
        setBidAmount((auctionRes.data.current_bid + 1).toFixed(2));
      }
    } catch (error) {
      console.error('Failed to fetch auction:', error);
      toast.error('Auction not found');
      navigate('/auctions');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, bidAmount]);

  // WebSocket connection
  useEffect(() => {
    if (!id) return;

    // Connect to WebSocket
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
        // Update auction with new bid
        setAuction(prev => ({
          ...prev,
          current_bid: data.current_bid,
          bid_count: data.bid_count
        }));
        
        // Add new bid to history
        setBids(prev => [data.bid, ...prev]);
        
        // Update minimum bid amount
        setBidAmount((data.current_bid + 1).toFixed(2));
        
        // Show toast notification
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

  const handleBid = async () => {
    if (!user) {
      toast.error('Please login to place a bid');
      navigate('/auth');
      return;
    }

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
      toast.error(error.response?.data?.detail || 'Failed to place bid');
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

    setBuyingNow(true);
    try {
      const response = await axios.post(
        `${API}/auctions/${id}/buy-now`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process Buy Now');
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
  const canBid = user && !isSeller && !isExpired && !isSold && auction.is_active;
  const canBuyNow = canBid && auction.buy_now_price;

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

                    {/* Buy Now Button */}
                    {canBuyNow && (
                      <>
                        <div className="relative flex items-center justify-center">
                          <Separator className="flex-1" />
                          <span className="px-3 text-xs text-muted-foreground uppercase">or</span>
                          <Separator className="flex-1" />
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
    </div>
  );
}
