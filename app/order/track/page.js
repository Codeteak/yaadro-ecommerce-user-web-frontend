'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useOrderDetail } from '../../../hooks/useOrders';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import GuestAuthPrompt from '../../../components/GuestAuthPrompt';
import {
  isHttpTrackingUrl,
  markTrackingOpenedThisSession,
} from '../../../utils/deliveryTracking';
import { getAppShellEl, lockAppScroll, unlockAppScroll } from '../../../lib/pwa/appShell';
import { createAppPortal, ensurePortalRoot } from '../../../lib/pwa/safePortal';
import PageTopBar from '../../../components/PageTopBar';
import { Share2Regular as Share2 } from '../../../components/icons';

function TrackShell({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const shell = getAppShellEl();
    ensurePortalRoot();
    if (shell?.isConnected) shell.classList.add('app-shell-tracking');
    setReady(true);
    lockAppScroll();
    return () => {
      shell?.classList.remove('app-shell-tracking');
      unlockAppScroll();
    };
  }, []);

  const tree = (
    <div className="fixed inset-0 z-[80] mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col bg-white">
      {children}
    </div>
  );

  if (!ready) return tree;
  // Always body portal root — never `#app-shell` (removeChild null crash).
  return createAppPortal(tree) || tree;
}

function TrackPageSkeleton() {
  return (
    <TrackShell>
      <PageTopBar title="Live tracking" backHref="/orders" fallbackHref="/orders" />
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-gray-500">
        Loading live tracking…
      </div>
    </TrackShell>
  );
}

function OrderTrackContent() {
  const searchParams = useSearchParams();
  const orderId = String(searchParams?.get('id') || '').trim();
  const { ok, ready } = useRequireAuth({ mode: 'prompt' });
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

  // Guests: stay on page and ask to sign in (do not dump to home).
  if (!ready) return <TrackPageSkeleton />;
  if (!ok) {
    const returnPath = orderId
      ? `/order/track?id=${encodeURIComponent(orderId)}`
      : '/orders';
    return (
      <GuestAuthPrompt
        pageTitle="Live tracking"
        description="Sign in to view live delivery tracking for your order."
        loginReturnPath={returnPath}
        backHref="/"
        fallbackHref="/"
        homeLabel="Continue shopping"
      />
    );
  }

  if (!orderId) {
    return (
      <TrackShell>
        <PageTopBar title="Live tracking" backHref="/orders" fallbackHref="/orders" />
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
      <PageTopBar
        title="Live tracking"
        subtitle={order?.orderNumber || orderId}
        backHref={orderHref}
        fallbackHref={orderHref}
        right={
          trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"
              title="Open in browser"
              aria-label="Open tracking in browser"
            >
              <Share2 size={20} className="h-5 w-5" />
            </a>
          ) : null
        }
      />

      <div className="order-tracking-frame relative min-h-0 flex-1 bg-white">
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
            key={trackingUrl}
            title="Live delivery tracking"
            src={trackingUrl}
            className="order-tracking-embed absolute inset-0 h-full w-full"
            scrolling="yes"
            referrerPolicy="no-referrer-when-downgrade"
            allow="geolocation; clipboard-read; clipboard-write"
            onError={() => setIframeFailed(true)}
          />
        )}
      </div>
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
