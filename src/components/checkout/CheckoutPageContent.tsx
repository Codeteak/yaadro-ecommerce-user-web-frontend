"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Banknote, Check, MapPin } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { useCart } from "@/components/cart/CartContext";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
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
  /** Show “Prices may vary…” above the sticky price summary. */
  showPriceMayVary?: boolean;
};

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
 * Place Order stays disabled until the shop accepts orders.
 */
export function CheckoutPageContent({
  chromePosition = "page",
  showPriceMayVary = false,
}: CheckoutPageContentProps) {
  const inline = chromePosition === "inline";
  const {
    mrpTotal,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
  } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);

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
  const hasAddress = Boolean(
    address && formatDeliveryAddressLabel(address).length > 0,
  );
  const backHref = inline ? "/playground" : "/cart";

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
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-black">
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
        {showPriceMayVary ? <PriceMayVaryNotice /> : null}
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
          disabled
          aria-label="Place order is unavailable until checkout is connected"
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-track px-5 py-4 text-base font-extrabold text-black opacity-50 shadow-[0_7px_0_0_#1f5c1f]"
        >
          Place Order
          <Check className="h-5 w-5" aria-hidden />
        </button>

        <p className="text-center text-[13px] font-medium text-muted" role="status">
          Place Order stays off until the shop can accept the order.
        </p>
      </div>

      <AddressBookSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </main>
  );
}
