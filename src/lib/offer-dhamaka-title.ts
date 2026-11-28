/** Title keywords that mark a home shelf as Offer Dhamaka (case-insensitive). */
const OFFER_DHAMAKA_TITLE_RE =
  /\b(dhamaka|price\s*drop|special\s*offers?|special\s*deals?)\b/i;

export function isOfferDhamakaSectionTitle(title: string): boolean {
  return OFFER_DHAMAKA_TITLE_RE.test(title.trim());
}

/**
 * Display count for CTAs / page chrome.
 * Exact under 10; caps at “10+” so 12 products → “10+ deals”.
 */
export function offerDhamakaCountLabel(total: number): string {
  if (total <= 0) return "0 deals";
  if (total === 1) return "1 deal";
  if (total >= 10) return "10+ deals";
  return `${total} deals`;
}

/** Home See-all CTA — e.g. 12 products → “See all 10+ deals”. */
export function offerDhamakaSeeAllLabel(total: number): string {
  if (total <= 0) return "See all deals";
  return `See all ${offerDhamakaCountLabel(total)}`;
}
