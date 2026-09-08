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
    <div className="w-screen relative left-1/2 -translate-x-1/2">
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

function HeroCategoryCarouselSkeleton() {
  return (
    <div className="relative inset-x-0 z-20 mt-4 pt-2 pb-2 px-4">
      <div className="flex items-stretch gap-4 overflow-hidden pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-2">
            <Bone className="h-20 w-20 rounded-2xl bg-white/30 sm:h-24 sm:w-24" />
            <Bone className="h-3 w-14 rounded bg-white/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section className="home-hero-minh w-full relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(160deg, #7d24d6 0%, #902bf5 42%, #6d28d9 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 calc(100% - 7rem), rgba(0,0,0,0.4) calc(100% - 3.5rem), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 calc(100% - 7rem), rgba(0,0,0,0.4) calc(100% - 3.5rem), transparent 100%)',
        }}
        aria-hidden
      >
        <div className="absolute inset-y-0 right-0 w-[62%] sm:w-[55%] md:w-[48%] bg-white/10" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(125,36,214,0.97) 0%, rgba(144,43,245,0.82) 42%, rgba(109,40,217,0.28) 72%, rgba(109,40,217,0.08) 100%)',
          }}
        />
      </div>

      <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
        <div className="relative flex flex-col pb-16 sm:pb-20 overflow-hidden">
          {/* Header: branding + search + profile */}
          <div className="relative z-30 flex items-center gap-2 px-3 sm:px-4 min-h-[52px] pt-5 sm:pt-6 md:pt-8">
            <div className="flex min-w-0 max-w-[38%] sm:max-w-[42%] shrink-0 items-center gap-2">
              <Bone className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-white/30" />
              <div className="flex min-w-0 flex-col gap-1">
                <Bone className="h-4 w-20 sm:w-28 rounded bg-white/35" />
                <Bone className="h-5 w-24 sm:w-32 rounded-full bg-white/25" />
              </div>
            </div>
            <Bone className="h-11 min-w-0 flex-1 rounded-full bg-white/85" />
            <Bone className="h-11 w-11 shrink-0 rounded-full bg-white/85" />
          </div>

          {/* Tagline */}
          <div className="relative z-[9] mt-4 sm:mt-5 pl-4 sm:pl-5 max-w-[min(92vw,540px)]">
            <Bone className="h-10 sm:h-12 w-[min(320px,88vw)] rounded-lg bg-white/40" />
          </div>

          {/* Shop Now */}
          <div className="relative z-20 mt-5 pl-4 sm:pl-5">
            <Bone className="h-11 w-32 rounded-full bg-white" />
          </div>

          {/* Banner carousel */}
          <div className="relative z-20 mt-6 px-3 sm:px-6 md:px-8 pb-2">
            <Bone className="w-full aspect-[2.4/1] max-h-[200px] rounded-2xl bg-white/35 ring-1 ring-white/25" />
          </div>

          <HeroCategoryCarouselSkeleton />
        </div>
      </Container>
    </section>
  );
}

function FreshZoneSkeleton() {
  return (
    <section className="fresh-zone-minh relative overflow-hidden bg-gray-300 rounded-[32px] mx-3 sm:mx-6 md:mx-8 my-4 sm:my-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-gray-400/80 to-gray-600/90" aria-hidden />
      <Container className="relative z-[2] py-10 sm:py-14 md:py-20 lg:py-24 [@media(max-height:720px)]:py-8">
        <div className="flex flex-col items-center text-center gap-2 mb-6 sm:mb-8 px-3 sm:px-4 md:px-0">
          <Bone className="h-12 md:h-14 w-48 max-w-[80vw] rounded-lg bg-white/25" />
          <Bone className="h-4 w-56 max-w-[90vw] rounded bg-white/20" />
        </div>

        <div className="w-screen relative left-1/2 -translate-x-1/2 mb-6">
          <div className="overflow-x-hidden px-4">
            <div className="flex w-max gap-2 mx-auto">
              <Bone className="h-10 w-14 shrink-0 rounded-full bg-white/25" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="h-10 w-32 shrink-0 rounded-full bg-white/25" />
              ))}
            </div>
          </div>
        </div>

        <ProductCarouselRowSkeleton count={6} gapClass="gap-3" />

        <div className="mt-10 flex justify-center px-4 md:px-0">
          <Bone className="h-4 w-20 rounded bg-white/25" />
        </div>
      </Container>
    </section>
  );
}

function ShopByCategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:gap-4 px-3 sm:px-4 md:px-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[18px] border border-gray-100 bg-white"
        >
          <Bone className="aspect-[4/3] w-full rounded-none" />
          <div className="border-t border-gray-100 bg-white px-3 py-2.5">
            <Bone className="mx-auto h-3.5 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
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
 * Full home page loading state — mirrors loaded home layout (hero → sections → footer).
 */
export default function HomePageSkeleton() {
  return (
    <div
      className="w-full max-w-full overflow-x-hidden min-h-screen bg-white"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading home"
    >
      <HeroSkeleton />

      {/* Daily home sections (shelves / BXGY / events) */}
      <section className="relative z-10 -mt-10 sm:-mt-12 py-6 sm:py-8" aria-label="Loading home sections">
        <div className="mb-4 px-3 sm:px-4 md:px-6">
          <SectionHeading titleWidth={220} subtitleWidth={180} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
        <div className="mt-6 px-3 sm:px-4 md:px-6">
          <SectionHeading titleWidth={180} />
        </div>
        <ProductCarouselRowSkeleton count={6} />
      </section>

      <FreshZoneSkeleton />

      {/* Shop by Category */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-white [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
        <Container>
          <div className="mb-5 sm:mb-6 md:mb-8 px-3 sm:px-4 md:px-0">
            <Bone className="h-10 sm:h-12 md:h-14 w-full max-w-[300px] rounded-lg" />
            <Bone className="mt-2 h-4 w-full max-w-[360px] rounded" />
          </div>
          <ShopByCategoryGridSkeleton />
        </Container>
      </section>

      <FooterSkeleton />
    </div>
  );
}
