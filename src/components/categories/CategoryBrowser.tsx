"use client";

import { useMemo, useState } from "react";
import { PlpFilterChips } from "@/components/categories/PlpFilterChips";
import {
  PlpFilterSheets,
  type PlpSheetKind,
} from "@/components/categories/PlpFilterSheets";
import { CategoryTile } from "@/components/home/CategoryTile";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import type { CategoryBranch } from "@/lib/api/storefront";
import { cn } from "@/lib/cn";
import {
  applyPlpFilters,
  DEFAULT_PLP_FILTERS,
  plpBrand,
  plpFiltersActive,
  plpType,
  uniqueSorted,
  type PlpFilterState,
} from "@/lib/plp-filters";
import type { SampleProduct } from "@/lib/sample-products";

type CategoryBrowserProps = {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  focusSearch?: boolean;
  /** Start with Filter/Brands/Type/Sort chips expanded (e.g. home filter → categories). */
  initialChipsOpen?: boolean;
  className?: string;
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
 * vertical category rail + 2-col products. Search filter button toggles
 * the Filter/Brands/Type/Sort row; each chip opens its PLP sheet.
 */
export function CategoryBrowser({
  branches,
  products,
  error,
  focusSearch = false,
  initialChipsOpen = false,
  className,
}: CategoryBrowserProps) {
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlpFilterState>(DEFAULT_PLP_FILTERS);
  const [sheet, setSheet] = useState<PlpSheetKind>(null);
  /** Search filter button expands/collapses the Filter·Brands·Type·Sort row. */
  const [chipsOpen, setChipsOpen] = useState(initialChipsOpen);
  const title = selectedName(selected, branches);

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return productsFor(selected, branches, products).filter((product) =>
      q ? product.name.toLowerCase().includes(q) : true,
    );
  }, [branches, products, query, selected]);

  const brandOptions = useMemo(
    () => uniqueSorted(scoped.map(plpBrand)),
    [scoped],
  );
  const typeOptions = useMemo(
    () => uniqueSorted(scoped.map(plpType)),
    [scoped],
  );

  const visible = useMemo(
    () => applyPlpFilters(scoped, filters),
    [scoped, filters],
  );

  const filtersOn = plpFiltersActive(filters);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="px-5 pb-3">
        <HomeSearchBar
          value={query}
          onChange={setQuery}
          autoFocus={focusSearch}
          placeholder="Search products"
          onFilterClick={() => {
            setChipsOpen((open) => {
              if (open) setSheet(null);
              return !open;
            });
          }}
          filterActive={filtersOn}
          filterExpanded={chipsOpen}
        />
        {/* Expand/collapse same chip row as Fruits PLP */}
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
      </div>
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
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pt-2 pb-28"
          >
            <div className="flex flex-col gap-1">
              <CategoryTile
                size="sidebar"
                name="All"
                active={selected === "all"}
                onClick={() => setSelected("all")}
              />
              {branches.map((branch) => (
                <div key={branch.id} className="flex flex-col gap-1">
                  <CategoryTile
                    size="sidebar"
                    name={branch.name}
                    image={branch.image || CATEGORY_IMAGE_FALLBACK}
                    active={selected === `cat:${branch.slug}`}
                    onClick={() => setSelected(`cat:${branch.slug}`)}
                  />
                  {branch.children.map((child) => (
                    <CategoryTile
                      key={child.id}
                      size="sidebar"
                      name={child.name}
                      image={child.image || CATEGORY_IMAGE_FALLBACK}
                      active={selected === `sub:${child.slug}`}
                      onClick={() => setSelected(`sub:${child.slug}`)}
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
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-28"
        >
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
                    : "Nothing in this category yet."}
                </p>
                {filtersOn ? (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_PLP_FILTERS)}
                    className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full bg-track px-4 text-[13px] font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
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
