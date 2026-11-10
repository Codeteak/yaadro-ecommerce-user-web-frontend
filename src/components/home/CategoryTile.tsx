"use client";

import { LayoutGrid } from "lucide-react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { cn } from "@/lib/cn";
import {
  CATEGORY_IMAGE_FALLBACK,
  isCategoryImageFallback,
} from "@/lib/category-image";

type CategoryTileProps = {
  name: string;
  /** Empty when the tile is All, or when no photo was uploaded. */
  image?: string;
  active?: boolean;
  onClick?: () => void;
  /** Rail scroll target. */
  slug?: string;
};

/** Same rounded category card used on Home. */
export function CategoryTile({
  name,
  image = "",
  active = false,
  onClick,
  slug,
}: CategoryTileProps) {
  const src = image || CATEGORY_IMAGE_FALLBACK;

  return (
    <button
      type="button"
      data-slug={slug}
      aria-pressed={active}
      aria-label={`Show ${name}`}
      onClick={onClick}
      className="flex w-[4.5rem] shrink-0 snap-start cursor-pointer flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
    >
      <span
        className={cn(
          "grid h-[4.75rem] w-[4.5rem] place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_18px_rgba(47,107,47,0.14)] ring-2 transition duration-300",
          active ? "category-selected-pop ring-leaf" : "ring-white",
        )}
      >
        {image ? (
          <CatalogImage
            src={src}
            alt=""
            width={136}
            height={136}
            className={
              isCategoryImageFallback(src)
                ? "h-full w-full bg-white object-contain"
                : "h-full w-full object-cover"
            }
          />
        ) : (
          <LayoutGrid aria-hidden className="size-7 text-leaf" strokeWidth={2.25} />
        )}
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-xs text-black",
          active ? "font-bold" : "font-medium",
        )}
      >
        {name}
      </span>
    </button>
  );
}
