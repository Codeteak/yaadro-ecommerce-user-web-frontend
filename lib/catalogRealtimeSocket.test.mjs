import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCatalogRealtimeOrigin,
  isCatalogRealtimeEnabled,
  shouldUseSameOriginCatalogRealtime,
} from './catalogRealtimeSocket.js';

test('isCatalogRealtimeEnabled with token', () => {
  const prev = process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN;
  const prevEnabled = process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED;
  process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN = 'abc';
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED;
  assert.equal(isCatalogRealtimeEnabled(), true);
  process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN = prev;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED = prevEnabled;
});

test('shouldUseSameOriginCatalogRealtime follows USE_SAME_ORIGIN_API', () => {
  const prevSame = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  const prevApi = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API;
  const prevRt = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL;
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API = 'true';
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = 'https://customer.yaadro.online';

  // Without window, same-origin helpers stay false (SSR-safe).
  assert.equal(shouldUseSameOriginCatalogRealtime(), false);

  globalThis.window = {
    location: { origin: 'https://greens.yaadro.online', hostname: 'greens.yaadro.online' },
  };
  try {
    assert.equal(shouldUseSameOriginCatalogRealtime(), true);
  } finally {
    delete globalThis.window;
    process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = prevSame;
    process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API = prevApi;
    process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = prevRt;
  }
});

test('shouldUseSameOriginCatalogRealtime respects explicit false flag', () => {
  const prevSame = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  const prevApi = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = 'false';
  process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API = 'true';
  globalThis.window = {
    location: { origin: 'https://greens.yaadro.online', hostname: 'greens.yaadro.online' },
  };
  try {
    assert.equal(shouldUseSameOriginCatalogRealtime(), false);
  } finally {
    delete globalThis.window;
    process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = prevSame;
    process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API = prevApi;
  }
});

test('getCatalogRealtimeOrigin uses explicit URL without window', () => {
  const prevUrl = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL;
  const prevSame = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  const prevApi = process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  delete process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = 'http://localhost:4100/';
  assert.equal(getCatalogRealtimeOrigin(), 'http://localhost:4100');
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = prevUrl;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = prevSame;
  process.env.NEXT_PUBLIC_API_URL = prevApi;
});

test('getCatalogRealtimeOrigin strips /api from API URL', () => {
  const prevUrl = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL;
  const prevApi = process.env.NEXT_PUBLIC_API_URL;
  const prevSame = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL;
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api';
  assert.equal(getCatalogRealtimeOrigin(), 'https://api.example.com');
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = prevUrl;
  process.env.NEXT_PUBLIC_API_URL = prevApi;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = prevSame;
});
