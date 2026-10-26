"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Minus,
  Plus,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  getProduct,
  itemBadge,
  lineMrp,
  lineSave,
  lineTotal,
  useCart,
} from "@/components/cart/CartContext";
import { cn } from "@/lib/cn";

type CartPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame (`h-full` + back to /playground).
   */
  chromePosition?: "page" | "inline";
  /**
   * Tap coupon field → browse/select coupons, then return
   * (e.g. `/coupons?from=cart` or playground coupons-apply).
   */
  couponPickerHref?: string;
};

/**
 * Cart page content (reference-style list, Yaadro colours).
 * Discount field with green highlight shell; totals reflect sample promo
 * (shared with checkout via CartContext). Checkout links to /checkout.
 */
export function CartPageContent({
  chromePosition = "page",
  couponPickerHref,
}: CartPageContentProps) {
  const inline = chromePosition === "inline";
  const {
    items,
    setQty,
    setWeight,
    setCustomizing,
    clear,
    mrpTotal,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
    applyPromo,
    clearPromo,
  } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const hasItems = items.length > 0;
  const applied = appliedPromo;

  useEffect(() => {
    if (appliedPromo) setPromoInput(appliedPromo.code);
  }, [appliedPromo]);

  const removeItem = (productId: string, isWeight: boolean) => {
    if (isWeight) setWeight(productId, null);
    else setQty(productId, 0);
  };

  const onApplyPromo = () => {
    const result = applyPromo(promoInput);
    setPromoMessage(result.message);
    if (result.ok) setPromoInput(result.code);
  };

  const onClearPromo = () => {
    clearPromo();
    setPromoInput("");
    setPromoMessage(null);
  };

  return (
    <main
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        // Fixed height so PullToRefresh is the real scrollport (not the window).
        inline ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <PageHeader backHref={inline ? "/playground" : "/home"} title="Cart" />

      {/* Plain scroller — PullToRefresh touch handlers blocked cart scroll.
          -mx/px gives shadow bleed room (overflow-y also clips the sides). */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain -mx-4 px-4",
          hasItems && "pb-36",
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
            <ul className="mt-4 divide-y divide-forest/8">
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

            <button
              type="button"
              onClick={() => {
                clear();
                setPromoInput("");
                setPromoMessage(null);
              }}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] ring-2 ring-black/15 transition hover:ring-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <Trash2 className="h-4 w-4 text-black" aria-hidden />
              Clear basket
            </button>

            <div className="mt-4 rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(47,107,47,0.14)] ring-2 ring-leaf">
              <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-2.5 py-2 ring-1 ring-forest/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-forest">
                  <TicketPercent className="h-4 w-4" aria-hidden />
                </span>
                {couponPickerHref && !applied ? (
                  <>
                    <Link
                      href={couponPickerHref}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      Select a coupon
                    </Link>
                    <Link
                      href={couponPickerHref}
                      className="h-9 shrink-0 cursor-pointer rounded-xl bg-track px-4 text-sm font-semibold leading-9 text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      Select
                    </Link>
                  </>
                ) : (
                  <>
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
                      placeholder="Enter discount code"
                      aria-label="Discount code"
                      disabled={Boolean(applied)}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink placeholder:text-muted outline-none disabled:opacity-70"
                    />
                    {applied ? (
                      <button
                        type="button"
                        onClick={onClearPromo}
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
                  </>
                )}
              </div>
              {promoMessage ? (
                <p
                  className={cn(
                    "mt-2 text-center text-[13px] font-medium",
                    applied ? "text-forest" : "text-red-600",
                  )}
                  role="status"
                >
                  {promoMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
              <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold text-black">₹{mrpTotal}</span>
              </div>
              {applied && promoDiscount > 0 ? (
                <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                  <span className="text-muted">Coupon ({applied.code})</span>
                  <span className="font-bold text-leaf">−₹{promoDiscount}</span>
                </div>
              ) : null}
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
          </>
        )}
      </div>

      {hasItems ? (
        <div
          className={cn(
            "pointer-events-none z-30 px-5",
            inline
              ? "absolute inset-x-0 bottom-0 pb-6"
              : "fixed inset-x-0 bottom-0 mx-auto w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Link
            href={inline ? "/playground/checkout" : "/checkout"}
            aria-label="Proceed to checkout"
            className="group pointer-events-auto relative flex w-full cursor-pointer items-center rounded-full bg-track px-5 py-4 text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <span className="text-xl leading-tight font-extrabold tabular-nums">
              ₹{totalDue}
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold tracking-tight text-black">
              Checkout
            </span>
            <span className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-[0_3px_0_0_rgba(0,0,0,0.12)] motion-safe:group-active:shadow-none">
              <ArrowRight className="h-5 w-5 text-black" aria-hidden />
            </span>
          </Link>
        </div>
      ) : null}
    </main>
  );
}
