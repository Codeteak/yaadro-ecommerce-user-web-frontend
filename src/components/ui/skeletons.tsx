import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";

/** ProductCard-shaped placeholder (photo + title + price row). */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[20px] bg-white ring-1 ring-black/[0.06]",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="aspect-square w-full rounded-t-[20px] bg-mint/40" />
      <div className="px-3 pt-1.5">
        <Skeleton className="h-8 w-[88%] bg-mint/45" />
        <Skeleton className="mt-0.5 h-[14px] w-14 bg-mint/35" />
      </div>
      <div className="mt-auto flex min-h-5 items-end justify-between gap-2 px-3 pt-0.5 pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-14 bg-mint/50" />
          <Skeleton className="h-3 w-10 bg-mint/30" />
        </div>
        <Skeleton className="h-11 w-11 rounded-[0.9rem] bg-mint/55" />
      </div>
    </div>
  );
}

/** 2-col product grid (home shelves / hub popular / PLP). */
export function ProductGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="min-w-0">
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** Horizontal product rail (home ProductSection / produce band). */
export function ProductRailSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-hidden px-0.5 py-2",
        className,
      )}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0")}>
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Home section: heading + 2-col shelf. */
export function HomeShelfSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("mx-auto w-full max-w-lg px-5", className)} aria-hidden>
      <Skeleton className="h-6 w-44 bg-mint/55" />
      <Skeleton className="mt-2 h-3 w-36 bg-mint/35" />
      <ProductGridSkeleton count={4} className="mt-4" />
    </section>
  );
}

/**
 * Home hero Suspense fallback — mint chrome + avatar/name/search bones.
 * No shop name text (never flash “Yaadro” / default brand on resolve).
 * Reserves the offer-banner slot (aspect 2.2/1 + dots) so shops with
 * creatives do not expand the hero when SEO resolves (main CLS source).
 * Shops without banners may see a short collapse once — rarer than promo shops.
 */
export function HomeHeroSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("relative", className)}
      aria-busy
      aria-label="Loading shop"
    >
      <div className="relative overflow-hidden bg-gradient-to-b from-mint via-[#d4efd4] to-[#b8e6b8]">
        <div
          className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full border-[1.25rem] border-white/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-24 right-[38%] h-20 w-20 rounded-full bg-white/20"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -bottom-24 h-56 w-56 rounded-full border-[1.5rem] border-leaf/10"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-lg px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <header className="flex items-start justify-between gap-3 pt-2" aria-hidden>
            <div className="flex min-w-0 items-start gap-2.5">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full bg-white/80 ring-2 ring-white/80" />
              <div className="min-w-0 pt-0.5">
                <Skeleton className="h-4 w-28 rounded-md bg-white/75" />
                <Skeleton className="mt-2 h-3 w-20 rounded-md bg-white/55" />
                <Skeleton className="mt-1 h-3.5 w-36 max-w-full rounded-md bg-white/50" />
              </div>
            </div>
            {/* Matches AccountLink reserved slot (Sign in / profile icon). */}
            <Skeleton className="h-11 w-[5.75rem] shrink-0 rounded-full bg-track/35" />
          </header>
          <Skeleton className="mt-4 h-14 w-full rounded-full bg-white/70" />
        </div>

        {/* Match HomeHeroView banner wrapper + OfferBanners chrome */}
        <div className="relative mt-4 pb-3" aria-hidden>
          <HomeBannerSkeleton />
        </div>

        <svg
          className="absolute inset-x-0 bottom-0 h-[36px] w-full text-paper"
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 10 C 360 36, 1080 36, 1440 10 L1440 40 L0 40 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

/** Offer banner strip — matches OfferBanners chrome (px-5 pt-4 + aspect + dots). */
export function HomeBannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-lg px-5 pt-4", className)}
      aria-hidden
    >
      <Skeleton className="aspect-[2.2/1] w-full rounded-[1.5rem] bg-mint/40" />
      <div className="mt-3 flex justify-center gap-1.5">
        <Skeleton className="h-2 w-6 rounded-full bg-mint/50" />
        <Skeleton className="h-2 w-2 rounded-full bg-mint/35" />
        <Skeleton className="h-2 w-2 rounded-full bg-mint/35" />
      </div>
    </div>
  );
}

/**
 * Home pill category rail Suspense fallback — tall capsules, not a flat bar
 * (old h-16 fallback caused a large CLS when the real rail painted).
 */
export function CategoryRailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative mx-auto w-full max-w-lg overflow-hidden", className)}
      aria-hidden
    >
      <div className="flex w-max gap-2.5 px-5 py-3 sm:gap-3.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex w-[4.75rem] shrink-0 flex-col items-center sm:w-[5.25rem]"
          >
            {/* ~live pill: icon + 2-line label + padding */}
            <Skeleton className="h-[5.85rem] w-full rounded-[1.85rem] bg-mint/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Home catalog Suspense fallback — two product rails (All often >10 items),
 * produce card height + shelf so Fruits & veggies / dense rails do not expand
 * a short placeholder into the viewport (CLS).
 */
export function HomeCatalogSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 pt-6", className)} aria-hidden>
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-end justify-between gap-3 px-5">
          <Skeleton className="h-5 w-36 bg-mint/50" />
          <Skeleton className="h-3 w-16 bg-mint/30" />
        </div>
        <ProductRailSkeleton className="mt-2" />
        <ProductRailSkeleton />
      </div>

      <div className="px-3 py-5 sm:px-4">
        <Skeleton className="mx-auto min-h-[34rem] w-full max-w-lg rounded-[1.75rem] bg-mint/35 sm:min-h-[36rem]" />
      </div>

      <HomeShelfSkeleton />
    </div>
  );
}

/**
 * Categories browser Suspense fallback: search pill + horizontal pill rail
 * + product grid (matches live `/categories` horizontal chrome).
 */
export function CategoriesHubSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col bg-paper", className)} aria-hidden>
      <div className="border-b border-black/[0.05] px-5 pt-3 pb-0">
        <Skeleton className="h-11 w-28 bg-mint/45" />
        <Skeleton className="mt-3 h-14 w-full rounded-full bg-mint/50" />
        <div className="mt-3 flex gap-3 overflow-hidden py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5"
            >
              <Skeleton className="h-[5.5rem] w-full rounded-[1.85rem] bg-mint/40" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        <div className="mb-3 flex justify-between">
          <Skeleton className="h-5 w-16 bg-mint/45" />
          <Skeleton className="h-3 w-16 bg-mint/30" />
        </div>
        <ProductGridSkeleton count={4} className="gap-3.5" />
      </div>
    </div>
  );
}

/**
 * Category PLP Suspense fallback: title + search + horizontal pill rail
 * + product grid (matches live `/categories/[slug]` horizontal chrome).
 */
export function CategoryPlpSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-[28rem] flex-col bg-paper", className)}
      aria-hidden
    >
      <div className="border-b border-black/[0.05] pt-3">
        <div className="px-5">
          <div className="relative flex h-11 items-center">
            <Skeleton className="h-11 w-11 rounded-[13px] bg-mint/70" />
            <Skeleton className="absolute left-1/2 h-5 w-36 -translate-x-1/2 bg-mint/50" />
          </div>
          <Skeleton className="mt-1 h-14 w-full rounded-full bg-mint/50" />
        </div>
        <div className="mt-1 flex gap-3 overflow-hidden px-5 py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5"
            >
              <Skeleton className="h-[5.5rem] w-full rounded-[1.85rem] bg-mint/40" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        <div className="mb-3 flex justify-between">
          <Skeleton className="h-4 w-20 bg-mint/45" />
          <Skeleton className="h-3 w-14 bg-mint/30" />
        </div>
        <ProductGridSkeleton count={4} className="gap-3.5" />
      </div>
    </div>
  );
}

/** Product detail: gallery + title + CTA. */
export function ProductDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-paper px-5 pb-8", className)} aria-hidden>
      <div className="flex h-11 items-center">
        <Skeleton className="h-11 w-11 rounded-[13px] bg-mint/70" />
      </div>
      <Skeleton className="mx-auto mt-2 aspect-square w-full max-w-md rounded-[2rem] bg-mint/50" />
      <Skeleton className="mt-5 h-7 w-2/3 bg-mint/55" />
      <Skeleton className="mt-2 h-4 w-20 bg-mint/35" />
      <Skeleton className="mt-3 h-8 w-28 bg-mint/50" />
      <Skeleton className="mt-4 h-16 w-full rounded-xl bg-mint/35" />
      <Skeleton className="mt-6 h-12 w-full rounded-2xl bg-track/25" />
    </div>
  );
}

/** Generic storefront page shell (matches app/(storefront)/loading.tsx shape). */
export function StorefrontPageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 bg-paper px-5 pt-16",
        className,
      )}
      aria-busy
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-40 rounded-full bg-mint/70" />
      <Skeleton className="h-36 rounded-[1.75rem] bg-mint/50" />
      <ProductGridSkeleton count={2} />
    </div>
  );
}

/** Order detail Suspense fallback. */
export function OrderDetailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5",
        className,
      )}
      aria-busy
      aria-label="Loading order"
    >
      <div className="pt-[max(1rem,env(safe-area-inset-top))]">
        <Skeleton className="h-11 w-11 rounded-[13px] bg-mint/70" />
      </div>
      <Skeleton className="mt-4 h-6 w-40 bg-mint/50" />
      <Skeleton className="mt-6 h-28 w-full rounded-2xl bg-mint/40" />
      <Skeleton className="mt-4 h-40 w-full rounded-2xl bg-mint/30" />
    </div>
  );
}

/**
 * Profile mint hero avatar + name bones.
 * White/leaf wash so pulse reads on the mint gradient (not mint-on-mint).
 */
export function ProfileHeroSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center text-center", className)}
      aria-hidden
    >
      <Skeleton className="size-28 rounded-full bg-white/80 ring-1 ring-leaf/20" />
      <Skeleton className="mt-4 h-7 w-44 rounded-lg bg-white/75" />
      <Skeleton className="mt-2 h-4 w-56 max-w-[260px] rounded-md bg-white/55" />
    </div>
  );
}

/** Profile account rows (My Profile / Address / Help + Log out). */
export function ProfileNavSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-5 mt-6 flex flex-col gap-3", className)}
      aria-hidden
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton
          key={i}
          className="h-14 w-full rounded-2xl bg-white shadow-[0_4px_14px_rgba(47,107,47,0.05)] ring-1 ring-black/5"
        />
      ))}
    </div>
  );
}

/** Full `/profile` Suspense / auth-restore fallback. */
export function ProfilePageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper",
        className,
      )}
      aria-busy
      aria-label="Loading profile"
    >
      <section className="relative rounded-b-[2.5rem] bg-gradient-to-b from-mint via-[#eef6ee] to-paper">
        <div className="relative px-5 pb-16">
          <div className="pt-[max(0.5rem,env(safe-area-inset-top))]">
            <Skeleton className="h-11 w-11 rounded-[13px] bg-white/80" />
          </div>
          <div className="relative mt-5">
            <ProfileHeroSkeleton />
          </div>
        </div>
      </section>
      <div className="relative z-10 mx-4 -mt-12 grid grid-cols-3 gap-2 px-1 pt-3 pb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            key={i}
            className="h-[7.5rem] rounded-[1.75rem] bg-white ring-1 ring-leaf/20"
          />
        ))}
      </div>
      <ProfileNavSkeleton />
    </div>
  );
}
