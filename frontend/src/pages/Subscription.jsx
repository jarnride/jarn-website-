import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Crown, Zap, Star, Clock, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CURRENCY_SYMBOLS = { USD: '$', NGN: '₦' };

export default function Subscription() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.role !== 'farmer') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axios.get(`${API}/subscriptions/plans`),
        axios.get(`${API}/users/me/subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setPlans(plansRes.data.plans);
      setCurrentSubscription(subRes.data.subscription);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user.phone_verified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setSubscribing(planId);
    try {
      const response = await axios.post(
        `${API}/subscriptions/subscribe`,
        { plan_id: planId, currency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Successfully subscribed to ${response.data.plan}!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      await axios.post(
        `${API}/subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subscription cancelled');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription');
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case '5_days': return <Clock className="w-8 h-8 text-blue-500" />;
      case 'weekly': return <Zap className="w-8 h-8 text-purple-500" />;
      case 'monthly': return <Crown className="w-8 h-8 text-yellow-500" />;
      default: return <Star className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case '5_days': return 'border-blue-200 bg-blue-50/50';
      case 'weekly': return 'border-purple-200 bg-purple-50/50';
      case 'monthly': return 'border-yellow-200 bg-yellow-50/50';
      default: return '';
    }
  };

  const getPrice = (plan) => {
    return currency === 'NGN' ? plan.price_ngn : plan.price_usd;
  };

  if (!user || user.role !== 'farmer') return null;

  return (
    <div className="min-h-screen bg-muted/30 py-12" data-testid="subscription-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Seller Subscription Plans
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan to grow your farm business on Jarnnmarket
          </p>
        </div>

        {/* Current Subscription */}
        {currentSubscription && currentSubscription.status === 'active' && (
          <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Active Subscription</h3>
                  <p className="text-green-700">
                    {currentSubscription.plan_name} • Expires {new Date(currentSubscription.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleCancel} className="border-green-300 text-green-700 hover:bg-green-100">
                Cancel Subscription
              </Button>
            </div>
          </div>
        )}

        {/* Currency Selector */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 p-2 bg-card rounded-full border">
            <span className="text-sm text-muted-foreground pl-3">Currency:</span>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-32 border-0 bg-transparent" data-testid="currency-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="NGN">NGN (₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all hover:shadow-lg ${getPlanColor(plan.id)} ${
                  plan.id === 'monthly' ? 'md:-mt-4 md:mb-4 ring-2 ring-yellow-400' : ''
                }`}
              >
                {plan.id === 'monthly' && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-500 text-black">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription>
                    {plan.duration_days} {plan.duration_days === 1 ? 'day' : 'days'} access
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold font-mono">
                      {CURRENCY_SYMBOLS[currency]}{getPrice(plan).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/{plan.duration_days}d</span>
                  </div>
                  
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button
                    className={`w-full rounded-full ${
                      plan.id === 'monthly' 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                        : plan.id === 'weekly'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id || (currentSubscription?.status === 'active')}
                    data-testid={`subscribe-${plan.id}`}
                  >
                    {subscribing === plan.id ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : currentSubscription?.status === 'active' ? (
                      'Already Subscribed'
                    ) : (
                      'Subscribe Now'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Info Notice */}
        <div className="mt-12 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Note</p>
              <p className="text-sm text-amber-700">
                Subscription payments are currently processed in demo mode. In production, 
                you will be redirected to a secure payment gateway to complete your subscription.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
