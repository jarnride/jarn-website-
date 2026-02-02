import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MapPin, User, Zap, Star, MessageSquare, CheckCircle, Shield, ShoppingCart, Check, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import QuickViewModal from '@/components/QuickViewModal';

export const AuctionCard = ({ auction }) => {
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(auction.ends_at).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0 || !auction.is_active) {
        setTimeLeft('Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(hours < 2);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [auction.ends_at, auction.is_active]);

  const isSold = auction.sold_via === 'buy_now' || auction.sold_via === 'offer' || (!auction.is_active && auction.winner_id);
  const isBuyNowOnly = auction.buy_now_only;
  const acceptsOffers = auction.accepts_offers;
  const inCart = isInCart(auction.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(auction, 1);
    setJustAdded(true);
    toast.success(`${auction.title} added to cart!`, {
      action: {
        label: 'View Cart',
        onClick: () => navigate('/checkout')
      }
    });
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <>
    <div className="auction-card card-hover" data-testid={`auction-card-${auction.id}`}>
      <div className="relative group">
        <img
          src={auction.image_url}
          alt={auction.title}
          className="auction-card-image cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          onClick={() => navigate(`/seller/${auction.seller_id}`)}
          title={`View ${auction.seller_name}'s profile`}
        />
        <Badge className="auction-card-badge">{auction.category}</Badge>
        
        {/* Quick View Button - appears on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowQuickView(true);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 hover:bg-white text-black px-4 py-2 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-2 shadow-lg"
          data-testid={`quick-view-${auction.id}`}
        >
          <Eye className="w-4 h-4" />
          Quick View
        </button>
        
        {/* Badges for listing types */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {isBuyNowOnly && !isSold ? (
            <Badge className="bg-harvest text-black">
              <Zap className="w-3 h-3 mr-1" />
              Buy Now Only
            </Badge>
          ) : auction.buy_now_price && !isSold && (
            <Badge className="bg-harvest text-black">
              <Zap className="w-3 h-3 mr-1" />
              Buy Now
            </Badge>
          )}
          {acceptsOffers && !isSold && (
            <Badge className="bg-blue-500 text-white">
              <MessageSquare className="w-3 h-3 mr-1" />
              Offers
            </Badge>
          )}
        </div>
        
        {isSold && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge className="bg-accent text-white text-lg px-4 py-2">SOLD</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 
          className="text-lg font-semibold mb-2 line-clamp-2" 
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {auction.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <User className="w-4 h-4" />
          <span>{auction.seller_name}</span>
          {auction.seller_verified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="inline-flex items-center">
                    <Shield className="w-4 h-4 text-blue-500 fill-blue-100" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Verified Seller</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {auction.seller_rating > 0 && (
            <span className="flex items-center gap-1 text-harvest">
              <Star className="w-3 h-3 fill-harvest" />
              {auction.seller_rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          <span>{auction.location}</span>
          {auction.quantity > 1 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              Qty: {auction.quantity}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {isBuyNowOnly ? 'Price' : 'Current Bid'}
            </p>
            <p className="text-2xl font-bold text-primary font-mono">
              {auction.currency === 'NGN' ? '₦' : '$'}{auction.current_bid.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {isSold ? 'Status' : 'Time Left'}
            </p>
            <p className={`font-mono font-semibold ${isUrgent && !isSold ? 'text-accent animate-countdown' : 'text-foreground'}`}>
              {isSold ? (
                <span className="text-accent">Sold</span>
              ) : (
                <>
                  <Clock className="w-4 h-4 inline mr-1" />
                  {timeLeft}
                </>
              )}
            </p>
          </div>
        </div>

        {auction.buy_now_price && !isSold && !isBuyNowOnly && (
          <div className="mb-4 text-sm text-harvest font-medium">
            <Zap className="w-4 h-4 inline mr-1" />
            Buy Now: ${auction.buy_now_price.toFixed(2)}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {isBuyNowOnly ? 'Fixed Price' : `${auction.bid_count} bids`}
          </span>
          <div className="flex gap-2">
            {/* Add to Cart Button - Only for Buy Now items */}
            {(auction.buy_now_price || isBuyNowOnly) && !isSold && (
              <Button 
                variant={inCart || justAdded ? "secondary" : "outline"}
                size="icon"
                className={`rounded-full transition-all ${justAdded ? 'bg-green-100 text-green-600' : ''}`}
                onClick={handleAddToCart}
                data-testid={`add-to-cart-${auction.id}`}
                title={inCart ? 'In Cart' : 'Add to Cart'}
              >
                {justAdded || inCart ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
              </Button>
            )}
            <Link to={`/auctions/${auction.id}`}>
              <Button 
                className="rounded-full bg-primary hover:bg-primary/90 btn-hover-lift" 
                data-testid={`bid-now-${auction.id}`}
                disabled={isSold}
              >
                {isSold ? 'View' : isBuyNowOnly ? 'Buy Now' : 'Bid Now'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
