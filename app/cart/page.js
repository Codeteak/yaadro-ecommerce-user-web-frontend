'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { setPostLoginRedirect } from '../../utils/authSession';
import Container from '../../components/Container';
import ConfirmModal from '../../components/ConfirmModal';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function TopBar({ itemCount }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-30">
      <Link
        href="/"
        className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0"
        aria-label="Back"
      >
        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      <span className="text-base font-medium text-gray-900">My cart</span>
      <span className="ml-auto text-xs text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function CartItemCard({ item, onQuantityChange, onRemove }) {
  const imageSrc = item.image || '/images/dummy.png';
  const unitPrice = item.selectedSize?.price ?? parseFloat(item.price);
  const originalPrice = item.originalPrice || null;
  const discountPct =
    originalPrice && originalPrice > unitPrice
      ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3">
      {/* Image */}
      <div className="w-[72px] h-[72px] rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
        <Image
          src={imageSrc}
          alt={item.name}
          width={72}
          height={72}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 leading-snug truncate mb-0.5">
          {item.name}
        </p>
        <p className="text-[11px] text-gray-400 mb-2">
          {item.sizeDisplay || (item.weight && item.unit ? `${item.weight} ${item.unit}` : '')}
          {item.brand ? ` · ${item.brand}` : ''}
        </p>

        <div className="flex items-center justify-between">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-medium text-gray-900">
              ₹{(unitPrice * item.quantity).toLocaleString('en-IN')}
            </span>
            {originalPrice && originalPrice > unitPrice && (
              <span className="text-[11px] text-gray-400 line-through">
                ₹{(originalPrice * item.quantity).toLocaleString('en-IN')}
              </span>
            )}
            {discountPct > 0 && (
              <span className="text-[11px] font-medium text-emerald-700">{discountPct}% off</span>
            )}
          </div>

          {/* Qty stepper */}
          <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
            <button
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-8 h-7 flex items-center justify-center text-base text-gray-700 disabled:text-gray-300 hover:bg-gray-50 transition"
              aria-label="Decrease"
            >
              −
            </button>
            <span className="text-[13px] font-medium text-gray-900 min-w-[20px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={item.quantity >= 10}
              className="w-8 h-7 flex items-center justify-center text-base text-gray-700 disabled:text-gray-300 hover:bg-gray-50 transition"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 self-start hover:bg-red-50 hover:text-red-500 transition"
        aria-label="Remove item"
      >
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

function ActionButton({ onClick, variant = 'default', icon, children }) {
  const variants = {
    default: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${variants[variant]}`}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      {children}
    </button>
  );
}

function SummaryCard({ cartItems, cartTotal }) {
  const mrpTotal = cartItems.reduce((acc, item) => {
    const mrp = item.originalPrice || (item.selectedSize?.price ?? parseFloat(item.price));
    return acc + mrp * item.quantity;
  }, 0);
  const discount = mrpTotal - cartTotal;
  const totalQty = cartItems.reduce((a, i) => a + i.quantity, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mx-4 mb-3">
      <SectionLabel>Order summary</SectionLabel>
      <div className="space-y-0 divide-y divide-gray-100 text-[13px]">
        <div className="flex justify-between py-2.5 text-gray-500">
          <span>Subtotal ({totalQty} items)</span>
          <span className="font-medium text-gray-900">₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between py-2.5 text-gray-500">
          <span>Shipping</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
            Free
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between py-2.5 text-gray-500">
            <span>Discount</span>
            <span className="font-medium text-emerald-700">−₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 pb-1 text-[15px] font-medium text-gray-900">
          <span>Total</span>
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

function SavingsBanner({ cartItems, cartTotal }) {
  const mrpTotal = cartItems.reduce((acc, item) => {
    const mrp = item.originalPrice || (item.selectedSize?.price ?? parseFloat(item.price));
    return acc + mrp * item.quantity;
  }, 0);
  const savings = mrpTotal - cartTotal;
  if (savings <= 0) return null;
  return (
    <div className="mx-4 mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-[12px] font-medium text-emerald-800">
        You're saving ₹{savings.toLocaleString('en-IN')} on this order
      </p>
    </div>
  );
}

function SavedCartsSection({ savedCarts, onLoad, onDelete }) {
  if (!savedCarts?.length) return null;
  return (
    <div className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-900">Saved carts</p>
        <span className="text-[11px] text-gray-400">{savedCarts.length} saved</span>
      </div>
      {savedCarts.map((sc) => (
        <div key={sc.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-100 last:border-0">
          <div>
            <p className="text-[12px] font-medium text-gray-800">{sc.name}</p>
            <p className="text-[11px] text-gray-400">
              {sc.items.length} items · {new Date(sc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onLoad(sc.id)}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-600 text-white"
            >
              Load
            </button>
            <button
              onClick={() => onDelete(sc.id)}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-sm text-gray-400 mb-6">Add products to start your order</p>
      <Link
        href="/products"
        className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-emerald-700 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        Shop now
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Save Cart Modal
───────────────────────────────────────────── */
function SaveCartModal({ title, placeholder, onSave, onClose }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5">
        <h2 className="text-base font-medium text-gray-900 mb-4">{title}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(name);
            if (e.key === 'Escape') onClose();
          }}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 bg-gray-50"
        />
        <div className="flex gap-3">
          <button
            onClick={() => onSave(name)}
            className="flex-1 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Templates Modal
───────────────────────────────────────────── */
function TemplatesModal({ cartTemplates, cartItems, onSaveTemplate, onLoadTemplate, onDeleteTemplate, onClose }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-900">Cart templates</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {cartItems.length > 0 && (
          <div className="mb-5 p-3.5 bg-gray-50 rounded-xl">
            <p className="text-xs font-medium text-gray-600 mb-2">Save current cart as template</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name…"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                onKeyDown={(e) => { if (e.key === 'Enter') { onSaveTemplate(name); setName(''); } }}
              />
              <button
                onClick={() => { onSaveTemplate(name); setName(''); }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {cartTemplates?.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Saved templates</p>
            {cartTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[13px] font-medium text-gray-800">{t.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {t.items.length} items · {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onLoadTemplate(t.id); onClose(); }}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-600 text-white"
                  >
                    Add to cart
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-8">No templates saved yet</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main cart content
───────────────────────────────────────────── */
function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, authHydrated, setShowLoginSheet } = useAuth();
  const {
    cartItems,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    saveCart,
    loadSavedCart,
    deleteSavedCart,
    savedCarts,
    saveCartAsTemplate,
    loadCartTemplate,
    deleteCartTemplate,
    cartTemplates,
    shareCart,
    loadSharedCart,
  } = useCart();
  const { showAlert } = useAlert();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [deleteCartConfirm, setDeleteCartConfirm] = useState(null);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState(null);

  useEffect(() => {
    const shared = searchParams?.get('shared');
    if (shared) loadSharedCart(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalQty = cartItems.reduce((a, i) => a + i.quantity, 0);

  const handleProceedToCheckout = () => {
    if (!authHydrated) return;
    if (isAuthenticated) {
      router.push('/checkout');
      return;
    }
    setPostLoginRedirect('/checkout');
    setShowLoginSheet(true);
  };

  const handleSaveCart = (name) => {
    if (!name?.trim()) { showAlert('Please enter a name', 'Required', 'warning'); return; }
    saveCart(name);
    setShowSaveModal(false);
    showAlert('Cart saved!', 'Success', 'success');
  };

  const handleSaveTemplate = (name) => {
    if (!name?.trim()) { showAlert('Please enter a name', 'Required', 'warning'); return; }
    saveCartAsTemplate(name);
    showAlert('Template saved!', 'Success', 'success');
  };

  /* ── Icons ── */
  const SaveIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
  const ShareIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
  const TplIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
  const TrashIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28 w-full max-w-full overflow-x-hidden">
      <TopBar itemCount={totalQty} />

      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          {/* Cart items */}
          <div className="px-4 pt-4 space-y-2.5 mb-4">
            <SectionLabel>Items</SectionLabel>
            {cartItems.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onQuantityChange={(id, qty) => {
                  if (qty < 1) removeFromCart(id);
                  else updateQuantity(id, qty);
                }}
                onRemove={removeFromCart}
              />
            ))}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <ActionButton onClick={() => setShowSaveModal(true)} icon={SaveIcon}>
                Save cart
              </ActionButton>
              <ActionButton onClick={shareCart} variant="green" icon={ShareIcon}>
                Share cart
              </ActionButton>
              <ActionButton onClick={() => setShowTemplatesModal(true)} icon={TplIcon}>
                Templates
              </ActionButton>
              <ActionButton onClick={clearCart} variant="danger" icon={TrashIcon}>
                Clear all
              </ActionButton>
            </div>
          </div>

          {/* Savings banner */}
          <SavingsBanner cartItems={cartItems} cartTotal={cartTotal} />

          {/* Order summary */}
          <SummaryCard cartItems={cartItems} cartTotal={cartTotal} />

          {/* Saved carts */}
          <SavedCartsSection
            savedCarts={savedCarts}
            onLoad={loadSavedCart}
            onDelete={(id) => setDeleteCartConfirm(id)}
          />
        </>
      )}

      {/* ── Sticky bottom bar ── */}
      {cartItems.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex-1">
            <p className="text-[11px] text-gray-400">Total</p>
            <p className="text-lg font-medium text-gray-900">₹{cartTotal.toLocaleString('en-IN')}</p>
          </div>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-sm font-medium transition bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] whitespace-nowrap"
          >
            Checkout
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {showSaveModal && (
        <SaveCartModal
          title="Save cart"
          placeholder="Enter cart name…"
          onSave={handleSaveCart}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          cartTemplates={cartTemplates}
          cartItems={cartItems}
          onSaveTemplate={handleSaveTemplate}
          onLoadTemplate={loadCartTemplate}
          onDeleteTemplate={(id) => setDeleteTemplateConfirm(id)}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={deleteCartConfirm !== null}
        onClose={() => setDeleteCartConfirm(null)}
        onConfirm={() => { deleteSavedCart(deleteCartConfirm); setDeleteCartConfirm(null); }}
        title="Delete saved cart"
        message="Are you sure you want to delete this saved cart?"
        confirmText="Yes, delete"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={deleteTemplateConfirm !== null}
        onClose={() => setDeleteTemplateConfirm(null)}
        onConfirm={() => { deleteCartTemplate(deleteTemplateConfirm); setDeleteTemplateConfirm(null); }}
        title="Delete template"
        message="Are you sure you want to delete this template?"
        confirmText="Yes, delete"
        cancelText="Cancel"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page export with Suspense
───────────────────────────────────────────── */
export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 animate-pulse">
          <div className="bg-white border-b border-gray-100 h-14" />
          <div className="px-4 pt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-24 border border-gray-100" />
            ))}
          </div>
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}