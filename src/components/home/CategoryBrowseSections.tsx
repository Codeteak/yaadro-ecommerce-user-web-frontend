"use client";

import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { cn } from "@/lib/cn";
import {
  CATEGORY_IMAGE_FALLBACK,
  isCategoryImageFallback,
} from "@/lib/category-image";
import type { CategoryBrowseSection } from "@/lib/home-category-browse";
import { SAMPLE_CATEGORY_BROWSE_SECTIONS } from "@/lib/home-category-browse";
import {
  resolveHubTileShape,
  resolveHubTileSpan,
  type CatalogSectionLayout,
} from "@/lib/catalog-taxonomy";

/** Shared tile height so rect + square align in a row. */
const TILE_H = "h-[6.25rem]";

export type CategoryBrowseSectionsProps = {
  /** Omit to use rich sample sections (playground). */
  sections?: CategoryBrowseSection[];
  className?: string;
  /** Defaults to `/categories/[slug]`. */
  hrefFor?: (slug: string) => string;
  /**
   * Grid shape mix. `uniform` = all squares.
   * `rect-first` = first tile wide (2 cols), rest squares — hub Fresh layout.
   */
  layout?: CatalogSectionLayout;
};

/**
 * Home aisle browse: bold section titles + subcategory tiles.
 * Same `max-w-lg` phone column as the rest of /home (avoids full-bleed
 * left-hugging tiles on monitor). Chrome = mint plate + white inset.
 */
export function CategoryBrowseSections({
  sections = SAMPLE_CATEGORY_BROWSE_SECTIONS,
  className,
  hrefFor = (slug) => `/categories/${slug}`,
  layout = "uniform",
}: CategoryBrowseSectionsProps) {
  if (sections.length === 0) return null;

  return (
    <div className={cn("w-full bg-paper", className)}>
      <div className="mx-auto w-full max-w-lg px-4 pb-2 sm:px-5">
        {sections.map((section) => (
          <section key={section.id} className="pt-6 first:pt-4">
            <h2 className="text-[1.35rem] leading-tight font-extrabold tracking-tight text-ink">
              {section.title}
            </h2>
            <ul className="mt-3.5 grid w-full grid-cols-4 gap-x-2.5 gap-y-4">
              {section.tiles.map((item, index) => {
                const shape = resolveHubTileShape(layout, index);
                const span = resolveHubTileSpan(layout, index, shape);
                const src = item.image || CATEGORY_IMAGE_FALLBACK;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "min-w-0",
                      span === 3
                        ? "col-span-3"
                        : span === 2
                          ? "col-span-2"
                          : "col-span-1",
                    )}
                  >
                    <Link
                      href={hrefFor(item.slug)}
                      aria-label={item.name}
                      className="flex w-full min-w-0 flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      <span
                        className={cn(
                          "relative block w-full overflow-hidden rounded-2xl bg-mint p-1.5 ring-1 ring-forest/8",
                          layout === "uniform" ? "aspect-square" : TILE_H,
                        )}
                      >
                        <span className="relative block h-full w-full overflow-hidden rounded-[0.85rem] bg-white">
                          <CatalogImage
                            src={src}
                            alt=""
                            fill
                            sizes={
                              shape === "rect"
                                ? "(max-width: 512px) 50vw, 256px"
                                : "(max-width: 512px) 25vw, 128px"
                            }
                            className={
                              isCategoryImageFallback(src)
                                ? "object-contain p-2"
                                : "object-cover"
                            }
                          />
                        </span>
                      </span>
                      <span className="mt-1.5 line-clamp-2 min-h-[2.1rem] w-full text-center text-[11px] leading-snug font-semibold text-black/85">
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
