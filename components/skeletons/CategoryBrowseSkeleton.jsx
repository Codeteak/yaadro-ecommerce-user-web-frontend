import {
  CategoryRailSkeleton,
  FilterPillsRowSkeleton,
  ProductGridSkeleton,
  StickyHeaderSkeleton,
} from './primitives';

/** Matches `/categories/[categoryId]` — header, subcategory rail, filters, grid. */
export default function CategoryBrowseSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]"
      aria-busy="true"
      aria-label="Loading category"
    >
      <StickyHeaderSkeleton centerTitle />
      <div className="flex w-full max-w-screen-2xl flex-row">
        <CategoryRailSkeleton count={6} />
        <main className="min-w-0 flex-1 bg-gray-50 px-2.5 py-3 sm:px-3">
          <FilterPillsRowSkeleton />
          <ProductGridSkeleton count={8} variant="browse" />
        </main>
      </div>
    </div>
  );
}
