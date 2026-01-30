'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '../../context/OrderContext';
import BillPreviewSheet from '../../components/BillPreviewSheet';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getOrderById } = useOrder();
  const orderId = searchParams?.get('orderId') || `ORD-${Date.now()}`;
  const paymentStatus = searchParams?.get('payment');
  const order = getOrderById(orderId);
  const [countdown, setCountdown] = useState(10);
  const [showBillSheet, setShowBillSheet] = useState(false);

  // Determine success message based on payment status
  const getSuccessMessage = () => {
    if (paymentStatus === 'cod') {
      return {
        title: 'Order Placed Successfully!',
        message: 'Your order has been placed. Please keep cash ready for delivery.',
        subMessage: 'You will receive a confirmation email with your order details.',
      };
    } else if (paymentStatus === 'success') {
      return {
        title: 'Payment Successful!',
        message: 'Your order has been placed and payment has been confirmed.',
        subMessage: 'You will receive a confirmation email with your order details.',
      };
    } else if (paymentStatus === 'cancelled') {
      return {
        title: 'Payment Cancelled',
        message: 'Your order is created, but payment was cancelled.',
        subMessage: 'You can retry payment from your order details.',
      };
    } else if (paymentStatus === 'failed') {
      return {
        title: 'Payment Failed',
        message: 'Your order is created, but payment failed.',
        subMessage: 'You can retry payment from your order details.',
      };
    } else {
      return {
        title: 'Thank You!',
        message: 'Your order has been placed successfully.',
        subMessage: 'You will receive a confirmation email with your order details.',
      };
    }
  };

  const successInfo = getSuccessMessage();
  const isSuccess = paymentStatus === 'success' || paymentStatus === 'cod' || !paymentStatus;
  const isRejected = paymentStatus === 'cancelled' || paymentStatus === 'failed';

  const visual = useMemo(() => {
    if (isRejected) {
      return {
        src: '/images/payment-fail.png',
        alt: 'Payment failed',
        isGif: false,
      };
    }
    // Success states: use the requested order-success.gif
    return {
      src: '/gif/order-success.gif',
      alt: 'Order successful',
      isGif: true,
    };
  }, [isRejected]);

  // Auto-redirect to order details after 10 seconds
  useEffect(() => {
    if (isSuccess && orderId) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(`/orders/${orderId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSuccess, orderId, router]);

  const buildBillHtml = () => {
    const safe = (v) => (v === null || v === undefined ? '' : String(v));
    const money = (v) => {
      const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
      return Number.isFinite(n) ? `₹${n.toFixed(2)}` : '';
    };

    const items = order?.items || [];
    const addr = order?.deliveryAddress || order?.address || {};
    const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleString() : '';
    const orderNumber = order?.orderNumber || '';
    const payment = paymentStatus || order?.paymentStatus || 'success';
    const method = order?.paymentMethod || '';

    const rows = items
      .map((it) => {
        const name = safe(it.productName || it.name || it.product?.name || 'Item');
        const qty = it.quantity ?? 1;
        const unit = it.unitPrice ?? it.price ?? '';
        const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
        return `
          <tr>
            <td>${name}</td>
            <td class="right">${qty}</td>
            <td class="right">${money(unit)}</td>
            <td class="right">${money(total)}</td>
          </tr>
        `;
      })
      .join('');

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Invoice ${safe(orderNumber || orderId)}</title>
    <style>
      body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111;background:#f5f7f7}
      .page{max-width:820px;margin:24px auto;padding:16px}
      .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06)}
      .top{background:linear-gradient(90deg,#059669,#047857);color:#fff;padding:18px 18px}
      .brand{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .brand h1{margin:0;font-size:22px;letter-spacing:-.02em}
      .brand small{opacity:.9}
      .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px}
      .pill{border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;padding:12px}
      .pill .k{font-size:11px;color:#6b7280}
      .pill .v{font-weight:700;margin-top:4px;word-break:break-word}
      .section{padding:0 16px 16px}
      .section h3{margin:0 0 8px;font-size:13px}
      .address{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}
      th{background:#f9fafb;text-align:left;color:#374151;font-size:12px}
      .right{text-align:right}
      .totals{border:1px solid #e5e7eb;border-radius:14px;padding:12px}
      .row{display:flex;justify-content:space-between;gap:12px;margin:6px 0;font-size:13px;color:#374151}
      .row b{color:#111}
      .grand{border-top:1px solid #e5e7eb;margin-top:10px;padding-top:10px;font-size:15px}
      .foot{padding:14px 16px;color:#6b7280;font-size:11px;border-top:1px solid #eef2f7}
      @media print{body{background:#fff}.page{margin:0;max-width:none}.card{box-shadow:none}}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="top">
          <div class="brand">
            <div>
              <h1>Yaadro</h1>
              <small>Professional Supermarket</small>
            </div>
            <div style="text-align:right">
              <small>INVOICE</small>
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
            <div style="font-weight:700">${safe(addr.fullName || addr.name || '')} ${addr.phone ? ' • ' + safe(addr.phone) : ''}</div>
            <div style="margin-top:4px;color:#374151">
              ${[addr.street || addr.address, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country].filter(Boolean).map(safe).join(', ')}
            </div>
          </div>
        </div>
        <div class="section">
          <h3>Items</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Unit</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4">No items</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="section">
          <div class="totals">
            ${order?.subtotal != null ? `<div class="row"><span>Subtotal</span><b>${money(order.subtotal)}</b></div>` : ''}
            ${order?.shipping != null ? `<div class="row"><span>Delivery</span><b>${money(order.shipping)}</b></div>` : ''}
            ${order?.tax != null ? `<div class="row"><span>Tax</span><b>${money(order.tax)}</b></div>` : ''}
            ${order?.discount != null && Number(order.discount) > 0 ? `<div class="row"><span>Discount</span><b style="color:#047857">- ${money(order.discount)}</b></div>` : ''}
            <div class="row grand"><span><b>Total</b></span><b>${order?.total != null ? money(order.total) : '—'}</b></div>
          </div>
        </div>
        <div class="foot">This is a computer generated invoice.</div>
      </div>
    </div>
  </body>
</html>`;
  };

  const handleOpenBillPreview = () => setShowBillSheet(true);

  const handleDownloadPdf = () => {
    try {
      const html = buildBillHtml();
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      // Give browser a moment to render, then print (user can save as PDF)
      setTimeout(() => w.print(), 400);
    } catch (e) {
      console.error('Failed to open print:', e);
    }
  };

  const handleDownloadHtml = () => {
    try {
      const html = buildBillHtml();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bill-${order?.orderNumber || orderId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download html:', e);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-primary/10 via-white to-primary/10">
      {/* Backdrop area (keeps focus on bottom sheet) */}
      <div className="min-h-screen w-full pb-44 md:pb-0" />

      {/* Mobile Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 overflow-hidden">
            {/* Drag handle (visual only) */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-5 pb-5">
              {/* Top message */}
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-gray-900">{successInfo.title}</h1>
                <p className="mt-1 text-sm text-gray-700">{successInfo.message}</p>
                <p className="mt-1 text-xs text-gray-500">{successInfo.subMessage}</p>
              </div>

              {/* Center visual */}
              <div className="mt-4 flex justify-center">
                <div className="relative w-44 h-44">
                  <Image
                    src={visual.src}
                    alt={visual.alt}
                    fill
                    className="object-contain"
                    unoptimized={visual.isGif}
                    priority
                  />
                </div>
              </div>

              {/* Order meta */}
              <div className="mt-4 flex items-center justify-center">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">Order ID:</span> {orderId}
                </div>
              </div>

              {/* Countdown (success only) */}
              {isSuccess && countdown > 0 && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Opening order details in{' '}
                    <span className="font-semibold text-primary">{countdown}</span>s
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 space-y-3">
                <Link
                  href={`/orders/${orderId}`}
                  className={`block w-full px-6 py-4 rounded-2xl text-base font-extrabold text-center shadow-lg transition-colors ${
                    isRejected ? 'bg-primary hover:bg-primary-dark text-white' : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                >
                  {isRejected ? 'View Order & Retry Payment' : 'View Order Details'}
                </Link>

                <button
                  type="button"
                  onClick={handleOpenBillPreview}
                  className="w-full bg-white border-2 border-gray-200 text-gray-900 px-6 py-4 rounded-2xl text-base font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
                >
                  <span className="relative w-6 h-6">
                    <Image src="/images/download-bill.png" alt="Download bill" fill className="object-contain" />
                  </span>
                  Download Bill
                </button>

                <Link
                  href="/"
                  className="block w-full bg-white text-primary-dark border-2 border-primary px-6 py-4 rounded-2xl text-base font-semibold hover:bg-primary/10 transition-colors text-center"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BillPreviewSheet
        isOpen={showBillSheet}
        onClose={() => setShowBillSheet(false)}
        orderId={orderId}
        paymentStatus={paymentStatus}
        order={order}
        onDownloadPdf={handleDownloadPdf}
        onDownloadHtml={handleDownloadHtml}
      />
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-primary/10 via-white to-primary/10 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-48">
              <Image
                src="/gif/order-success.gif"
                alt="Order successful"
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          </div>
          <p className="text-sm text-gray-600">Preparing your order details…</p>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

