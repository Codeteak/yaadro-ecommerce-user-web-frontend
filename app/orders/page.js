'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdersList, useCancelOrder } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { cartKeys } from '../../hooks/useCart';
import { getCart } from '../../utils/cartApi';
import { useAlert } from '../../context/AlertContext';
import Image from 'next/image';
import ConfirmModal from '../../components/ConfirmModal';
import PromptModal from '../../components/PromptModal';
import PageTopBar from '../../components/PageTopBar';
import GuestAuthPrompt from '../../components/GuestAuthPrompt';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import ProductCarousel from '../../components/ProductCarousel';
import { Check, MoreVertical, Package } from 'lucide-react';
import { getResolvedProductImageUrls, PRODUCT_IMAGE_PLACEHOLDER } from '../../utils/productImages';

function getOrderStatusTone(status = '') {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'cancelled' || s === 'canceled') return 'bg-red-50 text-red-700 border-red-200';
  if (s === 'processing' || s === 'confirmed') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s === 'shipped' || s === 'out_for_delivery') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function getOrderItemImage(item) {
  const fromProduct = getResolvedProductImageUrls(item?.product || {});
  const fromItem = getResolvedProductImageUrls(item || {});
  return (
    fromProduct.find((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER) ||
    fromItem.find((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER) ||
    (typeof item?.image === 'string' ? item.image : item?.image?.url) ||
    PRODUCT_IMAGE_PLACEHOLDER
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { ok, ready } = useRequireAuth();
  const { data: ordersData, isLoading, error } = useOrdersList(
    { page: 1, per_page: 100 },
    { enabled: ok }
  );
  const cancelOrderMutation = useCancelOrder();
  const { addToCart } = useCart();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const { showAlert } = useAlert();
  const [reorderLoadingId, setReorderLoadingId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const orders = ordersData?.orders || [];
  const allOrderedItems = useMemo(
    () => orders.flatMap((o) => (Array.isArray(o.items) ? o.items : [])),
    [orders]
  );

  // Similar products for order-history page:
  // exclude already ordered products, then prioritize ordered categories.
  const { data: recommendPoolData } = useProducts({
    limit: 60,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const recommendPool = recommendPoolData?.products || [];
  const orderedProductIds = useMemo(
    () =>
      new Set(
        allOrderedItems
          .map((item) => item?.productId ?? item?.product?.id ?? item?.id)
          .filter((id) => id != null)
          .map((id) => String(id))
      ),
    [allOrderedItems]
  );
  const orderedCategoryNames = useMemo(() => {
    const names = new Set();
    allOrderedItems.forEach((item) => {
      const cat = (
        item?.category?.name ??
        item?.category ??
        item?.categoryName ??
        item?.product?.category?.name ??
        item?.product?.category ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();
      if (cat) names.add(cat);
    });
    return names;
  }, [allOrderedItems]);

  // One pipeline: each product appears in at most one section (priority: Similar → Buy again → Trending).
  const { similarProducts, buyAgainFavorites, trendingPicks } = useMemo(() => {
    const empty = { similarProducts: [], buyAgainFavorites: [], trendingPicks: [] };
    if (!recommendPool.length) return empty;

    const eligible = recommendPool.filter((p) => p?.id != null && !orderedProductIds.has(String(p.id)));
    if (!eligible.length) return empty;

    const poolIndex = new Map(eligible.map((p, i) => [String(p.id), i]));

    const productCategoryKey = (p) =>
      (
        p?.category?.name ??
        p?.category ??
        p?.categoryName ??
        p?.category_name ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();

    const matchesOrderedCategory = (p) => {
      const c = productCategoryKey(p);
      return Boolean(c && orderedCategoryNames.has(c));
    };

    const orderedNameTokens = new Set(
      allOrderedItems
        .map((item) => item?.productName ?? item?.name ?? '')
        .map((name) => String(name).trim().toLowerCase())
        .filter(Boolean)
        .flatMap((name) => name.split(/\s+/).filter((w) => w.length >= 4))
    );

    const nameTokenHits = (p) => {
      const name = (p?.name ?? '').toString().trim().toLowerCase();
      if (!name || orderedNameTokens.size === 0) return 0;
      let hits = 0;
      for (const t of orderedNameTokens) {
        if (name.includes(t)) hits += 1;
      }
      return hits;
    };

    const sortByNewest = (a, b) => (poolIndex.get(String(a.id)) ?? 0) - (poolIndex.get(String(b.id)) ?? 0);

    const takeUnique = (sorted, used, limit) => {
      const out = [];
      for (const p of sorted) {
        if (out.length >= limit) break;
        const id = String(p.id);
        if (used.has(id)) continue;
        used.add(id);
        out.push(p);
      }
      return out;
    };

    const used = new Set();

    // 1) Similar: same category as something you ordered; rank by name relevance then newest.
    const similarCandidates = eligible.filter(matchesOrderedCategory);
    const similarSorted = [...similarCandidates].sort((a, b) => {
      const nt = nameTokenHits(b) - nameTokenHits(a);
      if (nt !== 0) return nt;
      return sortByNewest(a, b);
    });
    const similarProducts = takeUnique(similarSorted, used, 12);

    // 2) Buy again: from what’s left; strong name-token match + mild category boost, then newest.
    const remainingAfterSimilar = eligible.filter((p) => !used.has(String(p.id)));
    const buyAgainScore = (p) => nameTokenHits(p) * 4 + (matchesOrderedCategory(p) ? 1 : 0);
    const buyAgainSorted = [...remainingAfterSimilar].sort((a, b) => {
      const s = buyAgainScore(b) - buyAgainScore(a);
      if (s !== 0) return s;
      return sortByNewest(a, b);
    });
    const buyAgainFavorites = takeUnique(buyAgainSorted, used, 12);

    // 3) Trending: newest products not already placed (pool is created_at desc).
    const remainingAfterBuyAgain = eligible.filter((p) => !used.has(String(p.id)));
    const trendingSorted = [...remainingAfterBuyAgain].sort(sortByNewest);
    const trendingPicks = takeUnique(trendingSorted, used, 12);

    return { similarProducts, buyAgainFavorites, trendingPicks };
  }, [recommendPool, orderedProductIds, orderedCategoryNames, allOrderedItems]);

  const orderItemToCartProduct = (item) => {
    const qty = Number(item?.quantity ?? 1) || 1;
    const unitPriceRaw =
      item?.unitPrice ??
      item?.price ??
      (item?.totalPrice != null ? Number(item.totalPrice) / qty : null);
    const unitPrice = Number(unitPriceRaw);

    const id =
      item?.product?.id ??
      item?.productId ??
      item?.product_id ??
      item?.productUUID ??
      item?.productUuid ??
      item?.id;

    const name = item?.productName ?? item?.name ?? item?.product?.name ?? 'Item';
    const image =
      item?.product?.images?.[0] ||
      (typeof item?.image === 'string' ? item.image : item?.image?.url) ||
      '/images/dummy.png';

    const selectedSize =
      item?.selectedSize ||
      (item?.weight && item?.unit
        ? { weight: item.weight, unit: item.unit, price: Number.isFinite(unitPrice) ? unitPrice : undefined }
        : null);

    return {
      id,
      productId: id,
      name,
      image,
      price: Number.isFinite(unitPrice) ? unitPrice : 0,
      originalPrice: item?.originalPrice ?? item?.mrp ?? item?.listPrice ?? undefined,
      selectedSize: selectedSize || undefined,
      sizeDisplay: item?.sizeDisplay || undefined,
      weight: item?.weight || undefined,
      unit: item?.unit || undefined,
      brand: item?.brand || item?.product?.brand || undefined,
      category: item?.category || item?.product?.category || undefined,
    };
  };

  const handleReorder = async (order) => {
    const items = order?.items || [];
    if (!items.length) {
      showAlert('No items found in this order.', 'Reorder', 'warning');
      return;
    }
    if (reorderLoadingId === order?.id) return;
    setReorderLoadingId(order?.id ?? null);
    try {
      for (const item of items) {
        const qty = Number(item?.quantity ?? 1) || 1;
        const product = orderItemToCartProduct(item);
        await addToCart(product, qty);
      }
      if (isAuthenticated) {
        try {
          await queryClient.fetchQuery({
            queryKey: cartKeys.cart(),
            queryFn: getCart,
          });
        } catch (e) {
          console.error('Cart refresh after reorder:', e);
        }
      }
      showAlert('Items added to cart!', 'Success', 'success');
      router.push('/cart');
    } catch (e) {
      showAlert(e?.message || 'Failed to reorder. Please try again.', 'Error', 'error');
    } finally {
      setReorderLoadingId(null);
    }
  };

  const handleCancel = (orderId) => {
    setCancelOrderId(orderId);
    setShowCancelPrompt(true);
  };

  const handleCancelReasonSubmit = (reason) => {
    setCancelReason(reason);
    setShowCancelPrompt(false);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelOrderMutation.mutateAsync({ orderId: cancelOrderId, reason: cancelReason });
      showAlert('Order cancelled successfully!', 'Success', 'success');
      setCancelOrderId(null);
      setCancelReason('');
      setShowCancelConfirm(false);
    } catch (error) {
      showAlert(error.message || 'Failed to cancel order. Please try again.', 'Error', 'error');
      setCancelOrderId(null);
      setCancelReason('');
      setShowCancelConfirm(false);
    }
  };

  const handleDownloadInvoice = (order) => {
    const invoiceText = `
INVOICE
Invoice Number: ${order.orderNumber || order.id}
Order ID: ${order.id}
Date: ${new Date(order.createdAt).toLocaleDateString()}

Items:
${order.items.map(item => `  ${item.productName || item.name} x${item.quantity} - ₹${item.totalPrice.toFixed(2)}`).join('\n')}

Subtotal: ₹${order.subtotal.toFixed(2)}
Tax: ₹${order.tax.toFixed(2)}
Shipping: ₹${order.shipping.toFixed(2)}
Discount: ₹${order.discount.toFixed(2)}
Total: ₹${order.total.toFixed(2)}

Shipping Address:
${order.deliveryAddress?.street || ''}
${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}
${order.deliveryAddress?.zipCode || ''}
${order.deliveryAddress?.country || ''}

Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
Payment Status: ${order.paymentStatus}
    `.trim();

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.orderNumber || order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareOrder = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/order?id=${encodeURIComponent(orderId)}`;
    
    if (typeof window !== 'undefined' && navigator.share) {
      navigator.share({
        title: `Order ${order.orderNumber || orderId}`,
        text: `Check out my order details!`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        showAlert('Order link copied to clipboard!', 'Success', 'success');
      });
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showAlert('Order link copied to clipboard!', 'Success', 'success');
    }
  };

  const formatPlacedAt = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `Placed at ${day}${suffix} ${d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="sticky top-0 z-20 shrink-0">
          <PageTopBar title="Your Orders" backHref="/profile" fallbackHref="/" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-24 pt-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!ok) {
    return (
      <GuestAuthPrompt
        pageTitle="Your Orders"
        backHref="/profile"
        fallbackHref="/"
        description="Sign in to view your orders and track deliveries."
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-20 shrink-0">
        <PageTopBar title="Your Orders" backHref="/profile" fallbackHref="/" />
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 pb-24 pt-4">
        {isLoading ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-gray-500 mt-4 text-sm">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-red-500 font-medium mb-2">Error loading orders</p>
            <p className="text-gray-500 text-sm">{error.message}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <Package className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={1.25} />
            <p className="mb-4 font-medium text-gray-600">No orders yet</p>
            <Link href="/products" className="text-sm font-semibold text-primary hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              role="link"
              tabIndex={0}
              aria-label={`Order details for ${order.orderNumber || order.id}`}
              className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => router.push(`/order?id=${encodeURIComponent(order.id)}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/order?id=${encodeURIComponent(order.id)}`);
                }
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 inline-flex items-center gap-1.5">
                      <span>Order</span>
                      {String(order.status || '').toLowerCase() === 'pending' ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 text-[12px] font-extrabold text-gray-900 bg-center bg-no-repeat bg-cover"
                          style={{ backgroundImage: "url('/paint-brush.png')" }}
                        >
                          Pending
                        </span>
                      ) : (
                        <span>{order.status === 'delivered' ? 'delivered' : order.status}</span>
                      )}
                    </span>
                    {order.status === 'delivered' && (
                      <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-900">₹{order.total?.toFixed?.(0) ?? order.total}</span>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === order.id ? null : order.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-5 h-5" strokeWidth={2} />
                      </button>
                      {menuOpenId === order.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            aria-hidden
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                            }}
                          />
                          <div
                            className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/order?id=${encodeURIComponent(order.id)}`}
                              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setMenuOpenId(null)}
                            >
                              View Details
                            </Link>
                            {order.status === 'delivered' && (
                              <button
                                type="button"
                                onClick={() => { handleDownloadInvoice(order); setMenuOpenId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Download Invoice
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { shareOrder(order.id); setMenuOpenId(null); }}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              Share
                            </button>
                            {order.canCancel && (
                              <button
                                type="button"
                                onClick={() => { handleCancel(order.id); setMenuOpenId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3">{formatPlacedAt(order.createdAt)}</p>

                {/* Status + stacked products + quick item details */}
                <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                  {(() => {
                    const orderItems = Array.isArray(order.items) ? order.items : [];
                    const visibleItems = orderItems.slice(0, 4);
                    const itemCount =
                      Number(
                        order.itemCount ??
                        order.itemsCount ??
                        order.items_count ??
                        order.total_items ??
                        order.totalItems ??
                        orderItems.length
                      ) || 0;
                    return (
                      <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${getOrderStatusTone(order.status)}`}
                    >
                      {String(order.status || 'pending').replaceAll('_', ' ')}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex min-w-[76px] items-center">
                      {visibleItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="relative h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-gray-100 shadow-sm"
                          style={{ marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx }}
                        >
                          <Image
                            src={getOrderItemImage(item)}
                            alt={item.productName || item.name || 'Item'}
                            fill
                            className="object-contain"
                            sizes="40px"
                          />
                        </div>
                      ))}
                      {itemCount > 4 && (
                        <span className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-gray-200 text-[11px] font-semibold text-gray-700">
                          +{itemCount - 4}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {orderItems.slice(0, 2).map((item, idx) => (
                        <p key={item.id || idx} className="truncate text-[12px] text-gray-700">
                          <span className="font-medium text-gray-900">{item.productName || item.name || 'Item'}</span>
                          <span className="text-gray-500"> x{item.quantity || 1}</span>
                        </p>
                      ))}
                      {itemCount > 2 && (
                        <p className="text-[11px] text-gray-500">
                          +{itemCount - 2} more product{itemCount - 2 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>

                {/* Package illustration | Order Again */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-1 items-center justify-center py-1">
                    <Image
                      src="/fill-box.png"
                      alt="Packed order"
                      width={56}
                      height={56}
                      className="h-14 w-14 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    disabled={reorderLoadingId === order.id}
                    className="flex-1 rounded-xl border border-yellow-500 bg-yellow-400 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-yellow-300"
                  >
                    {reorderLoadingId === order.id ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" aria-hidden />
                        Adding…
                      </span>
                    ) : (
                      'Order Again'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {orders.length > 0 && similarProducts.length > 0 && (
          <section className="mt-2" aria-label="Similar products">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Similar Products
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                Based on your order history.
              </p>
            </div>
            <ProductCarousel products={similarProducts} showMoreLink="/products" />
          </section>
        )}

        {orders.length > 0 && buyAgainFavorites.length > 0 && (
          <section className="mt-4" aria-label="Buy again favorites">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Buy Again Favorites
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                Top picks close to items you already purchased.
              </p>
            </div>
            <ProductCarousel products={buyAgainFavorites} showMoreLink="/products" />
          </section>
        )}

        {orders.length > 0 && trendingPicks.length > 0 && (
          <section className="mt-4" aria-label="Trending picks">
            <div className="px-1 mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 font-headingnow leading-[1]">
                Trending Picks
              </h2>
              <p className="mt-1.5 text-[13px] text-gray-500">
                New and popular products you might like.
              </p>
            </div>
            <ProductCarousel products={trendingPicks} showMoreLink="/products" />
          </section>
        )}
      </div>

      {/* Cancel Order Prompt Modal */}
      <PromptModal
        isOpen={showCancelPrompt}
        onClose={() => {
          setShowCancelPrompt(false);
          setCancelOrderId(null);
        }}
        onSubmit={handleCancelReasonSubmit}
        title="Cancel Order"
        message="Please provide a reason for cancellation:"
        placeholder="Enter cancellation reason"
        submitText="Continue"
        cancelText="Cancel"
      />

      {/* Cancel Order Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setCancelOrderId(null);
          setCancelReason('');
        }}
        onConfirm={handleCancelConfirm}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
      />
    </div>
  );
}


