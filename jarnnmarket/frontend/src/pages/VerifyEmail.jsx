import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState('input'); // input, verifying, success, error
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(c => !c);
    inputRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
  };

  const verifyEmail = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setStatus('verifying');
    try {
      const response = await axios.post(`${API}/auth/verify-email`, { 
        email: email.toLowerCase(),
        code: fullCode 
      });
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
      toast.success('Email verified!');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Verification failed. Please check your code and try again.');
      toast.error('Verification failed');
    }
  };

  const resendCode = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email: email.toLowerCase() });
      toast.success('New verification code sent to your email!');
      setCode(['', '', '', '', '', '']);
      setStatus('input');
      setMessage('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="verify-email-page">
      <div className="w-full max-w-md text-center">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          {(status === 'input' || status === 'error') && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Verify Your Email
              </h1>
              <p className="text-muted-foreground mb-6">
                Enter the 6-digit code sent to your email address
              </p>

              {/* Email Input */}
              <div className="mb-6">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-center"
                  data-testid="verification-email"
                />
              </div>

              {/* Code Input */}
              <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold"
                    data-testid={`code-input-${index}`}
                  />
                ))}
              </div>

              {status === 'error' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {message}
                </div>
              )}

              <Button 
                onClick={verifyEmail}
                className="w-full rounded-full mb-4"
                disabled={code.join('').length !== 6 || !email}
                data-testid="verify-button"
              >
                Verify Email
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Didn't receive the code?</span>
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary"
                  onClick={resendCode}
                  disabled={resending || !email}
                >
                  {resending ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>
            </>
          )}

          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Verifying...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address
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
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                <p className="text-amber-700 text-sm">
                  <strong>Note:</strong> Your account is pending admin approval. You'll receive an email once approved.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full rounded-full"
                data-testid="go-to-login"
              >
                Go to Login
              </Button>
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
