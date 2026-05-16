import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { formatInrFromMinor, parseMinorInt } from './currencyMinor';

function normalizeBenefit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    kind: raw.kind || '',
    percentBps: raw.percentBps ?? raw.percent_bps ?? null,
    amountMinor: parseMinorInt(raw.amountMinor ?? raw.amount_minor),
    minSubtotalMinor: parseMinorInt(raw.minSubtotalMinor ?? raw.min_subtotal_minor),
  };
}

function normalizeCoupon(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const benefits = Array.isArray(raw.benefits)
    ? raw.benefits.map(normalizeBenefit).filter(Boolean)
    : [];
  const eligibility = raw.eligibility && typeof raw.eligibility === 'object' ? raw.eligibility : {};
  return {
    id: raw.id,
    code: String(raw.code || '').toUpperCase(),
    promotionId: raw.promotionId ?? raw.promotion_id ?? null,
    promotionName: raw.promotionName ?? raw.promotion_name ?? '',
    startsAt: raw.startsAt ?? raw.starts_at ?? null,
    endsAt: raw.endsAt ?? raw.ends_at ?? null,
    minSubtotalMinor: parseMinorInt(raw.minSubtotalMinor ?? raw.min_subtotal_minor),
    firstOrderOnly: !!raw.firstOrderOnly || !!raw.first_order_only,
    newCustomerOnly: !!raw.newCustomerOnly || !!raw.new_customer_only,
    benefits,
    eligibility: {
      applicable: eligibility.applicable !== false,
      ineligibilityCodes: Array.isArray(eligibility.ineligibilityCodes)
        ? eligibility.ineligibilityCodes
        : Array.isArray(eligibility.ineligibility_codes)
          ? eligibility.ineligibility_codes
          : [],
    },
  };
}

/**
 * Human-readable benefit line for coupon list UI.
 */
export function formatCouponBenefitLabel(benefit) {
  if (!benefit?.kind) return 'Special offer';
  const kind = benefit.kind;
  const pct =
    benefit.percentBps != null ? Math.round(Number(benefit.percentBps) / 100) : null;
  const amount = formatInrFromMinor(benefit.amountMinor);
  const minCart = benefit.minSubtotalMinor
    ? formatInrFromMinor(benefit.minSubtotalMinor)
    : null;

  switch (kind) {
    case 'cart_percent_off':
      return pct != null ? `${pct}% off your order` : 'Percent off your order';
    case 'cart_fixed_off':
      return `${amount} off your order`;
    case 'cart_percent_off_if_subtotal_above':
      return pct != null && minCart
        ? `${pct}% off on orders above ${minCart}`
        : 'Percent off on larger orders';
    case 'cart_fixed_off_if_subtotal_above':
      return minCart ? `${amount} off on orders above ${minCart}` : `${amount} off on larger orders`;
    case 'category_percent_off':
      return pct != null ? `${pct}% off selected categories` : 'Category discount';
    default:
      return 'Special offer';
  }
}

export function formatCouponMinCartHint(coupon, cartSubtotalMinor) {
  const min = parseMinorInt(coupon?.minSubtotalMinor);
  if (!min) return null;
  const cart = parseMinorInt(cartSubtotalMinor);
  if (cart >= min) return null;
  const shortfall = min - cart;
  return `Add ${formatInrFromMinor(shortfall)} more to use this coupon`;
}

/**
 * List storefront coupons for checkout.
 *
 * @param {{ cartSubtotalMinor?: number, code?: string, onlyApplicable?: boolean }} params
 */
export async function listStorefrontCoupons({
  cartSubtotalMinor,
  code,
  onlyApplicable = false,
} = {}) {
  const shopId = await resolveShopId();
  if (!shopId) {
    throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/coupons).');
  }

  const query = {};
  if (cartSubtotalMinor != null && Number.isFinite(Number(cartSubtotalMinor))) {
    query.cartSubtotalMinor = parseMinorInt(cartSubtotalMinor);
  }
  if (code && String(code).trim()) {
    query.code = String(code).trim();
  }
  if (onlyApplicable) {
    query.onlyApplicable = 'true';
  }

  const res = await apiFetchRoot('/storefront/coupons', {
    method: 'GET',
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
    query,
  });

  const settings = res?.settings && typeof res.settings === 'object' ? res.settings : {};
  const coupons = Array.isArray(res?.coupons)
    ? res.coupons.map(normalizeCoupon).filter(Boolean)
    : [];

  return {
    promotionsPaused: !!res?.promotionsPaused || !!res?.promotions_paused,
    settings: {
      maxCouponsPerOrder: settings.maxCouponsPerOrder ?? settings.max_coupons_per_order ?? 1,
      allowCombineAutoCampaigns:
        settings.allowCombineAutoCampaigns ?? settings.allow_combine_auto_campaigns ?? true,
      firstCouponEligibilityDays:
        settings.firstCouponEligibilityDays ?? settings.first_coupon_eligibility_days ?? null,
    },
    coupons,
  };
}
