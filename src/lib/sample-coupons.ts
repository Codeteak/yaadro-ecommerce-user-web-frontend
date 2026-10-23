export type CouponStatus = "active" | "used" | "expired";

export type SampleCoupon = {
  id: string;
  /** Short display title (shown on the card). */
  title: string;
  /** Merchant / offer line under the title. */
  subtitle: string;
  /** Code the shopper copies. */
  code: string;
  status: CouponStatus;
  /** Relative / calendar section label, e.g. "Available" or "January 2025". */
  section: string;
  /** Card footer timestamp line. */
  issuedLabel: string;
  /** Detail sheet fields. */
  discountLabel: string;
  minOrderLabel: string;
  validUntilLabel: string;
  terms: string[];
  /** Local apply rules (UI sample only — not checkout-authoritative). */
  minOrder: number;
  discount:
    | { type: "percent"; percent: number; maxOff: number }
    | { type: "flat"; amount: number };
};

/**
 * UI-only sample coupons for playground (and later `/coupons` until an API exists).
 * Not authoritative for checkout discounts.
 */
export const SAMPLE_COUPONS: SampleCoupon[] = [
  {
    id: "c-fresh10",
    title: "Fresh basket 10% off",
    subtitle: "Yaadro grocery · Min ₹499",
    code: "FRESH10",
    status: "active",
    section: "Available",
    issuedLabel: "Oct 20, 2026 · 11.00 AM",
    discountLabel: "10% off (max ₹150)",
    minOrderLabel: "Minimum order ₹499",
    validUntilLabel: "Valid until 31 Oct 2026",
    terms: [
      "Valid on grocery items only.",
      "One coupon per order.",
      "Cannot be combined with other offers.",
    ],
    minOrder: 499,
    discount: { type: "percent", percent: 10, maxOff: 150 },
  },
  {
    id: "c-dairy50",
    title: "₹50 off dairy",
    subtitle: "Dairy & eggs aisle",
    code: "DAIRY50",
    status: "active",
    section: "Available",
    issuedLabel: "Oct 18, 2026 · 04.15 PM",
    discountLabel: "Flat ₹50 off",
    minOrderLabel: "Minimum order ₹299 on dairy",
    validUntilLabel: "Valid until 28 Oct 2026",
    terms: [
      "Applies to dairy and eggs category only.",
      "One coupon per order.",
    ],
    minOrder: 299,
    discount: { type: "flat", amount: 50 },
  },
  {
    id: "c-welcome",
    title: "Welcome ₹100",
    subtitle: "First order bonus",
    code: "WELCOME100",
    status: "used",
    section: "Earlier",
    issuedLabel: "Oct 12, 2026 · 09.40 AM",
    discountLabel: "Flat ₹100 off",
    minOrderLabel: "Minimum order ₹599",
    validUntilLabel: "Used on 12 Oct 2026",
    terms: [
      "New customers only.",
      "Already redeemed on a previous order.",
    ],
    minOrder: 599,
    discount: { type: "flat", amount: 100 },
  },
  {
    id: "c-weekend",
    title: "Weekend snacks 15%",
    subtitle: "Snacks & beverages",
    code: "SNACK15",
    status: "expired",
    section: "Earlier",
    issuedLabel: "Sep 28, 2026 · 06.00 PM",
    discountLabel: "15% off snacks",
    minOrderLabel: "Minimum order ₹199",
    validUntilLabel: "Expired 5 Oct 2026",
    terms: [
      "Valid on weekends only while the offer was live.",
      "This code can no longer be applied.",
    ],
    minOrder: 199,
    discount: { type: "percent", percent: 15, maxOff: 200 },
  },
];

export function couponsBySection(
  coupons: SampleCoupon[] = SAMPLE_COUPONS,
): { section: string; items: SampleCoupon[] }[] {
  const order: string[] = [];
  const map = new Map<string, SampleCoupon[]>();
  for (const c of coupons) {
    if (!map.has(c.section)) {
      order.push(c.section);
      map.set(c.section, []);
    }
    map.get(c.section)!.push(c);
  }
  return order.map((section) => ({ section, items: map.get(section)! }));
}

export function findCouponByCode(code: string): SampleCoupon | undefined {
  const normalized = code.trim().toUpperCase();
  return SAMPLE_COUPONS.find((c) => c.code.toUpperCase() === normalized);
}

function discountAmount(coupon: SampleCoupon, subtotal: number): number {
  if (coupon.discount.type === "percent") {
    return Math.min(
      coupon.discount.maxOff,
      Math.round((subtotal * coupon.discount.percent) / 100),
    );
  }
  return Math.min(coupon.discount.amount, subtotal);
}

export type PromoApplyResult =
  | { ok: true; coupon: SampleCoupon; discount: number }
  | { ok: false; message: string };

/** Local promo apply for cart UI preview — not a real checkout discount. */
export function applySamplePromo(
  code: string,
  subtotal: number,
): PromoApplyResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a promo code" };
  }
  const coupon = findCouponByCode(trimmed);
  if (!coupon) {
    return { ok: false, message: "Code not found" };
  }
  if (coupon.status === "used") {
    return { ok: false, message: "This code was already used" };
  }
  if (coupon.status === "expired") {
    return { ok: false, message: "This code has expired" };
  }
  if (subtotal < coupon.minOrder) {
    return {
      ok: false,
      message: `Add ₹${coupon.minOrder - subtotal} more to use this code`,
    };
  }
  const discount = discountAmount(coupon, subtotal);
  if (discount <= 0) {
    return { ok: false, message: "Code can’t be applied to this basket" };
  }
  return { ok: true, coupon, discount };
}
