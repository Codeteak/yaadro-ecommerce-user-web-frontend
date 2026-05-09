'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { setPostLoginRedirect } from '../utils/authSession';

/**
 * Guest visits → redirect to `/login` with return URL stored for after sign-in.
 *
 * @returns {{ ok: boolean, ready: boolean }}
 *   ready — auth hydration finished (safe to branch UI)
 *   ok — user is authenticated (render protected content)
 */
export function useRequireAuth() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { isAuthenticated, authHydrated, isLoadingUser } = useAuth();

  useEffect(() => {
    if (!authHydrated || isLoadingUser) return;
    if (isAuthenticated) return;

    const search = typeof window !== 'undefined' ? window.location.search : '';
    const returnPath = `${pathname}${search}`;
    setPostLoginRedirect(returnPath);
    router.replace('/login');
  }, [authHydrated, isLoadingUser, isAuthenticated, pathname, router]);

  const ready = authHydrated && !isLoadingUser;
  const ok = Boolean(ready && isAuthenticated);

  return { ok, ready };
}
