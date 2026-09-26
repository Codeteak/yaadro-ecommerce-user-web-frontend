/**
 * Server-only Postgres pool (Supabase / DATABASE_URL).
 * Never import this from client components.
 */

import { Pool } from 'pg';

/** @type {import('pg').Pool | null} */
let pool = null;

export function isDatabaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || '').trim());
}

/**
 * RDS / pooler TLS often presents a chain Node does not trust by default
 * ("self-signed certificate in certificate chain"). Strip URI sslmode so
 * `pg-connection-string` cannot force verify-full, then set ssl explicitly.
 */
function buildPoolConfig() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  let connectionString = raw;
  try {
    const u = new URL(raw);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('ssl');
    u.searchParams.delete('sslrootcert');
    u.searchParams.delete('sslcert');
    u.searchParams.delete('sslkey');
    connectionString = u.toString();
  } catch {
    // keep raw if not a parseable URL
  }

  const maxRaw = Number(process.env.STOREFRONT_DB_POOL_MAX || 3);
  const max = Number.isFinite(maxRaw) ? Math.min(10, Math.max(1, Math.floor(maxRaw))) : 3;
  const strictTls =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === '1';

  return {
    connectionString,
    // Keep small: Supabase/RDS session poolers cap concurrent clients (EMAXCONNSESSION).
    ssl: strictTls ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
    max,
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 8_000,
  };
}

export function getPool() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    pool = new Pool(buildPoolConfig());
    pool.on('error', (err) => {
      console.warn('[storefront] idle Postgres client error:', err?.message || err);
    });
  }
  return pool;
}

/**
 * @param {string} text
 * @param {unknown[]} [params]
 */
export async function query(text, params = []) {
  return getPool().query(text, params);
}

/**
 * Run work inside a transaction with RLS tenant GUC set (same as customer API
 * `setTenantContext`). FORCE RLS on `shop_products` requires `app.current_shop_id`
 * or every product query returns 0 rows.
 *
 * @template T
 * @param {string | null | undefined} shopId
 * @param {(query: (text: string, params?: unknown[]) => Promise<import('pg').QueryResult>) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withShopContext(shopId, fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (shopId) {
      await client.query(`SELECT set_config('app.current_shop_id', $1, true)`, [
        String(shopId),
      ]);
    }
    const scopedQuery = (text, params = []) => client.query(text, params);
    const result = await fn(scopedQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Single statement with tenant GUC.
 * @param {string | null | undefined} shopId
 * @param {string} text
 * @param {unknown[]} [params]
 */
export async function queryWithShop(shopId, text, params = []) {
  if (!shopId) return query(text, params);
  return withShopContext(shopId, (q) => q(text, params));
}
