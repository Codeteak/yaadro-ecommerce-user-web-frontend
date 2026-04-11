function CategorySkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[18px] border border-gray-100 bg-white">
      <div className="relative min-h-[168px] bg-gray-200">
        <div className="absolute left-3.5 top-3.5 h-4 w-[70%] rounded-md bg-gray-300/80" />
      </div>
    </div>
  );
}

/** Shown via `app/categories/loading.js` while the categories page chunk loads. */
export default function CategoriesRouteSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-10"
      aria-busy="true"
      aria-label="Loading categories"
    >
      <div className="px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-0.5 h-6 max-w-[220px] animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-3.5 max-w-[280px] animate-pulse rounded bg-gray-200" />
      </div>

      <div className="px-4 pb-3">
        <div className="h-10 w-full animate-pulse rounded-full bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CategorySkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
