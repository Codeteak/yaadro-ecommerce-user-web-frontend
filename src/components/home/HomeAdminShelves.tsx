"use client";

import { DailyDairySection } from "@/components/home/DailyDairySection";
import { FestiveOffersSection } from "@/components/home/FestiveOffersSection";
import { HomeProductShelf } from "@/components/home/HomeProductShelf";
import type { LiveShelf } from "@/components/home/HomeProductShelves";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { isDairySectionTitle } from "@/lib/daily-dairy";
import { isFestiveSectionTitle } from "@/lib/festive-offers";
import { sortHomeShelvesByOrder } from "@/lib/home-section-order";

/**
 * Renders shop admin home sections in `sort_order`.
 * Dairy titles (incl. “Daily Diary”) → art card; Festive → festive band;
 * everything else → product shelf. Skips empty product lists.
 *
 * Offer Dhamaka is playground-only until a dedicated buy-X-get-Y / deals
 * section API exists — do not match it from shop_home_sections titles.
 */
export function HomeAdminShelves({
  shelves,
  dairyBrowseHref = "/dairy",
  festiveSeeAllHref = "/festive",
}: {
  shelves: LiveShelf[];
  dairyBrowseHref?: string;
  festiveSeeAllHref?: string;
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
        return (
          <div key={shelf.id} className={t.homeBlockGap}>
            <HomeProductShelf shelf={shelf} products={shelf.products} />
          </div>
        );
      })}
    </>
  );
}
