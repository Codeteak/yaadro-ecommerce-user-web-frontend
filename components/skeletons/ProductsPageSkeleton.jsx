import {
  Bone,
  CategoryRailSkeleton,
  ProductGridSkeleton,
  StickyHeaderSkeleton,
} from './primitives';

/** Matches `/products` — sticky header, left category rail, product grid. */
export default function ProductsPageSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50 pb-28 pt-[env(safe-area-inset-top,0px)]"
      aria-busy="true"
      aria-label="Loading products"
    >
      <StickyHeaderSkeleton centerTitle showSearch />
      <div className="flex w-full max-w-screen-2xl flex-row">
        <CategoryRailSkeleton count={7} />
        <main className="min-w-0 flex-1 px-2.5 py-3 sm:px-3">
          <Bone className="mb-3 h-4 w-32 rounded" />
          <ProductGridSkeleton count={8} variant="products" />
        </main>
      </div>
    </div>
  );
}
