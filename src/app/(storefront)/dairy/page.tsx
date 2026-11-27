import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyDairyPageContent } from "@/components/home/DailyDairyPageContent";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { DairyPageSkeleton } from "@/components/ui/skeletons";
import { listHomeShelves } from "@/lib/api/storefront";
import { pickDairyShelf } from "@/lib/daily-dairy";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Daily dairy",
  description: "Milk, eggs, and breakfast essentials from this shop.",
};

async function DailyDairyBody() {
  const shopId = await getRequestShopId();
  let shelves: Awaited<ReturnType<typeof listHomeShelves>> = [];
  try {
    shelves = await listHomeShelves(shopId);
  } catch {
    shelves = [];
  }
  const shelf = pickDairyShelf(shelves);

  return (
    <>
      <OfflineStatusBanner className="relative z-20" />
      <DailyDairyPageContent shelf={shelf} backHref="/home" />
    </>
  );
}

/** Shell paints first; shelf streams behind DairyPageSkeleton. */
export default function DailyDairyPage() {
  return (
    <Suspense fallback={<DairyPageSkeleton />}>
      <DailyDairyBody />
    </Suspense>
  );
}
