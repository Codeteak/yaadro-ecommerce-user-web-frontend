'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseRegular as X, DownloadRegular as Download } from './icons';
import { formatAddressDisplay } from '../utils/formatAddress';

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
  shopName = 'Yaadro',
  shopImage = null,
  onDownloadPdf,
}) {
  const [mounted, setMounted] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDownloadingPdf(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleDownloadPdf = async () => {
    if (!onDownloadPdf || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await onDownloadPdf();
    } finally {
      setDownloadingPdf(false);
    }
  };

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

  if (!isOpen || !mounted) return null;

  const sheet = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-gray-200 bg-white shadow-2xl"
        style={{ maxHeight: 'min(92dvh, 92vh)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-preview-title"
      >
        <div className="flex shrink-0 justify-center pb-2 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="flex shrink-0 items-start justify-between px-5 pb-3">
          <div>
            <h3 id="bill-preview-title" className="text-lg font-extrabold text-gray-900">
              Bill Preview
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">Review your invoice before downloading</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-violet-600 to-violet-800 px-4 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {shopImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shopImage}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl bg-white/15 object-contain ring-1 ring-white/25"
                      width={40}
                      height={40}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="truncate text-xl font-extrabold tracking-tight">
                      {shopName || 'Yaadro'}
                    </div>
                    <div className="text-xs text-white/70">Order invoice</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs opacity-90">INVOICE</div>
                  <div className="text-sm font-bold">{meta.orderNumber || orderId}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] text-gray-500">Order ID</div>
                  <div className="break-all text-sm font-semibold text-gray-900">{orderId}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] text-gray-500">Date</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {meta.createdAtLabel || '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] text-gray-500">Payment</div>
                  <div className="text-sm font-semibold capitalize text-gray-900">{meta.payment}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] text-gray-500">Method</div>
                  <div className="text-sm font-semibold capitalize text-gray-900">
                    {meta.method || '—'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">Delivery Address</h4>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary-dark">
                    Shipping
                  </span>
                </div>
                {delivery ? (
                  <div className="text-sm leading-relaxed text-gray-700">
                    {[delivery.fullName || delivery.name, delivery.phone].filter(Boolean).length >
                      0 && (
                      <div className="font-semibold text-gray-900">
                        {[delivery.fullName || delivery.name, delivery.phone]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    )}
                    <div>
                      {[delivery.street || delivery.address, delivery.city]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">—</div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
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
                      const total =
                        it.totalPrice ?? (unit !== '' ? Number(unit) * qty : '');
                      const isFree =
                        it.isConfirmedFreeReward ||
                        (Number(total) < 0.01 && Number(unit) > 0);
                      return (
                        <div
                          key={it.id || idx}
                          className="flex items-start justify-between gap-3 p-4"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {name}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">
                              Qty: <span className="font-semibold text-gray-700">{qty}</span>
                              {unit !== '' && (
                                <>
                                  {' '}
                                  • Unit:{' '}
                                  <span className="font-semibold text-gray-700">
                                    {formatMoney(unit)}
                                  </span>
                                </>
                              )}
                              {isFree ? (
                                <span className="ml-1 font-semibold text-violet-700">· FREE</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="whitespace-nowrap text-sm font-bold text-gray-900">
                            {isFree
                              ? 'FREE'
                              : total !== ''
                                ? formatMoney(total)
                                : ''}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="space-y-2 text-sm">
                  {meta.subtotal != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">
                        {formatMoney(meta.subtotal)}
                      </span>
                    </div>
                  )}
                  {meta.shipping != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span className="font-semibold text-gray-900">
                        {formatMoney(meta.shipping)}
                      </span>
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
                      <span className="font-semibold text-primary-dark">
                        - {formatMoney(meta.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-extrabold text-gray-900">Total</span>
                    <span className="font-extrabold text-gray-900">
                      {meta.total != null ? formatMoney(meta.total) : '—'}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-gray-500">
                  This is a computer generated invoice.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-t border-gray-200 bg-white px-5 pt-3"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF8D21] py-3.5 font-extrabold text-white transition-colors hover:bg-[#E67D0F] disabled:pointer-events-none disabled:opacity-60"
          >
            <Download size={20} className="h-5 w-5" />
            {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
