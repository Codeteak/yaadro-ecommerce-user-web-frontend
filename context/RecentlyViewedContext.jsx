'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RecentlyViewedContext = createContext();

export function RecentlyViewedProvider({ children }) {
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const maxItems = 20; // Maximum number of recently viewed items

  // Initialize recently viewed from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentlyViewed');
      if (saved) {
        try {
          setRecentlyViewed(JSON.parse(saved));
        } catch (error) {
          console.error('Error parsing recently viewed from localStorage:', error);
        }
      }
    }
  }, []);

  // Save recently viewed to localStorage
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, isClient]);

  // Add product to recently viewed
  const addToRecentlyViewed = useCallback((product) => {
    setRecentlyViewed(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.id !== product.id);
      // Add to beginning and limit to maxItems
      return [product, ...filtered].slice(0, maxItems);
    });
  }, []);

  // Clear recently viewed
  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recentlyViewed');
    }
  };

  // Get recently viewed products
  const getRecentlyViewed = (limit = maxItems) => {
    return recentlyViewed.slice(0, limit);
  };

  const value = {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
    getRecentlyViewed,
  };

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
}

