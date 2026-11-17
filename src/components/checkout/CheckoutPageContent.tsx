"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, MapPin } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { useCart } from "@/components/cart/CartContext";
import { checkDeliveryLocation, saveMyAddress } from "@/lib/api/address";
import { previewDeliveryArea } from "@/lib/api/preview-delivery-area";
import { placeCheckoutOrder } from "@/lib/api/checkout";
import { ApiError } from "@/lib/api/errors";
import { hasCustomerSession, subscribeCustomerSession } from "@/lib/api/session";
import { showPopup } from "@/components/ui/Toast";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import { cn } from "@/lib/cn";
import {
  DELIVERY_ADDRESS_KEY,
  EMPTY_DELIVERY_ADDRESS,
  formatDeliveryAddressLabel,
  subscribeDeliveryAddress,
  writeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";
import {
  askUntilLocation,
  deliveryAreaBlock,
  isLatLng,
  readBrowserPosition,
} from "@/lib/delivery-location";

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

const PRODUCT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checkout UI: address, COD only, price details + amount due.
 * Place Order sends the on-device basket to the shop. The shop sets the total.
 */
export function CheckoutPageContent({
  chromePosition = "page",
  showPriceMayVary = false,
}: CheckoutPageContentProps) {
  const inline = chromePosition === "inline";
  const router = useRouter();
  const queryClient = useQueryClient();
  const signedIn = useSyncExternalStore(subscribeCustomerSession, hasCustomerSession, () => false);
  const {
    items,
    clear,
    mrpTotal,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
  } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("Placing order…");
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [areaNote, setAreaNote] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

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

  const pinLat = address && isLatLng(address) ? address.lat : null;
  const pinLng = address && isLatLng(address) ? address.lng : null;

  useEffect(() => {
    if (pinLat == null || pinLng == null) {
      setAreaNote(null);
      return;
    }
    let cancelled = false;
    void previewDeliveryArea(pinLat, pinLng)
      .then((result) => {
        if (!cancelled) setAreaNote(deliveryAreaBlock(result));
      })
      .catch(() => {
        if (!cancelled) setAreaNote("We couldn't check delivery for that location. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [pinLat, pinLng]);

  const amountDue = totalDue;
  const hasAddress = Boolean(
    address && formatDeliveryAddressLabel(address).length > 0,
  );
  const orderLines = items
    .map((item) => ({
      productId: item.productId,
      quantity: item.weightKg && item.weightKg > 0 ? item.weightKg : item.qty,
    }))
    .filter((item) => PRODUCT_UUID.test(item.productId) && item.quantity > 0);
  const backHref = inline ? "/playground" : "/cart";

  const placeOrder = async () => {
    if (!signedIn) {
      router.push("/login?next=/checkout");
      return;
    }
    if (!hasAddress || !address) {
      setPlaceError("Add a delivery address first.");
      return;
    }
    if (orderLines.length === 0) {
      setPlaceError("Add a shop product before placing the order.");
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setPending(true);
    setPlaceError(null);
    try {
      setPendingLabel(isLatLng(address) ? "Checking delivery…" : "Asking for your location…");
      const pin = isLatLng(address)
        ? { lat: address.lat, lng: address.lng }
        : await askUntilLocation(readBrowserPosition, 3);
      if (!pin) {
        setPlaceError("Allow location so we can check if this shop delivers to you, then try again.");
        return;
      }
      if (!isLatLng(address)) writeDeliveryAddress({ ...address, ...pin });
      setPendingLabel("Checking delivery…");
      const area = await checkDeliveryLocation(pin.lat, pin.lng);
      const blocked = deliveryAreaBlock(area);
      if (blocked) {
        setPlaceError(blocked);
        return;
      }
      await saveMyAddress({
        line1: address.house || address.street,
        line2: address.street || null,
        landmark: address.landmark || null,
        city: address.city || null,
        lat: pin.lat,
        lng: pin.lng,
        raw: formatFullAddress(address),
      });
      setPendingLabel("Placing order…");
      const order = await placeCheckoutOrder({
        items: orderLines,
        couponCode: appliedPromo?.code ?? null,
        idempotencyKey: idempotencyKey.current,
      });
      clear();
      idempotencyKey.current = null;
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      showPopup(`Order ${order.orderNumber} placed. Pay when it arrives.`, "success");
      router.push("/orders");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "We couldn't place the order. Check your connection and try again.";
      setPlaceError(
        error instanceof ApiError && error.requestId
          ? `${message} Reference ${error.requestId}.`
          : message,
      );
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        idempotencyKey.current = null;
      }
    } finally {
      setPending(false);
    }
  };

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
          disabled={pending || (signedIn && (!hasAddress || orderLines.length === 0))}
          onClick={() => void placeOrder()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-track px-5 py-4 text-base font-extrabold text-black shadow-[0_7px_0_0_#1f5c1f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? pendingLabel : signedIn ? "Place Order" : "Sign in to place order"}
          <Check className="h-5 w-5" aria-hidden />
        </button>

        <p className="text-center text-[13px] font-medium text-muted" role="status">
          {placeError ??
            areaNote ??
            (signedIn
              ? !hasAddress
                ? "Add a delivery address, then we'll check that we deliver there."
                : isLatLng(address)
                  ? "Cash on delivery. We'll confirm this location before the order is sent."
                  : "We'll ask for your location before placing the order."
              : "Sign in so we can send this order to the shop.")}
        </p>
      </div>

      <AddressBookSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </main>
  );
}
