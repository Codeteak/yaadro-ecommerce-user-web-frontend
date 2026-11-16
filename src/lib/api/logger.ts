/**
 * Shop API log. Debug lines stay off in production.
 * Tokens, OTPs, passwords, and phone numbers are never written.
 */

import { redactUrl, type ApiErrorShape } from "@/lib/api/errors";

type Level = "debug" | "info" | "warn" | "error";

export type ApiLogEvent = {
  method: string;
  url: string;
  status: number | null;
  durationMs: number;
  requestId?: string;
  error?: ApiErrorShape;
};

type Reporter = (event: ApiLogEvent) => void;

let reporter: Reporter | null = null;

/** Production hook (Sentry, Datadog). Receives the normalized error only — no tokens. */
export function setApiErrorReporter(next: Reporter | null) {
  reporter = next;
}

function enabled(level: Level): boolean {
  if (level === "debug") return process.env.NODE_ENV !== "production";
  return true;
}

function write(level: Level, message: string, extra?: Record<string, unknown>) {
  if (!enabled(level)) return;
  const line = extra ? { message, ...extra } : message;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  debug(message: string, extra?: Record<string, unknown>) {
    write("debug", message, extra);
  },
  info(message: string, extra?: Record<string, unknown>) {
    write("info", message, extra);
  },
  warn(message: string, extra?: Record<string, unknown>) {
    write("warn", message, extra);
  },
  error(message: string, extra?: Record<string, unknown>) {
    write("error", message, extra);
  },
  api(event: ApiLogEvent) {
    const payload = {
      method: event.method,
      url: redactUrl(event.url),
      status: event.status,
      durationMs: event.durationMs,
      requestId: event.requestId,
      code: event.error?.code,
    };
    // console.error opens the Next.js dev overlay for expected HTTP failures.
    write(event.error ? "warn" : "debug", "api", payload);
    if (event.error) reporter?.(event);
  },
  auth(event: "login" | "logout" | "refresh.success" | "refresh.failure" | "forced-logout") {
    write(event.endsWith("failure") || event === "forced-logout" ? "warn" : "info", "auth", {
      event,
    });
  },
};
