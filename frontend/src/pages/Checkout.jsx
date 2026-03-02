import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShoppingCart, 
  CreditCard, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus,
  MapPin,
  Truck,
  Home,
  Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [deliveryOption, setDeliveryOption] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [processing, setProcessing] = useState(false);

  const deliveryOptions = [
    { value: 'pickup', label: 'Pickup', description: 'Pick up from seller location', icon: Home, fee: 0 },
    { value: 'standard', label: 'Standard Delivery', description: '5-7 business days', icon: Package, fee: 2500 },
    { value: 'express', label: 'Express Delivery', description: '1-2 business days', icon: Truck, fee: 5000 }
  ];

  const handleKeepShopping = () => {
    navigate('/auctions');
  };

  const handleRemoveItem = (auctionId) => {
    removeFromCart(auctionId);
    if (cartItems.length === 1) {
      navigate('/auctions');
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/auth');
      return;
    }

    if (!deliveryOption) {
      toast.error('Please select a delivery option');
      return;
    }

    if (deliveryOption !== 'pickup' && !deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    setProcessing(true);
    try {
      if (paymentMethod === 'paystack') {
        // Get the first auction ID from cart for Paystack payment
        const auctionId = cartItems[0]?.id;
        if (!auctionId) {
          toast.error('No items in cart');
          return;
        }

        // Initialize Paystack payment
        const response = await axios.post(
          `${API}/api/paystack/initialize`,
          { 
            auction_id: auctionId,
            amount: total,
            delivery_option: deliveryOption,
            delivery_address: deliveryOption !== 'pickup' ? deliveryAddress : null,
            delivery_fee: deliveryFee
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.authorization_url) {
          // Store cart info for after payment
          localStorage.setItem('pending_order', JSON.stringify({
            cartItems,
            deliveryOption,
            deliveryAddress,
            deliveryFee,
            total,
            reference: response.data.reference
          }));
          
          // Redirect to Paystack checkout
          window.location.href = response.data.authorization_url;
        } else {
          toast.error('Failed to initialize payment');
        }
      } else if (paymentMethod === 'stripe') {
        // Stripe payment flow
        const auctionId = cartItems[0]?.id;
        const response = await axios.post(
          `${API}/api/create-checkout-session`,
          { 
            auction_id: auctionId,
            delivery_option: deliveryOption,
            delivery_address: deliveryOption !== 'pickup' ? deliveryAddress : null
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          toast.error('Failed to create checkout session');
        }
      } else if (paymentMethod === 'paypal') {
        // PayPal payment flow
        const auctionId = cartItems[0]?.id;
        const response = await axios.post(
          `${API}/api/paypal/create-order`,
          { 
            auction_id: auctionId,
            delivery_option: deliveryOption,
            delivery_address: deliveryOption !== 'pickup' ? deliveryAddress : null
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Find the approval URL in PayPal links
        const approvalLink = response.data.links?.find(link => link.rel === 'approve');
        if (approvalLink) {
          window.location.href = approvalLink.href;
        } else {
          toast.error('Failed to create PayPal order');
        }
      } else {
        toast.error('Please select a payment method');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error.response?.data?.detail || 'Checkout failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-16">
            <ShoppingCart className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">
              Browse our auctions and add items to your cart
            </p>
            <Button onClick={handleKeepShopping} className="rounded-full" size="lg">
              Browse Auctions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getCartTotal();
  const selectedDelivery = deliveryOptions.find(d => d.value === deliveryOption);
  const deliveryFee = selectedDelivery?.fee || 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-muted/30 py-8" data-testid="checkout-page">
      {/* Header */}
      <div className="bg-primary text-white py-8 mb-8">
        <div className="max-w-6xl mx-auto px-4">
          <Button 
            variant="ghost" 
            className="text-white mb-4 hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Checkout
          </h1>
          <p className="text-white/70">{cartItems.length} item(s) in your cart</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map(({ auction, quantity }) => {
                  const price = auction.buy_now_price || auction.current_bid;
                  const currency = auction.currency === 'NGN' ? '₦' : '$';
                  
                  return (
                    <div 
                      key={auction.id} 
                      className="flex gap-4 p-4 bg-muted/50 rounded-lg"
                      data-testid={`checkout-item-${auction.id}`}
                    >
                      <img 
                        src={auction.image_url} 
                        alt={auction.title}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => navigate(`/seller/${auction.seller_id}`)}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{auction.title}</h3>
                        <p className="text-sm text-muted-foreground">{auction.seller_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {auction.location}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(auction.id, quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(auction.id, quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary font-mono">
                              {currency}{(price * quantity).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currency}{price.toLocaleString()} each
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveItem(auction.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Delivery Option */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Delivery Option
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={deliveryOption} onValueChange={setDeliveryOption}>
                  <SelectTrigger data-testid="delivery-option-select">
                    <SelectValue placeholder="Select delivery option" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          <div>
                            <span className="font-medium">{option.label}</span>
                            <span className="text-muted-foreground ml-2 text-sm">
                              {option.fee === 0 ? 'FREE' : `₦${option.fee.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedDelivery && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                    <selectedDelivery.icon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedDelivery.label}</p>
                      <p className="text-sm text-muted-foreground">{selectedDelivery.description}</p>
                    </div>
                    <div className="ml-auto font-mono font-bold">
                      {selectedDelivery.fee === 0 ? 'FREE' : `₦${selectedDelivery.fee.toLocaleString()}`}
                    </div>
                  </div>
                )}

                {/* Delivery Address - only show if not pickup */}
                {deliveryOption && deliveryOption !== 'pickup' && (
                  <div className="space-y-2">
                    <Label htmlFor="delivery-address">Delivery Address</Label>
                    <Input 
                      id="delivery-address"
                      placeholder="Enter your full delivery address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      <span className="font-medium">Credit/Debit Card</span>
                      <span className="text-sm text-muted-foreground block">Pay securely with Stripe</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg mt-2">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <span className="font-medium">PayPal</span>
                      <span className="text-sm text-muted-foreground block">Pay with your PayPal account</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg mt-2">
                    <RadioGroupItem value="paystack" id="paystack" />
                    <Label htmlFor="paystack" className="flex-1 cursor-pointer">
                      <span className="font-medium">Paystack (NGN)</span>
                      <span className="text-sm text-muted-foreground block">Pay with Nigerian cards</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-mono">
                    {!deliveryOption ? 'Select option' : deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="font-mono text-primary">${total.toLocaleString()}</span>
                </div>

                <Button 
                  className="w-full rounded-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processing}
                  data-testid="place-order-btn"
                >
                  {processing ? 'Processing...' : 'Place Order'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full rounded-full"
                  onClick={handleKeepShopping}
                  data-testid="keep-shopping-checkout-btn"
                >
                  Keep Shopping
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By placing your order, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
