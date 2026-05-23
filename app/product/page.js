import { Suspense } from 'react';
import ProductPageClient from './ProductPageClient';

export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-white text-gray-500">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <ProductPageClient />
    </Suspense>
  );
}
