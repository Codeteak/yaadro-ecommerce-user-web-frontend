'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../hooks/useProducts';
import { useLoginNavigation } from '../../hooks/useLoginNavigation';
import { getCartLinePreviewImageSrc } from '../../utils/productImages';
import { computeCartSavings, getCartBottomBarPricing } from '../../utils/cartSavings';
import ConfirmModal from '../../components/ConfirmModal';
import ProductCarousel from '../../components/ProductCarousel';
import ProductImageWithFallback from '../../components/ProductImageWithFallback';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

/** Shown while localStorage / API cart is still resolving — avoids the empty-state flash. */
function CartPageLoadingSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-2.5 mb-4" aria-busy="true" aria-label="Loading cart">
      <SectionLabel>Items</SectionLabel>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 animate-pulse"
        >
          <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <div className="h-4 w-4/5 rounded bg-gray-100" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
            <div className="mt-2 h-8 w-28 rounded-full bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopBar({ itemCount }) {
  const countLabel =
    itemCount == null ? '…' : `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
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
      <span className="ml-auto text-xs text-gray-400">{countLabel}</span>
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
  const imageSrc = getCartLinePreviewImageSrc(item);
  const unitPrice = item.selectedSize?.price ?? parseFloat(item.price);
  const cartItemRef = item.cartItemKey ?? item.cartItemId ?? item.id;
  const originalPrice = item.originalPrice || null;
  const discountPct =
    originalPrice && originalPrice > unitPrice
      ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3">
      {/* Image */}
      <div className="w-[72px] h-[72px] rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
        <ProductImageWithFallback
          src={imageSrc}
          alt={item.name}
          width={72}
          height={72}
          className="w-full h-full object-contain"
          sizes="72px"
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
              onClick={() => onQuantityChange(cartItemRef, item.quantity - 1)}
              className="w-8 h-7 flex items-center justify-center text-base text-gray-700 hover:bg-gray-50 transition"
              aria-label={item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'}
            >
              −
            </button>
            <span className="text-[13px] font-medium text-gray-900 min-w-[20px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(cartItemRef, item.quantity + 1)}
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
        onClick={() => onRemove(cartItemRef)}
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
  const { mrpTotal, savings } = getCartBottomBarPricing(cartItems, cartTotal);
  const discount = savings > 0.009 ? savings : 0;
  const totalQty = cartItems.reduce((a, i) => a + (Number(i.quantity) || 1), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mx-4 mb-3">
      <SectionLabel>Order summary</SectionLabel>
      <div className="space-y-0 divide-y divide-gray-100 text-[13px]">
        <div className="flex justify-between py-2.5 text-gray-500">
          <span>Subtotal ({totalQty} items)</span>
          <span className="font-medium text-gray-900">₹{mrpTotal.toLocaleString('en-IN')}</span>
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

function EmptyCart({ carouselSections = [] }) {
  return (
    <div className="w-full max-w-full pb-4">
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mx-auto mb-6 flex w-full max-w-[220px] justify-center">
          <Image
            src="/empty-box.png"
            alt="Empty cart — open box"
            width={440}
            height={440}
            className="h-auto w-full max-h-[200px] object-contain drop-shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            sizes="(max-width: 420px) 72vw, 220px"
            priority
          />
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <span>Your cart is</span>
          <span
            className="inline-flex items-center justify-center px-[1.1rem] py-[0.2rem] text-[1.07rem] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] bg-[url('/red-brush.png')] bg-center bg-no-repeat [background-size:100%_100%]"
          >
            Empty
          </span>
        </h2>
        <p className="text-sm text-gray-400 mb-6">Add products to start your order</p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-emerald-700 transition"
        >
          Shop now
        </Link>
      </div>

      {carouselSections.map(({ key, title, description, products }) =>
        products.length > 0 ? (
          <section key={key} className="mt-8 px-4" aria-label={title}>
            <div className="mb-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                {title}
              </h2>
              <p className="mt-2 text-[13px] md:text-sm text-gray-500">{description}</p>
            </div>
            <ProductCarousel products={products} showMoreLink="/products" />
            <div className="mt-4 flex justify-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-[12px] font-medium text-emerald-700 hover:text-emerald-800 transition"
              >
                <span>See all</span>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main cart content
───────────────────────────────────────────── */
function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, authHydrated } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const {
    cartItems,
    cartTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    loadSavedCart,
    deleteSavedCart,
    savedCarts,
    loadSharedCart,
    loading: cartQueryLoading,
    cartQueryFetching,
    hasHydratedLocalCart,
  } = useCart();
  const { showAlert } = useAlert();

  const [deleteCartConfirm, setDeleteCartConfirm] = useState(null);

  useEffect(() => {
    const shared = searchParams?.get('shared');
    if (shared) loadSharedCart(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalQty = cartItems.reduce((a, i) => a + i.quantity, 0);

  /** Include `cartQueryFetching` so post–“Order again” refetch does not flash the empty cart UI. */
  const showCartLoading =
    !hasHydratedLocalCart ||
    (cartItems.length === 0 && (cartQueryLoading || cartQueryFetching));

  // Pool of products used to suggest "similar products". Same query as home → cached.
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

  const cartCategoryNames = useMemo(() => {
    const names = new Set();
    cartItems.forEach((item) => {
      const cat =
        item?.category?.name ??
        item?.category ??
        item?.categoryName ??
        item?.product?.category?.name ??
        item?.product?.category ??
        null;
      if (typeof cat === 'string' && cat.trim()) names.add(cat.trim().toLowerCase());
    });
    return names;
  }, [cartItems]);

  const orderSavings = useMemo(
    () => computeCartSavings(cartItems, cartTotal),
    [cartItems, cartTotal]
  );
  const bottomBarPricing = useMemo(
    () => getCartBottomBarPricing(cartItems, cartTotal),
    [cartItems, cartTotal]
  );

  const similarProducts = useMemo(() => {
    if (similarPool.length === 0) return [];
    const candidates = similarPool.filter(
      (p) => p?.id != null && !cartProductIds.has(String(p.id))
    );
    if (cartCategoryNames.size === 0) return candidates.slice(0, 12);
    const matchesCart = (p) => {
      const pc = (
        p?.category?.name ??
        p?.category ??
        p?.categoryName ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();
      return pc && cartCategoryNames.has(pc);
    };
    const priority = candidates.filter(matchesCart);
    const others = candidates.filter((p) => !matchesCart(p));
    return [...priority, ...others].slice(0, 12);
  }, [similarPool, cartProductIds, cartCategoryNames]);

  /** Two non-overlapping carousels below empty-cart CTA (same catalog pool as Similar Products). */
  const emptyCartCarouselSections = useMemo(() => {
    const list = similarPool.filter((p) => p?.id != null);
    if (list.length === 0) return [];
    return [
      {
        key: 'empty-picks-1',
        title: 'You might like',
        description: 'Popular picks you can add anytime.',
        products: list.slice(0, 8),
      },
      {
        key: 'empty-picks-2',
        title: 'More to explore',
        description: 'Recently listed items worth a look.',
        products: list.slice(8, 16),
      },
    ];
  }, [similarPool]);

  const handleProceedToCheckout = () => {
    if (!authHydrated) return;
    if (isAuthenticated) {
      router.push('/checkout');
      return;
    }
    goToLogin('/checkout');
  };

  /* ── Icons ── */
  const TrashIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <div
      className={`min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden ${cartItems.length > 0 ? 'pb-32' : 'pb-28'}`}
    >
      <TopBar itemCount={showCartLoading ? null : totalQty} />

      {showCartLoading ? (
        <CartPageLoadingSkeleton />
      ) : cartItems.length === 0 ? (
        <EmptyCart carouselSections={emptyCartCarouselSections} />
      ) : (
        <>
          {/* Cart items */}
          <div className="px-4 pt-4 space-y-2.5 mb-4">
            <SectionLabel>Items</SectionLabel>
            {cartItems.map((item) => (
              <CartItemCard
                key={item.cartItemKey ?? item.cartItemId ?? item.id}
                item={item}
                onQuantityChange={(id, qty) => {
                  if (qty < 1) removeFromCart(id);
                  else updateQuantity(id, qty);
                }}
                onRemove={removeFromCart}
              />
            ))}

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

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <ActionButton onClick={clearCart} variant="danger" icon={TrashIcon}>
                Clear all
              </ActionButton>
            </div>

            {/* Similar products — suggestions based on cart contents (or random fallback) */}
            {similarProducts.length > 0 && (
              <section className="mt-6" aria-label="Similar products">
                <div className="mb-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                      Similar Products
                    </h2>
                    <p className="mt-2 text-[13px] md:text-sm text-gray-500">
                      You might also like these picks.
                    </p>
                  </div>
                </div>
                <ProductCarousel products={similarProducts} showMoreLink="/products" />
                <div className="mt-4 flex justify-center">
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 text-[12px] font-medium text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>See all</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </section>
            )}
          </div>

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

      {/* ── Sticky bottom bar (savings strip + checkout row) ── */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
          {orderSavings > 0 && (
            <div
              className="flex items-center justify-center gap-1.5 border-b border-white/15 px-3 py-2 text-center"
              style={{ backgroundColor: '#00a63d' }}
            >
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-[11px] font-semibold leading-tight text-white">
                You&apos;re saving ₹{orderSavings.toLocaleString('en-IN')} on this order
              </p>
            </div>
          )}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">Total</p>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-lg font-semibold text-gray-900 tabular-nums">
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
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              Checkout
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
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
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page export with Suspense
───────────────────────────────────────────── */
export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" aria-hidden />}>
      <CartPageContent />
    </Suspense>
  );
}