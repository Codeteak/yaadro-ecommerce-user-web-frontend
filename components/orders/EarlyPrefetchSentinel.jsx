'use client';

import { useEffect } from 'react';
import { useInView } from '../../hooks/useInView';

/**
 * Fires fetchNextPage before the bottom sentinel, so the next page is warm
 * when the user reaches the end of the current list.
 */
export default function EarlyPrefetchSentinel({
  enabled = false,
  isFetchingNextPage = false,
  fetchNextPage,
  rootMargin = '640px 0px',
}) {
  const [ref, inView] = useInView({
    rootMargin,
    once: false,
    threshold: 0,
  });

  useEffect(() => {
    if (!inView || !enabled || isFetchingNextPage) return;
    void fetchNextPage?.();
  }, [inView, enabled, isFetchingNextPage, fetchNextPage]);

  if (!enabled) return null;

  return <div ref={ref} className="h-px w-full" aria-hidden />;
}
