"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus } from "lucide-react";
import type { SampleProduct } from "@/lib/sample-products";
import { useCart } from "@/components/cart/CartContext";

/**
 * Hanging ribbon with an exact vector finish: the path's arc is a
 * true 24px radius matching the card's rounded-[1.5rem] corner,
 * and the bottom is a precise V notch. (A clip-path polygon can only
 * approximate the arc with facets, which left a white bite.)
 */
function Ribbon({
  fill,
  line1,
  line2,
}: {
  fill: string;
  line1: string;
  line2: string;
}) {
  return (
    <span className="absolute top-0 left-0 z-10 block h-14 w-11" aria-hidden>
      <svg
        viewBox="0 0 44 56"
        className="absolute inset-0 h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)]"
      >
        <path d="M0 24 A24 24 0 0 1 24 0 H44 V56 L22 44 L0 56 Z" fill={fill} />
      </svg>
      {/* Text centered within the ribbon BODY (top 44px; the V-notch
          tail below it is excluded so centering is exact). */}
      <span className="absolute inset-x-0 top-0 flex h-11 flex-col items-center justify-center text-center text-[10px] leading-[1.2] font-bold text-white">
        <span>{line1}</span>
        <span>{line2}</span>
      </span>
    </span>
  );
}

/**
 * Product card: photo panel, name, unit, then a bottom row with the
 * price and a dark squircle add button that expands into a quantity
 * stepper (count pops on change). Wishlist heart lives on the photo.
 * All interaction is local state in this phase; when a real cart
 * exists, qty/wishlist lift into it without changing this layout.
 */
export function ProductCard({ product }: { product: SampleProduct }) {
  const [wishlisted, setWishlisted] = useState(false);
  const { getItem, setQty, setCustomizing } = useCart();
  const cartItem = getItem(product.id);
  const qty = cartItem?.qty ?? 0;
  const weightKg = cartItem?.weightKg;

  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <article className="relative flex flex-col rounded-[1.5rem] bg-white p-2.5 shadow-[0_8px_24px_rgba(47,107,47,0.08)] ring-1 ring-black/5">
      {/* Ribbon: badge (purple) takes priority, else auto % OFF (red) */}
      {product.badge ? (
        <Ribbon
          fill="#6a32e1"
          line1={product.badge.split(" ")[0]}
          line2={product.badge.split(" ").slice(1).join(" ")}
        />
      ) : discount > 0 ? (
        <Ribbon fill="#dc2626" line1={`${discount}%`} line2="OFF" />
      ) : null}

      {/* Wishlist heart (white circle keeps it visible on any photo) */}
      <button
        type="button"
        onClick={() => setWishlisted((w) => !w)}
        aria-pressed={wishlisted}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className="absolute top-[1.125rem] right-[1.125rem] z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(47,107,47,0.16)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <Heart
          className={`h-4 w-4 transition ${wishlisted ? "fill-red-500 text-red-500" : "text-forest/70"}`}
          aria-hidden
        />
      </button>

      {/* Photo + title → PDP; cart controls stay outside the link */}
      <Link
        href={`/product/${product.id}`}
        className="block rounded-2xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-leaf"
      >
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[#f4f6f8]">
          <Image
            src={product.image}
            alt={product.name}
            width={300}
            height={300}
            className="h-full w-full object-cover"
          />
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-[15px] leading-5 font-bold text-ink">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-muted">{product.unit}</p>
      </Link>

      {/* Price + add/stepper */}
      <div className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-3">
        {/* Prices stacked: offer price, cut price below it — keeps
            3–4 digit prices from overflowing beside the stepper. */}
        <p className="flex min-w-0 flex-col">
          <span className="text-lg leading-tight font-extrabold whitespace-nowrap text-black tabular-nums">
            ₹{product.price}
          </span>
          {discount > 0 && (
            <span className="text-[11px] leading-tight font-medium whitespace-nowrap text-muted tabular-nums line-through">
              ₹{product.mrp}
            </span>
          )}
        </p>

        {product.customization ? (
          // Weight-customizable: + opens the ruler sheet; once added,
          // the button shows the chosen weight and reopens the sheet.
          <button
            type="button"
            onClick={() => setCustomizing(product)}
            aria-label={
              weightKg
                ? `Change weight of ${product.name}, currently ${weightKg} kilograms`
                : `Choose weight for ${product.name}`
            }
            className={`grid h-10 shrink-0 cursor-pointer place-items-center bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
              weightKg ? "rounded-[0.9rem] px-3 text-[13px] font-extrabold whitespace-nowrap" : "w-10 rounded-[0.9rem]"
            }`}
          >
            {weightKg ? (
              <span key={weightKg} className="qty-pop text-black">
                {Number.isInteger(weightKg) ? weightKg : weightKg.toFixed(1)} kg
              </span>
            ) : (
              <Plus className="h-5 w-5 text-black" aria-hidden />
            )}
          </button>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => setQty(product.id, 1)}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[0.9rem] bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <Plus className="h-5 w-5 text-black" aria-hidden />
          </button>
        ) : (
          <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-[0.9rem] bg-track px-1 text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)]">
            <button
              type="button"
              onClick={() => setQty(product.id, qty - 1)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            {/* key remounts the number so it pops on every change */}
            <span
              key={qty}
              className="qty-pop min-w-4 text-center text-[13px] font-extrabold text-black tabular-nums"
              aria-live="polite"
              aria-label={`Quantity ${qty}`}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(product.id, qty + 1)}
              aria-label={`Increase quantity of ${product.name}`}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
