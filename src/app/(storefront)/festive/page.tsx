import type { Metadata } from "next";
import { FestiveOffersPageContent } from "@/components/home/FestiveOffersPageContent";
import { listHomeShelves } from "@/lib/api/storefront";
import { pickFestiveShelf } from "@/lib/festive-offers";
import { getRequestShopId } from "@/lib/request-shop";

export const metadata: Metadata = {
  title: "Festive offers",
  description: "Seasonal festive picks from this shop.",
};

export default async function FestiveOffersPage() {
  const shopId = await getRequestShopId();
  const shelves = await listHomeShelves(shopId);
  const shelf = pickFestiveShelf(shelves);

  return <FestiveOffersPageContent shelf={shelf} backHref="/home" />;
}
