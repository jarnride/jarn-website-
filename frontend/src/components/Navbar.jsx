import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/NotificationBell';
import JarnnLogo from '@/components/JarnnLogo';
import { Menu, X, User, LogOut, LayoutDashboard, Plus, HelpCircle, Shield } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === 'admin@jarnnmarket.com' || 
                  user?.email === 'info@jarnnmarket.com' ||
                  user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-primary/5" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <JarnnLogo className="w-9 h-9 text-primary" />
            <span className="text-xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
              Jarnnmarket
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="nav-link" data-testid="nav-home">Home</Link>
            <Link to="/auctions" className="nav-link" data-testid="nav-auctions">Auctions</Link>
            {user?.role === 'farmer' && (
              <Link to="/create-auction" className="nav-link" data-testid="nav-create">Sell Produce</Link>
            )}
            <Link to="/help" className="nav-link" data-testid="nav-help">Help</Link>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full gap-2" data-testid="user-menu-trigger">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="menu-dashboard">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {user.role === 'farmer' && (
                      <DropdownMenuItem onClick={() => navigate('/create-auction')} data-testid="menu-create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Auction
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/help')} data-testid="menu-help">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help Center
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')} data-testid="login-btn">
                  Login
                </Button>
                <Button 
                  onClick={() => navigate('/auth?mode=register')} 
                  className="rounded-full bg-primary hover:bg-primary/90"
                  data-testid="register-btn"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border" data-testid="mobile-menu">
            <div className="flex flex-col gap-4">
              <Link to="/" className="py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/auctions" className="py-2" onClick={() => setMobileMenuOpen(false)}>Auctions</Link>
              {user?.role === 'farmer' && (
                <Link to="/create-auction" className="py-2" onClick={() => setMobileMenuOpen(false)}>Sell Produce</Link>
              )}
              {user ? (
                <>
                  <Link to="/dashboard" className="py-2" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  <button onClick={handleLogout} className="py-2 text-left text-destructive">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/auth" className="py-2" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/auth?mode=register" className="py-2" onClick={() => setMobileMenuOpen(false)}>Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
