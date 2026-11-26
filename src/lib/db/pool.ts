import "server-only";

import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function sanitizeConnectionString(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    return url.toString();
  } catch {
    return raw;
  }
}

function needsSsl(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getPool(): Pool {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) throw new Error("DATABASE_URL is not set.");
  if (!pool) {
    const connectionString = sanitizeConnectionString(raw);
    const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
    pool = new Pool({
      connectionString,
      // Multi-shop `/home` needs headroom; override with STOREFRONT_DB_POOL_MAX.
      max: envInt("STOREFRONT_DB_POOL_MAX", 10, 2, 30),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: envInt(
        "STOREFRONT_DB_CONNECT_TIMEOUT_MS",
        5_000,
        1_000,
        15_000,
      ),
      ssl: needsSsl(connectionString) ? { rejectUnauthorized } : undefined,
    });
  }
  return pool;
}

/**
 * Run reads for one shop inside a transaction so the tenant setting
 * applies to every statement and is cleared when the connection returns.
 */
export async function withShop<T>(
  shopId: string,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("select set_config('app.current_shop_id', $1, true)", [shopId]);
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection is discarded by the pool if rollback fails.
    }
    throw error;
  } finally {
    client.release();
  }
}
