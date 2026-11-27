import type { Metadata } from "next";
import { Suspense } from "react";
import { FestiveOffersPageContent } from "@/components/home/FestiveOffersPageContent";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { FestivePageSkeleton } from "@/components/ui/skeletons";
import { listHomeShelves } from "@/lib/api/storefront";
import { pickFestiveShelf } from "@/lib/festive-offers";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Festive offers",
  description: "Seasonal festive picks from this shop.",
};

async function FestiveOffersBody() {
  const shopId = await getRequestShopId();
  let shelves: Awaited<ReturnType<typeof listHomeShelves>> = [];
  try {
    shelves = await listHomeShelves(shopId);
  } catch {
    shelves = [];
  }
  const shelf = pickFestiveShelf(shelves);

  return (
    <>
      <OfflineStatusBanner className="relative z-20" />
      <FestiveOffersPageContent shelf={shelf} backHref="/home" />
    </>
  );
}

/** Shell paints first; shelf streams behind FestivePageSkeleton. */
export default function FestiveOffersPage() {
  return (
    <Suspense fallback={<FestivePageSkeleton />}>
      <FestiveOffersBody />
    </Suspense>
  );
}
