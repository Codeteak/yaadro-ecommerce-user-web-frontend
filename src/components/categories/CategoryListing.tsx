"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  PlpFilterSheets,
  type PlpSheetKind,
} from "@/components/categories/PlpFilterSheets";
import { BackButton } from "@/components/navigation/BackButton";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import { getCatalogCategory } from "@/lib/catalog-taxonomy";
import {
  applyPlpFilters,
  DEFAULT_PLP_FILTERS,
  plpBrand,
  plpType,
  uniqueSorted,
  type PlpFilterState,
} from "@/lib/plp-filters";
import { getProductsByCategory } from "@/lib/sample-products";

export type CategoryListingProps = {
  slug: string;
  className?: string;
  onBack?: () => void;
  backHref?: string;
  onSearchClick?: () => void;
};

/**
 * Category PLP: PageHeader-style chrome (no location), filters, left
 * subcategory rail, 2-col product grid. Sample data until catalog API.
 */
export function CategoryListing({
  slug,
  className,
  onBack,
  backHref = "/categories",
  onSearchClick,
}: CategoryListingProps) {
  const t = useTypeScale();
  const router = useRouter();
  const category = getCatalogCategory(slug);
  const [sub, setSub] = useState("All");
  const [filters, setFilters] = useState<PlpFilterState>(DEFAULT_PLP_FILTERS);
  const [sheet, setSheet] = useState<PlpSheetKind>(null);

  const handleSearch = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    router.push("/categories?focus=search");
  };

  const catalogProducts = useMemo(() => {
    if (!category?.homeCategory) return [];
    return getProductsByCategory(category.homeCategory);
  }, [category]);

  const brandOptions = useMemo(
    () => uniqueSorted(catalogProducts.map(plpBrand)),
    [catalogProducts],
  );
  const typeOptions = useMemo(
    () => uniqueSorted(catalogProducts.map(plpType)),
    [catalogProducts],
  );

  const products = useMemo(
    () => applyPlpFilters(catalogProducts, filters),
    [catalogProducts, filters],
  );

  const facetsActive =
    filters.onOffer ||
    filters.byWeight ||
    filters.bestSeller ||
    filters.brands.length > 0 ||
    filters.types.length > 0;

  if (!category) {
    return (
      <div className={cn("bg-paper px-5 py-10", className)}>
        <p className="text-sm font-semibold text-muted">
          Unknown category “{slug}”.
        </p>
      </div>
    );
  }

  /** Mock look: Filter always green; others always white — active = red badge only. */
  const chipSecondary =
    "flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-white px-3.5 text-[13px] leading-none font-semibold text-leaf ring-1 ring-black/[0.08] transition hover:bg-mint/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-paper", className)}>
      <header className="shrink-0 border-b border-black/[0.05] bg-paper/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur-sm">
        <div className="relative flex h-11 shrink-0 items-center">
          {onBack ? (
            <BackButton onClick={onBack} />
          ) : (
            <BackButton href={backHref} />
          )}
          <h1 className={t.plpPageTitle}>{category.name}</h1>
          <button
            type="button"
            onClick={handleSearch}
            aria-label="Search in category"
            className="ml-auto grid size-11 shrink-0 place-items-center rounded-full text-black transition hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <Search className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSheet("filter")}
            aria-expanded={sheet === "filter"}
            className="relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-track px-3.5 text-[13px] leading-none font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.22)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Filter
            {facetsActive ? (
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-paper"
                aria-hidden
              />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setSheet("brands")}
            aria-expanded={sheet === "brands"}
            className={chipSecondary}
          >
            Brands
            <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSheet("types")}
            aria-expanded={sheet === "types"}
            className={chipSecondary}
          >
            Type
            <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSheet("sort")}
            aria-expanded={sheet === "sort"}
            className={cn(chipSecondary, "ml-auto gap-1.5 px-3")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
            Sort
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch">
        <nav
          aria-label="Subcategories"
          className="flex h-full min-h-0 w-[5.75rem] shrink-0 flex-col self-stretch overflow-y-auto overscroll-contain border-r border-black/[0.06] bg-paper py-2"
        >
          {category.subcategories.map((row) => {
            const isActive = row.name === sub;
            return (
              <button
                key={row.name}
                type="button"
                onClick={() => setSub(row.name)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 px-1.5 py-3 text-center transition",
                  isActive ? "bg-mint/55" : "hover:bg-mint/30",
                )}
              >
                {isActive ? (
                  <span
                    className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-track"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative h-12 w-12 overflow-hidden rounded-full bg-[#efe6da] ring-2 transition",
                    isActive
                      ? "shadow-[0_4px_12px_rgba(47,107,47,0.22)] ring-leaf"
                      : "ring-black/[0.04]",
                  )}
                >
                  <Image
                    src={row.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </span>
                <span
                  className={cn(
                    "line-clamp-2 w-full px-0.5 text-[11px] leading-tight font-extrabold",
                    isActive ? "text-leaf" : "text-ink",
                  )}
                >
                  {row.name}
                </span>
              </button>
            );
          })}
          <div className="min-h-0 flex-1" aria-hidden />
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper px-2 py-2.5">
          <div className={t.plpFilterHeaderWrap}>
            <p className={t.plpFilterHeading}>
              {sub === "All" ? "All items" : sub}
            </p>
            <p className="text-[11px] font-semibold text-muted tabular-nums">
              {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No matches</p>
              <p className="mt-1 text-[12px] text-muted">
                Try clearing filters or changing sort.
              </p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_PLP_FILTERS)}
                className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full bg-track px-4 text-[13px] font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <ul className={t.plpGridGap}>
              {products.map((p) => (
                <li key={p.id} className="min-w-0">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}

          {sub !== "All" ? (
            <p className="mt-5 px-1 pb-4 text-center text-[11px] leading-4 text-muted">
              Showing all {category.shortName ?? category.name} items —
              “{sub}” rail filtering arrives with the catalog API.
            </p>
          ) : (
            <div className="h-6" />
          )}
        </div>
      </div>

      <PlpFilterSheets
        open={sheet}
        onClose={() => setSheet(null)}
        value={filters}
        onChange={setFilters}
        brandOptions={brandOptions}
        typeOptions={typeOptions}
      />
    </div>
  );
}
