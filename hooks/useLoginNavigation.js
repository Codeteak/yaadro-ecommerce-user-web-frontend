'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setPostLoginRedirect, sanitizeInternalPath } from '../utils/authSession';

/**
 * Navigate to `/login` and remember where to return after a successful session.
 * @param {string} [explicitReturnPath] — in-app path (e.g. `/checkout`). Defaults to current URL path + query.
 */
export function useLoginNavigation() {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const goToLogin = useCallback(
    (explicitReturnPath) => {
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';
      const fallback = `${pathname}${search}`;
      const target =
        sanitizeInternalPath(explicitReturnPath) ?? sanitizeInternalPath(fallback) ?? '/';
      setPostLoginRedirect(target);
      router.push('/login');
    },
    [router, pathname]
  );

  return { goToLogin };
}
