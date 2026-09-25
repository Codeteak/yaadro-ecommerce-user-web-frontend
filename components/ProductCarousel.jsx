'use client';

import ProductCard from './ProductCard';
import SmoothDragRail from './motion/SmoothDragRail';

export default function ProductCarousel({ products, title, showMoreLink, cardVariant, compact = false }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full">
      {title && (
        <div className="flex items-center justify-between mb-6 pl-4 sm:pl-6 lg:pl-8 pr-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{title}</h2>
          {showMoreLink && (
            <a
              href={showMoreLink}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm md:text-base flex items-center gap-1 transition-colors"
            >
              Show More
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      )}

      <SmoothDragRail
        className={compact ? 'pb-1' : 'pb-4'}
        trackClassName={
          compact
            ? 'items-stretch gap-2.5'
            : 'items-stretch gap-1.5 md:gap-4 pl-4 sm:pl-6 lg:pl-8 pr-4'
        }
        ariaLabel={title ? `${title} products` : 'Products'}
      >
        {compact ? <div className="w-4 sm:w-6 lg:w-8 shrink-0" aria-hidden /> : null}
        {products.map((product) => (
          <div key={product.id} className="flex h-full flex-shrink-0">
            <ProductCard product={product} isCarousel={true} variant={cardVariant} />
          </div>
        ))}
        {compact ? <div className="w-4 sm:w-6 lg:w-8 shrink-0" aria-hidden /> : null}
      </SmoothDragRail>
    </div>
  );
}
