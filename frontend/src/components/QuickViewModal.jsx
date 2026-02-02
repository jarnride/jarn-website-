import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Clock, 
  MapPin, 
  User, 
  Zap, 
  ShoppingCart, 
  Check, 
  Eye,
  Star,
  Package,
  Shield
} from 'lucide-react';

export default function QuickViewModal({ auction, open, onClose }) {
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  if (!auction) return null;

  const isSold = auction.sold_via === 'buy_now' || auction.sold_via === 'offer' || (!auction.is_active && auction.winner_id);
  const isBuyNowOnly = auction.buy_now_only;
  const inCart = isInCart(auction.id);
  const currency = auction.currency === 'NGN' ? '₦' : '$';
  const price = isBuyNowOnly ? auction.buy_now_price : auction.current_bid;

  const handleAddToCart = () => {
    addToCart(auction, 1);
    setJustAdded(true);
    toast.success(`${auction.title} added to cart!`);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleViewDetails = () => {
    onClose();
    navigate(`/auctions/${auction.id}`);
  };

  const handleViewSeller = () => {
    onClose();
    navigate(`/seller/${auction.seller_id}`);
  };

  const getTimeLeft = () => {
    const endTime = new Date(auction.ends_at).getTime();
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0 || !auction.is_active) return 'Ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" data-testid="quick-view-modal">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative">
            <img 
              src={auction.image_url} 
              alt={auction.title}
              className="w-full h-64 md:h-full object-cover"
            />
            <Badge className="absolute top-3 left-3 bg-primary">
              {auction.category}
            </Badge>
            {isBuyNowOnly && (
              <Badge className="absolute top-3 right-3 bg-harvest text-black">
                <Zap className="w-3 h-3 mr-1" />
                Buy Now Only
              </Badge>
            )}
            {isSold && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Badge className="bg-red-500 text-white text-lg px-4 py-2">SOLD</Badge>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="text-xl font-bold line-clamp-2">
                {auction.title}
              </DialogTitle>
            </DialogHeader>

            {/* Seller Info */}
            <button 
              onClick={handleViewSeller}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
            >
              <User className="w-4 h-4" />
              <span>{auction.seller_name}</span>
              {auction.seller_rating > 0 && (
                <span className="flex items-center text-harvest">
                  <Star className="w-3 h-3 fill-harvest mr-1" />
                  {auction.seller_rating.toFixed(1)}
                </span>
              )}
            </button>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span>{auction.location}</span>
            </div>

            {/* Price */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                {isBuyNowOnly ? 'Fixed Price' : 'Current Bid'}
              </p>
              <p className="text-3xl font-bold text-primary font-mono">
                {currency}{price?.toLocaleString() || '0'}
              </p>
              {!isBuyNowOnly && auction.buy_now_price && (
                <p className="text-sm text-harvest mt-1">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Buy Now: {currency}{auction.buy_now_price.toLocaleString()}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{getTimeLeft()}</span>
              </div>
              {!isBuyNowOnly && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>{auction.bid_count} bids</span>
                </div>
              )}
            </div>

            {/* Description Preview */}
            {auction.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {auction.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="mt-auto space-y-2">
              {!isSold && (auction.buy_now_price || isBuyNowOnly) && (
                <Button
                  className={`w-full rounded-full ${justAdded || inCart ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={handleAddToCart}
                  data-testid="quick-view-add-cart"
                >
                  {justAdded || inCart ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {inCart ? 'In Cart' : 'Added!'}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart - {currency}{(auction.buy_now_price || price)?.toLocaleString()}
                    </>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={handleViewDetails}
                data-testid="quick-view-details"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Full Details
              </Button>
            </div>

            {/* Trust Badge */}
            <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secure payment • Buyer protection
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
