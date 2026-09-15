'use client';

import BxgyDealCard from './BxgyDealCard';
import {
  formatCrossBxgyLabel,
  formatSameSkuBxgyLabel,
} from '../../utils/bxgyLabels';

/**
 * Prefer product bundleRules qty over section buyQty/getQty defaults.
 */
function resolveQtysFromProductRules(buyProduct, rewardProductId, fallbackBuy, fallbackGet) {
  let buyQty = fallbackBuy;
  let getQty = fallbackGet;
  const rules = Array.isArray(buyProduct?.bundleRules)
    ? buyProduct.bundleRules
    : Array.isArray(buyProduct?.bundle_rules)
      ? buyProduct.bundle_rules
      : [];
  const buyId = String(buyProduct?.id || '').trim();
  const getId = String(rewardProductId || '').trim();
  const matching =
    rules.find((r) => {
      if (!r || typeof r !== 'object') return false;
      const scope = String(r.scope || '');
      if (
        scope === 'cross_shop_products' ||
        (r.buy_shop_product_id && r.reward_shop_product_id)
      ) {
        const rb = String(r.buy_shop_product_id ?? r.buyShopProductId ?? '');
        const rg = String(r.reward_shop_product_id ?? r.rewardShopProductId ?? '');
        if (buyId && rb && rb !== buyId) return false;
        if (getId && rg && rg !== getId) return false;
        return true;
      }
      if (scope === 'same_shop_product' || r.shop_product_id) {
        return String(r.shop_product_id ?? r.shopProductId ?? '') === buyId;
      }
      return false;
    }) || rules[0];

  if (matching) {
    const rb = Number(matching.buy_qty ?? matching.buyQty);
    const rg = Number(matching.get_qty ?? matching.getQty);
    if (Number.isFinite(rb) && rb > 0) buyQty = Math.floor(rb);
    if (Number.isFinite(rg) && rg > 0) getQty = Math.floor(rg);
  }
  return {
    buyQty: buyQty > 0 ? buyQty : 1,
    getQty: getQty > 0 ? getQty : 1,
  };
}

/**
 * Build customer-facing deal cards when API did not send `deals`.
 */
function buildDealsFallback({
  buyProducts,
  getProducts,
  buyQty,
  getQty,
  dealMode,
}) {
  const buyRaw = Array.isArray(buyProducts) ? buyProducts : [];
  const getRaw = Array.isArray(getProducts) ? getProducts : [];
  if (!buyRaw.length && !getRaw.length) return [];

  const bq =
    Number.isFinite(Number(buyQty)) && Number(buyQty) > 0 ? Number(buyQty) : 1;
  const gq =
    Number.isFinite(Number(getQty)) && Number(getQty) > 0 ? Number(getQty) : 1;

  const buyIds = new Set(buyRaw.map((p) => String(p.id)));
  const getIds = new Set(getRaw.map((p) => String(p.id)));
  const sameSet =
    buyRaw.length > 0 &&
    getRaw.length === buyRaw.length &&
    [...buyIds].every((id) => getIds.has(id));

  let mode =
    dealMode === 'same_sku' || dealMode === 'cross_sku'
      ? dealMode
      : sameSet || (buyRaw.length > 0 && getRaw.length === 0)
        ? 'same_sku'
        : 'cross_sku';

  const deals = [];

  const pushCross = (b, g) => {
    const fromRule = resolveQtysFromProductRules(b, g?.id, bq, gq);
    deals.push({
      id: `cross-${b.id}-${g.id}`,
      dealMode: 'cross_sku',
      buyQty: fromRule.buyQty,
      getQty: fromRule.getQty,
      buyProducts: [b],
      getProducts: [g],
      headline: formatCrossBxgyLabel({
        buyQty: fromRule.buyQty,
        getQty: fromRule.getQty,
        buyName: b.name || b.shortName,
        getName: g.name || g.shortName,
      }),
    });
  };

  if (mode === 'same_sku') {
    const list = buyRaw.length ? buyRaw : getRaw;
    for (const p of list) {
      const fromRule = resolveQtysFromProductRules(p, p.id, bq, gq);
      deals.push({
        id: `same-${p.id}`,
        dealMode: 'same_sku',
        buyQty: fromRule.buyQty,
        getQty: fromRule.getQty,
        buyProducts: [p],
        getProducts: [p],
        headline: formatSameSkuBxgyLabel(fromRule.buyQty, fromRule.getQty),
      });
    }
    return deals;
  }

  if (!buyRaw.length || !getRaw.length) return [];

  if (buyRaw.length === getRaw.length) {
    buyRaw.forEach((b, i) => pushCross(b, getRaw[i]));
    return deals;
  }

  const cap = 12;
  for (const b of buyRaw) {
    for (const g of getRaw) {
      if (deals.length >= cap) break;
      pushCross(b, g);
    }
  }
  return deals;
}

/**
 * Offer Damaka / BXGY home shelf — one card per deal.
 */
export default function HomeBxgyShelf({
  title,
  subtitle,
  buyProducts = [],
  getProducts = [],
  buyQty,
  getQty,
  dealMode,
  deals: dealsProp,
}) {
  const deals =
    Array.isArray(dealsProp) && dealsProp.length > 0
      ? dealsProp
      : buildDealsFallback({
          buyProducts,
          getProducts,
          buyQty,
          getQty,
          dealMode,
        });

  if (!deals.length) return null;

  const hasCross = deals.some((d) => d.dealMode === 'cross_sku');
  const hasSame = deals.some((d) => d.dealMode !== 'cross_sku');

  let sectionHint = subtitle || '';
  if (!sectionHint) {
    if (hasCross && hasSame) sectionHint = 'Each card is one offer';
    else if (hasCross) sectionHint = 'Buy left → get right free';
    else sectionHint = 'Buy more — get free units';
  }

  return (
    <section className="py-6 sm:py-8 md:py-10 [@media(max-height:720px)]:py-5">
      <div className="mb-4 md:mb-5 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 font-headingnow leading-[1]">
          {title}
        </h2>
        <p className="mt-2 text-[13px] md:text-sm text-gray-500">{sectionHint}</p>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-6 lg:px-8">
        {deals.map((deal, index) => (
          <BxgyDealCard key={deal.id || `deal-${index}`} deal={deal} />
        ))}
      </div>
    </section>
  );
}
