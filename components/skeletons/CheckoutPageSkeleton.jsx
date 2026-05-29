import {
  AddressCardSkeleton,
  Bone,
  CartLineSkeleton,
  CheckoutStepBarSkeleton,
  ProductCarouselRowSkeleton,
} from './primitives';

/** Matches `/checkout` — step bar, address, payment, coupons, summary, sticky CTA. */
export default function CheckoutPageSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-36"
      aria-busy="true"
      aria-label="Loading checkout"
    >
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Bone className="h-9 w-9 shrink-0 rounded-full" />
          <Bone className="h-5 w-24 rounded" />
        </div>
        <CheckoutStepBarSkeleton />
      </div>

      <div className="px-4 pt-5">
        <Bone className="mb-3 h-3 w-28 rounded" />
        <AddressCardSkeleton />
        <Bone className="mt-3 h-12 w-full rounded-2xl border-2 border-dashed border-gray-200" />
      </div>

      <div className="px-4 pt-5">
        <Bone className="mb-3 h-3 w-28 rounded" />
        <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-3.5">
          <Bone className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-32 rounded" />
            <Bone className="h-3 w-48 rounded" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <Bone className="mb-3 h-3 w-20 rounded" />
        <Bone className="h-24 w-full rounded-2xl" />
      </div>

      <div className="px-4 pt-5">
        <Bone className="mb-4 h-6 w-40 rounded" />
        <ProductCarouselRowSkeleton count={4} />
      </div>

      <div className="mx-4 mt-5 rounded-2xl border border-gray-100 bg-white p-4">
        <Bone className="mb-3 h-3 w-24 rounded" />
        <CartLineSkeleton />
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-3 w-20 rounded" />
              <Bone className="h-3 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <Bone className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
