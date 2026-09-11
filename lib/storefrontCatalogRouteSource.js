import { isDatabaseConfigured } from './db';

/**
 * Prefer Next DATABASE_URL for unauthenticated storefront GETs.
 * Customer API (:4100) is fallback when the DB read fails or is not configured.
 *
 * `STOREFRONT_CATALOG_USE_UPSTREAM=true` forces API-only (escape hatch).
 * Catalog realtime no longer skips the DB — listing still works with frontend-only.
 */
export function shouldForceUpstreamStorefrontCatalog() {
  const explicit = process.env.STOREFRONT_CATALOG_USE_UPSTREAM?.trim().toLowerCase();
  return explicit === 'true' || explicit === '1';
}

export function shouldPreferDatabaseCatalog() {
  if (shouldForceUpstreamStorefrontCatalog()) return false;
  return isDatabaseConfigured();
}

/** @deprecated Use shouldPreferDatabaseCatalog — kept so older imports still compile. */
export function shouldUseUpstreamStorefrontCatalog() {
  return !shouldPreferDatabaseCatalog();
}
