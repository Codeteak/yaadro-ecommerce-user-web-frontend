'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { refreshAccessToken, getCurrentUser } from '../utils/authApi';
import { getAuthToken } from '../utils/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Initialize tokens from localStorage and fetch user from API
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token') || localStorage.getItem('authToken');
      const savedRefreshToken = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');
      
      if (savedToken) {
        setToken(savedToken);
        // Fetch user from API if token exists
        setIsLoadingUser(true);
        getCurrentUser()
          .then((apiUser) => {
            setUser(apiUser);
            if (apiUser) {
              localStorage.setItem('user', JSON.stringify(apiUser));
            }
          })
          .catch((error) => {
            console.error('Error fetching user:', error);
            // Fall back to localStorage user if API fails
            if (savedUser) {
              try {
                setUser(JSON.parse(savedUser));
              } catch (parseError) {
                console.error('Error parsing user from localStorage:', parseError);
              }
            }
          })
          .finally(() => {
            setIsLoadingUser(false);
          });
      } else if (savedUser) {
        // No token, use localStorage user
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
      
      if (savedRefreshToken) setRefreshToken(savedRefreshToken);
    }
  }, []);

  // Auto-refresh token if expired
  useEffect(() => {
    if (refreshToken && token && typeof window !== 'undefined') {
      // Check if token is about to expire (you might want to decode JWT to check expiry)
      // For now, we'll refresh on mount if refreshToken exists
      const refreshInterval = setInterval(async () => {
        try {
          const newTokens = await refreshAccessToken(refreshToken);
          if (newTokens.token) {
            setToken(newTokens.token);
            localStorage.setItem('token', newTokens.token);
            if (newTokens.refreshToken) {
              setRefreshToken(newTokens.refreshToken);
              localStorage.setItem('refreshToken', newTokens.refreshToken);
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, logout user
          logout();
        }
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [refreshToken, token]);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }

      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }, [user, token, refreshToken, isClient]);

  // Login function - stores user + tokens
  const login = (userData, tokens = {}) => {
    setUser(userData);
    if (tokens?.token) {
      setToken(tokens.token);
      localStorage.setItem('token', tokens.token);
    }
    if (tokens?.refreshToken) {
      setRefreshToken(tokens.refreshToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    setShowLoginSheet(false);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  // Delete account function - removes all user data
  const deleteAccount = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    if (typeof window !== 'undefined') {
      // Remove all user-related data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('cart');
      localStorage.removeItem('wishlist');
      localStorage.removeItem('addresses');
      localStorage.removeItem('activityLog');
      localStorage.removeItem('privacySettings');
    }
  };

  // Refresh user data from API
  const refreshUser = async () => {
    if (!token) return;
    try {
      setIsLoadingUser(true);
      const apiUser = await getCurrentUser();
      setUser(apiUser);
      if (apiUser) {
        localStorage.setItem('user', JSON.stringify(apiUser));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    refreshToken,
    login,
    logout,
    deleteAccount,
    isAuthenticated,
    showLoginSheet,
    setShowLoginSheet,
    isLoadingUser,
    refreshUser,
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

