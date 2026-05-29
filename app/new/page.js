'use client';

import { useProducts } from '../../hooks/useProducts';
import Container from '../../components/Container';
import ProductGrid from '../../components/ProductGrid';
import ProductListingPageSkeleton from '../../components/skeletons/ProductListingPageSkeleton';

export default function NewPage() {
  const { data, isLoading } = useProducts({
    limit: 48,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const products = data?.products || [];

  if (isLoading) {
    return <ProductListingPageSkeleton titleWidth={80} />;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
      <Container>
        <div className="py-6 md:py-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 px-3 sm:px-4 md:px-0">New</h1>
          <p className="text-gray-600 mb-6 px-4 md:px-0">Latest arrivals</p>
          <div className="px-4 md:px-0">
            {products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <p className="text-gray-500 text-center py-12">No new products at the moment.</p>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
