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

/** Matches ProductGrid: grid-cols-3 sm:4 lg:8 */
function ProductGridSkeleton({ count = 8, cardVariant = 'flat' }) {
  const aspect = cardVariant === 'flat' ? 'aspect-square' : 'aspect-[4/5]';
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8 gap-1 sm:gap-3 lg:gap-4 w-full max-w-full overflow-x-hidden px-3 sm:px-4 md:px-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 sm:gap-2">
          <Bone className={`w-full ${aspect} rounded-xl sm:rounded-2xl`} />
          <Bone className="h-2.5 w-full rounded" />
          <Bone className="h-2.5 w-4/5 rounded" />
          <Bone className="h-3.5 w-1/2 rounded mt-0.5" />
        </div>
      ))}
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

function CategoryPillsRowSkeleton({ count = 6 }) {
  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 mb-5">
      <div className="overflow-x-hidden scrollbar-hide pb-1">
        <div className="flex w-max gap-2 px-4 mx-auto">
          <Bone className="h-10 w-14 shrink-0 rounded-full" />
          {Array.from({ length: count }).map((_, i) => (
            <Bone key={i} className="h-10 w-28 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroCategoryCarouselSkeleton() {
  return (
    <div className="relative inset-x-0 z-20 mt-11 sm:mt-12 pt-2 pb-2 px-4">
      <div className="flex items-stretch gap-4 overflow-hidden pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-2">
            <Bone className="h-20 w-20 rounded-2xl sm:h-24 sm:w-24" />
            <Bone className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <section
      className="home-hero-minh w-full relative overflow-hidden"
      style={{
        background: '#ffffff',
        borderBottomLeftRadius: 44,
        borderBottomRightRadius: 44,
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-52 sm:h-64"
        style={{
          background: 'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))',
        }}
        aria-hidden
      />

      {/* Shop branding card — top left */}
      <div className="absolute left-0 top-5 sm:top-6 md:top-8 z-30 flex items-start gap-3.5 rounded-r-3xl bg-white/95 pl-4 pr-5 py-3 ring-1 ring-gray-100">
        <Bone className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex flex-col gap-2 min-w-[120px]">
          <Bone className="h-4 w-28 rounded" />
          <Bone className="h-6 w-32 rounded-full" />
        </div>
      </div>

      <Container className="px-0 sm:px-0 lg:px-0 xl:px-0 2xl:px-0">
        <div className="relative flex flex-col pt-5 pb-8 sm:pt-6 md:pt-8 sm:pb-10 overflow-hidden">
          {/* Search + profile */}
          <div className="relative z-20 flex items-center justify-end gap-2 pr-3 sm:pr-4 min-h-[52px]">
            <Bone className="h-11 w-11 rounded-full" />
            <Bone className="h-11 w-11 rounded-full" />
          </div>

          {/* Tagline */}
          <div className="relative z-[9] mt-8 sm:mt-6 pl-4 sm:pl-5 max-w-[min(92vw,540px)]">
            <Bone className="h-10 sm:h-12 w-[min(320px,88vw)] rounded-lg" />
          </div>

          {/* Shop Now */}
          <div className="relative z-20 mt-5 pl-4 sm:pl-5">
            <Bone className="h-11 w-32 rounded-full" />
          </div>

          {/* Banner carousel */}
          <div className="relative z-20 mt-6 px-3 sm:px-6 md:px-8 pb-2">
            <Bone className="w-full aspect-[2.4/1] max-h-[200px] rounded-2xl ring-1 ring-gray-100" />
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

      {/* Best Sellers */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
        <Container>
          <div className="mb-4 md:mb-6">
            <SectionHeading titleWidth={280} subtitleWidth={320} />
          </div>
          <ProductGridSkeleton count={8} cardVariant="flat" />
          <div className="mt-8 flex justify-center px-4 md:px-0">
            <Bone className="h-4 w-20 rounded" />
          </div>
        </Container>
      </section>

      <FreshZoneSkeleton />

      {/* Featured Products */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
        <Container>
          <div className="mb-4 md:mb-6">
            <SectionHeading titleWidth={220} showMore />
          </div>
          <ProductGridSkeleton count={8} cardVariant="flat" />
        </Container>
      </section>

      {/* Buy Again */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-white [@media(max-height:720px)]:py-5 [@media(max-height:720px)]:sm:py-6">
        <Container>
          <div className="mb-4 md:mb-6 px-3 sm:px-4 md:px-0">
            <Bone className="h-10 sm:h-12 md:h-14 w-full max-w-[280px] rounded-lg" />
            <Bone className="mt-2 h-4 w-full max-w-[340px] rounded" />
          </div>
          <CategoryPillsRowSkeleton count={6} />
          <ProductCarouselRowSkeleton count={6} />
          <div className="mt-3">
            <ProductCarouselRowSkeleton count={6} />
          </div>
          <div className="mt-6 flex justify-center px-4 md:px-0">
            <Bone className="h-4 w-20 rounded" />
          </div>
        </Container>
      </section>

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
