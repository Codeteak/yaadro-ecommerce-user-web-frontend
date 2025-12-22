'use client';

import ProductCard from './ProductCard';

export default function ProductCarousel({ products, title, showMoreLink }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full overflow-x-hidden">
      {title && (
        <div className="flex items-center justify-between mb-6 pl-4 sm:pl-6 lg:pl-8 pr-0">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h2>
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
      
      {/* Scrollable Container - Left padding, no right padding */}
      <div
        className="flex gap-1.5 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 w-full pl-4 sm:pl-6 lg:pl-8 pr-0"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ProductCard product={product} isCarousel={true} />
          </div>
        ))}
      </div>
    </div>
  );
}

