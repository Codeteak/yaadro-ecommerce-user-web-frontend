/** Shared skeleton building blocks — match real page chrome and grids. */

export function Bone({ className = '', style }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`.trim()}
      style={style}
    />
  );
}

const GRID_CLASS = {
  home: 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8 gap-1 sm:gap-3 lg:gap-4',
  browse: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  products: 'grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4',
};

export function ProductGridSkeleton({
  count = 8,
  variant = 'browse',
  cardVariant = 'default',
  className = '',
  paddingClass = '',
}) {
  const gridCls = GRID_CLASS[variant] || GRID_CLASS.browse;
  const aspect = cardVariant === 'flat' ? 'aspect-square' : 'aspect-[4/5]';
  const wrapPad = paddingClass || (variant === 'home' ? 'px-3 sm:px-4 md:px-0' : '');

  return (
    <div className={`${gridCls} w-full max-w-full overflow-x-hidden ${wrapPad} ${className}`.trim()}>
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

export function ProductCarouselRowSkeleton({ count = 6, gapClass = 'gap-2' }) {
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

export function DiscoverSectionSkeleton({ light = false }) {
  const titleCls = light ? 'bg-white/30' : 'bg-gray-200';
  const subCls = light ? 'bg-white/20' : 'bg-gray-200';
  return (
    <section className="space-y-4">
      <div className="px-4 md:px-0">
        <Bone className={`h-9 sm:h-10 w-full max-w-[240px] rounded-lg ${titleCls}`} />
        <Bone className={`mt-2 h-4 w-full max-w-[300px] rounded ${subCls}`} />
      </div>
      <ProductCarouselRowSkeleton count={6} />
    </section>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-gray-100 bg-white animate-pulse">
      <div className="relative min-h-[168px] bg-gray-200">
        <Bone className="absolute left-3.5 top-3.5 h-4 w-[70%] rounded-md bg-gray-300/80" />
      </div>
    </div>
  );
}

export function PageTopBarSkeleton({ titleWidth = 100 }) {
  return (
    <div className="w-full bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 min-h-[3rem] items-center justify-between sm:h-14 sm:min-h-0">
          <Bone className="h-10 w-10 rounded-xl" />
          <Bone className="h-5 rounded" style={{ width: titleWidth }} />
          <div className="w-10" />
        </div>
      </div>
    </div>
  );
}

export function StickyHeaderSkeleton({ centerTitle = true, showSearch = false }) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Bone className="h-9 w-9 shrink-0 rounded-full" />
        {centerTitle ? (
          <Bone className="mx-auto h-5 flex-1 max-w-[140px] rounded" />
        ) : (
          <Bone className="h-5 flex-1 rounded" />
        )}
        {showSearch ? (
          <>
            <Bone className="h-9 w-9 shrink-0 rounded-full" />
            <Bone className="h-9 w-9 shrink-0 rounded-full" />
          </>
        ) : (
          <Bone className="h-9 w-9 shrink-0 rounded-full" />
        )}
      </div>
    </div>
  );
}

export function SearchPageHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-screen-xl px-4 py-3 md:px-0">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 shrink-0 rounded-full" />
          <Bone className="h-11 flex-1 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CartLineSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 animate-pulse">
      <Bone className="h-[72px] w-[72px] shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Bone className="h-4 w-[85%] rounded" />
        <Bone className="h-3 w-20 rounded" />
        <div className="flex items-center justify-between gap-2 pt-1">
          <Bone className="h-6 w-16 rounded-md" />
          <Bone className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CartTopBarSkeleton() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5">
      <Bone className="h-9 w-9 shrink-0 rounded-full" />
      <Bone className="h-5 w-24 rounded" />
      <Bone className="ml-auto h-3 w-14 rounded" />
    </div>
  );
}

export function OrderListCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm animate-pulse">
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Bone className="h-5 w-32 rounded" />
          <Bone className="h-5 w-16 rounded" />
        </div>
        <Bone className="mb-3 h-3.5 w-48 rounded" />
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-3 w-14 rounded" />
          </div>
          <div className="flex items-start gap-3">
            <div className="flex min-w-[76px]">
              {[0, 1, 2].map((i) => (
                <Bone
                  key={i}
                  className="h-10 w-10 rounded-lg border-2 border-white"
                  style={{ marginLeft: i === 0 ? 0 : -10 }}
                />
              ))}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-3 w-full rounded" />
              <Bone className="h-3 w-4/5 rounded" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Bone className="h-14 flex-1 rounded-xl" />
          <Bone className="h-11 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function AddressCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
      <div className="flex gap-3">
        <Bone className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-4 w-24 rounded" />
          <Bone className="h-3.5 w-full rounded" />
          <Bone className="h-3.5 w-4/5 rounded" />
          <Bone className="h-3 w-28 rounded" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Bone className="h-9 w-9 rounded-lg" />
          <Bone className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutStepBarSkeleton() {
  return (
    <div className="flex items-center border-b border-gray-100 bg-white px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-1.5">
            <Bone className="h-[22px] w-[22px] rounded-full" />
            <Bone className="h-3 w-12 rounded" />
          </div>
          {i < 2 ? <Bone className="mx-2 h-px flex-1 rounded-none" /> : null}
        </div>
      ))}
    </div>
  );
}

export function CategoryRailSkeleton({ count = 6 }) {
  return (
    <aside className="w-[76px] shrink-0 border-r border-gray-200 bg-white py-2 sm:w-[80px]">
      <div className="space-y-2 px-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 px-1 py-2">
            <Bone className="h-12 w-12 rounded-lg" />
            <Bone className="h-2 w-10 rounded" />
          </div>
        ))}
      </div>
    </aside>
  );
}

export function FilterPillsRowSkeleton() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Bone className="h-9 w-9 shrink-0 rounded-full" />
      <Bone className="h-9 min-w-0 flex-1 max-w-[140px] rounded-full" />
      <Bone className="h-9 min-w-0 flex-1 max-w-[140px] rounded-full" />
    </div>
  );
}
