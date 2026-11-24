"use client";

import Link from "next/link";
import { CatalogImage } from "@/components/ui/CatalogImage";
import { CartFreeItems } from "@/components/cart/CartFreeItems";
import {
  lineTotal,
  resolveCartProduct,
  type CartItem,
} from "@/components/cart/CartContext";
import { formatRupees, type ShopQuoteLine } from "@/lib/cart-checkout-rules";
import { catalogPriceDisplay } from "@/lib/catalog-price-display";
import { cn } from "@/lib/cn";
import { formatQtyBadge } from "@/lib/qty-label";
import { isProductImageFallback, productPhoto } from "@/lib/product-image";

type CheckoutOrderSummaryProps = {
  items: CartItem[];
  shopLines?: ShopQuoteLine[];
  freeItems?: ShopQuoteLine[];
  editHref: string;
  className?: string;
};

/**
 * Read-only basket preview on checkout — lines + free gifts + Edit cart.
 */
export function CheckoutOrderSummary({
  items,
  shopLines = [],
  freeItems = [],
  editHref,
  className,
}: CheckoutOrderSummaryProps) {
  const paid = items.filter((item) => item.qty > 0 || (item.weightKg ?? 0) > 0);
  if (paid.length === 0 && freeItems.length === 0) return null;

  const shopByProduct = new Map<string, ShopQuoteLine>();
  for (const line of shopLines) {
    if (line.productId && !line.isBundleReward) {
      shopByProduct.set(line.productId, line);
    }
  }

  return (
    <section className={cn(className)} aria-label="Order summary">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-black">
          Order summary
          {paid.length > 0 ? (
            <span className="font-semibold text-muted">
              {" "}
              · {paid.length} {paid.length === 1 ? "item" : "items"}
            </span>
          ) : null}
        </h2>
        <Link
          href={editHref}
          className="text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Edit cart
        </Link>
      </div>

      <ul className="mt-3 space-y-2.5">
        {paid.map((item) => {
          const product = resolveCartProduct(item);
          const photo = productPhoto(product.image);
          const shop = shopByProduct.get(item.productId);
          const isWeight = Boolean(item.weightKg);
          const display = catalogPriceDisplay(product);
          const total =
            shop?.lineTotalRupees != null
              ? Math.round(shop.lineTotalRupees)
              : lineTotal(item);
          const qtyLabel = isWeight
            ? formatQtyBadge({ qty: item.weightKg ?? 0, isWeight: true })
            : formatQtyBadge({ qty: item.qty, unit: product.unit });
          return (
            <li
              key={`${item.productId}-${isWeight ? "w" : "p"}`}
              className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-forest/10"
            >
              <CatalogImage
                src={photo}
                alt=""
                width={96}
                height={96}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-xl",
                  isProductImageFallback(photo)
                    ? "object-contain"
                    : "object-cover",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-black">
                  {product.name}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-muted">
                  {isWeight
                    ? `${formatRupees(display.price)} / kg · ${qtyLabel}`
                    : `${formatRupees(display.price)} × ${qtyLabel}`}
                </p>
              </div>
              <span className="shrink-0 text-sm font-extrabold tabular-nums text-black">
                {formatRupees(total)}
              </span>
            </li>
          );
        })}
      </ul>

      <CartFreeItems items={freeItems} className="mt-3" />
    </section>
  );
}
