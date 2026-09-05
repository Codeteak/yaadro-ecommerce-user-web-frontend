'use client';

import { useHomeSections } from '../../hooks/useHomeSections';
import { ProductCarouselRowSkeleton } from '../skeletons/primitives';
import HomeEventCard from './HomeEventCard';
import HomeProductShelf from './HomeProductShelf';

export default function HomeSections() {
  const { sections, isLoading } = useHomeSections();

  if (isLoading && sections.length === 0) {
    return (
      <div className="py-6 sm:py-8" aria-busy="true" aria-label="Loading home sections">
        <div className="mb-4 px-4 sm:px-6">
          <ProductCarouselRowSkeleton count={6} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
      </div>
    );
  }

  if (!sections.length) return null;

  return (
    <div>
      {sections.map((section) => {
        if (section.type === 'event_shelf') {
          return <HomeEventCard key={section.id} section={section} />;
        }
        if (section.type === 'product_shelf' || section.type === 'buy_x_get_y') {
          return (
            <HomeProductShelf
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              products={section.products}
              tone={section.type === 'buy_x_get_y' ? 'plain' : 'gradient'}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
