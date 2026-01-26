import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AuctionCard from '@/components/AuctionCard';
import SearchBar from '@/components/SearchBar';
import { Search, ChevronLeft, ChevronRight, Package, MapPin } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Nigerian states for location picker
const NIGERIAN_STATES = [
  "Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti",
  "Edo", "Delta", "Rivers", "Bayelsa", "Akwa Ibom", "Cross River",
  "Abia", "Imo", "Anambra", "Enugu", "Ebonyi",
  "Kwara", "Kogi", "Benue", "Plateau", "Nassarawa", "Niger", "FCT",
  "Kaduna", "Kano", "Katsina", "Jigawa", "Zamfara", "Sokoto", "Kebbi",
  "Bauchi", "Gombe", "Yobe", "Borno", "Adamawa", "Taraba"
];

export default function Auctions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buyerLocation, setBuyerLocation] = useState(localStorage.getItem('buyer_location') || '');

  // Get filters from URL
  const filters = {
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    currency: searchParams.get('currency') || '',
    delivery: searchParams.get('delivery') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sort_by: searchParams.get('sort_by') || 'nearest',
    page: parseInt(searchParams.get('page')) || 1,
  };

  useEffect(() => {
    fetchAuctions();
  }, [searchParams, buyerLocation]);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.category) params.set('category', filters.category);
      if (filters.currency) params.set('currency', filters.currency);
      if (filters.delivery) params.set('delivery', filters.delivery);
      if (filters.min_price) params.set('min_price', filters.min_price);
      if (filters.max_price) params.set('max_price', filters.max_price);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (buyerLocation) params.set('buyer_location', buyerLocation);
      params.set('page', filters.page.toString());
      params.set('limit', '12');

      const response = await axios.get(`${API}/auctions/search?${params.toString()}`);
      setAuctions(response.data.auctions);
      setTotalResults(response.data.total);
      setCurrentPage(response.data.page);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
      // Fallback to regular auctions endpoint
      try {
        const response = await axios.get(`${API}/auctions`);
        setAuctions(response.data);
        setTotalResults(response.data.length);
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (value) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort_by', value);
    params.delete('page'); // Reset to page 1
    setSearchParams(params);
  };

  const handleLocationChange = (value) => {
    setBuyerLocation(value);
    localStorage.setItem('buyer_location', value);
  };

  const hasActiveFilters = filters.q || filters.category || filters.currency || 
    filters.delivery || filters.min_price || filters.max_price;

  return (
    <div className="min-h-screen bg-background" data-testid="auctions-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4" 
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Find Fresh Produce
          </h1>
          <p className="text-muted-foreground mb-8">
            Search {totalResults > 0 ? `${totalResults} listings` : 'our marketplace'} for quality farm products
          </p>
          
          {/* Search Bar */}
          <SearchBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {loading ? 'Loading...' : `${totalResults} ${totalResults === 1 ? 'result' : 'results'}`}
            </h2>
            {hasActiveFilters && (
              <Badge variant="secondary" className="gap-1">
                Filtered
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={filters.sort_by} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="most_bids">Most Bids</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auction Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : auctions.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="auction-grid">
              {auctions.map((auction, index) => (
                <div 
                  key={auction.id} 
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <AuctionCard auction={auction} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                      data-testid={`page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16" data-testid="no-results">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {hasActiveFilters 
                ? "Try adjusting your search or filters to find what you're looking for"
                : "There are no active listings at the moment. Check back soon!"}
            </p>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                onClick={() => setSearchParams({})}
                data-testid="clear-all-filters"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
