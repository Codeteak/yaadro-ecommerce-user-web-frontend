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
  const shelves = await listHomeShelves(shopId);
  const shelf = pickDairyShelf(shelves);

  return <DailyDairyPageContent shelf={shelf} backHref="/home" />;
}
