import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Gavel,
  Eye,
  Ban,
  RefreshCw
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Check if user is admin (for now, check if email contains 'admin' or specific emails)
    const isAdmin = user.email === 'admin@jarnnmarket.com' || 
                    user.email === 'info@jarnnmarket.com' ||
                    user.role === 'admin';
    if (!isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, usersRes, auctionsRes, payoutsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/auctions`, { headers }),
        axios.get(`${API}/admin/payouts`, { headers })
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAuctions(auctionsRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      // If endpoints don't exist yet, use mock data
      setStats({
        total_users: 0,
        total_farmers: 0,
        total_buyers: 0,
        total_auctions: 0,
        active_auctions: 0,
        total_volume: 0,
        total_escrow: 0,
        pending_payouts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId, action) => {
    setProcessingId(payoutId);
    try {
      await axios.post(
        `${API}/admin/payouts/${payoutId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Payout ${action}d successfully`);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} payout`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setProcessingId(userId);
    try {
      await axios.post(
        `${API}/admin/users/${userId}/toggle-status`,
        { active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User status updated');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuctions = auctions.filter(a => 
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.seller_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Admin Dashboard
              </h1>
              <p className="text-white/70 mt-1">
                Manage users, auctions, and payouts
              </p>
            </div>
            <Button 
              variant="outline"
              className="rounded-full border-white text-white hover:bg-white hover:text-slate-900"
              onClick={fetchAdminData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.total_users || users.length}</p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.total_auctions || auctions.length}</p>
                      <p className="text-sm text-muted-foreground">Total Auctions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Shield className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono">
                        ${stats?.total_escrow?.toFixed(0) || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">In Escrow</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.pending_payouts || payouts.filter(p => p.status === 'pending').length}</p>
                      <p className="text-sm text-muted-foreground">Pending Payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users or auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="users">
              <TabsList>
                <TabsTrigger value="users">
                  <Users className="w-4 h-4 mr-2" />
                  Users ({filteredUsers.length})
                </TabsTrigger>
                <TabsTrigger value="auctions">
                  <Gavel className="w-4 h-4 mr-2" />
                  Auctions ({filteredAuctions.length})
                </TabsTrigger>
                <TabsTrigger value="payouts">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Payouts ({payouts.length})
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Verified</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length > 0 ? filteredUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'farmer' ? 'default' : 'secondary'}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {u.email_verified ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                {u.phone_verified ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleUserStatus(u.id, u.is_active !== false)}
                                disabled={processingId === u.id}
                              >
                                {u.is_active === false ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Ban className="w-4 h-4 text-red-500" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Auctions Tab */}
              <TabsContent value="auctions" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Bids</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAuctions.length > 0 ? filteredAuctions.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {a.title}
                            </TableCell>
                            <TableCell>{a.seller_name || 'Unknown'}</TableCell>
                            <TableCell className="font-mono">
                              {a.currency === 'NGN' ? '₦' : '$'}{a.current_bid?.toFixed(2)}
                            </TableCell>
                            <TableCell>{a.bid_count || 0}</TableCell>
                            <TableCell>
                              <Badge variant={a.is_active ? 'success' : 'secondary'}>
                                {a.is_active ? 'Active' : 'Ended'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(a.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/auctions/${a.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No auctions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payouts Tab */}
              <TabsContent value="payouts" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.length > 0 ? payouts.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">
                              {p.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{p.seller_name || 'Unknown'}</TableCell>
                            <TableCell className="font-mono font-bold">
                              ${p.amount?.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  p.status === 'completed' ? 'success' : 
                                  p.status === 'rejected' ? 'destructive' : 
                                  'secondary'
                                }
                              >
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(p.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {p.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleProcessPayout(p.id, 'approve')}
                                    disabled={processingId === p.id}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleProcessPayout(p.id, 'reject')}
                                    disabled={processingId === p.id}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No payouts found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
