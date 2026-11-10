"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useHomeCategory } from "@/components/home/HomeCategoryContext";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import { catalogSlugForHomeCategory } from "@/lib/catalog-taxonomy";
import { ALL_CATEGORY_SLUG, HOME_CATEGORIES, type HomeCategory } from "@/lib/home-categories";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";
import {
  getProductsByCategory,
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

function isHomeCategory(value: string): value is HomeCategory {
  return HOME_CATEGORIES.some((category) => category.name === value);
}

function productsForAll(productsBySlug: Record<string, SampleProduct[]>) {
  const seen = new Set<string>();
  const products: SampleProduct[] = [];
  for (const bucket of Object.values(productsBySlug)) {
    for (const product of bucket) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }
  return products;
}

/** One scrolling row up to this count. More than this splits into two rows. */
const ONE_ROW_MAX = 10;

/** Horizontal rail — py so ProductCard shadows aren’t clipped by overflow. */
const ROW_SCROLL =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * Home product listing for the category selected in the rail above.
 * All uses the products already loaded. Ten or fewer stay in one row.
 * More than ten split across two rows.
 */
export function ProductSection({
  productsBySlug,
  categoryNames,
}: {
  /** Live products keyed by category slug. Omit to keep the sample aisle. */
  productsBySlug?: Record<string, SampleProduct[]>;
  categoryNames?: Record<string, string>;
}) {
  const t = useTypeScale();
  const { selected } = useHomeCategory();
  const live = productsBySlug != null;
  const showingAll = selected === ALL_CATEGORY_SLUG;
  const products = showingAll
    ? live
      ? productsForAll(productsBySlug)
      : SAMPLE_PRODUCTS
    : live
      ? (productsBySlug[selected] ?? [])
      : isHomeCategory(selected)
        ? getProductsByCategory(selected)
        : [];
  const twoRows = products.length > ONE_ROW_MAX;
  const mid = twoRows ? Math.ceil(products.length / 2) : products.length;
  const rowTop = products.slice(0, mid);
  const rowBottom = twoRows ? products.slice(mid) : [];

  return (
    <section
      aria-label={`${categoryNames?.[selected] ?? selected} products`}
      className="mx-auto w-full max-w-lg px-5 pt-6"
    >
      <div
        className={cn(
          "flex items-end justify-between",
          t.homeShowAllGap,
        )}
      >
        <div>
          <h2 className={t.homeSectionHeading}>
            {categoryNames?.[selected] ?? selected}
          </h2>
          <p className={t.homeSectionSubtitle}>
            {live ? "From this shop" : "Sample products — real catalog coming soon"}
          </p>
        </div>
        <Link
          href={
            showingAll
              ? "/categories"
              : live
                ? `/categories/${selected}`
                : isHomeCategory(selected)
                  ? `/categories/${catalogSlugForHomeCategory(selected)}`
                  : "/categories"
          }
          transitionTypes={["nav-forward"]}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Show all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div
        key={selected}
        className={cn(
          "onboarding-fade-up flex flex-col gap-1",
          t.homeSectionToGrid,
        )}
      >
        {products.length === 0 ? (
          <p className="py-6 text-sm font-medium text-muted">
            Nothing in this aisle yet.
          </p>
        ) : (
        <ProductScrollRow
          products={rowTop}
          label={twoRows ? `${selected} row 1` : selected}
        />
        )}
        {rowBottom.length > 0 ? (
          <ProductScrollRow
            products={rowBottom}
            label={`${selected} row 2`}
          />
        ) : null}
      </div>
    </section>
  );
}

function ProductScrollRow({
  products,
  label,
  className,
}: {
  products: SampleProduct[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="list"
      aria-label={label}
      className={cn(ROW_SCROLL, className)}
    >
      {products.map((product) => (
        <div
          key={product.id}
          role="listitem"
          className={cn(PRODUCT_CAROUSEL_SLOT, "shrink-0 snap-start")}
        >
          <ProductCard product={product} />
        </div>
      ))}
      <div className="w-1 shrink-0" aria-hidden />
    </div>
  );
}
