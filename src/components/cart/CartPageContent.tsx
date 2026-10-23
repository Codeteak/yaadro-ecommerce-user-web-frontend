"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Minus, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PullToRefresh } from "@/components/navigation/PullToRefresh";
import {
  getProduct,
  itemBadge,
  lineTotal,
  useCart,
} from "@/components/cart/CartContext";

const ADDRESS_KEY = "yaadro-delivery-address";

/**
 * Cart page content (reference-style list, Yaadro colours).
 * Checkout is intentionally NOT faked: the pay bar states that
 * checkout arrives in the next phase until a real orders API exists.
 */
export function CartPageContent() {
  const { items, setQty, setWeight, setCustomizing, clear, subtotal, savings } =
    useCart();
  const [checkoutNote, setCheckoutNote] = useState(false);

  const removeItem = (productId: string, isWeight: boolean) => {
    if (isWeight) setWeight(productId, null);
    else setQty(productId, 0);
  };

  // Saved delivery address (same localStorage key as the home sheet).
  const addressRaw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(ADDRESS_KEY),
    () => null,
  );
  const addressLabel = useMemo(() => {
    if (!addressRaw) return null;
    try {
      const a = JSON.parse(addressRaw) as Record<string, string>;
      return [a.house, a.street, a.city].filter(Boolean).join(", ") || null;
    } catch {
      return null;
    }
  }, [addressRaw]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <PageHeader backHref="/home" title="Cart" />

      <PullToRefresh className="flex flex-1 flex-col">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <Image
              src="/cart/empty-cart-smooth.png"
              alt=""
              width={1024}
              height={1024}
              className="h-auto w-44 max-w-full"
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
            {/* Deliver-to row */}
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 ring-1 ring-leaf/15">
              <MapPin className="h-4.5 w-4.5 shrink-0 text-leaf" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                <span className="font-bold text-black">Deliver to: </span>
                <span className="text-leaf">
                  {addressLabel ?? "Choose your location from Home"}
                </span>
              </p>
              <Link
                href="/home"
                className="shrink-0 text-[13px] font-semibold text-black transition hover:text-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                Change
              </Link>
            </div>

            {/* Items */}
            <ul className="mt-2 divide-y divide-forest/8">
              {items.map((item) => {
                const product = getProduct(item.productId);
                const isWeight = Boolean(item.weightKg);
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
                      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-[15px] font-extrabold text-black">
                          ₹{lineTotal(item)}
                        </span>
                        <span className="text-xs font-medium text-muted">
                          {isWeight
                            ? `By weight, ₹${product.price} / kg`
                            : `₹${product.price} / ${product.unit}`}
                        </span>
                      </p>
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

            {savings > 0 && (
              <p className="mt-1 text-sm font-bold text-leaf">
                You save ₹{savings} on this order
              </p>
            )}

            {/* Pay bar — green + black type; soft pulse on Together to pay only */}
            <div className="sticky bottom-[6.75rem] z-30 mt-6 pb-4">
              <div className="flex items-center justify-between rounded-[1.25rem] bg-track px-5 py-4 text-black shadow-[0_18px_36px_rgba(47,107,47,0.35)]">
                <div>
                  <p className="together-pay-label text-xs font-medium text-black/75">
                    Together to pay
                  </p>
                  <p className="text-xl leading-tight font-extrabold text-black">
                    ₹{subtotal}
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
                <p className="mt-2 text-center text-[13px] font-medium text-muted" role="status">
                  Checkout arrives in the next phase — your basket is saved on this device.
                </p>
              )}
              <button
                type="button"
                onClick={clear}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] ring-2 ring-black/15 transition hover:ring-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                <Trash2 className="h-4 w-4 text-black" aria-hidden />
                Clear basket
              </button>
            </div>
          </>
        )}
      </PullToRefresh>
    </main>
  );
}
