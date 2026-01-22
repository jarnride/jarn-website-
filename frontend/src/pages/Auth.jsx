import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, Mail, Lock, User, Tractor, ShoppingCart } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, register } = useAuth();
  
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    role: searchParams.get('role') || 'buyer'
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
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
    
    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await register(registerForm.name, registerForm.email, registerForm.password, registerForm.role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
              jarnnmarket
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
