/**
 * Customer OTP login, refresh, and logout.
 * POST /api/auth/otp/request
 * POST /api/auth/otp/verify
 * POST /api/auth/refresh
 * POST /api/auth/logout
 */

import { request, shopId } from "@/lib/api/client";
import { ApiError, AuthApiError } from "@/lib/api/errors";
import { logger } from "@/lib/api/logger";
import {
  clearCustomerSession,
  getAccessToken,
  getRefreshToken,
  hasCustomerSession,
  saveCustomerSession,
  subscribeCustomerSession,
  type CustomerSession,
} from "@/lib/api/session";

export type { CustomerSession };
export { AuthApiError, clearCustomerSession, hasCustomerSession, saveCustomerSession, subscribeCustomerSession };

type SessionResponse = {
  accessToken?: string;
  refreshToken?: string;
};

function requireShop(): string {
  const id = shopId();
  if (!id) throw new AuthApiError("This shop is not configured.", 0, "NETWORK");
  return id;
}

export async function requestCustomerOtp(phone: string): Promise<void> {
  const id = requireShop();
  try {
    await request({
      method: "POST",
      path: "/api/auth/otp/request",
      body: { phone, shopId: id },
      idempotent: false,
    });
  } catch (error) {
    throw asAuthError(error, "Could not send the OTP. Try again.");
  }
}

export async function verifyCustomerOtp(phone: string, code: string): Promise<CustomerSession> {
  const id = requireShop();
  try {
    const body = await request<SessionResponse>({
      method: "POST",
      path: "/api/auth/otp/verify",
      body: { phone, shopId: id, code },
      idempotent: false,
    });
    if (!body.accessToken || !body.refreshToken) {
      throw new AuthApiError("Login did not return a session. Try again.", 502, "SERVER_ERROR");
    }
    logger.auth("login");
    return { accessToken: body.accessToken, refreshToken: body.refreshToken };
  } catch (error) {
    throw asAuthError(error, "Could not verify the OTP. Try again.");
  }
}

/** Ends the server session, then clears this device. */
export async function logoutCustomer(): Promise<void> {
  const refreshToken = getRefreshToken();
  const access = getAccessToken();
  try {
    if (access || refreshToken) {
      await request({
        method: "POST",
        path: "/api/auth/logout",
        auth: Boolean(access),
        skipRefresh: true,
        idempotent: true,
        body: refreshToken ? { refreshToken } : {},
      });
    }
  } catch (error) {
    logger.warn("logout request failed", {
      code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
    });
  } finally {
    logger.auth("logout");
    clearCustomerSession();
  }
}

function asAuthError(error: unknown, fallback: string): AuthApiError {
  if (error instanceof AuthApiError) return error;
  if (error instanceof ApiError) {
    return new AuthApiError(error.message || fallback, error.status, error.code);
  }
  return new AuthApiError(fallback);
}
