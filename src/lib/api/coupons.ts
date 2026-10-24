/**
 * Coupons API façade.
 *
 * Today: wraps sample coupons so the coupons page reads like a client.
 * Later: replace with `fetch` when a coupons API exists.
 * No fake network delays.
 */
import {
  SAMPLE_COUPONS,
  type SampleCoupon,
} from "@/lib/sample-coupons";

export function listCoupons(): SampleCoupon[] {
  return SAMPLE_COUPONS;
}
