import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { PRODUCT_IMAGE_PLACEHOLDER } from './productImages';
import { normalizeStorefrontProductPricing } from './storefrontProductPricing';

const SECTION_TYPES = new Set(['product_shelf', 'event_shelf', 'buy_x_get_y']);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractSectionsPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.sections)) return payload.sections;
  if (Array.isArray(payload.data?.sections)) return payload.data.sections;
  return [];
}

function firstImageUrl(raw) {
  const candidates = [
    raw?.imageUrl,
    raw?.image_url,
    raw?.image,
    raw?.thumbnailUrl,
    raw?.thumbnail_url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

/**
 * Map a home-sections product into the shape ProductCard expects.
 * Uses shared pricing normalizer (list + discount/final → offerPrice).
 * Do not invent offer prices or fake bundle rules from buyQty / getQty.
 */
export function mapHomeSectionProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id != null ? String(raw.id).trim() : '';
  if (!id) return null;

  const name = String(raw.name || raw.title || '').trim() || 'Product';
  const slug = String(raw.slug || raw.productSlug || raw.product_slug || '').trim();
  const imageUrl = firstImageUrl(raw);
  const image = imageUrl || PRODUCT_IMAGE_PLACEHOLDER;

  const pricing = normalizeStorefrontProductPricing(raw);
  const {
    listPrice,
    offerPrice,
    hasDiscount,
    actualPriceMinor,
    finalPriceMinor,
    totalDiscountMinor,
    discountPercentage,
    offerPriceMinor,
    promoPriceMinor,
  } = pricing;

  const bundleRules = Array.isArray(raw.bundleRules)
    ? raw.bundleRules
    : Array.isArray(raw.bundle_rules)
      ? raw.bundle_rules
      : [];

  return {
    id,
    name,
    shortName: name,
    slug,
    price: listPrice,
    originalPrice: hasDiscount ? listPrice : null,
    compareAtPrice: hasDiscount ? listPrice : null,
    offerPrice,
    offerPriceEffective: offerPrice,
    image,
    images: [image],
    imageUrl: imageUrl || null,
    imageUrls: [image],
    actualPriceMinor: actualPriceMinor || undefined,
    finalPriceMinor: finalPriceMinor || undefined,
    totalDiscountMinor: totalDiscountMinor || undefined,
    discountPercentage: discountPercentage || undefined,
    offerPriceMinor: offerPriceMinor || undefined,
    promoPriceMinor: promoPriceMinor || undefined,
    bundleRules,
    inStock: true,
    stock: 1,
  };
}

function mapProductList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of asArray(list)) {
    const product = mapHomeSectionProduct(raw);
    if (!product) continue;
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
  }
  return out;
}

export function formatEventDateRange(startsAt, endsAt) {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  const validStart = start && !Number.isNaN(start.getTime());
  const validEnd = end && !Number.isNaN(end.getTime());
  const fmt = (d) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (validStart && validEnd) return `${fmt(start)} – ${fmt(end)}`;
  if (validEnd) return `Until ${fmt(end)}`;
  if (validStart) return `From ${fmt(start)}`;
  return null;
}

function isSectionInDateWindow(startsAt, endsAt) {
  const now = Date.now();
  if (startsAt) {
    const t = new Date(startsAt).getTime();
    if (Number.isFinite(t) && t > now) return false;
  }
  if (endsAt) {
    const t = new Date(endsAt).getTime();
    if (Number.isFinite(t) && t < now) return false;
  }
  return true;
}

export function normalizeHomeSection(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').trim();
  if (!SECTION_TYPES.has(type)) return null;

  const id = raw.id != null ? String(raw.id).trim() : '';
  if (!id) return null;

  const title = String(raw.title || '').trim();
  const label = String(raw.label || '').trim();
  const startsAt = raw.startsAt ?? raw.starts_at ?? null;
  const endsAt = raw.endsAt ?? raw.ends_at ?? null;
  if (!isSectionInDateWindow(startsAt, endsAt)) return null;

  const buyProducts = mapProductList(raw.buyProducts ?? raw.buy_products);
  const getProducts = mapProductList(raw.getProducts ?? raw.get_products);
  const products =
    type === 'buy_x_get_y'
      ? buyProducts.length || getProducts.length
        ? []
        : mapProductList(raw.products)
      : mapProductList(raw.products);

  if (type === 'buy_x_get_y') {
    // Need at least one complete sellable deal (buy side in stock; cross also needs free SKU).
    if (buyProducts.length === 0 && getProducts.length === 0 && products.length === 0) {
      return null;
    }
  } else if (products.length === 0) {
    // product_shelf + event_shelf: hide when no products (Festive empty → don't show).
    return null;
  }

  const coverSource =
    products[0] || buyProducts[0] || getProducts[0] || null;
  const coverImageUrl = coverSource?.imageUrl || firstImageUrl(raw) || '';

  let dealMode = null;
  if (type === 'buy_x_get_y') {
    const apiMode = String(raw.dealMode ?? raw.deal_mode ?? '').trim();
    if (apiMode === 'same_sku' || apiMode === 'cross_sku') {
      dealMode = apiMode;
    } else {
      const buyIds = new Set(buyProducts.map((p) => p.id));
      const getIds = new Set(getProducts.map((p) => p.id));
      dealMode =
        getProducts.length === 0 ||
        (buyProducts.length > 0 &&
          getProducts.length === buyProducts.length &&
          [...buyIds].every((id) => getIds.has(id)))
          ? 'same_sku'
          : 'cross_sku';
    }
  }

  // Prefer API deal pairs; drop incomplete client-side.
  let deals = null;
  if (type === 'buy_x_get_y' && Array.isArray(raw.deals)) {
    deals = raw.deals
      .map((d, i) => {
        if (!d || typeof d !== 'object') return null;
        const dBuy = mapProductList(d.buyProducts ?? d.buy_products);
        const dGet = mapProductList(d.getProducts ?? d.get_products);
        if (!dBuy.length) return null;
        const mode =
          String(d.dealMode ?? d.deal_mode ?? '').trim() === 'cross_sku'
            ? 'cross_sku'
            : 'same_sku';
        if (mode === 'cross_sku' && !dGet.length) return null;
        return {
          id: d.id != null ? String(d.id) : `deal-${i}`,
          dealMode: mode,
          buyQty: (() => {
            const fromDeal = Number(d.buyQty ?? d.buy_qty);
            const fromSection = Number(raw.buyQty ?? raw.buy_qty);
            const rules = dBuy[0]?.bundleRules || dBuy[0]?.bundle_rules || [];
            const ruleBuy = Number(rules[0]?.buy_qty ?? rules[0]?.buyQty);
            if (Number.isFinite(ruleBuy) && ruleBuy > 0) return Math.floor(ruleBuy);
            if (Number.isFinite(fromDeal) && fromDeal > 0) return Math.floor(fromDeal);
            if (Number.isFinite(fromSection) && fromSection > 0) return Math.floor(fromSection);
            return 1;
          })(),
          getQty: (() => {
            const fromDeal = Number(d.getQty ?? d.get_qty);
            const fromSection = Number(raw.getQty ?? raw.get_qty);
            const rules = dBuy[0]?.bundleRules || dBuy[0]?.bundle_rules || [];
            const ruleGet = Number(rules[0]?.get_qty ?? rules[0]?.getQty);
            if (Number.isFinite(ruleGet) && ruleGet > 0) return Math.floor(ruleGet);
            if (Number.isFinite(fromDeal) && fromDeal > 0) return Math.floor(fromDeal);
            if (Number.isFinite(fromSection) && fromSection > 0) return Math.floor(fromSection);
            return 1;
          })(),
          buyProducts: dBuy,
          getProducts: mode === 'same_sku' ? dBuy : dGet,
          headline: typeof d.headline === 'string' ? d.headline : undefined,
          hint: typeof d.hint === 'string' ? d.hint : undefined,
        };
      })
      .filter(Boolean);
    if (deals.length === 0) return null;
  } else if (type === 'buy_x_get_y') {
    // Cross without get side, or buy-only empty → hide broken Damaka.
    if (dealMode === 'cross_sku' && (buyProducts.length === 0 || getProducts.length === 0)) {
      return null;
    }
    if (dealMode === 'same_sku' && buyProducts.length === 0 && getProducts.length === 0) {
      return null;
    }
  }

  return {
    id,
    type,
    title: title || (type === 'buy_x_get_y' ? label : '') || 'Offers',
    subtitle:
      type === 'buy_x_get_y' && label
        ? label
        : type === 'event_shelf'
          ? formatEventDateRange(startsAt, endsAt) || ''
          : '',
    sortOrder: Number(raw.sortOrder ?? raw.sort_order),
    startsAt,
    endsAt,
    products:
      type === 'buy_x_get_y' && (buyProducts.length || getProducts.length)
        ? []
        : products,
    buyProducts: type === 'buy_x_get_y' ? buyProducts : [],
    getProducts: type === 'buy_x_get_y' ? getProducts : [],
    buyQty: raw.buyQty ?? raw.buy_qty ?? null,
    getQty: raw.getQty ?? raw.get_qty ?? null,
    dealMode,
    deals,
    coverImageUrl,
  };
}

/**
 * GET /storefront/home-sections — customer storefront only.
 * On 404/error return an empty list so home still renders.
 */
export async function getHomeSections() {
  try {
    const shopId = await resolveShopId();
    if (!shopId) {
      return { sections: [] };
    }

    const response = await apiFetchRoot('/storefront/home-sections', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const sections = extractSectionsPayload(response)
      .map(normalizeHomeSection)
      .filter(Boolean)
      .map((section, index) => ({ section, index }))
      .sort((a, b) => {
        const ao = Number.isFinite(a.section.sortOrder) ? a.section.sortOrder : Number.POSITIVE_INFINITY;
        const bo = Number.isFinite(b.section.sortOrder) ? b.section.sortOrder : Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.index - b.index;
      })
      .map(({ section }) => section);

    return { sections };
  } catch (error) {
    console.warn('[home-sections]', error?.message || error);
    return { sections: [] };
  }
}

export function findHomeSectionById(sections, id) {
  const needle = id != null ? String(id).trim() : '';
  if (!needle) return null;
  return (Array.isArray(sections) ? sections : []).find((s) => String(s.id) === needle) || null;
}
