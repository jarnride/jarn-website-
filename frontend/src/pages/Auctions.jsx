import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import AuctionCard from '@/components/AuctionCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Livestock'];
const LOCATIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu'];

export default function Auctions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get('category') ? [searchParams.get('category')] : []
  );
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sortBy, setSortBy] = useState('ends_at');

  useEffect(() => {
    fetchAuctions();
  }, [selectedCategories, selectedLocation]);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategories.length === 1) {
        params.append('category', selectedCategories[0]);
      }
      if (selectedLocation) {
        params.append('location', selectedLocation);
      }
      
      const response = await axios.get(`${API}/auctions?${params.toString()}`);
      setAuctions(response.data);
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedLocation('');
    setSearchQuery('');
    setSearchParams({});
  };

  const filteredAuctions = auctions
    .filter(auction => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          auction.title.toLowerCase().includes(query) ||
          auction.description?.toLowerCase().includes(query) ||
          auction.seller_name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(auction => {
      if (selectedCategories.length > 0) {
        return selectedCategories.includes(auction.category);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ends_at') {
        return new Date(a.ends_at) - new Date(b.ends_at);
      }
      if (sortBy === 'price_low') {
        return a.current_bid - b.current_bid;
      }
      if (sortBy === 'price_high') {
        return b.current_bid - a.current_bid;
      }
      if (sortBy === 'bids') {
        return b.bid_count - a.bid_count;
      }
      return 0;
    });

  const hasActiveFilters = selectedCategories.length > 0 || selectedLocation || searchQuery;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div className="filter-section">
        <h3 className="filter-title">Categories</h3>
        <div className="space-y-3">
          {CATEGORIES.map(category => (
            <div key={category} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
                data-testid={`filter-category-${category.toLowerCase()}`}
              />
              <Label htmlFor={`cat-${category}`} className="cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="filter-section">
        <h3 className="filter-title">Location</h3>
        <Select value={selectedLocation || "all"} onValueChange={(val) => setSelectedLocation(val === "all" ? "" : val)}>
          <SelectTrigger data-testid="filter-location">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {LOCATIONS.map(location => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={clearFilters}
          data-testid="clear-filters"
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background" data-testid="auctions-page">
      {/* Header */}
      <div className="bg-secondary/30 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Live Auctions
          </h1>
          <p className="text-muted-foreground">
            {filteredAuctions.length} active auctions available
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Search & Sort Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search auctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>

          <div className="flex gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ends_at">Ending Soon</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="bids">Most Bids</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden" data-testid="mobile-filter-btn">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {selectedCategories.length + (selectedLocation ? 1 : 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0" data-testid="filter-sidebar">
            <div className="sticky top-24 bg-card p-6 rounded-xl border">
              <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Filters
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Auction Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="spinner" />
              </div>
            ) : filteredAuctions.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="auction-grid">
                {filteredAuctions.map((auction, index) => (
                  <div 
                    key={auction.id} 
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <AuctionCard auction={auction} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" data-testid="no-results">
                <div className="empty-state-icon">
                  <Search className="w-full h-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No auctions found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
