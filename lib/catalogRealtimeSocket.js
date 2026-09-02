/**
 * Socket.IO client for storefront catalog realtime (`catalog.invalidated`).
 * Connects to the customer API origin (not Next `/api` proxy).
 */

export function isCatalogRealtimeEnabled() {
  const flag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED;
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return Boolean(process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN?.trim());
}

/** When true, browser connects to shop origin; Next rewrites `/socket.io` → customer API. */
export function shouldUseSameOriginCatalogRealtime() {
  if (typeof window === 'undefined') return false;

  const flag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  // Default: connect directly to customer API (Next.js WS proxy is unreliable for Socket.IO).
  return false;
}

/** Customer API origin without `/api` suffix. */
export function getCatalogRealtimeOrigin() {
  if (typeof window !== 'undefined' && shouldUseSameOriginCatalogRealtime()) {
    return window.location.origin;
  }

  const explicit = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '').replace(/\/api\/?$/i, '');
  }

  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    '';

  if (raw) {
    return raw.replace(/\/+$/, '').replace(/\/api\/?$/i, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4100';
    }
  }

  return '';
}

export function getCatalogRealtimeToken() {
  return process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN?.trim() || '';
}

/**
 * @param {{ shopId: string, onEvent: (payload: { shopId?: string }) => void, onPhase?: (phase: string, detail?: string) => void }} opts
 * @returns {() => void} disconnect
 */
export function connectCatalogRealtimeSocket({ shopId, onEvent, onPhase }) {
  const origin = getCatalogRealtimeOrigin();
  const token = getCatalogRealtimeToken();
  if (!origin || !token || !shopId) {
    onPhase?.('disabled', 'missing origin, token, or shopId');
    return () => {};
  }

  let cancelled = false;
  let socket = null;

  const onManagerReconnect = () => {
    onPhase?.('connected');
  };
  const onManagerReconnectAttempt = () => {
    onPhase?.('connecting');
  };
  const onManagerReconnectFailed = () => {
    onPhase?.('disconnected', 'reconnect_failed');
  };

  const detachSocket = () => {
    if (!socket) return;
    socket.removeAllListeners();
    socket.io.off('reconnect', onManagerReconnect);
    socket.io.off('reconnect_attempt', onManagerReconnectAttempt);
    socket.io.off('reconnect_failed', onManagerReconnectFailed);
    socket.disconnect();
    socket = null;
  };

  const openSocket = async () => {
    if (cancelled) return;
    onPhase?.('connecting');
    try {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      detachSocket();
      socket = io(origin, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { shopId, token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30_000,
        timeout: 20_000,
      });

      socket.on('connect', () => {
        onPhase?.('connected');
      });

      socket.on('catalog.invalidated', (payload) => {
        onEvent(payload && typeof payload === 'object' ? payload : {});
      });

      socket.on('connect_error', (err) => {
        onPhase?.('disconnected', err?.message || 'connect_error');
      });

      socket.on('disconnect', (reason) => {
        if (cancelled) return;
        onPhase?.('disconnected', reason || undefined);
      });

      socket.io.on('reconnect', onManagerReconnect);
      socket.io.on('reconnect_attempt', onManagerReconnectAttempt);
      socket.io.on('reconnect_failed', onManagerReconnectFailed);
    } catch (err) {
      onPhase?.('disconnected', err?.message || 'import_failed');
    }
  };

  void openSocket();

  return () => {
    cancelled = true;
    detachSocket();
  };
}
