#!/usr/bin/env node
/**
 * End-to-end: admin price PATCH → catalog.invalidated (socket) → storefront price updates.
 *
 * Requires running:
 *   - User storefront Next.js (default http://127.0.0.1:3000) with socket.io rewrite
 *   - Admin API (default http://127.0.0.1:3010)
 *   - Customer API (default http://127.0.0.1:4100) REALTIME_ENABLED=true
 *
 * Usage:
 *   node scripts/verify-catalog-live-e2e.mjs
 *
 * Env overrides: VERIFY_SHOP_ID, VERIFY_STOREFRONT_ORIGIN, VERIFY_ADMIN_ORIGIN,
 * VERIFY_CUSTOMER_ORIGIN, VERIFY_STOREFRONT_CATALOG_REALTIME_TOKEN,
 * VERIFY_PRODUCT_ID, VERIFY_ADMIN_IDENTIFIER, VERIFY_ADMIN_PASSWORD
 */

import { io } from 'socket.io-client';

const SHOP_ID = process.env.VERIFY_SHOP_ID || 'c0000001-0000-4000-8000-000000000001';
const STOREFRONT_ORIGIN = (process.env.VERIFY_STOREFRONT_ORIGIN || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  ''
);
const ADMIN_ORIGIN = (process.env.VERIFY_ADMIN_ORIGIN || 'http://127.0.0.1:3010').replace(/\/+$/, '');
const CUSTOMER_ORIGIN = (process.env.VERIFY_CUSTOMER_ORIGIN || 'http://127.0.0.1:4100').replace(
  /\/+$/,
  ''
);
const REALTIME_TOKEN =
  process.env.VERIFY_STOREFRONT_CATALOG_REALTIME_TOKEN ||
  process.env.NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN ||
  '';
const PRODUCT_ID =
  process.env.VERIFY_PRODUCT_ID || '50000007-0000-4000-8000-000000000007';
const ADMIN_IDENTIFIER = process.env.VERIFY_ADMIN_IDENTIFIER || '999999';
const ADMIN_PASSWORD = process.env.VERIFY_ADMIN_PASSWORD || 'password@1234';

function fail(msg) {
  console.error(`[verify-catalog-live-e2e] FAIL: ${msg}`);
  process.exit(1);
}

function parseStorefrontPriceMinor(body, productId) {
  const all = (body.categories || []).flatMap((c) => c.products || []);
  const fromData = body.data?.products || [];
  const product = [...all, ...fromData].find((p) => p?.id === productId);
  return product?.actual_price_minor ?? product?.price_minor_per_unit ?? null;
}

async function fetchStorefrontPrice(origin) {
  const res = await fetch(`${origin}/api/storefront/products?limit=50`, {
    headers: { 'x-shop-id': SHOP_ID },
  });
  if (!res.ok) fail(`storefront GET ${res.status} from ${origin}`);
  const body = await res.json();
  return parseStorefrontPriceMinor(body, PRODUCT_ID);
}

async function adminLogin() {
  const res = await fetch(`${ADMIN_ORIGIN}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: SHOP_ID,
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
      actorType: 'staff',
    }),
  });
  if (!res.ok) fail(`admin login HTTP ${res.status}`);
  const body = await res.json();
  if (!body.token) fail('admin login missing token');
  return body.token;
}

async function adminGetPrice(token) {
  const res = await fetch(`${ADMIN_ORIGIN}/v1/catalog/admin/products/${PRODUCT_ID}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Shop-Id': SHOP_ID },
  });
  if (!res.ok) fail(`admin GET product HTTP ${res.status}`);
  const body = await res.json();
  const layer = body.data ?? body;
  return layer.priceMinorPerUnit ?? layer.price_minor_per_unit ?? null;
}

async function adminPatchPrice(token, priceMinor) {
  const res = await fetch(`${ADMIN_ORIGIN}/v1/catalog/products/${PRODUCT_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Shop-Id': SHOP_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceMinorPerUnit: priceMinor }),
  });
  const text = await res.text();
  if (!res.ok) fail(`admin PATCH HTTP ${res.status}: ${text.slice(0, 200)}`);
}

async function connectSocket(origin, label) {
  const socket = io(origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { shopId: SHOP_ID, token: REALTIME_TOKEN },
    reconnection: false,
    timeout: 10_000,
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} socket connect timeout`)), 12_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  return socket;
}

if (!REALTIME_TOKEN) {
  fail('Set VERIFY_STOREFRONT_CATALOG_REALTIME_TOKEN or NEXT_PUBLIC_STOREFRONT_CATALOG_REALTIME_TOKEN');
}

console.log('[verify-catalog-live-e2e] Checking catalog revision endpoint…');
const revBefore = await fetch(`${STOREFRONT_ORIGIN}/api/storefront/catalog/revision`, {
  headers: { 'x-shop-id': SHOP_ID },
}).then((r) => r.json());
console.log(`  revision before: ${revBefore.generation ?? revBefore.data?.generation}`);

console.log('[verify-catalog-live-e2e] Checking storefront catalog before patch…');
const before = await fetchStorefrontPrice(STOREFRONT_ORIGIN);
console.log(`  storefront price (minor): ${before}`);

const token = await adminLogin();
const adminBefore = await adminGetPrice(token);
const patchTarget = Number(adminBefore ?? before) === 18600 ? 18700 : 18600;
console.log(`  admin price (minor): ${adminBefore} → patch ${patchTarget}`);

console.log('[verify-catalog-live-e2e] Connecting socket via storefront origin (same-origin path)…');
let socket;
try {
  socket = await connectSocket(STOREFRONT_ORIGIN, 'storefront');
  console.log(`  connected ${socket.id} on ${STOREFRONT_ORIGIN}`);
} catch (err) {
  console.warn(
    `  storefront socket failed (${err.message}); retrying direct customer API ${CUSTOMER_ORIGIN}`
  );
  socket = await connectSocket(CUSTOMER_ORIGIN, 'customer');
  console.log(`  connected ${socket.id} on ${CUSTOMER_ORIGIN}`);
}

const invalidated = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('catalog.invalidated timeout')), 20_000);
  socket.once('catalog.invalidated', (payload) => {
    clearTimeout(timer);
    resolve(payload);
  });
});

await adminPatchPrice(token, patchTarget);
console.log('[verify-catalog-live-e2e] Admin PATCH ok, waiting for catalog.invalidated…');

const event = await invalidated;
if (String(event?.shopId) !== SHOP_ID) {
  fail(`unexpected event payload: ${JSON.stringify(event)}`);
}
console.log('  received catalog.invalidated');

await new Promise((r) => setTimeout(r, 600));
const after = await fetchStorefrontPrice(STOREFRONT_ORIGIN);
console.log(`  storefront price after (minor): ${after}`);

if (String(after) !== String(patchTarget)) {
  fail(`storefront price not updated (got ${after}, expected ${patchTarget})`);
}

const revAfter = await fetch(`${STOREFRONT_ORIGIN}/api/storefront/catalog/revision`, {
  headers: { 'x-shop-id': SHOP_ID },
}).then((r) => r.json());
const genBefore = Number(revBefore.generation ?? revBefore.data?.generation);
const genAfter = Number(revAfter.generation ?? revAfter.data?.generation);
console.log(`  revision after: ${genAfter}`);
if (Number.isFinite(genBefore) && Number.isFinite(genAfter) && genAfter <= genBefore) {
  fail(`catalog revision did not bump (${genBefore} -> ${genAfter})`);
}

console.log('[verify-catalog-live-e2e] Restoring original price…');
await adminPatchPrice(token, Number(adminBefore ?? before));
socket.close();

console.log('[verify-catalog-live-e2e] OK — live catalog price update verified');
