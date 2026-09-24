'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { clearPostLoginRedirect } from '../utils/authSession';

/**
 * Protect account pages. Waits for AUTH_LOADING to finish, then:
 * - AUTHENTICATED → allow protected content
 * - UNAUTHENTICATED → public home (continue shopping)
 *
 * Login is only for explicit actions via `useLoginNavigation` / `goToLogin`
 * (checkout, Sign in CTA). Do not treat "auth still loading" as logged out.
 *
 * @returns {{ ok: boolean, ready: boolean }}
 *   ready — auth hydration finished (safe to branch UI)
 *   ok — user is authenticated (render protected content)
 */
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, authHydrated, isLoadingUser } = useAuth();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || isLoadingUser) return;

    if (isAuthenticated) {
      redirectingRef.current = false;
      return;
    }

    if (redirectingRef.current) return;
    redirectingRef.current = true;

    // Auto-kick from a protected page is not an intentional login intent.
    clearPostLoginRedirect();
    router.replace('/');
  }, [authHydrated, isLoadingUser, isAuthenticated, router]);

  const ready = authHydrated && !isLoadingUser;
  const ok = Boolean(ready && isAuthenticated);

  return { ok, ready };
}
