import Container from '../Container';

/** Shown via `app/loading.js` when navigating to home — matches home layout while JS loads. */
export default function HomeRouteSkeleton() {
  return (
    <div
      className="w-full max-w-full overflow-x-hidden min-h-screen bg-gray-50"
      aria-busy="true"
      aria-label="Loading home"
    >
      <section className="py-5 md:py-7 lg:py-9 bg-white">
        <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-shrink-0 flex-col items-center gap-2">
                <div className="h-20 w-20 animate-pulse rounded-2xl bg-gray-200 sm:h-24 sm:w-24" />
                <div className="h-2.5 w-14 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-6">
        <Container>
          <div className="grid min-h-[240px] grid-cols-1 gap-4 md:grid-cols-2 md:min-h-[280px]">
            <div className="animate-pulse rounded-2xl bg-gray-200" />
            <div className="animate-pulse rounded-2xl bg-gray-200" />
          </div>
        </Container>
      </section>

      <section className="bg-gray-50 py-8 md:py-12">
        <Container>
          <div className="mb-6 h-8 max-w-xs animate-pulse rounded-lg bg-gray-200 md:h-9" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="aspect-[4/5] max-h-[140px] w-full animate-pulse rounded-2xl bg-gray-200" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="mt-1 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
