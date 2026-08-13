'use client';

import { useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { ProductGridSkeleton } from './skeletons/primitives';

/**
 * Bottom sentinel for infinite lists. Calls fetchNextPage when near viewport.
 */
export default function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  showSkeleton = true,
  skeletonCount = 4,
  endLabel = 'No more products',
  showEndLabel = false,
}) {
  const [ref, inView] = useInView({
    rootMargin: '200px 0px',
    once: false,
    threshold: 0,
  });

  useEffect(() => {
    if (!inView) return;
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage?.();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage && !isFetchingNextPage) {
    if (!showEndLabel) return null;
    return (
      <p className="py-4 text-center text-[12px] text-gray-400" role="status">
        {endLabel}
      </p>
    );
  }

  return (
    <div ref={ref} className="w-full" aria-hidden={!isFetchingNextPage}>
      {isFetchingNextPage && showSkeleton ? (
        <div className="mt-3">
          <ProductGridSkeleton count={skeletonCount} variant="products" />
        </div>
      ) : (
        <div className="h-8 w-full" />
      )}
    </div>
  );
}
