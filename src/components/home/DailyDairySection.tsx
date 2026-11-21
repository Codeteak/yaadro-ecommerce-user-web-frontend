"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";
import {
  DAILY_DAIRY_SECTION_BG,
  DAIRY_ART_H,
  DAIRY_ART_W,
  SAMPLE_DAIRY_SHELF,
  productsForDairyCategory,
  type DairyShelf,
} from "@/lib/daily-dairy";
import { PRODUCT_CAROUSEL_SLOT } from "@/lib/product-card-layout";

const PEEK_LIMIT = 8;

/** Shared home-section CTA copy (produce uses “Browse all”; festive “See all offers”). */
export const DAIRY_SEE_ALL_LABEL = "See all";

/** Playground layout experiments. */
export type DailyDairyLayout = "on-art" | "overlap" | "split";

/**
 * Daily dairy home band — image card sized to the art (682×1024) so the
 * long yellow top stays fully visible for black type.
 */
export function DailyDairySection({
  className,
  shelf = SAMPLE_DAIRY_SHELF,
  browseHref = "/dairy",
  priority = false,
  layout = "on-art",
}: {
  className?: string;
  shelf?: DairyShelf | null;
  browseHref?: string;
  priority?: boolean;
  layout?: DailyDairyLayout;
}) {
  const categories = shelf?.categories?.filter((c) => c.name.trim()) ?? [];
  const showCategoryRail = categories.length > 0;
  const [selectedSlug, setSelectedSlug] = useState<string>("all");

  const catalog = shelf?.products ?? [];
  const products = useMemo(
    () =>
      productsForDairyCategory(
        catalog,
        showCategoryRail ? selectedSlug : "all",
      ).slice(0, PEEK_LIMIT),
    [catalog, selectedSlug, showCategoryRail],
  );

  if (!shelf || catalog.length === 0) return null;

  const title = shelf.title.trim() || "Daily dairy";
  const selectedName =
    selectedSlug === "all"
      ? title
      : (categories.find((c) => c.slug === selectedSlug)?.name ?? title);

  const categoryRail = showCategoryRail ? (
    <DairyCategoryChips
      title={title}
      categories={categories}
      selectedSlug={selectedSlug}
      onSelect={setSelectedSlug}
    />
  ) : null;

  const header = (
    <div className="text-center">
      <p className="text-[11px] font-bold tracking-[0.2em] text-black/70 uppercase">
        Fresh every morning
      </p>
      <h2 className="mt-1.5 text-[1.7rem] leading-tight font-extrabold tracking-tight text-black sm:text-[1.85rem]">
        {title}
      </h2>
      {shelf.subtitle?.trim() ? (
        <p className="mx-auto mt-1.5 max-w-[17rem] text-[13px] leading-5 font-medium text-black/75">
          {shelf.subtitle.trim()}
        </p>
      ) : null}
      {categoryRail ? <div className="mt-5">{categoryRail}</div> : null}
    </div>
  );

  const bottomFade =
    layout === "split"
      ? "from-black/80 via-black/35 to-transparent h-[58%]"
      : "from-black/35 via-black/10 to-transparent h-[42%]";

  const productLabelTone =
    layout === "split" ? "text-white/85" : "text-black/70";

  // overlap: products outside the art frame
  if (layout === "overlap") {
    return (
      <section
        aria-label={title}
        className={cn("relative w-full bg-paper px-3 pt-5 pb-2 sm:px-4", className)}
      >
        <div className="relative mx-auto w-full max-w-lg">
          <div
            className="relative w-full overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(80,60,20,0.28)] ring-1 ring-black/[0.08]"
            style={{ aspectRatio: `${DAIRY_ART_W} / ${DAIRY_ART_H}` }}
          >
            <DairyArtImage priority={priority} />
            <div className="relative z-10 px-5 pt-8 pb-40 text-center">
              {header}
            </div>
          </div>
          <div className="relative z-20 -mt-28 space-y-3 px-2 pb-4">
            <DairyProductRail
              products={products}
              selectedKey={selectedSlug}
              emptyTone="ink"
            />
            <SeeAllButton href={browseHref} />
          </div>
        </div>
      </section>
    );
  }

  // A (on-art) + C (split / fade) — same natural art frame
  return (
    <section
      aria-label={title}
      className={cn("relative w-full bg-paper px-3 py-5 sm:px-4", className)}
    >
      <div
        className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.75rem] shadow-[0_16px_40px_rgba(80,60,20,0.28)] ring-1 ring-black/[0.08]"
        style={{ aspectRatio: `${DAIRY_ART_W} / ${DAIRY_ART_H}` }}
      >
        <DairyArtImage priority={priority} />
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t",
            bottomFade,
          )}
          aria-hidden
        />

        <div className="absolute inset-0 z-10 flex flex-col gap-4 px-4 pt-8 pb-5 sm:px-5 sm:pt-9 sm:pb-6">
          {header}
          <div className="mt-auto space-y-3">
            <p className={cn("px-0.5 text-[12px] font-semibold", productLabelTone)}>
              {selectedName} · swipe
            </p>
            <DairyProductRail
              products={products}
              selectedKey={selectedSlug}
              elevated
              emptyTone={layout === "split" ? "light" : "ink"}
            />
            <SeeAllButton href={browseHref} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Full art, no crop — card aspect matches 682×1024 so yellow top stays.
 */
function DairyArtImage({ priority }: { priority?: boolean }) {
  return (
    <Image
      src={DAILY_DAIRY_SECTION_BG}
      alt=""
      fill
      priority={priority}
      sizes="(max-width: 512px) 100vw, 512px"
      className="object-cover object-center"
    />
  );
}

/** Ecom theme CTA — same track green as festive / empty-state primaries. */
function SeeAllButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-11 w-full items-center justify-center rounded-full bg-track text-[13px] font-bold text-black shadow-[0_8px_20px_rgba(47,107,47,0.28)] transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      {DAIRY_SEE_ALL_LABEL}
    </Link>
  );
}

/**
 * Same shape as Fruits & veggies: rounded-full pills + circular thumb images.
 */
function DairyCategoryChips({
  title,
  categories,
  selectedSlug,
  onSelect,
}: {
  title: string;
  categories: { id: string; name: string; slug: string; image: string }[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2.5"
      role="tablist"
      aria-label={`${title} categories`}
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedSlug === "all"}
        onClick={() => onSelect("all")}
        className={cn(
          "rounded-full px-4 py-2 text-[13px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          selectedSlug === "all"
            ? "bg-track text-black"
            : "bg-white text-forest ring-1 ring-white/40 hover:bg-mint",
        )}
      >
        All
      </button>
      {categories.map((cat) => {
        const active = selectedSlug === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "flex items-center gap-2 rounded-full py-2 pr-3.5 pl-2 text-[13px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              active
                ? "bg-track text-black"
                : "bg-white text-forest ring-1 ring-white/40 hover:bg-mint",
            )}
          >
            <span
              className={cn(
                "relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#efe6da] ring-2",
                active ? "ring-white/90" : "ring-forest/10",
              )}
            >
              <Image
                src={cat.image}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </span>
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function DairyProductRail({
  products,
  selectedKey,
  size = "default",
  elevated = false,
  emptyTone = "light",
}: {
  products: ReturnType<typeof productsForDairyCategory>;
  selectedKey: string;
  size?: "default" | "compact";
  elevated?: boolean;
  emptyTone?: "light" | "ink";
}) {
  if (products.length === 0) {
    return (
      <p
        className={cn(
          "px-1 py-6 text-center text-sm font-medium",
          emptyTone === "ink" ? "text-black/60" : "text-white/70",
        )}
      >
        Nothing in this aisle yet.
      </p>
    );
  }

  return (
    <div
      key={selectedKey}
      className="flex gap-3 overflow-x-auto overscroll-x-contain px-0.5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {products.map((product) => (
        <div
          key={product.id}
          className={cn(
            PRODUCT_CAROUSEL_SLOT,
            "shrink-0",
            elevated && "rounded-[1.25rem] shadow-[0_12px_28px_rgba(0,0,0,0.28)]",
          )}
        >
          <ProductCard product={product} size={size} />
        </div>
      ))}
      <div className="w-2 shrink-0" aria-hidden />
    </div>
  );
}

/** Playground helper — label above a layout experiment. */
export function DailyDairyLayoutLabel({
  letter,
  name,
  blurb,
  children,
}: {
  letter: string;
  name: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="px-4">
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#b45309] uppercase">
          Layout {letter} · {name}
        </p>
        <p className="mt-0.5 text-[12px] leading-5 text-muted">{blurb}</p>
      </div>
      {children}
    </div>
  );
}
