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
import { Gavel, Mail, Lock, User, Tractor, ShoppingCart, Phone, CheckCircle, Send } from 'lucide-react';

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
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    phone: '',
    role: searchParams.get('role') || 'buyer'
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
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        role: registerForm.role,
        phone: registerForm.phone || null
      });
      
      if (response.data.email_verification_required) {
        setRegisteredEmail(registerForm.email);
        setRegistrationSuccess(true);
        setResendCountdown(60);
        if (response.data.mock_token) {
          setMockToken(response.data.mock_token);
        }
        toast.success('Please check your email to verify your account!');
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
      toast.success('Verification email sent!');
      setResendCountdown(60);
      if (response.data.mock_token) {
        setMockToken(response.data.mock_token);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend verification email');
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
              We've sent a verification link to:
            </p>
            <p className="font-semibold text-lg mb-6">{registeredEmail}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Click the link in the email to verify your account and start using Jarnnmarket.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                variant="outline"
                disabled={resendCountdown > 0 || loading}
                className="w-full rounded-full"
                data-testid="resend-verification"
              >
                <Send className="w-4 h-4 mr-2" />
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Verification Email'}
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
                <p className="text-xs text-yellow-700 mb-2">Email is in mock mode. Use this link to verify:</p>
                <a 
                  href={`/verify-email?token=${mockToken}`}
                  className="text-xs text-blue-600 hover:underline break-all"
                >
                  {window.location.origin}/verify-email?token={mockToken}
                </a>
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
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="login-password"
                    />
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

                {/* Demo credentials */}
                <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Demo Credentials:</p>
                  <p className="text-muted-foreground">Farmer: john@farm.com / password123</p>
                  <p className="text-muted-foreground">Buyer: buyer@demo.com / password123</p>
                </div>
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
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="register-password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="register-confirm">Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="pl-10"
                      required
                      data-testid="register-confirm"
                    />
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
