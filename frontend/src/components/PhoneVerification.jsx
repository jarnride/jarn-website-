import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, Shield, Loader2, CheckCircle } from 'lucide-react';

export default function PhoneVerification({ open, onOpenChange, onVerified }) {
  const { user, sendPhoneVerification, verifyPhone } = useAuth();
  const [step, setStep] = useState('phone'); // phone, code
  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockCode, setMockCode] = useState(null);

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await sendPhoneVerification(phone);
      setStep('code');
      
      // Show mock code in development
      if (result.mock_mode && result.mock_code) {
        setMockCode(result.mock_code);
        toast.info(`Mock Mode: Your code is ${result.mock_code}`);
      } else {
        toast.success('Verification code sent!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verifyPhone(phone, code);
      toast.success('Phone number verified!');
      onOpenChange(false);
      if (onVerified) onVerified();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('phone');
    setCode('');
    setMockCode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="phone-verification-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Phone Verification
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? 'Verify your phone number to start bidding and selling on jarnnmarket.'
              : 'Enter the 6-digit code sent to your phone.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div className="form-group">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  data-testid="phone-input"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +234 for Nigeria)
              </p>
            </div>

            <Button
              className="w-full rounded-full bg-primary hover:bg-primary/90"
              onClick={handleSendCode}
              disabled={loading}
              data-testid="send-code-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="form-group">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl font-mono tracking-widest mt-1"
                maxLength={6}
                data-testid="verification-code-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Code sent to {phone}
              </p>
            </div>

            {mockCode && (
              <div className="p-3 bg-harvest/10 rounded-lg border border-harvest/20">
                <p className="text-sm text-harvest font-medium">
                  🧪 Mock Mode: Your code is <span className="font-mono">{mockCode}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setStep('phone')}
              >
                Change Number
              </Button>
              <Button
                className="flex-1 rounded-full bg-primary hover:bg-primary/90"
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                data-testid="verify-code-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>

            <button
              onClick={handleSendCode}
              className="w-full text-sm text-primary hover:underline"
              disabled={loading}
            >
              Resend code
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
