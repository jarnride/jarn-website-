import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuctionCard from '@/components/AuctionCard';
import { 
  User, 
  MapPin, 
  Star, 
  Calendar, 
  Package, 
  Shield,
  Phone,
  Mail,
  ArrowLeft,
  Store
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const [sellerRes, auctionsRes, reviewsRes] = await Promise.all([
          axios.get(`${API}/users/${sellerId}/profile`),
          axios.get(`${API}/users/${sellerId}/auctions`),
          axios.get(`${API}/users/${sellerId}/reviews`)
        ]);
        
        setSeller(sellerRes.data);
        setAuctions(auctionsRes.data.filter(a => a.is_active));
        setReviews(reviewsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch seller data:', error);
        toast.error('Failed to load seller profile');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Store className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Seller Not Found</h1>
        <p className="text-muted-foreground mb-4">This seller profile doesn't exist</p>
        <Button onClick={() => navigate('/auctions')}>Browse Auctions</Button>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="min-h-screen bg-muted/30" data-testid="seller-profile-page">
      {/* Header */}
      <div className="bg-primary text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <Button 
            variant="ghost" 
            className="text-white mb-4 hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {seller.name}
                </h1>
                {seller.is_verified && (
                  <Badge className="bg-blue-500">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              {seller.company_name && (
                <p className="text-white/80 text-lg mb-2">{seller.company_name}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-white/70">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {seller.location || 'Nigeria'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {new Date(seller.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1 text-harvest">
                    <Star className="w-4 h-4 fill-harvest" />
                    {avgRating.toFixed(1)} ({reviews.length} reviews)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Seller Info Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {seller.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href={`tel:${seller.phone}`} className="font-medium hover:text-primary">
                        {seller.phone}
                      </a>
                    </div>
                  </div>
                )}
                
                {seller.email && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${seller.email}`} className="font-medium hover:text-primary">
                        {seller.email}
                      </a>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-4">
                  All communications are monitored for fraud prevention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seller Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Listings</span>
                    <span className="font-bold">{auctions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Reviews</span>
                    <span className="font-bold">{reviews.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <span className="font-bold flex items-center gap-1">
                      <Star className="w-4 h-4 fill-harvest text-harvest" />
                      {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${star <= review.rating ? 'fill-harvest text-harvest' : 'text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Seller's Auctions */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Package className="w-6 h-6 inline mr-2" />
              Active Listings ({auctions.length})
            </h2>
            
            {auctions.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {auctions.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active listings at the moment</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
