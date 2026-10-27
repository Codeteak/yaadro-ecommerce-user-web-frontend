"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import {
  CATALOG_SECTIONS,
  resolveHubTileShape,
  resolveHubTileSpan,
  type CatalogCategory,
  type CatalogTileShape,
} from "@/lib/catalog-taxonomy";
import {
  getSampleProduct,
  searchSampleProducts,
  type SampleProduct,
} from "@/lib/sample-products";

/** Mixed picks under the category grids (stable ids — no hydration flicker). */
const HUB_PICK_IDS = [
  "fr-1",
  "vg-2",
  "bv-1",
  "sn-1",
  "fr-3",
  "bk-1",
] as const;

function hubPopularProducts(): SampleProduct[] {
  return HUB_PICK_IDS.map((id) => getSampleProduct(id)).filter(
    (p): p is SampleProduct => Boolean(p),
  );
}

export type CategoriesHubProps = {
  className?: string;
  /** Autofocus the search field (e.g. arrived from home search). */
  focusSearch?: boolean;
  query?: string;
  onQueryChange?: (q: string) => void;
  onSelectCategory?: (category: CatalogCategory) => void;
  categoryHref?: (category: CatalogCategory) => string;
};

/**
 * Categories hub: same HomeSearchBar pill + full-width sectioned grids
 * + popular ProductCard row. Used on `/categories` and playground.
 */
export function CategoriesHub({
  className,
  focusSearch = false,
  query: queryProp,
  onQueryChange,
  onSelectCategory,
  categoryHref,
}: CategoriesHubProps) {
  const t = useTypeScale();
  const [internalQuery, setInternalQuery] = useState("");
  const query = queryProp ?? internalQuery;
  const popular = useMemo(() => hubPopularProducts(), []);

  const setQuery = (next: string) => {
    if (queryProp === undefined) setInternalQuery(next);
    onQueryChange?.(next);
  };

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const sections = useMemo(() => {
    if (!isSearching) return CATALOG_SECTIONS;
    const q = trimmed.toLowerCase();
    return CATALOG_SECTIONS.map((section) => ({
      ...section,
      categories: section.categories.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortName?.toLowerCase().includes(q),
      ),
    })).filter((s) => s.categories.length > 0);
  }, [isSearching, trimmed]);

  const productHits = useMemo(
    () => (isSearching ? searchSampleProducts(trimmed) : []),
    [isSearching, trimmed],
  );

  const showPopular = !isSearching && popular.length > 0;
  const noResults =
    isSearching && sections.length === 0 && productHits.length === 0;

  return (
    <div className={cn("w-full bg-paper", className)}>
      <div className="sticky top-0 z-10 border-b border-black/[0.04] bg-paper/95 px-3 pt-2 pb-3 backdrop-blur-md sm:px-4">
        <HomeSearchBar
          value={query}
          onChange={setQuery}
          autoFocus={focusSearch}
          inputId="categories-hub-search"
          placeholder='Search for "pulses"'
        />
      </div>

      <div className="w-full px-3 pb-10 sm:px-4">
        {noResults ? (
          <p className="mt-10 text-center text-sm font-medium text-muted">
            No categories or products match “{trimmed}”.
          </p>
        ) : null}

        {sections.map((section) => (
          <section key={section.id} className={t.categorySectionGap}>
            <div className={t.categoryGridHeaderWrap}>
              <h2 className={t.categoryGridHeading}>{section.title}</h2>
              {section.subtitle && !isSearching ? (
                <p className={t.categoryGridSubtitle}>{section.subtitle}</p>
              ) : null}
            </div>

            <ul className="grid w-full grid-cols-4 gap-x-2 gap-y-3">
              {section.categories.map((cat, index) => {
                const shape = resolveHubTileShape(
                  section.layout,
                  index,
                  cat.tile,
                );
                const span = resolveHubTileSpan(section.layout, index, shape);
                return (
                  <li
                    key={cat.slug}
                    className={cn(
                      "min-w-0",
                      span === 3
                        ? "col-span-3"
                        : span === 2
                          ? "col-span-2"
                          : "col-span-1",
                    )}
                  >
                    <HubTile
                      category={cat}
                      shape={shape}
                      href={categoryHref?.(cat)}
                      onSelect={() => onSelectCategory?.(cat)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {productHits.length > 0 ? (
          <section className={cn(sections.length > 0 ? "mt-8" : "mt-5")}>
            <h2 className={t.searchResultsHeading}>Products</h2>
            <p className={t.searchResultsSubtitle}>
              {productHits.length}{" "}
              {productHits.length === 1 ? "result" : "results"} for “{trimmed}”
            </p>
            <ul
              className={cn(
                "grid grid-cols-2 gap-2.5",
                t.searchResultsToGrid,
              )}
            >
              {productHits.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showPopular ? (
          <section className="mt-8">
            <h2 className={t.searchResultsHeading}>Popular picks</h2>
            <p className={t.searchResultsSubtitle}>
              Quick adds from across the store
            </p>
            <ul
              className={cn(
                "grid grid-cols-2 gap-2.5",
                t.searchResultsToGrid,
              )}
            >
              {popular.map((product) => (
                <li key={product.id} className="min-w-0">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Shared tile height so rect and square align in a row. */
const TILE_H = "h-[6.25rem]";

function HubTile({
  category,
  shape,
  href,
  onSelect,
}: {
  category: CatalogCategory;
  shape: CatalogTileShape;
  href?: string;
  onSelect: () => void;
}) {
  const label =
    shape === "rect" ? category.name : (category.shortName ?? category.name);

  const body = (
    <>
      <span
        className={cn(
          "relative block w-full overflow-hidden rounded-[1.15rem] bg-[#efe6da] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]",
          TILE_H,
        )}
      >
        <Image
          src={category.image}
          alt=""
          fill
          sizes={shape === "rect" ? "66vw" : "25vw"}
          className="object-cover transition duration-300 group-hover:scale-[1.04]"
        />
      </span>
      <span className="mt-1.5 line-clamp-2 min-h-[2.1rem] w-full text-center text-[12px] leading-tight font-extrabold text-forest">
        {label}
      </span>
    </>
  );

  const className =
    "group flex w-full min-w-0 cursor-pointer flex-col items-stretch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

  if (href) {
    return (
      <Link
        href={href}
        transitionTypes={["nav-forward"]}
        className={className}
        aria-label={category.name}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      aria-label={category.name}
    >
      {body}
    </button>
  );
}
