import { NextResponse } from 'next/server';
import { proxyUpstreamGet } from './proxyUpstreamApi';
import { shouldPreferDatabaseCatalog } from './storefrontCatalogRouteSource';

export function readStorefrontShopId(request) {
  return (
    request.headers.get('x-shop-id') ||
    process.env.NEXT_PUBLIC_SHOP_ID ||
    ''
  ).trim();
}

/**
 * Serve an unauthenticated storefront GET from Postgres first.
 * On DB errors, proxy to customer API (:4100).
 *
 * @param {Request} request
 * @param {string} upstreamPath
 * @param {() => Promise<Response>} loadFromDb
 */
export async function tryDbThenUpstream(request, upstreamPath, loadFromDb) {
  if (shouldPreferDatabaseCatalog()) {
    try {
      return await loadFromDb();
    } catch (err) {
      console.warn(
        `[storefront] DB read failed for ${upstreamPath}, falling back to customer API:`,
        err?.message || err
      );
    }
  }
  return proxyUpstreamGet(request, upstreamPath);
}

export function jsonOk(body, status = 200) {
  return NextResponse.json(body, { status });
}

export function jsonErr(message, status = 500) {
  return NextResponse.json({ status: 'error', message }, { status });
}
