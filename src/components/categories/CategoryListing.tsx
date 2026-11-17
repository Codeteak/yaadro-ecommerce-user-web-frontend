"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PlpFilterChips } from "@/components/categories/PlpFilterChips";
import { PlpFilterSheets } from "@/components/categories/PlpFilterSheets";
import { usePlpFilters } from "@/components/categories/usePlpFilters";
import { BackButton } from "@/components/navigation/BackButton";
import {
  CategoryRail,
  type RailCategory,
} from "@/components/home/CategoryRail";
import { CategoryTile } from "@/components/home/CategoryTile";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import { cn } from "@/lib/cn";
import { getCatalogCategory } from "@/lib/catalog-taxonomy";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";
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
  /**
   * Subcategory rail layout.
   * `horizontal` — storefront `/categories/[slug]` (HomeSearchBar + home pill rail).
   * `sidebar` — legacy left column (kept on playground `category-plp`).
   */
  railLayout?: "sidebar" | "horizontal";
};

/**
 * Category PLP: header + filters, subcategory rail, 2-col product grid.
 * Storefront passes `railLayout="horizontal"`. Playground `category-plp`
 * keeps `sidebar` for the old layout.
 */
export function CategoryListing({
  slug,
  className,
  onBack,
  backHref = "/categories",
  onSearchClick,
  live,
  error,
  railLayout = "sidebar",
}: CategoryListingProps) {
  const t = useTypeScale();
  const router = useRouter();
  const sampleCategory = live ? undefined : getCatalogCategory(slug);
  const category = useMemo(() => {
    if (live) {
      return {
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
      };
    }
    return sampleCategory;
  }, [live, sampleCategory]);
  const [sub, setSub] = useState("All");
  const [query, setQuery] = useState("");
  const [chipsOpen, setChipsOpen] = useState(false);
  const horizontal = railLayout === "horizontal";

  const handleSearch = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    router.push("/categories?focus=search");
  };

  const catalogProducts = useMemo(() => {
    let list: SampleProduct[];
    if (live) {
      if (sub === "All") {
        list = live.products;
      } else {
        const child = live.subcategories.find((row) => row.name === sub);
        list = child
          ? live.products.filter((product) => product.categoryId === child.id)
          : live.products;
      }
    } else if (!sampleCategory?.homeCategory) {
      list = [];
    } else {
      list = getProductsByCategory(sampleCategory.homeCategory);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((product) => product.name.toLowerCase().includes(q));
  }, [live, sampleCategory, sub, query]);

  const {
    filters,
    setFilters,
    sheet,
    setSheet,
    brandOptions,
    typeOptions,
    visible: products,
    active: facetsActive,
    clearFilters,
  } = usePlpFilters(catalogProducts);

  const railCategories = useMemo<RailCategory[]>(
    () =>
      category
        ? category.subcategories
            .filter((row) => row.name !== "All")
            .map((row) => ({
              name: row.name,
              slug: row.name,
              image: row.image || CATEGORY_IMAGE_FALLBACK,
            }))
        : [],
    [category],
  );

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

  const railSelected = sub === "All" ? ALL_CATEGORY_SLUG : sub;

  const productGrid = (
    <>
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
            onClick={clearFilters}
            className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full bg-track px-4 text-[13px] font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-2",
            horizontal ? "gap-3.5" : "gap-2.5",
          )}
        >
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
    </>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-paper", className)}>
      {horizontal ? (
        <header className="shrink-0 border-b border-black/[0.05] bg-paper/95 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
          <div className="px-5">
            <div className="relative flex h-11 shrink-0 items-center">
              {onBack ? (
                <BackButton onClick={onBack} />
              ) : (
                <BackButton href={backHref} />
              )}
              <h1 className={t.plpPageTitle}>{category.name}</h1>
              <span className="ml-auto size-11 shrink-0" aria-hidden />
            </div>
            {/* Same HomeSearchBar as ecom /categories (CategoryBrowser). */}
            <HomeSearchBar
              className="mt-1"
              value={query}
              onChange={setQuery}
              placeholder="Search this category"
              onFilterClick={() => {
                setChipsOpen((open) => {
                  if (open) setSheet(null);
                  return !open;
                });
              }}
              filterActive={facetsActive}
              filterExpanded={chipsOpen}
            />
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                chipsOpen
                  ? "mt-2 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
              aria-hidden={!chipsOpen}
            >
              <div className="overflow-hidden">
                <PlpFilterChips
                  open={sheet}
                  onOpen={setSheet}
                  filterActive={facetsActive}
                />
              </div>
            </div>
          </div>
          {/* Same pill CategoryRail as /home — one chrome block with search. */}
          <CategoryRail
            categories={railCategories}
            tileVariant="pill"
            selected={railSelected}
            onSelect={(slug) =>
              setSub(slug === ALL_CATEGORY_SLUG ? "All" : slug)
            }
          />
        </header>
      ) : (
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
      )}

      {horizontal ? (
        <section
          aria-label={`${sub === "All" ? "All items" : sub} products`}
          data-storefront-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper px-4 pt-4 pb-28"
        >
          {productGrid}
        </section>
      ) : (
        <div className="flex min-h-0 flex-1 items-stretch border-t border-black/[0.06]">
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
            {productGrid}
          </section>
        </div>
      )}

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
