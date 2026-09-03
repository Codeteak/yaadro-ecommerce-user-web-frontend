import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCatalogRealtimeOrigin,
  isCatalogRealtimeEnabled,
  shouldUseSameOriginCatalogRealtime,
} from './catalogRealtimeSocket.js';

test('isCatalogRealtimeEnabled with token', () => {
  const prev = process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN;
  process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN = 'abc';
  assert.equal(isCatalogRealtimeEnabled(), true);
  process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN = prev;
});

test('shouldUseSameOriginCatalogRealtime defaults false without window', () => {
  assert.equal(shouldUseSameOriginCatalogRealtime(), false);
});

test('getCatalogRealtimeOrigin uses explicit URL without window', () => {
  const prevUrl = process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL;
  const prevSame = process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  delete process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = 'http://localhost:4100/';
  assert.equal(getCatalogRealtimeOrigin(), 'http://localhost:4100');
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_URL = prevUrl;
  process.env.NEXT_PUBLIC_CATALOG_REALTIME_USE_SAME_ORIGIN = prevSame;
});
