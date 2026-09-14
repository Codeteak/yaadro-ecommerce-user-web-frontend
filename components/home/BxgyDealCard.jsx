'use client';

import ProductCard from '../ProductCard';
import {
  formatCrossBxgyLabel,
  formatSameSkuBxgyLabel,
} from '../../utils/bxgyLabels';

function withChrome(product, role, buyQty, getQty, offerMode, pairNames) {
  if (!product) return null;
  return {
    ...product,
    bxgyShelfRole: role,
    bxgyBuyQty: buyQty,
    bxgyGetQty: getQty,
    bxgyOfferMode: offerMode,
    bxgyBuyProductName: pairNames?.buyName || '',
    bxgyGetProductName: pairNames?.getName || '',
  };
}

/**
 * One clear deal: BOGO (same product) or Buy → Get free (different products).
 */
export default function BxgyDealCard({ deal }) {
  if (!deal) return null;
  const buyQty =
    Number.isFinite(Number(deal.buyQty)) && Number(deal.buyQty) > 0
      ? Number(deal.buyQty)
      : 1;
  const getQty =
    Number.isFinite(Number(deal.getQty)) && Number(deal.getQty) > 0
      ? Number(deal.getQty)
      : 1;
  const mode = deal.dealMode === 'cross_sku' ? 'cross_sku' : 'same_sku';
  const buyRaw = Array.isArray(deal.buyProducts) ? deal.buyProducts[0] : null;
  const getRaw = Array.isArray(deal.getProducts) ? deal.getProducts[0] : null;
  if (!buyRaw) return null;

  const buyName = buyRaw.name || buyRaw.shortName || '';
  const getName = getRaw?.name || getRaw?.shortName || '';
  const pairNames = { buyName, getName };

  const buy = withChrome(buyRaw, 'buy', buyQty, getQty, mode, pairNames);
  const get =
    mode === 'cross_sku' && getRaw
      ? withChrome(getRaw, 'get', buyQty, getQty, mode, pairNames)
      : null;

  const headline =
    deal.headline ||
    (mode === 'same_sku'
      ? formatSameSkuBxgyLabel(buyQty, getQty)
      : formatCrossBxgyLabel({ buyQty, getQty, buyName, getName }));

  if (mode === 'same_sku') {
    return (
      <article className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-3 sm:p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-violet-700 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {buyQty === 1 && getQty === 1 ? 'BOGO' : `B${buyQty}G${getQty}`}
          </span>
          <p className="text-sm font-bold text-gray-900">{headline}</p>
        </div>
        <div className="max-w-[220px]">
          <ProductCard product={buy} isCarousel variant="shelf" />
        </div>
      </article>
    );
  }

  if (!get) return null;

  return (
    <article className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-3 sm:p-4 shadow-sm">
      <div className="mb-2">
        <p className="text-sm font-bold text-gray-900">{headline}</p>
      </div>

      <div className="flex items-stretch gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-violet-700">
            Buy {buyQty}
          </p>
          <ProductCard product={buy} isCarousel variant="shelf" />
        </div>

        <div
          className="flex shrink-0 flex-col items-center justify-center px-0.5"
          aria-hidden
        >
          <span className="rounded-full bg-violet-700 px-2 py-1 text-[11px] font-bold text-white">
            →
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            Get {getQty} free
          </p>
          <ProductCard product={get} isCarousel variant="shelf" />
        </div>
      </div>
    </article>
  );
}
