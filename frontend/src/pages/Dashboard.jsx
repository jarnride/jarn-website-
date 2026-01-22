import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuctionCard from '@/components/AuctionCard';
import { Plus, Package, Gavel, Trophy, TrendingUp, Clock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      
      if (user.role === 'farmer') {
        const response = await axios.get(`${API}/users/${user.id}/auctions`, { headers });
        setMyAuctions(response.data);
      } else {
        const [bidsRes, wonRes] = await Promise.all([
          axios.get(`${API}/users/me/bids`, { headers }),
          axios.get(`${API}/users/me/won`, { headers })
        ]);
        setMyBids(bidsRes.data);
        setWonAuctions(wonRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const activeAuctions = myAuctions.filter(a => 
    a.is_active && new Date(a.ends_at) > new Date()
  );
  const endedAuctions = myAuctions.filter(a => 
    !a.is_active || new Date(a.ends_at) <= new Date()
  );

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
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : user.role === 'farmer' ? (
          // Farmer Dashboard
          <>
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
                      <Gavel className="w-6 h-6 text-harvest" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {myAuctions.reduce((sum, a) => sum + a.bid_count, 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Bids</p>
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

            {/* Auctions Tabs */}
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active" data-testid="tab-active">
                  Active ({activeAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="ended" data-testid="tab-ended">
                  Ended ({endedAuctions.length})
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
                      Create your first auction to start selling
                    </p>
                    <Button onClick={() => navigate('/create-auction')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Auction
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ended" className="mt-6">
                {endedAuctions.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {endedAuctions.map(auction => (
                      <div key={auction.id} className="opacity-75">
                        <AuctionCard auction={auction} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="text-muted-foreground">No ended auctions yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          // Buyer Dashboard
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
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
                      <TrendingUp className="w-6 h-6 text-harvest" />
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
                    Start bidding on auctions to see your history
                  </p>
                  <Button onClick={() => navigate('/auctions')}>
                    Browse Auctions
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
