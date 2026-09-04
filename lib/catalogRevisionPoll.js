import { scheduleCoalescedCatalogRefetch } from './coalesceCatalogRefetch.js';

const DEFAULT_POLL_MS = 8000;

/**
 * Poll catalog generation via same-origin /api (works when Socket.IO cross-port fails).
 * @param {{ shopId: string, queryClient: import('@tanstack/react-query').QueryClient, intervalMs?: number, onGenerationChange?: (gen: number) => void }} opts
 * @returns {() => void} stop
 */
export function startCatalogRevisionPoll({ shopId, queryClient, intervalMs = DEFAULT_POLL_MS, onGenerationChange }) {
  if (!shopId || !queryClient) return () => {};

  let cancelled = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  /** @type {number | null} */
  let lastGeneration = null;

  const tick = async () => {
    if (cancelled) return;
    try {
      const res = await fetch('/api/storefront/catalog/revision', {
        method: 'GET',
        headers: { 'x-shop-id': shopId, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[catalog.realtime] revision poll HTTP', res.status);
        }
      } else {
        const body = await res.json();
        const layer = body?.data != null && typeof body.data === 'object' ? body.data : body;
        const generation = Number(layer?.generation);
        if (Number.isFinite(generation)) {
          if (lastGeneration != null && generation !== lastGeneration) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.info('[catalog.realtime] revision changed', lastGeneration, '→', generation);
            }
            onGenerationChange?.(generation);
            scheduleCoalescedCatalogRefetch(queryClient);
          }
          lastGeneration = generation;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[catalog.realtime] revision poll failed', err?.message || err);
      }
    }

    if (!cancelled) {
      timer = setTimeout(() => void tick(), intervalMs);
    }
  };

  void tick();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
