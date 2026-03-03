import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Search, Filter, X, MapPin, Truck, Globe, Package } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Livestock'];
const CURRENCIES = [
  { value: '', label: 'All Currencies' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'NGN', label: 'NGN (₦)' },
];
const DELIVERY_OPTIONS = [
  { value: '', label: 'All Delivery', icon: Package },
  { value: 'local_pickup', label: 'Local Pickup', icon: MapPin },
  { value: 'city_to_city', label: 'City-to-City', icon: Truck },
  { value: 'international', label: 'International', icon: Globe },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'most_bids', label: 'Most Bids' },
];

export const SearchBar = ({ compact = false, onSearch }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    currency: searchParams.get('currency') || '',
    delivery: searchParams.get('delivery') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sort_by: searchParams.get('sort_by') || 'newest',
  });
  const inputRef = useRef(null);

  const handleSearch = (e) => {
    e?.preventDefault();
    
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters.currency) params.set('currency', filters.currency);
    if (filters.delivery) params.set('delivery', filters.delivery);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.sort_by && filters.sort_by !== 'newest') params.set('sort_by', filters.sort_by);
    
    const searchString = params.toString();
    navigate(`/auctions${searchString ? `?${searchString}` : ''}`);
    
    if (onSearch) {
      onSearch({ query, ...filters });
    }
    
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      currency: '',
      delivery: '',
      min_price: '',
      max_price: '',
      sort_by: 'newest',
    });
    setQuery('');
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'newest').length + (query ? 1 : 0);

  if (compact) {
    return (
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 w-full md:w-64 rounded-full"
          data-testid="search-input-compact"
        />
      </form>
    );
  }

  return (
    <div className="w-full" data-testid="search-bar">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for vegetables, fruits, grains..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-4 py-6 text-lg rounded-full border-2 focus:border-primary"
            data-testid="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4 py-6 relative"
              data-testid="filter-button"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h3 className="font-semibold">Filter Results</h3>
              
              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                  <SelectTrigger data-testid="filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat === 'All' ? '' : cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Currency</label>
                <Select value={filters.currency} onValueChange={(v) => setFilters({ ...filters, currency: v })}>
                  <SelectTrigger data-testid="filter-currency">
                    <SelectValue placeholder="All Currencies" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Delivery Option</label>
                <Select value={filters.delivery} onValueChange={(v) => setFilters({ ...filters, delivery: v })}>
                  <SelectTrigger data-testid="filter-delivery">
                    <SelectValue placeholder="All Delivery Options" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Price Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.min_price}
                    onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                    className="w-1/2"
                    data-testid="filter-min-price"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.max_price}
                    onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                    className="w-1/2"
                    data-testid="filter-max-price"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sort By</label>
                <Select value={filters.sort_by} onValueChange={(v) => setFilters({ ...filters, sort_by: v })}>
                  <SelectTrigger data-testid="filter-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleSearch}
                  data-testid="apply-filters"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button type="submit" className="rounded-full px-8 py-6" data-testid="search-submit">
          <Search className="w-5 h-5 mr-2" />
          Search
        </Button>
      </form>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {query && (
            <Badge variant="secondary" className="gap-1">
              Search: {query}
              <button onClick={() => setQuery('')} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <button onClick={() => setFilters({ ...filters, category: '' })} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.currency && (
            <Badge variant="secondary" className="gap-1">
              {filters.currency}
              <button onClick={() => setFilters({ ...filters, currency: '' })} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.delivery && (
            <Badge variant="secondary" className="gap-1">
              {DELIVERY_OPTIONS.find(d => d.value === filters.delivery)?.label}
              <button onClick={() => setFilters({ ...filters, delivery: '' })} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(filters.min_price || filters.max_price) && (
            <Badge variant="secondary" className="gap-1">
              Price: {filters.min_price || '0'} - {filters.max_price || '∞'}
              <button onClick={() => setFilters({ ...filters, min_price: '', max_price: '' })} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
