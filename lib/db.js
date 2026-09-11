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

export function getPool() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    // Keep small: Supabase/RDS session poolers cap concurrent clients (EMAXCONNSESSION).
    // Catalog revision polling + product list must share this budget.
    const maxRaw = Number(process.env.STOREFRONT_DB_POOL_MAX || 3);
    const max = Number.isFinite(maxRaw) ? Math.min(10, Math.max(1, Math.floor(maxRaw))) : 3;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 8_000,
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
