import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PrefetchStorefrontRoute } from "@/components/navigation/PrefetchStorefrontRoute";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  OFFER_DHAMAKA_BG,
  SAMPLE_OFFER_DHAMAKA,
  offerDhamakaCountLabel,
  type OfferDhamakaShelf,
} from "@/lib/offer-dhamaka";

/**
 * Offer Dhamaka See-all — purple art pinned as page background.
 * Used on `/deals` + playground. No extra marketing header text over the
 * creative on the home card; this page uses a normal PageHeader title.
 */
export function OfferDhamakaPageContent({
  shelf = SAMPLE_OFFER_DHAMAKA,
  backHref = "/home",
  className,
}: {
  shelf?: OfferDhamakaShelf | null;
  backHref?: string;
  className?: string;
}) {
  const title = shelf?.title?.trim() || "Special offers";
  const products = shelf?.products ?? [];
  const count = products.length;

  return (
    <main
      className={cn(
        "relative isolate mx-auto w-full max-w-lg overflow-x-clip",
        className,
      )}
    >
      {/* SSR-safe: collapse StorefrontChrome footer before client pathname chrome. */}
      <span data-storefront-hide-nav hidden />
      <PrefetchStorefrontRoute href={backHref} />
      <div className="sticky top-0 z-0 h-0 overflow-visible" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[100dvh] w-full overflow-hidden bg-[#7b2fd0]">
          <Image
            src={OFFER_DHAMAKA_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="scale-110 object-cover object-center blur-lg"
          />
          <div className="absolute inset-0 bg-[#5a1a9e]/35" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Solid sticky (no blur) — same scroll-jank fix as categories hub. */}
        <div className="sticky top-0 z-20 border-b border-white/15 bg-[#6a24b8] px-5">
          <PageHeader
            surface="hero"
            backHref={backHref}
            instantBack
            sticky={false}
            center={
              <h1 className="text-lg font-bold tracking-tight whitespace-nowrap text-white">
                {title}
              </h1>
            }
          />
          <p className="pb-4 text-center text-[13px] font-semibold text-white/85">
            {count > 0
              ? `${offerDhamakaCountLabel(count)} · price drop`
              : "Price drop picks"}
          </p>
        </div>

        {!shelf || count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
            <h2 className="text-xl font-extrabold text-white">
              No deals right now
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-white/75">
              This shop hasn&apos;t added special offer products yet. Check back
              soon.
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
