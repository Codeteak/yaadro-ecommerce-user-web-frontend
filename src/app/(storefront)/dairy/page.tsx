import type { Metadata } from "next";
import { DailyDairyPageContent } from "@/components/home/DailyDairyPageContent";
import { listHomeShelves } from "@/lib/api/storefront";
import { pickDairyShelf } from "@/lib/daily-dairy";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Daily dairy",
  description: "Milk, eggs, and breakfast essentials from this shop.",
};

export default async function DailyDairyPage() {
  const shopId = await getRequestShopId();
  let shelves: Awaited<ReturnType<typeof listHomeShelves>> = [];
  try {
    shelves = await listHomeShelves(shopId);
  } catch {
    shelves = [];
  }
  const shelf = pickDairyShelf(shelves);

  return <DailyDairyPageContent shelf={shelf} backHref="/home" />;
}
