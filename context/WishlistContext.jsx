'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useShopBranding } from './ShopBrandingContext';

const WishlistContext = createContext();

function wishlistStorageKey(shopId) {
  return shopId ? `yaadro_wishlist_${shopId}` : 'wishlist';
}

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { shopId } = useShopBranding();
  const wasAuthenticatedRef = useRef(false);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const storageKey = wishlistStorageKey(shopId);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }
    if (!wasAuthenticatedRef.current) return;
    wasAuthenticatedRef.current = false;
    setWishlistItems([]);
  }, [isAuthenticated]);

  // Load wishlist when shop (or client) is ready — shop-scoped key.
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setWishlistItems([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setWishlistItems(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Error parsing wishlist from localStorage:', error);
      setWishlistItems([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, isClient, storageKey]);

  const addToWishlist = useCallback((product) => {
    setWishlistItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) return prevItems;
      return [...prevItems, product];
    });
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setWishlistItems((prevItems) => prevItems.filter((item) => item.id !== id));
  }, []);

  const isInWishlist = useCallback(
    (id) => wishlistItems.some((item) => item.id === id),
    [wishlistItems],
  );

  const clearWishlist = useCallback(() => {
    setWishlistItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const wishlistCount = wishlistItems.length;

  const value = useMemo(
    () => ({
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist,
      wishlistCount,
    }),
    [
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist,
      wishlistCount,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
