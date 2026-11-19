"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import {
  CategoryTile,
} from "@/components/home/CategoryTile";
import { cn } from "@/lib/cn";
import {
  CATEGORY_IMAGE_FALLBACK,
  isCategoryImageFallback,
} from "@/lib/category-image";

type CategoryCardProps = {
  name: string;
  /** When empty (and no fallback), shows the grid icon. */
  image?: string;
  active?: boolean;
  onClick?: () => void;
  slug?: string;
  /**
   * `default` / `sidebar` — home rail & PLP (via CategoryTile).
   * `hub` — full-width categories hub / aisle plate.
   */
  size?: "default" | "sidebar" | "hub";
  /** Home rail: `pill` = tall capsule. */
  variant?: "card" | "pill";
  /** Hub tiles may navigate instead of onClick. */
  href?: string;
  /** Hub image plate height class. */
  hubHeightClass?: string;
  /** Prefer full name on wide hub tiles. */
  hubWide?: boolean;
};

/**
 * Phase B #28 — shared category card: image if present, else icon + name.
 * Home rail, categories browser, and hub all import this.
 */
export function CategoryCard({
  name,
  image = "",
  active,
  onClick,
  slug,
  size = "default",
  variant = "card",
  href,
  hubHeightClass = "h-[6.25rem]",
  hubWide = false,
}: CategoryCardProps) {
  if (size !== "hub") {
    return (
      <CategoryTile
        name={name}
        image={image}
        active={active}
        onClick={onClick}
        slug={slug}
        size={size}
        variant={variant}
      />
    );
  }

  const src = image || CATEGORY_IMAGE_FALLBACK;
  const showIcon = !image;
  const placeholder = showIcon || isCategoryImageFallback(src);

  const body = (
    <>
      <span
        className={cn(
          "relative block w-full overflow-hidden rounded-[1.15rem] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]",
          placeholder ? "bg-white" : "bg-[#efe6da]",
          hubHeightClass,
        )}
      >
        {showIcon ? (
          <span className="grid h-full w-full place-items-center text-leaf">
            <LayoutGrid className="size-7" strokeWidth={2.25} aria-hidden />
          </span>
        ) : (
          <CatalogImage
            src={src}
            alt=""
            fill
            sizes={hubWide ? "66vw" : "25vw"}
            className={
              placeholder
                ? "bg-white object-contain"
                : "object-cover transition duration-300 group-hover:scale-[1.04]"
            }
          />
        )}
      </span>
      <span className="mt-1.5 line-clamp-2 min-h-[2.1rem] w-full text-center text-[12px] leading-tight font-extrabold text-forest">
        {name}
      </span>
    </>
  );

  const className =
    "group flex w-full min-w-0 cursor-pointer flex-col items-stretch transition-transform duration-150 ease-out motion-safe:active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

  if (href) {
    return (
      <Link
        href={href}
        transitionTypes={["nav-forward"]}
        className={className}
        aria-label={name}
        data-slug={slug}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={name}
      data-slug={slug}
      aria-pressed={active}
    >
      {body}
    </button>
  );
}
