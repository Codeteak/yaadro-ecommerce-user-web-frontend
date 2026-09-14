/**
 * Short, customer-facing Buy X Get Y copy.
 * Prefer product names when known; never say "unlock a free item".
 */

import { isCrossSkuBundleRule } from './productUtils';

function qtyPair(rule) {
  const buy = Number(rule?.buy_qty ?? rule?.buyQty);
  const get = Number(rule?.get_qty ?? rule?.getQty);
  return {
    buy: Number.isFinite(buy) && buy > 0 ? Math.floor(buy) : 1,
    get: Number.isFinite(get) && get > 0 ? Math.floor(get) : 1,
  };
}

function trimName(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  return s.length > 28 ? `${s.slice(0, 26)}…` : s;
}

/** Same-SKU: "Buy 1 Get 1 Free" / "Buy 2 Get 1 Free" */
export function formatSameSkuBxgyLabel(buyQty, getQty) {
  const buy = Number.isFinite(Number(buyQty)) && Number(buyQty) > 0 ? Math.floor(Number(buyQty)) : 1;
  const get = Number.isFinite(Number(getQty)) && Number(getQty) > 0 ? Math.floor(Number(getQty)) : 1;
  return `Buy ${buy} Get ${get} Free`;
}

/** Cross: "Buy A → B free" or "Buy 1 → get 1 free" */
export function formatCrossBxgyLabel({ buyQty, getQty, buyName, getName } = {}) {
  const buy = Number.isFinite(Number(buyQty)) && Number(buyQty) > 0 ? Math.floor(Number(buyQty)) : 1;
  const get = Number.isFinite(Number(getQty)) && Number(getQty) > 0 ? Math.floor(Number(getQty)) : 1;
  const left = trimName(buyName);
  const right = trimName(getName);
  if (left && right) {
    if (buy === 1 && get === 1) return `Buy ${left} → ${right} free`;
    return `Buy ${buy} ${left} → ${get} ${right} free`;
  }
  if (buy === 1 && get === 1) return 'Buy this → get that free';
  return `Buy ${buy} → get ${get} free`;
}

/** Cart / list group header from a bundle rule. */
export function formatBxgyRuleLabel(rule, { buyName, getName, role = 'same' } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  const { buy, get } = qtyPair(rule);
  if (role === 'get') {
    const payFor = trimName(buyName);
    return payFor ? `Free with ${payFor}` : 'Free with offer';
  }
  if (isCrossSkuBundleRule(rule) || role === 'buy') {
    return formatCrossBxgyLabel({ buyQty: buy, getQty: get, buyName, getName });
  }
  return formatSameSkuBxgyLabel(buy, get);
}

/** Compact ribbon / badge for product tiles. */
export function formatBxgyRibbon(rule, { role = 'same', compact = true } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  if (role === 'get') return 'FREE';
  if (isCrossSkuBundleRule(rule) || role === 'buy') return compact ? 'BUY' : formatBxgyRuleLabel(rule, { role: 'buy' });
  const { buy, get } = qtyPair(rule);
  if (compact) {
    if (buy === 1 && get === 1) return 'B1G1';
    return `B${buy}G${get}`;
  }
  return formatSameSkuBxgyLabel(buy, get);
}

/** Paid-line badge in cart: BUY (cross) or B1G1 / BOGO (same). */
export function formatBxgyPaidBadge(rule) {
  if (!rule || typeof rule !== 'object') return 'OFFER';
  if (isCrossSkuBundleRule(rule)) return 'BUY';
  const { buy, get } = qtyPair(rule);
  if (buy === 1 && get === 1) return 'BOGO';
  return `B${buy}G${get}`;
}

export function rewardProductIdFromRule(rule) {
  if (!rule || typeof rule !== 'object') return '';
  return String(rule.reward_shop_product_id ?? rule.rewardShopProductId ?? '').trim();
}

export function buyProductIdFromRule(rule) {
  if (!rule || typeof rule !== 'object') return '';
  return String(rule.buy_shop_product_id ?? rule.buyShopProductId ?? '').trim();
}

export function sameSkuProductIdFromRule(rule) {
  if (!rule || typeof rule !== 'object') return '';
  return String(rule.shop_product_id ?? rule.shopProductId ?? '').trim();
}

/** Suggested admin promotion title from configured lines. */
export function suggestPromotionNameFromBundleLine(line, { buyName, getName } = {}) {
  if (!line) return 'Buy X Get Y';
  const buy = Math.max(1, Math.floor(Number(line.buyQty ?? line.buy_qty) || 1));
  const get = Math.max(1, Math.floor(Number(line.getQty ?? line.get_qty) || 1));
  if (String(line.scope) === 'cross_shop_products') {
    return formatCrossBxgyLabel({ buyQty: buy, getQty: get, buyName, getName });
  }
  return formatSameSkuBxgyLabel(buy, get);
}
