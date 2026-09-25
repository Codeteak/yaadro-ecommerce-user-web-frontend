'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tapFeedback } from '../utils/haptics';
import { signalNavigationBegin } from '../utils/navigationProgressSignal';

/**
 * Soft App Router navigation with immediate tap + global progress feedback.
 * Prefer this over `window.location` for in-app destinations.
 */
export function useAppNavigation() {
  const router = useRouter();

  const navigate = useCallback(
    (href, { replace = false } = {}) => {
      if (!href || typeof href !== 'string') return;
      tapFeedback();
      signalNavigationBegin();
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router]
  );

  const prefetch = useCallback(
    (href) => {
      if (!href || typeof href !== 'string') return;
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
    },
    [router]
  );

  return { navigate, prefetch, router };
}
