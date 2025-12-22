'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);

  // Initialize user from localStorage
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
    }
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    }
  }, [user, isClient]);

  // Login function - stores user data
  const login = (userData) => {
    setUser(userData);
    setShowLoginSheet(false);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  };

  // Delete account function - removes all user data
  const deleteAccount = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      // Remove all user-related data
      localStorage.removeItem('user');
      localStorage.removeItem('cart');
      localStorage.removeItem('wishlist');
      localStorage.removeItem('addresses');
      localStorage.removeItem('activityLog');
      localStorage.removeItem('privacySettings');
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;

  const value = {
    user,
    login,
    logout,
    deleteAccount,
    isAuthenticated,
    showLoginSheet,
    setShowLoginSheet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

