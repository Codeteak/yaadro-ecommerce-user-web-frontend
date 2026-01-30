'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrdersList, useCancelOrder } from '../../hooks/useOrders';
import { useCart } from '../../context/CartContext';
import { useAlert } from '../../context/AlertContext';
import Image from 'next/image';
import ConfirmModal from '../../components/ConfirmModal';
import PromptModal from '../../components/PromptModal';
import PageTopBar from '../../components/PageTopBar';
import { Check, MoreVertical, ShoppingCart, Percent } from 'lucide-react';

export default function OrdersPage() {
  const { data: ordersData, isLoading, error } = useOrdersList({ page: 1, per_page: 50 });
  const cancelOrderMutation = useCancelOrder();
  const { addToCart, cartCount } = useCart();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const { showAlert } = useAlert();
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

  const handleReorder = (order) => {
    order.items.forEach(item => {
      const product = {
        id: item.productId,
        name: item.productName,
        price: item.unitPrice,
        image: item.product?.images?.[0] || item.image || '/images/dummy.png',
      };
      addToCart(product, item.quantity || 1);
    });
    showAlert('Items added to cart!', 'Success', 'success');
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

    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/orders/${orderId}`;
    
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

  return (
    <div className="pb-28 md:pb-8 w-full max-w-full overflow-x-hidden min-h-screen bg-gray-50">
      <PageTopBar title="Your Orders" backHref="/settings" fallbackHref="/" />

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
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
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-500 font-medium mb-4">No orders yet</p>
            <Link href="/products" className="text-primary font-semibold text-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                    <div className="relative">
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
                          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] py-1 bg-white rounded-xl border border-gray-200 shadow-lg">
                            <Link
                              href={`/orders/${order.id}`}
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
                        src={item.image || '/images/dummy.png'}
                        alt={item.productName || item.name || 'Item'}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ))}
                </div>

                {/* Rate Order | Order Again */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Rate Order
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="flex-1 py-2.5 rounded-xl border border-primary text-primary font-medium text-sm hover:bg-primary/10 transition-colors"
                  >
                    Order Again
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom bar: discount offer + Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-800 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between gap-4 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Percent className="w-5 h-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Unlock extra ₹30 OFF</p>
            <p className="text-xs text-white/80 truncate">Shop for ₹519 more</p>
          </div>
        </div>
        <Link
          href="/cart"
          className="flex-shrink-0 flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
        >
          <ShoppingCart className="w-5 h-5" strokeWidth={2} />
          <span>Cart</span>
          {cartCount > 0 && <span className="text-xs opacity-90">{cartCount} item{cartCount !== 1 ? 's' : ''}</span>}
        </Link>
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


