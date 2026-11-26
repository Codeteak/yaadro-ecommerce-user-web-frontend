"use client";

import { useMemo, useRef, useState } from "react";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { useHomeCategoryOptional } from "@/components/home/HomeCategoryContext";
import { ALL_CATEGORY_SLUG, HOME_CATEGORIES } from "@/lib/home-categories";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import { cn } from "@/lib/cn";
import { prefetchHomeAisle } from "@/lib/home-aisle-client";

export { HOME_CATEGORIES, type HomeCategory } from "@/lib/home-categories";

export type RailCategory = {
  name: string;
  /** Sample mode uses the aisle name; live catalog uses the slug. */
  slug: string;
  image: string;
};

const SAMPLE_RAIL: RailCategory[] = HOME_CATEGORIES.map((category) => ({
  name: category.name,
  slug: category.name,
  image: category.image,
}));

const FALLBACK_IMAGE = CATEGORY_IMAGE_FALLBACK;

type CategoryRailProps = {
  /** Live shop categories. Omitted in the playground, which keeps the sample rail. */
  categories?: RailCategory[];
  /** Used when a category has no image. */
  imageFallback?: string;
  /**
   * Tile chrome. `/home` uses `pill`. Playground Style 2 matches.
   */
  tileVariant?: "card" | "pill";
  /**
   * Controlled selection (e.g. PLP playground). When both are set,
   * skips HomeCategoryContext and local state.
   */
  selected?: string;
  onSelect?: (slug: string) => void;
};

/**
 * Flat category strip. All is first and selected on open.
 * Selection changes only on tap/click — horizontal scroll does not change it.
 * Used on /home and categories (horizontal pill rail).
 */
export function CategoryRail({
  categories = SAMPLE_RAIL,
  imageFallback = FALLBACK_IMAGE,
  tileVariant = "card",
  selected: controlledSelected,
  onSelect,
}: CategoryRailProps) {
  const homeCategory = useHomeCategoryOptional();
  const [localSelected, setLocalSelected] = useState(ALL_CATEGORY_SLUG);
  const controlled = controlledSelected != null && onSelect != null;
  const selected = controlled
    ? controlledSelected
    : (homeCategory?.selected ?? localSelected);
  const setSelected = controlled
    ? onSelect
    : (homeCategory?.setSelected ?? setLocalSelected);
  const railRef = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => [
      { name: "All", slug: ALL_CATEGORY_SLUG, image: "" },
      ...categories.filter((category) => category.slug !== ALL_CATEGORY_SLUG),
    ],
    [categories],
  );

  const choose = (slug: string) => {
    setSelected(slug);
    const rail = railRef.current;
    const item = rail?.querySelector<HTMLElement>(
      `[data-slug="${CSS.escape(slug)}"]`,
    );
    if (!rail || !item) return;
    rail.scrollTo({
      left: Math.max(0, item.offsetLeft - insetOf(rail)),
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={railRef}
      className="relative overflow-x-auto scroll-smooth overscroll-x-contain scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        className={cn(
          "flex w-max px-5 py-3",
          tileVariant === "pill" ? "gap-2.5 sm:gap-3.5" : "gap-4",
        )}
      >
        {items.map((category) => (
          <div
            key={category.slug}
            className="contents"
            onPointerEnter={() => {
              if (category.slug !== ALL_CATEGORY_SLUG) {
                prefetchHomeAisle(category.slug);
              }
            }}
            onPointerDown={() => {
              if (category.slug !== ALL_CATEGORY_SLUG) {
                prefetchHomeAisle(category.slug);
              }
            }}
          >
            <CategoryCard
              name={category.name}
              slug={category.slug}
              variant={tileVariant}
              image={
                category.slug === ALL_CATEGORY_SLUG
                  ? ""
                  : category.image || imageFallback
              }
              active={selected === category.slug}
              onClick={() => choose(category.slug)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function insetOf(rail: HTMLElement) {
  return rail.querySelector<HTMLElement>("[data-slug]")?.offsetLeft ?? 0;
}
