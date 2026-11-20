"use client";

import { useMemo, useState } from "react";
import { PlpFilterChips } from "@/components/categories/PlpFilterChips";
import {
  PlpFilterSheets,
} from "@/components/categories/PlpFilterSheets";
import { usePlpFilters } from "@/components/categories/usePlpFilters";
import {
  CategoryRail,
  type RailCategory,
} from "@/components/home/CategoryRail";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { PageHeader } from "@/components/navigation/PageHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import type { CategoryBranch } from "@/lib/api/storefront";
import { cn } from "@/lib/cn";
import { ALL_CATEGORY_SLUG } from "@/lib/home-categories";
import type { SampleProduct } from "@/lib/sample-products";

type CategoryBrowserProps = {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  focusSearch?: boolean;
  /** Start with Filter/Brands/Type/Sort chips expanded (e.g. home filter → categories). */
  initialChipsOpen?: boolean;
  /** Prefill search from `/categories?q=` (home submit). */
  initialQuery?: string;
  /** Controlled aisle key from the server (`all`, `cat:slug`, `sub:slug`). */
  selection?: string;
  onSelect?: (key: string) => void;
  className?: string;
  /**
   * `horizontal` — storefront `/categories` (home pill rail + full-width grid).
   * `sidebar` — legacy left column (playground `category-browser`).
   */
  railLayout?: "sidebar" | "horizontal";
  /** When set with horizontal layout, owns the page header above the sticky rail. */
  pageTitle?: string;
  backHref?: string;
};

function productsFor(
  selected: string,
  branches: CategoryBranch[],
  products: SampleProduct[],
) {
  if (selected === "all") return products;
  if (selected.startsWith("sub:")) {
    const slug = selected.slice(4);
    return products.filter((product) => product.categorySlug === slug);
  }
  const slug = selected.slice(4);
  const branch = branches.find((item) => item.slug === slug);
  if (!branch) return [];
  const slugs = new Set([branch.slug, ...branch.children.map((child) => child.slug)]);
  return products.filter(
    (product) => product.categorySlug != null && slugs.has(product.categorySlug),
  );
}

function selectedName(selected: string, branches: CategoryBranch[]) {
  if (selected === "all") return "All";
  if (selected.startsWith("sub:")) {
    const slug = selected.slice(4);
    for (const branch of branches) {
      const child = branch.children.find((item) => item.slug === slug);
      if (child) return child.name;
    }
    return "Category";
  }
  return branches.find((item) => item.slug === selected.slice(4))?.name ?? "Category";
}

/**
 * Storefront `/categories` browser: search + collapsible filter chips +
 * category rail + 2-col products. Search filter button toggles the
 * Filter/Brands/Type/Sort row; each chip opens its PLP sheet.
 */
export function CategoryBrowser({
  branches,
  products,
  error,
  focusSearch = false,
  initialChipsOpen = false,
  initialQuery = "",
  selection,
  onSelect,
  className,
  railLayout = "sidebar",
  pageTitle,
  backHref = "/home",
}: CategoryBrowserProps) {
  const [localSelected, setLocalSelected] = useState("all");
  /** Instant rail highlight while `selection` catches up from the server. */
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [seenSelection, setSeenSelection] = useState(selection);
  const [query, setQuery] = useState(initialQuery);
  /** Search filter button expands/collapses the Filter·Brands·Type·Sort row. */
  const [chipsOpen, setChipsOpen] = useState(initialChipsOpen);
  // Sync when the server selection arrives (adjust state while rendering).
  if (selection !== seenSelection) {
    setSeenSelection(selection);
    setOptimistic(null);
  }
  const selected = optimistic ?? selection ?? localSelected;
  const title = selectedName(selected, branches);
  const horizontal = railLayout === "horizontal";
  const ownsPageChrome = horizontal && Boolean(pageTitle);

  const choose = (key: string) => {
    setOptimistic(key);
    if (onSelect) onSelect(key);
    else setLocalSelected(key);
  };

  const scoped = useMemo(() => {
    // Always scope client-side so rail taps feel instant while the
    // server payload catches up (All catalog → aisle filter).
    const base = productsFor(selected, branches, products);
    const q = query.trim().toLowerCase();
    return base.filter((product) =>
      q ? product.name.toLowerCase().includes(q) : true,
    );
  }, [branches, products, query, selected]);

  const railCategories = useMemo<RailCategory[]>(
    () =>
      branches.map((branch) => ({
        name: branch.name,
        slug: `cat:${branch.slug}`,
        image: branch.image || CATEGORY_IMAGE_FALLBACK,
      })),
    [branches],
  );

  const railSelected =
    selected === "all" || selected.startsWith("cat:")
      ? selected === "all"
        ? ALL_CATEGORY_SLUG
        : selected
      : selected.startsWith("sub:")
        ? (() => {
            const slug = selected.slice(4);
            const parent = branches.find((branch) =>
              branch.children.some((child) => child.slug === slug),
            );
            return parent ? `cat:${parent.slug}` : ALL_CATEGORY_SLUG;
          })()
        : ALL_CATEGORY_SLUG;

  const {
    filters,
    setFilters,
    sheet,
    setSheet,
    brandOptions,
    typeOptions,
    visible,
    active: filtersOn,
    clearFilters,
  } = usePlpFilters(scoped);

  const productSection = (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-black">{title}</h2>
        <p className="text-[11px] font-semibold text-muted tabular-nums">
          {visible.length}{" "}
          {visible.length === 1 ? "product" : "products"}
        </p>
      </div>
      <div key={selected} className="category-switch">
        {visible.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-muted">
              {filtersOn
                ? "No products match these filters."
                : selected === "all"
                  ? "No products in the catalog yet."
                  : "Nothing in this category yet."}
            </p>
            {filtersOn ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full bg-track px-4 text-[13px] font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-2",
              horizontal ? "gap-3.5" : "gap-2.5",
            )}
          >
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  const searchBlock = (
    <>
      <HomeSearchBar
        value={query}
        onChange={setQuery}
        autoFocus={focusSearch}
        placeholder="Search this category"
        onFilterClick={() => {
          setChipsOpen((open) => {
            if (open) setSheet(null);
            return !open;
          });
        }}
        filterActive={filtersOn}
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
            filterActive={filtersOn}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {horizontal ? (
        /*
          One scrollport: header + search scroll away; category rail sticks;
          scrolling back brings header/search back. Avoids a tiny nested
          product pane that felt like scrolling was broken.
        */
        <div
          data-storefront-scroll
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        >
          {ownsPageChrome ? (
            <div className="px-5 pb-2">
              <PageHeader
                backHref={backHref}
                title={pageTitle}
                sticky={false}
              />
              {searchBlock}
            </div>
          ) : (
            <div className="px-5 pb-2">{searchBlock}</div>
          )}

          <div className="sticky top-0 z-20 border-b border-black/[0.05] bg-paper/95 backdrop-blur-sm">
            <CategoryRail
              categories={railCategories}
              tileVariant="pill"
              selected={railSelected}
              onSelect={(slug) =>
                choose(slug === ALL_CATEGORY_SLUG ? "all" : slug)
              }
            />
          </div>

          {error ? (
            <p className="px-5 pb-2 text-sm font-medium text-muted">{error}</p>
          ) : null}

          <section
            aria-label={`${title} products`}
            className="px-4 pt-4 pb-28"
          >
            {productSection}
          </section>
        </div>
      ) : (
        <>
          <div className="px-5 pb-3">{searchBlock}</div>
          {error ? (
            <p className="px-5 pb-2 text-sm font-medium text-muted">{error}</p>
          ) : null}
          <div className="flex min-h-0 flex-1 border-t border-black/[0.06]">
            <aside
              aria-label="Categories"
              className="flex w-[5.75rem] shrink-0 flex-col self-stretch border-r border-black/[0.06] bg-paper"
            >
              <div
                data-storefront-scroll
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-1.5 pt-2 pb-28 [-webkit-overflow-scrolling:touch]"
              >
                <div className="flex flex-col gap-1">
                  <CategoryCard
                    size="sidebar"
                    name="All"
                    active={selected === "all"}
                    onClick={() => choose("all")}
                  />
                  {branches.map((branch) => (
                    <div key={branch.id} className="flex flex-col gap-1">
                      <CategoryCard
                        size="sidebar"
                        name={branch.name}
                        image={branch.image || CATEGORY_IMAGE_FALLBACK}
                        active={selected === `cat:${branch.slug}`}
                        onClick={() => choose(`cat:${branch.slug}`)}
                      />
                      {branch.children.map((child) => (
                        <CategoryCard
                          key={child.id}
                          size="sidebar"
                          name={child.name}
                          image={child.image || CATEGORY_IMAGE_FALLBACK}
                          active={selected === `sub:${child.slug}`}
                          onClick={() => choose(`sub:${child.slug}`)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <section
              aria-label={`${title} products`}
              data-storefront-scroll
              className="min-w-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-3 pt-3 pb-28 [-webkit-overflow-scrolling:touch]"
            >
              {productSection}
            </section>
          </div>
        </>
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
