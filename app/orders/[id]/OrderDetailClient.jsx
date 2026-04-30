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
function IconCheck({ color = '#639922' }) {
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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8a6 6 0 016-6 6 6 0 015.74 4.26M14 4v4h-4" stroke="#C0DD97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  return {
    day:  dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

const STATUS_STYLES = {
  confirmed:  { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  processing: { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  shipped:    { bg: '#E6F1FB', color: '#0C447C', dot: '#378ADD' },
  delivered:  { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  cancelled:  { bg: '#FCEBEB', color: '#791F1F', dot: '#E24B4A' },
  pending:    { bg: '#FAEEDA', color: '#633806', dot: '#EF9F27' },
};

const PAYMENT_STYLES = {
  paid:     { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  success:  { bg: '#EAF3DE', color: '#27500A', dot: '#639922' },
  pending:  { bg: '#FAEEDA', color: '#633806', dot: '#EF9F27' },
  failed:   { bg: '#FCEBEB', color: '#791F1F', dot: '#E24B4A' },
  refunded: { bg: '#F1EFE8', color: '#444441', dot: '#888780' },
};

function StatusPill({ label, styleMap, status }) {
  const s = styleMap[status?.toLowerCase()] || styleMap.pending || { bg: '#F1EFE8', color: '#444441', dot: '#888780' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {label || status}
    </span>
  );
}

function Section({ children, style }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      borderRadius: 16,
      border: '0.5px solid var(--color-border-tertiary)',
      overflow: 'hidden',
      marginTop: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      {right && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{right}</span>}
    </div>
  );
}

function Timeline({ order }) {
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const steps = STATUS_ORDER.slice(0, Math.max(currentIdx + 1, 2));

  return (
    <div style={{ padding: 16 }}>
      {steps.map((status, i) => {
        const isDone   = i < steps.length - 1;
        const isActive = i === steps.length - 1;
        const isLast   = i === steps.length - 1;
        const dateRef  = status === 'delivered' ? order.deliveredAt : status === 'pending' ? order.createdAt : order.updatedAt;
        const d = fmtDate(dateRef);

        return (
          <div key={status} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
                background: isDone ? '#EAF3DE' : isActive ? '#27500A' : 'var(--color-background-secondary)',
                border: `1.5px solid ${isDone ? '#639922' : isActive ? '#27500A' : 'var(--color-border-secondary)'}`,
              }}>
                {isDone && <IconCheck />}
                {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0DD97', display: 'block' }} />}
              </div>
              {!isLast && (
                <div style={{ width: 1.5, flex: 1, background: isDone ? '#97C459' : 'var(--color-border-tertiary)', margin: '2px 0' }} />
              )}
            </div>

            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--color-text-primary)' : isDone ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                {TIMELINE_LABELS[status]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {d ? `${d.day} · ${d.time}` : isActive && status === 'shipped' ? 'Out for delivery' : 'Pending'}
              </div>
            </div>
          </div>
        );
      })}

      {currentIdx < STATUS_ORDER.length - 1 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--color-background-secondary)',
              border: '1.5px solid var(--color-border-secondary)',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {TIMELINE_LABELS[STATUS_ORDER[currentIdx + 1]]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {STATUS_ORDER[currentIdx + 1] === 'delivered' ? 'Expected today, 6–8 PM' : 'Upcoming'}
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
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '2px solid #EAF3DE', borderTop: '2px solid #27500A',
        animation: 'odSpin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading order…</p>
    </div>
  );
}

function ErrorState({ message, ordersHref = '/orders' }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FCEBEB', border: '1.5px solid #F7C1C1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 6v5M10 14h.01M18 10A8 8 0 112 10a8 8 0 0116 0z" stroke="#A32D2D" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Order not found</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{message || "This order doesn't exist or was removed."}</p>
      </div>
      <Link href={ordersHref} style={{ padding: '10px 20px', borderRadius: 12, background: '#27500A', color: '#C0DD97', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-background-primary)', borderRadius: '20px 20px 0 0', border: '0.5px solid var(--color-border-tertiary)', padding: '20px 16px 32px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Request return / refund</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>Select items to return</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {order.items.map((item) => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: `0.5px solid ${selected.includes(item.id) ? '#639922' : 'var(--color-border-tertiary)'}`, background: selected.includes(item.id) ? '#EAF3DE' : 'var(--color-background-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} style={{ accentColor: '#27500A' }} />
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{item.productName || item.name}</span>
            </label>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Reason for return</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe your reason…"
          rows={3}
          style={{ width: '100%', borderRadius: 10, border: '0.5px solid var(--color-border-secondary)', padding: '10px 12px', fontSize: 13, resize: 'vertical', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onSubmit(selected, reason)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#27500A', color: '#C0DD97', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailContent() {
  const params   = useParams();
  const router   = useRouter();
  const { data: order, isLoading, error } = useOrderDetail(params.id);
  const cancelMutation  = useCancelOrder();
  const retryMutation   = useRetryPayment();
  const verifyMutation  = useVerifyPayment();
  const { addToCart }   = useCart();
  const { user }        = useAuth();
  const { showAlert }   = useAlert();

  const [isRetrying, setIsRetrying]     = useState(false);
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

  const handleReorder = () => {
    (order.items || []).forEach((item) => {
      addToCart({
        id:    item.productId,
        name:  item.productName,
        price: item.unitPrice,
        image: item.product?.images?.[0] || item.image || '/images/dummy.png',
      }, item.quantity || 1);
    });
    router.push('/cart');
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
      theme: { color: '#27500A' },
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

      <div style={{ background: 'var(--color-background-tertiary)', minHeight: '100svh', paddingBottom: 40 }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => router.push('/orders')} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <IconBack />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>Order details</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, fontFamily: 'var(--font-mono)' }}>{order.orderNumber || order.id}</p>
            </div>
            <StatusPill label={order.status} styleMap={STATUS_STYLES} status={order.status} />
          </div>

          <div style={{ padding: '0 12px' }}>
            {canRetryPayment && (
              <div style={{ marginTop: 12, borderRadius: 16, border: `0.5px solid ${order.paymentStatus === 'failed' ? '#F7C1C1' : '#FAC775'}`, background: order.paymentStatus === 'failed' ? '#FCEBEB' : '#FAEEDA', padding: '12px 14px', display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: order.paymentStatus === 'failed' ? '#F7C1C1' : '#FAC775', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 5v4M8 11h.01M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke={order.paymentStatus === 'failed' ? '#A32D2D' : '#633806'} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: order.paymentStatus === 'failed' ? '#791F1F' : '#633806', margin: 0 }}>
                    Payment {order.paymentStatus === 'failed' ? 'failed' : 'pending'}
                  </p>
                  <p style={{ fontSize: 12, color: order.paymentStatus === 'failed' ? '#A32D2D' : '#854F0B', marginTop: 2, lineHeight: 1.5 }}>
                    {order.paymentStatus === 'failed' ? 'Your payment could not be processed.' : 'Complete payment to confirm your order.'}
                  </p>
                  <button
                    onClick={handleRetryPayment}
                    disabled={isRetrying || retryMutation.isPending}
                    style={{ marginTop: 8, padding: '7px 14px', borderRadius: 8, background: order.paymentStatus === 'failed' ? '#E24B4A' : '#EF9F27', color: order.paymentStatus === 'failed' ? '#FCEBEB' : '#412402', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: (isRetrying || retryMutation.isPending) ? 0.6 : 1 }}
                  >
                    {isRetrying || retryMutation.isPending ? <><IconSpinner /> Processing…</> : <><IconRetry color={order.paymentStatus === 'failed' ? '#FCEBEB' : '#412402'} /> Retry payment</>}
                  </button>
                </div>
              </div>
            )}

            <Section style={{ marginTop: 12 }}>
              <SectionHeader
                title="Order status"
                right={fmtDate(order.createdAt)?.day}
              />
              <Timeline order={order} />
              {order.status === 'delivered' && (
                <div style={{ padding: '0 16px 14px' }}>
                  <button onClick={() => setShowReturn(true)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '0.5px solid #F5C4B3', background: '#FAECE7', color: '#712B13', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Request return / refund
                  </button>
                </div>
              )}
            </Section>

            <Section>
              <SectionHeader title={`Items · ${order.items.length}`} right={fmt(order.subtotal)} />
              {order.items.map((item, idx) => (
                <div key={item.id || idx} style={{
                  padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center',
                  borderTop: idx > 0 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                    <Image
                      src={item.product?.images?.[0] || item.image || '/images/dummy.png'}
                      alt={item.productName || item.name || 'Item'}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.productName || item.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Qty {item.quantity}{item.productSku ? ` · SKU: ${item.productSku}` : ''}
                    </p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', marginLeft: 'auto', flexShrink: 0 }}>
                    {fmt(item.totalPrice)}
                  </p>
                </div>
              ))}
            </Section>

            <Section>
              <SectionHeader title="Price summary" />
              {[
                { label: 'Subtotal', value: fmt(order.subtotal) },
                order.tax    > 0 ? { label: 'Tax',      value: fmt(order.tax) }      : null,
                order.shipping   ? { label: 'Delivery', value: fmt(order.shipping) } : null,
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <span>{label}</span><span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
                </div>
              ))}
              {order.discount > 0 && (
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Discount</span>
                  <span style={{ color: '#27500A', fontWeight: 500 }}>−{fmt(order.discount)}</span>
                </div>
              )}
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <span>Total paid</span><span>{fmt(order.total)}</span>
              </div>
            </Section>

            <Section>
              <SectionHeader title="Delivery & payment" />
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.7 }}>
                {(addr.fullName || addr.name) && <p style={{ fontWeight: 500, margin: 0 }}>{addr.fullName || addr.name}{addr.phone ? ` · ${addr.phone}` : ''}</p>}
                {(addr.street || addr.address) && <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{addr.street || addr.address}</p>}
                {(addr.city || addr.state) && <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>}
                {(addr.zipCode || addr.postalCode || addr.country) && <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{[addr.zipCode || addr.postalCode, addr.country].filter(Boolean).join(', ')}</p>}
                {addr.landmark && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Near {addr.landmark}</p>}
                {!Object.keys(addr).length && <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No address on file</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ padding: '12px 16px', borderRight: '0.5px solid var(--color-border-tertiary)' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Payment</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginTop: 3 }}>
                    {order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod || '—'}
                  </p>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Status</p>
                  <div style={{ marginTop: 4 }}>
                    <StatusPill styleMap={PAYMENT_STYLES} status={order.paymentStatus?.toLowerCase()} label={order.paymentStatus} />
                  </div>
                </div>
              </div>
            </Section>

            <Section>
              <div style={{ padding: 12, display: 'flex', gap: 8 }}>
                {order.canCancel && (
                  <button
                    onClick={() => setShowCancelPrompt(true)}
                    disabled={cancelMutation.isPending}
                    style={{ flex: 1, padding: 13, borderRadius: 12, background: '#FCEBEB', color: '#791F1F', fontSize: 13, fontWeight: 500, border: '0.5px solid #F7C1C1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: cancelMutation.isPending ? 0.6 : 1 }}
                  >
                    {cancelMutation.isPending ? <><IconSpinner /> Cancelling…</> : <><IconCancel /> Cancel order</>}
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button
                    onClick={() => downloadInvoice(order)}
                    style={{ flex: 1, padding: 13, borderRadius: 12, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500, border: '0.5px solid var(--color-border-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <IconDownload /> Invoice
                  </button>
                )}
                <button
                  onClick={handleReorder}
                  style={{ flex: 1, padding: 13, borderRadius: 12, background: '#27500A', color: '#C0DD97', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <IconReorder /> Reorder
                </button>
              </div>
            </Section>

            {related.length > 0 && (
              <div style={{ marginTop: 20 }}>
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

export default function OrderDetailClient() {
  return (
    <Suspense fallback={<LoadingState />}>
      <OrderDetailContent />
    </Suspense>
  );
}
