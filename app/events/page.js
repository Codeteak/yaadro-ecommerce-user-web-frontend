'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Container from '../../components/Container';
import ProductGrid from '../../components/ProductGrid';
import FloatingViewCartPill from '../../components/FloatingViewCartPill';
import ProductListingPageSkeleton from '../../components/skeletons/ProductListingPageSkeleton';
import { useHomeSections } from '../../hooks/useHomeSections';
import { findHomeSectionById, formatEventDateRange } from '../../utils/homeSectionsApi';

function EventProductsInner() {
  const searchParams = useSearchParams();
  const eventId = String(searchParams.get('id') || '').trim();
  const { sections, isLoading } = useHomeSections();
  const section = findHomeSectionById(sections, eventId);

  if (isLoading && !section) {
    return <ProductListingPageSkeleton titleWidth={180} />;
  }

  const title = section?.title || 'Event';
  const dateLabel = section ? formatEventDateRange(section.startsAt, section.endsAt) : null;
  const products = section?.products || [];
  const missing = !eventId || !section;

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-20 md:pb-8">
      <Container>
        <div className="py-6 md:py-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 px-3 sm:px-4 md:px-0 text-[13px] font-semibold text-violet-700 hover:text-violet-800"
          >
            <span aria-hidden>←</span>
            Home
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 px-3 sm:px-4 md:px-0">
            {missing ? 'Event' : title}
          </h1>
          <p className="text-gray-600 mb-6 px-4 md:px-0">
            {missing
              ? 'This event is not available right now.'
              : dateLabel || 'Event picks from this shop.'}
          </p>
          <div className="px-4 md:px-0">
            {!missing && products.length > 0 ? (
              <ProductGrid products={products} />
            ) : (
              <p className="text-gray-500 text-center py-12">
                {missing
                  ? 'Go back home and try another event.'
                  : 'No products in this event yet.'}
              </p>
            )}
          </div>
        </div>
      </Container>
      <FloatingViewCartPill />
    </div>
  );
}

export default function EventProductsPage() {
  return (
    <Suspense fallback={<ProductListingPageSkeleton titleWidth={180} />}>
      <EventProductsInner />
    </Suspense>
  );
}
