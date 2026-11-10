"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryTile } from "@/components/home/CategoryTile";
import { useHomeCategoryOptional } from "@/components/home/HomeCategoryContext";
import { ALL_CATEGORY_SLUG, HOME_CATEGORIES } from "@/lib/home-categories";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";

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
};

/**
 * Flat category strip. All is first and selected on open.
 * The tile at the front is highlighted; scrolling or tapping updates it.
 */
export function CategoryRail({
  categories = SAMPLE_RAIL,
  imageFallback = FALLBACK_IMAGE,
}: CategoryRailProps) {
  const homeCategory = useHomeCategoryOptional();
  const [localSelected, setLocalSelected] = useState(ALL_CATEGORY_SLUG);
  const selected = homeCategory?.selected ?? localSelected;
  const setSelected = homeCategory?.setSelected ?? setLocalSelected;
  const railRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const setSelectedRef = useRef(setSelected);
  const lockRef = useRef<string | null>(null);
  const items = useMemo(
    () => [
      { name: "All", slug: ALL_CATEGORY_SLUG, image: "" },
      ...categories.filter((category) => category.slug !== ALL_CATEGORY_SLUG),
    ],
    [categories],
  );

  selectedRef.current = selected;
  setSelectedRef.current = setSelected;

  const choose = (slug: string) => {
    lockRef.current = slug;
    selectedRef.current = slug;
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

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let raf = 0;
    const update = () => {
      const origin = rail.scrollLeft + insetOf(rail);
      let nearest: string | null = null;
      let nearestDistance = Infinity;
      rail.querySelectorAll<HTMLElement>("[data-slug]").forEach((item) => {
        const distance = Math.abs(item.offsetLeft - origin);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = item.dataset.slug ?? null;
        }
      });
      if (lockRef.current) {
        if (nearest === lockRef.current) lockRef.current = null;
        return;
      }
      if (!nearest || nearest === selectedRef.current) return;
      selectedRef.current = nearest;
      setSelectedRef.current(nearest);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const unlock = () => {
      lockRef.current = null;
    };

    update();
    rail.addEventListener("scroll", onScroll, { passive: true });
    rail.addEventListener("pointerdown", unlock);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("scroll", onScroll);
      rail.removeEventListener("pointerdown", unlock);
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      ref={railRef}
      className="relative overflow-x-auto scroll-smooth overscroll-x-contain snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max gap-4 px-5 py-3">
        {items.map((category) => (
          <CategoryTile
            key={category.slug}
            name={category.name}
            slug={category.slug}
            image={
              category.slug === ALL_CATEGORY_SLUG
                ? ""
                : category.image || imageFallback
            }
            active={selected === category.slug}
            onClick={() => choose(category.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function insetOf(rail: HTMLElement) {
  return rail.querySelector<HTMLElement>("[data-slug]")?.offsetLeft ?? 0;
}
