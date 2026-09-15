'use client';

import ProductCard from '../ProductCard';

export default function HomeDailyDiary({ products = [], isLoading = false }) {
  const list = Array.isArray(products) ? products : [];
  if (!isLoading && list.length === 0) return null;

  return (
    <section
      className="relative mx-3 my-4 overflow-hidden rounded-[32px] bg-[#1e4ed8] bg-cover bg-bottom sm:mx-6 sm:my-6 md:mx-8"
      style={{ backgroundImage: "url('/daily-diary-bg.png')" }}
    >
      <div className="relative z-[1] px-4 pb-20 pt-8 sm:px-5 sm:pb-24 sm:pt-10">
        <h2 className="mb-6 text-center font-headingnow text-[2rem] font-extrabold uppercase leading-none tracking-wide text-white sm:mb-8 sm:text-4xl md:text-5xl">
          Daily Diary
        </h2>

        {isLoading && list.length === 0 ? (
          <div className="overflow-x-hidden pb-3">
            <div className="flex w-max items-stretch gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[236px] w-[173px] shrink-0 animate-pulse rounded-[20px] bg-white/90"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide pb-3 snap-x snap-mandatory">
            <div className="flex w-max items-stretch gap-3">
              {list.map((product) => (
                <div key={product.id} className="flex h-full flex-shrink-0 snap-start">
                  <ProductCard product={product} isCarousel />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
