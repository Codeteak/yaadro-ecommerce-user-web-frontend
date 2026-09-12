'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrder } from '../../context/OrderContext';
import { useShopBranding } from '../../context/ShopBrandingContext';
import { useOrderDetail } from '../../hooks/useOrders';
import { clearCheckoutDraft } from '../../utils/checkoutSession';
import { downloadBillHtml, printBillPdf } from '../../utils/orderInvoice';
import BillPreviewSheet from '../../components/BillPreviewSheet';

/* ─────────────────────────────────────────────────────────────
   Tiny inline helpers – no extra deps
───────────────────────────────────────────────────────────── */
const money = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '—';
};

const safe = (v) => (v === null || v === undefined ? '' : String(v));

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function ConfettiDots() {
  const dots = [
    { color: '#a7f3d0', size: 7, left: '8%', delay: '0s', dur: '3.2s' },
    { color: '#34d399', size: 5, left: '22%', delay: '0.4s', dur: '2.8s' },
    { color: '#d1fae5', size: 9, left: '38%', delay: '0.1s', dur: '3.8s' },
    { color: '#6ee7b7', size: 5, left: '54%', delay: '0.7s', dur: '2.5s' },
    { color: '#a7f3d0', size: 6, left: '66%', delay: '0.2s', dur: '3.5s' },
    { color: '#10b981', size: 8, left: '78%', delay: '0.5s', dur: '2.9s' },
    { color: '#ecfdf5', size: 5, left: '88%', delay: '0.9s', dur: '3.1s' },
    { color: '#902bf5', size: 7, left: '95%', delay: '0.3s', dur: '4.0s' },
  ];

  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-20px',
            left: d.left,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: d.color,
            opacity: 0.75,
            animation: `osConfettiFall ${d.dur} linear ${d.delay} infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

function CheckIcon({ rejected }) {
  if (rejected) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M8 8l12 12M20 8L8 20" stroke="#fef3c7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M7 14.5L11.5 19L21 9.5" stroke="#ecfdf5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrderCard({ order, orderId, paymentStatus, isLoading, isError }) {
  const items   = order?.items || [];
  const addr    = order?.deliveryAddress || order?.address || {};
  const rawMethod = order?.paymentMethod || paymentStatus;
  const method =
    rawMethod === 'cod' || paymentStatus === 'cod'
      ? 'Cash on delivery'
      : rawMethod && rawMethod !== 'success'
        ? rawMethod
        : '—';
  const slot    = order?.deliverySlot || '—';
  const area    = addr.area || addr.city || addr.line1 || 'Your address';

  if (isLoading && !order) {
    return (
      <div style={styles.orderCard}>
        <div style={{ padding: '16px 14px', fontSize: 13, color: '#6b7280' }}>Loading order details…</div>
      </div>
    );
  }

  if (isError && !order) {
    return (
      <div style={styles.orderCard}>
        <div style={{ padding: '16px 14px', fontSize: 13, color: '#6b7280' }}>
          Could not load this order. Open order details to try again.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.orderCard}>
      {/* Header */}
      <div style={styles.orderCardHeader}>
        <div>
          <div style={styles.orderIdLabel}>Order ID</div>
          <div style={styles.orderId}>{safe(order?.orderNumber || orderId)}</div>
        </div>
        <div
          style={{
            ...styles.statusPill,
            background:
              paymentStatus === 'cancelled' || paymentStatus === 'failed' ? '#fef3c7' : '#d1fae5',
            color: paymentStatus === 'cancelled' || paymentStatus === 'failed' ? '#92400e' : '#065f46',
          }}
        >
          <span
            style={{
              ...styles.statusDot,
              background:
                paymentStatus === 'cancelled' || paymentStatus === 'failed' ? '#f59e0b' : '#902bf5',
            }}
          />
          {paymentStatus === 'cancelled' || paymentStatus === 'failed' ? 'Attention' : 'Confirmed'}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div style={styles.itemsList}>
          {items.slice(0, 3).map((item, idx) => {
            const name  = safe(item.productName || item.name || item.product?.name || 'Item');
            const qty   = item.quantity ?? 1;
            const unit  = Number(item.unitPrice ?? item.price ?? 0) || 0;
            const list  = Number(item.listPrice ?? item.originalPrice ?? 0) || 0;
            const total = item.totalPrice != null ? Number(item.totalPrice) : unit * qty;
            const listLine = list > unit + 1e-9 ? list * qty : null;
            const imgSrc =
              item?.product?.images?.[0] ||
              (typeof item?.image === 'string' ? item.image : item?.image?.url) ||
              '';
            return (
              <div key={idx} style={styles.itemRow}>
                <div style={styles.itemThumb}>
                  {imgSrc
                    ? <img src={imgSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', borderRadius: 8 }} />
                    : <span style={{ fontSize: 18 }}>📦</span>
                  }
                </div>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{name}</div>
                  <div style={styles.itemQty}>Qty {qty}</div>
                </div>
                <div style={{ ...styles.itemPrice, textAlign: 'right' }}>
                  {listLine != null && (
                    <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>
                      {money(listLine)}
                    </div>
                  )}
                  <div>{money(total)}</div>
                </div>
              </div>
            );
          })}
          {items.length > 3 && (
            <div style={styles.moreItems}>+{items.length - 3} more items</div>
          )}
        </div>
      ) : (
        <div style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>No item details available</div>
      )}

      {/* Divider */}
      <div style={styles.divider} />

      {/* Totals */}
      <div style={styles.totalsBlock}>
        {order?.subtotal != null && (
          <div style={styles.totalLine}>
            <span>Subtotal</span><span>{money(order.subtotal)}</span>
          </div>
        )}
        {order?.shipping != null && (
          <div style={styles.totalLine}>
            <span>Delivery</span><span>{money(order.shipping)}</span>
          </div>
        )}
        {order?.tax != null && (
          <div style={styles.totalLine}>
            <span>Tax</span><span>{money(order.tax)}</span>
          </div>
        )}
        {order?.discount != null && Number(order.discount) > 0 && (
          <div style={{ ...styles.totalLine, color: '#7d24d6' }}>
            <span>{order.couponCode ? `Coupon (${order.couponCode})` : 'Discount'}</span>
            <span>−{money(order.discount)}</span>
          </div>
        )}
        {order?.total != null && (
          <div style={styles.totalLineGrand}>
            <span>Total paid</span><span>{money(order.total)}</span>
          </div>
        )}
      </div>

      {/* Meta pills */}
      <div style={styles.metaRow}>
        {[
          { k: 'Payment', v: safe(method) || '—' },
          { k: 'Delivery', v: safe(slot) },
          { k: 'Address',  v: safe(area) },
        ].map(({ k, v }) => (
          <div key={k} style={styles.metaPill}>
            <div style={styles.metaKey}>{k}</div>
            <div style={styles.metaVal}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main content
───────────────────────────────────────────────────────────── */
function OrderSuccessContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { getOrderById } = useOrder();
  const { shopName, shopImage } = useShopBranding();

  useEffect(() => {
    clearCheckoutDraft();
  }, []);

  const rawOrderId    = searchParams?.get('orderId') || '';
  const orderId       = rawOrderId && rawOrderId !== 'ORD-PENDING' ? rawOrderId : '';
  const paymentStatus = searchParams?.get('payment');
  const { data: apiOrder, isLoading: orderLoading, isError: orderError } = useOrderDetail(orderId);
  const order         = apiOrder || getOrderById(orderId);

  const [countdown, setCountdown] = useState(10);
  const [billOpen, setBillOpen] = useState(false);
  const [openBillWhenReady, setOpenBillWhenReady] = useState(false);

  const isRejected = paymentStatus === 'cancelled' || paymentStatus === 'failed';
  const isSuccess  = !isRejected;

  const invoiceOpts = useMemo(
    () => ({
      order,
      orderId: orderId || rawOrderId,
      paymentStatus,
      shopName: shopName || 'Yaadro',
      shopImage: shopImage || null,
    }),
    [order, orderId, rawOrderId, paymentStatus, shopName, shopImage]
  );

  /* Auto-redirect */
  useEffect(() => {
    if (!isSuccess || !orderId) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); router.push(`/order?id=${encodeURIComponent(orderId)}`); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, orderId, router]);

  useEffect(() => {
    if (!openBillWhenReady) return;
    if (orderLoading) return;
    if (!order) {
      setOpenBillWhenReady(false);
      return;
    }
    setBillOpen(true);
    setOpenBillWhenReady(false);
  }, [openBillWhenReady, orderLoading, order]);

  /* Headline copy */
  const copy = useMemo(() => {
    if (paymentStatus === 'cod')       return { title: 'Order placed!',       sub: 'Keep cash ready for delivery.' };
    if (paymentStatus === 'success')   return { title: 'Payment confirmed!',   sub: 'Your order is on its way.' };
    if (paymentStatus === 'cancelled') return { title: 'Payment cancelled',    sub: 'Your order is saved — retry from order details.' };
    if (paymentStatus === 'failed')    return { title: 'Payment failed',       sub: 'Your order is saved — retry from order details.' };
    return { title: 'Order confirmed!', sub: "You'll get a confirmation email shortly." };
  }, [paymentStatus]);

  const handleOpenInvoice = () => {
    if (order) {
      setBillOpen(true);
      return;
    }
    if (orderLoading) {
      setOpenBillWhenReady(true);
      return;
    }
    setOpenBillWhenReady(true);
  };

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes osConfettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 0.8; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0;   }
        }
        @keyframes osPulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0;   }
        }
        @keyframes osBlink {
          0%, 100% { opacity: 1;   }
          50%       { opacity: 0.3; }
        }
        @keyframes osSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div style={styles.page}>
        <ConfettiDots />

        {/* Full-screen page */}
        <div style={styles.sheet}>
          {/* Top actions */}
          <div style={styles.topBar}>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={styles.topBarBtn}
              aria-label="Back to home"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div style={styles.topBarTitle}>Order status</div>
            <div style={{ width: 38 }} />
          </div>

          {/* Icon */}
          <div
            style={{
              ...styles.iconRing,
              background: isRejected ? '#fef3c7' : '#d1fae5',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${isRejected ? '#f59e0b' : '#902bf5'}`,
                animation: 'osPulse 2s ease-out infinite',
                opacity: 0,
              }}
            />
            <div style={{ ...styles.iconInner, background: isRejected ? '#f59e0b' : '#902bf5' }}>
              <CheckIcon rejected={isRejected} />
            </div>
          </div>

          {/* Title */}
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>{copy.title}</h1>
            <p style={styles.subtitle}>{copy.sub}</p>
          </div>

          {/* Order card */}
          <OrderCard
            order={order}
            orderId={orderId || rawOrderId}
            paymentStatus={paymentStatus}
            isLoading={orderLoading}
            isError={orderError}
          />

          {/* Actions */}
          <div style={styles.actions}>
            <Link href={orderId ? `/order?id=${encodeURIComponent(orderId)}` : '/orders'} style={styles.btnPrimary}>
              <ArrowIcon />
              {isRejected ? 'View order & retry payment' : 'Track my order'}
            </Link>

            <button type="button" onClick={handleOpenInvoice} style={styles.btnSecondary}>
              <DownloadIcon />
              {openBillWhenReady && orderLoading ? 'Loading invoice…' : 'Download invoice'}
            </button>

            <Link href="/" style={styles.btnGhost}>
              Continue shopping
            </Link>
          </div>

          {/* Countdown */}
          {isSuccess && countdown > 0 && orderId && (
            <p style={styles.countdown}>
              Opening order details in&nbsp;
              <span style={styles.countdownBadge}>{countdown}</span>s
            </p>
          )}
        </div>
      </div>

      <BillPreviewSheet
        isOpen={billOpen}
        onClose={() => setBillOpen(false)}
        orderId={orderId || rawOrderId}
        paymentStatus={paymentStatus}
        order={order}
        shopName={shopName || 'Yaadro'}
        shopImage={shopImage || null}
        onDownloadPdf={() => printBillPdf(invoiceOpts)}
        onDownloadHtml={() => downloadBillHtml(invoiceOpts)}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tiny icon components
───────────────────────────────────────────────────────────── */
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="#ecfdf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 2v8M5 7l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Inline styles object (keeps JSX clean)
───────────────────────────────────────────────────────────── */
const styles = {
  /* Layout — white + violet brand, aligned with checkout */
  page: {
    minHeight: '100svh',
    width: '100%',
    background: 'linear-gradient(180deg, #ecfdf5 0%, #f9fafb 50%, #ffffff 100%)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: '100%',
    background: '#ffffff',
    borderRadius: 0,
    border: 'none',
    paddingBottom: 40,
    boxShadow: 'none',
    animation: 'osSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
    position: 'relative',
    zIndex: 2,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid #f3f4f6',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(10px)',
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
    cursor: 'pointer',
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.01em',
  },

  /* Icon */
  iconRing: {
    width: 80, height: 80,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '8px auto 0',
    position: 'relative',
  },
  iconInner: {
    width: 60, height: 60,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  /* Title */
  titleBlock: { textAlign: 'center', padding: '14px 24px 0' },
  title: { fontSize: 20, fontWeight: 600, color: '#111827', letterSpacing: '-0.02em', margin: 0 },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 1.5 },

  /* Order card */
  orderCard: {
    margin: '14px 14px 0',
    border: '0.5px solid #e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  orderCardHeader: {
    background: '#f9fafb',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '0.5px solid #e5e7eb',
  },
  orderIdLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 },
  orderId: { fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'ui-monospace, monospace' },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600,
    padding: '3px 10px', borderRadius: 99,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: '50%',
    animation: 'osBlink 1.4s ease-in-out infinite',
    display: 'inline-block',
  },

  /* Items */
  itemsList: { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 10 },
  itemThumb: {
    width: 36, height: 36, borderRadius: 8,
    background: '#f9fafb', border: '0.5px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
  itemInfo:  { flex: 1, minWidth: 0 },
  itemName:  { fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemQty:   { fontSize: 11, color: '#9ca3af' },
  itemPrice: { fontSize: 13, fontWeight: 600, color: '#111827' },
  moreItems: { fontSize: 12, color: '#9ca3af', paddingTop: 2 },

  /* Totals */
  divider: { height: '0.5px', background: '#f1f5f9', margin: '0 14px' },
  totalsBlock: { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  totalLine: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' },
  totalLineGrand: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 14, fontWeight: 600, color: '#111827',
    borderTop: '0.5px solid #f1f5f9', marginTop: 4, paddingTop: 8,
  },

  /* Meta row */
  metaRow:  { display: 'flex', gap: 8, padding: '10px 14px 2px' },
  metaPill: {
    flex: 1,
    background: '#f9fafb', border: '0.5px solid #e5e7eb',
    borderRadius: 10, padding: '8px 10px',
  },
  metaKey: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' },
  metaVal: { fontSize: 12, fontWeight: 600, color: '#111827', marginTop: 2 },

  /* Actions */
  actions: { padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 },
  btnPrimary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '14px 16px',
    borderRadius: 14, background: '#902bf5',
    color: '#ffffff', fontSize: 14, fontWeight: 600,
    border: 'none', cursor: 'pointer', textDecoration: 'none',
    textAlign: 'center',
  },
  btnSecondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '13px 16px',
    borderRadius: 14, background: '#ffffff',
    color: '#374151', fontSize: 14, fontWeight: 500,
    border: '0.5px solid #d1d5db', cursor: 'pointer',
  },
  btnGhost: {
    display: 'block', width: '100%', padding: '12px 16px',
    borderRadius: 14, background: 'transparent',
    color: '#9ca3af', fontSize: 13, fontWeight: 500,
    border: 'none', cursor: 'pointer', textDecoration: 'none',
    textAlign: 'center',
  },

  /* Countdown */
  countdown: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 10, padding: '0 16px' },
  countdownBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 20, height: 20, borderRadius: '50%',
    background: '#f3f4f6', fontWeight: 600, fontSize: 11, color: '#374151',
    margin: '0 2px',
  },
};

/* ─────────────────────────────────────────────────────────────
   Suspense wrapper (required for useSearchParams)
───────────────────────────────────────────────────────────── */
function SuspenseFallback() {
  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #ecfdf5 0%, #f9fafb 100%)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#d1fae5',
            border: '2px solid #902bf5',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <path d="M7 14.5L11.5 19L21 9.5" stroke="#902bf5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Preparing your order details…</p>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <OrderSuccessContent />
    </Suspense>
  );
}