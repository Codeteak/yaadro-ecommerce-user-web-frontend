import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";

/** ProductCard-shaped placeholder (photo + title + price row). */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[1.5rem] bg-white p-2.5 ring-1 ring-black/[0.06]",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-mint/40" />
      <Skeleton className="mt-3 h-4 w-[88%] bg-mint/45" />
      <Skeleton className="mt-2 h-3 w-16 bg-mint/35" />
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-14 bg-mint/50" />
          <Skeleton className="h-3 w-10 bg-mint/30" />
        </div>
        <Skeleton className="h-10 w-10 rounded-[0.9rem] bg-mint/55" />
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

/** Categories hub: search pill + section title + tile grid. */
export function CategoriesHubSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full bg-paper px-3 sm:px-4", className)} aria-hidden>
      <Skeleton className="h-14 w-full rounded-full bg-mint/50" />
      <Skeleton className="mt-6 h-5 w-28 bg-mint/45" />
      <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className={i === 0 ? "col-span-2" : "col-span-1"}>
            <Skeleton
              className={cn(
                "w-full rounded-[1.15rem] bg-mint/35",
                i === 0 ? "h-[6.25rem]" : "aspect-square",
              )}
            />
            <Skeleton className="mx-auto mt-1.5 h-3 w-[80%] bg-mint/30" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Category PLP: header + filter chips + rail + grid. */
export function CategoryPlpSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-[28rem] flex-col bg-paper", className)}
      aria-hidden
    >
      <div className="border-b border-black/[0.05] px-4 pt-3 pb-2.5">
        <div className="relative flex h-11 items-center">
          <Skeleton className="h-11 w-11 rounded-[13px] bg-mint/70" />
          <Skeleton className="absolute left-1/2 h-5 w-36 -translate-x-1/2 bg-mint/50" />
        </div>
        <div className="mt-2.5 flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full bg-mint/45" />
          <Skeleton className="h-9 w-20 rounded-full bg-mint/35" />
          <Skeleton className="h-9 w-16 rounded-full bg-mint/30" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[4.75rem] shrink-0 flex-col gap-3 border-r border-black/[0.04] bg-white px-1.5 py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-12 w-12 rounded-full bg-mint/40" />
              <Skeleton className="h-2.5 w-10 bg-mint/30" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 px-2 py-2.5">
          <div className="mb-4 flex justify-between px-0.5">
            <Skeleton className="h-4 w-20 bg-mint/45" />
            <Skeleton className="h-3 w-14 bg-mint/30" />
          </div>
          <ProductGridSkeleton count={4} className="gap-4" />
        </div>
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
      <Skeleton className="mx-auto mt-2 aspect-[4/3] w-full max-w-md rounded-[2rem] bg-mint/50" />
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
