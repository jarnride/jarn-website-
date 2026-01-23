import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
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

function App() {
  return (
    <AuthProvider>
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
            </Routes>
          </main>
          <Footer />
          <WhatsAppButton />
        </div>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
