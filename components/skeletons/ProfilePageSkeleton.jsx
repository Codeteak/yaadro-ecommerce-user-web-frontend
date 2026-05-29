import { Bone, PageTopBarSkeleton } from './primitives';

/** Matches `/profile` — header card, stats, offers, menu, account info. */
export default function ProfilePageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-gray-50"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBarSkeleton titleWidth={100} />
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 pb-24">
        <div className="border-b border-gray-100 bg-white px-4 py-6">
          <div className="flex items-center gap-4">
            <Bone className="h-20 w-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-6 w-40 rounded" />
              <Bone className="h-4 w-24 rounded" />
              <Bone className="mt-2 h-8 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 bg-white px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="text-center space-y-2">
              <Bone className="mx-auto h-8 w-10 rounded" />
              <Bone className="mx-auto h-3 w-14 rounded" />
            </div>
          ))}
        </div>

        {[0, 1].map((i) => (
          <div key={i} className="mx-4 mt-4 rounded-lg border border-gray-100 bg-white p-4">
            <Bone className="mb-3 h-4 w-32 rounded" />
            <Bone className="h-16 w-full rounded-xl" />
          </div>
        ))}

        <div className="mx-4 mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 bg-white">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Bone className="h-5 w-5 rounded" />
                <Bone className="h-4 w-24 rounded" />
              </div>
              <Bone className="h-5 w-5 rounded" />
            </div>
          ))}
        </div>

        <div className="mx-4 mt-4 rounded-lg border border-gray-100 bg-white p-4">
          <Bone className="mb-3 h-4 w-36 rounded" />
          <div className="space-y-2">
            <Bone className="h-3.5 w-full rounded" />
            <Bone className="h-3.5 w-4/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
