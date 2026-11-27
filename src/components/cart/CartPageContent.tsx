"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  resolveCartProduct,
  useCart,
} from "@/components/cart/CartContext";
import { CartBill } from "@/components/cart/CartBill";
import { CartCheckoutBar } from "@/components/cart/CartCheckoutBar";
import { CartCouponRow } from "@/components/cart/CartCouponRow";
import { CartFreeItems } from "@/components/cart/CartFreeItems";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartSuggestions } from "@/components/cart/CartSuggestions";
import { ShopQuoteNotes } from "@/components/cart/ShopQuoteNotes";
import { useShopQuote } from "@/components/cart/useShopQuote";
import { OfflineStatusBanner } from "@/components/storefront/OfflineStatusBanner";
import { PriceMayVaryExplainSheet } from "@/components/storefront/PriceMayVaryExplainSheet";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import { pushNavReturn } from "@/lib/nav-return-stack";
import { PRICE_MAY_VARY_TOPIC } from "@/lib/price-may-vary";
import {
  hasSeenPriceMayVary,
  markPriceMayVarySeen,
} from "@/lib/price-may-vary-session";
import { findCouponByCode } from "@/lib/sample-coupons";
import { showPopup } from "@/components/ui/Toast";
import { previewCart } from "@/lib/api/cart";
import { listShopCoupons } from "@/lib/api/shop-coupons";
import { ApiError } from "@/lib/api/errors";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import {
  localCheckoutWarning,
  previewCheckoutWarning,
  shopCheckoutLines,
} from "@/lib/cart-checkout-rules";
import { confirmShopPromo } from "@/lib/shop-promo";
import { useCartBill } from "@/lib/use-cart-bill";
import { cn } from "@/lib/cn";
import type { SampleProduct } from "@/lib/sample-products";

type CartPageContentProps = {
  /**
   * `page` — storefront full viewport.
   * `inline` — playground frame (`h-full` + back to /playground).
   */
  chromePosition?: "page" | "inline";
  /** Tap “View all coupons” → browse, then return. */
  couponPickerHref?: string;
  /** Show “Prices may vary…” above suggestions. */
  showPriceMayVary?: boolean;
  /** “Add more products” + You may also like rail. */
  showCartSuggestions?: boolean;
  /**
   * Playground: force guest vs signed-in without a real session.
   * Omit on storefront to use `hasCustomerSession`.
   */
  previewSignedIn?: boolean;
  /**
   * Playground: use sample coupons / local apply instead of shop APIs.
   * Live cart always uses shop coupons.
   */
  sampleCoupons?: boolean;
};

/**
 * Cart page: items, free gifts, coupon, bill from shop preview, checkout.
 */
export function CartPageContent({
  chromePosition = "page",
  couponPickerHref,
  showPriceMayVary = false,
  showCartSuggestions = false,
  previewSignedIn,
  sampleCoupons = false,
}: CartPageContentProps) {
  const inline = chromePosition === "inline";
  const liveShop = !sampleCoupons;
  const router = useRouter();
  const sessionSignedIn = useCustomerSignedIn();
  const signedIn = previewSignedIn ?? sessionSignedIn;
  const loginHref = inline
    ? "/login?next=/playground/cart-page"
    : "/login?next=/cart";
  const [checkingOut, setCheckingOut] = useState(false);
  const [priceVaryOpen, setPriceVaryOpen] = useState(false);
  const [pendingCheckoutHref, setPendingCheckoutHref] = useState<string | null>(
    null,
  );
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const {
    items,
    setQty,
    setWeight,
    setCustomizing,
    count,
    subtotal,
    mrpTotal,
    appliedPromo,
    promoDiscount,
    applyPromo,
    storeShopPromo,
    clearPromo,
  } = useCart();
  const hasItems = items.length > 0;
  const applied = appliedPromo;

  const shopCouponsQuery = useQuery({
    queryKey: ["coupons", "cart-top"],
    queryFn: ({ signal }) => listShopCoupons(undefined, signal),
    enabled: liveShop && signedIn,
  });
  const offerCoupons = liveShop ? (shopCouponsQuery.data ?? []) : undefined;

  const { quote, failed, quoteMatchesBasket } = useShopQuote(
    items,
    applied?.code ?? null,
  );

  const localCoupon =
    applied && promoDiscount > 0
      ? { code: applied.code, discountRupees: promoDiscount }
      : null;

  const bill = useCartBill({
    itemCount: count,
    mrpTotal,
    subtotal,
    localCoupon: liveShop ? null : localCoupon,
    quote: liveShop ? quote : null,
  });

  // Clear a coupon the shop rejected (popup + message after paint).
  useEffect(() => {
    if (!liveShop || !applied?.code || !quote) return;
    if (quote.coupon.status !== "not_applicable") return;
    const message =
      quote.coupon.reasonMessage?.trim() ||
      "This coupon can't be applied to this basket.";
    clearPromo();
    const id = window.setTimeout(() => {
      setPromoMessage(message);
      showPopup(message, "error");
    }, 0);
    return () => window.clearTimeout(id);
  }, [liveShop, applied?.code, quote, clearPromo]);

  const shopLineByProduct = useMemo(() => {
    const map = new Map<string, NonNullable<typeof quote>["lines"][number]>();
    for (const line of quote?.lines ?? []) {
      if (line.productId && !line.isBundleReward) {
        map.set(line.productId, line);
      }
    }
    return map;
  }, [quote]);

  const removeItem = (productId: string, isWeight: boolean) => {
    if (isWeight) setWeight(productId, null);
    else setQty(productId, 0);
  };

  const onApplyPromoCode = (code: string) => {
    if (liveShop) {
      if (!signedIn) {
        showPopup("Sign in to apply a coupon.", "warning");
        router.push(loginHref);
        return;
      }
      if (applyingPromo) return;
      setApplyingPromo(true);
      void confirmShopPromo(code, items)
        .then((result) => {
          setPromoMessage(result.message);
          if (result.ok) {
            storeShopPromo(result.coupon);
            showPopup(result.message, "success");
          } else {
            showPopup(result.message, "error");
          }
        })
        .finally(() => setApplyingPromo(false));
      return;
    }
    const result = applyPromo(code);
    setPromoMessage(result.message);
    if (result.ok) showPopup(result.message, "success");
    else showPopup(result.message, "error");
  };

  const appliedCouponMeta = applied
    ? (offerCoupons?.find(
        (c) => c.code.toUpperCase() === applied.code.toUpperCase(),
      ) ?? findCouponByCode(applied.code))
    : undefined;

  const onClearPromo = () => {
    clearPromo();
    setPromoMessage(null);
    showPopup("Promo removed", "info");
  };

  const goCheckoutOrExplain = (next: string) => {
    if (showPriceMayVary && !hasSeenPriceMayVary()) {
      setPendingCheckoutHref(next);
      setPriceVaryOpen(true);
      return;
    }
    router.push(next);
  };

  const onCheckout = async () => {
    if (checkingOut) return;
    if (!signedIn) {
      showPopup("Sign in to continue to checkout.", "warning");
      router.push(loginHref);
      return;
    }
    const next = inline ? "/playground/checkout" : "/checkout";
    const lines = shopCheckoutLines(items);
    if (lines.length === 0) {
      router.push(next);
      return;
    }
    if (bill.minimumMessage) {
      showPopup(bill.minimumMessage, "warning");
      return;
    }
    const local = localCheckoutWarning(items);
    if (local) {
      showPopup(local, "warning");
      return;
    }
    if (quoteMatchesBasket && quote && !failed) {
      if (quote.checkoutWarning) {
        showPopup(quote.checkoutWarning, "warning");
        return;
      }
      goCheckoutOrExplain(next);
      return;
    }
    setCheckingOut(true);
    try {
      const preview = await previewCart({
        items: lines,
        couponCode: applied?.code ?? null,
        includeSuggestedCoupons: false,
      });
      const warning = previewCheckoutWarning(
        preview,
        lines.map((line) => line.productId),
      );
      if (warning) {
        showPopup(warning, "warning");
        return;
      }
      goCheckoutOrExplain(next);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "We couldn't check this basket. Try again.";
      showPopup(message, "error");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <main
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col bg-paper px-5",
        inline ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <PageHeader backHref={inline ? "/playground" : "/home"} title="Cart" />
      <OfflineStatusBanner className="!px-0 pt-2" />
      <p className="pb-1 text-center text-[13px] font-semibold text-forest">
        Step 1 · Your cart
      </p>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain -mx-4 px-4",
          !hasItems && "flex flex-col",
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
              {items.map((item) => (
                <CartLineItem
                  key={item.productId}
                  item={item}
                  shopLine={shopLineByProduct.get(item.productId)}
                  onSetQty={setQty}
                  onEditWeight={(product: SampleProduct) => {
                    setCustomizing(product);
                  }}
                  onRemove={removeItem}
                />
              ))}
            </ul>

            <CartFreeItems items={quote?.freeItems ?? []} />

            <CartCouponRow
              className="mt-4"
              subtotal={subtotal}
              appliedCode={applied?.code}
              appliedMeta={appliedCouponMeta}
              promoMessage={promoMessage}
              applying={applyingPromo}
              couponPickerHref={couponPickerHref}
              offerCoupons={offerCoupons}
              onApply={onApplyPromoCode}
              onClear={onClearPromo}
            />

            <CartBill bill={bill} className="mt-6" />

            <ShopQuoteNotes quote={quote} hideMinimum />

            {showPriceMayVary ? (
              <PriceMayVaryNotice className="mt-6" variant="soft" />
            ) : null}

            {showCartSuggestions ? (
              <CartSuggestions
                className="mt-4"
                cartProductIds={items.map((item) => item.productId)}
                categoryIds={items.flatMap((item) => {
                  const categoryId = resolveCartProduct(item).categoryId;
                  return categoryId ? [categoryId] : [];
                })}
                sampleFallback={inline || sampleCoupons}
                shopHref={inline ? "/playground" : "/home"}
              />
            ) : null}
          </>
        )}
      </div>

      {hasItems ? (
        <CartCheckoutBar
          toPay={bill.toPay}
          checkingOut={checkingOut}
          disabled={Boolean(bill.minimumMessage)}
          signedIn={signedIn}
          inline={inline}
          onCheckout={() => void onCheckout()}
        />
      ) : null}

      <PriceMayVaryExplainSheet
        open={priceVaryOpen}
        onOpenChange={(next) => {
          setPriceVaryOpen(next);
          if (!next) setPendingCheckoutHref(null);
        }}
        continueLabel="Continue to checkout"
        onContinue={() => {
          markPriceMayVarySeen();
          const href = pendingCheckoutHref;
          setPendingCheckoutHref(null);
          if (href) router.push(href);
        }}
        helpHref={
          inline
            ? `/playground/help-support?topic=${PRICE_MAY_VARY_TOPIC}`
            : `/profile/support?topic=${PRICE_MAY_VARY_TOPIC}`
        }
        onHelpClick={() => {
          const returnTo =
            pendingCheckoutHref ?? (inline ? "/playground/cart-page" : "/cart");
          pushNavReturn(returnTo);
        }}
      />
    </main>
  );
}
