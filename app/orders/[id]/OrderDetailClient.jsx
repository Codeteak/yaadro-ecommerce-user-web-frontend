'use client';

import { useState, Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useOrderDetail, useCancelOrder, useRetryPayment, useVerifyPayment } from '../../../hooks/useOrders';
import { useProductWithRelated } from '../../../hooks/useProducts';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import ProductCarousel from '../../../components/ProductCarousel';
import ConfirmModal from '../../../components/ConfirmModal';
import PromptModal from '../../../components/PromptModal';

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck({ color = '#059669' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconRetry({ color = 'currentColor' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8a6 6 0 016-6 6 6 0 015.74 4.26M14 4v4h-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCancel() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="#791F1F" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconReorder() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white" aria-hidden>
      <path d="M2 8a6 6 0 016-6 6 6 0 015.74 4.26M14 4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'odSpin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
    </svg>
  );
}

const fmt = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
};

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const TIMELINE_LABELS = {
  pending:    'Order placed',
  confirmed:  'Confirmed',
  processing: 'Processing',
  shipped:    'Shipped',
  delivered:  'Delivered',
};

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    day:  dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

/** Tailwind rings — aligned with checkout / home (white + emerald) */
const STATUS_PILL_CLASS = {
  pending:    'bg-amber-50 text-amber-900 ring-1 ring-amber-200/90',
  confirmed:  'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  processing: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  shipped:    'bg-sky-50 text-sky-900 ring-1 ring-sky-200/90',
  delivered:  'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  cancelled:  'bg-red-50 text-red-900 ring-1 ring-red-200/90',
};

const PAYMENT_PILL_CLASS = {
  paid:     'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  success:  'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  cod:      'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90',
  pending:  'bg-amber-50 text-amber-900 ring-1 ring-amber-200/90',
  failed:   'bg-red-50 text-red-900 ring-1 ring-red-200/90',
  refunded: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/90',
};

function StatusPill({ label, variant = 'fulfillment', status }) {
  const key = String(status || 'pending').toLowerCase();
  const map = variant === 'payment' ? PAYMENT_PILL_CLASS : STATUS_PILL_CLASS;
  const cls = map[key] || (variant === 'payment' ? PAYMENT_PILL_CLASS.pending : STATUS_PILL_CLASS.pending);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${cls}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      {label || key}
    </span>
  );
}

function Section({ children, className = '' }) {
  return (
    <div className={`mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{title}</span>
      {right && <span className="text-xs text-gray-500">{right}</span>}
    </div>
  );
}

function pickStepDate(order, status) {
  const created = order.createdAt;
  const updated = order.updatedAt;
  const delivered = order.deliveredAt;
  const shipped = order.shippedAt;
  if (status === 'delivered') return delivered || updated || created;
  if (status === 'shipped') return shipped || updated || created;
  if (status === 'pending') return created;
  return updated || created;
}

function stepTimelineSubtitle(order, status, isActive, isDone, d) {
  if (d) return `${d.day} · ${d.time}`;
  if (status === 'shipped' && isActive) return 'Out for delivery';
  if (isDone) return 'Completed';
  if (isActive && status === 'pending') return 'Waiting for confirmation';
  if (isActive) return 'In progress';
  return '—';
}

function Timeline({ order }) {
  if (order.status === 'cancelled') {
    const cx = order.cancelledAt;
    const d = fmtDate(cx);
    return (
      <div className="p-4">
        <div className="rounded-xl border border-red-100 bg-red-50/90 px-3 py-3 text-[13px] text-red-900">
          <p className="m-0 font-medium">Order cancelled</p>
          {d ? (
            <p className="mb-0 mt-1 text-[11px] text-red-800/90">
              {d.day} · {d.time}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;
  const steps = STATUS_ORDER.slice(0, Math.max(safeIdx + 1, 1));

  return (
    <div className="p-4">
      {steps.map((status, i) => {
        const isDone = i < steps.length - 1;
        const isActive = i === steps.length - 1;
        const isLast = i === steps.length - 1;
        const dateRef = pickStepDate(order, status);
        const d = fmtDate(dateRef);
        const subtitle = stepTimelineSubtitle(order, status, isActive, isDone, d);

        return (
          <div key={status} className="flex gap-3">
            <div className="flex w-5 shrink-0 flex-col items-center">
              <div
                className={`z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-50'
                    : isActive
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                {isDone && <IconCheck />}
                {isActive && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className={`my-0.5 w-[2px] flex-1 min-h-[20px] ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`}
                />
              )}
            </div>

            <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-5'}`}>
              <div
                className={`text-[13px] font-medium ${
                  isActive || isDone ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {TIMELINE_LABELS[status]}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">{subtitle}</div>
            </div>
          </div>
        );
      })}

      {safeIdx < STATUS_ORDER.length - 1 && (
        <div className="flex gap-3">
          <div className="flex w-5 shrink-0 flex-col items-center">
            <div className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-gray-200 bg-gray-50" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-gray-500">
              {TIMELINE_LABELS[STATUS_ORDER[safeIdx + 1]]}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {STATUS_ORDER[safeIdx + 1] === 'delivered' ? 'We will notify you when it ships' : 'Upcoming'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function downloadInvoice(order) {
  const lines = [
    `INVOICE`,
    `Order: ${order.orderNumber || order.id}`,
    `Date:  ${new Date(order.createdAt).toLocaleString()}`,
    ``,
    `Items:`,
    ...(order.items || []).map((it) => `  ${it.productName || it.name} ×${it.quantity}  ${fmt(it.totalPrice)}`),
    ``,
    `Subtotal : ${fmt(order.subtotal)}`,
    `Tax      : ${fmt(order.tax)}`,
    `Shipping : ${fmt(order.shipping)}`,
    `Discount : −${fmt(order.discount)}`,
    `Total    : ${fmt(order.total)}`,
    ``,
    `Shipping address:`,
    ...(order.deliveryAddress
      ? [
          order.deliveryAddress.fullName || order.deliveryAddress.name || '',
          order.deliveryAddress.street   || order.deliveryAddress.address || '',
          [order.deliveryAddress.city, order.deliveryAddress.state].filter(Boolean).join(', '),
          [order.deliveryAddress.zipCode || order.deliveryAddress.postalCode, order.deliveryAddress.country].filter(Boolean).join(', '),
          order.deliveryAddress.phone ? `Phone: ${order.deliveryAddress.phone}` : '',
        ].filter(Boolean)
      : ['No address on file']),
    ``,
    `Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}`,
    `Status:  ${order.paymentStatus}`,
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${order.orderNumber || order.id}.txt` });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-gray-50 px-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-600"
        aria-hidden
      />
      <p className="text-sm text-gray-500">Loading order…</p>
    </div>
  );
}

function ErrorState({ message, ordersHref = '/orders' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6v5M10 14h.01M18 10A8 8 0 112 10a8 8 0 0116 0z" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="mb-1 text-base font-medium text-gray-900">Order not found</p>
        <p className="text-sm text-gray-500">{message || "This order doesn't exist or was removed."}</p>
      </div>
      <Link
        href={ordersHref}
        className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-emerald-700"
      >
        View all orders
      </Link>
    </div>
  );
}

function ReturnModal({ order, onClose, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [reason, setReason]     = useState('');

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] border border-gray-100 bg-white px-4 pb-8 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-medium text-gray-900">Request return / refund</p>
          <button type="button" onClick={onClose} className="cursor-pointer border-0 bg-transparent text-xl leading-none text-gray-400">
            ×
          </button>
        </div>

        <p className="mb-2.5 text-xs text-gray-500">Select items to return</p>
        <div className="mb-3.5 flex flex-col gap-1.5">
          {order.items.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 ${
                selected.includes(item.id)
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="accent-emerald-600" />
              <span className="text-[13px] text-gray-900">{item.productName || item.name}</span>
            </label>
          ))}
        </div>

        <p className="mb-1.5 text-xs text-gray-500">Reason for return</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe your reason…"
          rows={3}
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400"
        />

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 py-3 text-[13px] font-medium text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(selected, reason)}
            className="flex-1 cursor-pointer rounded-xl border-0 bg-emerald-600 py-3 text-[13px] font-medium text-white hover:bg-emerald-700"
          >
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailContent({ orderId: orderIdProp = null }) {
  const params   = useParams();
  const router   = useRouter();
  const resolvedOrderId = orderIdProp != null ? String(orderIdProp).trim() : params.id;
  const { data: order, isLoading, error } = useOrderDetail(resolvedOrderId);
  const cancelMutation  = useCancelOrder();
  const retryMutation   = useRetryPayment();
  const verifyMutation  = useVerifyPayment();
  const { addToCart }   = useCart();
  const { user }        = useAuth();
  const { showAlert }   = useAlert();

  const [isRetrying, setIsRetrying]     = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [showReturn, setShowReturn]     = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Backend `/storefront/products/:id` expects a slug, not UUID.
  // Prefer slug from nested product; fall back to slugified name; never pass UUID here.
  const seedSlug =
    order?.items?.[0]?.product?.slug ||
    order?.items?.[0]?.product?.slugOrId ||
    order?.items?.[0]?.product?.slug_or_id ||
    order?.items?.[0]?.product?.productSlug ||
    order?.items?.[0]?.productSlug ||
    order?.items?.[0]?.product_name_slug ||
    (order?.items?.[0]?.productName
      ? String(order.items[0].productName)
          .toLowerCase()
          .trim()
          .replace(/['"]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80)
      : null);

  const { data: relatedData } = useProductWithRelated(seedSlug);
  const orderedIds = new Set((order?.items || []).map((it) => it.productId || it.product?.id).filter(Boolean));
  const related = (relatedData?.relatedProducts || []).filter((p) => p?.id && !orderedIds.has(p.id)).slice(0, 12);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orig = console.warn;
    console.warn = (...args) => {
      const msg = args[0]?.toString() || '';
      if (msg.includes('unsafe header') || msg.includes('x-rtb-fingerprint-id')) return;
      orig.apply(console, args);
    };
    return () => { console.warn = orig; };
  }, []);

  if (isLoading) return <LoadingState />;
  if (error || !order) return <ErrorState message={error?.message} />;

  const canRetryPayment = ['pending', 'failed'].includes(order.paymentStatus?.toLowerCase()) && order.paymentMethod !== 'cod';
  const addr = order.deliveryAddress || {};

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

  const handleReorder = async () => {
    const items = order?.items || [];
    if (!items.length) {
      showAlert('No items found in this order.', 'Reorder', 'warning');
      return;
    }
    if (isReordering) return;
    setIsReordering(true);
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
      setIsReordering(false);
    }
  };

  const handleCancelReasonSubmit = (reason) => {
    setCancelReason(reason);
    setShowCancelPrompt(false);
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    try {
      await cancelMutation.mutateAsync({ orderId: order.id, reason: cancelReason });
      showAlert('Order cancelled successfully.', 'Success', 'success');
      setCancelReason('');
    } catch (e) {
      showAlert(e.message || 'Failed to cancel order.', 'Error', 'error');
    }
  };

  const handleReturnSubmit = (items, reason) => {
    if (!items.length) { showAlert('Select at least one item.', 'Required', 'warning'); return; }
    if (!reason.trim()) { showAlert('Please provide a reason.', 'Required', 'warning'); return; }
    setShowReturn(false);
    showAlert('Return request feature coming soon!', 'Coming soon', 'info');
  };

  const handleRazorpay = async (orderResp) => {
    if (!window.Razorpay) { showAlert('Payment gateway not loaded. Refresh and try again.', 'Error', 'error'); setIsRetrying(false); return; }
    const { order: ord, payment } = orderResp;
    const rzp = payment?.razorpay;
    if (!rzp?.keyId || !rzp?.razorpayOrderId || !rzp?.amount) { showAlert('Invalid payment config. Contact support.', 'Error', 'error'); setIsRetrying(false); return; }

    const options = {
      key: rzp.keyId,
      amount: rzp.amount,
      currency: rzp.currency || 'INR',
      order_id: rzp.razorpayOrderId,
      name: 'Yaadro',
      description: `Order ${ord.orderNumber || order.orderNumber}`,
      handler: async (resp) => {
        try {
          await verifyMutation.mutateAsync({
            orderId: ord.id || order.id,
            paymentData: {
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
            },
          });
          router.push(`/order-success?orderId=${ord.id || order.id}&payment=success`);
        } catch (e) {
          showAlert('Payment verification failed. Contact support with order ID: ' + (ord.orderNumber || order.orderNumber), 'Payment failed', 'error');
          router.push(`/order-success?orderId=${ord.id || order.id}&payment=failed`);
        } finally { setIsRetrying(false); }
      },
      prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
      theme: { color: '#059669' },
      modal: { ondismiss: () => setIsRetrying(false) },
      notes: { order_id: ord.id || order.id, retry: 'true' },
    };

    try {
      const rz = new window.Razorpay(options);
      rz.on('payment.failed', (r) => { setIsRetrying(false); showAlert('Payment failed: ' + (r.error.description || 'Try again'), 'Payment failed', 'error'); });
      rz.open();
    } catch (e) { showAlert('Could not open payment gateway.', 'Error', 'error'); setIsRetrying(false); }
  };

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    try {
      const resp = await retryMutation.mutateAsync({ orderId: order.id, paymentMethod: null });
      if (!resp?.payment?.razorpay) { showAlert('Payment init failed. Try again.', 'Error', 'error'); setIsRetrying(false); return; }
      await handleRazorpay(resp);
    } catch (e) { showAlert(e.message || 'Failed to retry payment.', 'Error', 'error'); setIsRetrying(false); }
  };

  return (
    <>
      <style>{`@keyframes odSpin{to{transform:rotate(360deg)}}`}</style>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-svh bg-gray-50 pb-10">
        <div className="mx-auto max-w-[480px]">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3.5">
            <button
              type="button"
              onClick={() => router.push('/orders')}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
            >
              <IconBack />
            </button>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-base font-medium text-gray-900">Order details</p>
              <p className="m-0 font-mono text-[11px] text-gray-500">{order.orderNumber || order.id}</p>
            </div>
            <StatusPill label={order.status} status={order.status} />
          </div>

          <div className="px-3">
            {canRetryPayment && (
              <div
                className={`mt-3 flex gap-2.5 rounded-2xl border p-3.5 ${
                  order.paymentStatus === 'failed'
                    ? 'border-red-100 bg-red-50'
                    : 'border-amber-100 bg-amber-50'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    order.paymentStatus === 'failed' ? 'bg-red-100' : 'bg-amber-100'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 5v4M8 11h.01M14 8A6 6 0 112 8a6 6 0 0112 0z"
                      stroke={order.paymentStatus === 'failed' ? '#b91c1c' : '#92400e'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    className={`m-0 text-[13px] font-medium ${
                      order.paymentStatus === 'failed' ? 'text-red-900' : 'text-amber-900'
                    }`}
                  >
                    Payment {order.paymentStatus === 'failed' ? 'failed' : 'pending'}
                  </p>
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      order.paymentStatus === 'failed' ? 'text-red-800' : 'text-amber-900/90'
                    }`}
                  >
                    {order.paymentStatus === 'failed'
                      ? 'Your payment could not be processed.'
                      : 'Complete payment to confirm your order.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryPayment}
                    disabled={isRetrying || retryMutation.isPending}
                    className={`mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3.5 py-2 text-xs font-medium disabled:opacity-60 ${
                      order.paymentStatus === 'failed'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    {isRetrying || retryMutation.isPending ? (
                      <>
                        <IconSpinner /> Processing…
                      </>
                    ) : (
                      <>
                        <IconRetry color="currentColor" /> Retry payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <Section>
              <SectionHeader
                title="Order status"
                right={fmtDate(order.createdAt)?.day}
              />
              <Timeline order={order} />
              {order.status === 'delivered' && (
                <div className="px-4 pb-3.5">
                  <button
                    type="button"
                    onClick={() => setShowReturn(true)}
                    className="w-full cursor-pointer rounded-xl border border-orange-100 bg-orange-50 py-3 text-[13px] font-medium text-orange-900 hover:bg-orange-100/80"
                  >
                    Request return / refund
                  </button>
                </div>
              )}
            </Section>

            <Section>
              <SectionHeader title={`Items · ${order.items.length}`} right={fmt(order.subtotal)} />
              {order.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    <Image
                      src={
                        item.product?.images?.[0] ||
                        (typeof item.image === 'string' ? item.image : item.image?.url) ||
                        '/images/dummy.png'
                      }
                      alt={item.productName || item.name || 'Item'}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[13px] font-medium text-gray-900">{item.productName || item.name}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Qty {item.quantity}
                      {item.productSku ? ` · SKU: ${item.productSku}` : ''}
                    </p>
                  </div>
                  <p className="ml-auto shrink-0 whitespace-nowrap text-[13px] font-medium text-gray-900">{fmt(item.totalPrice)}</p>
                </div>
              ))}
            </Section>

            <Section>
              <SectionHeader title="Price summary" />
              {[
                { label: 'Subtotal', value: fmt(order.subtotal) },
                order.tax > 0 ? { label: 'Tax', value: fmt(order.tax) } : null,
                order.shipping ? { label: 'Delivery', value: fmt(order.shipping) } : null,
              ]
                .filter(Boolean)
                .map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between border-t border-gray-100 px-4 py-2.5 text-[13px] text-gray-500"
                  >
                    <span>{label}</span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              {order.discount > 0 && (
                <div className="flex justify-between border-t border-gray-100 px-4 py-2.5 text-[13px]">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-emerald-700">−{fmt(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 px-4 py-3 text-sm font-medium text-gray-900">
                <span>Total paid</span>
                <span>{fmt(order.total)}</span>
              </div>
            </Section>

            <Section>
              <SectionHeader title="Delivery & payment" />
              <div className="px-4 py-3 text-[13px] leading-relaxed text-gray-900">
                {(addr.fullName || addr.name) && (
                  <p className="m-0 font-medium">
                    {addr.fullName || addr.name}
                    {addr.phone ? ` · ${addr.phone}` : ''}
                  </p>
                )}
                {(addr.street || addr.address) && <p className="m-0 text-gray-500">{addr.street || addr.address}</p>}
                {(addr.city || addr.state) && (
                  <p className="m-0 text-gray-500">{[addr.city, addr.state].filter(Boolean).join(', ')}</p>
                )}
                {(addr.zipCode || addr.postalCode || addr.country) && (
                  <p className="m-0 text-gray-500">
                    {[addr.zipCode || addr.postalCode, addr.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {addr.landmark && (
                  <p className="mb-0 mt-1 text-[11px] text-gray-500">Near {addr.landmark}</p>
                )}
                {!Object.keys(addr).length && <p className="m-0 italic text-gray-500">No address on file</p>}
              </div>
              <div className="grid grid-cols-2 border-t border-gray-100">
                <div className="border-r border-gray-100 px-4 py-3">
                  <p className="m-0 text-[10px] uppercase tracking-wider text-gray-500">Payment</p>
                  <p className="mb-0 mt-1 text-[13px] font-medium text-gray-900">
                    {order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod || '—'}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="m-0 text-[10px] uppercase tracking-wider text-gray-500">Status</p>
                  <div className="mt-1">
                    <StatusPill
                      variant="payment"
                      status={order.paymentStatus?.toLowerCase()}
                      label={order.paymentStatus}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <Section>
              <div className="flex gap-2 p-3">
                {order.canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(true)}
                    disabled={cancelMutation.isPending}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 py-3.5 text-[13px] font-medium text-red-900 disabled:opacity-60"
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <IconSpinner /> Cancelling…
                      </>
                    ) : (
                      <>
                        <IconCancel /> Cancel order
                      </>
                    )}
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button
                    type="button"
                    onClick={() => downloadInvoice(order)}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-3.5 text-[13px] font-medium text-gray-900"
                  >
                    <IconDownload /> Invoice
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={isReordering}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-0 bg-emerald-600 py-3.5 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isReordering ? (
                    <>
                      <IconSpinner /> Reordering…
                    </>
                  ) : (
                    <>
                      <IconReorder /> Reorder
                    </>
                  )}
                </button>
              </div>
            </Section>

            {related.length > 0 && (
              <div className="mt-5">
                <ProductCarousel products={related} title="You might also like" showMoreLink="/products" />
              </div>
            )}

          </div>
        </div>
      </div>

      {showReturn && <ReturnModal order={order} onClose={() => setShowReturn(false)} onSubmit={handleReturnSubmit} />}

      <PromptModal
        isOpen={showCancelPrompt}
        onClose={() => setShowCancelPrompt(false)}
        onSubmit={handleCancelReasonSubmit}
        title="Cancel order"
        message="Why are you cancelling this order?"
        placeholder="Enter reason…"
        submitText="Continue"
        cancelText="Go back"
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => { setShowCancelConfirm(false); setCancelReason(''); }}
        onConfirm={handleCancelConfirm}
        title="Confirm cancellation"
        message="This action cannot be undone. Your order will be cancelled."
        confirmText="Yes, cancel order"
        cancelText="No, keep order"
      />
    </>
  );
}

export default function OrderDetailClient({ orderId = null }) {
  // If used from a query-param page, `orderId` is passed by parent.
  // In normal /orders/[id] route, it is null and we read `useParams()`.
  return (
    <Suspense fallback={<LoadingState />}>
      <OrderDetailContent orderId={orderId} />
    </Suspense>
  );
}
