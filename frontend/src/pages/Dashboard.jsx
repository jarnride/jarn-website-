import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuctionCard from '@/components/AuctionCard';
import PhoneVerification from '@/components/PhoneVerification';
import SellerAnalytics from '@/components/SellerAnalytics';
import SellerTrialBanner from '@/components/SellerTrialBanner';
import { Plus, Package, Gavel, Trophy, TrendingUp, Clock, Shield, Phone, CheckCircle, MessageSquare, DollarSign, Check, X, BarChart3, AlertTriangle, RefreshCw, RotateCcw, ShoppingCart, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [payouts, setPayouts] = useState({ payouts: [], total_released: 0, total_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [processingOffer, setProcessingOffer] = useState(null);
  const [requestingPayout, setRequestingPayout] = useState(null);
  const [relistingAuction, setRelistingAuction] = useState(null);
  const [relistDays, setRelistDays] = useState(7);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDialog, setCancelDialog] = useState({ open: false, auction: null });
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch escrows
      const escrowsRes = await axios.get(`${API}/users/me/escrows`, { headers });
      setEscrows(escrowsRes.data);

      if (user.role === 'farmer') {
        const [auctionsRes, payoutsRes] = await Promise.all([
          axios.get(`${API}/users/${user.id}/auctions`, { headers }),
          axios.get(`${API}/users/me/payouts`, { headers })
        ]);
        setMyAuctions(auctionsRes.data);
        setPayouts(payoutsRes.data);
        
        // Filter orders (auctions with a winner/buyer)
        const ordersWithWinner = auctionsRes.data.filter(a => a.winner_id && !a.cancelled);
        setMyOrders(ordersWithWinner);
        
        // Fetch received offers for each active auction
        const allOffers = [];
        for (const auction of auctionsRes.data.filter(a => a.is_active)) {
          try {
            const offersRes = await axios.get(`${API}/auctions/${auction.id}/offers`, { headers });
            allOffers.push(...offersRes.data.map(o => ({ ...o, auction_title: auction.title })));
          } catch (e) {
            // Ignore errors for auctions without offers
          }
        }
        setReceivedOffers(allOffers.filter(o => o.status === 'pending'));
      } else {
        const [bidsRes, wonRes, offersRes] = await Promise.all([
          axios.get(`${API}/users/me/bids`, { headers }),
          axios.get(`${API}/users/me/won`, { headers }),
          axios.get(`${API}/users/me/offers`, { headers })
        ]);
        setMyBids(bidsRes.data);
        setWonAuctions(wonRes.data);
        setMyOffers(offersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToOffer = async (offerId, status) => {
    setProcessingOffer(offerId);
    try {
      await axios.post(
        `${API}/offers/${offerId}/respond`,
        { offer_id: offerId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Offer ${status}!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to respond to offer');
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleRequestPayout = async (escrowId) => {
    setRequestingPayout(escrowId);
    try {
      await axios.post(
        `${API}/payouts/request`,
        { escrow_id: escrowId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payout requested successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request payout');
    } finally {
      setRequestingPayout(null);
    }
  };

  const handleRelistAuction = async (auctionId) => {
    setRelistingAuction(auctionId);
    try {
      await axios.post(
        `${API}/sellers/auctions/${auctionId}/relist?days=${relistDays}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Auction relisted for ${relistDays} days!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to relist auction');
    } finally {
      setRelistingAuction(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelDialog.auction) return;
    setCancellingOrder(cancelDialog.auction.id);
    try {
      const response = await axios.post(
        `${API}/sellers/orders/${cancelDialog.auction.id}/cancel?reason=${encodeURIComponent(cancelReason)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.refund_processed 
        ? 'Order cancelled and refund initiated!' 
        : 'Order cancelled successfully!');
      setCancelDialog({ open: false, auction: null });
      setCancelReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  // Check if auction can be relisted (ended/expired and not sold)
  const canRelist = (auction) => {
    const isExpired = new Date(auction.ends_at) <= new Date();
    const isInactive = !auction.is_active;
    const notSold = !auction.winner_id && !auction.escrow_id;
    return (isExpired || isInactive) && notSold;
  };

  if (!user) return null;

  const activeAuctions = myAuctions.filter(a => 
    a.is_active && new Date(a.ends_at) > new Date()
  );
  const endedAuctions = myAuctions.filter(a => 
    !a.is_active || new Date(a.ends_at) <= new Date()
  );
  
  // Separate sold and unsold ended auctions
  const soldAuctions = endedAuctions.filter(a => a.winner_id || a.escrow_id);
  const relistableAuctions = endedAuctions.filter(a => canRelist(a));

  const heldEscrows = escrows.filter(e => e.status === 'held');
  const releasedEscrows = escrows.filter(e => e.status === 'released');
  const totalEscrowAmount = heldEscrows.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-muted/30" data-testid="dashboard-page">
      {/* Header */}
      <div className="bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Welcome, {user.name}!
              </h1>
              <p className="text-white/70 mt-1">
                {user.role === 'farmer' ? 'Manage your auctions and sales' : 'Track your bids and purchases'}
              </p>
            </div>
            <div className="flex gap-3">
              {!user.phone_verified && (
                <Button 
                  variant="outline"
                  className="rounded-full border-white text-white hover:bg-white hover:text-primary"
                  onClick={() => setShowPhoneVerification(true)}
                  data-testid="verify-phone-btn"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Verify Phone
                </Button>
              )}
              {user.role === 'farmer' && (
                <Button 
                  className="rounded-full bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate('/create-auction')}
                  data-testid="dashboard-create-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Auction
                </Button>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/80">
              {user.phone_verified ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Phone Verified</span>
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 text-amber-400" />
                  <span>Phone Not Verified</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : user.role === 'farmer' ? (
          // Farmer Dashboard
          <>
            {/* Free Trial Banner */}
            <SellerTrialBanner />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{myAuctions.length}</p>
                      <p className="text-sm text-muted-foreground">Total Auctions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeAuctions.length}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-harvest/10 rounded-xl">
                      <Shield className="w-6 h-6 text-harvest" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono">${totalEscrowAmount.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground">In Escrow</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono">
                        ${myAuctions.reduce((sum, a) => sum + a.current_bid, 0).toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Banner */}
            <div className="mb-8 p-4 bg-gradient-to-r from-primary/10 to-harvest/10 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Grow Your Business</p>
                    <p className="text-sm text-muted-foreground">
                      Unlock premium features with a seller subscription
                    </p>
                  </div>
                </div>
                <Link to="/subscription">
                  <Button className="rounded-full" data-testid="subscription-cta">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>

            {/* Escrow Alert */}
            {heldEscrows.length > 0 && (
              <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {heldEscrows.length} payment(s) in escrow
                    </p>
                    <p className="text-sm text-amber-700">
                      Total: ${totalEscrowAmount.toFixed(2)} - Waiting for buyer delivery confirmation
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Offers Alert */}
            {receivedOffers.length > 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {receivedOffers.length} pending offer(s) to review
                    </p>
                    <p className="text-sm text-blue-700">
                      Check the Offers tab to accept or reject
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auctions Tabs */}
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active" data-testid="tab-active">
                  Active ({activeAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="orders" data-testid="tab-orders">
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Orders ({myOrders.length})
                </TabsTrigger>
                <TabsTrigger value="ended" data-testid="tab-ended">
                  Ended ({endedAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="offers" data-testid="tab-offers">
                  Offers ({receivedOffers.length})
                </TabsTrigger>
                <TabsTrigger value="escrow" data-testid="tab-escrow">
                  Escrow ({escrows.length})
                </TabsTrigger>
                <TabsTrigger value="payouts" data-testid="tab-payouts">
                  Payouts
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                {activeAuctions.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeAuctions.map(auction => (
                      <AuctionCard key={auction.id} auction={auction} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No active auctions</h3>
                    <p className="text-muted-foreground mb-4">
                      {user.phone_verified 
                        ? 'Create your first auction to start selling'
                        : 'Verify your phone number first'}
                    </p>
                    {user.phone_verified ? (
                      <Button onClick={() => navigate('/create-auction')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Auction
                      </Button>
                    ) : (
                      <Button onClick={() => setShowPhoneVerification(true)}>
                        <Phone className="w-4 h-4 mr-2" />
                        Verify Phone
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Orders Tab - Seller's sold items with cancel option */}
              <TabsContent value="orders" className="mt-6">
                {myOrders.length > 0 ? (
                  <div className="space-y-4">
                    {myOrders.map(order => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <img 
                              src={order.image_url || '/placeholder-auction.jpg'} 
                              alt={order.title}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{order.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Buyer: {order.buyer_email || 'Buyer'}
                              </p>
                              <p className="text-lg font-bold font-mono text-primary">
                                {order.currency === 'NGN' ? '₦' : '$'}{order.current_bid?.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              {order.is_paid ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Paid
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Awaiting Payment</Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(order.ends_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {!order.cancelled && (
                            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => setCancelDialog({ open: true, auction: order })}
                                data-testid={`cancel-order-${order.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel Order
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">
                      When buyers win or purchase your items, they will appear here.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ended" className="mt-6">
                {endedAuctions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Relistable Auctions Section */}
                    {relistableAuctions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <RotateCcw className="w-5 h-5 text-blue-500" />
                            Available for Relist ({relistableAuctions.length})
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Relist duration:</span>
                            <select 
                              value={relistDays} 
                              onChange={(e) => setRelistDays(parseInt(e.target.value))}
                              className="px-2 py-1 border rounded text-sm"
                            >
                              <option value={3}>3 days</option>
                              <option value={7}>7 days</option>
                              <option value={14}>14 days</option>
                              <option value={30}>30 days</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {relistableAuctions.map(auction => (
                            <Card key={auction.id} className="overflow-hidden border-blue-200 bg-blue-50/30">
                              <div className="relative">
                                <img 
                                  src={auction.image_url || '/placeholder-auction.jpg'} 
                                  alt={auction.title}
                                  className="w-full h-40 object-cover opacity-75"
                                />
                                <Badge className="absolute top-2 right-2 bg-amber-500">Expired</Badge>
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold truncate">{auction.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Last price: {auction.currency === 'NGN' ? '₦' : '$'}{auction.current_bid?.toLocaleString() || auction.starting_price?.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Ended: {new Date(auction.ends_at).toLocaleDateString()}
                                </p>
                                <Button 
                                  onClick={() => handleRelistAuction(auction.id)}
                                  disabled={relistingAuction === auction.id}
                                  className="w-full"
                                  size="sm"
                                >
                                  {relistingAuction === auction.id ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                      Relisting...
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Relist for {relistDays} days
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Sold Auctions Section */}
                    {soldAuctions.length > 0 && (
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                          <Trophy className="w-5 h-5 text-green-500" />
                          Sold Items ({soldAuctions.length})
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {soldAuctions.map(auction => (
                            <div key={auction.id} className="opacity-75">
                              <AuctionCard auction={auction} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {relistableAuctions.length === 0 && soldAuctions.length === 0 && (
                      <div className="empty-state">
                        <p className="text-muted-foreground">No ended auctions yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="text-muted-foreground">No ended auctions yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="escrow" className="mt-6">
                {escrows.length > 0 ? (
                  <div className="space-y-4">
                    {escrows.map(escrow => (
                      <Card key={escrow.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Escrow #{escrow.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                Created {new Date(escrow.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono text-lg">${escrow.amount.toFixed(2)}</p>
                              <Badge variant={escrow.status === 'released' ? 'success' : 'secondary'}>
                                {escrow.status}
                              </Badge>
                            </div>
                          </div>
                          {escrow.status === 'released' && !payouts.payouts.find(p => p.escrow_id === escrow.id) && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleRequestPayout(escrow.id)}
                                disabled={requestingPayout === escrow.id}
                                data-testid={`request-payout-${escrow.id}`}
                              >
                                {requestingPayout === escrow.id ? (
                                  <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                  </span>
                                ) : (
                                  <>
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Request Payout
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No escrow transactions yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="offers" className="mt-6">
                {receivedOffers.length > 0 ? (
                  <div className="space-y-4">
                    {receivedOffers.map(offer => (
                      <Card key={offer.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold">{offer.auction_title || 'Offer'}</p>
                              <p className="text-sm text-muted-foreground">
                                From: {offer.buyer_name} • {new Date(offer.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono text-xl text-blue-600">${offer.amount.toFixed(2)}</p>
                            </div>
                          </div>
                          {offer.message && (
                            <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-lg">
                              &quot;{offer.message}&quot;
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleRespondToOffer(offer.id, 'accepted')}
                              disabled={processingOffer === offer.id}
                              data-testid={`accept-offer-${offer.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleRespondToOffer(offer.id, 'rejected')}
                              disabled={processingOffer === offer.id}
                              data-testid={`reject-offer-${offer.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending offers</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payouts" className="mt-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold font-mono text-green-600">
                          ${payouts.total_released.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Paid Out</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold font-mono text-amber-600">
                          ${payouts.total_pending.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending Payout</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {payouts.payouts?.length > 0 ? (
                  <div className="space-y-4">
                    {payouts.payouts.map(payout => (
                      <Card key={payout.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Payout #{payout.id.slice(0, 8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payout.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono text-lg">${payout.amount.toFixed(2)}</p>
                              <Badge variant={payout.status === 'completed' ? 'success' : 'secondary'}>
                                {payout.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payouts yet. Complete sales to receive payments.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <SellerAnalytics token={token} userId={user.id} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          // Buyer Dashboard
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Gavel className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{myBids.length}</p>
                      <p className="text-sm text-muted-foreground">Bids Placed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Trophy className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{wonAuctions.length}</p>
                      <p className="text-sm text-muted-foreground">Auctions Won</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-harvest/10 rounded-xl">
                      <Shield className="w-6 h-6 text-harvest" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{heldEscrows.length}</p>
                      <p className="text-sm text-muted-foreground">Pending Delivery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono">
                        ${myBids.reduce((sum, b) => sum + b.amount, 0).toFixed(0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Bid Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Delivery Alert */}
            {heldEscrows.length > 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {heldEscrows.length} order(s) awaiting delivery confirmation
                    </p>
                    <p className="text-sm text-blue-700">
                      Once you receive your items, confirm delivery to release payment to seller
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Won Auctions */}
            {wonAuctions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Won Auctions
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wonAuctions.map(auction => (
                    <Link key={auction.id} to={`/auctions/${auction.id}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <img 
                              src={auction.image_url} 
                              alt={auction.title}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{auction.title}</h3>
                              <p className="text-lg font-bold font-mono text-primary">
                                ${auction.current_bid.toFixed(2)}
                              </p>
                              <Badge variant={auction.is_paid ? 'success' : 'warning'}>
                                {auction.is_paid ? 'Paid' : 'Payment Pending'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* My Offers */}
            {myOffers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  My Offers
                </h2>
                <div className="bg-card rounded-xl border divide-y">
                  {myOffers.map(offer => (
                    <Link 
                      key={offer.id} 
                      to={`/auctions/${offer.auction_id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      {offer.auction && (
                        <img 
                          src={offer.auction.image_url} 
                          alt={offer.auction.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {offer.auction?.title || 'Offer'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(offer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">${offer.amount.toFixed(2)}</p>
                        <Badge 
                          variant={
                            offer.status === 'accepted' ? 'success' : 
                            offer.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="mt-1"
                        >
                          {offer.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bids */}
            <div>
              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Recent Bids
              </h2>
              {myBids.length > 0 ? (
                <div className="bg-card rounded-xl border divide-y">
                  {myBids.slice(0, 10).map(bid => (
                    <Link 
                      key={bid.id} 
                      to={`/auctions/${bid.auction_id}`}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      {bid.auction && (
                        <img 
                          src={bid.auction.image_url} 
                          alt={bid.auction.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {bid.auction?.title || 'Auction'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(bid.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono">${bid.amount.toFixed(2)}</p>
                        {bid.auction && (
                          <Badge 
                            variant={bid.auction.winner_id === user.id ? 'success' : 'secondary'}
                            className="mt-1"
                          >
                            {bid.auction.winner_id === user.id ? 'Winning' : 'Outbid'}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Gavel className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No bids yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {user.phone_verified 
                      ? 'Start bidding on auctions to see your history'
                      : 'Verify your phone number to start bidding'}
                  </p>
                  {user.phone_verified ? (
                    <Button onClick={() => navigate('/auctions')}>
                      Browse Auctions
                    </Button>
                  ) : (
                    <Button onClick={() => setShowPhoneVerification(true)}>
                      <Phone className="w-4 h-4 mr-2" />
                      Verify Phone
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Phone Verification Modal */}
      <PhoneVerification 
        open={showPhoneVerification}
        onOpenChange={setShowPhoneVerification}
        onVerified={fetchData}
      />

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => !open && setCancelDialog({ open: false, auction: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the order for &quot;{cancelDialog.auction?.title}&quot;?
              {cancelDialog.auction?.is_paid && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ This order has been paid. A refund will be initiated to the buyer.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for cancellation (optional)</label>
              <Textarea
                placeholder="Enter a reason for cancelling this order..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelDialog({ open: false, auction: null })}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancellingOrder === cancelDialog.auction?.id}
            >
              {cancellingOrder === cancelDialog.auction?.id ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
