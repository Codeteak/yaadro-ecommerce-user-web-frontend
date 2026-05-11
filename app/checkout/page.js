'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import ProductCarousel from '../../components/ProductCarousel';
import ProductImageWithFallback from '../../components/ProductImageWithFallback';
import { useProducts } from '../../hooks/useProducts';
import { placeStorefrontOrder } from '../../utils/storefrontCheckoutApi';
import { useLoginNavigation } from '../../hooks/useLoginNavigation';
import { getCartLinePreviewImageSrc } from '../../utils/productImages';
import { getCartBottomBarPricing } from '../../utils/cartSavings';
import { useUpdateProfile } from '../../hooks/useAuth';
import { useLocationService } from '../../context/LocationServiceContext';

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
  return String(raw).replace(/\s/g, '').length > 0;
}

function isValidPhoneInput(value) {
  const v = String(value || '').replace(/\s/g, '').trim();
  return /^[0-9+][0-9]{7,31}$/.test(v);
}

function hasValidCoordinates(address) {
  const lat = Number(address?.lat);
  const lng = Number(address?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function getLiveCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      reject(new Error('Location is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err?.code === 1) {
          reject(new Error('Please allow location access to place this order.'));
          return;
        }
        reject(new Error(err?.message || 'Could not read your location.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
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
                    ? 'bg-emerald-600 text-white'
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
                  active ? 'text-gray-900' : done ? 'text-emerald-700' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${done ? 'bg-emerald-500' : 'bg-gray-200'}`}
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
    Home: 'bg-emerald-100 text-emerald-800',
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
        selected ? 'border-2 border-emerald-500' : 'border border-gray-100 hover:border-gray-200'
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
            selected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
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
    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium text-emerald-900">Cash on delivery</p>
        <p className="text-[12px] text-emerald-700 mt-0.5">Pay when your order arrives</p>
      </div>
      <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
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
function OrderSummary({ cartItems, cartTotal, onQuantityChange, onRemove }) {
  const { mrpTotal, savings } = getCartBottomBarPricing(cartItems, cartTotal);
  const discount = savings > 0.009 ? savings : 0;
  const totalQty = cartItems.reduce((a, i) => a + (Number(i.quantity) || 1), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* Item rows */}
      <div className="space-y-3 mb-4">
        {cartItems.map((item) => {
          const qty = Number(item.quantity) || 1;
          const effectiveUnit = Number.parseFloat(String(item.price ?? '0')) || 0;
          const listUnitRaw =
            item.originalPrice != null && Number.isFinite(Number(item.originalPrice))
              ? Number(item.originalPrice)
              : item.selectedSize?.price != null && Number.isFinite(Number(item.selectedSize.price))
                ? Number(item.selectedSize.price)
                : null;
          const linePay = effectiveUnit * qty;
          const showListStrike =
            listUnitRaw != null && listUnitRaw > effectiveUnit + 1e-9;
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
                <p className="text-[12px] font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-400">
                  {item.sizeDisplay || (item.weight ? `${item.weight} ${item.unit}` : '')}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex flex-shrink-0 items-center overflow-hidden rounded-full border border-gray-200">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(item, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="flex h-7 w-8 items-center justify-center text-base text-gray-700 transition hover:bg-gray-50 disabled:text-gray-300"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-[22px] text-center text-[13px] font-medium tabular-nums text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(item, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      className="flex h-7 w-8 items-center justify-center text-base text-gray-700 transition hover:bg-gray-50 disabled:text-gray-300"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-right">
                    <p className="text-[13px] font-medium tabular-nums text-gray-900">
                      ₹{linePay.toLocaleString('en-IN')}
                    </p>
                    {showListStrike && (
                      <p className="text-[11px] text-gray-400 line-through tabular-nums">
                        ₹{(listUnitRaw * qty).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {onRemove && lineKey != null && (
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
            Free
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span className="font-medium text-emerald-700 tabular-nums">
              −₹{discount.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <Divider />

      <div className="flex justify-between text-[15px] font-medium text-gray-900">
        <span>Total</span>
        <span className="tabular-nums">₹{cartTotal.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function CheckoutPageState({ title, subtitle }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-2 px-6">
      <div className="w-9 h-9 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
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
        className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-emerald-700 transition"
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
  const { cartItems, cartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const {
    addresses,
    getDefaultAddress,
    isLoading: isLoadingAddresses,
  } = useAddress();
  const { isAuthenticated, user, authHydrated, refreshUser } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const { showAlert } = useAlert();
  const updateProfileMutation = useUpdateProfile();
  const {
    isChecking: isDeliveryChecking,
    serviceable: isDeliveryServiceable,
    setShowServiceAreaSheet,
  } = useLocationService();
  // Storefront order placement: POST /storefront/checkout

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // True from the moment the order is successfully placed until navigation completes —
  // keeps the "Placing order…" loader on screen so the empty cart never flashes.
  const [isFinishing, setIsFinishing] = useState(false);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneOverride, setPhoneOverride] = useState('');
  const [showAddressSelector, setShowAddressSelector] = useState(false);

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
    () => getCartBottomBarPricing(cartItems, cartTotal),
    [cartItems, cartTotal]
  );

  /* ── Set default address on mount ── */
  useEffect(() => {
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) setSelectedAddressId(defaultAddress.id);
  }, [getDefaultAddress]);

  /* ── If we just returned from /add/address?…&selectAddress=ID, pick that one. ── */
  useEffect(() => {
    const incomingId = searchParams.get('selectAddress');
    if (!incomingId) return;
    if (!Array.isArray(addresses) || addresses.length === 0) return;
    const exists = addresses.some((a) => String(a.id) === String(incomingId));
    if (exists) setSelectedAddressId(incomingId);

    // Clean the query param so a subsequent default-address change can win.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('selectAddress');
    const qs = params.toString();
    router.replace(qs ? `/checkout?${qs}` : '/checkout');
  }, [searchParams, addresses, router]);

  /* ── Guests with items: require login, then return here ── */
  useEffect(() => {
    if (!authHydrated) return;
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      goToLogin('/checkout');
    }
  }, [authHydrated, isAuthenticated, cartItems.length, goToLogin]);

  const handleOrderSummaryQuantity = (item, nextQty) => {
    const key = item.cartItemKey ?? item.cartItemId ?? item.id;
    if (nextQty < 1) {
      removeFromCart(key);
      return;
    }
    updateQuantity(key, nextQty);
  };

  const goToAddAddress = (addressId) => {
    const params = new URLSearchParams({ from: '/checkout' });
    if (addressId) params.set('id', addressId);
    router.push(`/add/address?${params.toString()}`);
  };

  const handlePhoneSave = async () => {
    const normalized = String(phoneDraft || '').replace(/\s/g, '').trim();
    if (!isValidPhoneInput(normalized)) {
      showAlert('Please enter a valid phone number.', 'Invalid phone', 'warning');
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

  /* ── Place order ── */
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!isAuthenticated) {
      goToLogin('/checkout');
      return;
    }
    if (cartItems.length === 0) {
      showAlert('Your cart is empty.', 'Empty Cart', 'warning');
      return;
    }
    if (isDeliveryServiceable !== true) {
      showAlert(
        'We can only take orders when delivery is available for your location. Check your area or change address, then try again.',
        'Delivery not available',
        'warning'
      );
      setShowServiceAreaSheet(true);
      return;
    }
    if (!hasUserPhone(user) && !phoneOverride) {
      setPhoneDraft('');
      setShowPhoneSheet(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderResponse = await placeStorefrontOrder({
        notes: notes.trim() || undefined,
      });

      if (!orderResponse?.orderId) throw new Error('Failed to create order');

      // Latch the "finishing" flag BEFORE clearing the cart so the empty-cart UI
      // never gets a chance to render between cartItems becoming [] and navigation.
      setIsFinishing(true);
      await clearCart();
      router.push(
        `/order-success?orderId=${encodeURIComponent(orderResponse.orderId)}&orderNumber=${encodeURIComponent(
          orderResponse.orderNumber || ''
        )}&payment=cod`
      );
    } catch (err) {
      console.error('Checkout error:', err);
      if (/phone number is required before checkout/i.test(String(err?.message || ''))) {
        setPhoneDraft(String(user?.phone || phoneOverride || '').trim());
        setShowPhoneSheet(true);
        setIsSubmitting(false);
        return;
      }
      showAlert(err?.message || 'Failed to place order. Please try again.', 'Error', 'error');
      setIsSubmitting(false);
    }
  };

  /* ── Auth: show shell immediately (no full-screen spinner); redirect runs in effect when needed. ── */
  if (!authHydrated) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50">
        <div className="sticky top-0 z-30 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-9 w-9 rounded-full border border-gray-100 bg-gray-50" aria-hidden />
            <span className="text-base font-medium text-gray-900">Checkout</span>
          </div>
          <StepBar current={2} />
        </div>
      </div>
    );
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
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0"
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
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
              className="w-full mt-3 border-2 border-dashed border-gray-200 rounded-2xl py-3 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-500 hover:border-emerald-400 hover:text-emerald-700 transition"
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
                className="whitespace-nowrap text-[12px] font-medium text-emerald-700 transition hover:text-emerald-800"
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
            cartTotal={cartTotal}
            onQuantityChange={handleOrderSummaryQuantity}
            onRemove={removeFromCart}
          />

          {/* Add more items — full-width CTA */}
          <Link
            href="/products"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-3 text-[13px] font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99]"
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
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none leading-relaxed transition"
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
                className="whitespace-nowrap text-[12px] font-medium text-emerald-700 transition hover:text-emerald-800"
              >
                See all
              </Link>
            </div>
            <ProductCarousel products={products} showMoreLink="/products" />
          </section>
        ))}

      </form>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 pt-3 pb-5">
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
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Save ₹{Math.round(bottomBarPricing.savings).toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="flex-shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
            Cash on delivery
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            // Address-first guard: send to /add/address (no addresses yet) or
            // open the existing-address selector sheet — never disable the button.
            if (!selectedAddressId) {
              e.preventDefault();
              if (addresses.length === 0) {
                goToAddAddress();
              } else {
                setShowAddressSelector(true);
              }
              return;
            }
            if (isDeliveryChecking) {
              e.preventDefault();
              return;
            }
            if (isDeliveryServiceable !== true) {
              e.preventDefault();
              setShowServiceAreaSheet(true);
              return;
            }
            handleSubmit(e);
          }}
          disabled={isSubmitting || (!!selectedAddressId && isDeliveryChecking)}
          className={`w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] ${
            isSubmitting || (!!selectedAddressId && isDeliveryChecking)
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : !selectedAddressId
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : isDeliveryServiceable !== true
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Placing order…
            </>
          ) : !selectedAddressId ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Select address
            </>
          ) : isDeliveryChecking ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-gray-400/40 border-t-gray-600 animate-spin" />
              Checking delivery…
            </>
          ) : isDeliveryServiceable !== true ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Check delivery area to continue
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Place order
            </>
          )}
        </button>
      </div>

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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-3 text-[13px] font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-50"
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
            <input
              type="tel"
              value={phoneDraft}
              onChange={(ev) => setPhoneDraft(ev.target.value)}
              placeholder="+919876543210"
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-medium text-white disabled:opacity-60"
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