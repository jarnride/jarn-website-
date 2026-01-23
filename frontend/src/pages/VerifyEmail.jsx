import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axios.post(`${API}/auth/verify-email`, { token });
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
      toast.success('Email verified! You can now login.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Verification failed. The link may be expired or invalid.');
      toast.error('Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="verify-email-page">
      <div className="w-full max-w-md text-center">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Verifying Your Email
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-green-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                Email Verified!
              </h1>
              <p className="text-muted-foreground mb-6">
                {message}
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full rounded-full"
                data-testid="go-to-login"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-red-600" style={{ fontFamily: 'Playfair Display, serif' }}>
                Verification Failed
              </h1>
              <p className="text-muted-foreground mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/auth?mode=register')} 
                  className="w-full rounded-full"
                  data-testid="register-again"
                >
                  Register Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/auth')} 
                  className="w-full rounded-full"
                  data-testid="go-to-login-error"
                >
                  Go to Login
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-card rounded-lg border text-sm text-muted-foreground">
          <Mail className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p>
            Having trouble? Contact our support team via{' '}
            <a 
              href="https://wa.me/447449858053?text=Hello%20Jarnnmarket%20Support%2C%20I%20need%20help%20with%20email%20verification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
