'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrdersList, useCancelOrder } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import Image from 'next/image';
import ConfirmModal from '../../components/ConfirmModal';
import PromptModal from '../../components/PromptModal';
import PageTopBar from '../../components/PageTopBar';
import { Check, MoreVertical, Package } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, authHydrated, isLoadingUser } = useAuth();
  const { data: ordersData, isLoading, error } = useOrdersList(
    { page: 1, per_page: 100 },
    { enabled: authHydrated && isAuthenticated }
  );

  useEffect(() => {
    if (!authHydrated) return;
    if (isLoadingUser) return;
    if (!isAuthenticated) router.replace('/');
  }, [authHydrated, isLoadingUser, isAuthenticated, router]);
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

  if (!authHydrated || isLoadingUser) {
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

  if (!isAuthenticated) return null;

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
                    <span className="font-bold text-gray-900">
                      Order {order.status === 'delivered' ? 'delivered' : order.status}
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

                {/* Product thumbnails */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-1">
                  {order.items?.slice(0, 6).map((item, idx) => (
                    <div key={item.id || idx} className="relative w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      <Image
                        src={(typeof item.image === 'string' ? item.image : item.image?.url) || '/images/dummy.png'}
                        alt={item.productName || item.name || 'Item'}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ))}
                </div>

                {/* Rate Order | Order Again */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
                  >
                    Rate Order
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    disabled={reorderLoadingId === order.id}
                    className="flex-1 rounded-xl border border-primary py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    {reorderLoadingId === order.id ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
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


