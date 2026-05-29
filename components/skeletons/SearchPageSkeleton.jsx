import Container from '../Container';
import {
  Bone,
  DiscoverSectionSkeleton,
  ProductGridSkeleton,
  SearchPageHeaderSkeleton,
} from './primitives';

/** Results area only (search bar already visible). */
export function SearchResultsGridSkeleton() {
  return (
    <>
      <Bone className="mb-3 h-3 w-40 rounded" />
      <ProductGridSkeleton count={8} variant="browse" />
    </>
  );
}

/** Matches `/search` — sticky search bar + results grid or discover carousels. */
export default function SearchPageSkeleton({ mode = 'results' }) {
  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 pb-28"
      aria-busy="true"
      aria-label="Loading search"
    >
      <SearchPageHeaderSkeleton />
      <Container>
        <div className="px-4 pt-4 pb-6 md:px-0">
          {mode === 'results' ? (
            <>
              <Bone className="mb-3 h-3 w-40 rounded" />
              <ProductGridSkeleton count={8} variant="browse" />
            </>
          ) : (
            <div className="mt-8 space-y-8">
              <DiscoverSectionSkeleton />
              <DiscoverSectionSkeleton />
              <DiscoverSectionSkeleton />
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
