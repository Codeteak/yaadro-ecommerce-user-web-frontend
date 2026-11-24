"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { AddressBookSheet } from "@/components/delivery/AddressBookSheet";
import { useCart } from "@/components/cart/CartContext";
import { CartBill } from "@/components/cart/CartBill";
import { ShopQuoteNotes } from "@/components/cart/ShopQuoteNotes";
import { useShopQuote } from "@/components/cart/useShopQuote";
import type { CartBillModel } from "@/lib/cart-bill";
import { useCartBill } from "@/lib/use-cart-bill";
import { formatRupees, shopCheckoutLines } from "@/lib/cart-checkout-rules";
import { previewDeliveryArea } from "@/lib/api/preview-delivery-area";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import { showPopup } from "@/components/ui/Toast";
import {
  OrderPlacedContent,
  type OrderPlacedSummary,
} from "@/components/checkout/OrderPlacedContent";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";
import { usePlaceOrder } from "@/components/checkout/usePlaceOrder";
import { mapCheckoutPlaceError } from "@/lib/checkout-place-error";
import { evaluateCheckoutReadiness } from "@/lib/checkout-readiness";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import { cn } from "@/lib/cn";
import {
  DELIVERY_ADDRESS_KEY,
  EMPTY_DELIVERY_ADDRESS,
  formatDeliveryLocationLabel,
  hasBrowseLocation,
  hasDeliveryDetails,
  subscribeDeliveryAddress,
  type DeliveryAddress,
} from "@/lib/delivery-address";
import { deliveryAreaBlock, isLatLng } from "@/lib/delivery-location";
import { LOCATION_TOASTS } from "@/lib/location-messages";
import {
  getSelectedAddress,
  isSavedAddressDetailsComplete,
  listSavedAddresses,
} from "@/lib/saved-addresses";

type CheckoutPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame (keeps in-page confirm for demos).
   */
  chromePosition?: "page" | "inline";
  /** Show “Prices may vary…” above the bill in the scroll body. */
  showPriceMayVary?: boolean;
  /**
   * Playground: force guest vs signed-in without a real session.
   * Omit on storefront to use `hasCustomerSession`.
   */
  previewSignedIn?: boolean;
  /**
   * Production: bill and readiness use shop cart preview.
   * Playground may omit this and use local sample promo math.
   */
  liveShopPricing?: boolean;
  /**
   * Playground-only fixture for the totals card.
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

function playgroundPlacedSummary(
  orderNumber: string,
  itemCount: number,
  toPay: number,
): OrderPlacedSummary {
  return {
    billNo: orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`,
    itemCount,
    subtotal: toPay,
    deliveryFee: 0,
    total: toPay,
    fulfillment: "Delivery",
    statusLabel: "Order placed",
  };
}

/**
 * Checkout UI: address, COD, order summary, bill, short sticky Place Order.
 * Live success navigates to `/orders/[id]?placed=1` (refresh-safe).
 */
export function CheckoutPageContent({
  chromePosition = "page",
  showPriceMayVary = false,
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
    : "/login?next=/checkout";
  const cartHref = inline ? "/playground/cart-page" : "/cart";
  const backHref = cartHref;

  const {
    items,
    clear,
    count,
    mrpTotal,
    subtotal,
    appliedPromo,
    promoDiscount,
    clearPromo,
  } = useCart();
  const { quote, isLoading: quoteLoading, basketKey, quoteMatchesBasket } =
    useShopQuote(items, appliedPromo?.code ?? null);
  const liveBill = useCartBill({
    itemCount: count,
    mrpTotal,
    subtotal,
    localCoupon:
      !liveShopPricing && appliedPromo && promoDiscount > 0
        ? { code: appliedPromo.code, discountRupees: promoDiscount }
        : null,
    quote: liveShopPricing ? quote : null,
  });
  const demoBillModel: CartBillModel | null = demoBill
    ? {
        itemCount: count,
        mrpTotal: demoBill.subtotalRupees + demoBill.saveRupees,
        productDiscount: Math.max(
          0,
          demoBill.saveRupees - demoBill.couponDiscountRupees,
        ),
        offers: [],
        coupon: {
          code: demoBill.couponCode,
          discountRupees: demoBill.couponDiscountRupees,
        },
        toPay: demoBill.totalRupees,
        saved: demoBill.saveRupees,
        minimumMessage: null,
        fromShop: false,
      }
    : null;
  const bill = demoBillModel ?? liveBill;
  const { pending, pendingLabel, place, clearIdempotency } = usePlaceOrder();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetEditId, setSheetEditId] = useState<string | null>(null);
  const [sheetStep, setSheetStep] = useState<"list" | "map" | "details">(
    "list",
  );
  const [areaByPin, setAreaByPin] = useState<{
    key: string;
    note: string | null;
  } | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  /** Playground / inline only — live storefront navigates away. */
  const [placed, setPlaced] = useState<OrderPlacedSummary | null>(null);

  const addressRaw = useSyncExternalStore(
    subscribeDeliveryAddress,
    getAddressRaw,
    () => null,
  );
  const address = useMemo((): DeliveryAddress | null => {
    if (!addressRaw) return null;
    try {
      return {
        ...EMPTY_DELIVERY_ADDRESS,
        ...(JSON.parse(addressRaw) as Partial<DeliveryAddress>),
      };
    } catch {
      return null;
    }
  }, [addressRaw]);

  const hasLocation = hasBrowseLocation(address);
  const hasDetails = hasDeliveryDetails(address);
  const orderLines = useMemo(() => shopCheckoutLines(items), [items]);

  // Clear a coupon the shop rejected (same rule as cart).
  useEffect(() => {
    if (!liveShopPricing || !appliedPromo?.code || !quote) return;
    if (quote.coupon.status !== "not_applicable") return;
    const message =
      quote.coupon.reasonMessage?.trim() ||
      "This coupon can't be applied to this basket.";
    clearPromo();
    const id = window.setTimeout(() => {
      setPlaceError(message);
      showPopup(message, "error");
    }, 0);
    return () => window.clearTimeout(id);
  }, [liveShopPricing, appliedPromo?.code, quote, clearPromo]);

  const pinKey =
    address && isLatLng(address) ? `${address.lat},${address.lng}` : null;
  const areaNote =
    pinKey && areaByPin?.key === pinKey ? areaByPin.note : null;

  useEffect(() => {
    if (!pinKey || !address || !isLatLng(address)) return;
    let cancelled = false;
    void previewDeliveryArea(address.lat, address.lng).then((area) => {
      if (cancelled) return;
      const blocked = deliveryAreaBlock(area);
      setAreaByPin({ key: pinKey, note: blocked });
      if (blocked) {
        showPopup(
          blocked,
          blocked === LOCATION_TOASTS.notServiceable.message
            ? LOCATION_TOASTS.notServiceable.tone
            : LOCATION_TOASTS.checkFailed.tone,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pinKey, address]);

  const readiness = evaluateCheckoutReadiness({
    signedIn,
    hasLocation,
    hasDetails,
    lineCount: orderLines.length,
    liveShopPricing,
    quoteLoading,
    quoteMatchesBasket: liveShopPricing ? quoteMatchesBasket : true,
    minimumMessage: bill.minimumMessage,
    checkoutWarning: liveShopPricing ? (quote?.checkoutWarning ?? null) : null,
    couponRejectedMessage: null,
    pending,
  });
  const statusMessage =
    placeError ?? areaNote ?? readiness.statusMessage;

  const openAddressForOrder = () => {
    const selected = getSelectedAddress();
    const saved = selected
      ? selected
      : listSavedAddresses().find(isSavedAddressDetailsComplete) ?? null;
    if (saved) {
      setSheetEditId(saved.id);
      setSheetStep(isSavedAddressDetailsComplete(saved) ? "details" : "map");
    } else if (hasDetails) {
      setSheetEditId(null);
      setSheetStep("details");
    } else {
      setSheetEditId(null);
      setSheetStep("map");
    }
    setSheetOpen(true);
  };

  const onPlaceOrder = async () => {
    if (!signedIn) {
      showPopup("Sign in to place your order.", "warning");
      router.push(loginHref);
      return;
    }
    if (!readiness.canPlace) {
      if (
        readiness.blockReason === "address" ||
        readiness.blockReason === "details"
      ) {
        const toast = hasLocation
          ? LOCATION_TOASTS.needAddressDetails
          : LOCATION_TOASTS.needAddress;
        setPlaceError(toast.message);
        showPopup(toast.message, toast.tone);
        openAddressForOrder();
      } else if (readiness.statusMessage) {
        setPlaceError(readiness.statusMessage);
        showPopup(readiness.statusMessage, "warning");
      }
      return;
    }
    if (!address) {
      openAddressForOrder();
      return;
    }

    setPlaceError(null);
    const result = await place({
      address,
      items: orderLines,
      couponCode: appliedPromo?.code ?? null,
      basketKey,
    });

    if (!result.ok) {
      if (result.failure.kind === "location") {
        const { message, tone } = LOCATION_TOASTS.allowLocation;
        setPlaceError(message);
        showPopup(message, tone);
        return;
      }
      if (result.failure.kind === "delivery") {
        const tone =
          result.failure.message === LOCATION_TOASTS.notServiceable.message
            ? LOCATION_TOASTS.notServiceable.tone
            : LOCATION_TOASTS.checkFailed.tone;
        setPlaceError(result.failure.message);
        showPopup(result.failure.message, tone);
        return;
      }
      const mapped = mapCheckoutPlaceError(result.failure.error);
      if (mapped.clearIdempotency) clearIdempotency();
      showPopup(mapped.message, mapped.tone);
      setPlaceError(mapped.message);
      if (mapped.action === "login") {
        router.push(loginHref);
        return;
      }
      if (mapped.action === "address") {
        openAddressForOrder();
        return;
      }
      if (mapped.action === "cart") {
        router.push(cartHref);
        return;
      }
      return;
    }

    const order = result.order;
    showPopup(
      `Order ${order.orderNumber} placed. Pay when it arrives.`,
      "success",
    );

    if (inline) {
      clear();
      setPlaced(
        playgroundPlacedSummary(order.orderNumber, count, bill.toPay),
      );
      return;
    }

    // Navigate first so refresh-safe confirm is never an empty checkout.
    const confirmHref = `/orders/${order.orderId}?placed=1`;
    router.replace(confirmHref);
    clear();
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({
      queryKey: ["order", order.orderId],
    });
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

  const placeDisabled =
    pending ||
    (!signedIn ? false : !readiness.canPlace) ||
    Boolean(areaNote);

  return (
    <main
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <PageHeader backHref={backHref} title="Checkout" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain -mx-4 px-4 pb-36">
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

        <CheckoutOrderSummary
          className="mt-6"
          items={items}
          shopLines={quote?.lines}
          freeItems={quote?.freeItems}
          editHref={cartHref}
        />

        {showPriceMayVary ? (
          <div className="mt-6">
            <PriceMayVaryNotice variant="soft" />
          </div>
        ) : null}

        <div className="mt-4">
          <CartBill bill={bill} />
          <ShopQuoteNotes quote={quote} hideMinimum />
        </div>
      </div>

      <div
        className={cn(
          "z-30 space-y-2",
          inline
            ? "absolute inset-x-0 bottom-0 px-5 pb-5"
            : "fixed inset-x-0 bottom-0 mx-auto w-full max-w-lg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(47,107,47,0.12)] ring-1 ring-forest/10">
          <span className="text-sm font-semibold text-muted">To pay</span>
          <span className="text-lg font-extrabold tabular-nums text-forest">
            {formatRupees(bill.toPay)}
          </span>
        </div>

        <button
          type="button"
          disabled={placeDisabled}
          onClick={() => void onPlaceOrder()}
          className={cn(
            "group flex w-full items-center justify-center gap-2 rounded-full bg-track px-5 py-4 text-base font-extrabold text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
            placeDisabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)]",
          )}
        >
          {pending ? pendingLabel : readiness.buttonLabel}
          <Check className="h-5 w-5" aria-hidden />
        </button>

        <p
          className="text-center text-[13px] font-medium text-muted"
          role="status"
        >
          {statusMessage}
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
