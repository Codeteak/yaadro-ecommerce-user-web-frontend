import { formatInrFromMinor, parseMinorInt } from './currencyMinor';

export function minPurchaseUserMessage(minPurchaseMinor, remainingMinor) {
  return `Add ${formatInrFromMinor(remainingMinor)} more to meet this shop's ${formatInrFromMinor(minPurchaseMinor)} minimum order.`;
}

export function minPurchaseBannerMessage(minPurchaseMinor, remainingMinor) {
  const min = parseMinorInt(minPurchaseMinor);
  const remaining = parseMinorInt(remainingMinor);
  if (min <= 0 || remaining <= 0) return null;
  return minPurchaseUserMessage(min, remaining);
}

export function parseMinPurchaseFromSummary(summary = {}) {
  const rawMin = summary.min_purchase_minor ?? summary.minPurchaseMinor;
  const hasTrustedMin = rawMin != null && rawMin !== '';
  const minPurchaseMinor = parseMinorInt(rawMin);
  const rawRemaining =
    summary.min_purchase_remaining_minor ?? summary.minPurchaseRemainingMinor;
  const hasTrustedRemaining = rawRemaining != null && rawRemaining !== '';
  const subtotalMinor = parseMinorInt(summary.subtotal_minor ?? summary.subtotalMinor);
  const minPurchaseRemainingMinor = hasTrustedRemaining
    ? parseMinorInt(rawRemaining)
    : hasTrustedMin
      ? Math.max(0, minPurchaseMinor - subtotalMinor)
      : 0;
  return {
    minPurchaseMinor,
    minPurchaseRemainingMinor,
    hasTrustedMinPurchase: hasTrustedMin,
  };
}
