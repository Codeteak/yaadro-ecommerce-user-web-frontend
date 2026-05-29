import { Bone, CartLineSkeleton, ProductCarouselRowSkeleton } from './primitives';

/** Matches order detail (`/order`, `/orders/[id]`). */
export default function OrderDetailPageSkeleton() {
  return (
    <div
      className="min-h-svh bg-gray-50 pb-28"
      aria-busy="true"
      aria-label="Loading order"
    >
      <div className="mx-auto max-w-[480px]">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5">
          <Bone className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-4 w-28 rounded" />
            <Bone className="h-3 w-36 rounded" />
          </div>
          <Bone className="h-7 w-20 rounded-full" />
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <Bone className="mb-3 h-4 w-32 rounded" />
            <Bone className="h-3 w-full rounded" />
            <Bone className="mt-2 h-3 w-4/5 rounded" />
          </div>

          <Bone className="h-3 w-20 rounded" />
          {[0, 1].map((i) => (
            <CartLineSkeleton key={i} />
          ))}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <Bone className="h-3 w-24 rounded" />
                <Bone className="h-3 w-16 rounded" />
              </div>
            ))}
            <Bone className="mt-2 h-px w-full rounded-none" />
            <div className="flex justify-between pt-1">
              <Bone className="h-5 w-12 rounded" />
              <Bone className="h-5 w-20 rounded" />
            </div>
          </div>

          <div className="pt-4">
            <Bone className="mb-4 h-6 w-40 rounded" />
            <ProductCarouselRowSkeleton count={4} />
          </div>

          <div className="flex gap-2 pt-2">
            <Bone className="h-11 flex-1 rounded-xl" />
            <Bone className="h-11 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
