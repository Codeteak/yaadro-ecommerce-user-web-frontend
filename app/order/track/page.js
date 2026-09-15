'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useOrderDetail } from '../../../hooks/useOrders';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import {
  isHttpTrackingUrl,
  markTrackingOpenedThisSession,
} from '../../../utils/deliveryTracking';

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 4L6 8l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3H3v10h10V10M9 2h5v5M8 8l6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full-viewport shell so layout chrome cannot shrink the tracking iframe. */
function TrackShell({ children }) {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-white"
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100%',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
}

function TrackPageSkeleton() {
  return (
    <TrackShell>
      <div className="h-14 shrink-0 border-b border-gray-200 bg-white" />
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-500">
        Loading live tracking…
      </div>
    </TrackShell>
  );
}

function OrderTrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = String(searchParams?.get('id') || '').trim();
  const { ok, ready } = useRequireAuth();
  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetail(orderId, {
    enabled: ok && Boolean(orderId),
  });

  const trackingUrl = useMemo(() => {
    const raw = order?.deliveryTrackingUrl;
    return isHttpTrackingUrl(raw) ? raw.trim() : '';
  }, [order?.deliveryTrackingUrl]);

  const [iframeFailed, setIframeFailed] = useState(false);
  const orderHref = orderId
    ? `/order?id=${encodeURIComponent(orderId)}`
    : '/orders';

  useEffect(() => {
    if (orderId && trackingUrl) markTrackingOpenedThisSession(orderId);
  }, [orderId, trackingUrl]);

  useEffect(() => {
    setIframeFailed(false);
  }, [trackingUrl]);

  if (!ready) return <TrackPageSkeleton />;

  if (!ok) {
    return (
      <TrackShell>
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-gray-600">
          Sign in to view live tracking.
        </div>
      </TrackShell>
    );
  }

  if (!orderId) {
    return (
      <TrackShell>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="m-0 text-sm text-gray-600">Missing order id.</p>
          <Link href="/orders" className="text-sm font-semibold text-[#902bf5]">
            Back to orders
          </Link>
        </div>
      </TrackShell>
    );
  }

  return (
    <TrackShell>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
        <button
          type="button"
          onClick={() => router.push(orderHref)}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700"
          aria-label="Back to order"
        >
          <IconBack />
        </button>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[14px] font-semibold leading-tight text-gray-900">
            Live tracking
          </p>
          <p className="m-0 truncate font-mono text-[11px] leading-tight text-gray-500">
            {order?.orderNumber || orderId}
          </p>
        </div>
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 text-[11px] font-semibold text-gray-700"
            title="Open in browser"
          >
            <IconExternal />
            Open
          </a>
        ) : null}
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden bg-white">
        {isLoading && !order ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading live tracking…
          </div>
        ) : isError || !order ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="m-0 text-sm text-gray-600">Could not load this order.</p>
            <Link href={orderHref} className="text-sm font-semibold text-[#902bf5]">
              Back to order
            </Link>
          </div>
        ) : !trackingUrl ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="m-0 text-[15px] font-semibold text-gray-900">
              Tracking not ready yet
            </p>
            <p className="m-0 max-w-sm text-[13px] text-gray-500">
              Live tracking appears after the shop accepts your order. You can
              check order details and come back here.
            </p>
            <Link
              href={orderHref}
              className="mt-1 inline-flex rounded-xl bg-[#902bf5] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              View order details
            </Link>
          </div>
        ) : iframeFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="m-0 text-[15px] font-semibold text-gray-900">
              Couldn’t embed tracking
            </p>
            <p className="m-0 max-w-sm text-[13px] text-gray-500">
              Open tracking in a new tab, then use Back to return to your order.
            </p>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex rounded-xl bg-[#902bf5] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              Open live tracking
            </a>
            <Link href={orderHref} className="text-sm font-semibold text-[#902bf5]">
              Back to order
            </Link>
          </div>
        ) : (
          <iframe
            title="Live delivery tracking"
            src={trackingUrl}
            className="order-tracking-embed absolute inset-0"
            style={{ display: 'block', width: '100%', height: '100%' }}
            referrerPolicy="no-referrer-when-downgrade"
            allow="geolocation; clipboard-read; clipboard-write"
            onError={() => setIframeFailed(true)}
          />
        )}
      </main>
    </TrackShell>
  );
}

export default function OrderTrackPage() {
  return (
    <Suspense fallback={<TrackPageSkeleton />}>
      <OrderTrackContent />
    </Suspense>
  );
}
