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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  Undo2,
  Mail,
  Send,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Trash2,
  Filter,
  CalendarPlus,
  Settings,
  CreditCard,
  Check
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Dialog states
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, user: null });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, user: null });
  const [cancelOrderDialog, setCancelOrderDialog] = useState({ open: false, order: null });
  const [relistDialog, setRelistDialog] = useState({ open: false, order: null });
  const [refundDialog, setRefundDialog] = useState({ open: false, escrow: null });
  
  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [suspendDays, setSuspendDays] = useState(30);
  const [suspendReason, setSuspendReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [relistDays, setRelistDays] = useState(7);
  const [refundReason, setRefundReason] = useState('');
  
  // Marketing campaign states
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ type: 'weekly_highlights', audience: 'all', scheduled: false, scheduledAt: '' });
  
  // Auto-schedule states
  const [autoSchedules, setAutoSchedules] = useState([]);
  const [newAutoSchedule, setNewAutoSchedule] = useState({ type: 'weekly_highlights', day: 0, hour: 9, audience: 'all' });
  const [creatingAutoSchedule, setCreatingAutoSchedule] = useState(false);
  
  // Pending approvals state
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // User filter state
  const [userFilter, setUserFilter] = useState('all'); // all, buyers, sellers, approved, pending
  
  // Active tab state for navigation from stats
  const [activeTab, setActiveTab] = useState('approvals');
  
  // Subscription extension state
  const [extendDays, setExtendDays] = useState(30);
  
  // Admin management states
  const [adminUsers, setAdminUsers] = useState([]);
  const [createAdminDialog, setCreateAdminDialog] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'sub_admin',
    privileges: {
      view_users: true,
      approve_users: true,
      delete_users: false,
      view_orders: true,
      cancel_orders: false,
      view_auctions: true,
      manage_auctions: false,
      view_payouts: true,
      process_payouts: false,
      view_escrows: true,
      manage_escrows: false,
      send_marketing: false,
      manage_admins: false
    }
  });
  const [editingAdmin, setEditingAdmin] = useState(null);
  
  // Subscription management states
  const [subscriptionPlans, setSubscriptionPlans] = useState({});
  const [editingPlans, setEditingPlans] = useState({});
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [savingPlans, setSavingPlans] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    if (!user) {
      // Redirect to regular auth page
      navigate('/auth');
      return;
    }
    const isAdmin = user.email === 'admin@jarnnmarket.com' || 
                    user.email === 'info@jarnnmarket.com' ||
                    user.role === 'admin' ||
                    user.role === 'sub_admin';
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
      
      const [statsRes, usersRes, auctionsRes, payoutsRes, ordersRes, escrowsRes, campaignsRes, campaignStatsRes, autoSchedulesRes, pendingApprovalsRes, adminUsersRes, subPlansRes, subStatsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/auctions`, { headers }),
        axios.get(`${API}/admin/payouts`, { headers }),
        axios.get(`${API}/admin/orders`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/escrows`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/campaigns`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/campaigns/stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${API}/admin/campaigns/auto-schedules`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/users/pending-approval`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/admins`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/subscriptions/plans`, { headers }).catch(() => ({ data: { plans: {} } })),
        axios.get(`${API}/admin/subscriptions/stats`, { headers }).catch(() => ({ data: null }))
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAuctions(auctionsRes.data);
      setPayouts(payoutsRes.data);
      setOrders(ordersRes.data);
      setEscrows(escrowsRes.data);
      setCampaigns(campaignsRes.data);
      setCampaignStats(campaignStatsRes.data);
      setAutoSchedules(autoSchedulesRes.data);
      setPendingApprovals(pendingApprovalsRes.data);
      setAdminUsers(adminUsersRes.data);
      setPayouts(payoutsRes.data);
      setSubscriptionPlans(subPlansRes.data.plans || {});
      setEditingPlans(JSON.parse(JSON.stringify(subPlansRes.data.plans || {})));
      setSubscriptionStats(subStatsRes.data);
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

  // New admin action handlers
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setProcessingId(resetPasswordDialog.user?.id);
    try {
      await axios.post(
        `${API}/admin/users/${resetPasswordDialog.user.id}/reset-password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Password reset for ${resetPasswordDialog.user.email}`);
      setResetPasswordDialog({ open: false, user: null });
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspendUser = async () => {
    setProcessingId(suspendDialog.user?.id);
    try {
      await axios.post(
        `${API}/admin/users/${suspendDialog.user.id}/suspend`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { days: suspendDays, reason: suspendReason }
        }
      );
      toast.success(`User suspended for ${suspendDays} days`);
      setSuspendDialog({ open: false, user: null });
      setSuspendDays(30);
      setSuspendReason('');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to suspend user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnsuspendUser = async (userId) => {
    setProcessingId(userId);
    try {
      await axios.post(
        `${API}/admin/users/${userId}/unsuspend`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User suspension removed');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unsuspend user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOrder = async () => {
    setProcessingId(cancelOrderDialog.order?.id);
    try {
      await axios.post(
        `${API}/admin/orders/${cancelOrderDialog.order.id}/cancel`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { reason: cancelReason }
        }
      );
      toast.success('Order cancelled');
      setCancelOrderDialog({ open: false, order: null });
      setCancelReason('');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRelistOrder = async () => {
    setProcessingId(relistDialog.order?.id);
    try {
      await axios.post(
        `${API}/admin/orders/${relistDialog.order.id}/relist`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { days: relistDays }
        }
      );
      toast.success(`Auction relisted for ${relistDays} days`);
      setRelistDialog({ open: false, order: null });
      setRelistDays(7);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to relist order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefund = async () => {
    setProcessingId(refundDialog.escrow?.id);
    try {
      await axios.post(
        `${API}/admin/escrow/${refundDialog.escrow.id}/refund`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { reason: refundReason }
        }
      );
      toast.success('Refund processed');
      setRefundDialog({ open: false, escrow: null });
      setRefundReason('');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process refund');
    } finally {
      setProcessingId(null);
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

  // Marketing Campaign Handlers
  const handleCreateCampaign = async () => {
    setCreatingCampaign(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        campaign_type: newCampaign.type,
        target_audience: newCampaign.audience,
        scheduled_at: newCampaign.scheduled && newCampaign.scheduledAt ? new Date(newCampaign.scheduledAt).toISOString() : null
      };
      
      const res = await axios.post(`${API}/admin/campaigns`, payload, { headers });
      setCampaigns(prev => [res.data.campaign, ...prev]);
      toast.success('Campaign created successfully');
      setNewCampaign({ type: 'weekly_highlights', audience: 'all', scheduled: false, scheduledAt: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleSendCampaign = async (campaignId) => {
    setProcessingId(campaignId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API}/admin/campaigns/${campaignId}/send`, {}, { headers });
      toast.success(`Campaign sent to ${res.data.sent_count} users`);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    setProcessingId(campaignId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/admin/campaigns/${campaignId}`, { headers });
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast.success('Campaign deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    } finally {
      setProcessingId(null);
    }
  };

  const getCampaignTypeLabel = (type) => {
    const labels = {
      'weekly_highlights': 'Weekly Auction Highlights',
      'seller_promotions': 'Featured Sellers',
      'reengagement': 'Re-engagement',
      'auction_ending': 'Auctions Ending Soon'
    };
    return labels[type] || type;
  };

  // Auto-schedule handlers
  const handleCreateAutoSchedule = async () => {
    setCreatingAutoSchedule(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        campaign_type: newAutoSchedule.type,
        day_of_week: newAutoSchedule.day,
        hour: newAutoSchedule.hour,
        target_audience: newAutoSchedule.audience,
        enabled: true
      };
      
      const res = await axios.post(`${API}/admin/campaigns/auto-schedules`, payload, { headers });
      setAutoSchedules(prev => [...prev, res.data.schedule]);
      toast.success('Auto-schedule created successfully');
      setNewAutoSchedule({ type: 'weekly_highlights', day: 0, hour: 9, audience: 'all' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create auto-schedule');
    } finally {
      setCreatingAutoSchedule(false);
    }
  };

  const handleToggleAutoSchedule = async (scheduleId, enabled) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const schedule = autoSchedules.find(s => s.id === scheduleId);
      await axios.put(`${API}/admin/campaigns/auto-schedules/${scheduleId}`, {
        ...schedule,
        campaign_type: schedule.campaign_type,
        day_of_week: schedule.day_of_week,
        hour: schedule.hour,
        target_audience: schedule.target_audience,
        enabled: !enabled
      }, { headers });
      setAutoSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, enabled: !enabled } : s));
      toast.success(`Schedule ${enabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteAutoSchedule = async (scheduleId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/admin/campaigns/auto-schedules/${scheduleId}`, { headers });
      setAutoSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Schedule deleted');
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const getDayName = (day) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[day];
  };

  // User approval handlers
  const handleApproveUser = async (userId) => {
    setProcessingId(userId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/admin/users/${userId}/approve`, {}, { headers });
      setPendingApprovals(prev => prev.filter(u => u.id !== userId));
      toast.success('User approved successfully! They will receive an email notification.');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectUser = async (userId) => {
    setProcessingId(userId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/admin/users/${userId}/reject?reason=${encodeURIComponent(rejectionReason)}`, {}, { headers });
      setPendingApprovals(prev => prev.filter(u => u.id !== userId));
      setRejectionReason('');
      toast.success('User registration rejected');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    setProcessingId(userId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/admin/users/${userId}`, { headers });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted permanently');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExtendSubscription = async (userId, userName) => {
    setProcessingId(userId);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API}/admin/users/${userId}/extend-subscription?days=${extendDays}`, {}, { headers });
      toast.success(`${userName}'s subscription extended by ${extendDays} days`);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend subscription');
    } finally {
      setProcessingId(null);
    }
  };

  // Apply user filter
  const getFilteredUsers = () => {
    let filtered = users.filter(u =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    switch (userFilter) {
      case 'buyers':
        return filtered.filter(u => u.role === 'buyer');
      case 'sellers':
        return filtered.filter(u => u.role === 'farmer');
      case 'approved':
        return filtered.filter(u => u.is_approved === true);
      case 'pending':
        return filtered.filter(u => u.approval_status === 'pending' || !u.is_approved);
      default:
        return filtered;
    }
  };

  const filteredUsers = getFilteredUsers();

  const filteredAuctions = auctions.filter(a => 
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.seller_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.buyer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.seller?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Admin management functions
  const handleCreateAdmin = async () => {
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/admin/admins`, newAdminForm, { headers });
      toast.success(`${newAdminForm.role === 'admin' ? 'Admin' : 'Sub-Admin'} created successfully`);
      setCreateAdminDialog(false);
      setNewAdminForm({
        name: '',
        email: '',
        password: '',
        role: 'sub_admin',
        privileges: {
          view_users: true,
          approve_users: true,
          delete_users: false,
          view_orders: true,
          cancel_orders: false,
          view_auctions: true,
          manage_auctions: false,
          view_payouts: true,
          process_payouts: false,
          view_escrows: true,
          manage_escrows: false,
          send_marketing: false,
          manage_admins: false
        }
      });
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    }
  };

  const handleUpdateAdminPrivileges = async (adminId, privileges) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/admin/admins/${adminId}/privileges`, { privileges }, { headers });
      toast.success('Privileges updated successfully');
      setEditingAdmin(null);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update privileges');
    }
  };

  const handleRemoveAdmin = async (adminId, adminName) => {
    if (!confirm(`Are you sure you want to remove admin privileges from ${adminName}?`)) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/admin/admins/${adminId}`, { headers });
      toast.success('Admin removed successfully');
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove admin');
    }
  };

  // Subscription management functions
  const handleUpdatePlanField = (planId, field, value) => {
    setEditingPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: field.includes('price') || field === 'duration_days' || field === 'max_listings' 
          ? parseFloat(value) || 0 
          : value
      }
    }));
  };

  const handleSaveSubscriptionPlans = async () => {
    setSavingPlans(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/admin/subscriptions/plans`, editingPlans, { headers });
      toast.success('Subscription plans updated successfully');
      setSubscriptionPlans(editingPlans);
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update subscription plans');
    } finally {
      setSavingPlans(false);
    }
  };

  const handleResetSubscriptionPlans = async () => {
    if (!confirm('Are you sure you want to reset all subscription plans to default values?')) return;
    setSavingPlans(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/admin/subscriptions/plans/reset`, {}, { headers });
      toast.success('Subscription plans reset to defaults');
      setSubscriptionPlans(response.data.plans);
      setEditingPlans(JSON.parse(JSON.stringify(response.data.plans)));
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset subscription plans');
    } finally {
      setSavingPlans(false);
    }
  };

  const filteredEscrows = escrows.filter(e => 
    e.buyer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.seller?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.auction?.title?.toLowerCase().includes(searchQuery.toLowerCase())
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
            {/* Stats Grid - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card 
                className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                onClick={() => setActiveTab('users')}
                data-testid="stat-total-users"
              >
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
              <Card 
                className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
                onClick={() => setActiveTab('auctions')}
                data-testid="stat-total-auctions"
              >
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
              <Card 
                className="cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
                onClick={() => setActiveTab('escrows')}
                data-testid="stat-in-escrow"
              >
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
              <Card 
                className="cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
                onClick={() => setActiveTab('payouts')}
                data-testid="stat-pending-payouts"
              >
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
            <Tabs defaultValue="approvals" value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <TabsList className="flex w-max md:w-auto md:flex-wrap gap-1 mb-2">
                  <TabsTrigger value="approvals" className={`text-xs md:text-sm whitespace-nowrap ${pendingApprovals.length > 0 ? "bg-orange-100 text-orange-800" : ""}`}>
                    <UserCheck className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Approvals</span>
                    {pendingApprovals.length > 0 && ` (${pendingApprovals.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="users" className="text-xs md:text-sm whitespace-nowrap">
                    <Users className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Users</span> ({filteredUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="auctions" className="text-xs md:text-sm whitespace-nowrap">
                    <Gavel className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Auctions</span> ({filteredAuctions.length})
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs md:text-sm whitespace-nowrap">
                    <Receipt className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Orders</span> ({filteredOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="escrows" className="text-xs md:text-sm whitespace-nowrap">
                    <Shield className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Escrows</span> ({filteredEscrows.length})
                  </TabsTrigger>
                  <TabsTrigger value="payouts" className="text-xs md:text-sm whitespace-nowrap">
                    <DollarSign className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Payouts</span> ({payouts.length})
                  </TabsTrigger>
                  <TabsTrigger value="admins" className="text-xs md:text-sm whitespace-nowrap">
                    <ShieldCheck className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Admins</span>
                  </TabsTrigger>
                  <TabsTrigger value="subscriptions" className="text-xs md:text-sm whitespace-nowrap">
                    <CreditCard className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Subscriptions</span>
                  </TabsTrigger>
                  <TabsTrigger value="marketing" className="text-xs md:text-sm whitespace-nowrap">
                    <Mail className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Marketing</span> ({campaigns.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Approvals Tab */}
              <TabsContent value="approvals" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-orange-500" />
                      Pending User Approvals
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Review and approve new user registrations before they can access the platform.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {pendingApprovals.length > 0 ? (
                      <div className="overflow-x-auto -mx-6 px-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[150px]">User</TableHead>
                              <TableHead className="min-w-[80px]">Role</TableHead>
                              <TableHead className="min-w-[100px]">Email Verified</TableHead>
                              <TableHead className="min-w-[100px]">Registered</TableHead>
                              <TableHead className="min-w-[100px]">Payout Details</TableHead>
                              <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {pendingApprovals.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                  {user.phone && <div className="text-xs text-muted-foreground">{user.phone}</div>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'farmer' ? 'default' : 'secondary'} className="capitalize">
                                  {user.role === 'farmer' ? '🌾 Farmer' : '🛒 Buyer'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.email_verified ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600">
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {user.role === 'farmer' ? (
                                  user.payout_details_complete ? (
                                    <Badge className="bg-green-100 text-green-800">Complete</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-600">Incomplete</Badge>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveUser(user.id)}
                                    disabled={processingId === user.id}
                                  >
                                    {processingId === user.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                      </>
                                    )}
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="destructive">
                                        <UserX className="w-3 h-3 mr-1" /> Reject
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Reject User Registration</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                          Are you sure you want to reject the registration for <strong>{user.name}</strong> ({user.email})?
                                        </p>
                                        <div className="space-y-2">
                                          <Label>Reason (optional)</Label>
                                          <Input
                                            placeholder="Enter rejection reason..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button variant="outline" onClick={() => setRejectionReason('')}>
                                            Cancel
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            onClick={() => handleRejectUser(user.id)}
                                            disabled={processingId === user.id}
                                          >
                                            {processingId === user.id ? (
                                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                            ) : (
                                              <UserX className="w-3 h-3 mr-1" />
                                            )}
                                            Confirm Rejection
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <UserCheck className="w-12 h-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium text-green-700">All Caught Up!</h3>
                        <p className="text-muted-foreground mt-2">
                          No pending user approvals at this time.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-6">
                {/* User Filters */}
                <div className="mb-4 flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mr-2">Filter:</span>
                  {['all', 'buyers', 'sellers', 'approved', 'pending'].map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      variant={userFilter === filter ? 'default' : 'outline'}
                      onClick={() => setUserFilter(filter)}
                      className="capitalize"
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
                
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
                                {u.is_suspended && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Suspended</Badge>
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
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => setResetPasswordDialog({ open: true, user: u })}>
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  
                                  {u.is_suspended ? (
                                    <DropdownMenuItem onClick={() => handleUnsuspendUser(u.id)}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                      Remove Suspension
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => setSuspendDialog({ open: true, user: u })}>
                                      <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                                      Suspend User
                                    </DropdownMenuItem>
                                  )}
                                  
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
                                      <DropdownMenuItem onClick={() => handleExtendSubscription(u.id, u.name)}>
                                        <CalendarPlus className="w-4 h-4 mr-2 text-green-500" />
                                        Extend Subscription (+{extendDays}d)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
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

              {/* Orders Tab */}
              <TabsContent value="orders" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length > 0 ? filteredOrders.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {o.title}
                            </TableCell>
                            <TableCell>{o.buyer?.email || 'N/A'}</TableCell>
                            <TableCell>{o.seller?.email || 'N/A'}</TableCell>
                            <TableCell className="font-mono font-bold">
                              {o.currency === 'NGN' ? '₦' : '$'}{o.current_bid?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {o.cancelled ? (
                                <Badge variant="destructive">Cancelled</Badge>
                              ) : o.is_paid ? (
                                <Badge variant="success" className="bg-green-100 text-green-800">Paid</Badge>
                              ) : (
                                <Badge variant="secondary">Unpaid</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(o.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!o.is_paid && !o.cancelled && (
                                    <>
                                      <DropdownMenuItem onClick={() => setRelistDialog({ open: true, order: o })}>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Relist Auction
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => setCancelOrderDialog({ open: true, order: o })}
                                        className="text-red-600"
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Cancel Order
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {o.cancelled && (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      Order already cancelled
                                    </DropdownMenuItem>
                                  )}
                                  {o.is_paid && (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      Order already paid
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No orders found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Escrows Tab */}
              <TabsContent value="escrows" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Auction</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEscrows.length > 0 ? filteredEscrows.map(e => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-xs">
                              {e.id?.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {e.auction?.title || 'N/A'}
                            </TableCell>
                            <TableCell>{e.buyer?.email || 'N/A'}</TableCell>
                            <TableCell>{e.seller?.email || 'N/A'}</TableCell>
                            <TableCell className="font-mono font-bold">
                              {e.currency === 'NGN' ? '₦' : '$'}{e.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  e.status === 'released' ? 'success' : 
                                  e.status === 'refunded' ? 'destructive' : 
                                  'secondary'
                                }
                                className={e.status === 'released' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {e.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {e.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => setRefundDialog({ open: true, escrow: e })}
                                >
                                  <Undo2 className="w-4 h-4 mr-1" />
                                  Refund
                                </Button>
                              )}
                              {e.status === 'refunded' && (
                                <span className="text-xs text-muted-foreground">Refunded</span>
                              )}
                              {e.status === 'released' && (
                                <span className="text-xs text-muted-foreground">Released</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No escrows found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Marketing Campaigns Tab */}
              <TabsContent value="marketing" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create Campaign Card */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Create Campaign
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Campaign Type</Label>
                        <select 
                          className="w-full p-2 border rounded-md bg-background"
                          value={newCampaign.type}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="weekly_highlights">Weekly Auction Highlights</option>
                          <option value="seller_promotions">Featured Sellers</option>
                          <option value="reengagement">Re-engagement (Inactive Users)</option>
                          <option value="auction_ending">Auctions Ending Soon</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <select 
                          className="w-full p-2 border rounded-md bg-background"
                          value={newCampaign.audience}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, audience: e.target.value }))}
                        >
                          <option value="all">All Users</option>
                          <option value="buyers">Buyers Only</option>
                          <option value="farmers">Farmers Only</option>
                          <option value="inactive">Inactive Users (30+ days)</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="schedule-campaign"
                          checked={newCampaign.scheduled}
                          onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduled: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="schedule-campaign" className="cursor-pointer">Schedule for later</Label>
                      </div>
                      
                      {newCampaign.scheduled && (
                        <div className="space-y-2">
                          <Label>Schedule Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={newCampaign.scheduledAt}
                            onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduledAt: e.target.value }))}
                          />
                        </div>
                      )}
                      
                      <Button 
                        className="w-full" 
                        onClick={handleCreateCampaign}
                        disabled={creatingCampaign}
                      >
                        {creatingCampaign ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {newCampaign.scheduled ? 'Schedule Campaign' : 'Create Campaign'}
                      </Button>
                      
                      {/* Campaign Stats */}
                      {campaignStats && (
                        <div className="pt-4 border-t space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground">Campaign Statistics</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-muted p-2 rounded">
                              <div className="text-muted-foreground">Total Sent</div>
                              <div className="font-bold">{campaignStats.total_emails_sent || 0}</div>
                            </div>
                            <div className="bg-muted p-2 rounded">
                              <div className="text-muted-foreground">Campaigns</div>
                              <div className="font-bold">{campaignStats.total_campaigns || 0}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Campaign List */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Campaign History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Audience</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.length > 0 ? campaigns.map((campaign) => (
                            <TableRow key={campaign.id}>
                              <TableCell className="font-medium">
                                {getCampaignTypeLabel(campaign.type)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {campaign.target_audience}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {campaign.status === 'sent' ? (
                                  <Badge className="bg-green-100 text-green-800">Sent</Badge>
                                ) : campaign.status === 'scheduled' ? (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Scheduled
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {campaign.status === 'sent' ? (
                                  <span className="text-sm">
                                    {campaign.sent_count} / {campaign.sent_count + campaign.failed_count}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(campaign.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {campaign.status !== 'sent' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendCampaign(campaign.id)}
                                      disabled={processingId === campaign.id}
                                    >
                                      {processingId === campaign.id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Send className="w-3 h-3" />
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                    disabled={processingId === campaign.id}
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No campaigns created yet. Create your first marketing campaign!
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Auto-Scheduled Campaigns Section */}
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Automated Weekly Campaigns
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Create Auto-Schedule */}
                        <div className="space-y-4 p-4 border rounded-lg">
                          <h4 className="font-medium">Create New Schedule</h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Campaign Type</Label>
                              <select 
                                className="w-full p-2 border rounded-md bg-background text-sm"
                                value={newAutoSchedule.type}
                                onChange={(e) => setNewAutoSchedule(prev => ({ ...prev, type: e.target.value }))}
                              >
                                <option value="weekly_highlights">Weekly Highlights</option>
                                <option value="seller_promotions">Featured Sellers</option>
                                <option value="auction_ending">Ending Soon</option>
                                <option value="reengagement">Re-engagement</option>
                              </select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Target Audience</Label>
                              <select 
                                className="w-full p-2 border rounded-md bg-background text-sm"
                                value={newAutoSchedule.audience}
                                onChange={(e) => setNewAutoSchedule(prev => ({ ...prev, audience: e.target.value }))}
                              >
                                <option value="all">All Users</option>
                                <option value="buyers">Buyers Only</option>
                                <option value="farmers">Farmers Only</option>
                              </select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Day of Week</Label>
                              <select 
                                className="w-full p-2 border rounded-md bg-background text-sm"
                                value={newAutoSchedule.day}
                                onChange={(e) => setNewAutoSchedule(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                              >
                                <option value={0}>Monday</option>
                                <option value={1}>Tuesday</option>
                                <option value={2}>Wednesday</option>
                                <option value={3}>Thursday</option>
                                <option value={4}>Friday</option>
                                <option value={5}>Saturday</option>
                                <option value={6}>Sunday</option>
                              </select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Time (UTC)</Label>
                              <select 
                                className="w-full p-2 border rounded-md bg-background text-sm"
                                value={newAutoSchedule.hour}
                                onChange={(e) => setNewAutoSchedule(prev => ({ ...prev, hour: parseInt(e.target.value) }))}
                              >
                                {[...Array(24)].map((_, i) => (
                                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full" 
                            onClick={handleCreateAutoSchedule}
                            disabled={creatingAutoSchedule}
                          >
                            {creatingAutoSchedule ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Calendar className="w-4 h-4 mr-2" />
                            )}
                            Create Auto-Schedule
                          </Button>
                        </div>
                        
                        {/* Active Schedules List */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Active Schedules</h4>
                          {autoSchedules.length > 0 ? (
                            <div className="space-y-2">
                              {autoSchedules.map((schedule) => (
                                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                  <div>
                                    <div className="font-medium text-sm">{getCampaignTypeLabel(schedule.campaign_type)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Every {schedule.day_name || getDayName(schedule.day_of_week)} at {schedule.hour.toString().padStart(2, '0')}:00 UTC
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Audience: {schedule.target_audience} • Runs: {schedule.run_count || 0}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant={schedule.enabled ? "default" : "outline"}
                                      onClick={() => handleToggleAutoSchedule(schedule.id, schedule.enabled)}
                                    >
                                      {schedule.enabled ? 'On' : 'Off'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteAutoSchedule(schedule.id)}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-6 border rounded-lg">
                              No auto-schedules configured. Create one to automate your marketing!
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Admins Tab */}
              <TabsContent value="admins" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-blue-600" />
                          Admin & Sub-Admin Management
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create and manage admin users with different privilege levels
                        </p>
                      </div>
                      <Button onClick={() => setCreateAdminDialog(true)} data-testid="create-admin-btn">
                        <Users className="w-4 h-4 mr-2" />
                        Create Admin
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Privilege Legend */}
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-3">Privilege Levels & Permissions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-800">Super Admin</Badge>
                            <span className="text-sm text-muted-foreground">Full access to all features</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">Sub-Admin</Badge>
                            <span className="text-sm text-muted-foreground">Custom permissions (configurable)</span>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">Available Permissions:</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span>• View/Approve/Delete Users</span>
                            <span>• View/Cancel Orders</span>
                            <span>• View/Manage Auctions</span>
                            <span>• View/Process Payouts</span>
                            <span>• View/Manage Escrows</span>
                            <span>• Send Marketing Emails</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {adminUsers.length > 0 ? (
                      <div className="overflow-x-auto -mx-6 px-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[150px]">Admin</TableHead>
                              <TableHead className="min-w-[80px]">Role</TableHead>
                              <TableHead className="min-w-[200px]">Privileges</TableHead>
                              <TableHead className="min-w-[100px]">Created</TableHead>
                              <TableHead className="min-w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {adminUsers.map(admin => (
                              <TableRow key={admin.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{admin.name}</p>
                                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={admin.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                                    {admin.role === 'admin' ? 'Super Admin' : 'Sub-Admin'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                                    {admin.role === 'admin' || admin.email === 'admin@jarnnmarket.com' ? (
                                      <Badge className="bg-gradient-to-r from-red-500 to-amber-500 text-white text-xs">All Privileges</Badge>
                                    ) : (
                                      <>
                                        {admin.privileges?.view_users && <Badge variant="outline" className="text-xs bg-blue-50">View Users</Badge>}
                                        {admin.privileges?.approve_users && <Badge variant="outline" className="text-xs bg-green-50">Approve</Badge>}
                                        {admin.privileges?.delete_users && <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Delete</Badge>}
                                        {admin.privileges?.view_orders && <Badge variant="outline" className="text-xs bg-blue-50">View Orders</Badge>}
                                        {admin.privileges?.cancel_orders && <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Cancel Orders</Badge>}
                                        {admin.privileges?.view_auctions && <Badge variant="outline" className="text-xs bg-blue-50">View Auctions</Badge>}
                                        {admin.privileges?.manage_auctions && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">Manage Auctions</Badge>}
                                        {admin.privileges?.view_payouts && <Badge variant="outline" className="text-xs bg-blue-50">View Payouts</Badge>}
                                        {admin.privileges?.process_payouts && <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Process Payouts</Badge>}
                                        {admin.privileges?.view_escrows && <Badge variant="outline" className="text-xs bg-blue-50">View Escrows</Badge>}
                                        {admin.privileges?.manage_escrows && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">Manage Escrows</Badge>}
                                        {admin.privileges?.send_marketing && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">Marketing</Badge>}
                                        {admin.privileges?.manage_admins && <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 font-semibold">Manage Admins</Badge>}
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(admin.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {admin.email !== 'admin@jarnnmarket.com' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setEditingAdmin(admin)}>
                                          <KeyRound className="w-4 h-4 mr-2" />
                                          Edit Privileges
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Remove Admin
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No additional admins</p>
                        <p className="text-sm">Create a sub-admin to help manage the platform</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="mt-6">
                <div className="space-y-6">
                  {/* Subscription Stats */}
                  {subscriptionStats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
                              <p className="text-2xl font-bold">{subscriptionStats.total || 0}</p>
                            </div>
                            <CreditCard className="w-8 h-8 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Active</p>
                              <p className="text-2xl font-bold text-green-600">{subscriptionStats.active || 0}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Expired</p>
                              <p className="text-2xl font-bold text-amber-600">{subscriptionStats.expired || 0}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Plans</p>
                              <p className="text-2xl font-bold">{Object.keys(editingPlans).length}</p>
                            </div>
                            <Settings className="w-8 h-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Subscription Plans Editor */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Seller Subscription Plans
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Edit pricing and features for seller subscription plans
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetSubscriptionPlans}
                            disabled={savingPlans}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset to Defaults
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveSubscriptionPlans}
                            disabled={savingPlans}
                            className="bg-primary"
                          >
                            {savingPlans ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.entries(editingPlans).map(([planId, plan]) => (
                          <Card key={planId} className="border-2 hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <Badge variant={planId === 'monthly' ? 'default' : 'secondary'}>
                                  {planId === 'monthly' ? 'Most Popular' : planId.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{plan.duration_days} days</span>
                              </div>
                              <Input
                                value={plan.name}
                                onChange={(e) => handleUpdatePlanField(planId, 'name', e.target.value)}
                                className="font-bold text-lg mt-2"
                              />
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {/* Pricing */}
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Pricing</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">USD ($)</Label>
                                    <div className="relative">
                                      <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={plan.price_usd}
                                        onChange={(e) => handleUpdatePlanField(planId, 'price_usd', e.target.value)}
                                        className="pl-8"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">NGN (₦)</Label>
                                    <div className="relative">
                                      <span className="absolute left-2 top-2.5 text-sm text-muted-foreground">₦</span>
                                      <Input
                                        type="number"
                                        step="100"
                                        min="0"
                                        value={plan.price_ngn}
                                        onChange={(e) => handleUpdatePlanField(planId, 'price_ngn', e.target.value)}
                                        className="pl-8"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Duration */}
                              <div>
                                <Label className="text-xs text-muted-foreground">Duration (days)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={plan.duration_days}
                                  onChange={(e) => handleUpdatePlanField(planId, 'duration_days', e.target.value)}
                                />
                              </div>

                              {/* Max Listings */}
                              <div>
                                <Label className="text-xs text-muted-foreground">Max Listings (-1 = unlimited)</Label>
                                <Input
                                  type="number"
                                  min="-1"
                                  value={plan.max_listings || -1}
                                  onChange={(e) => handleUpdatePlanField(planId, 'max_listings', e.target.value)}
                                />
                              </div>

                              {/* Features */}
                              <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">Features</Label>
                                <div className="space-y-1">
                                  {plan.features?.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      <span>{feature}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {Object.keys(editingPlans).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No subscription plans found</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={handleResetSubscriptionPlans}
                          >
                            Initialize Default Plans
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => !open && setResetPasswordDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={processingId}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => !open && setSuspendDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Suspend User
            </DialogTitle>
            <DialogDescription>
              Suspend {suspendDialog.user?.email} ({suspendDialog.user?.role})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-days">Suspension Duration (days)</Label>
              <Input
                id="suspend-days"
                type="number"
                min="1"
                max="365"
                value={suspendDays}
                onChange={(e) => setSuspendDays(parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason (optional)</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter reason for suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspendUser} disabled={processingId}>
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelOrderDialog.open} onOpenChange={(open) => !open && setCancelOrderDialog({ open: false, order: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Cancel order: {cancelOrderDialog.order?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                This will cancel the order and refund any pending escrow to the buyer.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOrderDialog({ open: false, order: null })}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={processingId}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relist Order Dialog */}
      <Dialog open={relistDialog.open} onOpenChange={(open) => !open && setRelistDialog({ open: false, order: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Relist Auction
            </DialogTitle>
            <DialogDescription>
              Relist unpaid order: {relistDialog.order?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                This will reset the auction and make it available for bidding again.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relist-days">New Duration (days)</Label>
              <Input
                id="relist-days"
                type="number"
                min="1"
                max="30"
                value={relistDays}
                onChange={(e) => setRelistDays(parseInt(e.target.value) || 7)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRelistDialog({ open: false, order: null })}>
              Cancel
            </Button>
            <Button onClick={handleRelistOrder} disabled={processingId}>
              Relist Auction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => !open && setRefundDialog({ open: false, escrow: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Undo2 className="w-5 h-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Refund {refundDialog.escrow?.currency === 'NGN' ? '₦' : '$'}{refundDialog.escrow?.amount?.toLocaleString()} to buyer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                This will refund the escrow amount to the buyer and mark the order as refunded.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Textarea
                id="refund-reason"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog({ open: false, escrow: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={processingId}>
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={createAdminDialog} onOpenChange={setCreateAdminDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Create New Admin
            </DialogTitle>
            <DialogDescription>
              Add a new admin or sub-admin to help manage the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Name *</Label>
                <Input
                  id="admin-name"
                  placeholder="Admin name"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password *</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Enter password"
                value={newAdminForm.password}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Admin Type</Label>
              <div className="flex gap-4">
                <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${newAdminForm.role === 'sub_admin' ? 'border-blue-500 bg-blue-50' : ''}`}>
                  <input
                    type="radio"
                    name="admin-role"
                    value="sub_admin"
                    checked={newAdminForm.role === 'sub_admin'}
                    onChange={() => setNewAdminForm({ 
                      ...newAdminForm, 
                      role: 'sub_admin',
                      privileges: {
                        view_users: true,
                        approve_users: true,
                        delete_users: false,
                        view_orders: true,
                        cancel_orders: false,
                        view_auctions: true,
                        manage_auctions: false,
                        view_payouts: true,
                        process_payouts: false,
                        view_escrows: true,
                        manage_escrows: false,
                        send_marketing: false,
                        manage_admins: false
                      }
                    })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <Badge className="bg-blue-100 text-blue-800 mb-2">Sub-Admin</Badge>
                    <p className="text-xs text-muted-foreground">View + Approve only</p>
                  </div>
                </label>
                <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${newAdminForm.role === 'admin' ? 'border-red-500 bg-red-50' : ''}`}>
                  <input
                    type="radio"
                    name="admin-role"
                    value="admin"
                    checked={newAdminForm.role === 'admin'}
                    onChange={() => setNewAdminForm({ 
                      ...newAdminForm, 
                      role: 'admin',
                      privileges: {
                        view_users: true,
                        approve_users: true,
                        delete_users: true,
                        view_orders: true,
                        cancel_orders: true,
                        view_auctions: true,
                        manage_auctions: true,
                        view_payouts: true,
                        process_payouts: true,
                        view_escrows: true,
                        manage_escrows: true,
                        send_marketing: true,
                        manage_admins: true
                      }
                    })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <Badge className="bg-red-100 text-red-800 mb-2">Super Admin</Badge>
                    <p className="text-xs text-muted-foreground">Full access</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom Privileges for Sub-Admin */}
            {newAdminForm.role === 'sub_admin' && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-semibold">Customize Sub-Admin Privileges</Label>
                <p className="text-xs text-muted-foreground mb-3">Toggle individual permissions for this sub-admin</p>
                
                {/* User Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User Management</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Users</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.view_users}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, view_users: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Approve Users</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.approve_users}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, approve_users: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Delete Users</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.delete_users}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, delete_users: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Management</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Orders</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.view_orders}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, view_orders: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Cancel Orders</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.cancel_orders}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, cancel_orders: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Auction Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auction Management</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Auctions</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.view_auctions}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, view_auctions: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">Manage Auctions</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.manage_auctions}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, manage_auctions: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financial Management</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Payouts</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.view_payouts}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, view_payouts: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Process Payouts</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.process_payouts}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, process_payouts: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Escrows</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.view_escrows}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, view_escrows: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">Manage Escrows</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.manage_escrows}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, manage_escrows: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Admin & Marketing */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin & Marketing</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Send Marketing Emails</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.send_marketing}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, send_marketing: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">Manage Other Admins</span>
                      </div>
                      <Checkbox
                        checked={newAdminForm.privileges.manage_admins}
                        onCheckedChange={(checked) => setNewAdminForm({
                          ...newAdminForm,
                          privileges: { ...newAdminForm.privileges, manage_admins: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAdminDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin}>
              Create {newAdminForm.role === 'admin' ? 'Admin' : 'Sub-Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Privileges Dialog */}
      <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Edit Privileges for {editingAdmin?.name}
            </DialogTitle>
            <DialogDescription>
              Toggle individual permissions for this admin user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAdmin && (
              <>
                {/* User Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User Management</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Users</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.view_users}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, view_users: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Approve Users</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.approve_users}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, approve_users: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Delete Users</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.delete_users}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, delete_users: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Management</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Orders</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.view_orders}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, view_orders: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Cancel Orders</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.cancel_orders}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, cancel_orders: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Auction Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auction Management</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Auctions</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.view_auctions}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, view_auctions: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-purple-500" />
                        <span className="text-sm">Manage Auctions</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.manage_auctions}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, manage_auctions: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Management */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financial Management</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Payouts</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.view_payouts}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, view_payouts: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Process Payouts</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.process_payouts}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, process_payouts: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">View Escrows</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.view_escrows}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, view_escrows: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">Manage Escrows</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.manage_escrows}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, manage_escrows: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Admin & Marketing */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin & Marketing</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">Send Marketing Emails</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.send_marketing}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, send_marketing: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">Manage Other Admins</span>
                      </div>
                      <Checkbox
                        checked={editingAdmin.privileges?.manage_admins}
                        onCheckedChange={(checked) => setEditingAdmin({
                          ...editingAdmin,
                          privileges: { ...editingAdmin.privileges, manage_admins: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAdmin(null)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateAdminPrivileges(editingAdmin?.id, editingAdmin?.privileges)}>
              Save Privileges
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
