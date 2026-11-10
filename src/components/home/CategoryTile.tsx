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
  /**
   * `default` = home horizontal rail.
   * `sidebar` = categories browser column (smaller, full-width hit target).
   */
  size?: "default" | "sidebar";
};

/** Rounded category card — home rail or categories sidebar. */
export function CategoryTile({
  name,
  image = "",
  active = false,
  onClick,
  slug,
  size = "default",
}: CategoryTileProps) {
  const src = image || CATEGORY_IMAGE_FALLBACK;
  const sidebar = size === "sidebar";

  return (
    <button
      type="button"
      data-slug={slug}
      aria-pressed={active}
      aria-label={`Show ${name}`}
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
        sidebar
          ? cn(
              "w-full gap-1 rounded-2xl px-1 py-2.5 transition",
              active ? "bg-mint/55" : "hover:bg-mint/30",
            )
          : "w-[4.5rem] snap-start gap-1.5 focus-visible:outline-offset-4",
      )}
    >
      <span
        className={cn(
          "grid place-items-center overflow-hidden bg-white transition duration-300",
          sidebar
            ? cn(
                "size-12 rounded-xl ring-2",
                active
                  ? "shadow-[0_4px_12px_rgba(47,107,47,0.2)] ring-leaf"
                  : "ring-black/[0.06]",
              )
            : cn(
                "h-[4.75rem] w-[4.5rem] rounded-2xl shadow-[0_8px_18px_rgba(47,107,47,0.14)] ring-2",
                active ? "category-selected-pop ring-leaf" : "ring-white",
              ),
        )}
      >
        {image ? (
          <CatalogImage
            src={src}
            alt=""
            width={sidebar ? 96 : 136}
            height={sidebar ? 96 : 136}
            className={
              isCategoryImageFallback(src)
                ? "h-full w-full bg-white object-contain"
                : "h-full w-full object-cover"
            }
          />
        ) : (
          <LayoutGrid
            aria-hidden
            className={cn("text-leaf", sidebar ? "size-5" : "size-7")}
            strokeWidth={2.25}
          />
        )}
      </span>
      <span
        className={cn(
          "w-full text-center text-black",
          sidebar
            ? cn(
                "line-clamp-2 px-0.5 text-[11px] leading-tight",
                active ? "font-extrabold text-leaf" : "font-semibold",
              )
            : cn(
                "truncate text-xs",
                active ? "font-bold" : "font-medium",
              ),
        )}
      >
        {name}
      </span>
    </button>
  );
}
