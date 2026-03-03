import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const WishlistContext = createContext(null);

const STORAGE_KEY = 'jarnnmarket_wishlist';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WishlistProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist - from server if logged in, localStorage otherwise
  useEffect(() => {
    const loadWishlist = async () => {
      if (user && token) {
        // Load from server for logged-in users
        try {
          setLoading(true);
          const response = await axios.get(`${API}/wishlist`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWishlistItems(response.data || []);
        } catch (error) {
          console.error('Failed to load wishlist from server:', error);
          // Fallback to localStorage
          loadFromLocalStorage();
        } finally {
          setLoading(false);
        }
      } else {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setWishlistItems(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load wishlist:', e);
        }
      }
    };

    loadWishlist();
  }, [user, token]);

  // Save to localStorage whenever items change (for non-logged-in users)
  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, user]);

  const addToWishlist = async (auction) => {
    if (!auction || !auction.id) return;

    // Check if already in wishlist
    if (wishlistItems.some(item => item.id === auction.id)) {
      return { success: false, message: 'Already in wishlist' };
    }

    const wishlistItem = {
      id: auction.id,
      title: auction.title,
      image_url: auction.image_url,
      current_bid: auction.current_bid,
      buy_now_price: auction.buy_now_price,
      buy_now_only: auction.buy_now_only,
      currency: auction.currency,
      seller_name: auction.seller_name,
      seller_id: auction.seller_id,
      category: auction.category,
      ends_at: auction.ends_at,
      is_active: auction.is_active,
      addedAt: new Date().toISOString()
    };

    if (user && token) {
      // Save to server for logged-in users
      try {
        await axios.post(`${API}/wishlist/${auction.id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to save to wishlist:', error);
      }
    }

    setWishlistItems(prev => [wishlistItem, ...prev]);
    return { success: true, message: 'Added to wishlist' };
  };

  const removeFromWishlist = async (auctionId) => {
    if (user && token) {
      try {
        await axios.delete(`${API}/wishlist/${auctionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to remove from wishlist:', error);
      }
    }

    setWishlistItems(prev => prev.filter(item => item.id !== auctionId));
  };

  const clearWishlist = async () => {
    if (user && token) {
      try {
        await axios.delete(`${API}/wishlist`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to clear wishlist:', error);
      }
    }

    setWishlistItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isInWishlist = (auctionId) => {
    return wishlistItems.some(item => item.id === auctionId);
  };

  const getWishlistCount = () => {
    return wishlistItems.length;
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      loading,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      isInWishlist,
      getWishlistCount
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
