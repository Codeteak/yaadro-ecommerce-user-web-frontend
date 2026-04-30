'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetailClient from '../products/[id]/ProductDetailClient';

export default function ProductPage() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || searchParams?.get('pid') || '';
  const trimmed = String(id).trim();

  if (!trimmed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Missing product id.
      </div>
    );
  }

  return <ProductDetailClient productId={trimmed} />;
}

