/**
 * The shop stores one delivery address per customer.
 * GET/POST/PATCH/DELETE /api/storefront/address
 */

import { request } from "@/lib/api/client";
import type { CustomerAddress } from "@/lib/api/profile";

export function getMyAddress(signal?: AbortSignal): Promise<{ address: CustomerAddress | null }> {
  return request({
    method: "GET",
    path: "/api/storefront/address",
    auth: true,
    signal,
  });
}

export function saveMyAddress(address: CustomerAddress, signal?: AbortSignal): Promise<void> {
  return request({
    method: "POST",
    path: "/api/storefront/address",
    auth: true,
    idempotent: true,
    signal,
    body: address,
  });
}

export function patchMyAddress(address: Partial<CustomerAddress>, signal?: AbortSignal): Promise<void> {
  return request({
    method: "PATCH",
    path: "/api/storefront/address",
    auth: true,
    idempotent: true,
    signal,
    body: address,
  });
}

export function deleteMyAddress(signal?: AbortSignal): Promise<void> {
  return request({
    method: "DELETE",
    path: "/api/storefront/address",
    auth: true,
    signal,
  });
}

export type LocationCheck = {
  serviceable: boolean;
  distanceM: number | null;
  maxRadiusM: number | null;
};

export function checkDeliveryLocation(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<LocationCheck> {
  return request<LocationCheck>({
    method: "POST",
    path: "/api/storefront/location/check",
    credentials: "include",
    idempotent: true,
    signal,
    body: { lat, lng },
  });
}
