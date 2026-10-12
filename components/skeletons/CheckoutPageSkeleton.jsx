import {
  AddressCardSkeleton,
  Bone,
  CartLineSkeleton,
  ProductCarouselRowSkeleton,
} from './primitives';

/** Matches `/checkout` — order lines, suggestions, address, notes, payment, promo, summary. */
export default function CheckoutPageSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full bg-[#F7F7F8] pb-32"
      aria-busy="true"
      aria-label="Loading checkout"
    >
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3.5">
          <Bone className="h-9 w-9 shrink-0 rounded-full" />
          <Bone className="h-5 w-24 rounded" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <div className="min-w-0">
          <div className="px-4 pt-5">
            <Bone className="mb-3 h-5 w-28 rounded" />
            <div className="rounded-[18px] border border-gray-200 bg-white p-3">
              <CartLineSkeleton />
            </div>
            <Bone className="mt-3 h-12 w-full rounded-[18px]" />
          </div>

          <div className="px-4 pt-6">
            <Bone className="mb-3 h-5 w-40 rounded" />
            <ProductCarouselRowSkeleton count={4} />
          </div>

          <div className="px-4 pt-6">
            <Bone className="mb-3 h-5 w-36 rounded" />
            <AddressCardSkeleton />
          </div>

          <div className="px-4 pt-6">
            <Bone className="mb-3 h-5 w-32 rounded" />
            <Bone className="h-16 w-full rounded-[18px]" />
          </div>

          <div className="px-4 pt-6">
            <Bone className="mb-3 h-5 w-24 rounded" />
            <div className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white p-3.5">
              <Bone className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-32 rounded" />
                <Bone className="h-3 w-48 rounded" />
              </div>
            </div>
          </div>

          <div className="px-4 pt-6">
            <Bone className="h-24 w-full rounded-[18px]" />
          </div>

          <div className="mx-4 mt-6 rounded-[18px] border border-gray-200 bg-white p-4">
            <Bone className="mb-3 h-5 w-32 rounded" />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between">
                  <Bone className="h-3 w-20 rounded" />
                  <Bone className="h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-50 border-t border-gray-200 bg-white px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <Bone className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
