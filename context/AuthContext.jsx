'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { refreshAccessToken, getCurrentUser } from '../utils/authApi';
import { getMsUntilAccessTokenRefresh } from '../utils/jwtExp';
import { getAuthToken } from '../utils/apiClient';
import {
  clearSessionExpiresAt,
  ensureSessionExpiryForExistingLogin,
  isClientSessionExpired,
  writeSessionExpiresAtFromLogin,
  takePostLoginRedirect,
} from '../utils/authSession';
import { normalizeCustomer } from '../utils/authApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  /** False until first client auth hydration from localStorage runs (avoids redirect flash before token/user are restored). */
  const [authHydrated, setAuthHydrated] = useState(false);

  const logout = useCallback(() => {
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
  }, []);

  // Initialize tokens from localStorage and fetch user from API
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') {
      setAuthHydrated(true);
      return undefined;
    }

    ensureSessionExpiryForExistingLogin();
    if (isClientSessionExpired()) {
      logout();
      setAuthHydrated(true);
      return undefined;
    }

    const savedToken =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (savedRefreshToken) setRefreshToken(savedRefreshToken);

    let cancelled = false;

    async function hydrate() {
      if (!savedToken) {
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            console.error('Error parsing user from localStorage:', error);
          }
        }
        if (!cancelled) setAuthHydrated(true);
        return;
      }

      setToken(savedToken);
      setIsLoadingUser(true);
      try {
        const apiUser = await getCurrentUser();
        if (cancelled) return;
        setUser(apiUser);
        if (apiUser) {
          localStorage.setItem('user', JSON.stringify(apiUser));
          writeSessionExpiresAtFromLogin();
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching user:', error);
        const unauthorized =
          error?.status === 401 || /invalid|expired/i.test(error?.message || '');
        if (unauthorized && savedRefreshToken) {
          try {
            const newTokens = await refreshAccessToken(savedRefreshToken);
            if (cancelled) return;
            if (newTokens?.token) {
              localStorage.setItem('token', newTokens.token);
              localStorage.setItem('authToken', newTokens.token);
              setToken(newTokens.token);
              if (newTokens.refreshToken) {
                localStorage.setItem('refreshToken', newTokens.refreshToken);
                setRefreshToken(newTokens.refreshToken);
              }
              writeSessionExpiresAtFromLogin();
              const apiUser2 = await getCurrentUser();
              if (cancelled) return;
              setUser(apiUser2);
              if (apiUser2) {
                localStorage.setItem('user', JSON.stringify(apiUser2));
                writeSessionExpiresAtFromLogin();
              }
              return;
            }
          } catch (refreshErr) {
            console.error('Session refresh on load failed:', refreshErr);
          }
        }
        if (unauthorized) {
          logout();
        }
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (parseError) {
            console.error('Error parsing user from localStorage:', parseError);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUser(false);
          setAuthHydrated(true);
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  // Proactive refresh before access JWT expires; extends client session window on success.
  useEffect(() => {
    if (!token || typeof window === 'undefined') return undefined;

    const rt = localStorage.getItem('refreshToken') || refreshToken;
    if (!rt) return undefined;

    let cancelled = false;
    const delayMs = getMsUntilAccessTokenRefresh(token);

    const id = window.setTimeout(async () => {
      if (cancelled) return;
      const storedRt = localStorage.getItem('refreshToken');
      if (!storedRt) return;
      try {
        const newTokens = await refreshAccessToken(storedRt);
        if (cancelled) return;
        if (!newTokens?.token) {
          logout();
          return;
        }
        setToken(newTokens.token);
        localStorage.setItem('token', newTokens.token);
        localStorage.setItem('authToken', newTokens.token);
        if (newTokens.refreshToken) {
          setRefreshToken(newTokens.refreshToken);
          localStorage.setItem('refreshToken', newTokens.refreshToken);
        }
        writeSessionExpiresAtFromLogin();
      } catch (error) {
        console.error('Token refresh failed:', error);
        if (!cancelled) logout();
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [token, refreshToken, logout]);

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
   * Login function - stores user + tokens and starts/resets the client session window.
   * @returns {boolean} true if a full-page redirect was triggered (caller should skip client routing).
   */
  const login = (userData, tokens = {}) => {
    setUser(normalizeCustomer(userData) || userData);
    const access = tokens?.token || tokens?.accessToken;
    if (access) {
      setToken(access);
      localStorage.setItem('token', access);
      localStorage.setItem('authToken', access);
    }
    if (tokens?.refreshToken) {
      setRefreshToken(tokens.refreshToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    writeSessionExpiresAtFromLogin();
    if (typeof window !== 'undefined') {
      const next = takePostLoginRedirect();
      if (next) {
        window.location.assign(next);
        return true;
      }
    }
    return false;
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
        writeSessionExpiresAtFromLogin();
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

