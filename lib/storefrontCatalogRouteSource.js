import { isDatabaseConfigured } from './db';

/**
 * When true, Next /api/storefront/* catalog routes proxy to customer API (4100)
 * instead of reading Postgres directly.
 *
 * Local DATABASE_URL reads the first matching `products` table, which may not
 * match admin `shop_products` pricing. Realtime catalog requires customer API.
 */
export function shouldUseUpstreamStorefrontCatalog() {
  if (!isDatabaseConfigured()) return true;

  const explicit = process.env.STOREFRONT_CATALOG_USE_UPSTREAM?.trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;

  const realtimeFlag = process.env.NEXT_PUBLIC_CATALOG_REALTIME_ENABLED?.trim().toLowerCase();
  if (realtimeFlag === 'true' || realtimeFlag === '1') return true;

  return false;
}
