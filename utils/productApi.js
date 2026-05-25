/**
 * Product & Category API service functions
 * Uses the multi-tenant backend API
 */

import { api, apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { minorToMajor, parseMinorInt } from './currencyMinor';
import { mediaObjectToUrl } from './mediaUrl';
import { normalizeProductImages, PRODUCT_IMAGE_PLACEHOLDER } from './productImages';
import {
  parseProductDescription,
  resolveProductWeightAndUnit,
} from './productUtils';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_MAP_KEY = 'yaadro_product_slug_by_id_v1';
const inMemorySlugById = new Map();

function readSlugMapFromStorage() {
  if (typeof window === 'undefined') return;
  if (inMemorySlugById.size > 0) return;
  try {
    const raw = window.localStorage.getItem(SLUG_MAP_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (UUID_RE.test(k) && typeof v === 'string' && v.trim()) {
        inMemorySlugById.set(k, v.trim());
      }
    }
  } catch {
    // ignore
  }
}

function writeSlugMapToStorage() {
  if (typeof window === 'undefined') return;
  try {
    const obj = {};
    // cap size to avoid unbounded storage growth
    const entries = Array.from(inMemorySlugById.entries()).slice(-500);
    for (const [k, v] of entries) obj[k] = v;
    window.localStorage.setItem(SLUG_MAP_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function slugify(input) {
  const s = input == null ? '' : String(input);
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Slug segment for PDP URL + `GET /storefront/products/:slug` (never a bare UUID when avoidable).
 */
export function resolveProductDetailSegment(product) {
  if (!product || typeof product !== 'object') return '';

  const rawCandidates = [
    product.slug,
    product.product_slug,
    product.productSlug,
  ];
  for (const candidate of rawCandidates) {
    const raw = candidate != null ? String(candidate).trim() : '';
    if (raw && !UUID_RE.test(raw)) return raw;
  }

  const fromName = slugify(product.name || product.shortName || product.title);
  if (fromName) return fromName;

  const id = product.id != null ? String(product.id).trim() : '';
  if (UUID_RE.test(id)) {
    readSlugMapFromStorage();
    const mapped = inMemorySlugById.get(id);
    if (mapped) return mapped;
  }

  return '';
}

/** @param {object} product */
export function getProductDetailPath(product) {
  const segment =
    resolveProductDetailSegment(product) ||
    (product?.id != null ? String(product.id).trim() : '');
  if (!segment) return '/products/';

  // Static export: only pre-built `/products/[id]/` paths exist (`dynamicParams` is false).
  // A single `/products/detail/` page + `?s=` works for every SKU in production.
  if (process.env.NODE_ENV === 'production') {
    return `/products/detail/?s=${encodeURIComponent(segment)}`;
  }
  return `/products/${encodeURIComponent(segment)}/`;
}

/** Normalize dynamic route param from `/products/[id]`. */
export function normalizeProductRouteParam(param) {
  if (param == null) return '';
  const one = Array.isArray(param) ? param[0] : param;
  try {
    return decodeURIComponent(String(one).trim());
  } catch {
    return String(one).trim();
  }
}

function resolveProductSlug(apiProduct) {
  return resolveProductDetailSegment(apiProduct);
}

async function resolveStorefrontProductLookup(routeOrId) {
  const raw = normalizeProductRouteParam(routeOrId);
  if (!raw) return '';

  if (!UUID_RE.test(raw)) return raw;

  readSlugMapFromStorage();
  const mapped = inMemorySlugById.get(raw);
  if (mapped) return mapped;

  try {
    const { products } = await getProducts({ per_page: 100 });
    for (const p of products || []) {
      if (String(p?.id) === raw) {
        const seg = resolveProductDetailSegment(p);
        if (seg) {
          rememberSlugMapping({ id: raw }, seg);
          return seg;
        }
      }
    }
  } catch {
    // fall through
  }

  return raw;
}

function rememberSlugMapping(apiProduct, slug) {
  if (!apiProduct || typeof apiProduct !== 'object') return;
  const id = apiProduct.id != null ? String(apiProduct.id).trim() : '';
  if (!UUID_RE.test(id)) return;
  const s = slug != null ? String(slug).trim() : '';
  if (!s || UUID_RE.test(s)) return; // don't store UUID as slug
  inMemorySlugById.set(id, s);
  writeSlugMapToStorage();
}

/**
 * Transform API product to frontend format
 */
function transformProduct(apiProduct) {
  if (!apiProduct) return null;

  const normalizeCategoryName = (cat) => {
    if (!cat) return '';
    if (typeof cat === 'string') return cat;
    if (typeof cat === 'object') return cat.name || cat.slug || '';
    return '';
  };

  // Storefront catalog shape (minor currency units + availability)
  const isStorefrontCatalog =
    apiProduct.price_minor_per_unit !== undefined ||
    apiProduct.final_price_minor !== undefined ||
    apiProduct.actual_price_minor !== undefined ||
    apiProduct.total_price_minor !== undefined;

  if (isStorefrontCatalog) {
    const listMinor =
      parseMinorInt(apiProduct.actual_price_minor ?? apiProduct.total_price_minor) ||
      parseMinorInt(apiProduct.price_minor_per_unit);
    const finalMinor =
      parseMinorInt(apiProduct.final_price_minor) ||
      parseMinorInt(apiProduct.offer_price_minor_per_unit) ||
      listMinor;
    const offerLayerMinor = parseMinorInt(apiProduct.offer_price_minor);
    const promoLayerMinor = parseMinorInt(apiProduct.promo_price_minor);
    const totalDiscountMinor = parseMinorInt(apiProduct.total_discount_minor);

    const listPrice = minorToMajor(listMinor);
    const finalPrice = minorToMajor(finalMinor);
    const hasDiscount = listPrice > 0 && finalPrice < listPrice - 1e-9;
    const offerPrice = hasDiscount ? finalPrice : null;

    const availability = apiProduct.availability || 'unknown';
    const inStock = availability === 'in_stock';

    const thumbnailUrl = mediaObjectToUrl(apiProduct.thumbnail) || null;

    const sortedImages = Array.isArray(apiProduct.images)
      ? [...apiProduct.images].sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      : [];

    const imageUrls = normalizeProductImages({
      thumbnail: apiProduct.thumbnail,
      thumbnailUrl: thumbnailUrl || undefined,
      imageUrl: apiProduct.imageUrl ?? apiProduct.image_url,
      images: sortedImages,
    });
    const finalUrls = imageUrls.length > 0 ? imageUrls : [PRODUCT_IMAGE_PLACEHOLDER];
    const image = finalUrls[0];
    const images = finalUrls;

    const slug = resolveProductSlug(apiProduct);
    rememberSlugMapping(apiProduct, slug);

    const discountFromApi = totalDiscountMinor > 0 && listMinor > 0
      ? (totalDiscountMinor / listMinor) * 100
      : 0;
    const discountPercentage =
      discountFromApi > 0
        ? Math.round(discountFromApi)
        : hasDiscount
          ? Math.round(((listPrice - finalPrice) / listPrice) * 100)
          : 0;

    const bundleRules = Array.isArray(apiProduct.bundle_rules)
      ? apiProduct.bundle_rules
      : Array.isArray(apiProduct.bundleRules)
        ? apiProduct.bundleRules
        : [];

    const { weight, unit } = resolveProductWeightAndUnit(apiProduct);

    return {
      id: apiProduct.id,
      name: apiProduct.name,
      shortName: apiProduct.name,
      slug,
      price: listPrice,
      originalPrice: hasDiscount ? listPrice : null,
      compareAtPrice: hasDiscount ? listPrice : null,
      offerPrice,
      offerPriceEffective: offerPrice,
      promoPrice: promoLayerMinor > 0 ? minorToMajor(promoLayerMinor) : null,
      actualPriceMinor: listMinor,
      finalPriceMinor: finalMinor,
      offerPriceMinor: offerLayerMinor,
      promoPriceMinor: promoLayerMinor,
      totalDiscountMinor,
      category: normalizeCategoryName(apiProduct.category) || apiProduct.category_slug || '',
      subcategory: '',
      description: parseProductDescription(apiProduct),
      image,
      images,
      imageUrls: finalUrls,
      imageUrl: apiProduct.imageUrl ?? apiProduct.image_url ?? null,
      thumbnailUrl,
      inStock,
      stock: inStock ? 1 : 0,
      weight,
      unit,
      packSize: apiProduct.pack_size ?? apiProduct.packSize ?? '',
      brand: apiProduct.brand || '',
      ingredients: apiProduct.ingredients || '',
      sku: '',
      barcode: '',
      discountPercentage,
      bundleRules,
      shop: null,
      createdAt: apiProduct.created_at || '',
      updatedAt: apiProduct.updated_at || '',
      availability,
      thumbnail: apiProduct.thumbnail || null,
      categoryId: apiProduct.category_id || null,
      categoryObj: apiProduct.category || null,
    };
  }

  const images = apiProduct.images || [];
  const imageObjs = Array.isArray(images) ? images : [];

  const thumbnailUrlStr =
    (typeof apiProduct.thumbnailUrl === 'string' && apiProduct.thumbnailUrl.trim()) ||
    mediaObjectToUrl(apiProduct.thumbnail) ||
    '';

  const imageUrls = normalizeProductImages({
    thumbnail: apiProduct.thumbnail,
    thumbnailUrl: thumbnailUrlStr || undefined,
    imageUrl: apiProduct.imageUrl ?? apiProduct.image_url,
    images: imageObjs,
    image:
      typeof apiProduct.image === 'string' && apiProduct.image.trim()
        ? apiProduct.image.trim()
        : undefined,
  });
  const finalUrls = imageUrls.length > 0 ? imageUrls : [PRODUCT_IMAGE_PLACEHOLDER];
  const firstImage = finalUrls[0];

  const slug = resolveProductSlug(apiProduct);
  rememberSlugMapping(apiProduct, slug);
  const legacyWeightUnit = resolveProductWeightAndUnit(apiProduct);
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    shortName: apiProduct.shortName || apiProduct.name,
    slug,
    price: parseFloat(apiProduct.price) || 0,
    originalPrice: apiProduct.compareAtPrice ? parseFloat(apiProduct.compareAtPrice) : null,
    compareAtPrice: apiProduct.compareAtPrice ? parseFloat(apiProduct.compareAtPrice) : null,
    costPrice: apiProduct.costPrice != null ? parseFloat(apiProduct.costPrice) : null,
    offerPrice: apiProduct.offerPrice != null ? parseFloat(apiProduct.offerPrice) : null,
    offerPriceEffective: apiProduct.offerPriceEffective != null ? parseFloat(apiProduct.offerPriceEffective) : null,
    category: apiProduct.category || apiProduct.subcategory || '',
    subcategory: apiProduct.subcategory || '',
    description: apiProduct.description || '',
    image: firstImage,
    images: finalUrls,
    imageUrls: finalUrls,
    imageUrl: apiProduct.imageUrl ?? apiProduct.image_url ?? null,
    thumbnailUrl: apiProduct.thumbnailUrl || thumbnailUrlStr || null,
    inStock: apiProduct.inStock !== undefined ? apiProduct.inStock : (apiProduct.stock > 0),
    stock: apiProduct.stock ?? 0,
    minStockAlert: apiProduct.minStockAlert ?? null,
    weight: legacyWeightUnit.weight,
    grossWeight: apiProduct.grossWeight != null ? parseFloat(apiProduct.grossWeight) : null,
    unit: legacyWeightUnit.unit,
    packSize: apiProduct.packSize || '',
    brand: apiProduct.brand || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || '',
    vegNonVeg: apiProduct.vegNonVeg || null,
    organicTag: apiProduct.organicTag || false,
    ingredients: apiProduct.ingredients || '',
    storageType: apiProduct.storageType || null,
    countryOfOrigin: apiProduct.countryOfOrigin || '',
    batchNumber: apiProduct.batchNumber || '',
    manufactureDate: apiProduct.manufactureDate || null,
    expiryDate: apiProduct.expiryDate || null,
    shelfLife: apiProduct.shelfLife || '',
    storageInstructions: apiProduct.storageInstructions || null,
    returnable: apiProduct.returnable !== undefined ? apiProduct.returnable : true,
    warranty: apiProduct.warranty || '',
    deliveryTimeEstimate: apiProduct.deliveryTimeEstimate || null,
    nutritionalInformation: apiProduct.nutritionalInformation || null,
    allergenInformation: apiProduct.allergenInformation || null,
    frequentlyBoughtTogether: apiProduct.frequentlyBoughtTogether || null,
    ratingsAverage: apiProduct.ratingsAverage ? parseFloat(apiProduct.ratingsAverage) : 0,
    ratingsCount: apiProduct.ratingsCount || 0,
    isFeatured: apiProduct.isFeatured || false,
    tags: apiProduct.tags || [],
    attributes: apiProduct.attributes || {},
    discountPercentage: apiProduct.discountPercentage ?? apiProduct.discountPercent ?? 0,
    shop: apiProduct.shop || null,
    createdAt: apiProduct.createdAt || '',
    updatedAt: apiProduct.updatedAt || '',
  };
}

/**
 * Transform API category to frontend format
 */
function transformCategory(apiCategory) {
  if (!apiCategory) return null;

  const parentId =
    apiCategory.parentId !== undefined
      ? apiCategory.parentId
      : apiCategory.parent_id !== undefined
        ? apiCategory.parent_id
        : null;

  return {
    id: apiCategory.id,
    name: apiCategory.name,
    slug: apiCategory.slug,
    description: apiCategory.description || '',
    image: mediaObjectToUrl(apiCategory.image) || apiCategory.image || null,
    icon: apiCategory.icon || null,
    isActive: apiCategory.isActive !== undefined ? apiCategory.isActive : true,
    isFeatured: apiCategory.isFeatured || false,
    displayOrder: apiCategory.displayOrder || 0,
    parentId: parentId ?? null,
    parentCategory: apiCategory.parentCategory || null,
    children: (apiCategory.children || []).map(transformCategory),
    level: apiCategory.level ?? 0,
    path: apiCategory.path || apiCategory.name,
    pathArray: apiCategory.pathArray || (apiCategory.path ? apiCategory.path.split(' > ') : [apiCategory.name]),
    productCount: apiCategory.productCount ?? 0,
    totalProductCount: apiCategory.totalProductCount ?? apiCategory.productCount ?? 0,
    isLeaf: apiCategory.isLeaf ?? !(apiCategory.children && apiCategory.children.length > 0),
    childCount: apiCategory.childCount ?? (apiCategory.children ? apiCategory.children.length : 0),
    offers: apiCategory.offers || null,
    bundleRules: apiCategory.bundle_rules || apiCategory.bundleRules || [],
    categoryDiscountRules: apiCategory.category_discount_rules || apiCategory.categoryDiscountRules || [],
    createdAt: apiCategory.createdAt || '',
    updatedAt: apiCategory.updatedAt || '',
  };
}

/**
 * Build query string params for `GET /storefront/products` (no auth; header `x-shop-id` added by caller).
 *
 * Supported filters (see OpenAPI / product search spec):
 * - `search` / `q` — partial match on name & slug, max 200 chars
 * - `category_id`, `brand_id` — UUIDs only (non-UUID values are ignored)
 * - `availability` — `in_stock` | `out_of_stock` | `unknown`
 * - `min_price_minor`, `max_price_minor` — integers ≥ 0 (paise); invalid range drops both
 * - `sort_by` — `price` | `created_at` | `name` (unknown values omitted)
 * - `sort_order` — `asc` | `desc`
 * - `limit` / `per_page` — clamped to 1..50 (default 20)
 * - `cursor` — opaque; only sent with `sort_by=created_at` (forced when cursor present)
 * - `offset` — 0..50000; if set, cursor is not used (offset pagination path)
 * - `page` — legacy; when &gt; 1 and no `offset`, sets `offset = (page - 1) * limit`
 *
 * @param {object} raw
 * @returns {Record<string, string|number>}
 */
export function buildStorefrontProductsQuery(raw = {}) {
  const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const out = {};

  const searchSrc = raw.search ?? raw.q;
  if (searchSrc != null && String(searchSrc).trim()) {
    out.search = String(searchSrc).trim().slice(0, 200);
  }

  const cat = raw.category_id ?? raw.category;
  if (cat != null && cat !== '' && UUID.test(String(cat))) {
    out.category_id = String(cat);
  }

  const brand = raw.brand_id ?? raw.brandId;
  if (brand != null && brand !== '' && UUID.test(String(brand))) {
    out.brand_id = String(brand);
  }

  if (
    raw.availability != null &&
    ['in_stock', 'out_of_stock', 'unknown'].includes(String(raw.availability))
  ) {
    out.availability = String(raw.availability);
  }

  if (raw.min_price_minor != null && raw.min_price_minor !== '') {
    const n = Number(raw.min_price_minor);
    if (Number.isFinite(n) && n >= 0) out.min_price_minor = Math.floor(n);
  }
  if (raw.max_price_minor != null && raw.max_price_minor !== '') {
    const n = Number(raw.max_price_minor);
    if (Number.isFinite(n) && n >= 0) out.max_price_minor = Math.floor(n);
  }
  if (
    out.min_price_minor != null &&
    out.max_price_minor != null &&
    out.min_price_minor > out.max_price_minor
  ) {
    delete out.min_price_minor;
    delete out.max_price_minor;
  }

  const limIn = raw.limit ?? raw.per_page ?? 20;
  let limit = Math.floor(Number(limIn));
  if (!Number.isFinite(limit)) limit = 20;
  out.limit = Math.min(50, Math.max(1, limit));

  const offsetNum = Number(raw.offset);
  const useOffset =
    raw.offset != null &&
    raw.offset !== '' &&
    Number.isFinite(offsetNum) &&
    offsetNum >= 0 &&
    offsetNum <= 50000;

  if (useOffset) {
    out.offset = Math.floor(offsetNum);
  } else if (raw.page != null && Number(raw.page) > 1) {
    const page = Math.max(2, Math.floor(Number(raw.page)) || 2);
    out.offset = Math.min(50000, (page - 1) * out.limit);
  }

  let sortBy = raw.sort_by;
  let sortOrder = raw.sort_order;
  if (sortBy != null && !['price', 'created_at', 'name'].includes(String(sortBy))) {
    sortBy = undefined;
  }
  if (sortOrder != null && !['asc', 'desc'].includes(String(sortOrder))) {
    sortOrder = undefined;
  }

  const hasCursor =
    out.offset === undefined &&
    raw.cursor != null &&
    String(raw.cursor).trim().length > 0;

  if (hasCursor) {
    out.sort_by = 'created_at';
    out.sort_order = sortOrder === 'asc' ? 'asc' : 'desc';
    out.cursor = String(raw.cursor).trim();
  } else {
    if (sortBy) out.sort_by = sortBy;
    if (sortOrder) out.sort_order = sortOrder;
  }

  return out;
}

/**
 * Normalize `GET /storefront/products` body.
 * Backend may return a flat `{ products }` list or group by `{ categories: [{ products }] }`.
 */
export function extractStorefrontProductsPayload(response) {
  if (!response || typeof response !== 'object') {
    return { rawProducts: [], nextCursor: null };
  }

  const payload =
    response.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data
      : response;

  const nextCursor = payload.nextCursor ?? payload.next_cursor ?? null;

  if (Array.isArray(payload.products)) {
    return { rawProducts: payload.products, nextCursor };
  }

  if (Array.isArray(payload.categories)) {
    const seen = new Set();
    const rawProducts = [];
    for (const cat of payload.categories) {
      if (!cat || !Array.isArray(cat.products)) continue;
      for (const p of cat.products) {
        const id = p?.id != null ? String(p.id) : '';
        if (id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        rawProducts.push(p);
      }
    }
    return { rawProducts, nextCursor };
  }

  return { rawProducts: [], nextCursor: null };
}

/**
 * List products — `GET /storefront/products` with `x-shop-id` header.
 * @param {object} params — passed through {@link buildStorefrontProductsQuery}
 * @returns {Promise<{ products: Array, pagination: { nextCursor: string|null } }>}
 */
export async function getProducts(params = {}) {
  try {
    const query = buildStorefrontProductsQuery(params);

    const shopId = await resolveShopId();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }
    const headers = shopId ? { 'x-shop-id': shopId } : undefined;

    const response = await apiFetchRoot('/storefront/products', {
      method: 'GET',
      headers,
      query,
      omitTenantHeader: true,
    });

    const { rawProducts, nextCursor } = extractStorefrontProductsPayload(response);

    return {
      products: rawProducts.map(transformProduct).filter(Boolean),
      pagination: {
        nextCursor,
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [], pagination: { nextCursor: null } };
  }
}

/**
 * Get product by ID
 * @param {string} productId - Product UUID
 * @returns {Promise<object|null>}
 */
export async function getProductById(productId) {
  try {
    const shopId = await resolveShopId();
    const headers = shopId ? { 'x-shop-id': shopId } : undefined;

    const lookup = await resolveStorefrontProductLookup(productId);
    if (!lookup) return null;

    const response = await apiFetchRoot(`/storefront/products/${encodeURIComponent(lookup)}`, {
      method: 'GET',
      headers,
      omitTenantHeader: true,
    });

    const payload =
      response?.product && typeof response.product === 'object'
        ? response.product
        : response?.data?.product && typeof response.data.product === 'object'
          ? response.data.product
          : response?.data && typeof response.data === 'object' && (response.data.id || response.data.name)
            ? response.data
            : response;

    return transformProduct(payload);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

/**
 * Get product with related products
 * @param {string} productId - Product UUID
 * @returns {Promise<{product: object|null, relatedProducts: Array}>}
 */
export async function getProductWithRelated(productId) {
  try {
    const product = await getProductById(productId);
    if (!product) return { product: null, relatedProducts: [] };

    // "Similar" = same category (best-effort). Storefront supports `category_id`.
    const categoryId = product.categoryId || null;
    if (!categoryId) return { product, relatedProducts: [] };

    const list = await getProducts({ per_page: 24, category_id: categoryId });
    const relatedProducts = (list?.products || [])
      .filter((p) => p && p.id !== product.id)
      .slice(0, 12);

    return { product, relatedProducts };
  } catch (error) {
    console.error('Error fetching product with related:', error);
    return { product: null, relatedProducts: [] };
  }
}

/**
 * Search products
 * @param {object} params - Search parameters
 * @returns {Promise<{products: Array, pagination: object, query: string}>}
 */
export async function searchProducts(params = {}) {
  try {
    const { q, per_page = 20, category_id, brand_id, cursor, sort_by, sort_order } = params;

    if (!q || String(q).trim().length < 2) {
      return { products: [], pagination: { nextCursor: null }, query: q || '' };
    }

    const search = String(q).trim().slice(0, 200);

    const list = await getProducts({
      per_page,
      category_id,
      brand_id,
      cursor,
      sort_by,
      sort_order,
      search,
    });

    return { ...list, query: search };
  } catch (error) {
    console.error('Error searching products:', error);
    return { products: [], pagination: { nextCursor: null }, query: params.q || '' };
  }
}

/**
 * Get all categories (flat list from tree or legacy endpoint)
 * @returns {Promise<Array>}
 */
export async function getCategories() {
  try {
    const tree = await getCategoriesTree();
    return flattenCategoryTree(tree);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Flatten category tree to array (depth-first)
 */
function flattenCategoryTree(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [];
  const out = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children?.length) out.push(...flattenCategoryTree(node.children));
  }
  return out;
}

/**
 * Get category tree (nested root categories with children)
 * Tries shop tree endpoint first, then legacy /v1/categories
 * @returns {Promise<Array>}
 */
export async function getCategoriesTree() {
  try {
    const shopId = await resolveShopId();
    const headers = shopId ? { 'x-shop-id': shopId } : undefined;

    // Storefront categories are fetched by parent_id; build a tree with a bounded recursion.
    async function fetchChildren(parentId) {
      const res = await apiFetchRoot('/storefront/categories', {
        method: 'GET',
        headers,
        query: parentId ? { parent_id: parentId } : undefined,
        omitTenantHeader: true,
      });
      const list = res?.categories || [];
      const transformed = list.map(transformCategory).filter(Boolean);
      const withChildren = await Promise.all(
        transformed.map(async (c) => ({
          ...c,
          children: await fetchChildren(c.id),
        }))
      );
      return withChildren;
    }

    return await fetchChildren(null);
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      // generateStaticParams logs a single build warning; avoid duplicate stack traces.
    } else {
      console.error('Error fetching category tree:', error);
    }
    return [];
  }
}

/**
 * Build tree from flat list (parentId references)
 */
function buildTreeFromFlat(flat, parentId = null) {
  return flat
    .filter((c) => (c.parentId == null && parentId == null) || c.parentId === parentId)
    .map((node) => ({
      ...node,
      children: buildTreeFromFlat(flat, node.id),
    }));
}

/**
 * Get products by category (storefront API expects category UUID in `category_id`).
 * Accepts a UUID, and falls back to slug only when the backend supports it.
 * @param {string} categoryIdOrSlug - Category UUID (preferred) or slug
 * @param {object} params - Pagination parameters
 * @returns {Promise<{category: object, products: Array, pagination: object}>}
 */
export async function getCategoryProducts(categoryIdOrSlug, params = {}) {
  try {
    const { per_page = 20, cursor } = params;

    const list = await getProducts({
      per_page,
      cursor,
      category_id: categoryIdOrSlug,
    });

    return {
      category: null,
      products: list.products,
      pagination: list.pagination,
    };
  } catch (error) {
    console.error('Error fetching category products:', error);
    return {
      category: null,
      products: [],
      pagination: { nextCursor: null },
    };
  }
}

/**
 * Get products by category name (maps to slug)
 * Helper for backward compatibility
 */
export async function getProductsByCategory(categoryName, limit = null) {
  try {
    // First, try to find category by name
    const categories = await getCategories();
    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return [];
    }

    const result = await getCategoryProducts(category.id || category.slug, {
      page: 1,
      per_page: limit || 100,
    });

    return limit ? result.products.slice(0, limit) : result.products;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}
