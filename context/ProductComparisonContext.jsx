'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ProductComparisonContext = createContext();

export function ProductComparisonProvider({ children }) {
  const [comparisonList, setComparisonList] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const maxCompare = 4; // Maximum products to compare

  // Initialize comparison list from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('productComparison');
      if (saved) {
        try {
          setComparisonList(JSON.parse(saved));
        } catch (error) {
          console.error('Error parsing product comparison from localStorage:', error);
        }
      }
    }
  }, []);

  // Save comparison list to localStorage
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem('productComparison', JSON.stringify(comparisonList));
    }
  }, [comparisonList, isClient]);

  // Add product to comparison
  const addToComparison = (product) => {
    setComparisonList(prev => {
      // Check if already in comparison
      if (prev.some(item => item.id === product.id)) {
        return prev; // Already in comparison
      }
      // Check if max limit reached
      if (prev.length >= maxCompare) {
        // Remove oldest and add new one
        return [...prev.slice(1), product];
      }
      // Add to comparison
      return [...prev, product];
    });
  };

  // Remove product from comparison
  const removeFromComparison = (productId) => {
    setComparisonList(prev => prev.filter(item => item.id !== productId));
  };

  // Clear comparison
  const clearComparison = () => {
    setComparisonList([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('productComparison');
    }
  };

  // Check if product is in comparison
  const isInComparison = (productId) => {
    return comparisonList.some(item => item.id === productId);
  };

  const value = {
    comparisonList,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    maxCompare,
  };

  return <ProductComparisonContext.Provider value={value}>{children}</ProductComparisonContext.Provider>;
}

export function useProductComparison() {
  const context = useContext(ProductComparisonContext);
  if (!context) {
    throw new Error('useProductComparison must be used within a ProductComparisonProvider');
  }
  return context;
}


