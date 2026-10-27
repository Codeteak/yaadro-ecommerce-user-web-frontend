/**
 * Heading / spacing tokens for storefront surfaces.
 * `legacy` = current ecom. `spec` = playground preview of the design scale
 * (wire to storefront when approved).
 *
 * Sizes (mobile → desktop where stepped):
 * - Home section: 20–22 / 24–28, weight 600–700
 * - Home compact: 18–20 / 20–24, weight 600
 * - PLP title: 22–26 / 28–32, weight 700
 * - Category grid / search: 20–22 / 22–26, weight 600–700
 * - Sidebar filter: 16, weight 600
 * - Product card name: 13–15 / 14–16, weight 500–600
 */

export type TypeScaleId = "legacy" | "spec";

export type TypeScaleTokens = {
  homeSectionHeading: string;
  homeSectionSubtitle: string;
  homeSectionHeaderWrap: string;
  homeSectionToGrid: string;
  homeShelvesStack: string;
  homeBlockGap: string;
  homeCompactHeading: string;
  homeCompactSubtitle: string;
  homeShowAllGap: string;
  plpPageTitle: string;
  plpFilterHeading: string;
  plpFilterHeaderWrap: string;
  plpGridGap: string;
  categoryGridHeading: string;
  categoryGridSubtitle: string;
  categoryGridHeaderWrap: string;
  categorySectionGap: string;
  searchResultsHeading: string;
  searchResultsSubtitle: string;
  searchResultsToGrid: string;
  productCardName: string;
};

export const TYPE_SCALE: Record<TypeScaleId, TypeScaleTokens> = {
  legacy: {
    homeSectionHeading: "text-lg font-extrabold tracking-tight text-ink",
    homeSectionSubtitle: "mt-0.5 text-[12px] font-medium text-muted",
    homeSectionHeaderWrap: "mb-3",
    homeSectionToGrid: "mt-3",
    homeShelvesStack: "flex flex-col gap-8 pb-2 pt-2",
    homeBlockGap: "mt-2",
    homeCompactHeading: "truncate text-[15px] font-extrabold text-white drop-shadow-sm",
    homeCompactSubtitle: "mt-0.5 text-[12px] font-semibold text-white/80",
    homeShowAllGap: "gap-3",
    plpPageTitle:
      "absolute left-1/2 max-w-[58%] -translate-x-1/2 truncate text-center text-lg font-bold tracking-tight text-forest",
    plpFilterHeading: "text-[12px] font-extrabold text-ink",
    plpFilterHeaderWrap: "mb-2 flex items-baseline justify-between gap-2 px-0.5",
    plpGridGap: "grid grid-cols-2 gap-2",
    categoryGridHeading: "text-lg font-bold tracking-tight text-black",
    categoryGridSubtitle: "mt-0.5 text-[12px] leading-4 font-medium text-muted",
    categoryGridHeaderWrap: "mb-2.5",
    categorySectionGap: "mt-5 first:mt-3",
    searchResultsHeading: "text-lg font-bold tracking-tight text-black",
    searchResultsSubtitle: "mt-0.5 text-[12px] leading-4 font-medium text-muted",
    searchResultsToGrid: "mt-3",
    productCardName:
      "mt-3 line-clamp-2 min-h-10 text-[15px] leading-5 font-bold text-ink",
  },
  spec: {
    homeSectionHeading:
      "text-[1.25rem] leading-tight font-semibold tracking-tight text-ink sm:text-[1.625rem] sm:font-bold",
    homeSectionSubtitle: "mt-1.5 text-[12px] font-medium text-muted",
    homeSectionHeaderWrap: "mb-4",
    homeSectionToGrid: "mt-4",
    homeShelvesStack: "flex flex-col gap-10 pb-2 pt-2",
    homeBlockGap: "mt-8",
    homeCompactHeading:
      "truncate text-[1.125rem] font-semibold leading-tight text-white drop-shadow-sm sm:text-xl",
    homeCompactSubtitle: "mt-1 text-[12px] font-semibold text-white/80",
    homeShowAllGap: "gap-4",
    plpPageTitle:
      "absolute left-1/2 max-w-[58%] -translate-x-1/2 truncate text-center text-[1.375rem] font-bold tracking-tight text-forest sm:text-[1.875rem]",
    plpFilterHeading: "text-base font-semibold text-ink",
    plpFilterHeaderWrap: "mb-4 flex items-baseline justify-between gap-2 px-0.5",
    plpGridGap: "grid grid-cols-2 gap-4",
    categoryGridHeading:
      "text-xl font-semibold tracking-tight text-black sm:text-[1.375rem] sm:font-bold",
    categoryGridSubtitle: "mt-1.5 text-[12px] leading-4 font-medium text-muted",
    categoryGridHeaderWrap: "mb-4",
    categorySectionGap: "mt-8 first:mt-4",
    searchResultsHeading:
      "text-xl font-semibold tracking-tight text-black sm:text-2xl sm:font-bold",
    searchResultsSubtitle: "mt-1.5 text-[12px] leading-4 font-medium text-muted",
    searchResultsToGrid: "mt-4",
    /* Keep card name at legacy weight/size — only headings/spacing use spec. */
    productCardName:
      "mt-3 line-clamp-2 min-h-10 text-[15px] leading-5 font-bold text-ink",
  },
};
