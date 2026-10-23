"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Minus,
  Plus,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import {
  getProduct,
  itemBadge,
  lineMrp,
  lineSave,
  lineTotal,
  useCart,
} from "@/components/cart/CartContext";
import { DeliveryAddressSheet } from "@/components/delivery/DeliveryAddressSheet";
import { cn } from "@/lib/cn";
import {
  formatDeliveryAddressLabel,
  readDeliveryAddress,
  subscribeDeliveryAddress,
} from "@/lib/delivery-address";
import {
  applySamplePromo,
  type SampleCoupon,
} from "@/lib/sample-coupons";

type CartPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame (`h-full` + back to /playground).
   */
  chromePosition?: "page" | "inline";
};

/** Totals-style card shell for Deliver to (and similar rows). */
const CARD =
  "rounded-2xl bg-white shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10";

/**
 * Cart page content (reference-style list, Yaadro colours).
 * Promo apply is sample-local until a coupons API exists.
 * Totals + Together to pay sit at the bottom of the layout (mt-auto),
 * above the bottom nav — not fixed/sticky.
 * Checkout is intentionally NOT faked.
 */
export function CartPageContent({
  chromePosition = "page",
}: CartPageContentProps) {
  const inline = chromePosition === "inline";
  const {
    items,
    setQty,
    setWeight,
    setCustomizing,
    clear,
    subtotal,
    mrpTotal,
    savings,
  } = useCart();
  const [checkoutNote, setCheckoutNote] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [applied, setApplied] = useState<SampleCoupon | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);

  const removeItem = (productId: string, isWeight: boolean) => {
    if (isWeight) setWeight(productId, null);
    else setQty(productId, 0);
  };

  const addressLabel = useSyncExternalStore(
    subscribeDeliveryAddress,
    () => {
      const saved = readDeliveryAddress();
      if (!saved) return null;
      return formatDeliveryAddressLabel(saved) || null;
    },
    () => null,
  );

  // Subtotal = MRP; You save = MRP gap + promo; Total = selling − promo.
  const totalSaved = savings + promoDiscount;
  const totalDue = Math.max(0, subtotal - promoDiscount);

  const onApplyPromo = () => {
    const result = applySamplePromo(promoInput, subtotal);
    if (!result.ok) {
      setApplied(null);
      setPromoDiscount(0);
      setPromoMessage(result.message);
      return;
    }
    setApplied(result.coupon);
    setPromoDiscount(result.discount);
    setPromoInput(result.coupon.code);
    setPromoMessage(`Applied ${result.coupon.code} — you save ₹${result.discount}`);
  };

  const clearPromo = () => {
    setApplied(null);
    setPromoDiscount(0);
    setPromoInput("");
    setPromoMessage(null);
  };

  const clearBasket = () => {
    clear();
    clearPromo();
  };

  return (
    <>
    <main
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "h-full min-h-0" : "min-h-dvh",
      )}
    >
      <PageHeader backHref={inline ? "/playground" : "/home"} title="Cart" />

      <PullToRefresh
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          inline && "overflow-y-auto",
        )}
      >
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Image
              src="/cart/empty-cart-smooth.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-52 max-w-full"
              priority
            />
            <h2 className="mt-5 text-xl font-extrabold text-ink">Your cart is empty</h2>
            <p className="mt-2 max-w-60 text-sm leading-6 text-muted">
              Add something fresh from the store to see it here.
            </p>
            <Link
              href="/home"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <>
            <div className={cn("mt-4 flex items-start gap-3 px-4 py-3.5", CARD)}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-black">
                <MapPin className="h-4.5 w-4.5 text-black" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Deliver to
                </p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-black">
                  {addressLabel ?? "Add your delivery address"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddressSheetOpen(true)}
                className="shrink-0 cursor-pointer rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Change
              </button>
            </div>

            <ul className="mt-2 divide-y divide-forest/8">
              {items.map((item) => {
                const product = getProduct(item.productId);
                const isWeight = Boolean(item.weightKg);
                const selling = lineTotal(item);
                const mrp = lineMrp(item);
                const save = lineSave(item);
                const unitHint = isWeight
                  ? `By weight, ₹${product.price} / kg`
                  : `₹${product.price} / ${product.unit}`;
                return (
                  <li key={item.productId} className="flex items-center gap-3 py-4">
                    <div className="relative shrink-0">
                      <Image
                        src={product.image}
                        alt=""
                        width={128}
                        height={128}
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                      <span className="absolute top-1/2 -right-2 -translate-y-1/2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-black shadow-[0_4px_10px_rgba(47,107,47,0.22)] ring-1 ring-leaf/20">
                        {itemBadge(item)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pl-2">
                      <h3 className="truncate text-[15px] font-bold text-ink">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="text-[15px] font-extrabold text-black tabular-nums">
                          ₹{selling}
                        </span>
                        {save > 0 ? (
                          <>
                            <span className="text-xs font-medium text-muted tabular-nums line-through">
                              ₹{mrp}
                            </span>
                            <span className="text-xs font-semibold text-leaf">
                              Save ₹{save}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-muted">
                            {unitHint}
                          </span>
                        )}
                      </p>
                      {save > 0 ? (
                        <p className="mt-0.5 text-xs font-medium text-muted">
                          {unitHint}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {isWeight ? (
                        <button
                          type="button"
                          onClick={() => setCustomizing(product)}
                          className="cursor-pointer text-sm font-semibold text-leaf underline underline-offset-4 transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full bg-mint/70 px-1 py-1">
                          <button
                            type="button"
                            onClick={() => setQty(item.productId, item.qty - 1)}
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
                            onClick={() => setQty(item.productId, item.qty + 1)}
                            aria-label={`Increase quantity of ${product.name}`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-forest transition hover:bg-white focus-visible:outline-2 focus-visible:outline-leaf"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, isWeight)}
                        aria-label={`Remove ${product.name} from basket`}
                        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-black/70 transition hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={clearBasket}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] ring-2 ring-black/15 transition hover:ring-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <Trash2 className="h-4 w-4 text-black" aria-hidden />
                Clear basket
              </button>

              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-forest/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-forest">
                  <TicketPercent className="h-4 w-4" aria-hidden />
                </span>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onApplyPromo();
                    }
                  }}
                  placeholder="Apply a promo code"
                  aria-label="Promo code"
                  disabled={Boolean(applied)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink placeholder:text-muted outline-none disabled:opacity-70"
                />
                {applied ? (
                  <button
                    type="button"
                    onClick={clearPromo}
                    aria-label="Remove promo code"
                    className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-black/[0.06] px-3 text-xs font-semibold text-muted transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onApplyPromo}
                    className="h-9 shrink-0 cursor-pointer rounded-xl bg-track px-4 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    Apply
                  </button>
                )}
              </div>
              {promoMessage && (
                <p
                  className={cn(
                    "text-center text-[13px] font-medium",
                    applied ? "text-forest" : "text-red-600",
                  )}
                  role="status"
                >
                  {promoMessage}
                </p>
              )}
            </div>

            {/* In-flow bottom: short cart → sits low via mt-auto; long cart → follows list */}
            <div className="mt-auto flex flex-col gap-3 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
                <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-bold text-black">₹{mrpTotal}</span>
                </div>
                <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                  <span className="text-muted">You save</span>
                  <span className="font-bold text-leaf">
                    {totalSaved > 0 ? `₹${totalSaved}` : "₹0"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-bold text-black">Total</span>
                  <span className="font-extrabold text-leaf">₹{totalDue}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[1.25rem] bg-track px-5 py-4 text-black shadow-[0_18px_36px_rgba(47,107,47,0.35)]">
                <div>
                  <p className="together-pay-label text-xs font-medium text-black/75">
                    Together to pay
                  </p>
                  <p className="text-xl leading-tight font-extrabold text-black">
                    ₹{totalDue}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutNote(true)}
                  aria-label="Proceed to checkout"
                  className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white text-black transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  <ArrowRight className="h-5 w-5 text-black" aria-hidden />
                </button>
              </div>
              {checkoutNote && (
                <p className="text-center text-[13px] font-medium text-muted" role="status">
                  Checkout arrives in the next phase — your basket is saved on this device.
                </p>
              )}
            </div>
          </>
        )}
      </PullToRefresh>
    </main>
    <DeliveryAddressSheet
      open={addressSheetOpen}
      onOpenChange={setAddressSheetOpen}
    />
    </>
  );
}
