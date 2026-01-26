import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Clock, AlertTriangle, Zap, Package } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SellerTrialBanner() {
  const { user, token } = useAuth();
  const [allowance, setAllowance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'farmer' && token) {
      fetchAllowance();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  const fetchAllowance = async () => {
    try {
      const response = await axios.get(`${API}/sellers/me/listing-allowance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllowance(response.data);
    } catch (error) {
      console.error('Failed to fetch listing allowance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user || user.role !== 'farmer') {
    return null;
  }

  if (!allowance) return null;

  // Free trial eligible - hasn't started yet
  if (allowance.listing_type === 'free_trial_eligible') {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Welcome Seller!</p>
                <p className="text-sm text-green-600">
                  Start with <strong>5 FREE listings</strong> for 3 days - no subscription required!
                </p>
              </div>
            </div>
            <Link to="/create-auction">
              <Button className="bg-green-600 hover:bg-green-700 rounded-full">
                <Zap className="w-4 h-4 mr-2" />
                Create Your First Listing
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active free trial
  if (allowance.listing_type === 'free_trial' && allowance.can_list) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-blue-800">Free Trial Active</p>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {allowance.remaining_listings} listings left
                  </Badge>
                </div>
                <p className="text-sm text-blue-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {allowance.days_remaining} days remaining
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/create-auction">
                <Button variant="outline" className="rounded-full border-blue-300 text-blue-600">
                  Create Listing
                </Button>
              </Link>
              <Link to="/subscription">
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-full">
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free trial exhausted or expired
  if (!allowance.can_list && allowance.upgrade_required) {
    return (
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800">Free Trial Ended</p>
                <p className="text-sm text-amber-600">
                  {allowance.reason || 'Subscribe to continue creating listings'}
                </p>
              </div>
            </div>
            <Link to="/subscription">
              <Button className="bg-amber-600 hover:bg-amber-700 rounded-full">
                Subscribe Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription
  if (allowance.listing_type === 'subscription') {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-purple-800">Premium Seller</p>
                  <Badge className="bg-purple-600">{allowance.plan}</Badge>
                </div>
                <p className="text-sm text-purple-600">
                  Unlimited listings • Expires {new Date(allowance.ends_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Link to="/create-auction">
              <Button className="bg-purple-600 hover:bg-purple-700 rounded-full">
                Create Listing
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
