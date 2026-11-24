"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { cn } from "@/lib/cn";
import type { ShopQuoteLine } from "@/lib/cart-checkout-rules";
import { isProductImageFallback, productPhoto } from "@/lib/product-image";

type CartFreeItemsProps = {
  items: ShopQuoteLine[];
  className?: string;
};

/**
 * Collapsible free / bundle-reward lines from cart preview.
 * Hidden entirely when there are none.
 */
export function CartFreeItems({ items, className }: CartFreeItemsProps) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;

  return (
    <section className={cn("mt-4", className)} aria-label="Free items">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 rounded-2xl bg-mint/50 px-3.5 py-3 ring-1 ring-leaf/20 transition hover:bg-mint/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <span className="min-w-0 flex-1 text-left text-sm font-bold text-forest">
          Free items · {items.length}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-forest transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ul className="min-h-0 overflow-hidden">
          {items.map((item, index) => {
            const photo = productPhoto(item.imageUrl ?? "");
            const qty = Math.max(
              1,
              item.offerQuantity > 0 ? item.offerQuantity : item.quantity,
            );
            return (
              <li
                key={`${item.productId ?? "free"}-${index}`}
                className="flex items-center gap-3 border-b border-forest/8 py-3 last:border-b-0"
              >
                <CatalogImage
                  src={photo}
                  alt=""
                  width={64}
                  height={64}
                  className={cn(
                    "h-12 w-12 rounded-xl",
                    isProductImageFallback(photo)
                      ? "object-contain"
                      : "object-cover",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {item.title ?? "Free item"}
                  </p>
                  <p className="text-xs font-medium text-muted">
                    Qty {qty}
                  </p>
                </div>
                <span className="rounded-full bg-track px-2.5 py-1 text-[11px] font-extrabold text-black">
                  FREE
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
