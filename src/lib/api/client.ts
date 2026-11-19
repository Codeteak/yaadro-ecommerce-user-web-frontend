/**
 * One fetch client for the shop API.
 * Auth header, request id, normalized errors, single-flight refresh, and
 * retries only for idempotent calls that failed on the network or with 5xx/429.
 */

import {
  ApiError,
  backoffMs,
  friendlyMessage,
  normalizeDetails,
  parseRetryAfter,
  shouldRetry,
  type ApiErrorShape,
} from "@/lib/api/errors";
import { logger } from "@/lib/api/logger";
import {
  clearCustomerSession,
  getAccessToken,
  getRefreshToken,
  notifySessionExpired,
  saveCustomerSession,
} from "@/lib/api/session";

export type QueryValue = string | number | boolean | null | undefined;

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Send the customer access token. */
  auth?: boolean;
  /** Safe to replay. Creating an order is not, unless the caller passes an idempotency key. */
  idempotent?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  shopId?: string | null;
  /** Include cookies (serviceability cookie on location check). */
  credentials?: RequestCredentials;
  /** Do not try a refresh when this call returns 401. */
  skipRefresh?: boolean;
};

type Success<T> = { ok: true; status: number; data: T; requestId?: string };

const inflight = new Map<string, Promise<Success<unknown>>>();
let refreshInFlight: Promise<boolean> | null = null;

export function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw) {
    throw new ApiError({
      status: 0,
      code: "NETWORK",
      message: "The shop is not configured yet.",
    });
  }
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

export function shopId(): string {
  return process.env.NEXT_PUBLIC_SHOP_ID?.trim() ?? "";
}

/** ngrok free answers browser requests with a warning page that has no CORS headers. */
function ngrokBrowserHeaders(origin: string): Record<string, string> {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (
      host === "ngrok-free.dev" ||
      host.endsWith(".ngrok-free.dev") ||
      host.endsWith(".ngrok.io") ||
      host.endsWith(".ngrok.app")
    ) {
      return { "ngrok-skip-browser-warning": "true" };
    }
  } catch {
    return {};
  }
  return {};
}

function timeoutMs(): number {
  const raw = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 15_000;
}

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req_${Date.now()}`;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // The browser stays on this site. next.config.ts forwards /shop-api to the
  // real API, including an ngrok URL used by another device. A direct browser
  // call to ngrok is blocked because ngrok's warning page has no CORS header.
  const base =
    typeof window === "undefined"
      ? apiOrigin()
      : `${window.location.origin}/shop-api`;
  const url = new URL(`${base}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function errorFromResponse(response: Response, body: unknown, id: string): ApiError {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const envelope =
    record?.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>)
      : null;
  const status = response.status;
  const code = typeof envelope?.code === "string" ? envelope.code : `HTTP_${status}`;
  const requestIdHeader = response.headers.get("x-request-id") ?? undefined;
  const bodyRequestId = typeof record?.requestId === "string" ? record.requestId : undefined;
  const message = friendlyMessage(status, code, [envelope?.message, record?.message]);
  return new ApiError({
    status,
    code,
    message,
    details: normalizeDetails(envelope?.details),
    requestId: bodyRequestId || requestIdHeader || id,
    retryAfterSec: parseRetryAfter(response.headers.get("retry-after")),
  });
}

function networkError(id: string, timedOut: boolean): ApiError {
  return new ApiError({
    status: 0,
    code: timedOut ? "TIMEOUT" : "NETWORK",
    message: timedOut
      ? "That took too long. Check your connection and try again."
      : "You appear to be offline. Check your connection and try again.",
    requestId: id,
  });
}

/** Loads a fresh access token after a reload. Clears a dead refresh token. */
export async function restoreCustomerSession(): Promise<boolean> {
  if (getAccessToken()) return true;
  if (!getRefreshToken()) return false;
  const ok = await refreshAccessToken();
  if (!ok) clearCustomerSession();
  return ok;
}

let restoreLatch: Promise<boolean> | null = null;

/**
 * Single-flight session restore for boot. UI should wait on this before
 * firing auth APIs — a refresh token alone is not an access token yet.
 */
export function ensureCustomerSessionRestored(): Promise<boolean> {
  if (!restoreLatch) {
    restoreLatch = restoreCustomerSession().finally(() => {
      // Keep the settled promise so later callers reuse the result.
    });
  }
  return restoreLatch;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const data = await request<{ accessToken?: string; refreshToken?: string }>({
        method: "POST",
        path: "/api/auth/refresh",
        body: { refreshToken },
        auth: false,
        skipRefresh: true,
        idempotent: false,
      });
      if (!data.accessToken || !data.refreshToken) return false;
      saveCustomerSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      logger.auth("refresh.success");
      return true;
    } catch (error) {
      logger.auth("refresh.failure");
      if (error instanceof ApiError && error.status !== 0) return false;
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function execute<T>(input: ApiRequest, refreshed: boolean): Promise<Success<T>> {
  const method = input.method ?? "GET";
  const id = requestId();
  const url = buildUrl(input.path, input.query);
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-request-id": id,
    ...ngrokBrowserHeaders(apiOrigin()),
  };
  const resolvedShop = input.shopId === undefined ? shopId() : input.shopId;
  if (resolvedShop) headers["x-shop-id"] = resolvedShop;
  if (input.body !== undefined) headers["content-type"] = "application/json";
  if (input.auth) {
    const token = getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;

  const controller = new AbortController();
  const clearTimer = armTimeout(input.timeoutMs ?? timeoutMs(), controller);
  const onAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onAbort);

  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: controller.signal,
      credentials: input.credentials ?? "omit",
      cache: method === "GET" ? "default" : "no-store",
    });
  } catch (error) {
    const timedOut = controller.signal.aborted && !input.signal?.aborted;
    const apiError = networkError(id, timedOut);
    logger.api({
      method,
      url,
      status: null,
      durationMs: Date.now() - started,
      requestId: id,
      error: apiError.toJSON(),
    });
    if (error instanceof Error && error.name === "AbortError" && input.signal?.aborted) {
      throw error;
    }
    throw apiError;
  } finally {
    clearTimer();
    input.signal?.removeEventListener("abort", onAbort);
  }

  const body = await readBody(response);
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const apiError = errorFromResponse(response, body, id);
    logger.api({
      method,
      url,
      status: response.status,
      durationMs,
      requestId: apiError.requestId,
      error: apiError.toJSON(),
    });
    if (response.status === 401 && input.auth && !input.skipRefresh && !refreshed) {
      const ok = await refreshAccessToken();
      if (ok) return execute<T>(input, true);
      logger.auth("forced-logout");
      notifySessionExpired();
    }
    throw apiError;
  }

  logger.api({
    method,
    url,
    status: response.status,
    durationMs,
    requestId: response.headers.get("x-request-id") ?? id,
  });
  return {
    ok: true,
    status: response.status,
    data: body as T,
    requestId: response.headers.get("x-request-id") ?? id,
  };
}

function armTimeout(ms: number, controller: AbortController): () => void {
  const handle = setTimeout(() => controller.abort(), ms);
  return () => clearTimeout(handle);
}

export async function request<T>(input: ApiRequest): Promise<T> {
  const method = input.method ?? "GET";
  const idempotent = input.idempotent ?? (method === "GET" || method === "HEAD");
  const shopKey = input.shopId === undefined ? shopId() : (input.shopId ?? "");
  const key =
    method === "GET"
      ? `${method} ${buildUrl(input.path, input.query)} auth:${input.auth ? "1" : "0"} shop:${shopKey}`
      : null;

  if (key && inflight.has(key)) {
    const shared = await inflight.get(key)!;
    return shared.data as T;
  }

  const run = (async () => {
    const maxAttempts = 3;
    let last: ApiError | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await execute<T>({ ...input, idempotent }, false);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        last = error;
        if (
          !shouldRetry({
            method,
            status: error.status || null,
            attempt: attempt + 1,
            maxAttempts,
            idempotent,
          })
        ) {
          throw error;
        }
        await delay(backoffMs(attempt, error.retryAfterSec));
      }
    }
    throw last ?? new ApiError({ status: 0, code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." });
  })();

  if (key) {
    inflight.set(key, run as Promise<Success<unknown>>);
    try {
      const result = await run;
      return result.data;
    } finally {
      inflight.delete(key);
    }
  }

  const result = await run;
  return result.data;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function publicGet<T>(path: string, init?: Omit<ApiRequest, "path" | "method">): Promise<T> {
  return request<T>({ ...init, method: "GET", path, auth: false });
}

export type { ApiErrorShape };
