import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  Clock, 
  ArrowLeft,
  Zap,
  Package
} from 'lucide-react';

export default function Wishlist() {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist, clearWishlist, loading } = useWishlist();
  const { addToCart, isInCart } = useCart();

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

  const handleAddToCart = (item) => {
    addToCart(item, 1);
    toast.success(`${item.title} added to cart!`);
  };

  const handleRemove = (itemId, itemTitle) => {
    removeFromWishlist(itemId);
    toast.success(`${itemTitle} removed from wishlist`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" data-testid="wishlist-page">
      {/* Header */}
      <div className="bg-primary text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <Button 
            variant="ghost" 
            className="text-white mb-4 hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 fill-white" />
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Wishlist
            </h1>
            <Badge className="bg-white/20 text-white">
              {wishlistItems.length} items
            </Badge>
          </div>
          <p className="text-white/70 mt-2">Items you've saved for later</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Save items you're interested in by clicking the heart icon
              </p>
              <Button onClick={() => navigate('/auctions')} className="rounded-full">
                Browse Auctions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Actions */}
            <div className="flex justify-end mb-6">
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-destructive"
                onClick={clearWishlist}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {/* Wishlist Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.map((item) => {
                const currency = item.currency === 'NGN' ? '₦' : '$';
                const price = item.buy_now_only ? item.buy_now_price : item.current_bid;
                const timeLeft = getTimeLeft(item.ends_at);
                const isEnded = timeLeft === 'Ended';
                const inCart = isInCart(item.id);

                return (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden group"
                    data-testid={`wishlist-item-${item.id}`}
                  >
                    <div className="relative">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => navigate(`/auctions/${item.id}`)}
                      />
                      {item.buy_now_only && (
                        <Badge className="absolute top-2 left-2 bg-harvest text-black">
                          <Zap className="w-3 h-3 mr-1" />
                          Buy Now
                        </Badge>
                      )}
                      {isEnded && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white">Ended</Badge>
                        </div>
                      )}
                      {/* Remove button */}
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemove(item.id, item.title)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <CardContent className="p-4">
                      <h3 
                        className="font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/auctions/${item.id}`)}
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.seller_name}
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-primary font-mono">
                            {currency}{price?.toLocaleString() || '0'}
                          </p>
                          {!isEnded && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeLeft}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {(item.buy_now_price || item.buy_now_only) && !isEnded && (
                          <Button
                            variant={inCart ? "secondary" : "default"}
                            size="sm"
                            className="flex-1 rounded-full"
                            onClick={() => handleAddToCart(item)}
                            disabled={inCart}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {inCart ? 'In Cart' : 'Add to Cart'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => navigate(`/auctions/${item.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
