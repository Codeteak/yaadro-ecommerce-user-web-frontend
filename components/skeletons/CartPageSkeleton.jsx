import { Bone, CartLineSkeleton, CartTopBarSkeleton, ProductCarouselRowSkeleton } from './primitives';

/** Matches `/cart` — top bar, line items, summary, sticky checkout bar. */
export default function CartPageSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-32"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <CartTopBarSkeleton />

      <div className="mx-auto max-w-screen-xl space-y-2.5 px-4 py-4">
        <Bone className="mb-3 h-3 w-12 rounded" />
        {[0, 1, 2].map((i) => (
          <CartLineSkeleton key={i} />
        ))}

        <div className="mt-6 space-y-4">
          <Bone className="h-10 w-full max-w-[280px] rounded-lg" />
          <Bone className="h-4 w-40 rounded" />
          <ProductCarouselRowSkeleton count={5} />
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-screen-xl px-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 animate-pulse">
          <Bone className="mb-3 h-3 w-24 rounded" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Bone className="h-3 w-20 rounded" />
              <Bone className="h-3 w-16 rounded" />
            </div>
            <div className="flex justify-between">
              <Bone className="h-3 w-16 rounded" />
              <Bone className="h-3 w-14 rounded" />
            </div>
          </div>
          <Bone className="mt-4 h-px w-full rounded-none" />
          <div className="mt-3 flex justify-between">
            <Bone className="h-5 w-12 rounded" />
            <Bone className="h-5 w-20 rounded" />
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3 w-10 rounded" />
            <Bone className="h-6 w-24 rounded" />
          </div>
          <Bone className="h-11 flex-1 max-w-[55%] rounded-full" />
        </div>
      </div>
    </div>
  );
}
