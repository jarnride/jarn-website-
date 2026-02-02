import { createContext, useContext, useState, useEffect } from 'react';

const RecentlyViewedContext = createContext(null);

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = 'jarnnmarket_recently_viewed';

export const RecentlyViewedProvider = ({ children }) => {
  const [recentItems, setRecentItems] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentItems(parsed);
      } catch (e) {
        console.error('Failed to load recently viewed:', e);
      }
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems));
  }, [recentItems]);

  const addRecentlyViewed = (auction) => {
    if (!auction || !auction.id) return;
    
    setRecentItems(prev => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter(item => item.id !== auction.id);
      
      // Add to front of array
      const updated = [
        {
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
          viewedAt: new Date().toISOString()
        },
        ...filtered
      ].slice(0, MAX_RECENT_ITEMS);
      
      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getRecentlyViewed = (limit = MAX_RECENT_ITEMS) => {
    return recentItems.slice(0, limit);
  };

  return (
    <RecentlyViewedContext.Provider value={{
      recentItems,
      addRecentlyViewed,
      clearRecentlyViewed,
      getRecentlyViewed
    }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
};

export const useRecentlyViewed = () => {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
};
