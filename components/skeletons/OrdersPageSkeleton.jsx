import {
  Bone,
  OrderListCardSkeleton,
  PageTopBarSkeleton,
  ProductCarouselRowSkeleton,
} from './primitives';

/** Matches `/orders` — order cards + recommendation carousels. */
export default function OrdersPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-gray-50"
      aria-busy="true"
      aria-label="Loading orders"
    >
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBarSkeleton titleWidth={110} />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {[0, 1, 2].map((i) => (
          <OrderListCardSkeleton key={i} />
        ))}

        <div className="mt-2 space-y-6">
          <div>
            <Bone className="h-9 w-48 rounded-lg" />
            <Bone className="mt-2 h-4 w-56 rounded" />
            <div className="mt-4">
              <ProductCarouselRowSkeleton count={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
