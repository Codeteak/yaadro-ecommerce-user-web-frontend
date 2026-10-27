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
import { BackButton } from "@/components/navigation/BackButton";
import { ProductCard } from "@/components/product/ProductCard";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { cn } from "@/lib/cn";
import { getCatalogCategory } from "@/lib/catalog-taxonomy";
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

  const handleSearch = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    router.push("/categories?focus=search");
  };

  const products = useMemo(() => {
    if (!category?.homeCategory) return [];
    return getProductsByCategory(category.homeCategory);
  }, [category]);

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
        {/* Same layout as PageHeader: back · centered title · trailing slot */}
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

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-track px-3.5 text-[13px] leading-none font-bold text-black shadow-[0_4px_12px_rgba(47,107,47,0.22)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Filter
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-paper"
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[13px] leading-none font-semibold text-leaf ring-1 ring-black/[0.08]"
          >
            Brands
            <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
          </button>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[13px] leading-none font-semibold text-leaf ring-1 ring-black/[0.08]"
          >
            Type
            <ChevronDown className="h-3.5 w-3.5 text-leaf/70" aria-hidden />
          </button>
          <button
            type="button"
            className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] leading-none font-semibold text-leaf ring-1 ring-black/[0.08]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
            Sort
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch">
        {/* Full-height rail — same paper as page (no white “card” that cuts off). */}
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
          {/* Keeps rail paint continuous when few subs */}
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
            <p className="px-2 py-8 text-center text-sm text-muted">
              No products in this category yet.
            </p>
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
              “{sub}” filtering arrives with the catalog API.
            </p>
          ) : (
            <div className="h-6" />
          )}
        </div>
      </div>
    </div>
  );
}
