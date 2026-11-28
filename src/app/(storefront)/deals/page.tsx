import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferDhamakaPageContent } from "@/components/home/OfferDhamakaPageContent";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { DealsPageSkeleton } from "@/components/ui/skeletons";
import { listHomeShelves } from "@/lib/api/storefront";
import { pickOfferDhamakaShelf } from "@/lib/offer-dhamaka";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Special offers",
  description: "Price drop deals from this shop.",
};

async function DealsBody() {
  const shopId = await getRequestShopId();
  let shelves: Awaited<ReturnType<typeof listHomeShelves>> = [];
  try {
    shelves = await listHomeShelves(shopId);
  } catch {
    shelves = [];
  }

  const shelf = pickOfferDhamakaShelf(shelves);

  return (
    <>
      <OfflineStatusBanner className="relative z-20" />
      <OfferDhamakaPageContent shelf={shelf} backHref="/home" />
    </>
  );
}

/** Shell paints first; shelf streams behind DealsPageSkeleton. */
export default function DealsPage() {
  return (
    <Suspense fallback={<DealsPageSkeleton />}>
      <DealsBody />
    </Suspense>
  );
}
