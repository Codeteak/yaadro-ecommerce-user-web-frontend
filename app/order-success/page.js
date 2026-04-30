'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrder } from '../../context/OrderContext';

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
    { color: '#C0DD97', size: 7,  left: '8%',  delay: '0s',    dur: '3.2s' },
    { color: '#97C459', size: 5,  left: '22%', delay: '0.4s',  dur: '2.8s' },
    { color: '#EAF3DE', size: 9,  left: '38%', delay: '0.1s',  dur: '3.8s' },
    { color: '#FAC775', size: 5,  left: '54%', delay: '0.7s',  dur: '2.5s' },
    { color: '#C0DD97', size: 6,  left: '66%', delay: '0.2s',  dur: '3.5s' },
    { color: '#97C459', size: 8,  left: '78%', delay: '0.5s',  dur: '2.9s' },
    { color: '#EAF3DE', size: 5,  left: '88%', delay: '0.9s',  dur: '3.1s' },
    { color: '#FAC775', size: 7,  left: '95%', delay: '0.3s',  dur: '4.0s' },
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
        <path d="M8 8l12 12M20 8L8 20" stroke="#FAC775" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M7 14.5L11.5 19L21 9.5" stroke="#EAF3DE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function OrderCard({ order, orderId, paymentStatus }) {
  const items   = order?.items || [];
  const addr    = order?.deliveryAddress || order?.address || {};
  const method  = order?.paymentMethod || 'UPI';
  const slot    = order?.deliverySlot || 'Today, 6–8 PM';
  const area    = addr.area || addr.city || 'Your address';

  return (
    <div style={styles.orderCard}>
      {/* Header */}
      <div style={styles.orderCardHeader}>
        <div>
          <div style={styles.orderIdLabel}>Order ID</div>
          <div style={styles.orderId}>{safe(order?.orderNumber || orderId)}</div>
        </div>
        <div style={{
          ...styles.statusPill,
          background: paymentStatus === 'cancelled' || paymentStatus === 'failed'
            ? '#FAEEDA' : '#EAF3DE',
          color: paymentStatus === 'cancelled' || paymentStatus === 'failed'
            ? '#854F0B' : '#3B6D11',
        }}>
          <span style={{
            ...styles.statusDot,
            background: paymentStatus === 'cancelled' || paymentStatus === 'failed'
              ? '#EF9F27' : '#639922',
          }} />
          {paymentStatus === 'cancelled' || paymentStatus === 'failed'
            ? 'Attention' : 'Confirmed'}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div style={styles.itemsList}>
          {items.slice(0, 3).map((item, idx) => {
            const name  = safe(item.productName || item.name || item.product?.name || 'Item');
            const qty   = item.quantity ?? 1;
            const unit  = item.unitPrice ?? item.price ?? 0;
            const total = item.totalPrice ?? (Number(unit) * qty);
            return (
              <div key={idx} style={styles.itemRow}>
                <div style={styles.itemThumb}>
                  {item.image
                    ? <img src={item.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    : <span style={{ fontSize: 18 }}>📦</span>
                  }
                </div>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{name}</div>
                  <div style={styles.itemQty}>Qty {qty}</div>
                </div>
                <div style={styles.itemPrice}>{money(total)}</div>
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
          <div style={{ ...styles.totalLine, color: '#3B6D11' }}>
            <span>Discount</span><span>−{money(order.discount)}</span>
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
   Invoice HTML builder (unchanged logic, same as original)
───────────────────────────────────────────────────────────── */
function buildBillHtml({ order, orderId, paymentStatus }) {
  const items     = order?.items || [];
  const addr      = order?.deliveryAddress || order?.address || {};
  const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '';
  const orderNumber = order?.orderNumber || '';
  const payment   = paymentStatus || order?.paymentStatus || 'success';
  const method    = order?.paymentMethod || '';

  const rows = items.map((it) => {
    const name  = safe(it.productName || it.name || it.product?.name || 'Item');
    const qty   = it.quantity ?? 1;
    const unit  = it.unitPrice ?? it.price ?? '';
    const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
    return `<tr>
      <td>${name}</td>
      <td class="right">${qty}</td>
      <td class="right">${money(unit)}</td>
      <td class="right">${money(total)}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Invoice ${safe(orderNumber || orderId)}</title>
    <style>
      body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;color:#111;background:#f5f7f7}
      .page{max-width:820px;margin:24px auto;padding:16px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
      .top{background:linear-gradient(90deg,#059669,#047857);color:#fff;padding:18px}
      .brand{display:flex;justify-content:space-between;align-items:flex-start}
      .brand h1{margin:0;font-size:22px}
      .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:16px}
      .pill{border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;padding:12px}
      .pill .k{font-size:11px;color:#6b7280}
      .pill .v{font-weight:700;margin-top:4px}
      .section{padding:0 16px 16px}
      .section h3{margin:0 0 8px;font-size:13px}
      .address{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}
      th{background:#f9fafb;color:#374151;font-size:12px}
      .right{text-align:right}
      .totals{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      .row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px;color:#374151}
      .grand{border-top:1px solid #e5e7eb;margin-top:10px;padding-top:10px;font-size:15px}
      .foot{padding:14px 16px;color:#6b7280;font-size:11px;border-top:1px solid #eef2f7}
      @media print{body{background:#fff}.page{margin:0}.card{box-shadow:none}}
    </style>
  </head>
  <body>
    <div class="page"><div class="card">
      <div class="top">
        <div class="brand">
          <div><h1>Yaadro</h1><small>Professional Supermarket</small></div>
          <div style="text-align:right"><small>INVOICE</small>
            <div style="font-weight:800;font-size:14px;margin-top:2px">${safe(orderNumber || orderId)}</div>
          </div>
        </div>
      </div>
      <div class="meta">
        <div class="pill"><div class="k">Order ID</div><div class="v">${safe(orderId)}</div></div>
        <div class="pill"><div class="k">Date</div><div class="v">${safe(createdAt) || '—'}</div></div>
        <div class="pill"><div class="k">Payment</div><div class="v">${safe(payment)}</div></div>
        <div class="pill"><div class="k">Method</div><div class="v">${safe(method) || '—'}</div></div>
      </div>
      <div class="section">
        <h3>Delivery Address</h3>
        <div class="address">
          <div style="font-weight:700">${safe(addr.fullName || addr.name || '')}${addr.phone ? ' • ' + safe(addr.phone) : ''}</div>
          <div style="margin-top:4px;color:#374151">
            ${[addr.street || addr.address, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country].filter(Boolean).map(safe).join(', ')}
          </div>
        </div>
      </div>
      <div class="section">
        <h3>Items</h3>
        <table>
          <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="totals">
          ${order?.subtotal != null ? `<div class="row"><span>Subtotal</span><b>${money(order.subtotal)}</b></div>` : ''}
          ${order?.shipping != null ? `<div class="row"><span>Delivery</span><b>${money(order.shipping)}</b></div>` : ''}
          ${order?.tax != null ? `<div class="row"><span>Tax</span><b>${money(order.tax)}</b></div>` : ''}
          ${order?.discount != null && Number(order.discount) > 0 ? `<div class="row"><span>Discount</span><b style="color:#047857">−${money(order.discount)}</b></div>` : ''}
          <div class="row grand"><span><b>Total</b></span><b>${order?.total != null ? money(order.total) : '—'}</b></div>
        </div>
      </div>
      <div class="foot">This is a computer-generated invoice.</div>
    </div></div>
  </body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   Main content
───────────────────────────────────────────────────────────── */
function OrderSuccessContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { getOrderById } = useOrder();

  const orderId       = searchParams?.get('orderId') || 'ORD-PENDING';
  const paymentStatus = searchParams?.get('payment');
  const order         = getOrderById(orderId);

  const [countdown, setCountdown] = useState(10);

  const isRejected = paymentStatus === 'cancelled' || paymentStatus === 'failed';
  const isSuccess  = !isRejected;

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

  /* Headline copy */
  const copy = useMemo(() => {
    if (paymentStatus === 'cod')       return { title: 'Order placed!',       sub: 'Keep cash ready for delivery.' };
    if (paymentStatus === 'success')   return { title: 'Payment confirmed!',   sub: 'Your order is on its way.' };
    if (paymentStatus === 'cancelled') return { title: 'Payment cancelled',    sub: 'Your order is saved — retry from order details.' };
    if (paymentStatus === 'failed')    return { title: 'Payment failed',       sub: 'Your order is saved — retry from order details.' };
    return { title: 'Order confirmed!', sub: "You'll get a confirmation email shortly." };
  }, [paymentStatus]);

  /* Invoice actions */
  const handleDownloadPdf = () => {
    try {
      const html = buildBillHtml({ order, orderId, paymentStatus });
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return;
      w.document.open(); w.document.write(html); w.document.close();
      w.focus(); setTimeout(() => w.print(), 400);
    } catch (e) { console.error(e); }
  };

  const handleDownloadHtml = () => {
    try {
      const html = buildBillHtml({ order, orderId, paymentStatus });
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `bill-${order?.orderNumber || orderId}.html` });
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
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

        {/* Bottom sheet */}
        <div style={styles.sheet}>

          {/* Drag handle */}
          <div style={styles.handleWrap}>
            <div style={styles.handle} />
          </div>

          {/* Icon */}
          <div style={{
            ...styles.iconRing,
            background: isRejected ? '#FAEEDA' : '#EAF3DE',
          }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${isRejected ? '#EF9F27' : '#639922'}`, animation: 'osPulse 2s ease-out infinite', opacity: 0 }} />
            <div style={{ ...styles.iconInner, background: isRejected ? '#EF9F27' : '#27500A' }}>
              <CheckIcon rejected={isRejected} />
            </div>
          </div>

          {/* Title */}
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>{copy.title}</h1>
            <p style={styles.subtitle}>{copy.sub}</p>
          </div>

          {/* Order card */}
          <OrderCard order={order} orderId={orderId} paymentStatus={paymentStatus} />

          {/* Actions */}
          <div style={styles.actions}>
            <Link href={`/order?id=${encodeURIComponent(orderId)}`} style={styles.btnPrimary}>
              <ArrowIcon />
              {isRejected ? 'View order & retry payment' : 'Track my order'}
            </Link>

            <button type="button" onClick={handleDownloadPdf} style={styles.btnSecondary}>
              <DownloadIcon />
              Download invoice
            </button>

            <button type="button" onClick={handleDownloadHtml} style={{ ...styles.btnSecondary, fontSize: 12, paddingTop: 10, paddingBottom: 10 }}>
              Save as HTML
            </button>

            <Link href="/" style={styles.btnGhost}>
              Continue shopping
            </Link>
          </div>

          {/* Countdown */}
          {isSuccess && countdown > 0 && (
            <p style={styles.countdown}>
              Opening order details in&nbsp;
              <span style={styles.countdownBadge}>{countdown}</span>s
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tiny icon components
───────────────────────────────────────────────────────────── */
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="#C0DD97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  /* Layout */
  page: {
    minHeight: '100svh',
    width: '100%',
    background: 'linear-gradient(180deg, #f0f7ea 0%, #ffffff 60%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    background: '#ffffff',
    borderRadius: '24px 24px 0 0',
    border: '0.5px solid #e5e7eb',
    borderBottom: 'none',
    paddingBottom: 40,
    animation: 'osSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
    position: 'relative',
    zIndex: 2,
  },

  /* Handle */
  handleWrap: { display: 'flex', justifyContent: 'center', padding: '12px 0 8px' },
  handle: { width: 40, height: 4, borderRadius: 99, background: '#e5e7eb' },

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
    borderRadius: 14, background: '#27500A',
    color: '#C0DD97', fontSize: 14, fontWeight: 600,
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
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f7ea' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EAF3DE', border: '2px solid #639922', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <path d="M7 14.5L11.5 19L21 9.5" stroke="#639922" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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