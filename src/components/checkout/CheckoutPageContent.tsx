"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banknote, Check, MapPin } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { DeliveryAddressSheet } from "@/components/delivery/DeliveryAddressSheet";
import { useCart } from "@/components/cart/CartContext";
import { cn } from "@/lib/cn";
import {
  DELIVERY_ADDRESS_KEY,
  EMPTY_DELIVERY_ADDRESS,
  formatDeliveryAddressLabel,
  subscribeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";

type CheckoutPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame.
   */
  chromePosition?: "page" | "inline";
};

type CheckoutPhase = "form" | "tick" | "confirmed";

/** Stable string snapshot — never return a fresh object from getSnapshot. */
function getAddressRaw(): string | null {
  try {
    return window.localStorage.getItem(DELIVERY_ADDRESS_KEY);
  } catch {
    return null;
  }
}

function formatFullAddress(a: DeliveryAddress): string {
  return [a.house, a.street, a.landmark, a.city, a.pin]
    .filter(Boolean)
    .join(", ");
}

/**
 * Checkout UI: address, COD only, price details + amount due,
 * Place Order → tick animation → confirmed + mascot.
 * Does not place a real order (no payment / order API).
 */
export function CheckoutPageContent({
  chromePosition = "page",
}: CheckoutPageContentProps) {
  const inline = chromePosition === "inline";
  const {
    mrpTotal,
    items,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
  } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<CheckoutPhase>("form");
  const [placeError, setPlaceError] = useState<string | null>(null);

  const addressRaw = useSyncExternalStore(
    subscribeDeliveryAddress,
    getAddressRaw,
    () => null,
  );

  const address = useMemo((): DeliveryAddress | null => {
    if (addressRaw == null) return null;
    try {
      return {
        ...EMPTY_DELIVERY_ADDRESS,
        ...(JSON.parse(addressRaw) as Partial<DeliveryAddress>),
      };
    } catch {
      return null;
    }
  }, [addressRaw]);

  const amountDue = totalDue;
  const hasItems = items.length > 0;
  const hasAddress = Boolean(
    address && formatDeliveryAddressLabel(address).length > 0,
  );
  const backHref = inline ? "/playground" : "/cart";

  useEffect(() => {
    if (phase !== "tick") return;
    const id = window.setTimeout(() => setPhase("confirmed"), 1200);
    return () => window.clearTimeout(id);
  }, [phase]);

  const onPlaceOrder = () => {
    setPlaceError(null);
    if (!hasItems) {
      setPlaceError("Your basket is empty — add items before placing an order.");
      return;
    }
    if (!hasAddress) {
      setPlaceError("Add a delivery address to continue.");
      setSheetOpen(true);
      return;
    }
    // UI-only confirmation — no order or payment is submitted.
    setPhase("tick");
  };

  if (phase === "tick") {
    return (
      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col items-center justify-center bg-paper px-5",
          inline ? "min-h-full" : "min-h-dvh",
        )}
        role="status"
        aria-live="polite"
        aria-label="Order confirmed"
      >
        <div className="verified-pop flex h-28 w-28 items-center justify-center rounded-full bg-leaf shadow-[0_12px_40px_rgba(92,184,92,0.35)]">
          <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              className="verified-check-draw"
              d="M5 12.5 10 17.5 19 7.5"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="verified-fade-in mt-6 text-2xl font-extrabold tracking-tight text-forest">
          Order confirmed
        </h2>
        <p className="verified-fade-in mt-2 text-[15px] text-muted">
          Preparing your confirmation…
        </p>
      </main>
    );
  }

  if (phase === "confirmed") {
    return (
      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
          inline ? "min-h-full" : "min-h-dvh",
        )}
      >
        <PageHeader backHref={backHref} title="Order confirmed" />
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <Image
            src="/checkout/order-confirmed-mascot.png"
            alt=""
            width={813}
            height={665}
            className="h-auto w-52 max-w-full"
            priority
          />
          <h2 className="mt-5 text-xl font-extrabold text-ink">
            Order confirmed
          </h2>
          <p className="mt-2 max-w-64 text-sm leading-6 text-muted">
            Pay with Cash on Delivery when your groceries arrive.
          </p>
          <p
            className="mt-3 max-w-64 text-[13px] font-medium text-muted"
            role="status"
          >
            Preview only — no order was sent to the store yet.
          </p>
          <Link
            href={inline ? "/playground" : "/home"}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-track px-6 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Continue shopping
          </Link>
          {inline ? (
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="mt-3 cursor-pointer text-sm font-semibold text-leaf underline underline-offset-4 transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              Back to checkout form
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <PageHeader backHref={backHref} title="Checkout" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain -mx-4 px-4 pb-52">
        <section className="pt-2">
          <h2 className="text-base font-extrabold text-black">
            Delivery Address
          </h2>
          <div className="mt-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-forest">
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                {hasAddress && address ? (
                  <>
                    <p className="truncate text-sm font-bold text-black">
                      {address.house || "Delivery"}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted">
                      {formatFullAddress(address)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted">
                    Add a delivery address
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 cursor-pointer text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                {hasAddress ? "Edit" : "Add"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-extrabold text-black">Payment Method</h2>
          <div className="mt-3 rounded-2xl bg-white shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
            <div
              className="flex items-center gap-3 px-3.5 py-3.5"
              role="radio"
              aria-checked="true"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
                <Banknote className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-black">
                Cash on Delivery
              </span>
              <span
                className="grid h-5 w-5 place-items-center rounded-full bg-leaf text-white"
                aria-hidden
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-muted">
            Only Cash on Delivery is available for now.
          </p>
        </section>
      </div>

      <div
        className={cn(
          "z-30 space-y-3",
          inline
            ? "absolute inset-x-0 bottom-0 px-5 pb-5"
            : "fixed inset-x-0 bottom-0 mx-auto w-full max-w-lg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
          <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-bold text-black">₹{mrpTotal}</span>
          </div>
          {appliedPromo && promoDiscount > 0 ? (
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="text-muted">Coupon ({appliedPromo.code})</span>
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
            <span className="font-extrabold text-leaf">₹{amountDue}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-track px-5 py-3.5 text-black shadow-[0_10px_28px_rgba(47,107,47,0.28)]">
          <span className="text-sm font-semibold">Amount due</span>
          <span className="text-xl font-extrabold tabular-nums">
            ₹{amountDue}
          </span>
        </div>

        <button
          type="button"
          onClick={onPlaceOrder}
          aria-label="Place order with cash on delivery"
          className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-track px-5 py-4 text-base font-extrabold text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          Place Order
          <Check className="h-5 w-5" aria-hidden />
        </button>

        {placeError ? (
          <p
            className="text-center text-[13px] font-medium text-red-600"
            role="alert"
          >
            {placeError}
          </p>
        ) : (
          <p
            className="text-center text-[13px] font-medium text-muted"
            role="status"
          >
            Preview — Place Order does not submit a real order.
          </p>
        )}
      </div>

      <DeliveryAddressSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </main>
  );
}
