'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckRegular as Check, More2Regular as MoreVertical } from '../icons';
import { getResolvedProductImageUrls, PRODUCT_IMAGE_PLACEHOLDER } from '../../utils/productImages';

function getOrderStatusTone(status = '') {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 'bg-violet-50 text-violet-700 border-violet-200';
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

function formatPlacedAt(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th';
  return `Placed at ${day}${suffix} ${d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
}

function OrderCardMenu({ order, onOpenDetails, onCancel, onShareCopied }) {
  const [open, setOpen] = useState(false);
  const [actionsReady, setActionsReady] = useState(false);

  const warmActions = useCallback(() => {
    if (actionsReady) return;
    void import('../../utils/orderDashboardActions').then(() => {
      setActionsReady(true);
    });
  }, [actionsReady]);

  const handleDownloadInvoice = useCallback(async () => {
    const { downloadOrderInvoice } = await import('../../utils/orderDashboardActions');
    downloadOrderInvoice(order);
    setOpen(false);
  }, [order]);

  const handleShare = useCallback(async () => {
    const { shareOrderLink } = await import('../../utils/orderDashboardActions');
    await shareOrderLink(order, { onCopied: onShareCopied });
    setOpen(false);
  }, [order, onShareCopied]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onMouseEnter={warmActions}
        onFocus={warmActions}
        onClick={() => {
          warmActions();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="More options"
        aria-expanded={open}
      >
        <MoreVertical size={20} className="w-5 h-5" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`/order?id=${encodeURIComponent(order.id)}`}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setOpen(false);
                onOpenDetails?.(order.id);
              }}
            >
              View Details
            </Link>
            {order.status === 'delivered' && (
              <button
                type="button"
                onClick={() => {
                  void handleDownloadInvoice();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Download Invoice
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleShare();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Share
            </button>
            {order.canCancel && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCancel?.(order.id);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({ order, reorderLoading, onOpenDetails, onReorder, onCancel, onShareCopied }) {
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

  const openDetails = useCallback(() => {
    onOpenDetails?.(order.id);
  }, [onOpenDetails, order.id]);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Order details for ${order.orderNumber || order.id}`}
      className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetails();
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
                <Check size={12} className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-gray-900">₹{order.total?.toFixed?.(0) ?? order.total}</span>
            <OrderCardMenu
              order={order}
              onOpenDetails={onOpenDetails}
              onCancel={onCancel}
              onShareCopied={onShareCopied}
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-3">{formatPlacedAt(order.createdAt)}</p>

        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
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
        </div>

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
            onClick={() => onReorder?.(order)}
            disabled={reorderLoading}
            className="flex-1 rounded-xl border border-yellow-500 bg-yellow-400 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-yellow-300"
          >
            {reorderLoading ? (
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
  );
}

export default memo(OrderCard);
