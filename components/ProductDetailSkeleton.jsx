'use client';

import Container from './Container';
import { SHOW_PRODUCT_EXTENDED_SECTIONS } from '../app/products/[id]/productDetailFlags';

function Shimmer({ className = '' }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export default function ProductDetailSkeleton() {
  return (
    <div className="w-full max-w-full overflow-x-hidden bg-gray-50 pb-28" aria-busy="true" aria-label="Loading product">
      {/* ── Image gallery (matches detail hero) ── */}
      <section className="relative w-full bg-white overflow-hidden pb-6">
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between pointer-events-none">
          <Shimmer className="w-10 h-10 rounded-full" />
          <div className="flex gap-2">
            <Shimmer className="w-10 h-10 rounded-full" />
            <Shimmer className="w-10 h-10 rounded-full" />
          </div>
        </div>
        <div className="w-full min-h-[55vw] sm:min-h-[45vw] max-h-[120vw] sm:max-h-[90vw]">
          <Shimmer className="w-full h-[min(85vw,520px)] max-h-[120vw] sm:max-h-[90vw] rounded-none" />
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          <Shimmer className="h-2 w-7 rounded-full" />
          <Shimmer className="h-2 w-2 rounded-full" />
          <Shimmer className="h-2 w-2 rounded-full" />
        </div>
      </section>

      {/* ── Content card ── */}
      <div className="relative z-10 bg-white rounded-t-3xl pt-6 pb-2 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <Container>
          <div className="max-w-2xl mx-auto space-y-0">
            {/* Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <Shimmer key={i} className="h-7 w-[4.5rem] rounded-full" />
              ))}
            </div>

            {/* Title */}
            <div className="space-y-2 mb-2">
              <Shimmer className="h-6 w-full max-w-md" />
              <Shimmer className="h-5 w-[72%] max-w-sm" />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mb-4">
              <Shimmer className="h-4 w-16" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-6 w-24 rounded-full" />
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-5">
              <Shimmer className="h-9 w-28" />
              <Shimmer className="h-5 w-20" />
            </div>

            <hr className="border-t border-gray-100 my-5" />

            {/* Size / variant label + chips */}
            <Shimmer className="h-3 w-28 mb-3" />
            <div className="flex flex-wrap gap-2 mb-5">
              {[1, 2, 3].map((i) => (
                <Shimmer key={i} className="h-9 w-28 rounded-full" />
              ))}
            </div>

            <hr className="border-t border-gray-100 my-5" />

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <Shimmer className="h-3 w-24 mb-3" />
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100/80">
                      <Shimmer className="h-3 w-14 mb-2" />
                      <Shimmer className="h-4 w-24" />
                    </div>
                  ))}
                </div>

                <hr className="border-t border-gray-100 my-5" />
              </>
            )}

            {/* Description */}
            <Shimmer className="h-3 w-28 mb-3" />
            <div className="space-y-2 mb-5">
              <Shimmer className="h-3.5 w-full" />
              <Shimmer className="h-3.5 w-full" />
              <Shimmer className="h-3.5 w-4/5" />
            </div>

            <hr className="border-t border-gray-100 my-5" />

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <Shimmer className="h-3 w-40 mb-3" />
                <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex justify-between px-3 py-2.5 ${i !== 4 ? 'border-b border-gray-100' : ''} ${
                        i === 0 ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Shimmer className="h-3.5 w-20" />
                      <Shimmer className="h-3.5 w-14" />
                    </div>
                  ))}
                </div>

                <hr className="border-t border-gray-100 my-5" />

                <Shimmer className="h-3 w-36 mb-3" />
                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-3 mb-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Shimmer className="w-7 h-7 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-0.5">
                        <Shimmer className="h-3 w-full" />
                        <Shimmer className="h-3 w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-t border-gray-100 my-5" />

                <Shimmer className="h-3 w-36 mb-3" />
                <div className="space-y-2.5 mb-5">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <Shimmer className="h-3.5 w-24 mb-2" />
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Shimmer key={s} className="w-3 h-3 rounded-sm" />
                        ))}
                      </div>
                      <Shimmer className="h-3 w-full mb-1" />
                      <Shimmer className="h-3 w-[92%]" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Carousel row (Frequently / Similar) */}
            <div className="mt-10 mb-4">
              <Shimmer className="h-6 w-48 mb-4" />
              <div className="flex gap-3 overflow-hidden pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[140px] rounded-2xl border border-gray-100 overflow-hidden bg-white"
                  >
                    <Shimmer className="w-full aspect-[4/5] rounded-none max-h-[120px]" />
                    <div className="p-2 space-y-2">
                      <Shimmer className="h-3 w-16" />
                      <Shimmer className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 safe-area-pb">
        <Shimmer className="h-10 w-[7.25rem] rounded-full" />
        <Shimmer className="flex-1 h-11 rounded-full" />
        <Shimmer className="w-11 h-11 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}
