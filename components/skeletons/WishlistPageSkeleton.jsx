import Container from '../Container';
import { Bone } from './primitives';

/** Matches `/wishlist` — breadcrumbs, title, product cards grid. */
export default function WishlistPageSkeleton() {
  return (
    <div
      className="w-full max-w-full overflow-x-hidden py-4 md:py-6"
      aria-busy="true"
      aria-label="Loading wishlist"
    >
      <Container>
        <div className="mb-4 flex gap-2 px-4 md:px-0">
          <Bone className="h-3 w-12 rounded" />
          <Bone className="h-3 w-3 rounded-full" />
          <Bone className="h-3 w-16 rounded" />
        </div>

        <div className="mb-6 flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between md:px-0">
          <Bone className="h-8 w-48 rounded-lg" />
          <Bone className="h-4 w-24 rounded" />
        </div>

        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:px-0 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg bg-white shadow-md animate-pulse"
            >
              <Bone className="h-64 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Bone className="h-4 w-full rounded" />
                <Bone className="h-5 w-1/3 rounded" />
                <Bone className="mt-2 h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
