"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { CatalogImage } from "@/components/ui/CatalogImage";
import {
  itemBadge,
  lineMrp,
  lineSave,
  lineTotal,
  resolveCartProduct,
  type CartItem,
} from "@/components/cart/CartContext";
import { catalogPriceDisplay } from "@/lib/catalog-price-display";
import { MAX_LINE_QUANTITY } from "@/lib/cart-checkout-rules";
import { cn } from "@/lib/cn";
import { formatQtyBadge } from "@/lib/qty-label";
import { isProductImageFallback, productPhoto } from "@/lib/product-image";
import type { SampleProduct } from "@/lib/sample-products";
import type { ShopQuoteLine } from "@/lib/cart-checkout-rules";

type CartLineItemProps = {
  item: CartItem;
  /** Live shop line when preview has priced this product. */
  shopLine?: ShopQuoteLine | null;
  onSetQty: (productId: string, qty: number) => void;
  onEditWeight: (product: SampleProduct) => void;
  onRemove: (productId: string, isWeight: boolean) => void;
};

/**
 * One basket row: clear unit × qty = total (or weight step × chosen kg).
 */
export function CartLineItem({
  item,
  shopLine,
  onSetQty,
  onEditWeight,
  onRemove,
}: CartLineItemProps) {
  const product = resolveCartProduct(item);
  const photo = productPhoto(product.image);
  const isWeight = Boolean(item.weightKg);
  const display = catalogPriceDisplay(product);
  const phoneTotal = lineTotal(item);
  const phoneMrp = lineMrp(item);
  const save = lineSave(item);
  const selling =
    shopLine?.lineTotalRupees != null
      ? Math.round(shopLine.lineTotalRupees)
      : phoneTotal;
  const mrp =
    shopLine?.listRupees != null && item.qty > 0 && !isWeight
      ? Math.round(shopLine.listRupees * item.qty)
      : shopLine?.listRupees != null && isWeight && item.weightKg
        ? Math.round(shopLine.listRupees * item.weightKg)
        : phoneMrp;
  const lineSaveAmt = Math.max(0, mrp - selling);

  const unitPrice = display.price;
  const breakdown = isWeight
    ? `₹${unitPrice} / ${display.unitLabel} · ${formatQtyBadge({ qty: item.weightKg ?? 0, isWeight: true })}`
    : `₹${unitPrice} × ${item.qty}`;

  const atMax = !isWeight && item.qty >= MAX_LINE_QUANTITY;

  return (
    <li className="flex items-start gap-3 py-4">
      <div className="relative shrink-0 self-center">
        <CatalogImage
          src={photo}
          alt=""
          width={128}
          height={128}
          className={cn(
            "h-16 w-16 rounded-2xl",
            isProductImageFallback(photo) ? "object-contain" : "object-cover",
          )}
        />
      </div>

      <div className="min-w-0 flex-1 pl-2">
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold text-ink">
              {product.name}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-[15px] font-extrabold text-black tabular-nums">
                ₹{selling}
              </span>
              {lineSaveAmt > 0 || save > 0 ? (
                <span className="text-xs font-medium text-muted tabular-nums line-through">
                  ₹{mrp}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted">{breakdown}</p>
            {isWeight ? (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="rounded-full bg-mint/80 px-2.5 py-1 text-[12px] font-extrabold tabular-nums text-forest ring-1 ring-leaf/20">
                  {itemBadge(item)}
                </span>
                <button
                  type="button"
                  onClick={() => onEditWeight(product)}
                  className="cursor-pointer text-sm font-semibold text-leaf underline underline-offset-4 transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  Edit weight
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 self-center">
            {!isWeight ? (
              <div className="flex items-center gap-1 rounded-full bg-mint/70 px-1 py-1">
                <button
                  type="button"
                  onClick={() => onSetQty(item.productId, item.qty - 1)}
                  aria-label={`Decrease quantity of ${product.name}`}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-forest transition hover:bg-white focus-visible:outline-2 focus-visible:outline-leaf"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span
                  key={item.qty}
                  className="qty-pop min-w-4 text-center text-[13px] font-extrabold text-forest"
                  aria-live="polite"
                >
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSetQty(
                      item.productId,
                      Math.min(MAX_LINE_QUANTITY, item.qty + 1),
                    )
                  }
                  disabled={atMax}
                  aria-label={`Increase quantity of ${product.name}`}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-forest transition hover:bg-white focus-visible:outline-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.productId, isWeight)}
              aria-label={`Remove ${product.name} from basket`}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-black/70 transition hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
