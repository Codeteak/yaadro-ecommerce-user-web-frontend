/**
 * Socket.IO client for storefront catalog realtime (`catalog.invalidated`).
 *
 * Production on customer.yaadro.online often proxies `/api` to the customer API
 * on the same host. Socket.IO must hit `/socket.io` on that API — not Next alone.
 * When the API host matches the shop host, we use same-origin + Next rewrite and
 * prefer HTTP long-polling (WebSocket upgrade through Next is unreliable).
 */

export function isCatalogRealtimeEnabled() {
  const flag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED;
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return Boolean(process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN?.trim());
}

function stripApiSuffix(url) {
  return String(url || '')
    .replace(/\/+$/, '')
    .replace(/\/api\/?$/i, '');
}

/** Resolve API hostname from public env (no /api suffix). */
export function getConfiguredApiHostname() {
  const raw =
    process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    '';
  if (!raw) return '';
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(stripApiSuffix(raw), base).hostname;
  } catch {
    return '';
  }
}

/** When true, browser connects to shop origin; Next rewrites `/socket.io` → customer API. */
export function shouldUseSameOriginCatalogRealtime() {
  if (typeof window === 'undefined') return false;

  const flag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;

  // Auto: shop and API share a host (e.g. customer.yaadro.online) → same-origin + rewrite.
  // Explicit REALTIME_URL to a different host (customer.*) stays cross-origin + CORS.
  const explicit = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL?.trim();
  if (explicit) {
    try {
      const host = new URL(stripApiSuffix(explicit), window.location.origin).hostname;
      return host === window.location.hostname;
    } catch {
      return false;
    }
  }

  const apiHost = getConfiguredApiHostname();
  if (!apiHost) return false;
  return apiHost === window.location.hostname;
}

/** Customer API origin without `/api` suffix. */
export function getCatalogRealtimeOrigin() {
  if (typeof window !== 'undefined' && shouldUseSameOriginCatalogRealtime()) {
    return window.location.origin;
  }

  const explicit = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL?.trim();
  if (explicit) {
    return stripApiSuffix(explicit);
  }

  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    '';

  if (raw) {
    return stripApiSuffix(raw);
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
    // Intentionally do NOT emit 'connecting' on every retry — that flapped phase and
    // restarted HTTP revision polling (immediate tick storm) while Socket.IO was down.
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
      // Prefer polling first: Cloudflare/ALB often block or flake on WS upgrade
      // while HTTP long-polling to /socket.io still works. WS upgrades when available.
      socket = io(origin, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        upgrade: true,
        auth: { shopId, token },
        reconnection: true,
        // Cap retries so a dead /socket.io path does not spam the console forever.
        // CatalogRealtimeContext already falls back to HTTP revision polling.
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 15_000,
        timeout: 20_000,
      });

      socket.on('connect', () => {
        onPhase?.('connected');
      });

      socket.on('catalog.invalidated', (payload) => {
        onEvent(payload && typeof payload === 'object' ? payload : {});
      });

      socket.on('connect_error', (err) => {
        // Stay on 'disconnected' without re-emitting if already there — avoids effect churn.
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
