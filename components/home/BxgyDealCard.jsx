'use client';

import ProductCard from '../ProductCard';
import {
  formatCrossBxgyLabel,
  formatSameSkuBxgyLabel,
} from '../../utils/bxgyLabels';

function firstProductImage(product) {
  if (!product || typeof product !== 'object') return '';
  const candidates = [
    product.imageUrl,
    product.image_url,
    product.image,
    Array.isArray(product.images) ? product.images[0] : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

/**
 * Engine rules often omit reward_product_image when the free SKU only has a
 * gallery thumb. Shelf cards still show it — copy that URL onto the buy rule
 * so guest cart free lines can render the same image.
 */
function enrichCrossRulesWithRewardMedia(rules, getProduct) {
  const getImage = firstProductImage(getProduct);
  const getName = String(getProduct?.name || getProduct?.shortName || '').trim();
  if (!getImage && !getName) return rules;

  let changed = false;
  const next = rules.map((r) => {
    if (!r || typeof r !== 'object') return r;
    const isCross =
      r.scope === 'cross_shop_products' ||
      (r.buy_shop_product_id && r.reward_shop_product_id) ||
      (r.buyShopProductId && r.rewardShopProductId);
    if (!isCross) return r;

    const existingImg = String(
      r.reward_product_image || r.rewardProductImage || r.get_product_image || '',
    ).trim();
    const existingName = String(
      r.reward_product_name || r.rewardProductName || '',
    ).trim();
    if (existingImg && existingName) return r;

    changed = true;
    return {
      ...r,
      ...(existingName || !getName ? {} : { reward_product_name: getName }),
      ...(existingImg || !getImage ? {} : { reward_product_image: getImage }),
    };
  });
  return changed ? next : rules;
}

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
  if (existing.length > 0) {
    const enriched = enrichCrossRulesWithRewardMedia(existing, getProduct);
    if (enriched === existing) return product;
    return { ...product, bundleRules: enriched, bundle_rules: enriched };
  }

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
          reward_product_image: firstProductImage(getProduct),
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
 * Prefer engine rule buy/get qty over section defaults (fixes Damaka showing 1/1 when rule is 2/1).
 */
function resolveDealQtys(deal, buyProduct) {
  let buyQty =
    Number.isFinite(Number(deal?.buyQty)) && Number(deal.buyQty) > 0
      ? Math.floor(Number(deal.buyQty))
      : 0;
  let getQty =
    Number.isFinite(Number(deal?.getQty)) && Number(deal.getQty) > 0
      ? Math.floor(Number(deal.getQty))
      : 0;

  const rules = Array.isArray(buyProduct?.bundleRules)
    ? buyProduct.bundleRules
    : Array.isArray(buyProduct?.bundle_rules)
      ? buyProduct.bundle_rules
      : [];
  const buyId = String(buyProduct?.id || '').trim();
  const getId = String(
    (Array.isArray(deal?.getProducts) && deal.getProducts[0]?.id) || ''
  ).trim();

  const matching =
    rules.find((r) => {
      if (!r || typeof r !== 'object') return false;
      const scope = String(r.scope || '');
      if (scope === 'cross_shop_products' || (r.buy_shop_product_id && r.reward_shop_product_id)) {
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
 * One clear deal: BOGO (same product) or Buy → Get free (different products).
 */
export default function BxgyDealCard({ deal }) {
  if (!deal) return null;
  const mode = deal.dealMode === 'cross_sku' ? 'cross_sku' : 'same_sku';
  const buyRaw = Array.isArray(deal.buyProducts) ? deal.buyProducts[0] : null;
  const getRaw = Array.isArray(deal.getProducts) ? deal.getProducts[0] : null;
  if (!buyRaw) return null;

  const { buyQty, getQty } = resolveDealQtys(deal, buyRaw);
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

  const displayHeadline =
    Number(deal.buyQty) === 1 &&
    Number(deal.getQty) === 1 &&
    (buyQty !== 1 || getQty !== 1)
      ? mode === 'same_sku'
        ? formatSameSkuBxgyLabel(buyQty, getQty)
        : formatCrossBxgyLabel({ buyQty, getQty, buyName, getName })
      : deal.headline ||
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
          <p className="text-sm font-bold text-gray-900">{displayHeadline}</p>
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
        <p className="text-sm font-bold text-gray-900">{displayHeadline}</p>
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
