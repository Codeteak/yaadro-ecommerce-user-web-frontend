export default function CategoryBrowseLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]">
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 flex-1 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
      <div className="h-36 animate-pulse bg-gray-200 sm:h-40" />
      <div className="px-4 py-4">
        <div className="mb-3 h-10 animate-pulse rounded-full bg-gray-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white animate-pulse"
            >
              <div className="aspect-square bg-gray-100" />
              <div className="space-y-2 p-2.5">
                <div className="h-3 w-4/5 rounded-full bg-gray-100" />
                <div className="h-3 w-3/5 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
