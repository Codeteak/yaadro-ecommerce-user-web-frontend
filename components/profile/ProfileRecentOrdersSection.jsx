'use client';

import Link from 'next/link';
import {
  Loading2Regular as Loader2,
  PackageRegular as Package,
  RightRegular as ChevronRight,
} from '../icons';

function statusLabel(status) {
  return String(status || 'pending').replaceAll('_', ' ');
}

function statusTone(status = '') {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 'bg-violet-50 text-violet-700';
  if (s === 'cancelled' || s === 'canceled') return 'bg-red-50 text-red-700';
  if (s === 'shipped' || s === 'out_for_delivery') return 'bg-amber-50 text-amber-800';
  if (s === 'processing' || s === 'confirmed') return 'bg-blue-50 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function itemCount(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return (
    Number(
      order?.itemCount ??
        order?.itemsCount ??
        order?.items_count ??
        order?.total_items ??
        order?.totalItems ??
        items.length
    ) || 0
  );
}

function formatTotal(order) {
  const n = Number(order?.total);
  if (!Number.isFinite(n)) return null;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * Compact recent orders for profile — reuses existing useOrdersList data from parent.
 */
export default function ProfileRecentOrdersSection({
  orders = [],
  isLoading = false,
  isError = false,
}) {
  const list = Array.isArray(orders) ? orders.slice(0, 3) : [];

  return (
    <section
      className="mx-4 mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-slide-up motion-reduce:animate-none"
      style={{ animationDelay: '40ms' }}
      aria-label="Orders"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-50 px-4 py-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Orders</h3>
          <p className="text-xs text-gray-500">
            {isLoading ? 'Loading…' : `${orders.length} recent`}
          </p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-violet-700 transition-colors duration-200 hover:text-violet-800 active:opacity-80"
        >
          View all
          <ChevronRight size={16} className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="px-3 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 size={20} className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : isError ? (
          <p className="px-1 py-4 text-center text-[13px] text-gray-500">
            Couldn’t load orders right now.
          </p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-5 text-center">
            <Package size={22} className="h-5.5 w-5.5 text-gray-300" aria-hidden />
            <p className="text-[13px] text-gray-500">No orders yet.</p>
            <Link
              href="/"
              className="text-sm font-semibold text-violet-700 transition-colors duration-200 hover:text-violet-800"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {list.map((order) => {
              const id = order.id;
              const count = itemCount(order);
              const total = formatTotal(order);
              return (
                <li key={id}>
                  <Link
                    href={`/order?id=${encodeURIComponent(id)}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          Order {order.orderNumber || id?.slice?.(0, 8) || ''}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(
                            order.status
                          )}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {count} item{count === 1 ? '' : 's'}
                        {total ? ` · ${total}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} className="h-4.5 w-4.5 shrink-0 text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
