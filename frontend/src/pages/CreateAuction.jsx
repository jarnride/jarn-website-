import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, Upload } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Livestock'];
const DURATIONS = [
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
];

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800',
  'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800',
  'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800',
  'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800',
  'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800',
  'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800',
];

export default function CreateAuction() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    image_url: '',
    starting_bid: '',
    reserve_price: '',
    duration_hours: 24,
  });

  // Redirect if not farmer
  if (user && user.role !== 'farmer') {
    navigate('/dashboard');
    return null;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title || !form.category || !form.starting_bid) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ...form,
        starting_bid: parseFloat(form.starting_bid),
        reserve_price: form.reserve_price ? parseFloat(form.reserve_price) : null,
      };
      
      const response = await axios.post(`${API}/auctions`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Auction created successfully!');
      navigate(`/auctions/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12" data-testid="create-auction-page">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Create Auction
          </h1>
          <p className="text-muted-foreground">
            List your produce and start receiving bids
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="form-group">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Fresh Organic Tomatoes - 50kg"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
                required
                data-testid="auction-title-input"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your produce, quality, quantity, etc."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 min-h-[120px]"
                data-testid="auction-description-input"
              />
            </div>

            {/* Category & Location */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="form-group">
                <Label>Category *</Label>
                <Select 
                  value={form.category} 
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="auction-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="form-group">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Nairobi, Kenya"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="mt-1"
                  data-testid="auction-location-input"
                />
              </div>
            </div>

            {/* Image */}
            <div className="form-group">
              <Label>Product Image</Label>
              <div className="mt-2">
                {form.image_url ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-muted">
                    <img 
                      src={form.image_url} 
                      alt="Product" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: '' })}
                      className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center">
                    <ImagePlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Enter an image URL or select from samples</p>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      className="max-w-md mx-auto"
                      data-testid="auction-image-input"
                    />
                  </div>
                )}
              </div>
              
              {/* Sample images */}
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground">Or choose a sample image:</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {SAMPLE_IMAGES.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setForm({ ...form, image_url: url })}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        form.image_url === url ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={url} alt={`Sample ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="form-group">
                <Label htmlFor="starting_bid">Starting Bid ($) *</Label>
                <Input
                  id="starting_bid"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="50.00"
                  value={form.starting_bid}
                  onChange={(e) => setForm({ ...form, starting_bid: e.target.value })}
                  className="mt-1 font-mono"
                  required
                  data-testid="auction-starting-bid-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="reserve_price">Reserve Price ($)</Label>
                <Input
                  id="reserve_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional minimum"
                  value={form.reserve_price}
                  onChange={(e) => setForm({ ...form, reserve_price: e.target.value })}
                  className="mt-1 font-mono"
                  data-testid="auction-reserve-price-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The item won't sell if bidding doesn't reach this price
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <Label>Auction Duration *</Label>
              <Select 
                value={String(form.duration_hours)} 
                onValueChange={(value) => setForm({ ...form, duration_hours: parseInt(value) })}
              >
                <SelectTrigger className="mt-1" data-testid="auction-duration-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-full bg-primary hover:bg-primary/90"
                disabled={loading}
                data-testid="create-auction-submit"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create Auction
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
