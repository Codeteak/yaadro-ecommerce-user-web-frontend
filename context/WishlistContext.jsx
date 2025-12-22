'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  // Initialize wishlist state from localStorage if available (client-side only)
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client before accessing localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        try {
          setWishlistItems(JSON.parse(savedWishlist));
        } catch (error) {
          console.error('Error parsing wishlist from localStorage:', error);
        }
      }
    }
  }, []);

  // Save wishlist to localStorage whenever it changes (client-side only)
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, isClient]);

  // Add item to wishlist
  const addToWishlist = (product) => {
    setWishlistItems(prevItems => {
      // Check if item already exists in wishlist
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems; // Item already in wishlist
      }
      // Add new item to wishlist
      return [...prevItems, product];
    });
  };

  // Remove item from wishlist
  const removeFromWishlist = (id) => {
    setWishlistItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  // Check if product is in wishlist
  const isInWishlist = (id) => {
    return wishlistItems.some(item => item.id === id);
  };

  // Clear entire wishlist
  const clearWishlist = () => {
    setWishlistItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wishlist');
    }
  };

  // Get wishlist count
  const wishlistCount = wishlistItems.length;

  const value = {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    wishlistCount,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}



