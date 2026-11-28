"use client";

import { DailyDairySection } from "@/components/home/DailyDairySection";
import { FestiveOffersSection } from "@/components/home/FestiveOffersSection";
import { OfferDhamakaCard } from "@/components/home/OfferDhamakaCard";
import { HomeProductShelf } from "@/components/home/HomeProductShelf";
import type { LiveShelf } from "@/components/home/HomeProductShelves";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { isDairySectionTitle } from "@/lib/daily-dairy";
import { isFestiveSectionTitle } from "@/lib/festive-offers";
import { isOfferDhamakaSectionTitle } from "@/lib/offer-dhamaka";
import { sortHomeShelvesByOrder } from "@/lib/home-section-order";

/**
 * Renders shop admin home sections in `sort_order`.
 * Dairy → art card; Festive → festive band; Offer Dhamaka / price drop →
 * purple Special Offers card; everything else → product shelf.
 * Skips empty product lists.
 */
export function HomeAdminShelves({
  shelves,
  dairyBrowseHref = "/dairy",
  festiveSeeAllHref = "/festive",
  dealsSeeAllHref = "/deals",
}: {
  shelves: LiveShelf[];
  dairyBrowseHref?: string;
  festiveSeeAllHref?: string;
  dealsSeeAllHref?: string;
}) {
  const t = useTypeScale();
  const ordered = sortHomeShelvesByOrder(
    shelves.map((shelf) => ({
      ...shelf,
      sortOrder:
        typeof shelf.sortOrder === "number" && Number.isFinite(shelf.sortOrder)
          ? shelf.sortOrder
          : Number.POSITIVE_INFINITY,
    })),
  );

  return (
    <>
      {ordered.map((shelf) => {
        if (shelf.products.length === 0) return null;
        if (isDairySectionTitle(shelf.title)) {
          return (
            <DailyDairySection
              key={shelf.id}
              className={t.homeBlockGap}
              layout="on-art"
              shelf={shelf}
              browseHref={dairyBrowseHref}
            />
          );
        }
        if (isFestiveSectionTitle(shelf.title)) {
          return (
            <FestiveOffersSection
              key={shelf.id}
              className={t.homeBlockGap}
              shelf={shelf}
              seeAllHref={festiveSeeAllHref}
            />
          );
        }
        if (isOfferDhamakaSectionTitle(shelf.title)) {
          return (
            <OfferDhamakaCard
              key={shelf.id}
              className={t.homeBlockGap}
              shelf={shelf}
              href={dealsSeeAllHref}
            />
          );
        }
        return (
          <div key={shelf.id} className={t.homeBlockGap}>
            <HomeProductShelf shelf={shelf} products={shelf.products} />
          </div>
        );
      })}
    </>
  );
}
