import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('jarnnmarket_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to load cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('jarnnmarket_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (auction, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.auction.id === auction.id);
      if (existing) {
        return prev.map(item =>
          item.auction.id === auction.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { auction, quantity, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromCart = (auctionId) => {
    setCartItems(prev => prev.filter(item => item.auction.id !== auctionId));
  };

  const updateQuantity = (auctionId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(auctionId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.auction.id === auctionId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('jarnnmarket_cart');
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.auction.buy_now_price || item.auction.current_bid;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const isInCart = (auctionId) => {
    return cartItems.some(item => item.auction.id === auctionId);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen(prev => !prev);

  return (
    <CartContext.Provider value={{
      cartItems,
      isCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
      isInCart,
      openCart,
      closeCart,
      toggleCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
