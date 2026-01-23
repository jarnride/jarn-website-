import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  Package,
  ShoppingCart,
  Shield,
  Globe,
  Home
} from 'lucide-react';

const DELIVERY_ICONS = {
  local_pickup: Home,
  city_delivery: Truck,
  international: Globe
};

const DELIVERY_LABELS = {
  local_pickup: 'Local Pickup',
  city_delivery: 'City-to-City Delivery',
  international: 'International Shipping'
};

export default function CheckoutModal({ 
  open, 
  onOpenChange, 
  auction, 
  onCheckout, 
  loading 
}) {
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const deliveryOptions = auction?.delivery_options || [];
  const currency = auction?.currency || 'USD';
  const currencySymbol = currency === 'NGN' ? '₦' : '$';
  const buyNowPrice = auction?.buy_now_price || 0;

  // Get selected delivery cost
  const selectedDeliveryOption = deliveryOptions.find(d => d.type === selectedDelivery);
  const deliveryCost = selectedDeliveryOption?.cost || 0;
  const totalAmount = buyNowPrice + deliveryCost;

  // Auto-select first delivery option if none selected
  useState(() => {
    if (deliveryOptions.length > 0 && !selectedDelivery) {
      setSelectedDelivery(deliveryOptions[0].type);
    }
  }, [deliveryOptions]);

  const handleCheckout = () => {
    onCheckout({
      payment_method: paymentMethod,
      delivery_option: selectedDelivery || (deliveryOptions[0]?.type),
      delivery_address: deliveryAddress
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="checkout-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            <ShoppingCart className="w-5 h-5 text-primary" />
            Checkout
          </DialogTitle>
          <DialogDescription>
            Complete your purchase for &quot;{auction?.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item Price</span>
                <span className="font-mono">{currencySymbol}{buyNowPrice.toFixed(2)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-mono">{currencySymbol}{deliveryCost.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Total ({currency})</span>
                <span className="font-mono text-primary">{currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Options */}
          {deliveryOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Delivery Method
              </Label>
              <RadioGroup 
                value={selectedDelivery} 
                onValueChange={setSelectedDelivery}
                className="space-y-2"
              >
                {deliveryOptions.map((option) => {
                  const Icon = DELIVERY_ICONS[option.type] || Package;
                  return (
                    <div 
                      key={option.type}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedDelivery === option.type 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedDelivery(option.type)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={option.type} id={option.type} />
                        <Label htmlFor={option.type} className="cursor-pointer flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{DELIVERY_LABELS[option.type] || option.type}</p>
                            {option.estimated_days && (
                              <p className="text-xs text-muted-foreground">
                                {option.estimated_days}
                              </p>
                            )}
                          </div>
                        </Label>
                      </div>
                      <span className="font-mono text-sm">
                        {option.cost === 0 ? 'FREE' : `${currencySymbol}${option.cost.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Delivery Address - Show for non-local pickup */}
          {selectedDelivery && selectedDelivery !== 'local_pickup' && (
            <div className="space-y-2">
              <Label htmlFor="delivery-address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </Label>
              <Textarea
                id="delivery-address"
                placeholder="Enter your full delivery address..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="min-h-[80px]"
                data-testid="delivery-address-input"
              />
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Method
            </Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stripe" id="checkout-stripe" />
                <Label htmlFor="checkout-stripe" className="cursor-pointer flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Card (Stripe)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="checkout-paypal" />
                <Label htmlFor="checkout-paypal" className="cursor-pointer flex items-center gap-2">
                  <span className="text-blue-600 font-bold text-sm">PayPal</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-lg"
            onClick={handleCheckout}
            disabled={loading || (selectedDelivery !== 'local_pickup' && !deliveryAddress && deliveryOptions.length > 0)}
            data-testid="confirm-checkout-btn"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Pay {currencySymbol}{totalAmount.toFixed(2)} {currency}
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Secure payment • Funds held in escrow until delivery confirmed
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
