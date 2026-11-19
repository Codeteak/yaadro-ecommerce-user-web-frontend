"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CatalogImage } from "@/components/ui/CatalogImage";
import {
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import {
  resolveCartProduct,
  itemBadge,
  lineMrp,
  lineSave,
  lineTotal,
  useCart,
} from "@/components/cart/CartContext";
import { CartSuggestions } from "@/components/cart/CartSuggestions";
import {
  CartTopCoupons,
  topActiveCoupons,
} from "@/components/cart/CartTopCoupons";
import { ShopQuoteNotes, shopDue } from "@/components/cart/ShopQuoteNotes";
import { useShopQuote } from "@/components/cart/useShopQuote";
import { PriceMayVaryNotice } from "@/components/storefront/PriceMayVaryNotice";
import { findCouponByCode } from "@/lib/sample-coupons";
import { showPopup } from "@/components/ui/Toast";
import { previewCart } from "@/lib/api/cart";
import { listShopCoupons } from "@/lib/api/shop-coupons";
import { ApiError } from "@/lib/api/errors";
import { useCustomerSignedIn } from "@/components/auth/useCustomerSignedIn";
import {
  billCouponLine,
  localCheckoutWarning,
  previewCheckoutWarning,
  shopCheckoutLines,
} from "@/lib/cart-checkout-rules";
import { confirmShopPromo } from "@/lib/shop-promo";
import { cn } from "@/lib/cn";
import { isProductImageFallback, productPhoto } from "@/lib/product-image";

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
  /** Show “Prices may vary…” above the bill summary. */
  showPriceMayVary?: boolean;
  /** Soft = storefront default; banner kept for comparison. */
  priceMayVaryVariant?: "banner" | "soft";
  /**
   * Where the notice sits when shown.
   * `above-add-more` — storefront default (above Add more products).
   * `above-totals` — under coupon / above bill summary.
   */
  priceMayVaryPlacement?: "above-totals" | "above-add-more";
  /** “Add more products” + You may also like rail under the cart list. */
  showCartSuggestions?: boolean;
  /** Stronger “You save” highlight in the bill summary. */
  highlightSavings?: boolean;
  /** Top 2 active coupons + min-order lines above the coupon field. */
  showTopCoupons?: boolean;
  /** Refined Top offers: collapse inside coupon card + honest Apply lock. */
  topCouponsRefined?: boolean;
  /**
   * Shop minimum cart ribbon above Checkout (only while under min).
   * Uses `minCartValueRupees` until preview `min_purchase_*` is wired for display.
   */
  showMinCartValue?: boolean;
  /** Shop minimum in whole rupees (default 499 until shop preview drives it). */
  minCartValueRupees?: number;
  /**
   * Playground: force guest vs signed-in without a real session.
   * Omit on storefront to use `hasCustomerSession`.
   */
  previewSignedIn?: boolean;
  /**
   * Playground Phase A (#16): weight Edit + kg sit under the line (bottom),
   * not beside the title. Omit / false keeps the side control (live default).
   */
  weightAtBottom?: boolean;
  /**
   * Playground Phase A (#19): bill uses selling subtotal + clearer Total so
   * Checkout ₹ tracks the coupon. Live cart keeps prior layout until wired.
   */
  syncCheckoutTotal?: boolean;
  /**
   * Production: top offers + apply + coupon −₹ from shop APIs only.
   * Playground omits this and keeps SAMPLE_COUPONS / local apply.
   */
  liveShopCoupons?: boolean;
};

/**
 * Cart page content (reference-style list, Yaadro colours).
 * Discount field with green highlight shell; totals reflect sample promo
 * (shared with checkout via CartContext). Checkout links to /checkout.
 */
export function CartPageContent({
  chromePosition = "page",
  couponPickerHref,
  showPriceMayVary = false,
  priceMayVaryVariant = "soft",
  priceMayVaryPlacement = "above-add-more",
  showCartSuggestions = false,
  highlightSavings = false,
  showTopCoupons = false,
  topCouponsRefined = false,
  showMinCartValue = false,
  minCartValueRupees = 499,
  previewSignedIn,
  weightAtBottom = false,
  syncCheckoutTotal = false,
  liveShopCoupons = false,
}: CartPageContentProps) {
  const inline = chromePosition === "inline";
  const router = useRouter();
  const sessionSignedIn = useCustomerSignedIn();
  const signedIn = previewSignedIn ?? sessionSignedIn;
  const loginHref = inline
    ? "/login?next=/playground/cart-page"
    : "/login?next=/cart";
  const [checkingOut, setCheckingOut] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  /** Top offers nested under coupon shell when refined; collapsed by default. */
  const [topOffersOpen, setTopOffersOpen] = useState(false);
  const rejectedCouponRef = useRef<string | null>(null);
  const {
    items,
    setQty,
    setWeight,
    setCustomizing,
    // clear — only used by Clear basket (hidden below)
    subtotal,
    mrpTotal,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
    applyPromo,
    storeShopPromo,
    clearPromo,
  } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const hasItems = items.length > 0;
  const applied = appliedPromo;
  const shopCouponsQuery = useQuery({
    queryKey: ["coupons", "cart-top"],
    queryFn: ({ signal }) => listShopCoupons(undefined, signal),
    enabled: liveShopCoupons && signedIn && showTopCoupons,
  });
  const offerCoupons = liveShopCoupons
    ? (shopCouponsQuery.data ?? [])
    : undefined;
  const topOfferCount = showTopCoupons
    ? topActiveCoupons(offerCoupons).length
    : 0;
  const showOfferList = showTopCoupons && topOfferCount > 0;
  const { quote, failed } = useShopQuote(items, applied?.code ?? null);
  const dueLabel = shopDue(quote, totalDue);
  const minimumBlocks = Boolean(quote?.minimumMessage);
  const couponLine = billCouponLine(
    liveShopCoupons ? "shop" : "sample",
    quote,
    applied && promoDiscount > 0
      ? { code: applied.code, discountRupees: promoDiscount }
      : null,
  );
  const savingsLabel = liveShopCoupons
    ? Math.max(
        0,
        Math.round(
          (mrpTotal - (quote?.totalRupees ?? totalDue)) * 100,
        ) / 100,
      )
    : totalSaved;

  useEffect(() => {
    if (appliedPromo) setPromoInput(appliedPromo.code);
  }, [appliedPromo]);

  useEffect(() => {
    if (!liveShopCoupons || !applied?.code || !quote) return;
    if (quote.coupon.status !== "not_applicable") {
      rejectedCouponRef.current = null;
      return;
    }
    const key = `${applied.code}:${quote.coupon.reasonMessage ?? ""}`;
    if (rejectedCouponRef.current === key) return;
    rejectedCouponRef.current = key;
    clearPromo();
    setPromoInput("");
    const message =
      quote.coupon.reasonMessage?.trim() ||
      "This coupon can't be applied to this basket.";
    setPromoMessage(message);
    showPopup(message, "error");
  }, [liveShopCoupons, applied?.code, quote, clearPromo]);

  const removeItem = (productId: string, isWeight: boolean) => {
    if (isWeight) setWeight(productId, null);
    else setQty(productId, 0);
  };

  const onApplyPromoCode = (code: string) => {
    if (liveShopCoupons) {
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
            setPromoInput(result.code);
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
    if (result.ok) {
      setPromoInput(result.code);
      showPopup(result.message, "success");
    } else {
      showPopup(result.message, "error");
    }
  };

  const onApplyPromo = () => {
    onApplyPromoCode(promoInput);
  };

  const appliedCouponMeta = applied
    ? (offerCoupons?.find(
        (c) => c.code.toUpperCase() === applied.code.toUpperCase(),
      ) ?? findCouponByCode(applied.code))
    : undefined;

  const onClearPromo = () => {
    clearPromo();
    setPromoInput("");
    setPromoMessage(null);
    showPopup("Promo removed", "info");
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
    if (quote?.minimumMessage) {
      showPopup(quote.minimumMessage, "warning");
      return;
    }
    const local = localCheckoutWarning(lines);
    if (local) {
      showPopup(local, "warning");
      return;
    }
    // Reuse the debounced shop quote when it already priced this basket.
    if (quote && !failed) {
      if (quote.checkoutWarning) {
        showPopup(quote.checkoutWarning, "warning");
        return;
      }
      router.push(next);
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
      router.push(next);
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
        // Fixed height so PullToRefresh is the real scrollport (not the window).
        inline ? "h-full min-h-0" : "h-dvh min-h-0",
      )}
    >
      <PageHeader backHref={inline ? "/playground" : "/home"} title="Cart" />
      <p className="pb-1 text-center text-[13px] font-semibold text-forest">
        Step 1 · Your cart
      </p>

      {/* Plain scroller — PullToRefresh touch handlers blocked cart scroll.
          -mx/px gives shadow bleed room (overflow-y also clips the sides). */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain -mx-4 px-4",
          // Flex column when empty so justify-center matches wishlist empty.
          !hasItems && "flex flex-col",
          hasItems && (showMinCartValue ? "pb-44" : "pb-36"),
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
                const product = resolveCartProduct(item);
                const photo = productPhoto(product.image);
                const isWeight = Boolean(item.weightKg);
                const selling = lineTotal(item);
                const mrp = lineMrp(item);
                const save = lineSave(item);
                const stepKg = product.customization?.stepKg;
                const unitHint = isWeight
                  ? `By weight, ₹${product.price} / ${stepKg != null ? `${stepKg} kg` : product.unit}`
                  : `₹${product.price} / ${product.unit}`;
                return (
                  <li key={item.productId} className="flex items-start gap-3 py-4">
                    <div className="relative shrink-0 self-center">
                      <CatalogImage
                        src={photo}
                        alt=""
                        width={128}
                        height={128}
                        className={cn(
                          "h-16 w-16 rounded-2xl",
                          isProductImageFallback(photo)
                            ? "object-contain"
                            : "object-cover",
                        )}
                      />
                      {!weightAtBottom || !isWeight ? (
                        <span className="absolute top-1/2 -right-2 -translate-y-1/2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-black shadow-[0_4px_10px_rgba(47,107,47,0.22)] ring-1 ring-leaf/20">
                          {itemBadge(item)}
                        </span>
                      ) : null}
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
                          {weightAtBottom && isWeight ? (
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="rounded-full bg-mint/80 px-2.5 py-1 text-[12px] font-extrabold tabular-nums text-forest ring-1 ring-leaf/20">
                                {itemBadge(item)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCustomizing(product)}
                                className="cursor-pointer text-sm font-semibold text-leaf underline underline-offset-4 transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                              >
                                Edit weight
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 self-center">
                          {isWeight && !weightAtBottom ? (
                            <button
                              type="button"
                              onClick={() => setCustomizing(product)}
                              className="cursor-pointer text-sm font-semibold text-leaf underline underline-offset-4 transition hover:text-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                            >
                              Edit
                            </button>
                          ) : !isWeight ? (
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
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, isWeight)}
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
              })}
            </ul>

            {showPriceMayVary && priceMayVaryPlacement === "above-add-more" ? (
              <PriceMayVaryNotice
                className="mt-6"
                variant={priceMayVaryVariant}
              />
            ) : null}

            {showCartSuggestions ? (
              <CartSuggestions
                className={
                  showPriceMayVary && priceMayVaryPlacement === "above-add-more"
                    ? "mt-4"
                    : undefined
                }
                cartProductIds={items.map((item) => item.productId)}
                categoryIds={items.flatMap((item) => {
                  const categoryId = resolveCartProduct(item).categoryId;
                  return categoryId ? [categoryId] : [];
                })}
                sampleFallback={inline}
                shopHref={inline ? "/playground" : "/home"}
              />
            ) : null}

            {/* Clear basket — hidden for now
            <button
              type="button"
              onClick={() => {
                clear();
                setPromoInput("");
                setPromoMessage(null);
                showPopup("Basket cleared", "info");
              }}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(47,107,47,0.18)] ring-2 ring-black/15 transition hover:ring-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <Trash2 className="h-4 w-4 text-black" aria-hidden />
              Clear basket
            </button>
            */}

            {showOfferList && !topCouponsRefined ? (
              <CartTopCoupons
                className="mt-4"
                subtotal={subtotal}
                appliedCode={applied?.code}
                onApply={onApplyPromoCode}
                coupons={offerCoupons}
              />
            ) : null}

            <div className="mt-4 rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(47,107,47,0.14)] ring-2 ring-leaf">
              {showOfferList && topCouponsRefined ? (
                <>
                  <button
                    type="button"
                    onClick={() => setTopOffersOpen((open) => !open)}
                    aria-expanded={topOffersOpen}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl bg-paper/80 px-2.5 py-2 ring-1 ring-forest/10 transition hover:bg-mint/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint">
                      <Image
                        src="/icons/coupon.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5"
                        unoptimized
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-bold text-black">
                        Top offers
                      </span>
                      <span className="block text-[12px] font-medium text-muted">
                        {topOfferCount} available
                        {applied ? ` · ${applied.code}` : ""}
                      </span>
                    </span>
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-extrabold text-forest">
                      {topOfferCount}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-forest transition-transform duration-200",
                        topOffersOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      topOffersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <CartTopCoupons
                        className="mt-2.5 px-0.5 pb-1"
                        subtotal={subtotal}
                        appliedCode={applied?.code}
                        onApply={onApplyPromoCode}
                        coupons={offerCoupons}
                        refined
                        embedded
                      />
                    </div>
                  </div>
                  <div className="my-2.5 border-t border-forest/10" />
                </>
              ) : null}

              <div className="flex items-center gap-2 rounded-xl bg-paper/80 px-2.5 py-2 ring-1 ring-forest/10">
                {!(showOfferList && topCouponsRefined) ? (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint">
                    <Image
                      src="/icons/coupon.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5"
                      unoptimized
                    />
                  </span>
                ) : null}
                {couponPickerHref && !applied ? (
                  <>
                    <Link
                      href={couponPickerHref}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      {showOfferList && topCouponsRefined
                        ? "View all coupons"
                        : "Select a coupon"}
                    </Link>
                    <Link
                      href={couponPickerHref}
                      className="h-9 shrink-0 cursor-pointer rounded-xl bg-track px-4 text-sm font-semibold leading-9 text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      {showOfferList && topCouponsRefined ? "All" : "Select"}
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
                        disabled={applyingPromo}
                        className="h-9 shrink-0 cursor-pointer rounded-xl bg-track px-4 text-sm font-semibold text-black transition hover:bg-leaf-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-wait disabled:opacity-70"
                      >
                        {applyingPromo ? "…" : "Apply"}
                      </button>
                    )}
                  </>
                )}
              </div>
              {showTopCoupons && appliedCouponMeta ? (
                <p className="mt-2 text-center text-[12px] font-medium text-forest" role="status">
                  {appliedCouponMeta.minOrderLabel}
                  {appliedCouponMeta.subtitle
                    ? ` · ${appliedCouponMeta.subtitle}`
                    : null}
                </p>
              ) : null}
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

            {showPriceMayVary && priceMayVaryPlacement === "above-totals" ? (
              <PriceMayVaryNotice
                className="mt-6"
                variant={priceMayVaryVariant}
              />
            ) : null}

            <div
              className={cn(
                "rounded-2xl bg-white px-4 py-1 shadow-[0_8px_24px_rgba(47,107,47,0.1)] ring-1 ring-forest/10",
                showPriceMayVary && priceMayVaryPlacement === "above-totals"
                  ? "mt-3"
                  : "mt-6",
              )}
            >
              {syncCheckoutTotal ? (
                <>
                  <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                    <span className="text-muted">Item total</span>
                    <span className="font-bold text-black tabular-nums">
                      ₹{subtotal}
                    </span>
                  </div>
                  {mrpTotal > subtotal ? (
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
                    <span
                      key={`due-${dueLabel}-${couponLine?.code ?? "none"}`}
                      className="font-extrabold text-leaf tabular-nums"
                    >
                      {dueLabel}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-bold text-black">₹{mrpTotal}</span>
                  </div>
                  {couponLine ? (
                    <div className="flex items-center justify-between border-b border-forest/8 py-3 text-sm">
                      <span className="text-muted">Coupon ({couponLine.code})</span>
                      <span className="font-bold text-leaf">
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
                      {dueLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
            <ShopQuoteNotes quote={quote} />
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
          {showMinCartValue &&
          minCartValueRupees > 0 &&
          totalDue < minCartValueRupees ? (
            <div
              className="pointer-events-none relative mb-2.5 overflow-hidden rounded-xl bg-amber-400 px-4 py-2.5 text-center text-amber-950 shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
              role="status"
            >
              <span
                className="pointer-events-none absolute top-0 left-0 h-full w-3 -skew-x-12 bg-white/25"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute top-0 right-0 h-full w-3 -skew-x-12 bg-black/10"
                aria-hidden
              />
              <p className="relative text-[13px] leading-snug font-extrabold tracking-tight">
                Min. cart ₹{minCartValueRupees.toLocaleString("en-IN")}
                <span className="font-bold"> · </span>
                Add ₹
                {(minCartValueRupees - totalDue).toLocaleString("en-IN")} more
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void onCheckout()}
            disabled={checkingOut || minimumBlocks}
            aria-label="Proceed to checkout"
            className="group pointer-events-auto relative flex w-full cursor-pointer items-center rounded-full bg-track px-5 py-4 text-black shadow-[0_7px_0_0_#1f5c1f,0_14px_28px_rgba(47,107,47,0.28)] transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-leaf-bright motion-safe:active:translate-y-[5px] motion-safe:active:shadow-[0_2px_0_0_#1f5c1f,0_6px_14px_rgba(47,107,47,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              key={
                syncCheckoutTotal
                  ? `checkout-${dueLabel}-${applied?.code ?? "none"}`
                  : undefined
              }
              className="text-xl leading-tight font-extrabold tabular-nums"
            >
              {dueLabel}
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold tracking-tight text-black">
              {checkingOut
                ? "Checking…"
                : !signedIn
                  ? "Sign in to checkout"
                  : "Checkout"}
            </span>
            <span className="ml-auto grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-[0_3px_0_0_rgba(0,0,0,0.12)] motion-safe:group-active:shadow-none">
              <ArrowRight className="h-5 w-5 text-black" aria-hidden />
            </span>
          </button>
        </div>
      ) : null}
    </main>
  );
}
