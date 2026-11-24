"use client";

import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { rememberProduct } from "@/lib/product-snapshots";
import { Heart, Minus, Plus } from "lucide-react";
import type { SampleProduct } from "@/lib/sample-products";
import { useCartLine, useSetCustomizing } from "@/components/cart/CartContext";
import { setCartQty } from "@/lib/cart-store";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { useWishlistToggle } from "@/components/wishlist/useWishlistToggle";
import { catalogPriceDisplay } from "@/lib/catalog-price-display";
import { MAX_LINE_QUANTITY } from "@/lib/cart-checkout-rules";
import { cn } from "@/lib/cn";
import { productPhoto } from "@/lib/product-image";
import { formatKgAmount } from "@/lib/qty-label";

/**
 * Hanging % OFF ribbon. Matching card corner radius + V notch.
 * No SVG drop-shadow (that left white fringe on the sides). Same-color
 * stroke seals anti-aliased edges; shape bleeds under card overflow clip.
 */
function Ribbon({
  fill,
  line1,
  line2,
  compact,
}: {
  fill: string;
  line1: string;
  line2: string;
  compact?: boolean;
}) {
  // viewBox padded so path bleed isn’t clipped by the SVG viewport
  const vb = compact
    ? { w: 40, h: 48, path: "M0 14 A14 14 0 0 1 14 0 H40 V48 L20 38 L0 48 Z" }
    : { w: 48, h: 60, path: "M0 22 A22 22 0 0 1 22 0 H48 V60 L24 48 L0 60 Z" };

  return (
    <span
      className={cn(
        "pointer-events-none absolute z-10 block",
        compact ? "top-0 left-0 h-11 w-9" : "top-0 left-0 h-14 w-11",
      )}
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        className="absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible"
        aria-hidden
      >
        <path
          d={vb.path}
          fill={fill}
          stroke={fill}
          strokeWidth={2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={cn(
          "absolute inset-x-0 top-0 flex flex-col items-center justify-center text-center font-bold text-white",
          compact
            ? "h-9 text-[8px] leading-[1.15]"
            : "h-11 text-[10px] leading-[1.2]",
        )}
      >
        <span>{line1}</span>
        <span>{line2}</span>
      </span>
    </span>
  );
}

export type ProductCardSize = "default" | "compact";

/**
 * Product card: square photo, two-line name, unit, then price and add.
 * The photo fills the card width. Height follows the content, so a row
 * matches the tallest card. `compact` stays the short rail size.
 */
export function ProductCard({
  product,
  size = "default",
  /** First above-fold home cards — LCP / eager load. */
  priority = false,
}: {
  product: SampleProduct;
  size?: ProductCardSize;
  priority?: boolean;
}) {
  const compact = size === "compact";
  const t = useTypeScale();
  const { wishlisted, onToggle: onWishlistClick, ariaLabel } = useWishlistToggle(product);
  const setCustomizing = useSetCustomizing();
  const cartItem = useCartLine(product.id);
  const qty = cartItem?.qty ?? 0;
  const weightKg = cartItem?.weightKg;

  // Weight cards show min-step amount (₹25 / 250 g), not the raw ₹/kg rate.
  const display = catalogPriceDisplay(product);
  const discount =
    display.mrp > display.price
      ? Math.round(((display.mrp - display.price) / display.mrp) * 100)
      : 0;
  const photo = productPhoto(product.image);

  const addBtn = compact
    ? "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    : "grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[0.9rem] bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf max-[390px]:h-10 max-[390px]:w-10";

  return (
    <article
      className={cn(
        /* Flat on paper — ring only, no drop shadow (same idea as pill rail) */
        "relative isolate flex flex-col overflow-hidden bg-white ring-1 ring-black/[0.06]",
        compact ? "h-[13.5rem] rounded-xl p-2" : "h-full rounded-[20px]",
      )}
    >
      {product.badge ? (
        <Ribbon
          compact={compact}
          fill="#6a32e1"
          line1={product.badge.split(" ")[0]}
          line2={product.badge.split(" ").slice(1).join(" ")}
        />
      ) : discount > 0 ? (
        <Ribbon
          compact={compact}
          fill="#dc2626"
          line1={`${discount}%`}
          line2="OFF"
        />
      ) : null}

      <button
        type="button"
        onClick={onWishlistClick}
        aria-pressed={wishlisted}
        aria-label={ariaLabel}
        className={cn(
          "absolute z-10 flex cursor-pointer items-center justify-center rounded-full bg-white transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
          compact
            ? "top-2 right-2 h-7 w-7 shadow-[0_2px_8px_rgba(47,107,47,0.14)]"
            : "top-2.5 right-2.5 h-8 w-8 shadow-[0_4px_12px_rgba(47,107,47,0.16)]",
        )}
      >
        <Heart
          className={cn(
            "transition",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
            wishlisted ? "fill-red-500 text-red-500" : "text-forest/70",
          )}
          aria-hidden
        />
      </button>

      <Link
        href={`/product/${product.id}`}
        transitionTypes={["nav-forward"]}
        className={cn(
          "block outline-offset-2 focus-visible:outline-2 focus-visible:outline-leaf",
          compact ? "rounded-lg" : "rounded-2xl",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-[#f4f6f8]",
            compact
              ? "h-[105px] w-full rounded-lg"
              : // Slightly shorter photo on narrow phones so text+add don't make the card feel oversized (MULTI_PHONE_LAYOUT_PLAN).
                "aspect-square w-full rounded-t-[20px] max-[390px]:aspect-[5/4]",
          )}
        >
          <CatalogImage
            src={photo}
            alt={product.name}
            fill
            sizes={compact ? "220px" : "(max-width: 512px) 50vw, 300px"}
            priority={priority}
            style={{ objectFit: "contain" }}
            className="bg-[#f4f6f8] object-contain"
          />
        </div>
        <div className={compact ? undefined : "px-3 pt-1.5"}>
          <h3
            className={
              compact
                ? "mt-1.5 line-clamp-2 min-h-[2rem] text-[13px] leading-4 font-semibold text-ink"
                : t.productCardName
            }
          >
            {product.name}
          </h3>
          {!compact ? (
            <p className="mt-0.5 h-[14px] truncate text-[11px] leading-[14px] font-medium text-muted">
              {display.unitLabel}
            </p>
          ) : null}
        </div>
      </Link>

      <div
        className={cn(
          "mt-auto flex flex-nowrap items-center justify-between",
          compact ? "gap-1 pt-1.5" : "min-h-5 items-end gap-2 px-3 pt-0.5 pb-2",
        )}
      >
        <p className="flex min-w-0 flex-col">
          <span
            className={cn(
              "leading-tight font-extrabold whitespace-nowrap text-black tabular-nums",
              compact ? "text-[15px]" : "text-base",
            )}
          >
            ₹{display.price}
          </span>
          {compact ? (
            <span className="truncate text-[10px] leading-tight font-medium text-muted">
              {display.unitLabel}
            </span>
          ) : null}
          {discount > 0 && (
            <span
              className={cn(
                "leading-tight font-medium whitespace-nowrap text-muted tabular-nums line-through",
                compact ? "text-[11px]" : "text-[11px]",
              )}
            >
              ₹{display.mrp}
            </span>
          )}
        </p>

        {product.customization ? (
          weightKg ? (
            <button
              type="button"
              onClick={() => {
                rememberProduct(product);
                setCustomizing(product);
              }}
              aria-label={`Change weight of ${product.name}, currently ${weightKg} kilograms`}
              className={
                compact
                  ? "grid h-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-track px-2 text-[11px] font-extrabold whitespace-nowrap text-black shadow-[0_4px_12px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  : "grid h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-[0.9rem] bg-track px-3 text-[13px] font-extrabold whitespace-nowrap text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              }
            >
              <span key={weightKg} className="qty-pop text-black">
                {formatKgAmount(weightKg)} kg
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                rememberProduct(product);
                setCustomizing(product);
              }}
              aria-label={`Add ${product.name} to cart — choose weight`}
              className={addBtn}
            >
              <Plus
                className={compact ? "h-4 w-4 text-black" : "h-5 w-5 text-black"}
                aria-hidden
              />
            </button>
          )
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => {
              rememberProduct(product);
              setCartQty(product.id, 1);
            }}
            aria-label={`Add ${product.name} to cart`}
            className={addBtn}
          >
            <Plus className={compact ? "h-4 w-4 text-black" : "h-5 w-5 text-black"} aria-hidden />
          </button>
        ) : (
          <div
            className={cn(
              "flex shrink-0 items-center bg-track text-black",
              compact
                ? "h-8 gap-0 rounded-lg px-0.5 shadow-[0_4px_12px_rgba(47,107,47,0.3)]"
                : "h-11 gap-0.5 rounded-[0.9rem] px-1 shadow-[0_8px_18px_rgba(47,107,47,0.35)] max-[390px]:h-10",
            )}
          >
            <button
              type="button"
              onClick={() => setCartQty(product.id, qty - 1)}
              aria-label={`Decrease quantity of ${product.name}`}
              className={cn(
                "grid cursor-pointer place-items-center rounded-md text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf",
                compact ? "h-6 w-6" : "h-7 w-7 rounded-lg",
              )}
            >
              <Minus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            </button>
            <span
              key={qty}
              className={cn(
                "qty-pop text-center font-extrabold text-black tabular-nums",
                compact ? "min-w-3 text-[11px]" : "min-w-4 text-[13px]",
              )}
              aria-live="polite"
              aria-label={`Quantity ${qty}`}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() =>
                setCartQty(product.id, Math.min(MAX_LINE_QUANTITY, qty + 1))
              }
              disabled={qty >= MAX_LINE_QUANTITY}
              aria-label={`Increase quantity of ${product.name}`}
              className={cn(
                "grid cursor-pointer place-items-center rounded-md text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-40",
                compact ? "h-6 w-6" : "h-7 w-7 rounded-lg",
              )}
            >
              <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
