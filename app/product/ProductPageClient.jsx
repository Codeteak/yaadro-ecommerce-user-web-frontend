'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetailClient from '../products/[id]/ProductDetailClient';

/** Query-based PDP (`/product?id=slug`) — client-only so static export can emit `/product/index.html`. */
export default function ProductPageClient() {
  const searchParams = useSearchParams();
  const id = String(searchParams?.get('id') || searchParams?.get('pid') || '').trim();

  if (!id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-600">
        Missing product id.
      </div>
    );
  }

  return <ProductDetailClient productId={id} />;
}
