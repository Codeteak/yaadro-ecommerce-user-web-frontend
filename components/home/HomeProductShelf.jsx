'use client';

import ProductCarousel from '../ProductCarousel';

export default function HomeProductShelf({ title, subtitle, products, tone = 'gradient' }) {
  if (!products?.length) return null;

  if (tone === 'plain') {
    return (
      <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5">
        <div className="mb-4 md:mb-5 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-[13px] md:text-sm text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <ProductCarousel products={products} cardVariant="shelf" compact />
      </section>
    );
  }

  return (
    <section className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
      <div
        className="overflow-hidden rounded-[28px] py-6 sm:py-8 shadow-[0_12px_32px_rgba(37,99,235,0.16)]"
        style={{
          background:
            'radial-gradient(circle at center, #ffffff 0%, #dbeafe 42%, #3b82f6 100%)',
        }}
      >
        <div className="mb-5 sm:mb-6 px-4 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-[13px] md:text-sm text-blue-900/70">{subtitle}</p>
          ) : null}
        </div>
        <div className="mx-3 sm:mx-4">
          <ProductCarousel products={products} cardVariant="shelf" compact />
        </div>
      </div>
    </section>
  );
}
