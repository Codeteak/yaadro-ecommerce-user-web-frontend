'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@heroui/react';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import ProductCarousel from '../../components/ProductCarousel';
import ProductImageWithFallback from '../../components/ProductImageWithFallback';
import { useProducts } from '../../hooks/useProducts';
import { placeStorefrontOrder } from '../../utils/storefrontCheckoutApi';
import { getApiErrorCode, getCheckoutErrorMessage } from '../../utils/apiErrors';
import { useCartQuery, cartKeys } from '../../hooks/useCart';
import { couponKeys } from '../../hooks/useCoupons';
import { addressKeys } from '../../hooks/useAddresses';
import { checkDeliveryLocation } from '../../utils/storefrontLocationApi';
import { getStorefrontCookieSiteWarning } from '../../utils/storefrontApiSite';
import {
  readCheckoutDraft,
  writeCheckoutDraft,
  clearCheckoutDraft,
} from '../../utils/checkoutSession';
import { useLoginNavigation } from '../../hooks/useLoginNavigation';
import CheckoutCouponsSection from '../../components/CheckoutCouponsSection';
import { getCartLinePreviewImageSrc } from '../../utils/productImages';
import { getCartLineVariantLabel } from '../../utils/productUtils';
import { getCartBottomBarPricing } from '../../utils/cartSavings';
import { formatInrFromMinor, minorToMajor } from '../../utils/currencyMinor';
import { formatCartCouponPreviewMessage } from '../../utils/cartPromotions';
import { normalizePhoneForApi } from '../../utils/otpVerifyPayload';
import { getIndianPhoneSubmitError, isValidIndianMobile } from '../../utils/indianPhone';
import IndianPhoneInput from '../../components/IndianPhoneInput';
import { useUpdateProfile } from '../../hooks/useAuth';
import { useLocationService } from '../../context/LocationServiceContext';
import ConfirmModal from '../../components/ConfirmModal';
import CheckoutPageSkeleton from '../../components/skeletons/CheckoutPageSkeleton';
import { BRAND_PRIMARY_BTN } from '../../components/ui/brandButton';
import { AddressCardSkeleton } from '../../components/skeletons/primitives';

function isAddressNotServiceableError(err) {
  const code = getApiErrorCode(err) || err?.code;
  return code === 'ADDRESS_NOT_SERVICEABLE';
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
  if (!user || typeof user !== 'object') return false;
  const raw = user.phone ?? user.mobile ?? user.phoneNumber ?? '';
  return normalizePhoneForApi(raw).length === 10;
}

function isValidPhoneInput(value) {
  return isValidIndianMobile(value);
}

/* ─────────────────────────────────────────────
   Step progress bar
───────────────────────────────────────────── */
function StepBar({ current }) {
  const steps = ['Cart', 'Address', 'Confirm'];
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
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                {done ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  active ? 'text-gray-900' : done ? 'text-violet-700' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${done ? 'bg-violet-500' : 'bg-gray-200'}`}
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
    Home: 'bg-violet-100 text-violet-800',
    Work: 'bg-blue-100 text-blue-800',
  };
  const pill = labelColors[address.label] || 'bg-gray-100 text-gray-600';
  const streetLine =
    [address.line1, address.line2].filter(Boolean).join(', ') ||
    address.street ||
    address.address;

  return (
    <div
      className={`w-full rounded-2xl border p-3.5 flex items-start gap-3 transition-all ${
        selected ? 'border-2 border-violet-500' : 'border border-gray-100 hover:border-gray-200'
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
            selected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'
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
            {address.fullName || user?.name || '—'}
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            {[streetLine, address.landmark, address.city, address.state].filter(Boolean).join(', ')}
            {address.postalCode || address.zipCode ? ` – ${address.postalCode || address.zipCode}` : ''}
          </p>
          {(address.phone || user?.phone) && (
            <p className="text-[12px] text-gray-400 mt-1">{address.phone || user?.phone}</p>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
        aria-label="Edit address"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium text-violet-900">Cash on delivery</p>
        <p className="text-[12px] text-violet-700 mt-0.5">Pay when your order arrives</p>
      </div>
      <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
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
  promotionDiscount = null,
  onRemove,
}) {
  const { mrpTotal, savings } = getCartBottomBarPricing(cartItems, cartTotal);
  const promoDiscount =
    promotionDiscount != null && promotionDiscount > 0.009
      ? promotionDiscount
      : Math.max(0, savings - (couponDiscount > 0.009 ? couponDiscount : 0));
  const discount = savings > 0.009 ? savings : 0;
  const totalQty = cartItems.reduce(
    (a, i) => a + (Number(i.displayQuantity) || Number(i.quantity) || 1),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* Item rows */}
      <div className="space-y-3 mb-4">
        {cartItems.map((item) => {
          const isBundleReward = !!item.isBundleReward;
          const qty = Number(item.quantity) || 1;
          const effectiveUnit = Number.parseFloat(String(item.price ?? '0')) || 0;
          const listUnitRaw =
            item.originalPrice != null && Number.isFinite(Number(item.originalPrice))
              ? Number(item.originalPrice)
              : item.selectedSize?.price != null && Number.isFinite(Number(item.selectedSize.price))
                ? Number(item.selectedSize.price)
                : null;
          const linePay =
            Number.isFinite(Number(item.lineTotal)) && item.lineTotal >= 0
              ? Number(item.lineTotal)
              : effectiveUnit * qty;
          const showListStrike =
            !isBundleReward && listUnitRaw != null && listUnitRaw > effectiveUnit + 1e-9;
          const imgSrc = getCartLinePreviewImageSrc(item);
          const lineKey = item.cartItemKey ?? item.cartItemId ?? item.id;
          return (
            <div key={lineKey} className="flex gap-3">
              <div className="w-11 h-11 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden self-start">
                <ProductImageWithFallback
                  src={imgSrc}
                  alt={item.name || ''}
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  sizes="44px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-gray-900 truncate">
                  {item.name}
                  {isBundleReward && (
                    <span className="ml-1.5 rounded bg-violet-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-violet-800">
                      Free
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  {getCartLineVariantLabel(item)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-gray-600">Qty: {qty}</span>
                  <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-right">
                    <p className="text-[13px] font-medium tabular-nums text-gray-900">
                      {isBundleReward ? 'FREE' : `₹${linePay.toLocaleString('en-IN')}`}
                    </p>
                    {showListStrike && (
                      <p className="text-[11px] text-gray-400 line-through tabular-nums">
                        ₹{(listUnitRaw * qty).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {onRemove && lineKey != null && !isBundleReward && (
                <button
                  type="button"
                  onClick={() => onRemove(lineKey)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center self-start rounded-lg bg-gray-50 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Remove item"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Divider />

      {/* Totals */}
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal ({totalQty} items)</span>
          <span className="font-medium text-gray-900 tabular-nums">
            ₹{mrpTotal.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-800">
            Free
          </span>
        </div>
        {promoDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Promo savings</span>
            <span className="font-medium text-violet-700 tabular-nums">
              −₹{promoDiscount.toLocaleString('en-IN')}
            </span>
          </div>
        )}
        {couponDiscount > 0.009 && (
          <div className="flex justify-between text-gray-500">
            <span>Coupon</span>
            <span className="font-medium text-violet-700 tabular-nums">
              −₹{couponDiscount.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <Divider />

      <div className="flex justify-between text-[15px] font-medium text-gray-900">
        <span>Total</span>
        <span className="tabular-nums">₹{cartTotal.toLocaleString('en-IN')}</span>
      </div>
      <marquee
        className="mt-2 block w-full rounded-md bg-red-600 py-1.5 text-[12px] font-medium tracking-wide text-white"
        scrollAmount={4}
      >
        {Array.from({ length: 16 }, () => 'Price may vary').join('        ·        ')}
      </marquee>
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
      {title ? <p className="text-sm font-medium text-gray-900 text-center">{title}</p> : null}
      {subtitle ? <p className="text-xs text-gray-500 text-center max-w-xs">{subtitle}</p> : null}
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-sm text-gray-400 mb-6">Add some items before checkout.</p>
      <Link
        href="/products"
        className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-violet-700 transition"
      >
        Shop now
      </Link>
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
  const { cartItems, cartTotal, clearCart, removeFromCart } = useCart();
  const {
    addresses,
    getDefaultAddress,
    isLoading: isLoadingAddresses,
  } = useAddress();
  const { isAuthenticated, user, authHydrated, refreshUser } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const { showAlert } = useAlert();
  const updateProfileMutation = useUpdateProfile();
  const { openServiceAreaSheet } = useLocationService();

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneOverride, setPhoneOverride] = useState('');
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showPriceVaryConfirm, setShowPriceVaryConfirm] = useState(false);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [checkoutDraftHydrated, setCheckoutDraftHydrated] = useState(false);

  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;
    return addresses.find((a) => String(a.id) === String(selectedAddressId)) || null;
  }, [addresses, selectedAddressId]);

  const selectedAddressCoords = useMemo(() => {
    const lat = Number(selectedAddress?.lat);
    const lng = Number(selectedAddress?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [selectedAddress?.lat, selectedAddress?.lng]);

  const verifySelectedAddressServiceability = useCallback(async () => {
    if (!selectedAddressCoords) return false;
    try {
      const r = await checkDeliveryLocation(selectedAddressCoords.lat, selectedAddressCoords.lng);
      return r?.serviceable === true;
    } catch {
      return false;
    }
  }, [selectedAddressCoords]);

  const showDeliveryAreaForSelectedAddress = useCallback(() => {
    if (selectedAddressCoords) {
      openServiceAreaSheet({
        lat: selectedAddressCoords.lat,
        lng: selectedAddressCoords.lng,
        addressId: selectedAddressId,
        label: 'your delivery address pin',
      });
      return;
    }
    openServiceAreaSheet();
  }, [openServiceAreaSheet, selectedAddressCoords, selectedAddressId]);

  const { data: cartApiData, isFetching: cartPreviewFetching } = useCartQuery({
    enabled: !!isAuthenticated,
    couponCode: selectedCouponCode || undefined,
  });

  const cartSubtotalMinor = useMemo(() => {
    if (cartApiData?.subtotalBeforeCouponMinor != null) {
      return cartApiData.subtotalBeforeCouponMinor;
    }
    return Math.round((Number(cartTotal) || 0) * 100);
  }, [cartApiData?.subtotalBeforeCouponMinor, cartTotal]);

  const displayCartTotal = useMemo(() => {
    if (cartApiData?.total != null && Number.isFinite(Number(cartApiData.total))) {
      return Number(cartApiData.total);
    }
    return Number(cartTotal) || 0;
  }, [cartApiData?.total, cartTotal]);

  const couponDiscountMajor = useMemo(() => {
    if (cartApiData?.couponDiscountMinor > 0) {
      return minorToMajor(cartApiData.couponDiscountMinor);
    }
    const preview = cartApiData?.promotions?.coupon;
    if (preview?.status === 'applied' && preview.discountMinor > 0) {
      return minorToMajor(preview.discountMinor);
    }
    return 0;
  }, [cartApiData?.couponDiscountMinor, cartApiData?.promotions?.coupon]);

  const promotionDiscountMajor = useMemo(() => {
    if (cartApiData?.promotionDiscountMinor > 0) {
      return minorToMajor(cartApiData.promotionDiscountMinor);
    }
    return null;
  }, [cartApiData?.promotionDiscountMinor]);

  useEffect(() => {
    const preview = cartApiData?.promotions?.coupon;
    if (!selectedCouponCode || !preview || cartPreviewFetching) return;
    if (preview.status === 'not_applicable') {
      setSelectedCouponCode('');
      showAlert(
        formatCartCouponPreviewMessage(preview) ||
          'This coupon cannot be applied to your cart.',
        'Coupon',
        'warning'
      );
    }
  }, [
    cartApiData?.promotions?.coupon,
    selectedCouponCode,
    cartPreviewFetching,
    showAlert,
  ]);

  // Pool of products for the "Similar products" carousel — same query as home → cached.
  const { data: similarPoolData } = useProducts({
    limit: 50,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const similarPool = similarPoolData?.products || [];

  const cartProductIds = useMemo(
    () =>
      new Set(
        cartItems
          .map((item) => item.productId ?? item.product?.id ?? item.id)
          .filter((id) => id != null)
          .map((id) => String(id))
      ),
    [cartItems]
  );

  /** “You might also like” above order summary; other slices below delivery notes. */
  const { checkoutMightLikeSection, checkoutCarouselsBelowNotes } = useMemo(() => {
    const list = similarPool.filter((p) => p?.id != null && !cartProductIds.has(String(p.id)));
    const mightLike =
      list.length > 0
        ? {
            key: 'checkout-might-like',
            title: 'You might also like',
            description: 'Add a few more items before you check out.',
            products: list.slice(0, 8),
          }
        : null;
    const belowNotes = [
      {
        key: 'checkout-trending',
        title: 'Trending picks',
        description: 'Popular choices shoppers add with their orders.',
        products: list.slice(8, 16),
      },
      {
        key: 'checkout-more',
        title: 'More to explore',
        description: 'Recently listed items worth a quick look.',
        products: list.slice(16, 24),
      },
    ].filter((s) => s.products.length > 0);
    return { checkoutMightLikeSection: mightLike, checkoutCarouselsBelowNotes: belowNotes };
  }, [similarPool, cartProductIds]);

  const bottomBarPricing = useMemo(
    () => getCartBottomBarPricing(cartItems, displayCartTotal),
    [cartItems, displayCartTotal]
  );

  /* ── Restore checkout draft (coupon, notes, address) after /add/address, etc. ── */
  useEffect(() => {
    if (checkoutDraftHydrated) return;
    const draft = readCheckoutDraft();
    if (draft?.notes != null) setNotes(String(draft.notes));
    if (draft?.couponCode != null) setSelectedCouponCode(String(draft.couponCode));
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
      selectedAddressId,
    });
  }, [checkoutDraftHydrated, notes, selectedCouponCode, selectedAddressId]);

  /* ── Returning from /add/address?selectAddress= — pick address once list is ready ── */
  useEffect(() => {
    const incomingId = searchParams.get('selectAddress');
    if (!incomingId) return;
    if (isLoadingAddresses) return;

    const exists = addresses.some((a) => String(a.id) === String(incomingId));
    if (exists) {
      setSelectedAddressId(incomingId);
      writeCheckoutDraft({ selectedAddressId: incomingId });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('selectAddress');
    const qs = params.toString();
    router.replace(qs ? `/checkout?${qs}` : '/checkout');
  }, [searchParams, addresses, isLoadingAddresses, router]);

  /* ── Refresh cart + addresses when tabbing back (e.g. from address map). ── */
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
      void queryClient.invalidateQueries({ queryKey: addressKeys.all });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onPageShow = (event) => {
      if (event.persisted) refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isAuthenticated, queryClient]);

  /* ── Guests with items: require login, then return here ── */
  useEffect(() => {
    if (!authHydrated) return;
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      goToLogin('/checkout');
    }
  }, [authHydrated, isAuthenticated, cartItems.length, goToLogin]);

  const goToAddAddress = (addressId) => {
    writeCheckoutDraft({
      notes,
      couponCode: selectedCouponCode,
      selectedAddressId: selectedAddressId || undefined,
    });
    const params = new URLSearchParams({ from: '/checkout' });
    if (addressId) params.set('id', String(addressId));
    router.push(`/add/address?${params.toString()}`);
  };

  const handlePhoneSave = async () => {
    const normalized = normalizePhoneForApi(phoneDraft);
    const phoneErr = getIndianPhoneSubmitError(phoneDraft);
    if (!isValidPhoneInput(normalized) || phoneErr) {
      showAlert(phoneErr || 'Please enter a valid 10-digit mobile number.', 'Invalid phone', 'warning');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({ phone: normalized });
      await refreshUser({ silent: true });
      setPhoneOverride(normalized);
      setShowPhoneSheet(false);
      showAlert('Phone number saved.', 'Success', 'success');
    } catch (err) {
      showAlert(err?.message || 'Failed to save phone number.', 'Error', 'error');
    }
  };

  /* ── Place order (runs after “price may vary” confirmation) ── */
  const executePlaceOrder = async () => {
    setIsSubmitting(true);

    try {
      // Backend requires a serviceable verification for the delivery pin.
      // `useLocationService()` checks the default address; checkout may use a different selected address.
      if (!selectedAddressId || !selectedAddressCoords) {
        showAlert('Please select a delivery address with a map pin.', 'Delivery address', 'warning');
        showDeliveryAreaForSelectedAddress();
        setIsSubmitting(false);
        return;
      }
      const orderResponse = await placeStorefrontOrder({
        notes: notes.trim() || undefined,
        couponCode: selectedCouponCode.trim() || undefined,
        lat: selectedAddressCoords.lat,
        lng: selectedAddressCoords.lng,
        addressId: selectedAddressId,
      });

      if (!orderResponse?.orderId) throw new Error('Failed to create order');

      // Latch the "finishing" flag BEFORE clearing the cart so the empty-cart UI
      // never gets a chance to render between cartItems becoming [] and navigation.
      setIsFinishing(true);
      clearCheckoutDraft();
      await clearCart();
      router.push(
        `/order-success?orderId=${encodeURIComponent(orderResponse.orderId)}&orderNumber=${encodeURIComponent(
          orderResponse.orderNumber || ''
        )}&payment=cod`
      );
    } catch (err) {
      const apiCode = getApiErrorCode(err) || err?.code;
      const locationNotVerified =
        /location not verified/i.test(String(err?.message || '')) ||
        apiCode === 'LOCATION_NOT_VERIFIED' ||
        apiCode === 'SERVICE_AREA';

      if (isAddressNotServiceableError(err) || locationNotVerified) {
        const crossSite = getStorefrontCookieSiteWarning();
        showAlert(
          locationNotVerified
            ? crossSite
              ? `${crossSite} Also confirm the map pin on your delivery address is inside the delivery zone.`
              : 'Your delivery location could not be verified for this shop. Update the map pin on your address and try again.'
            : 'Delivery is not available for this address. Please choose another address or update the map pin.',
          'Delivery not available',
          'warning'
        );
        showDeliveryAreaForSelectedAddress();
        setIsSubmitting(false);
        return;
      }
      if (/phone number is required before checkout/i.test(String(err?.message || ''))) {
        setPhoneDraft(String(user?.phone || phoneOverride || '').trim());
        setShowPhoneSheet(true);
        setIsSubmitting(false);
        return;
      }
      if (err?.status === 401) {
        showAlert(
          'Your session expired. Please sign in again to place your order.',
          'Sign in required',
          'warning'
        );
        goToLogin('/checkout');
        setIsSubmitting(false);
        return;
      }
      const code = getApiErrorCode(err) || err?.code;
      if (code === 'PRICE_CHANGED') {
        await queryClient.invalidateQueries({ queryKey: cartKeys.all });
        await queryClient.invalidateQueries({ queryKey: couponKeys.all });
      }
      const couponCodes = new Set([
        'COUPON_NOT_FOUND',
        'COUPON_NOT_APPLICABLE',
        'COUPON_NO_CART_BENEFIT',
        'COUPON_EXHAUSTED',
        'MIN_SUBTOTAL_NOT_MET',
        'FIRST_ORDER_ONLY_NOT_MET',
        'NEW_CUSTOMER_ONLY_NOT_MET',
        'EMPTY_CART_WITH_COUPON',
      ]);
      if (couponCodes.has(code)) {
        setSelectedCouponCode('');
      }
      showAlert(getCheckoutErrorMessage(err), code === 'PRICE_CHANGED' ? 'Cart updated' : 'Error', code === 'PRICE_CHANGED' ? 'warning' : 'error');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (isSubmitting) return;

    if (!isAuthenticated) {
      goToLogin('/checkout');
      return;
    }
    if (cartItems.length === 0) {
      showAlert('Your cart is empty.', 'Empty Cart', 'warning');
      return;
    }
    if (!selectedAddressId || !selectedAddressCoords) {
      showAlert('Please select a delivery address with a map pin.', 'Delivery address', 'warning');
      return;
    }
    // Use backend-consistent verification for the selected delivery address pin.
    // This avoids a mismatch where cached/default-address checks pass but the selected address isn't serviceable.
    const pinOk = await verifySelectedAddressServiceability();
    if (!pinOk) {
      showAlert(
        'Delivery is not available for this address. Please choose another address or update the map pin.',
        'Delivery not available',
        'warning'
      );
      showDeliveryAreaForSelectedAddress();
      return;
    }
    if (!hasUserPhone(user) && !phoneOverride) {
      setPhoneDraft('');
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
    return <CheckoutPageState title="Placing your order…" subtitle="Please wait, do not close this page." />;
  }

  if (cartItems.length === 0) {
    return <EmptyCheckout />;
  }

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-36 w-full max-w-full overflow-x-hidden">

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Link
            href="/cart"
            className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0"
            aria-label="Back to cart"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-base font-medium text-gray-900">Checkout</span>
        </div>
        <StepBar current={2} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-0">

        {/* ── Delivery address ── */}
        <div
          className="px-4 pt-5 pb-1"
          aria-busy={isLoadingAddresses && addresses.length === 0}
        >
          <SectionLabel>Delivery address</SectionLabel>

          <div className={`space-y-2 ${isLoadingAddresses && addresses.length === 0 ? 'min-h-[52px]' : ''}`}>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
        <div className="px-4 pt-5 pb-1">
          <CheckoutCouponsSection
            cartSubtotalMinor={cartSubtotalMinor}
            selectedCouponCode={selectedCouponCode}
            onSelectCouponCode={setSelectedCouponCode}
            couponPreview={cartApiData?.promotions?.coupon}
            suggestedCoupons={cartApiData?.promotions?.suggestedCoupons}
            isPreviewLoading={cartPreviewFetching}
            promotionsPaused={cartApiData?.promotions?.paused}
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
            <ProductCarousel products={checkoutMightLikeSection.products} showMoreLink="/products" />
          </section>
        )}

        {/* ── Order items ── */}
        <div className="px-4 pt-5 pb-1">
          <SectionLabel>Order summary</SectionLabel>
          <OrderSummary
            cartItems={cartItems}
            cartTotal={displayCartTotal}
            couponDiscount={couponDiscountMajor}
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
        {checkoutCarouselsBelowNotes.map(({ key, title, description, products }) => (
          <section key={key} className="px-4 pt-2 pb-4" aria-label={title}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1] text-gray-900 font-headingnow">
                  {title}
                </h2>
                <p className="mt-2 text-[13px] text-gray-500 md:text-sm">{description}</p>
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
        ))}

      </form>

      {/* ── Sticky bottom bar (marquee is full bar width; padded block below) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[100vw] overflow-x-hidden bg-white border-t border-gray-100">
        <marquee
          className="block w-full bg-red-600 py-0.5 text-[10px] font-medium leading-tight text-white"
          scrollAmount={3}
        >
          {Array.from({ length: 16 }, () => 'Price may vary').join('        ·        ')}
        </marquee>
        <div className="px-4 pt-3 pb-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400">Total payable</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-[17px] font-semibold tabular-nums text-gray-900">
                ₹{bottomBarPricing.payable.toLocaleString('en-IN')}
              </p>
              {bottomBarPricing.hasOffer && (
                <>
                  <p className="text-sm text-gray-400 line-through tabular-nums">
                    ₹{bottomBarPricing.mrpTotal.toLocaleString('en-IN')}
                  </p>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                    Save ₹{Math.round(bottomBarPricing.savings).toLocaleString('en-IN')}
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
          isDisabled={isSubmitting || showPriceVaryConfirm}
          isLoading={isSubmitting}
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
              showAlert('Please set a map pin on your delivery address.', 'Delivery address', 'warning');
              goToAddAddress(selectedAddressId);
              return;
            }
            handleSubmit({ preventDefault: () => {} });
          }}
          className={`w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] ${
            isSubmitting || showPriceVaryConfirm
              ? 'bg-gray-200 text-gray-400'
              : !selectedAddressId || !selectedAddressCoords
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : BRAND_PRIMARY_BTN
          }`}
        >
          {!isSubmitting && !selectedAddressId ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Select address
            </>
          ) : !isSubmitting && !selectedAddressCoords ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Set map pin on address
            </>
          ) : isSubmitting ? (
            'Placing order…'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Place order
            </>
          )}
        </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showPriceVaryConfirm}
        onClose={() => setShowPriceVaryConfirm(false)}
        onConfirm={() => {
          void executePlaceOrder();
        }}
        title="Price may vary"
        message="Totals shown at checkout are estimates. The final amount may change based on availability, offers, or pricing at fulfilment. Do you want to continue and place this order?"
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
            <h3 className="text-base font-semibold text-gray-900">Select delivery address</h3>
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
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

      {showPhoneSheet && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Close phone sheet"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPhoneSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
            <h3 className="text-base font-semibold text-gray-900">Add phone number</h3>
            <p className="mt-1 text-sm text-gray-500">
              Phone number is required before placing your order.
            </p>
            <IndianPhoneInput
              value={phoneDraft}
              onChange={setPhoneDraft}
              className="mt-4"
              inputClassName="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              showValidHint={false}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPhoneSheet(false)}
                className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePhoneSave}
                disabled={updateProfileMutation.isPending}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-60"
              >
                {updateProfileMutation.isPending ? 'Saving…' : 'Save phone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}