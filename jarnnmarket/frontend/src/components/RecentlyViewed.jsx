import { useNavigate } from 'react-router-dom';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, History, ShoppingCart, Check, Zap, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const { recentItems, clearRecentlyViewed } = useRecentlyViewed();
  const { addToCart, isInCart } = useCart();

  if (recentItems.length === 0) return null;

  const getTimeLeft = (endsAt) => {
    const endTime = new Date(endsAt).getTime();
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    } else if (hours > 0) {
      return `${hours}h left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m left`;
    }
  };

  const handleAddToCart = (e, item) => {
    e.stopPropagation();
    addToCart(item, 1);
    toast.success(`${item.title} added to cart!`);
  };

  return (
    <section className="py-12 bg-muted/30" data-testid="recently-viewed-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <h2 
              className="text-2xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Recently Viewed
            </h2>
            <Badge variant="secondary" className="ml-2">
              {recentItems.length} items
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearRecentlyViewed}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {recentItems.map((item) => {
            const currency = item.currency === 'NGN' ? '₦' : '$';
            const price = item.buy_now_only ? item.buy_now_price : item.current_bid;
            const inCart = isInCart(item.id);
            const timeLeft = getTimeLeft(item.ends_at);
            const isEnded = timeLeft === 'Ended';

            return (
              <div
                key={item.id}
                className="flex-shrink-0 w-48 bg-card rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/auctions/${item.id}`)}
                data-testid={`recent-item-${item.id}`}
              >
                <div className="relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                  />
                  {item.buy_now_only && (
                    <Badge className="absolute top-2 left-2 bg-harvest text-black text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Buy Now
                    </Badge>
                  )}
                  {isEnded && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge className="bg-red-500 text-white">Ended</Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.seller_name}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary font-mono text-sm">
                        {currency}{price?.toLocaleString() || '0'}
                      </p>
                      {!isEnded && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeLeft}
                        </p>
                      )}
                    </div>
                    
                    {(item.buy_now_price || item.buy_now_only) && !isEnded && (
                      <Button
                        variant={inCart ? "secondary" : "outline"}
                        size="icon"
                        className={`h-8 w-8 rounded-full ${inCart ? 'bg-green-100 text-green-600' : ''}`}
                        onClick={(e) => handleAddToCart(e, item)}
                      >
                        {inCart ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
