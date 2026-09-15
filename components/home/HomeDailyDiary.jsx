'use client';

import Link from 'next/link';
import ProductCard from '../ProductCard';
import SmoothDragRail from '../motion/SmoothDragRail';
import { ArrowRightRegular as ArrowRight } from '../icons';

const DEFAULT_DESCRIPTION =
  'Milk, curd, ghee and more packed fresh for your kitchen today.';

export default function HomeDailyDiary({
  products = [],
  subtitle = '',
  isLoading = false,
}) {
  const list = Array.isArray(products) ? products : [];
  if (!isLoading && list.length === 0) return null;

  const description = String(subtitle || '').trim() || DEFAULT_DESCRIPTION;

  return (
    <section
      className="relative mx-3 my-4 overflow-hidden rounded-[32px] bg-[#1e4ed8] bg-cover bg-bottom sm:mx-6 sm:my-6 md:mx-8"
      style={{ backgroundImage: "url('/daily-diary-bg.png')" }}
    >
      <div className="relative z-[1] px-4 pb-8 pt-8 sm:px-5 sm:pb-10 sm:pt-10">
        <div className="mb-6 text-center sm:mb-8">
          <h2 className="font-headingnow text-[2.85rem] font-extrabold uppercase leading-none tracking-wide text-white sm:text-5xl md:text-6xl">
            Daily Diary
          </h2>
          <p className="mx-auto mt-3 max-w-[22rem] text-[13px] font-medium leading-snug text-white/85 sm:text-sm">
            {description}
          </p>
        </div>

        {isLoading && list.length === 0 ? (
          <SmoothDragRail trackClassName="items-stretch gap-3" ariaLabel="Loading daily diary">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-[236px] w-[173px] shrink-0 animate-pulse rounded-[20px] bg-white/90"
              />
            ))}
          </SmoothDragRail>
        ) : (
          <SmoothDragRail trackClassName="items-stretch gap-3" ariaLabel="Daily diary products">
            {list.map((product) => (
              <div key={product.id} className="flex h-full flex-shrink-0">
                <ProductCard product={product} isCarousel />
              </div>
            ))}
          </SmoothDragRail>
        )}

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/products?category=Dairy"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#1e4ed8] shadow-sm transition hover:bg-white/90"
          >
            <span>Show all</span>
            <ArrowRight size={16} className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
