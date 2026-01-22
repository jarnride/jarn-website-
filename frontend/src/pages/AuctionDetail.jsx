import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import CountdownTimer from '@/components/CountdownTimer';
import { MapPin, User, Calendar, Clock, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const fetchAuction = useCallback(async () => {
    try {
      const [auctionRes, bidsRes] = await Promise.all([
        axios.get(`${API}/auctions/${id}`),
        axios.get(`${API}/auctions/${id}/bids`)
      ]);
      setAuction(auctionRes.data);
      setBids(bidsRes.data);
      
      // Check if expired
      const endTime = new Date(auctionRes.data.ends_at).getTime();
      setIsExpired(Date.now() > endTime);
      
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

  useEffect(() => {
    fetchAuction();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchAuction, 5000);
    return () => clearInterval(interval);
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
      
      // Redirect to Stripe
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

  const isWinner = user && auction.winner_id === user.id && isExpired;
  const isSeller = user && auction.seller_id === user.id;
  const canBid = user && !isSeller && !isExpired && auction.is_active;

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
                    {isExpired ? 'Auction Ended' : 'Time Remaining'}
                  </span>
                  {!isExpired && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      <Clock className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>

                <CountdownTimer 
                  endsAt={auction.ends_at} 
                  onExpire={() => setIsExpired(true)}
                />

                <Separator className="my-6" />

                {/* Current Bid */}
                <div className="mb-6">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Current Bid
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
                  {auction.reserve_price && auction.current_bid < auction.reserve_price && (
                    <p className="text-sm text-accent mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Reserve not met
                    </p>
                  )}
                </div>

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
