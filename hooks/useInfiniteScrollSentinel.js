'use client';

import { useEffect } from 'react';
import { useInView } from './useInView';

/**
 * When the sentinel is in view, fetch the next infinite-query page.
 * @param {{
 *   hasNextPage?: boolean,
 *   isFetchingNextPage?: boolean,
 *   fetchNextPage?: () => unknown,
 *   rootMargin?: string,
 * }} opts
 * @returns {React.RefObject<HTMLElement|null>}
 */
export function useInfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px 0px',
} = {}) {
  const [ref, inView] = useInView({ rootMargin, once: false, threshold: 0 });

  useEffect(() => {
    if (!inView) return;
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage?.();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return ref;
}
