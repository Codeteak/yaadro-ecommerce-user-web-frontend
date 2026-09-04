'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getShopIdFromEnv, resolveShopId } from '../utils/authApi';
import {
  connectCatalogRealtimeSocket,
  isCatalogRealtimeEnabled,
} from '../lib/catalogRealtimeSocket';
import { scheduleCoalescedCatalogRefetch } from '../lib/coalesceCatalogRefetch';
import { startCatalogRevisionPoll } from '../lib/catalogRevisionPoll';

/** @typedef {'idle' | 'disabled' | 'connecting' | 'connected' | 'disconnected'} CatalogRealtimePhase */

const CatalogRealtimeContext = createContext(null);

export function CatalogRealtimeProvider({ children }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState(/** @type {CatalogRealtimePhase} */ ('idle'));
  const [lastError, setLastError] = useState(null);
  const [resolvedShopId, setResolvedShopId] = useState(/** @type {string | null} */ (null));
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (!isCatalogRealtimeEnabled()) {
      setPhase('disabled');
      setResolvedShopId(null);
      return undefined;
    }

    let disconnect = () => {};
    let cancelled = false;

    const onCatalogInvalidated = (payload) => {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info('[catalog.realtime] catalog.invalidated', payload);
      }
      scheduleCoalescedCatalogRefetch(queryClient, payload);
    };

    const connectWithShopId = (shopId) => {
      if (cancelled || !shopId) {
        setPhase('disabled');
        setResolvedShopId(null);
        return;
      }

      setResolvedShopId(shopId);
      disconnect = connectCatalogRealtimeSocket({
        shopId,
        onEvent: onCatalogInvalidated,
        onPhase: (nextPhase, detail) => {
          setPhase(nextPhase);
          setLastError(detail || null);
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.info('[catalog.realtime] phase', nextPhase, detail || '');
          }
        },
      });
    };

    const envShopId = getShopIdFromEnv();
    if (envShopId) {
      connectWithShopId(envShopId);
    } else {
      void resolveShopId().then((shopId) => {
        if (!cancelled) connectWithShopId(shopId);
      });
    }

    return () => {
      cancelled = true;
      setResolvedShopId(null);
      disconnect();
    };
  }, [queryClient]);

  /** Poll revision only while the socket is not connected (fallback when Socket.IO is down). */
  useEffect(() => {
    if (!isCatalogRealtimeEnabled() || !resolvedShopId || phase === 'connected') {
      return undefined;
    }
    return startCatalogRevisionPoll({ shopId: resolvedShopId, queryClient });
  }, [queryClient, phase, resolvedShopId]);

  /** When the socket is down, refetch catalog after the tab is focused again. */
  useEffect(() => {
    if (!isCatalogRealtimeEnabled()) return undefined;

    const maybeRefetchOnVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (phaseRef.current === 'connected') return;
      scheduleCoalescedCatalogRefetch(queryClient);
    };

    window.addEventListener('focus', maybeRefetchOnVisible);
    document.addEventListener('visibilitychange', maybeRefetchOnVisible);
    return () => {
      window.removeEventListener('focus', maybeRefetchOnVisible);
      document.removeEventListener('visibilitychange', maybeRefetchOnVisible);
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      phase,
      lastError,
      enabled: isCatalogRealtimeEnabled(),
    }),
    [phase, lastError]
  );

  return (
    <CatalogRealtimeContext.Provider value={value}>{children}</CatalogRealtimeContext.Provider>
  );
}

export function useCatalogRealtime() {
  const ctx = useContext(CatalogRealtimeContext);
  if (!ctx) {
    throw new Error('useCatalogRealtime must be used within CatalogRealtimeProvider');
  }
  return ctx;
}
