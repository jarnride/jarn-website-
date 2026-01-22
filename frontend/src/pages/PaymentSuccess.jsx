import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [status, setStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && token) {
      pollPaymentStatus();
    }
  }, [sessionId, token]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(
        `${API}/payments/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPaymentData(response.data);

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment successful!');
        return;
      } else if (response.data.status === 'expired') {
        setStatus('expired');
        return;
      }

      // Continue polling
      setStatus('processing');
      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      console.error('Payment status check failed:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="payment-success-page">
      <div className="max-w-md w-full text-center">
        {status === 'loading' || status === 'processing' ? (
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <div className="spinner mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Processing Payment
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
              Thank you for your purchase. The seller has been notified.
            </p>
            {paymentData && (
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold font-mono">${paymentData.amount?.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 rounded-full"
                onClick={() => navigate('/dashboard')}
              >
                <Package className="w-4 h-4 mr-2" />
                Dashboard
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
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              {status === 'timeout' ? 'Payment Status Unknown' : 'Payment Error'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {status === 'timeout' 
                ? 'We couldn\'t confirm your payment status. Please check your email for confirmation.'
                : 'There was an issue processing your payment.'
              }
            </p>
            <Button 
              className="rounded-full bg-primary hover:bg-primary/90"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
