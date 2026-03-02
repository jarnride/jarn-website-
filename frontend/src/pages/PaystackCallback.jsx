import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Package, ArrowRight, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function PaystackCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { clearCart } = useCart();
  
  const [status, setStatus] = useState('verifying');
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  
  // Get reference from URL (Paystack adds ?reference=xxx)
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  useEffect(() => {
    if (reference && token) {
      verifyPayment();
    } else if (!reference) {
      setStatus('error');
      setError('No payment reference found');
    }
  }, [reference, token]);

  const verifyPayment = async () => {
    try {
      setStatus('verifying');
      
      const response = await axios.post(
        `${API}/api/paystack/verify/${reference}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        setStatus('success');
        setPaymentData(response.data);
        
        // Clear cart after successful payment
        clearCart();
        localStorage.removeItem('pending_order');
        
        toast.success('Payment successful! Your order has been placed.');
      } else {
        setStatus('failed');
        setError(response.data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setError(error.response?.data?.detail || 'Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="paystack-callback-page">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' ? (
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-primary animate-spin" />
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Verifying Payment
            </h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment...
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Payment Successful!
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. The seller has been notified and will prepare your order.
            </p>
            {paymentData && (
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-sm">{reference}</span>
                </div>
                {paymentData.amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold font-mono">₦{paymentData.amount?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 rounded-full"
                onClick={() => navigate('/dashboard')}
              >
                <Package className="w-4 h-4 mr-2" />
                My Orders
              </Button>
              <Button 
                className="flex-1 rounded-full bg-primary hover:bg-primary/90"
                onClick={() => navigate('/auctions')}
              >
                Browse More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              {status === 'failed' ? 'Payment Failed' : 'Payment Error'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {error || 'There was an issue processing your payment. Please try again.'}
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 rounded-full"
                onClick={() => navigate('/checkout')}
              >
                Try Again
              </Button>
              <Button 
                className="flex-1 rounded-full"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
