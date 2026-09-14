'use client';

import ProductCard from '../ProductCard';
import {
  formatCrossBxgyLabel,
  formatSameSkuBxgyLabel,
} from '../../utils/bxgyLabels';

/**
 * Home deal chrome alone is not enough for cart — attach a real bundle rule
 * onto the buy product when engine `bundleRules` are missing.
 */
function ensureDealCartBundleRules(product, {
  role,
  mode,
  buyQty,
  getQty,
  buyProduct,
  getProduct,
}) {
  if (!product || role !== 'buy') return product;
  const existing = Array.isArray(product.bundleRules)
    ? product.bundleRules
    : Array.isArray(product.bundle_rules)
      ? product.bundle_rules
      : [];
  if (existing.length > 0) return product;

  const buyId = String(buyProduct?.id || product.id || '').trim();
  if (!buyId) return product;
  const getId = String(getProduct?.id || '').trim();
  const safeBuyQty =
    Number.isFinite(Number(buyQty)) && Number(buyQty) > 0 ? Number(buyQty) : 1;
  const safeGetQty =
    Number.isFinite(Number(getQty)) && Number(getQty) > 0 ? Number(getQty) : 1;

  if (mode === 'cross_sku' && getId && getId !== buyId) {
    return {
      ...product,
      bundleRules: [
        {
          scope: 'cross_shop_products',
          buy_shop_product_id: buyId,
          reward_shop_product_id: getId,
          buy_qty: safeBuyQty,
          get_qty: safeGetQty,
          reward_type: 'free',
          buy_product_name: buyProduct?.name || product.name || '',
          reward_product_name: getProduct?.name || '',
          reward_product_image:
            getProduct?.imageUrl || getProduct?.image || '',
        },
      ],
    };
  }

  return {
    ...product,
    bundleRules: [
      {
        scope: 'same_shop_product',
        shop_product_id: buyId,
        buy_qty: safeBuyQty,
        get_qty: safeGetQty,
        reward_type: 'free',
      },
    ],
  };
}

function withChrome(
  product,
  role,
  buyQty,
  getQty,
  offerMode,
  pairNames,
  pairProducts
) {
  if (!product) return null;
  const withRules = ensureDealCartBundleRules(product, {
    role,
    mode: offerMode,
    buyQty,
    getQty,
    buyProduct: pairProducts?.buy || product,
    getProduct: pairProducts?.get || null,
  });
  return {
    ...withRules,
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

  const pairProducts = { buy: buyRaw, get: getRaw };
  const buy = withChrome(
    buyRaw,
    'buy',
    buyQty,
    getQty,
    mode,
    pairNames,
    pairProducts
  );
  const get =
    mode === 'cross_sku' && getRaw
      ? withChrome(
          getRaw,
          'get',
          buyQty,
          getQty,
          mode,
          pairNames,
          pairProducts
        )
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
