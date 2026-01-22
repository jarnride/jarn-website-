import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="payment-cancel-page">
      <div className="max-w-md w-full text-center">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground mb-6">
            Your payment was cancelled. Don't worry, you can try again anytime.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              className="flex-1 rounded-full bg-primary hover:bg-primary/90"
              onClick={() => navigate('/auctions')}
            >
              Browse Auctions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
