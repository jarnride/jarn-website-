import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import JarnnLogo from '@/components/JarnnLogo';

export const Footer = () => {
  return (
    <footer className="footer" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <JarnnLogo className="w-10 h-10 text-white" />
              <span className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Jarnnmarket
              </span>
            </div>
            <p className="text-white/70 mb-6 max-w-md">
              Connecting farmers directly with buyers through transparent, real-time auctions. 
              Fresh produce, fair prices, sustainable farming.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link to="/auctions" className="footer-link">Browse Auctions</Link></li>
              <li><Link to="/auth?mode=register" className="footer-link">Become a Seller</Link></li>
              <li><Link to="/auth" className="footer-link">Sign In</Link></li>
              <li><Link to="/policies/terms" className="footer-link">Terms & Conditions</Link></li>
              <li><Link to="/policies/privacy" className="footer-link">Privacy Policy</Link></li>
              <li><Link to="/policies/return" className="footer-link">Return Policy</Link></li>
            </ul>
          </div>

          {/* Policies & Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Policies</h3>
            <ul className="space-y-3 mb-6">
              <li><Link to="/policies/seller" className="footer-link">Seller Guidelines</Link></li>
              <li><Link to="/policies/buyer" className="footer-link">Buyer Guidelines</Link></li>
            </ul>
            
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-white/70">
                <Mail className="w-4 h-4" />
                <span>info@jarnnmarket.com</span>
              </li>
              <li className="flex items-center gap-2 text-white/70">
                <Phone className="w-4 h-4" />
                <span>+2348189275367</span>
              </li>
              <li className="flex items-center gap-2 text-white/70">
                <MapPin className="w-4 h-4" />
                <span>Abia State, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-sm">
          <p>© {new Date().getFullYear()} jarnnmarket. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/policies/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/policies/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/policies/return" className="hover:text-white transition-colors">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
