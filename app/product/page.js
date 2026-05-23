'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProductDetailPath, normalizeProductRouteParam } from '../../utils/productApi';

function ProductLegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = normalizeProductRouteParam(
      searchParams.get('id') || searchParams.get('pid')
    );
    if (id) {
      router.replace(getProductDetailPath({ id, slug: id }));
      return;
    }
    router.replace('/products/');
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#902bf5]" />
    </div>
  );
}

/** Legacy `/product?id=` — redirect to `/products/{slug}/` (static export cannot use query on build). */
export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-white text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <ProductLegacyRedirect />
    </Suspense>
  );
}
