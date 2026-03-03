import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Bell, 
  MessageSquare, 
  Trophy, 
  DollarSign, 
  Package, 
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'offer_received':
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case 'offer_accepted':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'offer_rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'auction_won':
      return <Trophy className="w-4 h-4 text-yellow-500" />;
    case 'payout_ready':
      return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'escrow_held':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'pending_delivery':
      return <Package className="w-4 h-4 text-blue-500" />;
    case 'outbid':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const NotificationItem = ({ notification, onClose }) => {
  const getLink = () => {
    if (notification.type === 'offer_received') {
      return '/dashboard';
    }
    if (notification.auction_id) {
      return `/auctions/${notification.auction_id}`;
    }
    return '/dashboard';
  };

  return (
    <Link 
      to={getLink()} 
      onClick={onClose}
      className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg"
    >
      <div className="mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
      {notification.amount && (
        <Badge variant="secondary" className="shrink-0 font-mono">
          ${notification.amount.toFixed(0)}
        </Badge>
      )}
    </Link>
  );
};

export const NotificationBell = () => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, token, fetchNotifications]);

  // Refresh when popover opens
  useEffect(() => {
    if (open && token) {
      fetchNotifications();
    }
  }, [open, token, fetchNotifications]);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 md:w-96 p-0" 
        align="end"
        data-testid="notification-panel"
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Link to="/dashboard" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full text-sm">
                View All in Dashboard
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
