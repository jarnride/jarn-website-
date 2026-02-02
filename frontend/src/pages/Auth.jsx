import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, Mail, Lock, User, Tractor, ShoppingCart, Phone, CheckCircle, Send, Building2, CreditCard, IdCard, Eye, EyeOff } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [mockToken, setMockToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    phone: '',
    role: searchParams.get('role') || 'buyer',
    // Seller payout details
    bank_name: '',
    bank_account_number: '',
    national_id: '',
    company_name: ''
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      if (errorMessage.includes('verify your email')) {
        toast.error(errorMessage);
        setRegisteredEmail(loginForm.email);
        setRegistrationSuccess(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (registerForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    // Validate phone number (required)
    if (!registerForm.phone || registerForm.phone.trim().length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    // Validate farmer payout details
    if (registerForm.role === 'farmer') {
      if (!registerForm.bank_name || registerForm.bank_name.trim().length < 2) {
        toast.error('Please enter your bank name');
        return;
      }
      if (!registerForm.bank_account_number || registerForm.bank_account_number.length !== 10) {
        toast.error('Please enter a valid 10-digit account number');
        return;
      }
      if (!registerForm.national_id || registerForm.national_id.length !== 11) {
        toast.error('Please enter a valid 11-digit NIN');
        return;
      }
    }
    
    setLoading(true);
    try {
      const payload = {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        role: registerForm.role,
        phone: registerForm.phone
      };
      
      // Add seller payout details for farmers
      if (registerForm.role === 'farmer') {
        payload.bank_name = registerForm.bank_name || null;
        payload.bank_account_number = registerForm.bank_account_number || null;
        payload.national_id = registerForm.national_id || null;
        payload.company_name = registerForm.company_name || null;
      }
      
      const response = await axios.post(`${API}/auth/register`, payload);
      
      if (response.data.email_verification_required) {
        setRegisteredEmail(registerForm.email);
        setRegistrationSuccess(true);
        setResendCountdown(60);
        if (response.data.mock_code) {
          setMockToken(response.data.mock_code);
        }
        toast.success('Please check your email for your verification code!');
      } else if (response.data.token) {
        toast.success('Account created successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCountdown > 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/resend-verification`, {
        email: registeredEmail
      });
      toast.success('New verification code sent!');
      setResendCountdown(60);
      if (response.data.mock_code) {
        setMockToken(response.data.mock_code);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  // Show verification pending screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="verification-pending">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-2xl border shadow-sm p-8">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-4">
              We've sent a verification code to:
            </p>
            <p className="font-semibold text-lg mb-6">{registeredEmail}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the 6-digit code from your email to verify your account.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(registeredEmail)}`)}
                className="w-full rounded-full"
                data-testid="enter-code-btn"
              >
                Enter Verification Code
              </Button>
              
              <Button
                onClick={handleResendVerification}
                variant="outline"
                disabled={resendCountdown > 0 || loading}
                className="w-full rounded-full"
                data-testid="resend-verification"
              >
                <Send className="w-4 h-4 mr-2" />
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
              </Button>
              
              <Button
                onClick={() => {
                  setRegistrationSuccess(false);
                  setMode('login');
                }}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>

            {/* Mock mode indicator for development */}
            {mockToken && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                <p className="font-medium text-yellow-800 text-sm mb-2">Development Mode</p>
                <p className="text-xs text-yellow-700 mb-2">Email is in mock mode. Your verification code is:</p>
                <p className="text-2xl font-bold text-center tracking-widest text-yellow-900 font-mono">{mockToken}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gavel className="w-10 h-10 text-primary" />
            <span 
              className="text-3xl font-bold text-primary"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Jarnnmarket
            </span>
          </div>
          <p className="text-muted-foreground">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="form-group">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="login-email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-full bg-primary hover:bg-primary/90 py-6"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="form-group">
                  <Label htmlFor="register-name">Full Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="John Doe"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="register-name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="register-email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                      data-testid="register-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="register-confirm">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="pl-10 pr-10"
                      required
                      data-testid="register-confirm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="register-phone">Phone Number (Optional)</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="+234 801 234 5678"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      className="pl-10"
                      data-testid="register-phone"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for bidding and selling. Can be added later.
                  </p>
                </div>

                <div className="form-group">
                  <Label>I am a...</Label>
                  <RadioGroup 
                    value={registerForm.role}
                    onValueChange={(value) => setRegisterForm({ ...registerForm, role: value })}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex-1">
                      <Label 
                        htmlFor="role-farmer"
                        className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          registerForm.role === 'farmer' ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value="farmer" id="role-farmer" className="sr-only" />
                        <Tractor className="w-5 h-5" />
                        <span>Farmer</span>
                      </Label>
                    </div>
                    <div className="flex-1">
                      <Label 
                        htmlFor="role-buyer"
                        className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          registerForm.role === 'buyer' ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value="buyer" id="role-buyer" className="sr-only" />
                        <ShoppingCart className="w-5 h-5" />
                        <span>Buyer</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Seller Payout Details - Only show for farmers */}
                {registerForm.role === 'farmer' && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>Payout Details (for receiving payments)</span>
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="register-bank-name">Bank Name *</Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-bank-name"
                          type="text"
                          placeholder="e.g., First Bank, GTBank, Access Bank"
                          value={registerForm.bank_name}
                          onChange={(e) => setRegisterForm({ ...registerForm, bank_name: e.target.value })}
                          className="pl-10"
                          required
                          data-testid="register-bank-name"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <Label htmlFor="register-account-number">Bank Account Number *</Label>
                      <div className="relative mt-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-account-number"
                          type="text"
                          placeholder="10-digit account number"
                          value={registerForm.bank_account_number}
                          onChange={(e) => setRegisterForm({ ...registerForm, bank_account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className="pl-10"
                          required
                          maxLength={10}
                          data-testid="register-account-number"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <Label htmlFor="register-nin">National ID Number (NIN) *</Label>
                      <div className="relative mt-1">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-nin"
                          type="text"
                          placeholder="11-digit NIN"
                          value={registerForm.national_id}
                          onChange={(e) => setRegisterForm({ ...registerForm, national_id: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className="pl-10"
                          required
                          maxLength={11}
                          data-testid="register-nin"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required for identity verification and payout processing.
                      </p>
                    </div>
                    
                    {/* Company Name (Optional) */}
                    <div className="form-group">
                      <Label htmlFor="register-company">Company/Farm Name (Optional)</Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="register-company"
                          placeholder="Your farm or business name"
                          value={registerForm.company_name}
                          onChange={(e) => setRegisterForm({ ...registerForm, company_name: e.target.value })}
                          className="pl-10"
                          data-testid="register-company"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full rounded-full bg-primary hover:bg-primary/90 py-6"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
