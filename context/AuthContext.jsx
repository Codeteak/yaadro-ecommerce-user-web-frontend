'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { refreshAccessToken, getCurrentUser } from '../utils/authApi';
import { onTokenAutoRefreshed } from '../utils/apiClient';
import { getJwtExpiresAtMs, getMsUntilAccessTokenRefresh } from '../utils/jwtExp';
import {
  ensureSessionExpiryForExistingLogin,
  establishClientSession,
  isClientSessionExpired,
  shouldAttemptSessionRecovery,
  syncSessionExpiryFromRefreshToken,
  takePostLoginRedirect,
} from '../utils/authSession';
import { isUnauthorizedError, isTransientAuthError } from '../utils/authErrors';
import { normalizeCustomer } from '../utils/authApi';
import { clearAllClientSessionData } from '../utils/clearClientSession';

const AuthContext = createContext();

function applyRefreshedTokensToStorage(newTokens, previousRefreshToken) {
  if (!newTokens?.token) return false;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('token', newTokens.token);
    window.localStorage.setItem('authToken', newTokens.token);
  }
  if (newTokens.refreshToken) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('refreshToken', newTokens.refreshToken);
    }
    syncSessionExpiryFromRefreshToken(newTokens.refreshToken);
  } else if (previousRefreshToken) {
    syncSessionExpiryFromRefreshToken(previousRefreshToken);
  }
  return true;
}

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
    clearAllClientSessionData();
  }, []);

  const recoverSessionWithRefresh = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    const storedRt = window.localStorage.getItem('refreshToken');
    if (!storedRt) return false;

    try {
      const newTokens = await refreshAccessToken(storedRt);
      if (!applyRefreshedTokensToStorage(newTokens, storedRt)) return false;
      setToken(newTokens.token);
      if (newTokens.refreshToken) setRefreshToken(newTokens.refreshToken);
      const apiUser = await getCurrentUser();
      setUser(apiUser);
      if (apiUser && typeof window !== 'undefined') {
        window.localStorage.setItem('user', JSON.stringify(apiUser));
      }
      return true;
    } catch (error) {
      console.error('Session recovery via refresh failed:', error);
      if (isUnauthorizedError(error)) logout();
      return false;
    }
  }, [logout]);

  const recoveryInFlightRef = useRef(false);

  const tryRecoverExpiredSession = useCallback(async () => {
    if (!shouldAttemptSessionRecovery()) return false;
    if (recoveryInFlightRef.current) return false;
    recoveryInFlightRef.current = true;
    try {
      return await recoverSessionWithRefresh();
    } finally {
      recoveryInFlightRef.current = false;
    }
  }, [recoverSessionWithRefresh]);

  // Initialize tokens from localStorage and fetch user from API
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') {
      setAuthHydrated(true);
      return undefined;
    }

    ensureSessionExpiryForExistingLogin();

    const savedToken =
      window.localStorage.getItem('token') ||
      window.localStorage.getItem('authToken') ||
      window.localStorage.getItem('accessToken');
    const savedRefreshToken = window.localStorage.getItem('refreshToken');
    const savedUser = window.localStorage.getItem('user');

    if (savedRefreshToken) setRefreshToken(savedRefreshToken);

    let cancelled = false;

    async function applyRefreshedTokens(newTokens, previousRefreshToken) {
      if (!applyRefreshedTokensToStorage(newTokens, previousRefreshToken)) return false;
      setToken(newTokens.token);
      if (newTokens.refreshToken) setRefreshToken(newTokens.refreshToken);
      return true;
    }

    async function hydrate() {
      if (isClientSessionExpired() && savedRefreshToken) {
        setIsLoadingUser(true);
        try {
          const recovered = await recoverSessionWithRefresh();
          if (cancelled) return;
          if (recovered) return;
        } finally {
          if (!cancelled) {
            setIsLoadingUser(false);
            setAuthHydrated(true);
          }
        }
        if (cancelled) return;
        if (isClientSessionExpired()) {
          logout();
        }
        return;
      }

      if (isClientSessionExpired()) {
        logout();
        setAuthHydrated(true);
        return;
      }

      if (!savedToken) {
        if (savedRefreshToken) {
          setIsLoadingUser(true);
          try {
            const newTokens = await refreshAccessToken(savedRefreshToken);
            if (cancelled) return;
            if (await applyRefreshedTokens(newTokens, savedRefreshToken)) {
              const apiUser = await getCurrentUser();
              if (cancelled) return;
              setUser(apiUser);
              if (apiUser) window.localStorage.setItem('user', JSON.stringify(apiUser));
            }
          } catch (refreshErr) {
            console.error('Session refresh without access token failed:', refreshErr);
            if (isUnauthorizedError(refreshErr)) logout();
          } finally {
            if (!cancelled) {
              setIsLoadingUser(false);
              setAuthHydrated(true);
            }
          }
          return;
        }
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

      const accessExpMs = getJwtExpiresAtMs(savedToken);
      const accessNeedsRefresh =
        accessExpMs != null && Date.now() >= accessExpMs - 60 * 1000;

      try {
        if (accessNeedsRefresh && savedRefreshToken) {
          const newTokens = await refreshAccessToken(savedRefreshToken);
          if (cancelled) return;
          if (!(await applyRefreshedTokens(newTokens, savedRefreshToken))) {
            throw new Error('Refresh returned no access token');
          }
        }

        const apiUser = await getCurrentUser();
        if (cancelled) return;
        setUser(apiUser);
        if (apiUser) {
          window.localStorage.setItem('user', JSON.stringify(apiUser));
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching user:', error);
        const unauthorized = isUnauthorizedError(error);
        if (unauthorized && savedRefreshToken) {
          try {
            const newTokens = await refreshAccessToken(savedRefreshToken);
            if (cancelled) return;
            if (await applyRefreshedTokens(newTokens, savedRefreshToken)) {
              const apiUser2 = await getCurrentUser();
              if (cancelled) return;
              setUser(apiUser2);
              if (apiUser2) {
                window.localStorage.setItem('user', JSON.stringify(apiUser2));
              }
              return;
            }
          } catch (refreshErr) {
            console.error('Session refresh on load failed:', refreshErr);
            if (isUnauthorizedError(refreshErr)) logout();
          }
        } else if (unauthorized) {
          logout();
        } else if (!isTransientAuthError(error) && savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (parseError) {
            console.error('Error parsing user from localStorage:', parseError);
          }
        } else if (savedUser) {
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
  }, [logout, recoverSessionWithRefresh]);

  // When refresh session clock ends, try refresh before clearing auth (e.g. tab refocus).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const check = async () => {
      if (!isClientSessionExpired()) return;
      const recovered = await tryRecoverExpiredSession();
      if (!recovered && isClientSessionExpired()) logout();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [logout, tryRecoverExpiredSession]);

  // Proactive refresh before 7-day access JWT expires (does not extend refresh session).
  useEffect(() => {
    if (!token || typeof window === 'undefined') return undefined;

    const rt = window.localStorage.getItem('refreshToken') || refreshToken;
    if (!rt) return undefined;

    let cancelled = false;
    const delayMs = getMsUntilAccessTokenRefresh(token);

    const id = window.setTimeout(async () => {
      if (cancelled) return;
      const storedRt = window.localStorage.getItem('refreshToken');
      if (!storedRt) return;
      try {
        const newTokens = await refreshAccessToken(storedRt);
        if (cancelled) return;
        if (!newTokens?.token) {
          logout();
          return;
        }
        setToken(newTokens.token);
        window.localStorage.setItem('token', newTokens.token);
        window.localStorage.setItem('authToken', newTokens.token);
        if (newTokens.refreshToken) {
          setRefreshToken(newTokens.refreshToken);
          window.localStorage.setItem('refreshToken', newTokens.refreshToken);
          syncSessionExpiryFromRefreshToken(newTokens.refreshToken);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        if (!cancelled && isUnauthorizedError(error)) logout();
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [token, refreshToken, logout]);

  // Sync React state when the API client auto-refreshes the token on 401.
  useEffect(() => {
    return onTokenAutoRefreshed(({ token: newAccess, refreshToken: newRt }) => {
      if (newAccess) setToken(newAccess);
      if (newRt) {
        setRefreshToken(newRt);
        syncSessionExpiryFromRefreshToken(newRt);
      }
    });
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem('user', JSON.stringify(user));
      } else {
        window.localStorage.removeItem('user');
      }

      if (token) {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('authToken', token);
      } else {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('authToken');
        window.localStorage.removeItem('accessToken');
      }

      if (refreshToken) {
        window.localStorage.setItem('refreshToken', refreshToken);
      } else {
        window.localStorage.removeItem('refreshToken');
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
      window.localStorage.setItem('token', access);
      window.localStorage.setItem('authToken', access);
    }
    if (tokens?.refreshToken) {
      setRefreshToken(tokens.refreshToken);
      window.localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    establishClientSession({ refreshToken: tokens?.refreshToken });
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
    clearAllClientSessionData();
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
          window.localStorage.setItem('user', JSON.stringify(merged));
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
