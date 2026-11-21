import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  DAILY_DAIRY_SECTION_BG,
  SAMPLE_DAIRY_SHELF,
  type DairyShelf,
} from "@/lib/daily-dairy";

/**
 * Daily dairy See-all — clear (unblurred) dairy art pinned as page background.
 * Black type on the yellow field (same as section card). Used on /dairy + playground.
 */
export function DailyDairyPageContent({
  shelf = SAMPLE_DAIRY_SHELF,
  backHref = "/home",
  className,
}: {
  shelf?: DairyShelf | null;
  backHref?: string;
  className?: string;
}) {
  const title = shelf?.title?.trim() || "Daily dairy";
  const products = shelf?.products ?? [];

  return (
    <main
      className={cn("relative isolate mx-auto w-full max-w-lg", className)}
    >
      <div className="sticky top-0 z-0 h-0 overflow-visible" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[100dvh] w-full overflow-hidden bg-[#F5C400]">
          <Image
            src={DAILY_DAIRY_SECTION_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-cover object-top"
          />
        </div>
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="border-b border-black/10 px-5">
          <PageHeader surface="hero" backHref={backHref} title={title} />
          <p className="pb-4 text-center text-[13px] font-semibold text-black/75">
            Fresh every morning · all picks
          </p>
        </div>

        {!shelf || products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
            <h2 className="text-xl font-extrabold text-black">
              No dairy products right now
            </h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-black/70">
              This shop hasn&apos;t added dairy products yet. Check back soon.
            </p>
            <Link
              href={backHref}
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Back
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 px-5 pt-5 pb-10">
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
