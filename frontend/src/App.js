import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { LocationProvider } from "@/context/LocationContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CartDrawer from "@/components/CartDrawer";
import Home from "@/pages/Home";
import Auctions from "@/pages/Auctions";
import AuctionDetail from "@/pages/AuctionDetail";
import Auth from "@/pages/Auth";
import CreateAuction from "@/pages/CreateAuction";
import Dashboard from "@/pages/Dashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import Policies from "@/pages/Policies";
import Subscription from "@/pages/Subscription";
import VerifyEmail from "@/pages/VerifyEmail";
import HelpCenter from "@/pages/HelpCenter";
import AdminDashboard from "@/pages/AdminDashboard";
import Checkout from "@/pages/Checkout";
import SellerProfile from "@/pages/SellerProfile";
import Wishlist from "@/pages/Wishlist";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RecentlyViewedProvider>
          <WishlistProvider>
            <LocationProvider>
              <BrowserRouter>
                <div className="app-container">
                  <Navbar />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Home />} />
                    <Route path="/auctions" element={<Auctions />} />
                    <Route path="/auctions/:id" element={<AuctionDetail />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/create-auction" element={<CreateAuction />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/cancel" element={<PaymentCancel />} />
                    <Route path="/policies" element={<Policies />} />
                    <Route path="/policies/:type" element={<Policies />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/seller/:sellerId" element={<SellerProfile />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                  </Routes>
                </main>
                <Footer />
                <WhatsAppButton />
                <CartDrawer />
              </div>
              <Toaster position="top-right" richColors />
            </BrowserRouter>
          </WishlistProvider>
        </RecentlyViewedProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
