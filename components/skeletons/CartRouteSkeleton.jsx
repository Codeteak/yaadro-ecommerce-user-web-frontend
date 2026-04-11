function CartLineSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl border border-gray-100 bg-white p-3">
      <div className="h-[72px] w-[72px] flex-shrink-0 rounded-xl bg-gray-200" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="h-4 w-[85%] rounded bg-gray-200" />
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="h-6 w-16 rounded-md bg-gray-200" />
          <div className="h-8 w-24 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

/** Shown via `app/cart/loading.js` while the cart page chunk loads. */
export default function CartRouteSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-8"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5">
        <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div className="ml-auto h-3 w-14 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="mx-auto max-w-screen-xl space-y-3 px-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CartLineSkeleton key={i} />
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-screen-xl px-4">
        <div className="h-14 w-full animate-pulse rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}
