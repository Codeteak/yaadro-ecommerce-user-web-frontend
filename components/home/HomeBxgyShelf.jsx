'use client';

import BxgyDealCard from './BxgyDealCard';
import {
  formatCrossBxgyLabel,
  formatSameSkuBxgyLabel,
} from '../../utils/bxgyLabels';

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
  if (mode === 'same_sku') {
    const list = buyRaw.length ? buyRaw : getRaw;
    for (const p of list) {
      deals.push({
        id: `same-${p.id}`,
        dealMode: 'same_sku',
        buyQty: bq,
        getQty: gq,
        buyProducts: [p],
        getProducts: [p],
        headline: formatSameSkuBxgyLabel(bq, gq),
      });
    }
    return deals;
  }

  if (!buyRaw.length || !getRaw.length) return [];

  const pushCross = (b, g) => {
    deals.push({
      id: `cross-${b.id}-${g.id}`,
      dealMode: 'cross_sku',
      buyQty: bq,
      getQty: gq,
      buyProducts: [b],
      getProducts: [g],
      headline: formatCrossBxgyLabel({
        buyQty: bq,
        getQty: gq,
        buyName: b.name || b.shortName,
        getName: g.name || g.shortName,
      }),
    });
  };

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
