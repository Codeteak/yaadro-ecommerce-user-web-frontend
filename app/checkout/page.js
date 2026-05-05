'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { useAddress } from '../../context/AddressContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import CheckoutAddAddressSheet from '../../components/CheckoutAddAddressSheet';
import { placeStorefrontOrder } from '../../utils/storefrontCheckoutApi';
import { setPostLoginRedirect } from '../../utils/authSession';
import { useUpdateProfile } from '../../hooks/useAuth';

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
function OrderSummary({ cartItems, cartTotal, onQuantityChange }) {
  const mrpTotal = cartItems.reduce((acc, item) => {
    const mrp = item.originalPrice || (item.selectedSize?.price ?? parseFloat(item.price));
    return acc + mrp * item.quantity;
  }, 0);
  const savings = mrpTotal - cartTotal;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* Item rows */}
      <div className="space-y-3 mb-4">
        {cartItems.map((item) => {
          const unitPrice = item.selectedSize?.price ?? parseFloat(item.price);
          const imgSrc =
            (typeof item.image === 'string' ? item.image : item.image?.url) || '/images/dummy.png';
          const itemKey = item.cartItemKey ?? item.id;
          return (
            <div key={itemKey} className="flex gap-3">
              <div className="w-11 h-11 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden self-start">
                <Image
                  src={imgSrc}
                  alt={item.name}
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-400">
                  {item.sizeDisplay || (item.weight ? `${item.weight} ${item.unit}` : '')}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center border border-gray-200 rounded-full overflow-hidden flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onQuantityChange(item, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-7 flex items-center justify-center text-base text-gray-700 disabled:text-gray-300 hover:bg-gray-50 transition"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-[13px] font-medium text-gray-900 min-w-[22px] text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuantityChange(item, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      className="w-8 h-7 flex items-center justify-center text-base text-gray-700 disabled:text-gray-300 hover:bg-gray-50 transition"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 flex-shrink-0 tabular-nums">
                    ₹{(unitPrice * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* Totals */}
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span className="font-medium text-gray-900">
            ₹{cartTotal.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Shipping</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
            Free
          </span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span className="font-medium text-emerald-700">
              −₹{savings.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <Divider />

      <div className="flex justify-between text-[15px] font-medium text-gray-900">
        <span>Total</span>
        <span>₹{cartTotal.toLocaleString('en-IN')}</span>
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
  const { cartItems, cartTotal, clearCart, updateQuantity, removeFromCart, loading: cartLoading } = useCart();
  const {
    addresses,
    getDefaultAddress,
    addAddress,
    updateAddress,
    isLoading: isLoadingAddresses,
    isCreating: isCreatingAddress,
  } = useAddress();
  const { isAuthenticated, user, setShowLoginSheet, authHydrated, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const updateProfileMutation = useUpdateProfile();
  // Storefront order placement: POST /storefront/checkout

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddAddressSheet, setShowAddAddressSheet] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showPhoneSheet, setShowPhoneSheet] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneOverride, setPhoneOverride] = useState('');

  /* ── Set default address on mount ── */
  useEffect(() => {
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) setSelectedAddressId(defaultAddress.id);
  }, [getDefaultAddress]);

  /* ── Guests with items: never show checkout UI — send to cart and open login sheet ── */
  useEffect(() => {
    if (!authHydrated) return;
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      setPostLoginRedirect('/checkout');
      setShowLoginSheet(true);
      router.replace('/cart');
    }
  }, [authHydrated, isAuthenticated, cartItems.length, router, setShowLoginSheet]);

  const handleOrderSummaryQuantity = async (item, nextQty) => {
    const key = item.cartItemKey ?? item.id;
    if (nextQty < 1) {
      await removeFromCart(key);
      return;
    }
    await updateQuantity(key, nextQty);
  };

  const handleCreateAddress = async (addressData) => {
    try {
      const created = await addAddress(addressData);
      if (created?.id) setSelectedAddressId(created.id);
      setShowAddAddressSheet(false);
      setEditingAddress(null);
      showAlert('Address added successfully!', 'Success', 'success');
    } catch (err) {
      showAlert(err?.message || 'Failed to add address.', 'Error', 'error');
    }
  };

  const handleUpdateAddress = async (id, addressData) => {
    try {
      await updateAddress(id, addressData);
      setSelectedAddressId(id);
      setShowAddAddressSheet(false);
      setEditingAddress(null);
      showAlert('Address updated successfully!', 'Success', 'success');
    } catch (err) {
      showAlert(err?.message || 'Failed to update address.', 'Error', 'error');
    }
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
      setShowLoginSheet(true);
      return;
    }
    if (cartItems.length === 0) {
      showAlert('Your cart is empty.', 'Empty Cart', 'warning');
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

  /* ── Avoid empty-cart flash: hydrate auth first, then cart fetch / order placement ── */
  if (!authHydrated) {
    return <CheckoutPageState title="Loading checkout…" />;
  }

  if (!isAuthenticated) {
    return (
      <CheckoutPageState
        title="Taking you to your cart…"
        subtitle="Sign in to complete checkout."
      />
    );
  }

  if (isSubmitting) {
    return <CheckoutPageState title="Placing your order…" subtitle="Please wait, do not close this page." />;
  }

  if (cartLoading && cartItems.length === 0) {
    return <CheckoutPageState title="Loading your cart…" />;
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
        <div className="px-4 pt-5 pb-1">
          <SectionLabel>Delivery address</SectionLabel>

          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-emerald-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                  onEdit={() => {
                    setEditingAddress(addr);
                    setShowAddAddressSheet(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Storefront allows one saved address */}
          {addresses.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setEditingAddress(null);
                setShowAddAddressSheet(true);
              }}
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

        {/* ── Order items ── */}
        <div className="px-4 pt-5 pb-1">
          <SectionLabel>Order summary</SectionLabel>
          <OrderSummary
            cartItems={cartItems}
            cartTotal={cartTotal}
            onQuantityChange={handleOrderSummaryQuantity}
          />
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

      </form>

      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 pt-3 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-gray-400">Total payable</p>
            <p className="text-[17px] font-medium text-gray-900">
              ₹{cartTotal.toLocaleString('en-IN')}
            </p>
          </div>
          <span className="text-[12px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            Cash on delivery
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedAddressId}
          className={`w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98] ${
            isSubmitting || !selectedAddressId
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Placing order…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Place order
            </>
          )}
        </button>

        {!selectedAddressId && (
          <p className="text-center text-[11px] text-red-500 mt-2">
            Select a delivery address to continue
          </p>
        )}
      </div>

      {/* ── Add address sheet ── */}
      <CheckoutAddAddressSheet
        isOpen={showAddAddressSheet}
        onClose={() => {
          setShowAddAddressSheet(false);
          setEditingAddress(null);
        }}
        onCreate={handleCreateAddress}
        onUpdate={handleUpdateAddress}
        editingAddress={editingAddress}
        isSubmitting={isCreatingAddress}
        initialFullName={user?.name || ''}
        initialPhone={user?.phone || ''}
      />

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