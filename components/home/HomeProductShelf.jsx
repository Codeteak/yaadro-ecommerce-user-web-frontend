'use client';

import ProductCarousel from '../ProductCarousel';

export default function HomeProductShelf({ title, subtitle, products }) {
  if (!products?.length) return null;

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
      <ProductCarousel products={products} />
    </section>
  );
}
