import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { X, Plus, Minus, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    isCartOpen, 
    closeCart, 
    removeFromCart, 
    updateQuantity, 
    getCartTotal,
    clearCart 
  } = useCart();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleKeepShopping = () => {
    closeCart();
    navigate('/auctions');
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={closeCart}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col" data-testid="cart-drawer">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Your Cart ({cartItems.length} items)
          </SheetTitle>
          <SheetDescription>
            Review your items before checkout
          </SheetDescription>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Your cart is empty</p>
            <p className="text-muted-foreground text-center mb-6">
              Browse our auctions and add items to your cart
            </p>
            <Button onClick={handleKeepShopping} className="rounded-full">
              Browse Auctions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cartItems.map(({ auction, quantity }) => {
                const price = auction.buy_now_price || auction.current_bid;
                const currency = auction.currency === 'NGN' ? '₦' : '$';
                
                return (
                  <div 
                    key={auction.id} 
                    className="flex gap-3 p-3 bg-muted/50 rounded-lg"
                    data-testid={`cart-item-${auction.id}`}
                  >
                    <img 
                      src={auction.image_url} 
                      alt={auction.title}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{auction.title}</h4>
                      <p className="text-xs text-muted-foreground">{auction.seller_name}</p>
                      <p className="text-primary font-bold font-mono mt-1">
                        {currency}{price.toLocaleString()}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(auction.id, quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(auction.id, quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 ml-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart(auction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Footer */}
            <div className="border-t pt-4 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span className="font-mono text-primary">
                  ${getCartTotal().toLocaleString()}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full rounded-full bg-primary hover:bg-primary/90"
                  onClick={handleCheckout}
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-full"
                  onClick={handleKeepShopping}
                  data-testid="keep-shopping-btn"
                >
                  Keep Shopping
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-red-500"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
