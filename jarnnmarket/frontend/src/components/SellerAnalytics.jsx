import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  Gavel, 
  Package,
  Users,
  Star,
  BarChart3
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SellerAnalytics({ token, userId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, token]);

  const fetchAnalytics = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/sellers/me/analytics`, { headers });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Use computed analytics from available data
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner" />
      </div>
    );
  }

  // Default/computed analytics if API fails
  const data = analytics || {
    total_sales: 0,
    total_revenue: 0,
    total_views: 0,
    total_bids: 0,
    conversion_rate: 0,
    avg_sale_price: 0,
    active_listings: 0,
    completed_sales: 0,
    rating_avg: 0,
    rating_count: 0,
    revenue_trend: 0,
    top_categories: []
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${data.total_revenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: data.revenue_trend,
      trendLabel: 'vs last month'
    },
    {
      title: 'Total Sales',
      value: data.completed_sales || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Listings',
      value: data.active_listings || 0,
      icon: Gavel,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Total Views',
      value: data.total_views || 0,
      icon: Eye,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
    {
      title: 'Total Bids',
      value: data.total_bids || 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Seller Rating',
      value: data.rating_avg?.toFixed(1) || '0.0',
      subValue: `(${data.rating_count || 0} reviews)`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <div className="space-y-6" data-testid="seller-analytics">
      <div className="flex items-center justify-between">
        <h2 
          className="text-2xl font-bold"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          <BarChart3 className="w-6 h-6 inline-block mr-2 text-primary" />
          Analytics
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.subValue && (
                    <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                  )}
                  {stat.trend !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend >= 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600">+{stat.trend}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600">{stat.trend}%</span>
                        </>
                      )}
                      {stat.trendLabel && (
                        <span className="text-xs text-muted-foreground">{stat.trendLabel}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <span className="text-4xl font-bold text-primary">
                {data.conversion_rate?.toFixed(1) || 0}%
              </span>
              <span className="text-muted-foreground text-sm mb-1">
                Views → Sales
              </span>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(data.conversion_rate || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Sale Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <span className="text-4xl font-bold text-green-600 font-mono">
                ${data.avg_sale_price?.toFixed(2) || '0.00'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on {data.completed_sales || 0} completed sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {data.top_categories && data.top_categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.top_categories.map((cat, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {cat.name} ({cat.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-gradient-to-r from-primary/5 to-harvest/5 border-primary/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">💡 Tips to Boost Sales</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Add high-quality images (minimum 400x300 pixels)</li>
            <li>• Write detailed descriptions with keywords</li>
            <li>• Enable "Accept Offers" to attract more buyers</li>
            <li>• Respond quickly to offers and messages</li>
            <li>• Maintain good ratings with timely shipping</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
