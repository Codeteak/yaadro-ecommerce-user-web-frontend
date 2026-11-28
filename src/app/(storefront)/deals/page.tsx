import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferDhamakaPageContent } from "@/components/home/OfferDhamakaPageContent";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { DealsPageSkeleton } from "@/components/ui/skeletons";

export const metadata: Metadata = {
  title: "Special offers",
  description: "Price drop deals from this shop.",
};

/**
 * Stub See-all route for Offer Dhamaka.
 * Not wired to shop_home_sections — buy-X-get-Y / deals needs a dedicated
 * backend section API. UI lives in playground until then; this page stays
 * empty so live ecom does not invent a shelf from title keywords.
 */
async function DealsBody() {
  return (
    <>
      <OfflineStatusBanner className="relative z-20" />
      <OfferDhamakaPageContent shelf={null} backHref="/home" />
    </>
  );
}

/** Shell paints first; body streams behind DealsPageSkeleton. */
export default function DealsPage() {
  return (
    <Suspense fallback={<DealsPageSkeleton />}>
      <DealsBody />
    </Suspense>
  );
}
