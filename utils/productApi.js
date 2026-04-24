/**
 * Product & Category API service functions
 * Uses the multi-tenant backend API
 */

import { api, apiFetchRoot } from './apiClient';
import { getShopIdFromEnv } from './authApi';
import { mediaObjectToUrl } from './mediaUrl';

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
  if (apiProduct.price_minor_per_unit !== undefined) {
    const priceMinor = Number(apiProduct.price_minor_per_unit || 0);
    const offerMinor =
      apiProduct.offer_price_minor_per_unit !== undefined && apiProduct.offer_price_minor_per_unit !== null
        ? Number(apiProduct.offer_price_minor_per_unit || 0)
        : null;

    const price = Number.isFinite(priceMinor) ? priceMinor / 100 : 0;
    const offerPrice = Number.isFinite(offerMinor) ? offerMinor / 100 : null;

    const availability = apiProduct.availability || 'unknown';
    const inStock = availability === 'in_stock';

    const thumbnailUrl = mediaObjectToUrl(apiProduct.thumbnail) || null;

    const sortedImages = Array.isArray(apiProduct.images)
      ? [...apiProduct.images].sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      : [];
    const galleryUrls = sortedImages
      .map((img) => mediaObjectToUrl(img))
      .filter(Boolean);

    const image = thumbnailUrl || galleryUrls[0] || '/images/dummy.png';
    const images = galleryUrls.length ? galleryUrls : [image];

    return {
      id: apiProduct.id,
      name: apiProduct.name,
      shortName: apiProduct.name,
      slug: apiProduct.slug || apiProduct.id,
      price,
      originalPrice: offerPrice != null && offerPrice < price ? price : null,
      compareAtPrice: offerPrice != null && offerPrice < price ? price : null,
      offerPrice,
      offerPriceEffective: offerPrice,
      category: normalizeCategoryName(apiProduct.category) || apiProduct.category_slug || '',
      subcategory: '',
      description: '',
      image,
      images,
      thumbnailUrl,
      inStock,
      stock: inStock ? 1 : 0,
      weight: null,
      unit: apiProduct.unit || '',
      brand: '',
      sku: '',
      barcode: '',
      discountPercentage:
        offerPrice != null && price > 0 ? Math.round(((price - offerPrice) / price) * 100) : 0,
      shop: null,
      createdAt: apiProduct.created_at || '',
      updatedAt: apiProduct.updated_at || '',
      // keep raw fields around for UI that wants them
      availability,
      thumbnail: apiProduct.thumbnail || null,
      categoryId: apiProduct.category_id || null,
      categoryObj: apiProduct.category || null,
    };
  }

  const images = apiProduct.images || [];
  const firstImage = apiProduct.thumbnailUrl || (images.length > 0 ? images[0] : null);

  return {
    id: apiProduct.id,
    name: apiProduct.name,
    shortName: apiProduct.shortName || apiProduct.name,
    slug: apiProduct.slug || apiProduct.id,
    price: parseFloat(apiProduct.price) || 0,
    originalPrice: apiProduct.compareAtPrice ? parseFloat(apiProduct.compareAtPrice) : null,
    compareAtPrice: apiProduct.compareAtPrice ? parseFloat(apiProduct.compareAtPrice) : null,
    costPrice: apiProduct.costPrice != null ? parseFloat(apiProduct.costPrice) : null,
    offerPrice: apiProduct.offerPrice != null ? parseFloat(apiProduct.offerPrice) : null,
    offerPriceEffective: apiProduct.offerPriceEffective != null ? parseFloat(apiProduct.offerPriceEffective) : null,
    category: apiProduct.category || apiProduct.subcategory || '',
    subcategory: apiProduct.subcategory || '',
    description: apiProduct.description || '',
    image: firstImage || '/images/dummy.png',
    images: images,
    thumbnailUrl: apiProduct.thumbnailUrl || null,
    inStock: apiProduct.inStock !== undefined ? apiProduct.inStock : (apiProduct.stock > 0),
    stock: apiProduct.stock ?? 0,
    minStockAlert: apiProduct.minStockAlert ?? null,
    weight: apiProduct.weight != null ? parseFloat(apiProduct.weight) : null,
    grossWeight: apiProduct.grossWeight != null ? parseFloat(apiProduct.grossWeight) : null,
    unit: apiProduct.unit || '',
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
 * List products — `GET /storefront/products` with `x-shop-id` header.
 * @param {object} params — passed through {@link buildStorefrontProductsQuery}
 * @returns {Promise<{ products: Array, pagination: { nextCursor: string|null } }>}
 */
export async function getProducts(params = {}) {
  try {
    const query = buildStorefrontProductsQuery(params);

    const shopId = getShopIdFromEnv();
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

    return {
      products: (response?.products || []).map(transformProduct),
      pagination: {
        nextCursor: response?.nextCursor ?? null,
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
    const shopId = getShopIdFromEnv();
    const headers = shopId ? { 'x-shop-id': shopId } : undefined;

    const response = await apiFetchRoot(`/storefront/products/${encodeURIComponent(productId)}`, {
      method: 'GET',
      headers,
      omitTenantHeader: true,
    });

    return transformProduct(response);
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
    const shopId = getShopIdFromEnv();
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
    console.error('Error fetching category tree:', error);
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
