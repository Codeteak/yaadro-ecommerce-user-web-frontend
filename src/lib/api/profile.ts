/**
 * Signed-in profile.
 * GET/PATCH /api/me/profile
 * POST /api/storefront/profile
 * POST /api/storefront/phone/change/request-otp
 * POST /api/storefront/phone/change/verify-otp
 */

import { request } from "@/lib/api/client";

export type CustomerAddress = {
  line1?: string | null;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  raw?: string | null;
};

export type CustomerProfile = {
  user: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  customer: {
    id: string;
    displayName: string | null;
  };
  address: CustomerAddress | null;
};

export function getMyProfile(signal?: AbortSignal): Promise<CustomerProfile> {
  return request<CustomerProfile>({
    method: "GET",
    path: "/api/me/profile",
    auth: true,
    signal,
  });
}

export function updateMyProfile(
  patch: {
    name?: string | null;
    displayName?: string | null;
    address?: CustomerAddress;
  },
  signal?: AbortSignal,
): Promise<CustomerProfile> {
  return request<CustomerProfile>({
    method: "PATCH",
    path: "/api/me/profile",
    auth: true,
    idempotent: true,
    signal,
    body: patch,
  });
}

export function updateDisplayName(displayName: string, signal?: AbortSignal): Promise<void> {
  return request<void>({
    method: "POST",
    path: "/api/storefront/profile",
    auth: true,
    idempotent: true,
    signal,
    body: { displayName },
  });
}

export function requestPhoneChange(newPhone: string, signal?: AbortSignal): Promise<unknown> {
  return request({
    method: "POST",
    path: "/api/storefront/phone/change/request-otp",
    auth: true,
    idempotent: false,
    signal,
    body: { newPhone },
  });
}

export function verifyPhoneChange(
  newPhone: string,
  code: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return request({
    method: "POST",
    path: "/api/storefront/phone/change/verify-otp",
    auth: true,
    idempotent: false,
    signal,
    body: { newPhone, code },
  });
}
