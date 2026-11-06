"use client";

import { useEffect, useRef, useState } from "react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { useHomeCategoryOptional } from "@/components/home/HomeCategoryContext";
import { HOME_CATEGORIES } from "@/lib/home-categories";

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

const FALLBACK_IMAGE = "/icons/icon-192.png";

/** Vertical offsets so the circles ride the hero's curve (ends up, middle dipped). */
const CURVE_OFFSETS = [0, 10, 18, 18, 10, 0];

type CategoryRailProps = {
  /** Live shop categories. Omitted in the playground, which keeps the sample rail. */
  categories?: RailCategory[];
  /** Slug (or sample aisle name) centered when the rail first opens. */
  initialSlug?: string;
  /** Fires with the centered category key whenever the selection changes. */
  onSelectChange?: (slug: string) => void;
};

function CategorySet({
  copyIndex,
  activeGlobal,
  onSelect,
  categories,
}: {
  copyIndex: number;
  activeGlobal: number | null;
  onSelect: (categoryIndex: number) => void;
  categories: RailCategory[];
}) {
  const count = categories.length;
  const hidden = copyIndex !== 1;
  return (
    <div className="flex shrink-0 gap-5 pr-5" aria-hidden={hidden || undefined}>
      {categories.map((category, index) => {
        const globalIndex = copyIndex * count + index;
        const isActive = activeGlobal === globalIndex;
        return (
          <button
            key={category.name}
            type="button"
            data-global-index={globalIndex}
            tabIndex={hidden ? -1 : undefined}
            aria-pressed={isActive}
            aria-label={`Show ${category.name}`}
            onClick={() => onSelect(index)}
            className={`group flex w-[4.75rem] shrink-0 cursor-pointer flex-col items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf ${
              isActive ? "relative z-10" : ""
            }`}
            style={{
              transform: `translateY(${CURVE_OFFSETS[index % CURVE_OFFSETS.length]}px)`,
            }}
          >
            <span
              className={`block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full bg-white ring-4 transition duration-300 ${
                isActive
                  ? "category-selected-pop shadow-[0_16px_32px_rgba(47,107,47,0.32)] ring-leaf"
                  : "shadow-[0_10px_24px_rgba(47,107,47,0.18)] ring-white group-hover:-translate-y-1 group-hover:ring-mint"
              }`}
            >
              <CatalogImage
                src={category.image || FALLBACK_IMAGE}
                alt=""
                width={144}
                height={144}
                className="h-full w-full object-cover"
              />
            </span>
            <span
              className={`w-full truncate text-center text-xs transition ${
                isActive ? "font-bold text-leaf" : "font-semibold text-forest"
              }`}
            >
              {category.name}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full bg-leaf transition duration-300 ${
                isActive ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Infinite category loop with center selection:
 * - Three copies of the set; swiping wraps seamlessly in both directions,
 *   so a full cycle of 6 ends on the category you started from.
 * - The circle nearest the rail's center is "selected": it pops larger
 *   with a green ring and a dot under its label.
 * - Tapping a circle selects it and smoothly centers it (no navigation —
 *   the product preview below the hero will react to the selection).
 * It never scrolls on its own.
 */
export function CategoryRail({
  categories = SAMPLE_RAIL,
  initialSlug,
  onSelectChange,
}: CategoryRailProps) {
  const homeCategory = useHomeCategoryOptional();
  const railRef = useRef<HTMLDivElement>(null);
  const setWidthRef = useRef(0);
  const [activeGlobal, setActiveGlobal] = useState<number | null>(null);
  const activeGlobalRef = useRef<number | null>(null);
  const onSelectChangeRef = useRef(onSelectChange);
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const count = categories.length;
  const namedIndex = categories.findIndex((category) => category.slug === initialSlug);
  const vegetablesIndex = categories.findIndex(
    (category) => category.slug === "Vegetables" || category.slug === "vegetables",
  );
  const initialIndex = namedIndex >= 0 ? namedIndex : Math.max(0, vegetablesIndex);
  useEffect(() => {
    onSelectChangeRef.current = onSelectChange;
  }, [onSelectChange]);
  const setSelectedRef = useRef(homeCategory?.setSelected);
  useEffect(() => {
    setSelectedRef.current = homeCategory?.setSelected;
  }, [homeCategory]);

  /** Select whichever physical circle sits nearest the rail's center. */
  const updateActive = () => {
    const rail = railRef.current;
    const railCategories = categoriesRef.current;
    if (!rail || railCategories.length === 0) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let nearest: number | null = null;
    let nearestDistance = Infinity;
    rail.querySelectorAll<HTMLElement>("[data-global-index]").forEach((item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = Number(item.dataset.globalIndex);
      }
    });
    if (nearest !== null && nearest !== activeGlobalRef.current) {
      activeGlobalRef.current = nearest;
      setActiveGlobal(nearest);
      const category = railCategories[nearest % railCategories.length];
      if (!category) return;
      onSelectChangeRef.current?.(category.slug);
      setSelectedRef.current?.(category.slug);
    }
  };

  /**
   * Center a category's circle exactly (copy within wrap range).
   * Used for tap-to-select, the initial default, and swipe-end snapping.
   */
  const centerCategory = (
    categoryIndex: number,
    behavior: ScrollBehavior = "smooth",
  ) => {
    const rail = railRef.current;
    if (!rail) return;
    const setWidth = setWidthRef.current;
    for (let copy = 0; copy < 3; copy++) {
      const item = rail.querySelector<HTMLElement>(
        `[data-global-index="${copy * categoriesRef.current.length + categoryIndex}"]`,
      );
      if (!item) continue;
      const target =
        item.offsetLeft + item.offsetWidth / 2 - rail.clientWidth / 2;
      // Scroll to the copy whose destination stays in the middle wrap
      // range so the seamless wrap never interrupts the animation.
      if (setWidth === 0 || (target >= setWidth && target < setWidth * 2)) {
        rail.scrollTo({ left: target, behavior });
        return;
      }
    }
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const firstSet = rail.firstElementChild?.firstElementChild as HTMLElement | null;
    if (!firstSet) return;
    const setWidth = firstSet.offsetWidth;
    if (setWidth === 0) return;
    setWidthRef.current = setWidth;

    // Start on the middle copy so both directions have a copy to wrap into.
    rail.scrollLeft = setWidth;
    centerCategory(initialIndex, "auto");
    updateActive();

    let raf = 0;
    let snapTimer = 0;
    const handleScroll = () => {
      if (rail.scrollLeft >= setWidth * 2) rail.scrollLeft -= setWidth;
      else if (rail.scrollLeft < setWidth) rail.scrollLeft += setWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
      // Once the swipe settles, snap the nearest circle to the exact center.
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        const active = activeGlobalRef.current;
        if (active === null) return;
        const item = rail.querySelector<HTMLElement>(
          `[data-global-index="${active}"]`,
        );
        if (!item) return;
        const distance = Math.abs(
          item.offsetLeft + item.offsetWidth / 2 -
            (rail.scrollLeft + rail.clientWidth / 2),
        );
        if (distance > 2) centerCategory(active % categoriesRef.current.length, "smooth");
      }, 150);
    };
    rail.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(snapTimer);
      rail.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateActive);
    };
  }, [count, initialIndex]);

  if (count === 0) return null;

  return (
    <div
      ref={railRef}
      className="relative overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max px-5 pt-4 pb-5">
        {[0, 1, 2].map((copyIndex) => (
          <CategorySet
            key={copyIndex}
            copyIndex={copyIndex}
            activeGlobal={activeGlobal}
            onSelect={centerCategory}
            categories={categories}
          />
        ))}
      </div>
    </div>
  );
}
