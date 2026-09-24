'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { clearPostLoginRedirect } from '../utils/authSession';

/**
 * Protect account pages. Waits for AUTH_LOADING to finish, then:
 * - AUTHENTICATED → allow protected content
 * - UNAUTHENTICATED → depends on `mode`:
 *   - `'home'` (default) — public home (continue shopping)
 *   - `'prompt'` — stay on page so UI can show a sign-in CTA (e.g. order history)
 *
 * Login is only for explicit actions via `useLoginNavigation` / `goToLogin`
 * (checkout, Sign in CTA). Do not treat "auth still loading" as logged out.
 *
 * @param {{ mode?: 'home' | 'prompt' }} [options]
 * @returns {{ ok: boolean, ready: boolean }}
 *   ready — auth hydration finished (safe to branch UI)
 *   ok — user is authenticated (render protected content)
 */
export function useRequireAuth(options = {}) {
  const mode = options.mode === 'prompt' ? 'prompt' : 'home';
  const router = useRouter();
  const { isAuthenticated, authHydrated, isLoadingUser } = useAuth();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || isLoadingUser) return;

    if (isAuthenticated) {
      redirectingRef.current = false;
      return;
    }

    if (mode === 'prompt') {
      redirectingRef.current = false;
      return;
    }

    if (redirectingRef.current) return;
    redirectingRef.current = true;

    // Auto-kick from a protected page is not an intentional login intent.
    clearPostLoginRedirect();
    router.replace('/');
  }, [authHydrated, isLoadingUser, isAuthenticated, router, mode]);

  const ready = authHydrated && !isLoadingUser;
  const ok = Boolean(ready && isAuthenticated);

  return { ok, ready };
}
