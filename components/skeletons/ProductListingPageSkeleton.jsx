import Container from '../Container';
import { Bone, ProductGridSkeleton } from './primitives';

/** Matches `/trending`, `/new` — title, subtitle, ProductGrid. */
export default function ProductListingPageSkeleton({ titleWidth = 160 }) {
  return (
    <div
      className="w-full max-w-full overflow-x-hidden pb-20 md:pb-8"
      aria-busy="true"
      aria-label="Loading products"
    >
      <Container>
        <div className="py-6 md:py-8">
          <div className="mb-2 px-3 sm:px-4 md:px-0">
            <Bone className="h-8 w-full rounded-lg sm:h-9" style={{ maxWidth: titleWidth }} />
            <Bone className="mt-2 h-4 w-full max-w-[200px] rounded" />
          </div>
          <div className="px-4 md:px-0">
            <ProductGridSkeleton count={12} variant="home" cardVariant="flat" />
          </div>
        </div>
      </Container>
    </div>
  );
}
