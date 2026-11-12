"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PlpFilterChips } from "@/components/categories/PlpFilterChips";
import {
  PlpFilterSheets,
  type PlpSheetKind,
} from "@/components/categories/PlpFilterSheets";
import { BackButton } from "@/components/navigation/BackButton";
import { CategoryTile } from "@/components/home/CategoryTile";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import { cn } from "@/lib/cn";
import { getCatalogCategory } from "@/lib/catalog-taxonomy";
import {
  applyPlpFilters,
  DEFAULT_PLP_FILTERS,
  plpBrand,
  plpFiltersActive,
  plpType,
  uniqueSorted,
  type PlpFilterState,
} from "@/lib/plp-filters";
import { getProductsByCategory, type SampleProduct } from "@/lib/sample-products";

export type LiveCategoryListing = {
  name: string;
  slug: string;
  image: string;
  subcategories: { id: string; name: string; image: string }[];
  products: SampleProduct[];
};

export type CategoryListingProps = {
  slug: string;
  className?: string;
  onBack?: () => void;
  backHref?: string;
  onSearchClick?: () => void;
  /** Live category. Omit to keep the sample listing. */
  live?: LiveCategoryListing;
  error?: string | null;
};

/**
 * Category PLP: header + filters, left subcategory rail (same sidebar
 * tiles as `/categories` CategoryBrowser), 2-col product grid.
 */
export function CategoryListing({
  slug,
  className,
  onBack,
  backHref = "/categories",
  onSearchClick,
  live,
  error,
}: CategoryListingProps) {
  const t = useTypeScale();
  const router = useRouter();
  const sampleCategory = live ? undefined : getCatalogCategory(slug);
  const category = live
    ? {
        name: live.name,
        slug: live.slug,
        image: live.image || CATEGORY_IMAGE_FALLBACK,
        shortName: live.name,
        subcategories: [
          { name: "All", image: live.image || CATEGORY_IMAGE_FALLBACK },
          ...live.subcategories.map((row) => ({
            name: row.name,
            image: row.image || live.image || CATEGORY_IMAGE_FALLBACK,
          })),
        ],
      }
    : sampleCategory;
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
    if (live) {
      if (sub === "All") return live.products;
      const child = live.subcategories.find((row) => row.name === sub);
      if (!child) return live.products;
      return live.products.filter((product) => product.categoryId === child.id);
    }
    if (!sampleCategory?.homeCategory) return [];
    return getProductsByCategory(sampleCategory.homeCategory);
  }, [live, sampleCategory, sub]);

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

  const facetsActive = plpFiltersActive(filters);

  if (error) {
    return (
      <div className={cn("bg-paper px-5 py-10", className)}>
        <p className="text-sm font-semibold text-muted">{error}</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className={cn("bg-paper px-5 py-10", className)}>
        <p className="text-sm font-semibold text-muted">
          Unknown category “{slug}”.
        </p>
      </div>
    );
  }

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

        <PlpFilterChips
          className="mt-2"
          open={sheet}
          onOpen={setSheet}
          filterActive={facetsActive}
        />
      </header>

      <div className="flex min-h-0 flex-1 items-stretch border-t border-black/[0.06]">
        {/* Same sidebar tile rail as CategoryBrowser (no circle rail / no green side bar). */}
        <aside
          aria-label="Subcategories"
          className="flex w-[5.75rem] shrink-0 flex-col self-stretch border-r border-black/[0.06] bg-paper"
        >
          <div
            data-storefront-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pt-2 pb-28"
          >
            <div className="flex flex-col gap-1">
              {category.subcategories.map((row) => (
                <CategoryTile
                  key={row.name}
                  size="sidebar"
                  name={row.name}
                  image={
                    row.name === "All"
                      ? ""
                      : row.image || CATEGORY_IMAGE_FALLBACK
                  }
                  active={sub === row.name}
                  onClick={() => setSub(row.name)}
                />
              ))}
            </div>
          </div>
        </aside>

        <section
          aria-label={`${sub === "All" ? "All items" : sub} products`}
          data-storefront-scroll
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-paper px-3 pt-3 pb-28"
        >
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className={t.plpFilterHeading}>
              {sub === "All" ? "All items" : sub}
            </p>
            <p className="text-[11px] font-semibold text-muted tabular-nums">
              {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="py-10 text-center">
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
            <ul className="grid grid-cols-2 gap-2.5">
              {products.map((p) => (
                <li key={p.id} className="min-w-0">
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          )}

          {sub !== "All" && !live ? (
            <p className="mt-5 px-1 pb-4 text-center text-[11px] leading-4 text-muted">
              Showing all {category.shortName ?? category.name} items —
              “{sub}” rail filtering arrives with the catalog API.
            </p>
          ) : (
            <div className="h-6" />
          )}
        </section>
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
