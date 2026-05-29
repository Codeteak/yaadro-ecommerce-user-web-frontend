import { AddressCardSkeleton, Bone, PageTopBarSkeleton } from './primitives';

/** Matches `/addresses`. */
export default function AddressesPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-gray-50"
      aria-busy="true"
      aria-label="Loading addresses"
    >
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBarSkeleton titleWidth={90} />
      </div>

      <div className="flex-1 px-4 pb-24 pt-6">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <Bone className="h-10 w-10 shrink-0 rounded-full" />
            <Bone className="h-4 flex-1 rounded" />
            <Bone className="h-5 w-5 shrink-0 rounded" />
          </div>

          <Bone className="h-5 w-36 rounded px-1" />

          {[0, 1].map((i) => (
            <AddressCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
