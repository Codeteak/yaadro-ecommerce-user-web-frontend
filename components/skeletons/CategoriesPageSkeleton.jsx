import {
  Bone,
  CategoryCardSkeleton,
  DiscoverSectionSkeleton,
} from './primitives';

/** Category grid only (heading + search already rendered). */
export function CategoriesGridSkeleton({ count = 8 }) {
  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 sm:gap-x-3 sm:gap-y-5">
        {Array.from({ length: count }).map((_, i) => (
          <CategoryCardSkeleton key={i} featured={i === 0} />
        ))}
      </div>
    </div>
  );
}

/** Matches `/categories` — title, search pill, category grid, carousel sections. */
export default function CategoriesPageSkeleton() {
  return (
    <div
      className="min-h-screen w-full max-w-full bg-white pb-28 pt-[env(safe-area-inset-top,0px)]"
      aria-busy="true"
      aria-label="Loading categories"
    >
      <div className="px-4 pb-2 pt-4">
        <Bone className="mb-1.5 h-8 w-full max-w-[260px] rounded-lg sm:h-10" />
        <Bone className="h-4 w-full max-w-[280px] rounded" />
      </div>

      <div className="px-4 pb-3">
        <Bone className="h-10 w-full rounded-full" />
      </div>

      <CategoriesGridSkeleton count={8} />

      <div className="mt-8 space-y-8 px-4">
        <DiscoverSectionSkeleton />
        <DiscoverSectionSkeleton />
      </div>
    </div>
  );
}
