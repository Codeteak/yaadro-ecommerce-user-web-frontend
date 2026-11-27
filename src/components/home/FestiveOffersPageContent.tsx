import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PrefetchStorefrontRoute } from "@/components/navigation/PrefetchStorefrontRoute";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  FESTIVE_SECTION_BG,
  SAMPLE_FESTIVE_SHELF,
  type FestiveShelf,
} from "@/lib/festive-offers";

/**
 * Festive See-all page — blurred festive art pinned as the page background
 * (sticky, does not move with product scroll). Soft wash + normal ProductCard grid.
 * Live `/festive` hides BottomNav; SSR marker collapses shell footer; instant back.
 */
export function FestiveOffersPageContent({
  shelf = SAMPLE_FESTIVE_SHELF,
  backHref = "/home",
  className,
}: {
  shelf?: FestiveShelf | null;
  backHref?: string;
  className?: string;
}) {
  const title = shelf?.title?.trim() || "Festive offers";
  const products = shelf?.products ?? [];

  return (
    <main
      className={cn("relative isolate mx-auto w-full max-w-lg", className)}
    >
      {/* SSR-safe: collapse StorefrontChrome footer before client pathname chrome. */}
      <span data-storefront-hide-nav hidden />
      <PrefetchStorefrontRoute href={backHref} />
      {/* Sticky pin: background stays in the scrollport while content moves */}
      <div className="sticky top-0 z-0 h-0 overflow-visible" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[100dvh] w-full overflow-hidden">
          <Image
            src={FESTIVE_SECTION_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="scale-110 object-cover object-center blur-lg"
          />
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 bg-[#f5e6c8]/25" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="sticky top-0 z-20 border-b border-[#e0c98a]/50 bg-[#f5e6c8]/85 px-5 backdrop-blur-sm">
          <PageHeader
            surface="hero"
            backHref={backHref}
            title={title}
            instantBack
            sticky={false}
          />
          <p className="pb-4 text-center text-[13px] font-semibold text-forest/80">
            Season&apos;s picks · all offers
          </p>
        </div>

        {!shelf || products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
            <h2 className="text-xl font-extrabold text-forest">
              No festive offers right now
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-forest/70">
              This shop hasn&apos;t added festive products yet. Check back soon.
            </p>
            <Link
              href={backHref}
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Back
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
