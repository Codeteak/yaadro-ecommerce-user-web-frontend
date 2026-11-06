"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { rememberProduct } from "@/lib/product-snapshots";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus } from "lucide-react";
import type { SampleProduct } from "@/lib/sample-products";
import { useCart } from "@/components/cart/CartContext";
import { useTypeScale } from "@/components/ui/TypeScaleContext";
import { useWishlistOptional } from "@/components/wishlist/WishlistContext";
import { cn } from "@/lib/cn";
import { isProductImageFallback, productPhoto } from "@/lib/product-image";

/**
 * Hanging ribbon with an exact vector finish: arc radius matches the card
 * corner (24px default / 12px compact), V notch at the bottom.
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
  if (compact) {
    return (
      <span
        className="absolute top-0 left-0 z-10 block h-11 w-9"
        aria-hidden
      >
        <svg
          viewBox="0 0 36 44"
          className="absolute inset-0 h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
        >
          <path
            d="M0 12 A12 12 0 0 1 12 0 H36 V44 L18 34 L0 44 Z"
            fill={fill}
          />
        </svg>
        <span className="absolute inset-x-0 top-0 flex h-9 flex-col items-center justify-center text-center text-[8px] leading-[1.15] font-bold text-white">
          <span>{line1}</span>
          <span>{line2}</span>
        </span>
      </span>
    );
  }

  return (
    <span className="absolute top-0 left-0 z-10 block h-14 w-11" aria-hidden>
      <svg
        viewBox="0 0 44 56"
        className="absolute inset-0 h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)]"
      >
        <path d="M0 24 A24 24 0 0 1 24 0 H44 V56 L22 44 L0 56 Z" fill={fill} />
      </svg>
      <span className="absolute inset-x-0 top-0 flex h-11 flex-col items-center justify-center text-center text-[10px] leading-[1.2] font-bold text-white">
        <span>{line1}</span>
        <span>{line2}</span>
      </span>
    </span>
  );
}

export type ProductCardSize = "default" | "compact";

/**
 * Product card: photo panel, name, unit, then a bottom row with the
 * price and a dark squircle add button that expands into a quantity
 * stepper. `compact` matches cart suggestion guidance (~150×210).
 */
export function ProductCard({
  product,
  size = "default",
}: {
  product: SampleProduct;
  size?: ProductCardSize;
}) {
  const compact = size === "compact";
  const router = useRouter();
  const t = useTypeScale();
  const wishlist = useWishlistOptional();
  const [localWishlisted, setLocalWishlisted] = useState(false);
  const { getItem, setQty, setCustomizing } = useCart();
  const cartItem = getItem(product.id);
  const qty = cartItem?.qty ?? 0;
  const weightKg = cartItem?.weightKg;
  const wishlisted = wishlist
    ? wishlist.signedIn && wishlist.has(product.id)
    : localWishlisted;

  const onWishlistClick = () => {
    if (!wishlist) {
      setLocalWishlisted((w) => !w);
      return;
    }
    if (!wishlist.signedIn) {
      router.push("/login");
      return;
    }
    rememberProduct(product);
    wishlist.toggle(product.id);
  };

  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const photo = productPhoto(product.image);
  const photoIsPlaceholder = isProductImageFallback(photo);

  const addBtn = compact
    ? "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    : "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-[0.9rem] bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf";

  return (
    <article
      className={cn(
        "relative isolate flex flex-col bg-white ring-1 ring-black/[0.06]",
        compact
          ? "h-[13.5rem] rounded-xl p-2 shadow-[0_1px_2px_rgba(47,107,47,0.06),0_4px_12px_rgba(47,107,47,0.08)]"
          : "h-full rounded-[1.5rem] p-2.5 shadow-[0_1px_2px_rgba(47,107,47,0.06),0_8px_20px_rgba(47,107,47,0.1)]",
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
        aria-label={
          wishlist && !wishlist.signedIn
            ? `Sign in to save ${product.name}`
            : wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
        }
        className={cn(
          "absolute z-10 flex cursor-pointer items-center justify-center rounded-full bg-white transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
          compact
            ? "top-2 right-2 h-7 w-7 shadow-[0_2px_8px_rgba(47,107,47,0.14)]"
            : "top-[1.125rem] right-[1.125rem] h-8 w-8 shadow-[0_4px_12px_rgba(47,107,47,0.16)]",
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
            "overflow-hidden",
            photoIsPlaceholder ? "bg-white" : "bg-[#f4f6f8]",
            compact ? "h-[105px] w-full rounded-lg" : "aspect-square rounded-2xl",
          )}
        >
          <CatalogImage
            src={photo}
            alt={product.name}
            width={compact ? 220 : 300}
            height={compact ? 105 : 300}
            style={{ objectFit: "contain" }}
            className="h-full w-full bg-white object-contain"
          />
        </div>
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
          <p className="mt-0.5 text-xs font-medium text-muted">{product.unit}</p>
        ) : null}
      </Link>

      <div
        className={cn(
          "mt-auto flex flex-nowrap items-center justify-between",
          compact ? "gap-1 pt-1.5" : "gap-2 pt-3",
        )}
      >
        <p className="flex min-w-0 flex-col">
          <span
            className={cn(
              "leading-tight font-extrabold whitespace-nowrap text-black tabular-nums",
              compact ? "text-[15px]" : "text-lg",
            )}
          >
            ₹{product.price}
          </span>
          {discount > 0 && (
            <span
              className={cn(
                "leading-tight font-medium whitespace-nowrap text-muted tabular-nums line-through",
                compact ? "text-[11px]" : "text-[11px]",
              )}
            >
              ₹{product.mrp}
            </span>
          )}
        </p>

        {product.customization ? (
          <button
            type="button"
            onClick={() => {
              rememberProduct(product);
              setCustomizing(product);
            }}
            aria-label={
              weightKg
                ? `Change weight of ${product.name}, currently ${weightKg} kilograms`
                : `Choose weight for ${product.name}`
            }
            className={
              compact
                ? cn(
                    "grid h-8 shrink-0 cursor-pointer place-items-center bg-track text-black shadow-[0_4px_12px_rgba(47,107,47,0.3)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                    weightKg
                      ? "rounded-lg px-2 text-[11px] font-extrabold whitespace-nowrap"
                      : "w-8 rounded-lg",
                  )
                : `grid h-10 shrink-0 cursor-pointer place-items-center bg-track text-black shadow-[0_8px_18px_rgba(47,107,47,0.35)] transition hover:bg-leaf-bright active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                    weightKg
                      ? "rounded-[0.9rem] px-3 text-[13px] font-extrabold whitespace-nowrap"
                      : "w-10 rounded-[0.9rem]"
                  }`
            }
          >
            {weightKg ? (
              <span key={weightKg} className="qty-pop text-black">
                {Number.isInteger(weightKg) ? weightKg : weightKg.toFixed(1)} kg
              </span>
            ) : (
              <Plus className={compact ? "h-4 w-4 text-black" : "h-5 w-5 text-black"} aria-hidden />
            )}
          </button>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={() => {
              rememberProduct(product);
              setQty(product.id, 1);
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
                : "h-10 gap-0.5 rounded-[0.9rem] px-1 shadow-[0_8px_18px_rgba(47,107,47,0.35)]",
            )}
          >
            <button
              type="button"
              onClick={() => setQty(product.id, qty - 1)}
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
              onClick={() => setQty(product.id, qty + 1)}
              aria-label={`Increase quantity of ${product.name}`}
              className={cn(
                "grid cursor-pointer place-items-center rounded-md text-black transition hover:bg-black/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-leaf",
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
