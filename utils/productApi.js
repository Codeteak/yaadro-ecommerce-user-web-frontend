/**
 * Product & Category API service functions
 * Uses the multi-tenant backend API
 */

import { api } from './apiClient';

/**
 * Transform API product to frontend format
 */
function transformProduct(apiProduct) {
  if (!apiProduct) return null;

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

  return {
    id: apiCategory.id,
    name: apiCategory.name,
    slug: apiCategory.slug,
    description: apiCategory.description || '',
    image: apiCategory.image || null,
    icon: apiCategory.icon || null,
    isActive: apiCategory.isActive !== undefined ? apiCategory.isActive : true,
    isFeatured: apiCategory.isFeatured || false,
    displayOrder: apiCategory.displayOrder || 0,
    parentId: apiCategory.parentId || null,
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
 * List products with filters and pagination
 * @param {object} params - Query parameters
 * @returns {Promise<{products: Array, pagination: object}>}
 */
export async function getProducts(params = {}) {
  try {
    const {
      page = 1,
      per_page = 20,
      category_id,
      category_slug,
      search,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = params;

    const query = {
      page,
      per_page,
      sort_by,
      sort_order,
    };

    if (category_id) query.category_id = category_id;
    if (category_slug) query.category_slug = category_slug;
    if (search) query.search = search;
    if (min_price !== undefined) query.min_price = min_price;
    if (max_price !== undefined) query.max_price = max_price;

    const response = await api.get('/v1/products', { query });

    return {
      products: (response?.products || []).map(transformProduct),
      pagination: response?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 } };
  }
}

/**
 * Get product by ID
 * @param {string} productId - Product UUID
 * @returns {Promise<object|null>}
 */
export async function getProductById(productId) {
  try {
    const response = await api.get(`/v1/products/${productId}`);
    // API returns { product: {...}, related_products: [...] } in data
    const product = response?.product || response;
    return transformProduct(product);
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
    const response = await api.get(`/v1/products/${productId}`);
    return {
      product: transformProduct(response?.product || response),
      relatedProducts: (response?.related_products || []).map(transformProduct),
    };
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
    const {
      q,
      page = 1,
      per_page = 20,
      category_id,
      min_price,
      max_price,
    } = params;

    if (!q || q.trim().length < 2) {
      return { products: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 }, query: q || '' };
    }

    const query = {
      q: q.trim(),
      page,
      per_page,
    };

    if (category_id) query.category_id = category_id;
    if (min_price !== undefined) query.min_price = min_price;
    if (max_price !== undefined) query.max_price = max_price;

    const response = await api.get('/v1/products/search', { query });

    return {
      products: (response?.products || []).map(transformProduct),
      pagination: response?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
      },
      query: response?.query || q,
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return { products: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 }, query: params.q || '' };
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
    const response = await api.get('/v1/shop/categories/tree');
    const tree = response?.tree ?? response?.data?.tree;
    if (tree && Array.isArray(tree)) {
      return tree.map(transformCategory);
    }
  } catch (_) {
    // Fallback to legacy endpoint
  }
  try {
    const response = await api.get('/v1/categories');
    const list = response?.categories || response?.data?.categories || [];
    const transformed = list.map(transformCategory);
    return buildTreeFromFlat(transformed);
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
 * Get products by category slug
 * @param {string} categorySlug - Category slug
 * @param {object} params - Pagination parameters
 * @returns {Promise<{category: object, products: Array, pagination: object}>}
 */
export async function getCategoryProducts(categorySlug, params = {}) {
  try {
    const { page = 1, per_page = 20 } = params;

    const response = await api.get(`/v1/categories/${categorySlug}/products`, {
      query: { page, per_page },
    });

    return {
      category: transformCategory(response?.category),
      products: (response?.products || []).map(transformProduct),
      pagination: response?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching category products:', error);
    return {
      category: null,
      products: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
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

    const result = await getCategoryProducts(category.slug, {
      page: 1,
      per_page: limit || 100,
    });

    return limit ? result.products.slice(0, limit) : result.products;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}
