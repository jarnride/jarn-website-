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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Gavel,
  Eye,
  Ban,
  RefreshCw,
  Download,
  MoreHorizontal,
  FileJson,
  FileSpreadsheet,
  CheckSquare,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Undo2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    if (!user) {
      navigate('/auth');
      return;
    }
    const isAdmin = user.email === 'admin@jarnnmarket.com' || 
                    user.email === 'info@jarnnmarket.com' ||
                    user.role === 'admin';
    if (!isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [user, navigate, authLoading]);

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

  const handleToggleUserStatus = async (userId) => {
    setProcessingId(userId);
    try {
      await axios.post(
        `${API}/admin/users/${userId}/toggle-status`,
        {},
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

  const handleVerifySeller = async (userId, action) => {
    setProcessingId(userId);
    try {
      await axios.post(
        `${API}/admin/users/${userId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === 'verify' ? 'Seller verified!' : 'Verification removed');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update verification');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkPayouts = async (action) => {
    if (selectedPayouts.length === 0) {
      toast.error('No payouts selected');
      return;
    }
    setBulkProcessing(true);
    try {
      const response = await axios.post(
        `${API}/admin/bulk/payouts`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { action, payout_ids: selectedPayouts.join(',') }
        }
      );
      toast.success(`${response.data.processed} payouts ${action}d`);
      setSelectedPayouts([]);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bulk operation failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkUsers = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('No users selected');
      return;
    }
    setBulkProcessing(true);
    try {
      const response = await axios.post(
        `${API}/admin/bulk/users`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { action, user_ids: selectedUsers.join(',') }
        }
      );
      toast.success(`${response.data.processed} users updated`);
      setSelectedUsers([]);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bulk operation failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExport = async (type, format) => {
    try {
      const response = await axios.get(
        `${API}/admin/export/${type}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { format }
        }
      );
      
      const data = response.data;
      let content, filename, mimeType;
      
      if (format === 'csv') {
        content = data.data;
        filename = `jarnnmarket_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(data.data, null, 2);
        filename = `jarnnmarket_${type}_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.count} ${type}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const togglePayoutSelection = (payoutId) => {
    setSelectedPayouts(prev => 
      prev.includes(payoutId) 
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const toggleAllPayouts = () => {
    const pendingPayouts = payouts.filter(p => p.status === 'pending');
    if (selectedPayouts.length === pendingPayouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(pendingPayouts.map(p => p.id));
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
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-full border-white text-white hover:bg-white hover:text-slate-900">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('users', 'json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Users (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('users', 'csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Users (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('auctions', 'json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Auctions (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('auctions', 'csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Auctions (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('transactions', 'json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Transactions (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('transactions', 'csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Transactions (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedUsers.length} user(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleBulkUsers('activate')} disabled={bulkProcessing}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkUsers('deactivate')} disabled={bulkProcessing}>
                        <Ban className="w-4 h-4 mr-1" />
                        Deactivate
                      </Button>
                      <Button size="sm" variant="outline" className="text-blue-600" onClick={() => handleBulkUsers('verify')} disabled={bulkProcessing}>
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Verify Sellers
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
                
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={toggleAllUsers}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length > 0 ? filteredUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedUsers.includes(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                {u.name}
                                {u.is_verified && (
                                  <Shield className="w-4 h-4 text-blue-500 fill-blue-100" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'farmer' ? 'default' : 'secondary'}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {u.email_verified ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" title="Email verified" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" title="Email not verified" />
                                )}
                                {u.phone_verified ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" title="Phone verified" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" title="Phone not verified" />
                                )}
                                {u.is_active === false && (
                                  <Badge variant="destructive" className="text-xs">Disabled</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleToggleUserStatus(u.id)}>
                                    {u.is_active === false ? (
                                      <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Activate</>
                                    ) : (
                                      <><Ban className="w-4 h-4 mr-2 text-red-500" /> Deactivate</>
                                    )}
                                  </DropdownMenuItem>
                                  {u.role === 'farmer' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {u.is_verified ? (
                                        <DropdownMenuItem onClick={() => handleVerifySeller(u.id, 'unverify')}>
                                          <ShieldOff className="w-4 h-4 mr-2" />
                                          Remove Verification
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => handleVerifySeller(u.id, 'verify')}>
                                          <ShieldCheck className="w-4 h-4 mr-2 text-blue-500" />
                                          Verify Seller
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                {/* Bulk Actions */}
                {selectedPayouts.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedPayouts.length} payout(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleBulkPayouts('approve')} disabled={bulkProcessing}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve All
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={() => handleBulkPayouts('reject')} disabled={bulkProcessing}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject All
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedPayouts([])}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedPayouts.length === payouts.filter(p => p.status === 'pending').length && payouts.filter(p => p.status === 'pending').length > 0}
                              onCheckedChange={toggleAllPayouts}
                            />
                          </TableHead>
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
                            <TableCell>
                              {p.status === 'pending' && (
                                <Checkbox 
                                  checked={selectedPayouts.includes(p.id)}
                                  onCheckedChange={() => togglePayoutSelection(p.id)}
                                />
                              )}
                            </TableCell>
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
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
