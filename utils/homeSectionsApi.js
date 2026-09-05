import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { minorToMajor, parseMinorInt } from './currencyMinor';
import { PRODUCT_IMAGE_PLACEHOLDER } from './productImages';

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
 * Do not invent offer prices from buyQty / getQty.
 */
export function mapHomeSectionProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id != null ? String(raw.id).trim() : '';
  if (!id) return null;

  const name = String(raw.name || raw.title || '').trim() || 'Product';
  const slug = String(raw.slug || raw.productSlug || raw.product_slug || '').trim();
  const imageUrl = firstImageUrl(raw);
  const image = imageUrl || PRODUCT_IMAGE_PLACEHOLDER;

  const listMinor = parseMinorInt(
    raw.priceMinorPerUnit ??
      raw.price_minor_per_unit ??
      raw.actualPriceMinor ??
      raw.actual_price_minor ??
      raw.priceMinor ??
      raw.price_minor
  );
  const price = listMinor > 0 ? minorToMajor(listMinor) : Number(raw.price) || 0;

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
    price,
    image,
    images: [image],
    imageUrl: imageUrl || null,
    imageUrls: [image],
    actualPriceMinor: listMinor || undefined,
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

function collectBxgyProducts(raw) {
  return mapProductList([
    ...asArray(raw.buyProducts ?? raw.buy_products),
    ...asArray(raw.getProducts ?? raw.get_products),
    ...asArray(raw.products),
  ]);
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

export function normalizeHomeSection(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type || '').trim();
  if (!SECTION_TYPES.has(type)) return null;

  const id = raw.id != null ? String(raw.id).trim() : '';
  if (!id) return null;

  const title = String(raw.title || '').trim();
  const label = String(raw.label || '').trim();
  const products =
    type === 'buy_x_get_y' ? collectBxgyProducts(raw) : mapProductList(raw.products);

  if (type !== 'event_shelf' && products.length === 0) return null;

  const coverImageUrl = products[0]?.imageUrl || firstImageUrl(raw) || '';

  return {
    id,
    type,
    title: title || (type === 'buy_x_get_y' ? label : '') || 'Offers',
    subtitle: type === 'buy_x_get_y' && label && label !== title ? label : '',
    sortOrder: Number(raw.sortOrder ?? raw.sort_order),
    startsAt: raw.startsAt ?? raw.starts_at ?? null,
    endsAt: raw.endsAt ?? raw.ends_at ?? null,
    products,
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
      .filter(Boolean);

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
