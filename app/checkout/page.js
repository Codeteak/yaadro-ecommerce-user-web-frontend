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
import CouponThresholdBanner from "../../components/promotions/CouponThresholdBanner";
import { BRAND_PRIMARY_BTN, PRESSABLE_ICON_BTN_SOFT } from "../../components/ui/brandButton";
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

function SectionLabel({ children, optional }) {
  return (
    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">
      {children}
      {optional && (
        <span className="normal-case tracking-normal font-normal text-gray-400 ml-1">
          (optional)
        </span>
      )}
    </p>
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
   Step progress bar
───────────────────────────────────────────── */
function StepBar({ current }) {
  const steps = ["Cart", "Address", "Confirm"];
  return (
    <div className="flex items-center px-4 py-3 bg-white border-b border-gray-100">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${
                  done || active
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {done ? (
                  <svg
                    className="w-3 h-3"
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
                ) : (
                  idx
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  active
                    ? "text-gray-900"
                    : done
                      ? "text-violet-700"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${done ? "bg-violet-500" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Address card
───────────────────────────────────────────── */
function AddressCard({ address, selected, onSelect, onEdit }) {
  const { user } = useAuth();
  const labelColors = {
    Home: "bg-violet-100 text-violet-800",
    Work: "bg-blue-100 text-blue-800",
  };
  const pill = labelColors[address.label] || "bg-gray-100 text-gray-600";
  const addressLine = formatAddressDisplay(address);

  return (
    <div
      className={`w-full rounded-2xl border p-3.5 flex items-start gap-3 transition-all ${
        selected
          ? "border-2 border-violet-500"
          : "border border-gray-100 hover:border-gray-200"
      } bg-white`}
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
            selected ? "border-violet-500 bg-violet-500" : "border-gray-300"
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
    <div className="bg-violet-50 border-2 border-violet-500 rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
        <svg
          className="w-5 h-5 text-violet-600"
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
        <p className="text-[14px] font-medium text-violet-900">
          Cash on delivery
        </p>
        <p className="text-[12px] text-violet-700 mt-0.5">
          Pay when your order arrives
        </p>
      </div>
      <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
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
  linePromoDiscount = 0,
  bundleDiscount = 0,
  promotionDiscount = null,
  onRemove,
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
  const discount = savings > 0.009 ? savings : 0;
  const totalQty = sumCartPaidUnits(cartItems);
  const offerGroups = buildCartOfferGroups(cartItems);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* Item rows */}
      <div className="space-y-3 mb-4">
        {offerGroups.map((group) => (
          <OfferGroupCard
            key={group.parentLineItemId}
            group={group}
            compact
            showStepper={false}
            onRemove={onRemove}
          />
        ))}
      </div>

      <Divider />

      {/* Totals */}
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal ({totalQty} items)</span>
          <span className="font-medium text-gray-900 tabular-nums">
            ₹{mrpTotal.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-800">
            Free
          </span>
        </div>
        {itemPromo > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Sale price savings</span>
            <span className="font-medium text-violet-700 tabular-nums">
              −₹{itemPromo.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {bundleDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Free items (buy more, get free)</span>
            <span className="font-medium text-violet-700 tabular-nums">
              −₹{bundleDiscount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {autoCartDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Automatic cart discount</span>
            <span className="font-medium text-violet-700 tabular-nums">
              −₹{autoCartDiscount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {couponDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Coupon</span>
            <span className="font-medium text-violet-700 tabular-nums">
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
              <span className="font-medium text-violet-700 tabular-nums">
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
      <div className="w-9 h-9 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
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
        Add some items before checkout.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-violet-700 transition"
        >
          Home
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 border border-gray-200 bg-white text-sm font-medium text-gray-800 px-5 py-2.5 rounded-full hover:bg-gray-50 transition"
        >
          Shop now
        </Link>
      </div>
    </div>
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
   * “You might also like” above order summary; other slices below delivery notes.
   * Do not exclude in-cart products — ProductCard must stay mounted to show qty controls.
   */
  const { checkoutMightLikeSection, checkoutCarouselsBelowNotes } =
    useMemo(() => {
      const sections = buildSuggestedProductSections(similarPool, {
        sections: [
          {
            key: "checkout-might-like",
            title: "You might also like",
            description: "Add a few more items before you check out.",
            start: 0,
            end: 8,
          },
          {
            key: "checkout-trending",
            title: "Trending picks",
            description: "Popular choices shoppers add with their orders.",
            start: 8,
            end: 16,
          },
          {
            key: "checkout-more",
            title: "More to explore",
            description: "Recently listed items worth a quick look.",
            start: 16,
            end: 24,
          },
        ],
      });
      const mightLike =
        sections.find((s) => s.key === "checkout-might-like") || null;
      const belowNotes = sections.filter(
        (s) => s.key !== "checkout-might-like",
      );
      return {
        checkoutMightLikeSection: mightLike,
        checkoutCarouselsBelowNotes: belowNotes,
      };
    }, [similarPool]);

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
        code === "CART_NOT_FOUND"
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
      ]);
      if (couponCodes.has(code)) {
        setSelectedCouponCodes([]);
      }
      const alertTitle =
        code === "PRICE_CHANGED"
          ? "Price or Quantity updated"
          : code === "PRODUCT_UNAVAILABLE"
            ? "Item or Quantity unavailable"
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
  return (
    <div className="min-h-screen bg-gray-50 pb-36 w-full max-w-full">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Link
            href="/cart"
            className={`w-9 h-9 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 ${PRESSABLE_ICON_BTN_SOFT}`}
            aria-label="Back to cart"
          >
            <svg
              className="w-4 h-4 text-gray-700"
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
          <span className="text-base font-medium text-gray-900">Checkout</span>
        </div>
        <StepBar current={2} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">
        {/* ── Delivery address ── */}
        <div
          ref={addressSectionRef}
          className="px-4 pt-5 pb-1"
          aria-busy={isLoadingAddresses && addresses.length === 0}
        >
          <SectionLabel>Delivery address</SectionLabel>

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
              className="w-full mt-3 border-2 border-dashed border-gray-200 rounded-2xl py-3 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-500 hover:border-violet-400 hover:text-violet-700 transition"
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

        {/* ── Payment ── */}
        <div className="px-4 pt-5 pb-1">
          <SectionLabel>Payment method</SectionLabel>
          <CodBadge />
        </div>

        {/* ── Coupons (applied at checkout via POST /storefront/checkout) ── */}
        <div className="px-4 pt-5 pb-1 space-y-2.5">
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
            enabled={!!isAuthenticated && cartItems.length > 0}
          />
        </div>

        {/* ── You might also like (above order summary) ── */}
        {checkoutMightLikeSection && (
          <section
            key={checkoutMightLikeSection.key}
            className="px-4 pt-5 pb-1"
            aria-label={checkoutMightLikeSection.title}
          >
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1] text-gray-900 font-headingnow">
                  {checkoutMightLikeSection.title}
                </h2>
                <p className="mt-2 text-[13px] text-gray-500 md:text-sm">
                  {checkoutMightLikeSection.description}
                </p>
              </div>
              <Link
                href="/products"
                className="whitespace-nowrap text-[12px] font-medium text-violet-700 transition hover:text-violet-800"
              >
                See all
              </Link>
            </div>
            <ProductCarousel
              products={checkoutMightLikeSection.products}
              showMoreLink="/products"
            />
          </section>
        )}

        {/* ── Order items ── */}
        <div className="px-4 pt-5 pb-1">
          <SectionLabel>Order summary</SectionLabel>
          <OrderSummary
            cartItems={cartItems}
            cartTotal={displayCartTotal}
            couponDiscount={couponDiscountMajor}
            autoCartDiscount={
              cartData?.autoCartDiscountMinor > 0
                ? minorToMajor(cartData.autoCartDiscountMinor)
                : cartData?.promotions?.auto?.autoCartDiscountMinor > 0
                  ? minorToMajor(cartData.promotions.auto.autoCartDiscountMinor)
                  : 0
            }
            linePromoDiscount={
              cartData?.linePromoDiscountMinor > 0
                ? minorToMajor(cartData.linePromoDiscountMinor)
                : cartData?.promotions?.auto?.linePromoDiscountMinor > 0
                  ? minorToMajor(
                      cartData.promotions.auto.linePromoDiscountMinor,
                    )
                  : 0
            }
            bundleDiscount={
              cartData?.bundleDiscountMinor > 0
                ? minorToMajor(cartData.bundleDiscountMinor)
                : cartData?.promotions?.auto?.bundleDiscountMinor > 0
                  ? minorToMajor(cartData.promotions.auto.bundleDiscountMinor)
                  : 0
            }
            promotionDiscount={promotionDiscountMajor}
            onRemove={removeFromCart}
          />

          {/* Add more items — full-width CTA */}
          <Link
            href="/products"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 px-4 py-3 text-[13px] font-semibold text-violet-800 transition hover:border-violet-500 hover:bg-violet-50 active:scale-[0.99]"
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

        {/* ── Delivery notes ── */}
        <div className="px-4 pt-5 pb-4">
          <SectionLabel optional>Delivery notes</SectionLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="E.g. leave at door, ring bell twice…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white resize-none leading-relaxed transition"
          />
        </div>

        {/* ── Trending / more carousels (below delivery notes) ── */}
        {checkoutCarouselsBelowNotes.map(
          ({ key, title, description, products }) => (
            <section key={key} className="px-4 pt-2 pb-4" aria-label={title}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1] text-gray-900 font-headingnow">
                    {title}
                  </h2>
                  <p className="mt-2 text-[13px] text-gray-500 md:text-sm">
                    {description}
                  </p>
                </div>
                <Link
                  href="/products"
                  className="whitespace-nowrap text-[12px] font-medium text-violet-700 transition hover:text-violet-800"
                >
                  See all
                </Link>
              </div>
              <ProductCarousel products={products} showMoreLink="/products" />
            </section>
          ),
        )}
      </form>

      {/* ── Sticky bottom bar ── */}
      <div
        className="fixed left-0 right-0 z-50 w-full max-w-[100vw] bg-white border-t border-gray-100"
        style={{ bottom: Math.max(Number(siteFooterHeight) || 0, 0) }}
      >
        <p
          role="note"
          className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900/90"
        >
          Price may vary
        </p>
        <div className="px-4 pt-3 pb-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">Total payable</p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-[17px] font-semibold tabular-nums text-gray-900">
                  ₹{bottomBarPricing.payable.toLocaleString("en-IN")}
                </p>
                {bottomBarPricing.hasOffer && (
                  <>
                    <p className="text-sm text-gray-400 line-through tabular-nums">
                      ₹{bottomBarPricing.mrpTotal.toLocaleString("en-IN")}
                    </p>
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                      Save ₹
                      {Math.round(bottomBarPricing.savings).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-violet-50 px-3 py-1 text-[12px] font-medium text-violet-700">
              Cash on delivery
            </span>
          </div>

          <Button
            variant="primary"
            isDisabled={isSubmitting || isCheckingDelivery || showPriceVaryConfirm}
            isLoading={isSubmitting || isCheckingDelivery}
            onPress={() => {
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
            }}
            className={`w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] ${
              isSubmitting || isCheckingDelivery || showPriceVaryConfirm
                ? "bg-gray-200 text-gray-400"
                : !selectedAddressId || !selectedAddressCoords
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : BRAND_PRIMARY_BTN
            }`}
          >
            {!isSubmitting && !isCheckingDelivery && !selectedAddressId ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {addresses.length === 0
                  ? "Add delivery address"
                  : "Select address"}
              </>
            ) : !isSubmitting && !isCheckingDelivery && !selectedAddressCoords ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Set map pin on address
              </>
            ) : isCheckingDelivery ? (
              "Checking delivery availability…"
            ) : isSubmitting ? (
              "Placing order…"
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Place order
              </>
            )}
          </Button>
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
