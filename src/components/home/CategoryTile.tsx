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
   * `default` = home horizontal rail (square image + label under).
   * `sidebar` = categories browser column (smaller, full-width hit target).
   */
  size?: "default" | "sidebar";
  /**
   * Home rail chrome only (ignored for sidebar).
   * `pill` = Style 2 tall capsule (playground first; /home stays `card`).
   */
  variant?: "card" | "pill";
};

/** Rounded category card — home rail or categories sidebar. */
export function CategoryTile({
  name,
  image = "",
  active = false,
  onClick,
  slug,
  size = "default",
  variant = "card",
}: CategoryTileProps) {
  const src = image || CATEGORY_IMAGE_FALLBACK;
  const sidebar = size === "sidebar";
  const pill = !sidebar && variant === "pill";

  if (pill) {
    return (
      <button
        type="button"
        data-slug={slug}
        aria-pressed={active}
        aria-label={`Show ${name}`}
        onClick={onClick}
        className="flex w-[4.75rem] shrink-0 snap-start cursor-pointer flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf sm:w-[5.25rem]"
      >
        <span
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-[1.85rem] px-1.5 pt-2.5 pb-2 transition duration-300",
            active
              ? "bg-gradient-to-b from-leaf to-forest text-white shadow-[0_6px_14px_rgba(47,107,47,0.28)]"
              : "bg-white text-black ring-1 ring-black/[0.08] hover:bg-mint/50",
          )}
        >
          {image ? (
            <span
              className={cn(
                "relative grid size-11 place-items-center overflow-hidden rounded-full sm:size-12",
                active
                  ? "bg-white shadow-sm ring-2 ring-white/70"
                  : "bg-[#f3faf3] ring-1 ring-black/[0.06]",
              )}
            >
              <CatalogImage
                src={src}
                alt=""
                width={96}
                height={96}
                className={
                  isCategoryImageFallback(src)
                    ? "h-full w-full bg-white object-contain p-1"
                    : "h-full w-full object-cover"
                }
              />
            </span>
          ) : (
            <span
              className={cn(
                "grid size-11 place-items-center sm:size-12",
                active ? "text-white" : "text-leaf",
              )}
            >
              <LayoutGrid
                aria-hidden
                className="size-7"
                strokeWidth={2.25}
              />
            </span>
          )}
          <span
            className={cn(
              "line-clamp-2 min-h-[1.6rem] w-full px-0.5 text-center text-[10px] leading-tight sm:text-[11px]",
              active ? "font-bold text-white" : "font-semibold text-black",
            )}
          >
            {name}
          </span>
        </span>
      </button>
    );
  }

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
