'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetailClient from '../products/[id]/ProductDetailClient';
import { resolveProductRouteId } from '../../utils/productRouteId';

/**
 * Client PDP shell at `/product/index.html`.
 * Cloudflare rewrites `/products/<slug>/` here (URL unchanged); slug comes from pathname.
 */
export default function ProductPageClient() {
  const searchParams = useSearchParams();
  const id = resolveProductRouteId({ searchParams });

  if (!id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-600">
        Missing product id.
      </div>
    );
  }

  return <ProductDetailClient productId={id} />;
}
