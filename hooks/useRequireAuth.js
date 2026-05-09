'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { setPostLoginRedirect } from '../utils/authSession';

/**
 * Guest visits → opens login sheet and stores current URL for post-login redirect.
 * Does not navigate away from the requested route.
 *
 * @returns {{ ok: boolean, ready: boolean }}
 *   ready — auth hydration finished (safe to branch UI)
 *   ok — user is authenticated (render protected content)
 */
export function useRequireAuth() {
  const pathname = usePathname() || '/';
  const { isAuthenticated, authHydrated, isLoadingUser, setShowLoginSheet } = useAuth();

  useEffect(() => {
    if (!authHydrated || isLoadingUser) return;
    if (isAuthenticated) return;

    const search = typeof window !== 'undefined' ? window.location.search : '';
    const returnPath = `${pathname}${search}`;
    setPostLoginRedirect(returnPath);
    setShowLoginSheet(true);
  }, [authHydrated, isLoadingUser, isAuthenticated, pathname, setShowLoginSheet]);

  const ready = authHydrated && !isLoadingUser;
  const ok = Boolean(ready && isAuthenticated);

  return { ok, ready };
}
