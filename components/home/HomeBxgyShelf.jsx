'use client';

import BxgyDealCard from './BxgyDealCard';

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
        headline:
          bq === 1 && gq === 1
            ? 'Buy 1 Get 1 Free'
            : `Buy ${bq} Get ${gq} Free`,
        hint: 'Same product — free units apply at checkout',
      });
    }
    return deals;
  }

  if (!buyRaw.length || !getRaw.length) return [];

  if (buyRaw.length === getRaw.length) {
    buyRaw.forEach((b, i) => {
      const g = getRaw[i];
      deals.push({
        id: `cross-${b.id}-${g.id}`,
        dealMode: 'cross_sku',
        buyQty: bq,
        getQty: gq,
        buyProducts: [b],
        getProducts: [g],
        headline:
          bq === 1 && gq === 1
            ? 'Buy this → get that free'
            : `Buy ${bq} → get ${gq} free`,
        hint: `Buy ${bq} of the left item to unlock ${gq} free of the right item`,
      });
    });
    return deals;
  }

  const cap = 12;
  for (const b of buyRaw) {
    for (const g of getRaw) {
      if (deals.length >= cap) break;
      deals.push({
        id: `cross-${b.id}-${g.id}`,
        dealMode: 'cross_sku',
        buyQty: bq,
        getQty: gq,
        buyProducts: [b],
        getProducts: [g],
        headline:
          bq === 1 && gq === 1
            ? 'Buy this → get that free'
            : `Buy ${bq} → get ${gq} free`,
        hint: `Buy ${bq} of the left item to unlock ${gq} free of the right item`,
      });
    }
  }
  return deals;
}

/**
 * Offer Damaka / BXGY home shelf — one card per deal so customers see
 * exactly what to buy to unlock which free product (or classic BOGO).
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
    if (hasCross && hasSame) {
      sectionHint = 'Each card is one offer — buy the left item to unlock the free item';
    } else if (hasCross) {
      sectionHint =
        'Each card shows what to buy and what you get free — match left → right';
    } else {
      sectionHint = 'Buy more of the same product — free units apply at checkout';
    }
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
