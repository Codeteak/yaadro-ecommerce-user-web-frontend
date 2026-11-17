/**
 * Signed-in coupons.
 * GET /api/storefront/coupons
 * Sample coupons stay in `coupons.ts` for the playground.
 */

import { request } from "@/lib/api/client";
import type { SampleCoupon } from "@/lib/sample-coupons";

type Benefit = {
  kind?: string;
  percentBps?: number;
  amountMinor?: number;
};

type RawCoupon = {
  id?: string;
  code?: string;
  promotionName?: string;
  endsAt?: string | null;
  minSubtotalMinor?: number | null;
  benefits?: Benefit[];
  eligibility?: { applicable?: boolean };
};

function rupees(minor: number): number {
  return Math.round(minor / 100);
}

function mapCoupon(row: RawCoupon): SampleCoupon | null {
  if (!row.id || !row.code) return null;
  const benefit = row.benefits?.[0];
  const min = row.minSubtotalMinor != null ? rupees(row.minSubtotalMinor) : 0;
  const percent = benefit?.percentBps != null ? benefit.percentBps / 100 : 0;
  const flat = benefit?.amountMinor != null ? rupees(benefit.amountMinor) : 0;
  const discount =
    percent > 0
      ? { type: "percent" as const, percent, maxOff: flat || percent }
      : { type: "flat" as const, amount: flat };
  const until = row.endsAt ? new Date(row.endsAt) : null;
  const validUntilLabel =
    until && !Number.isNaN(until.getTime())
      ? until.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "While stocks last";
  return {
    id: row.id,
    title: row.promotionName || row.code,
    subtitle: min > 0 ? `Min order ₹${min}` : "No minimum order",
    code: row.code,
    status: "active",
    section: "Available",
    issuedLabel: validUntilLabel,
    discountLabel: percent > 0 ? `${percent}% off` : flat > 0 ? `₹${flat} off` : "Offer",
    minOrderLabel: min > 0 ? `₹${min}` : "None",
    validUntilLabel,
    terms: ["The shop confirms the discount when you place the order."],
    minOrder: min,
    discount,
  };
}

export async function listShopCoupons(
  input?: { cartSubtotalMinor?: number; onlyApplicable?: boolean },
  signal?: AbortSignal,
): Promise<SampleCoupon[]> {
  const body = await request<{ coupons?: RawCoupon[] }>({
    method: "GET",
    path: "/api/storefront/coupons",
    auth: true,
    query: {
      cartSubtotalMinor: input?.cartSubtotalMinor,
      onlyApplicable: input?.onlyApplicable ? "true" : undefined,
    },
    signal,
  });
  return (body.coupons ?? [])
    .map(mapCoupon)
    .filter((coupon): coupon is SampleCoupon => Boolean(coupon));
}
