'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { refreshAccessToken, getCurrentUser } from '../utils/authApi';
import { getAuthToken } from '../utils/apiClient';
import {
  clearSessionExpiresAt,
  ensureSessionExpiryForExistingLogin,
  isClientSessionExpired,
  writeSessionExpiresAtFromLogin,
  POST_LOGIN_REDIRECT_KEY,
} from '../utils/authSession';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  /** False until first client auth hydration from localStorage runs (avoids redirect flash before token/user are restored). */
  const [authHydrated, setAuthHydrated] = useState(false);

  // Initialize tokens from localStorage and fetch user from API
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') {
      setAuthHydrated(true);
      return;
    }

    ensureSessionExpiryForExistingLogin();
    if (isClientSessionExpired()) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      clearSessionExpiresAt();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setAuthHydrated(true);
      return;
    }

    const savedToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken) {
      setToken(savedToken);
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
          if (error?.status === 401 || /invalid|expired/i.test(error?.message || '')) {
            setToken(null);
            setRefreshToken(null);
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            clearSessionExpiresAt();
          }
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
          setAuthHydrated(true);
        });
    } else if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
      setAuthHydrated(true);
    } else {
      setAuthHydrated(true);
    }

    if (savedRefreshToken) setRefreshToken(savedRefreshToken);
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
            localStorage.setItem('authToken', newTokens.token);
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
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
      }

      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }, [user, token, refreshToken, isClient]);

  /**
   * Login function - stores user + tokens (7-day client session window).
   * @returns {boolean} true if a full-page redirect was triggered (caller should skip client routing).
   */
  const login = (userData, tokens = {}) => {
    setUser(userData);
    if (tokens?.token) {
      setToken(tokens.token);
      localStorage.setItem('token', tokens.token);
      localStorage.setItem('authToken', tokens.token);
    }
    if (tokens?.refreshToken) {
      setRefreshToken(tokens.refreshToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    writeSessionExpiresAtFromLogin();
    setShowLoginSheet(false);
    if (typeof window !== 'undefined') {
      const next = window.sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        window.sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        window.location.assign(next);
        return true;
      }
    }
    return false;
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      clearSessionExpiresAt();
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      clearSessionExpiresAt();
      localStorage.removeItem('cart');
      localStorage.removeItem('wishlist');
      localStorage.removeItem('addresses');
      localStorage.removeItem('activityLog');
      localStorage.removeItem('privacySettings');
    }
  };

  /**
   * Refresh user from GET /api/me/profile.
   * @param {{ silent?: boolean }} opts - `silent: true` skips the global loading flag (e.g. settings header).
   */
  const refreshUser = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!token) return;
    try {
      if (!silent) setIsLoadingUser(true);
      const apiUser = await getCurrentUser();
      setUser((prev) => {
        if (!apiUser) return apiUser;
        // Preserve storefront-only fields (e.g. phone) when API /me/profile doesn't return them.
        const merged = {
          ...(prev && typeof prev === 'object' ? prev : {}),
          ...(apiUser && typeof apiUser === 'object' ? apiUser : {}),
          phone:
            (apiUser && (apiUser.phone || apiUser.mobile)) ||
            (prev && (prev.phone || prev.mobile)) ||
            '',
          name:
            (apiUser && (apiUser.name || apiUser.displayName || apiUser.fullName)) ||
            (prev && (prev.name || prev.displayName)) ||
            '',
          displayName:
            (apiUser && (apiUser.displayName || apiUser.name)) ||
            (prev && (prev.displayName || prev.name)) ||
            '',
        };
        try {
          localStorage.setItem('user', JSON.stringify(merged));
        } catch {
          // ignore storage write failures
        }
        return merged;
      });
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      if (!silent) setIsLoadingUser(false);
    }
  }, [token]);

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
    authHydrated,
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

