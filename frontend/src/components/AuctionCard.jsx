import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, User, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const AuctionCard = ({ auction }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

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

  const isSold = auction.sold_via === 'buy_now' || !auction.is_active;

  return (
    <div className="auction-card card-hover" data-testid={`auction-card-${auction.id}`}>
      <div className="relative">
        <img
          src={auction.image_url}
          alt={auction.title}
          className="auction-card-image"
          loading="lazy"
        />
        <Badge className="auction-card-badge">{auction.category}</Badge>
        {auction.buy_now_price && !isSold && (
          <Badge className="absolute top-3 right-3 bg-harvest text-black">
            <Zap className="w-3 h-3 mr-1" />
            Buy Now
          </Badge>
        )}
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <User className="w-4 h-4" />
          <span>{auction.seller_name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          <span>{auction.location}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Bid</p>
            <p className="text-2xl font-bold text-primary font-mono">${auction.current_bid.toFixed(2)}</p>
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

        {auction.buy_now_price && !isSold && (
          <div className="mb-4 text-sm text-harvest font-medium">
            <Zap className="w-4 h-4 inline mr-1" />
            Buy Now: ${auction.buy_now_price.toFixed(2)}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{auction.bid_count} bids</span>
          <Link to={`/auctions/${auction.id}`}>
            <Button 
              className="rounded-full bg-primary hover:bg-primary/90 btn-hover-lift" 
              data-testid={`bid-now-${auction.id}`}
              disabled={isSold}
            >
              {isSold ? 'View' : 'Bid Now'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuctionCard;
