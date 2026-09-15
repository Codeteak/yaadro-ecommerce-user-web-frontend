import Container from '../Container';

function Bone({ className = '', style }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`.trim()}
      style={style}
    />
  );
}

function SectionHeading({ titleWidth = 280, subtitleWidth = 0, showMore = false, light = false }) {
  const titleCls = light ? 'bg-white/30' : 'bg-gray-200';
  const subCls = light ? 'bg-white/20' : 'bg-gray-200';
  const linkCls = light ? 'bg-white/25' : 'bg-gray-200';
  return (
    <div className="flex items-start justify-between gap-3 px-3 sm:px-4 md:px-0">
      <div className="min-w-0 flex-1">
        <Bone
          className={`h-9 sm:h-10 md:h-12 w-full ${titleCls}`}
          style={{ maxWidth: titleWidth }}
        />
        {subtitleWidth > 0 ? (
          <Bone
            className={`mt-2 h-4 w-full ${subCls}`}
            style={{ maxWidth: subtitleWidth }}
          />
        ) : null}
      </div>
      {showMore ? <Bone className={`h-5 w-20 shrink-0 rounded ${linkCls}`} /> : null}
    </div>
  );
}

/** Carousel product card ~140px wide (ProductCard isCarousel) */
function ProductCarouselRowSkeleton({ count = 6, gapClass = 'gap-2' }) {
  return (
    <div className="w-full">
      <div className="overflow-x-hidden scrollbar-hide pb-3">
        <div className={`flex w-max ${gapClass} px-4`}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="w-[140px] shrink-0 flex flex-col gap-2">
              <Bone className="w-full aspect-square rounded-2xl" />
              <Bone className="h-2.5 w-full rounded" />
              <Bone className="h-2.5 w-3/4 rounded" />
              <Bone className="h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeTopSkeleton() {
  return (
    <section className="w-full bg-white pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Bone className="h-5 w-36 max-w-[70%] rounded" />
            <Bone className="mt-1.5 h-3 w-full max-w-[220px] rounded" />
          </div>
        </div>
        <Bone className="h-11 w-11 shrink-0 rounded-full" />
      </div>

      <div className="mt-3 px-4 sm:px-5">
        <Bone className="h-11 w-full rounded-full" />
      </div>

      <div className="mt-4 px-4 sm:px-5">
        <Bone className="w-full aspect-[2.4/1] max-h-[200px] rounded-2xl" />
      </div>

      <div className="mt-5 w-full">
        <div className="overflow-x-hidden px-4 sm:px-5">
          <div className="flex w-max gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center gap-2">
                <Bone className="h-[72px] w-[72px] rounded-[20px]" />
                <Bone className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-hidden px-4 sm:px-5 pb-2">
        <div className="flex w-max items-stretch gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex w-[173px] shrink-0 flex-col gap-2">
              <Bone className="aspect-square w-full rounded-2xl" />
              <Bone className="h-2.5 w-16 rounded" />
              <Bone className="h-4 w-full rounded" />
              <Bone className="h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DailyDiarySkeleton() {
  return (
    <section className="relative mx-3 my-4 overflow-hidden rounded-[32px] bg-[#1e4ed8] sm:mx-6 sm:my-6 md:mx-8">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-bottom"
        style={{ backgroundImage: "url('/daily-diary-bg.png')" }}
        aria-hidden
      />
      <div className="relative z-[1] px-4 pb-8 pt-8 sm:px-5 sm:pb-10 sm:pt-10">
        <Bone className="mx-auto mb-3 h-10 w-48 rounded-lg bg-white/25 sm:h-12 sm:w-64" />
        <Bone className="mx-auto mb-6 h-4 w-64 max-w-[80%] rounded bg-white/20 sm:mb-8" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:-mx-5 sm:px-5">
          <Bone className="h-[236px] w-[173px] shrink-0 rounded-[20px] bg-white/90" />
          <Bone className="h-[236px] w-[173px] shrink-0 rounded-[20px] bg-white/90" />
        </div>
        <Bone className="mx-auto mt-8 h-10 w-28 rounded-full bg-white/25" />
      </div>
    </section>
  );
}

function FooterSkeleton() {
  return (
    <footer className="relative border-t border-gray-100 bg-white pt-8 pb-6 sm:pt-10 sm:pb-8 md:pt-12 md:pb-10">
      <Container>
        <div className="flex flex-col items-center px-3 sm:px-4 md:px-0">
          <Bone className="h-10 w-40 rounded-lg" />
          <Bone className="mt-3 h-6 w-24 rounded" />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <Bone className="h-4 w-24 rounded" />
            <Bone className="h-4 w-32 rounded" />
          </div>
          <Bone className="mx-auto mt-8 h-px w-full max-w-md rounded" />
          <Bone className="mt-6 h-8 w-44 rounded-full" />
          <Bone className="mt-3 h-3 w-48 rounded" />
        </div>
      </Container>
    </footer>
  );
}

/**
 * Full home page loading state — mirrors loaded home layout (top → sections → footer).
 */
export default function HomePageSkeleton() {
  return (
    <div
      className="w-full max-w-full overflow-x-hidden min-h-screen bg-white"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading home"
    >
      <HomeTopSkeleton />

      <DailyDiarySkeleton />

      <section className="relative z-10 py-6 sm:py-8" aria-label="Loading home sections">
        <div className="mb-4 px-3 sm:px-4 md:px-6">
          <SectionHeading titleWidth={220} subtitleWidth={180} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
        <div className="mt-6 px-3 sm:px-4 md:px-6">
          <SectionHeading titleWidth={180} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
      </section>

      <section className="py-6 sm:py-8" aria-label="Loading more products">
        <div className="mb-4 px-3 sm:px-4 md:px-6">
          <SectionHeading titleWidth={200} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
      </section>

      <FooterSkeleton />
    </div>
  );
}
