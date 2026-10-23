"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@heroui/react";
import { useCart } from "../../context/CartContext";
import { useAddress } from "../../context/AddressContext";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import ProductCarousel from "../../components/ProductCarousel";
import { useProducts } from "../../hooks/useProducts";
import { placeStorefrontOrder } from "../../utils/storefrontCheckoutApi";
import {
  getApiErrorCode,
  getCheckoutErrorMessage,
  isNetworkError,
} from "../../utils/apiErrors";
import { couponKeys } from "../../hooks/useCoupons";
import { cartKeys } from "../../hooks/useCart";
import { verifyDeliveryAtCoords } from "../../utils/verifyDeliveryAtCoords";
import { getStorefrontCookieSiteWarning } from "../../utils/storefrontApiSite";
import {
  readCheckoutDraft,
  writeCheckoutDraft,
  clearCheckoutDraft,
  markPostOrderBackToHome,
} from "../../utils/checkoutSession";
import { useLoginNavigation } from "../../hooks/useLoginNavigation";
import CheckoutCouponsSection from "../../components/CheckoutCouponsSection";
import { getCartBottomBarPricing } from "../../utils/cartSavings";
import {
  BXGY_COUPON_BLOCKED_MESSAGE,
  sumCartPaidUnits,
} from "../../utils/cartPromotions";
import { buildCheckoutLinesFromCartItems } from "../../utils/storefrontCheckoutLines";
import {
  buildCartOfferGroups,
  getCouponThresholdHint,
} from "../../utils/offerDisplay";
import { minorToMajor } from "../../utils/currencyMinor";
import { normalizePhoneForApi } from "../../utils/otpVerifyPayload";
import PhoneChangeOtpSheet from "../../components/PhoneChangeOtpSheet";
import { useLocationService } from "../../context/LocationServiceContext";
import ConfirmModal from "../../components/ConfirmModal";
import CheckoutPageSkeleton from "../../components/skeletons/CheckoutPageSkeleton";
import OfferGroupCard from "../../components/promotions/OfferGroupCard";
import { ALLOW_AUTO_CART, COUPONS_ONLY } from "../../lib/couponsOnly";
import {
  categoryProductsHref,
  getPrimaryAppliedAutoCartOffer,
} from "../../utils/autoCartOffers";
import CouponThresholdBanner from "../../components/promotions/CouponThresholdBanner";
import MinPurchaseBanner from "../../components/MinPurchaseBanner";
import { minPurchaseBannerMessage } from "../../utils/minPurchase";
import { BRAND_CHECKOUT_BTN, PRESSABLE_ICON_BTN_SOFT } from "../../components/ui/brandButton";
import { formatAddressDisplay } from "../../utils/formatAddress";
import { AddressCardSkeleton } from "../../components/skeletons/primitives";
import { useLayoutHeights } from "../../context/LayoutHeightsContext";
import { buildSuggestedProductSections } from "../../utils/suggestedProducts";

function isAddressNotServiceableError(err) {
  const code = getApiErrorCode(err) || err?.code;
  return code === "ADDRESS_NOT_SERVICEABLE";
}

/** Missing checkout prerequisites the customer can fix (existing rules only). */
function getCheckoutReadinessIssues({
  selectedAddressId,
  selectedAddress,
  selectedAddressCoords,
}) {
  const issues = [];
  if (!selectedAddressId) {
    issues.push({
      id: "address",
      message: "Please add a delivery address.",
    });
    return issues;
  }
  const line1 = String(
    selectedAddress?.line1 || selectedAddress?.street || "",
  ).trim();
  if (!line1) {
    issues.push({
      id: "line1",
      message: "Please enter Address Line 1.",
    });
  }
  if (!selectedAddressCoords) {
    issues.push({
      id: "coords",
      message: "Please select a delivery location on the map.",
    });
  }
  return issues;
}

/* ─────────────────────────────────────────────
   Small helpers
───────────────────────────────────────────── */

function SectionHeading({ children, aside, optional }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold text-gray-900">
        {children}
        {optional ? (
          <span className="ml-1 text-[12px] font-normal text-gray-400">
            (optional)
          </span>
        ) : null}
      </h2>
      {aside}
    </div>
  );
}

function Divider() {
  return <hr className="border-t border-gray-100 my-3" />;
}

function hasUserPhone(user) {
  if (!user || typeof user !== "object") return false;
  const raw = user.phone ?? user.mobile ?? user.phoneNumber ?? "";
  return normalizePhoneForApi(raw).length === 10;
}

/* ─────────────────────────────────────────────
   Address card
───────────────────────────────────────────── */
function AddressCard({ address, selected, onSelect, onEdit }) {
  const { user } = useAuth();
  const pill = "bg-gray-100 text-gray-700";
  const addressLine = formatAddressDisplay(address);

  return (
    <div
      className={`flex w-full items-start gap-3 rounded-[18px] border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        selected ? "border-[#902bf5]" : "border-gray-200"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
        aria-pressed={selected}
      >
        {/* Radio */}
        <div
          className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
            selected ? "border-[#902bf5] bg-[#902bf5]" : "border-gray-300"
          }`}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>

        <div className="flex-1 min-w-0">
          {address.label && (
            <span
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full mb-1 ${pill}`}
            >
              {address.label}
            </span>
          )}
          <p className="text-[13px] font-medium text-gray-900 mb-0.5">
            {address.fullName || user?.name || "—"}
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            {addressLine || "—"}
          </p>
          {(address.phone || user?.phone) && (
            <p className="text-[12px] text-gray-400 mt-1">
              {address.phone || user?.phone}
            </p>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
        aria-label="Edit address"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
          />
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COD badge
───────────────────────────────────────────── */
function CodBadge() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50">
        <svg
          className="h-5 w-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium text-gray-900">
          Cash on delivery
        </p>
        <p className="mt-0.5 text-[12px] text-gray-500">
          Pay when your order arrives
        </p>
      </div>
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#902bf5]">
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Order items summary
───────────────────────────────────────────── */
function OrderSummary({
  cartItems,
  cartTotal,
  couponDiscount = 0,
  autoCartDiscount = 0,
  autoCartOffer = null,
  linePromoDiscount = 0,
  bundleDiscount = 0,
  promotionDiscount = null,
}) {
  const { mrpTotal, savings } = getCartBottomBarPricing(cartItems, cartTotal);
  const itemPromo =
    linePromoDiscount > 0.009
      ? linePromoDiscount
      : Math.max(
          0,
          savings - couponDiscount - autoCartDiscount - bundleDiscount,
        );
  const promoDiscount =
    promotionDiscount != null && promotionDiscount > 0.009
      ? promotionDiscount
      : Math.max(0, savings - (couponDiscount > 0.009 ? couponDiscount : 0));
  const totalQty = sumCartPaidUnits(cartItems);

  return (
    <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal ({totalQty} items)</span>
          <span className="font-medium text-gray-900 tabular-nums">
            ₹{mrpTotal.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
            Free
          </span>
        </div>
        {itemPromo > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Sale price savings</span>
            <span className="font-medium tabular-nums text-gray-900">
              −₹{itemPromo.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {!COUPONS_ONLY && bundleDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Free items (buy more, get free)</span>
            <span className="font-medium tabular-nums text-gray-900">
              −₹{bundleDiscount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {ALLOW_AUTO_CART && autoCartDiscount > 0.009 && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
            <div className="flex justify-between gap-3 text-emerald-900">
              <span className="font-medium">
                {autoCartOffer?.title || "Automatic discount"}
              </span>
              <span className="font-semibold tabular-nums">
                −₹{autoCartDiscount.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/90">
              {autoCartOffer?.message ||
                "Applied automatically — no coupon code needed."}
            </p>
            {autoCartOffer?.kind === "category_percent_off" &&
            autoCartOffer.categoryId ? (
              <Link
                href={categoryProductsHref(autoCartOffer.categoryId)}
                className="mt-1.5 inline-block text-[11px] font-semibold text-emerald-900 underline underline-offset-2"
              >
                Shop more in {autoCartOffer.categoryName || "this category"}
              </Link>
            ) : null}
          </div>
        )}
        {couponDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Coupon</span>
            <span className="font-medium tabular-nums text-gray-900">
              −₹{couponDiscount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {promoDiscount > 0.009 &&
          itemPromo <= 0.009 &&
          bundleDiscount <= 0.009 &&
          autoCartDiscount <= 0.009 && (
            <div className="flex justify-between text-gray-500">
              <span>Promo savings</span>
              <span className="font-medium tabular-nums text-gray-900">
                −₹{promoDiscount.toLocaleString("en-IN")}
              </span>
            </div>
          )}
      </div>

      <Divider />

      <div className="flex justify-between text-[15px] font-medium text-gray-900">
        <span>Total</span>
        <span className="tabular-nums">
          ₹{cartTotal.toLocaleString("en-IN")}
        </span>
      </div>
      <p
        role="note"
        className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] font-medium leading-snug text-amber-900/90"
      >
        Price may vary
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function CheckoutPageState({ title, subtitle }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-2 px-6">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-100 border-t-[#902bf5]" />
      {title ? (
        <p className="text-sm font-medium text-gray-900 text-center">{title}</p>
      ) : null}
      {subtitle ? (
        <p className="text-xs text-gray-500 text-center max-w-xs">{subtitle}</p>
      ) : null}
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <svg
          className="w-7 h-7 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">
        Your cart is empty
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Add some fresh products to continue shopping.
      </p>
      <Link
        href="/products"
        className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm ${BRAND_CHECKOUT_BTN}`}
      >
        Continue shopping
      </Link>
    </div>
  );
}

function PlaceOrderButton({
  isSubmitting,
  isCheckingDelivery,
  isApplyingCoupon,
  showPriceVaryConfirm,
  selectedAddressId,
  selectedAddressCoords,
  addressesLength,
  minPurchaseBlocked,
  onPress,
  className = "",
}) {
  const blocked =
    isSubmitting ||
    isCheckingDelivery ||
    showPriceVaryConfirm ||
    isApplyingCoupon ||
    minPurchaseBlocked;
  const needsAddress = !selectedAddressId || !selectedAddressCoords;
  return (
    <Button
      variant="primary"
      isDisabled={blocked}
      isLoading={isSubmitting || isCheckingDelivery || isApplyingCoupon}
      onPress={onPress}
      className={`flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ${
        blocked
          ? "bg-gray-200 text-gray-400"
          : needsAddress
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : BRAND_CHECKOUT_BTN
      } ${className}`}
    >
      {!isSubmitting && !isCheckingDelivery && !isApplyingCoupon && !selectedAddressId ? (
        addressesLength === 0 ? "Add delivery address" : "Select address"
      ) : !isSubmitting && !isCheckingDelivery && !isApplyingCoupon && !selectedAddressCoords ? (
        "Set map pin on address"
      ) : isApplyingCoupon ? (
        "Applying coupon…"
      ) : isCheckingDelivery ? (
        "Checking delivery…"
      ) : isSubmitting ? (
        "Processing order…"
      ) : (
        "Place order"
      )}
    </Button>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    cartItems,
    cartTotal,
    clearCart,
    removeFromCart,
    updateQuantity,
    selectedCouponCode,
    setSelectedCouponCode,
    selectedCouponCodes,
    setSelectedCouponCodes,
    bxgyBlocksCoupons,
    hasHydratedLocalCart,
    loading: cartQueryLoading,
    cartData,
    cartQueryFetching,
    couponPreviewTrusted,
    minPurchaseMinor,
    minPurchaseRemainingMinor,
  } = useCart();
  const {
    addresses,
    getDefaultAddress,
    isLoading: isLoadingAddresses,
  } = useAddress();
  const { isAuthenticated, user, authHydrated } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const { showAlert } = useAlert();
  const { openServiceAreaSheet } = useLocationService();
  const { siteFooterHeight } = useLayoutHeights();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponLookupPending, setCouponLookupPending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [phoneOverride, setPhoneOverride] = useState("");
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showPriceVaryConfirm, setShowPriceVaryConfirm] = useState(false);
  const [checkoutDraftHydrated, setCheckoutDraftHydrated] = useState(false);
  /** Stable across double-clicks of Place order (ConfirmModal + sticky CTA). */
  const placeOrderLockRef = useRef(false);
  const checkoutIdempotencyKeyRef = useRef(null);
  const deliveryCheckGenRef = useRef(0);
  const addressSectionRef = useRef(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;
    return (
      addresses.find((a) => String(a.id) === String(selectedAddressId)) || null
    );
  }, [addresses, selectedAddressId]);

  const selectedAddressCoords = useMemo(() => {
    const lat = Number(selectedAddress?.lat);
    const lng = Number(selectedAddress?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [selectedAddress?.lat, selectedAddress?.lng]);

  const checkoutReadinessIssues = useMemo(
    () =>
      getCheckoutReadinessIssues({
        selectedAddressId,
        selectedAddress,
        selectedAddressCoords,
      }),
    [selectedAddressId, selectedAddress, selectedAddressCoords],
  );

  const scrollToDeliveryAddress = useCallback(() => {
    const el = addressSectionRef.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const verifySelectedAddressServiceability = useCallback(async () => {
    const gen = ++deliveryCheckGenRef.current;
    const outcome = await verifyDeliveryAtCoords(
      selectedAddressCoords?.lat,
      selectedAddressCoords?.lng,
    );
    if (gen !== deliveryCheckGenRef.current) {
      return { ...outcome, stale: true };
    }
    return { ...outcome, stale: false };
  }, [selectedAddressCoords]);

  const showDeliveryAreaForSelectedAddress = useCallback(() => {
    if (selectedAddressCoords) {
      openServiceAreaSheet({
        lat: selectedAddressCoords.lat,
        lng: selectedAddressCoords.lng,
        addressId: selectedAddressId,
        label: "your delivery address pin",
      });
      return;
    }
    openServiceAreaSheet();
  }, [openServiceAreaSheet, selectedAddressCoords, selectedAddressId]);

  const cartSubtotalMinor = useMemo(() => {
    if (couponPreviewTrusted && cartData?.subtotalBeforeCouponMinor != null) {
      return cartData.subtotalBeforeCouponMinor;
    }
    return Math.round((Number(cartTotal) || 0) * 100);
  }, [couponPreviewTrusted, cartData?.subtotalBeforeCouponMinor, cartTotal]);

  const displayCartTotal = useMemo(() => {
    if (
      couponPreviewTrusted &&
      cartData?.total != null &&
      Number.isFinite(Number(cartData.total))
    ) {
      return Number(cartData.total);
    }
    return Number(cartTotal) || 0;
  }, [couponPreviewTrusted, cartData?.total, cartTotal]);

  const isApplyingCoupon = useMemo(() => {
    const selected = String(selectedCouponCode || selectedCouponCodes?.[0] || "")
      .trim()
      .toUpperCase();
    if (!selected || !cartQueryFetching) return false;
    const preview = cartData?.promotions?.coupon;
    const alreadyApplied =
      couponPreviewTrusted &&
      preview?.status === "applied" &&
      String(preview.code || "").toUpperCase() === selected;
    return !alreadyApplied;
  }, [
    selectedCouponCode,
    selectedCouponCodes,
    cartQueryFetching,
    couponPreviewTrusted,
    cartData?.promotions?.coupon,
  ]);

  const couponDiscountMajor = useMemo(() => {
    if (!couponPreviewTrusted) return 0;
    if (cartData?.couponDiscountMinor > 0) {
      return minorToMajor(cartData.couponDiscountMinor);
    }
    const preview = cartData?.promotions?.coupon;
    if (preview?.status === "applied" && preview.discountMinor > 0) {
      return minorToMajor(preview.discountMinor);
    }
    return 0;
  }, [
    couponPreviewTrusted,
    cartData?.couponDiscountMinor,
    cartData?.promotions?.coupon,
  ]);

  const autoCartDiscountMajor = useMemo(() => {
    if (cartData?.autoCartDiscountMinor > 0) {
      return minorToMajor(cartData.autoCartDiscountMinor);
    }
    if (cartData?.promotions?.auto?.autoCartDiscountMinor > 0) {
      return minorToMajor(cartData.promotions.auto.autoCartDiscountMinor);
    }
    return 0;
  }, [cartData?.autoCartDiscountMinor, cartData?.promotions?.auto?.autoCartDiscountMinor]);

  const linePromoDiscountMajor = useMemo(() => {
    if (cartData?.linePromoDiscountMinor > 0) {
      return minorToMajor(cartData.linePromoDiscountMinor);
    }
    if (cartData?.promotions?.auto?.linePromoDiscountMinor > 0) {
      return minorToMajor(cartData.promotions.auto.linePromoDiscountMinor);
    }
    return 0;
  }, [cartData?.linePromoDiscountMinor, cartData?.promotions?.auto?.linePromoDiscountMinor]);

  const bundleDiscountMajor = useMemo(() => {
    if (cartData?.bundleDiscountMinor > 0) {
      return minorToMajor(cartData.bundleDiscountMinor);
    }
    if (cartData?.promotions?.auto?.bundleDiscountMinor > 0) {
      return minorToMajor(cartData.promotions.auto.bundleDiscountMinor);
    }
    return 0;
  }, [cartData?.bundleDiscountMinor, cartData?.promotions?.auto?.bundleDiscountMinor]);

  const promotionDiscountMajor = useMemo(() => {
    if (!couponPreviewTrusted) return null;
    if (cartData?.promotionDiscountMinor > 0) {
      return minorToMajor(cartData.promotionDiscountMinor);
    }
    return null;
  }, [couponPreviewTrusted, cartData?.promotionDiscountMinor]);

  // Pool of products for the "Similar products" carousel — same query as home → cached.
  const { data: similarPoolData } = useProducts({
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  });
  const similarPool = useMemo(
    () => similarPoolData?.products || [],
    [similarPoolData?.products],
  );

  /**
   * One suggestion carousel after the order lines.
   * Do not exclude in-cart products — ProductCard must stay mounted to show qty controls.
   */
  const checkoutMightLikeSection = useMemo(() => {
    const sections = buildSuggestedProductSections(similarPool, {
      sections: [
        {
          key: "checkout-might-like",
          title: "You might also like",
          description: "Add a few more items before you check out.",
          start: 0,
          end: 8,
        },
      ],
    });
    return sections[0] || null;
  }, [similarPool]);

  const offerGroups = useMemo(
    () => buildCartOfferGroups(cartItems),
    [cartItems],
  );

  const handleCheckoutQtyChange = (id, qty) => {
    if (!(Number(qty) > 0)) {
      removeFromCart(id);
      return;
    }
    updateQuantity(id, qty);
  };

  const bottomBarPricing = useMemo(
    () => getCartBottomBarPricing(cartItems, displayCartTotal),
    [cartItems, displayCartTotal],
  );

  /* ── Restore checkout draft (coupon, notes, address) after /add/address, etc. ── */
  useEffect(() => {
    if (checkoutDraftHydrated) return;
    const draft = readCheckoutDraft();
    if (draft?.notes != null) setNotes(String(draft.notes));
    if (draft?.selectedAddressId != null) {
      setSelectedAddressId(draft.selectedAddressId);
    }
    setCheckoutDraftHydrated(true);
  }, [checkoutDraftHydrated]);

  /* ── Set default address when none selected (after draft restore). ── */
  useEffect(() => {
    if (!checkoutDraftHydrated) return;
    if (selectedAddressId) return;
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) setSelectedAddressId(defaultAddress.id);
  }, [checkoutDraftHydrated, selectedAddressId, getDefaultAddress, addresses]);

  /* ── Persist checkout draft while user is in the funnel ── */
  useEffect(() => {
    if (!checkoutDraftHydrated) return;
    writeCheckoutDraft({
      notes,
      couponCode: selectedCouponCode,
      couponCodes: selectedCouponCodes,
      selectedAddressId,
    });
  }, [
    checkoutDraftHydrated,
    notes,
    selectedCouponCode,
    selectedCouponCodes,
    selectedAddressId,
  ]);

  /* ── Returning from /add/address?selectAddress= — pick address once list is ready ── */
  useEffect(() => {
    const incomingId = searchParams.get("selectAddress");
    if (!incomingId) return;
    if (isLoadingAddresses) return;

    const exists = addresses.some((a) => String(a.id) === String(incomingId));
    if (exists) {
      setSelectedAddressId(incomingId);
      writeCheckoutDraft({ selectedAddressId: incomingId });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("selectAddress");
    const qs = params.toString();
    router.replace(qs ? `/checkout?${qs}` : "/checkout");
  }, [searchParams, addresses, isLoadingAddresses, router]);

  /* Address freshness on tab resume is handled by AddressContext (app-wide). */

  /* ── Guests with items: require login, then return here ── */
  useEffect(() => {
    if (!authHydrated) return;
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      goToLogin("/checkout");
    }
  }, [authHydrated, isAuthenticated, cartItems.length, goToLogin]);

  const goToAddAddress = (addressId) => {
    writeCheckoutDraft({
      notes,
      couponCode: selectedCouponCode,
      couponCodes: selectedCouponCodes,
      selectedAddressId: selectedAddressId || undefined,
    });
    const params = new URLSearchParams({ from: "/checkout" });
    if (addressId) params.set("id", String(addressId));
    router.push(`/add/address?${params.toString()}`);
  };

  /* ── Place order (runs after “price may vary” confirmation) ── */
  const executePlaceOrder = async () => {
    if (placeOrderLockRef.current || isSubmitting) return;
    placeOrderLockRef.current = true;
    setIsSubmitting(true);
    setShowPriceVaryConfirm(false);

    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `checkout-${crypto.randomUUID()}`
          : `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }

    try {
      const line1 = String(
        selectedAddress?.line1 || selectedAddress?.street || "",
      ).trim();
      if (!selectedAddressId || !selectedAddressCoords || !line1) {
        const issues = getCheckoutReadinessIssues({
          selectedAddressId,
          selectedAddress,
          selectedAddressCoords,
        });
        const first = issues[0];
        showAlert(
          first?.message ||
            "Please save a delivery address with Address Line 1 and a map pin.",
          "Delivery address",
          "warning",
        );
        scrollToDeliveryAddress();
        if (!selectedAddressCoords && selectedAddressId) {
          showDeliveryAreaForSelectedAddress();
        }
        placeOrderLockRef.current = false;
        checkoutIdempotencyKeyRef.current = null;
        setIsSubmitting(false);
        return;
      }
      const checkoutLines = buildCheckoutLinesFromCartItems(cartItems);
      if (!checkoutLines.length) {
        showAlert(
          "Your cart is empty. Add items before placing an order.",
          "Cart empty",
          "warning",
        );
        placeOrderLockRef.current = false;
        checkoutIdempotencyKeyRef.current = null;
        setIsSubmitting(false);
        return;
      }
      const orderResponse = await placeStorefrontOrder({
        notes: notes.trim() || undefined,
        couponCode: bxgyBlocksCoupons
          ? undefined
          : (selectedCouponCode || "").trim() || undefined,
        couponCodes:
          bxgyBlocksCoupons ||
          !(Array.isArray(selectedCouponCodes) && selectedCouponCodes.length > 1)
            ? undefined
            : selectedCouponCodes,
        lat: selectedAddressCoords.lat,
        lng: selectedAddressCoords.lng,
        items: checkoutLines,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
      });

      if (!orderResponse?.orderId) throw new Error("Failed to create order");

      // Latch the "finishing" flag BEFORE clearing the cart so the empty-cart UI
      // never gets a chance to render between cartItems becoming [] and navigation.
      setIsFinishing(true);
      clearCheckoutDraft();
      // Back from the created order must go Home — not cart/checkout/success.
      markPostOrderBackToHome(orderResponse.orderId);
      await clearCart();
      // replace: drop checkout from history so it is not revisited after success.
      router.replace(
        `/order-success?orderId=${encodeURIComponent(orderResponse.orderId)}&orderNumber=${encodeURIComponent(
          orderResponse.orderNumber || "",
        )}&payment=cod`,
      );
    } catch (err) {
      placeOrderLockRef.current = false;
      checkoutIdempotencyKeyRef.current = null;
      const apiCode = getApiErrorCode(err) || err?.code;
      const locationNotVerified =
        /location not verified/i.test(String(err?.message || "")) ||
        apiCode === "LOCATION_NOT_VERIFIED" ||
        apiCode === "SERVICE_AREA";

      if (isAddressNotServiceableError(err) || locationNotVerified) {
        const crossSite = getStorefrontCookieSiteWarning();
        showAlert(
          locationNotVerified
            ? crossSite
              ? `${crossSite} Also confirm the map pin on your delivery address is inside the delivery zone.`
              : "Your delivery location could not be verified for this shop. Update the map pin on your address and try again."
            : "This address is outside this shop's delivery area. Choose another address or move the map pin.",
          locationNotVerified ? "Location not verified" : "Outside delivery area",
          "warning",
        );
        showDeliveryAreaForSelectedAddress();
        setIsSubmitting(false);
        return;
      }
      if (
        /phone number is required before checkout/i.test(
          String(err?.message || ""),
        )
      ) {
        setShowPhoneSheet(true);
        setIsSubmitting(false);
        return;
      }
      if (err?.status === 401) {
        showAlert(
          "Your session expired. Please sign in again to place your order.",
          "Sign in required",
          "warning",
        );
        goToLogin("/checkout");
        setIsSubmitting(false);
        return;
      }
      if (isNetworkError(err)) {
        showAlert(
          "Unable to connect. Please check your internet connection and try again.",
          "Connection problem",
          "error",
        );
        setIsSubmitting(false);
        return;
      }
      const code = getApiErrorCode(err) || err?.code;
      if (code === "PRICE_CHANGED") {
        await queryClient.invalidateQueries({ queryKey: couponKeys.all });
      }
      if (
        code === "PRODUCT_UNAVAILABLE" ||
        code === "PRICE_CHANGED" ||
        code === "CART_EMPTY" ||
        code === "CART_NOT_FOUND" ||
        code === "MIN_PURCHASE_NOT_MET"
      ) {
        await queryClient.invalidateQueries({ queryKey: cartKeys.all });
      }
      const couponCodes = new Set([
        "COUPON_NOT_FOUND",
        "COUPON_NOT_APPLICABLE",
        "COUPON_NO_CART_BENEFIT",
        "COUPON_EXHAUSTED",
        "MIN_SUBTOTAL_NOT_MET",
        "FIRST_ORDER_ONLY_NOT_MET",
        "NEW_CUSTOMER_ONLY_NOT_MET",
        "EMPTY_CART_WITH_COUPON",
        "COUPON_NOT_WITH_BUNDLE",
        "COUPON_NOT_AFTER_AUTO",
        "COUPON_NOT_WITH_SKU",
        "COUPON_NOT_WITH_AUTO_CART",
        "COUPON_NO_MATCHING_ITEMS",
        "COUPON_RULE_SUBTOTAL_NOT_MET",
      ]);
      if (couponCodes.has(code)) {
        setSelectedCouponCodes([]);
      }
      const alertTitle =
        code === "PRICE_CHANGED"
          ? "Price or Quantity updated"
          : code === "PRODUCT_UNAVAILABLE"
            ? "Item or Quantity unavailable"
            : code === "MIN_PURCHASE_NOT_MET"
              ? "Minimum order"
            : code === "ADDRESS_REQUIRED" ||
                code === "ADDRESS_COORDINATES_REQUIRED"
              ? "Delivery address"
              : "Could not place order";
      const alertTone =
        code === "PRICE_CHANGED" || code === "PRODUCT_UNAVAILABLE"
          ? "warning"
          : "error";
      showAlert(getCheckoutErrorMessage(err), alertTitle, alertTone);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (isSubmitting || isCheckingDelivery) return;
    if (minPurchaseRemainingMinor > 0) return;

    if (!isAuthenticated) {
      goToLogin("/checkout");
      return;
    }
    if (cartItems.length === 0) {
      showAlert(
        "Your cart is empty. Add items before placing an order.",
        "Empty cart",
        "warning",
      );
      return;
    }

    const readiness = getCheckoutReadinessIssues({
      selectedAddressId,
      selectedAddress,
      selectedAddressCoords,
    });
    if (readiness.length > 0) {
      showAlert(
        readiness.length === 1
          ? readiness[0].message
          : `Please complete the following:\n• ${readiness.map((i) => i.message.replace(/^Please /, "")).join("\n• ")}`,
        "Complete your delivery details",
        "warning",
      );
      scrollToDeliveryAddress();
      if (readiness.some((i) => i.id === "address")) {
        if (addresses.length === 0) goToAddAddress();
        else setShowAddressSelector(true);
      } else if (readiness.some((i) => i.id === "coords" || i.id === "line1")) {
        goToAddAddress(selectedAddressId);
      }
      return;
    }

    // Use backend-consistent verification for the selected delivery address pin.
    // This avoids a mismatch where cached/default-address checks pass but the selected address isn't serviceable.
    setIsCheckingDelivery(true);
    let deliveryOutcome;
    try {
      deliveryOutcome = await verifySelectedAddressServiceability();
    } finally {
      setIsCheckingDelivery(false);
    }
    if (deliveryOutcome?.stale) return;

    if (!deliveryOutcome?.ok) {
      if (deliveryOutcome?.kind === "auth") {
        showAlert(
          deliveryOutcome.message,
          deliveryOutcome.title,
          deliveryOutcome.tone,
        );
        goToLogin("/checkout");
        return;
      }
      if (
        deliveryOutcome?.kind === "network" ||
        deliveryOutcome?.kind === "unknown" ||
        deliveryOutcome?.kind === "missing_shop"
      ) {
        showAlert(
          deliveryOutcome.message,
          deliveryOutcome.title,
          deliveryOutcome.tone,
        );
        return;
      }
      // not_serviceable or missing_coords
      showAlert(
        deliveryOutcome?.message ||
          "This address is outside this shop's delivery area. Choose another address or move the map pin.",
        deliveryOutcome?.title || "Outside delivery area",
        deliveryOutcome?.tone || "warning",
      );
      if (deliveryOutcome?.kind === "not_serviceable") {
        showDeliveryAreaForSelectedAddress();
      } else {
        scrollToDeliveryAddress();
      }
      return;
    }

    if (!hasUserPhone(user) && !phoneOverride) {
      setShowPhoneSheet(true);
      return;
    }

    setShowPriceVaryConfirm(true);
  };

  /* ── Auth: show shell immediately (no full-screen spinner); redirect runs in effect when needed. ── */
  if (!authHydrated) {
    return <CheckoutPageSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <CheckoutPageState
        title="Taking you to your cart…"
        subtitle="Sign in to complete checkout."
      />
    );
  }

  // Order in flight, or finishing up after a successful order — keep the loader
  // on screen until navigation lands the user on /order-success.
  if (isSubmitting || isFinishing) {
    return (
      <CheckoutPageState
        title="Placing your order…"
        subtitle="Please wait, do not close this page."
      />
    );
  }

  if (!hasHydratedLocalCart || (cartItems.length === 0 && cartQueryLoading)) {
    return <CheckoutPageSkeleton />;
  }

  if (cartItems.length === 0) {
    return <EmptyCheckout />;
  }

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  const placeOrder = () => {
    if (isApplyingCoupon || couponLookupPending) return;
    if (minPurchaseRemainingMinor > 0) return;
    if (!selectedAddressId) {
      if (addresses.length === 0) {
        goToAddAddress();
      } else {
        setShowAddressSelector(true);
      }
      return;
    }
    if (!selectedAddressCoords) {
      showAlert(
        "Please select a delivery location on the map.",
        "Delivery location needed",
        "warning",
      );
      scrollToDeliveryAddress();
      goToAddAddress(selectedAddressId);
      return;
    }
    const line1 = String(
      selectedAddress?.line1 || selectedAddress?.street || "",
    ).trim();
    if (!line1) {
      showAlert(
        "Please enter Address Line 1.",
        "Address incomplete",
        "warning",
      );
      scrollToDeliveryAddress();
      goToAddAddress(selectedAddressId);
      return;
    }
    handleSubmit({ preventDefault: () => {} });
  };

  const appliedAutoCartOffer = ALLOW_AUTO_CART
    ? getPrimaryAppliedAutoCartOffer(cartData?.promotions)
    : null;

  const renderOrderSummary = () => (
    <OrderSummary
      cartItems={cartItems}
      cartTotal={displayCartTotal}
      couponDiscount={couponDiscountMajor}
      autoCartDiscount={ALLOW_AUTO_CART ? autoCartDiscountMajor : 0}
      autoCartOffer={appliedAutoCartOffer}
      linePromoDiscount={linePromoDiscountMajor}
      bundleDiscount={bundleDiscountMajor}
      promotionDiscount={promotionDiscountMajor}
    />
  );

  const minPurchaseMessage = minPurchaseBannerMessage(
    minPurchaseMinor,
    minPurchaseRemainingMinor,
  );
  const minPurchaseBlocked = minPurchaseRemainingMinor > 0;

  const renderPlaceOrderButton = () => (
    <PlaceOrderButton
      isSubmitting={isSubmitting}
      isCheckingDelivery={isCheckingDelivery}
      isApplyingCoupon={isApplyingCoupon || couponLookupPending}
      showPriceVaryConfirm={showPriceVaryConfirm}
      selectedAddressId={selectedAddressId}
      selectedAddressCoords={selectedAddressCoords}
      addressesLength={addresses.length}
      minPurchaseBlocked={minPurchaseBlocked}
      onPress={placeOrder}
      className="w-full"
    />
  );

  const paidItemCount = offerGroups.length;

  return (
    <div className="min-h-screen w-full max-w-full bg-[#F7F7F8] pb-32">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3.5">
          <Link
            href="/cart"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 ${PRESSABLE_ICON_BTN_SOFT}`}
            aria-label="Back to cart"
          >
            <svg
              className="h-4 w-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <span className="text-base font-semibold text-gray-900">Checkout</span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="min-w-0">
        <div className="px-4 pt-5 pb-1">
          <SectionHeading
            aside={
              <span className="text-[12px] font-medium text-gray-500">
                {paidItemCount} {paidItemCount === 1 ? "item" : "items"}
              </span>
            }
          >
            Your order
          </SectionHeading>
          <div className="space-y-2.5">
            {offerGroups.map((group) => (
              <OfferGroupCard
                key={group.parentLineItemId}
                group={group}
                tone="white"
                onQuantityChange={handleCheckoutQtyChange}
                onRemove={removeFromCart}
              />
            ))}
          </div>
          <Link
            href="/products"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-gray-300 bg-white px-4 py-3 text-[13px] font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add more items
          </Link>
        </div>

        {checkoutMightLikeSection && (
          <section
            key={checkoutMightLikeSection.key}
            className="px-4 pt-6 pb-1"
            aria-label={checkoutMightLikeSection.title}
          >
            <SectionHeading
              aside={
                <Link
                  href="/products"
                  className="whitespace-nowrap text-[12px] font-medium text-gray-600 hover:text-gray-900"
                >
                  See all
                </Link>
              }
            >
              {checkoutMightLikeSection.title}
            </SectionHeading>
            <ProductCarousel
              products={checkoutMightLikeSection.products}
              showMoreLink="/products"
              compact
            />
          </section>
        )}

        <div
          ref={addressSectionRef}
          className="px-4 pt-6 pb-1"
          aria-busy={isLoadingAddresses && addresses.length === 0}
        >
          <SectionHeading>Delivery address</SectionHeading>

          {checkoutReadinessIssues.length > 0 &&
            !(isLoadingAddresses && addresses.length === 0) && (
              <div
                role="status"
                className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950"
              >
                <p className="text-[13px] font-semibold">
                  Complete your delivery details
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[12px] text-amber-900">
                  {checkoutReadinessIssues.map((issue) => (
                    <li key={issue.id}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

          <div
            className={`space-y-2 ${isLoadingAddresses && addresses.length === 0 ? "min-h-[52px]" : ""}`}
          >
            {isLoadingAddresses && addresses.length === 0 ? (
              <AddressCardSkeleton />
            ) : null}
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                selected={selectedAddressId === addr.id}
                onSelect={() => setSelectedAddressId(addr.id)}
                onEdit={() => goToAddAddress(addr.id)}
              />
            ))}
          </div>

          {/* Storefront allows one saved address */}
          {addresses.length === 0 && (
            <button
              type="button"
              onClick={() => goToAddAddress()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-gray-300 bg-white py-3 text-[13px] font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add delivery address
            </button>
          )}
        </div>

        <div className="px-4 pt-6 pb-1">
          <SectionHeading optional>Delivery notes</SectionHeading>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="E.g. leave at door, ring bell twice…"
            className="w-full resize-none rounded-[18px] border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#902bf5]/25"
          />
        </div>

        <div className="px-4 pt-6 pb-1">
          <SectionHeading>Payment</SectionHeading>
          <CodBadge />
        </div>

        <div className="space-y-2.5 px-4 pt-6 pb-1">
          {minPurchaseMessage ? (
            <MinPurchaseBanner message={minPurchaseMessage} />
          ) : null}
          <CouponThresholdBanner
            hint={
              bxgyBlocksCoupons
                ? null
                : getCouponThresholdHint(
                    couponPreviewTrusted ? cartData?.promotions : null,
                    cartSubtotalMinor,
                    [],
                  )
            }
          />
          <CheckoutCouponsSection
            cartSubtotalMinor={cartSubtotalMinor}
            selectedCouponCode={selectedCouponCode}
            selectedCouponCodes={selectedCouponCodes}
            onSelectCouponCode={setSelectedCouponCode}
            onSelectCouponCodes={setSelectedCouponCodes}
            couponPreview={
              couponPreviewTrusted ? cartData?.promotions?.coupon : null
            }
            suggestedCoupons={
              couponPreviewTrusted ? cartData?.promotions?.suggestedCoupons : []
            }
            isPreviewLoading={cartQueryFetching}
            promotionsPaused={
              couponPreviewTrusted ? cartData?.promotions?.paused : false
            }
            couponsBlocked={!!bxgyBlocksCoupons}
            couponsBlockedMessage={BXGY_COUPON_BLOCKED_MESSAGE}
            autoCartDiscountMinor={
              ALLOW_AUTO_CART
                ? Number(
                    cartData?.autoCartDiscountMinor ??
                      cartData?.promotions?.auto?.autoCartDiscountMinor ??
                      0
                  ) || 0
                : 0
            }
            autoCartPromotions={
              ALLOW_AUTO_CART && couponPreviewTrusted
                ? cartData?.promotions?.auto ?? null
                : null
            }
            enabled={!!isAuthenticated && cartItems.length > 0}
            onApplyingChange={setCouponLookupPending}
          />
        </div>

        <div className="px-4 pt-6 pb-6">
          <SectionHeading>Order summary</SectionHeading>
          {renderOrderSummary()}
        </div>
        </div>
      </form>

      <div
        className="fixed inset-x-0 z-50 border-t border-gray-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
        style={{ bottom: Math.max(Number(siteFooterHeight) || 0, 0) }}
      >
        <div
          className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">Total</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">
              ₹{bottomBarPricing.payable.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="min-w-0 flex-1">{renderPlaceOrderButton()}</div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showPriceVaryConfirm}
        onClose={() => {
          if (isSubmitting) return;
          setShowPriceVaryConfirm(false);
        }}
        onConfirm={() => {
          void executePlaceOrder();
        }}
        isConfirming={isSubmitting}
        closeOnConfirm={false}
        title="Price & Quantity may vary"
        message="Totals shown at checkout are estimates. The final amount may change based on availability, offers, or pricing at fulfilment. Quantity may also vary for custom products. Do you want to continue and place this order?"
        confirmText="Place order"
        cancelText="Cancel"
      />

      {/* ── Address selector sheet — pick an existing address or add a new one ── */}
      {showAddressSelector && (
        <div className="fixed inset-0 z-[65]">
          <button
            type="button"
            aria-label="Close address selector"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAddressSelector(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
            <h3 className="text-base font-semibold text-gray-900">
              Select delivery address
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose where we should deliver your order.
            </p>

            <div className="mt-4 space-y-2">
              {addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => {
                    setSelectedAddressId(addr.id);
                    setShowAddressSelector(false);
                  }}
                  onEdit={() => {
                    setShowAddressSelector(false);
                    goToAddAddress(addr.id);
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddressSelector(false);
                goToAddAddress();
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 px-4 py-3 text-[13px] font-semibold text-violet-800 transition hover:border-violet-500 hover:bg-violet-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add a new address
            </button>

            <button
              type="button"
              onClick={() => setShowAddressSelector(false)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <PhoneChangeOtpSheet
        isOpen={showPhoneSheet}
        onClose={() => setShowPhoneSheet(false)}
        currentPhone={user?.phone || phoneOverride}
        title="Add phone number"
        description="Phone number is required before placing your order. We will send an OTP to verify it."
        onSuccess={(nextPhone) => {
          setPhoneOverride(nextPhone);
          setShowPhoneSheet(false);
          showAlert("Phone number saved.", "Success", "success");
        }}
      />
    </div>
  );
}
