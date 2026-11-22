"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { useCart } from "@/components/cart/CartContext";
import { ShopQuoteNotes, shopDue } from "@/components/cart/ShopQuoteNotes";
import { useShopQuote } from "@/components/cart/useShopQuote";
import { checkDeliveryLocation, saveMyAddress } from "@/lib/api/address";
import { previewDeliveryArea } from "@/lib/api/preview-delivery-area";
import { placeCheckoutOrder } from "@/lib/api/checkout";
import { ApiError } from "@/lib/api/errors";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { showPopup } from "@/components/ui/Toast";
import {
  OrderPlacedContent,
  type OrderPlacedSummary,
} from "@/components/checkout/OrderPlacedContent";
import {
  billCouponLine,
  isBasketCheckoutFailure,
  shopCheckoutLines,
} from "@/lib/cart-checkout-rules";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import { cn } from "@/lib/cn";
import {
  DELIVERY_ADDRESS_KEY,
  EMPTY_DELIVERY_ADDRESS,
  formatDeliveryLocationLabel,
  hasBrowseLocation,
  hasDeliveryDetails,
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
import { LOCATION_TOASTS } from "@/lib/location-messages";
import {
  getSelectedAddress,
  isSavedAddressDetailsComplete,
  listSavedAddresses,
} from "@/lib/saved-addresses";

type CheckoutPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame.
   */
  chromePosition?: "page" | "inline";
  /** Show “Prices may vary…” above the sticky price summary. */
  showPriceMayVary?: boolean;
  /** Soft = storefront default; banner kept for comparison. */
  priceMayVaryVariant?: "banner" | "soft";
  /** Playground Phase A — stronger “You save” highlight in the bill summary. */
  highlightSavings?: boolean;
  /**
   * Green “Amount due” strip above Place Order.
   * Playground Phase A (#11) turns this off to remove the extra footer bar.
   */
  showAmountDueBar?: boolean;
  /**
   * Playground: force guest vs signed-in without a real session.
   * Omit on storefront to use `hasCustomerSession`.
   */
  previewSignedIn?: boolean;
  /**
   * Production: Coupon −₹ from shop cart preview only.
   * Playground omits this and uses local sample promo math.
   */
  liveShopPricing?: boolean;
  /**
   * Playground-only fixture for the totals card (coupon row visible for testers).
   * Live checkout never passes this.
   */
  demoBill?: {
    subtotalRupees: number;
    couponCode: string;
    couponDiscountRupees: number;
    saveRupees: number;
    totalRupees: number;
  } | null;
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
 * Checkout UI: address, COD only, price details + amount due.
 * Place Order sends the on-device basket to the shop. The shop sets the total.
 */
export function CheckoutPageContent({
  chromePosition = "page",
  showPriceMayVary = false,
  priceMayVaryVariant = "soft",
  highlightSavings = false,
  previewSignedIn,
  liveShopPricing = false,
  demoBill = null,
}: CheckoutPageContentProps) {
  const inline = chromePosition === "inline";
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionSignedIn = useCustomerSignedIn();
  const signedIn = previewSignedIn ?? sessionSignedIn;
  const loginHref = inline
    ? "/login?next=/playground/cart-page"
    : "/login?next=/cart";
  const {
    items,
    clear,
    mrpTotal,
    subtotal,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
  } = useCart();
  const { quote } = useShopQuote(items, appliedPromo?.code ?? null);
  const dueLabel = shopDue(quote, totalDue);
  const minimumBlocks = Boolean(quote?.minimumMessage);
  const couponLine = demoBill
    ? {
        code: demoBill.couponCode,
        discountRupees: demoBill.couponDiscountRupees,
      }
    : billCouponLine(
        liveShopPricing ? "shop" : "sample",
        quote,
        appliedPromo && promoDiscount > 0
          ? { code: appliedPromo.code, discountRupees: promoDiscount }
          : null,
      );
  const savingsLabel = demoBill
    ? demoBill.saveRupees
    : liveShopPricing
      ? Math.max(
          0,
          Math.round((mrpTotal - (quote?.totalRupees ?? totalDue)) * 100) / 100,
        )
      : totalSaved;
  // Match cart: Item total = selling sum (not MRP).
  const itemTotalLabel = demoBill ? demoBill.subtotalRupees : subtotal;
  const amountDueLabel = demoBill
    ? `₹${demoBill.totalRupees}`
    : dueLabel;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEditId, setSheetEditId] = useState<string | null>(null);
  const [sheetStep, setSheetStep] = useState<"list" | "map" | "details">(
    "list",
  );
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("Placing order…");
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderPlacedSummary | null>(null);
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
  const [fetchedAreaNote, setFetchedAreaNote] = useState<string | null>(null);
  const areaNote = pinLat == null || pinLng == null ? null : fetchedAreaNote;

  useEffect(() => {
    if (pinLat == null || pinLng == null) return;
    let cancelled = false;
    void previewDeliveryArea(pinLat, pinLng)
      .then((result) => {
        if (cancelled) return;
        const blocked = deliveryAreaBlock(result);
        setFetchedAreaNote(blocked);
        // Toast only when blocked — avoid “we deliver” every time checkout opens.
        if (blocked) {
          const tone =
            blocked === LOCATION_TOASTS.notServiceable.message
              ? LOCATION_TOASTS.notServiceable.tone
              : LOCATION_TOASTS.checkFailed.tone;
          showPopup(blocked, tone);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const { message, tone } = LOCATION_TOASTS.checkFailed;
        setFetchedAreaNote(message);
        showPopup(message, tone);
      });
    return () => {
      cancelled = true;
    };
  }, [pinLat, pinLng]);

  const amountDue = amountDueLabel;
  const hasLocation = hasBrowseLocation(address);
  const hasDetails = hasDeliveryDetails(address);
  // Weight → unit count (kg / stepKg), same as cart preview.
  const orderLines = shopCheckoutLines(items);
  const backHref = inline ? "/playground" : "/cart";

  const openAddressForOrder = () => {
    const saved = getSelectedAddress() ?? listSavedAddresses()[0] ?? null;
    if (hasDetails || isSavedAddressDetailsComplete(saved) || hasLocation) {
      setSheetEditId(saved?.id ?? null);
      setSheetStep(saved ? "details" : "map");
    } else {
      setSheetEditId(null);
      setSheetStep("map");
    }
    setSheetOpen(true);
  };

  const placeOrder = async () => {
    if (!signedIn) {
      showPopup("Sign in to place your order.", "warning");
      router.push(loginHref);
      return;
    }
    if (!hasDetails || !address) {
      const toast = hasLocation
        ? LOCATION_TOASTS.needAddressDetails
        : LOCATION_TOASTS.needAddress;
      setPlaceError(toast.message);
      showPopup(toast.message, toast.tone);
      openAddressForOrder();
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
        const { message, tone } = LOCATION_TOASTS.allowLocation;
        setPlaceError(message);
        showPopup(message, tone);
        return;
      }
      if (!isLatLng(address)) writeDeliveryAddress({ ...address, ...pin });
      setPendingLabel("Checking delivery…");
      const area = await checkDeliveryLocation(pin.lat, pin.lng);
      const blocked = deliveryAreaBlock(area);
      if (blocked) {
        const tone =
          blocked === LOCATION_TOASTS.notServiceable.message
            ? LOCATION_TOASTS.notServiceable.tone
            : LOCATION_TOASTS.checkFailed.tone;
        setPlaceError(blocked);
        showPopup(blocked, tone);
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
      const itemCount = orderLines.reduce((sum, line) => sum + line.quantity, 0);
      const order = await placeCheckoutOrder({
        items: orderLines,
        couponCode: appliedPromo?.code ?? null,
        idempotencyKey: idempotencyKey.current,
      });
      clear();
      idempotencyKey.current = null;
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      const rupees = (minor: number) => Math.round(minor / 100);
      const netItems = rupees(order.subtotal_minor);
      const discount = Math.max(
        rupees(order.promotion_discount_minor),
        rupees(order.coupon_discount_minor),
      );
      const deliveryFee = rupees(order.delivery_fee_minor);
      const total = rupees(order.total_minor);
      setPlaced({
        billNo: order.orderNumber.startsWith("#")
          ? order.orderNumber
          : `#${order.orderNumber}`,
        itemCount,
        // Before promo — same as order detail / ticket bill.
        subtotal: netItems + discount,
        promoCode: order.coupon_code,
        promoDiscount: discount,
        deliveryFee,
        total: total > 0 ? total : netItems + deliveryFee,
        fulfillment: "Delivery",
        statusLabel: "Confirmed",
      });
      showPopup(`Order ${order.orderNumber} placed. Pay when it arrives.`, "success");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "We couldn't place the order. Check your connection and try again.";
      if (error instanceof ApiError && isBasketCheckoutFailure(error.code, message)) {
        showPopup(message, "warning");
        router.push(inline ? "/playground/cart-page" : "/cart");
        return;
      }
      showPopup(message, "error");
      setPlaceError(message);
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        idempotencyKey.current = null;
      }
    } finally {
      setPending(false);
    }
  };

  if (placed) {
    return (
      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col justify-center overflow-y-auto bg-paper",
          inline ? "h-full min-h-0" : "min-h-dvh",
        )}
      >
        <OrderPlacedContent
          summary={placed}
          live
          ordersHref={inline ? "/playground/orders-list" : "/orders"}
          homeHref={inline ? "/playground" : "/home"}
        />
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
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint">
                <Image
                  src="/icons/location.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8"
                  unoptimized
                />
              </span>
              <div className="min-w-0 flex-1">
                {hasDetails && address ? (
                  <>
                    <p className="truncate text-sm font-bold text-black">
                      {address.house || "Delivery"}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted">
                      {formatFullAddress(address)}
                    </p>
                  </>
                ) : hasLocation && address ? (
                  <>
                    <p className="truncate text-sm font-bold text-black">
                      {formatDeliveryLocationLabel(address) || "Location set"}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-5 text-muted">
                      Add house / street details to place your order
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
                onClick={openAddressForOrder}
                className="shrink-0 cursor-pointer text-sm font-bold text-leaf transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
              >
                {hasDetails ? "Edit" : hasLocation ? "Add details" : "Add"}
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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint">
                <Image
                  src="/icons/cash-on-delivery.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8"
                  unoptimized
                />
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
        {showPriceMayVary ? (
          <PriceMayVaryNotice variant={priceMayVaryVariant} />
        ) : null}
        <div className="rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10">
          <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
            <span className="text-muted">Item total</span>
            <span className="font-bold text-black tabular-nums">
              ₹{itemTotalLabel}
            </span>
          </div>
          {!demoBill && mrpTotal > subtotal ? (
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="text-muted">MRP</span>
              <span className="font-medium text-muted tabular-nums line-through">
                ₹{mrpTotal}
              </span>
            </div>
          ) : null}
          {couponLine ? (
            <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
              <span className="text-muted">Coupon ({couponLine.code})</span>
              <span className="font-bold text-leaf tabular-nums">
                −₹{Math.round(couponLine.discountRupees)}
              </span>
            </div>
          ) : null}
          <div
            className={cn(
              "flex items-center justify-between py-3 text-sm",
              highlightSavings && savingsLabel > 0
                ? "border-b border-dashed border-leaf"
                : "border-b border-forest/8",
            )}
          >
            <span
              className={cn(
                highlightSavings && savingsLabel > 0
                  ? "font-bold text-forest"
                  : "text-muted",
              )}
            >
              You save
            </span>
            <span
              className={cn(
                "tabular-nums text-leaf",
                highlightSavings && savingsLabel > 0
                  ? "text-base font-extrabold"
                  : "font-bold",
              )}
            >
              {savingsLabel > 0 ? `₹${Math.round(savingsLabel)}` : "₹0"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 text-sm">
            <span className="font-bold text-black">Total</span>
            <span className="font-extrabold text-leaf tabular-nums">
              {amountDue}
            </span>
          </div>
        </div>
        <ShopQuoteNotes quote={quote} />

        <div className="flex items-center justify-between rounded-2xl bg-track px-5 py-3.5 text-black shadow-[0_10px_28px_rgba(47,107,47,0.28)]">
          <span className="text-sm font-semibold">Amount due</span>
          <span className="text-xl font-extrabold tabular-nums">
            {amountDue}
          </span>
        </div>

        <button
          type="button"
          disabled={
            pending ||
            minimumBlocks ||
            (signedIn && orderLines.length === 0)
          }
          onClick={() => void placeOrder()}
          className={cn(
            "group flex w-full items-center justify-center gap-2 rounded-full bg-track px-5 py-4 text-base font-extrabold text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
            pending || (signedIn && orderLines.length === 0)
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)]",
          )}
        >
          {pending
            ? pendingLabel
            : !signedIn
              ? "Sign in to place order"
              : orderLines.length === 0
                ? "Add items to place order"
                : !hasDetails
                  ? hasLocation
                    ? "Add details to place order"
                    : "Add address to place order"
                  : "Place Order"}
          <Check className="h-5 w-5" aria-hidden />
        </button>

        <p className="text-center text-[13px] font-medium text-muted" role="status">
          {placeError ??
            areaNote ??
            (!signedIn
              ? "Sign in so we can send this order to the shop."
              : orderLines.length === 0
                ? "Your basket is empty — add items from the cart."
                : !hasDetails
                  ? hasLocation
                    ? "Location saved — add house / street details, then place the order."
                    : "Add a delivery address, then Place Order unlocks."
                  : isLatLng(address)
                    ? "Ready — Cash on delivery. We'll confirm this location when you place the order."
                    : "Ready — we'll ask for your location when you place the order.")}
        </p>
      </div>

      <AddressBookSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) setSheetEditId(null);
        }}
        initialStep={sheetStep}
        editId={sheetEditId}
      />
    </main>
  );
}
