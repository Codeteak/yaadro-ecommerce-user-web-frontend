'use client';

import { useEffect, useMemo } from 'react';
import { X, Download } from 'lucide-react';

function formatMoney(v) {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  if (Number.isFinite(n)) return `₹${n.toFixed(2)}`;
  return '';
}

export default function BillPreviewSheet({
  isOpen,
  onClose,
  orderId,
  paymentStatus,
  order,
  onDownloadPdf,
  onDownloadHtml,
}) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const items = order?.items || [];
  const delivery = order?.deliveryAddress || order?.address || null;

  const meta = useMemo(() => {
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    return {
      orderNumber: order?.orderNumber || order?.order_number || '',
      createdAtLabel: createdAt ? createdAt.toLocaleString() : '',
      payment: paymentStatus || order?.paymentStatus || 'success',
      method: order?.paymentMethod || order?.payment_method || '',
      subtotal: order?.subtotal ?? order?.subTotal ?? null,
      shipping: order?.shipping ?? null,
      tax: order?.tax ?? null,
      discount: order?.discount ?? null,
      total: order?.total ?? null,
    };
  }, [order, paymentStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="mx-auto w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 overflow-hidden">
          {/* Drag handle (visual only) */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">Bill Preview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Review your invoice before downloading</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Preview */}
          <div className="px-5 pb-4 max-h-[62vh] overflow-y-auto overscroll-contain">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Top brand bar */}
              <div className="px-4 py-4 bg-gradient-to-r from-primary to-primary-dark text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-extrabold tracking-tight">Yaadro</div>
                    <div className="text-xs text-primary/10">Professional Supermarket</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-90">INVOICE</div>
                    <div className="text-sm font-bold">{meta.orderNumber || orderId}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[11px] text-gray-500">Order ID</div>
                    <div className="text-sm font-semibold text-gray-900 break-all">{orderId}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[11px] text-gray-500">Date</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {meta.createdAtLabel || '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[11px] text-gray-500">Payment</div>
                    <div className="text-sm font-semibold text-gray-900 capitalize">{meta.payment}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <div className="text-[11px] text-gray-500">Method</div>
                    <div className="text-sm font-semibold text-gray-900 capitalize">
                      {meta.method || '—'}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900">Delivery Address</h4>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary-dark border border-primary/30">
                      Shipping
                    </span>
                  </div>
                  {delivery ? (
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {[delivery.fullName || delivery.name, delivery.phone].filter(Boolean).length > 0 && (
                        <div className="font-semibold text-gray-900">
                          {[delivery.fullName || delivery.name, delivery.phone].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      <div>
                        {[delivery.street || delivery.address, delivery.city, delivery.state, delivery.zipCode || delivery.postalCode, delivery.country]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">—</div>
                  )}
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900">Items</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No items</div>
                    ) : (
                      items.map((it, idx) => {
                        const name = it.productName || it.name || it.product?.name || 'Item';
                        const qty = it.quantity ?? 1;
                        const unit = it.unitPrice ?? it.price ?? '';
                        const total = it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
                        return (
                          <div key={it.id || idx} className="p-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Qty: <span className="font-semibold text-gray-700">{qty}</span>
                                {unit !== '' && (
                                  <>
                                    {' '}• Unit: <span className="font-semibold text-gray-700">{formatMoney(unit)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                              {total !== '' ? formatMoney(total) : ''}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="space-y-2 text-sm">
                    {meta.subtotal != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold text-gray-900">{formatMoney(meta.subtotal)}</span>
                      </div>
                    )}
                    {meta.shipping != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery</span>
                        <span className="font-semibold text-gray-900">{formatMoney(meta.shipping)}</span>
                      </div>
                    )}
                    {meta.tax != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-semibold text-gray-900">{formatMoney(meta.tax)}</span>
                      </div>
                    )}
                    {meta.discount != null && Number(meta.discount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-semibold text-primary-dark">- {formatMoney(meta.discount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex justify-between">
                      <span className="font-extrabold text-gray-900">Total</span>
                      <span className="font-extrabold text-gray-900">{meta.total != null ? formatMoney(meta.total) : '—'}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-500">
                    This is a computer generated invoice.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 pt-3 border-t border-gray-200 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onDownloadPdf}
                className="w-full bg-primary text-white py-3.5 rounded-2xl font-extrabold hover:bg-primary-dark transition-colors inline-flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={onDownloadHtml}
                className="w-full bg-white border-2 border-gray-200 text-gray-900 py-3.5 rounded-2xl font-extrabold hover:bg-gray-50 transition-colors"
              >
                Download HTML
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

