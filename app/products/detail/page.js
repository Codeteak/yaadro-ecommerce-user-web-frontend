'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import ProductDetailClient from '../[id]/ProductDetailClient';
import ProductDetailSkeleton from '../../../components/ProductDetailSkeleton';
import { normalizeProductRouteParam } from '../../../utils/productApi';

function segmentFromPathname(pathname) {
  const m = String(pathname || '').match(/^\/products\/([^/]+)\/?$/);
  if (!m) return '';
  const raw = m[1];
  if (raw === 'detail') return '';
  return normalizeProductRouteParam(raw);
}

function ProductDetailFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const productId = useMemo(() => {
    const fromQuery = normalizeProductRouteParam(
      searchParams.get('s') || searchParams.get('slug') || searchParams.get('id')
    );
    if (fromQuery) return fromQuery;
    return segmentFromPathname(pathname);
  }, [pathname, searchParams]);

  return <ProductDetailClient productId={productId || null} />;
}

/**
 * Single static PDP shell for `output: 'export'`.
 * Product cards link here (`?s=slug`) so clicks work even when a slug was not pre-rendered at build.
 */
export default function ProductDetailQueryPage() {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailFromQuery />
    </Suspense>
  );
}
