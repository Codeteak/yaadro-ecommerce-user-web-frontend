/**
 * GET-only storefront catalog reads from Postgres (Supabase).
 * Discovers product/category tables and maps rows to the shape
 * expected by utils/productApi.js → transformProduct / transformCategory.
 */

import { query } from './db';

const PRODUCT_TABLE_CANDIDATES = [
  process.env.STOREFRONT_DB_PRODUCTS_TABLE,
  'products',
  'product',
  'catalog_products',
  'shop_products',
].filter(Boolean);

const CATEGORY_TABLE_CANDIDATES = [
  process.env.STOREFRONT_DB_CATEGORIES_TABLE,
  'categories',
  'category',
  'product_categories',
].filter(Boolean);

/** @type {{ products: string, categories: string|null, productCols: Set<string>, categoryCols: Set<string> } | null} */
let schemaCache = null;

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/**
 * @param {Set<string>} cols
 * @param {string[]} candidates
 */
function firstCol(cols, candidates) {
  for (const c of candidates) {
    if (cols.has(c)) return c;
  }
  return null;
}

async function tableExists(tableName) {
  const { rows } = await query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1
       AND table_type = 'BASE TABLE'
     LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function getColumns(tableName) {
  const { rows } = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((r) => String(r.column_name)));
}

async function resolveSchema() {
  if (schemaCache) return schemaCache;

  let products = null;
  for (const name of PRODUCT_TABLE_CANDIDATES) {
    if (await tableExists(name)) {
      products = name;
      break;
    }
  }
  if (!products) {
    throw new Error(
      `No products table found. Tried: ${PRODUCT_TABLE_CANDIDATES.join(', ')}. Set STOREFRONT_DB_PRODUCTS_TABLE.`
    );
  }

  let categories = null;
  for (const name of CATEGORY_TABLE_CANDIDATES) {
    if (await tableExists(name)) {
      categories = name;
      break;
    }
  }

  const productCols = await getColumns(products);
  const categoryCols = categories ? await getColumns(categories) : new Set();

  schemaCache = { products, categories, productCols, categoryCols };
  return schemaCache;
}

function toMinorFromMaybeMajor(value, fromMinorColumn) {
  if (value == null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (fromMinorColumn) return Math.round(n);
  // Rupees → paise
  return Math.round(n * 100);
}

/**
 * Map a DB product row to storefront API product JSON.
 * @param {Record<string, unknown>} row
 * @param {Set<string>} cols
 */
export function mapProductRow(row, cols) {
  const id = row[firstCol(cols, ['id', 'product_id', 'uuid']) || 'id'];
  const name = row[firstCol(cols, ['name', 'title', 'product_name']) || 'name'];
  const slug = row[firstCol(cols, ['slug', 'product_slug', 'handle']) || 'slug'];

  const minorListCol = firstCol(cols, [
    'actual_price_minor',
    'total_price_minor',
    'price_minor_per_unit',
    'price_minor',
    'mrp_minor',
  ]);
  const minorFinalCol = firstCol(cols, [
    'final_price_minor',
    'offer_price_minor_per_unit',
    'selling_price_minor',
    'sale_price_minor',
  ]);
  const majorPriceCol = firstCol(cols, ['price', 'selling_price', 'sale_price', 'unit_price']);
  const majorCompareCol = firstCol(cols, [
    'compare_at_price',
    'mrp',
    'original_price',
    'list_price',
  ]);

  let listMinor = 0;
  let finalMinor = 0;

  if (minorListCol) {
    listMinor = toMinorFromMaybeMajor(row[minorListCol], true);
  } else if (majorCompareCol || majorPriceCol) {
    listMinor = toMinorFromMaybeMajor(row[majorCompareCol || majorPriceCol], false);
  }

  if (minorFinalCol) {
    finalMinor = toMinorFromMaybeMajor(row[minorFinalCol], true);
  } else if (majorPriceCol) {
    finalMinor = toMinorFromMaybeMajor(row[majorPriceCol], false);
  } else {
    finalMinor = listMinor;
  }
  if (!listMinor && finalMinor) listMinor = finalMinor;

  const availabilityCol = firstCol(cols, ['availability', 'stock_status']);
  let availability = availabilityCol ? String(row[availabilityCol] || 'unknown') : null;
  if (!availability) {
    const inStockCol = firstCol(cols, ['in_stock', 'is_in_stock', 'inStock']);
    const stockCol = firstCol(cols, ['stock', 'stock_qty', 'quantity', 'qty']);
    if (inStockCol != null) {
      availability = row[inStockCol] ? 'in_stock' : 'out_of_stock';
    } else if (stockCol != null) {
      availability = Number(row[stockCol]) > 0 ? 'in_stock' : 'out_of_stock';
    } else {
      availability = 'unknown';
    }
  }

  const imageCol = firstCol(cols, [
    'image_url',
    'imageUrl',
    'thumbnail_url',
    'thumbnailUrl',
    'image',
    'photo_url',
  ]);
  const imageUrl = imageCol ? row[imageCol] : null;
  const thumbnail =
    imageUrl && typeof imageUrl === 'string'
      ? { url: imageUrl }
      : row.thumbnail && typeof row.thumbnail === 'object'
        ? row.thumbnail
        : null;

  const categoryIdCol = firstCol(cols, ['category_id', 'categoryId', 'primary_category_id']);
  const categoryNameCol = firstCol(cols, ['category_name', 'category', 'category_slug']);

  const descCol = firstCol(cols, ['description', 'details', 'body']);
  const brandCol = firstCol(cols, ['brand', 'brand_name']);
  const createdCol = firstCol(cols, ['created_at', 'createdAt', 'inserted_at']);
  const updatedCol = firstCol(cols, ['updated_at', 'updatedAt']);
  const shopCol = firstCol(cols, ['shop_id', 'shopId', 'tenant_id', 'store_id']);

  const categoryId = categoryIdCol ? row[categoryIdCol] : null;
  const categoryName = categoryNameCol ? row[categoryNameCol] : null;

  return {
    id,
    name: name != null ? String(name) : '',
    slug: slug != null ? String(slug) : '',
    description: descCol && row[descCol] != null ? String(row[descCol]) : '',
    brand: brandCol && row[brandCol] != null ? String(row[brandCol]) : '',
    actual_price_minor: listMinor,
    final_price_minor: finalMinor,
    price_minor_per_unit: listMinor,
    total_discount_minor: Math.max(0, listMinor - finalMinor),
    availability,
    category_id: categoryId,
    category:
      categoryId || categoryName
        ? {
            id: categoryId,
            name:
              typeof categoryName === 'string'
                ? categoryName
                : categoryName && typeof categoryName === 'object'
                  ? categoryName.name || ''
                  : '',
          }
        : null,
    thumbnail,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
    images: [],
    created_at: createdCol ? row[createdCol] : null,
    updated_at: updatedCol ? row[updatedCol] : null,
    shop_id: shopCol ? row[shopCol] : null,
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {Set<string>} cols
 */
export function mapCategoryRow(row, cols) {
  const id = row[firstCol(cols, ['id', 'category_id', 'uuid']) || 'id'];
  const name = row[firstCol(cols, ['name', 'title', 'category_name']) || 'name'];
  const slug = row[firstCol(cols, ['slug', 'category_slug', 'handle']) || 'slug'];
  const parentCol = firstCol(cols, ['parent_id', 'parentId', 'parent_category_id']);
  const activeCol = firstCol(cols, ['is_active', 'isActive', 'active', 'status']);
  const imageCol = firstCol(cols, ['image_url', 'imageUrl', 'icon_url', 'image']);
  const sortCol = firstCol(cols, ['sort_order', 'sortOrder', 'position', 'order']);
  const shopCol = firstCol(cols, ['shop_id', 'shopId', 'tenant_id']);

  let isActive = true;
  if (activeCol) {
    const v = row[activeCol];
    if (typeof v === 'boolean') isActive = v;
    else if (typeof v === 'number') isActive = v !== 0;
    else if (typeof v === 'string') {
      const s = v.toLowerCase();
      isActive = s === 'true' || s === 'active' || s === '1';
    }
  }

  const imageUrl = imageCol ? row[imageCol] : null;

  return {
    id,
    name: name != null ? String(name) : '',
    slug: slug != null ? String(slug) : '',
    parent_id: parentCol ? row[parentCol] ?? null : null,
    parentId: parentCol ? row[parentCol] ?? null : null,
    is_active: isActive,
    isActive,
    image: imageUrl && typeof imageUrl === 'string' ? { url: imageUrl } : imageUrl || null,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
    sort_order: sortCol ? Number(row[sortCol]) || 0 : 0,
    shop_id: shopCol ? row[shopCol] : null,
    children: [],
  };
}

function buildProductWhere(cols, { shopId, categoryId, search, availability }) {
  const clauses = [];
  const params = [];
  let i = 1;

  const shopCol = firstCol(cols, ['shop_id', 'shopId', 'tenant_id', 'store_id']);
  if (shopId && shopCol) {
    clauses.push(`${quoteIdent(shopCol)} = $${i++}`);
    params.push(shopId);
  }

  const deletedCol = firstCol(cols, ['deleted_at', 'deletedAt']);
  if (deletedCol) {
    clauses.push(`${quoteIdent(deletedCol)} IS NULL`);
  }

  const activeCol = firstCol(cols, ['is_active', 'isActive', 'active']);
  if (activeCol) {
    clauses.push(
      `(${quoteIdent(activeCol)} = TRUE OR ${quoteIdent(activeCol)}::text IN ('true','1','active'))`
    );
  }

  const catCol = firstCol(cols, ['category_id', 'categoryId', 'primary_category_id']);
  if (categoryId && catCol) {
    clauses.push(`${quoteIdent(catCol)} = $${i++}`);
    params.push(categoryId);
  }

  const nameCol = firstCol(cols, ['name', 'title', 'product_name']);
  const slugCol = firstCol(cols, ['slug', 'product_slug', 'handle']);
  if (search && (nameCol || slugCol)) {
    const parts = [];
    if (nameCol) {
      parts.push(`${quoteIdent(nameCol)} ILIKE $${i}`);
    }
    if (slugCol) {
      parts.push(`${quoteIdent(slugCol)} ILIKE $${i}`);
    }
    params.push(`%${search}%`);
    i += 1;
    clauses.push(`(${parts.join(' OR ')})`);
  }

  const availCol = firstCol(cols, ['availability', 'stock_status']);
  if (availability && availCol) {
    clauses.push(`${quoteIdent(availCol)} = $${i++}`);
    params.push(availability);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params, nextIndex: i };
}

/**
 * @param {object} opts
 * @param {string} [opts.shopId]
 * @param {string} [opts.categoryId]
 * @param {string} [opts.search]
 * @param {string} [opts.availability]
 * @param {number} [opts.limit]
 * @param {number} [opts.offset]
 * @param {string} [opts.sortBy]
 * @param {string} [opts.sortOrder]
 */
export async function listProductsFromDb(opts = {}) {
  const schema = await resolveSchema();
  const { products, productCols } = schema;
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
  const offset = Math.min(50000, Math.max(0, Number(opts.offset) || 0));

  const { where, params, nextIndex } = buildProductWhere(productCols, opts);

  const createdCol = firstCol(productCols, ['created_at', 'createdAt', 'inserted_at']);
  const nameCol = firstCol(productCols, ['name', 'title', 'product_name']);
  const priceMinorCol = firstCol(productCols, [
    'final_price_minor',
    'actual_price_minor',
    'price_minor',
    'price',
  ]);

  let orderBy = createdCol ? `${quoteIdent(createdCol)} DESC` : '1';
  const sortBy = opts.sortBy;
  const sortOrder = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';
  if (sortBy === 'name' && nameCol) orderBy = `${quoteIdent(nameCol)} ${sortOrder}`;
  else if (sortBy === 'price' && priceMinorCol) {
    orderBy = `${quoteIdent(priceMinorCol)} ${sortOrder}`;
  } else if (sortBy === 'created_at' && createdCol) {
    orderBy = `${quoteIdent(createdCol)} ${sortOrder}`;
  }

  const sql = `
    SELECT *
    FROM ${quoteIdent(products)}
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
  `;
  const { rows } = await query(sql, [...params, limit, offset]);
  return {
    products: rows.map((r) => mapProductRow(r, productCols)),
    nextCursor: null,
  };
}

/**
 * @param {string} idOrSlug
 * @param {string} [shopId]
 */
export async function getProductFromDb(idOrSlug, shopId) {
  const schema = await resolveSchema();
  const { products, productCols } = schema;
  const idCol = firstCol(productCols, ['id', 'product_id', 'uuid']);
  const slugCol = firstCol(productCols, ['slug', 'product_slug', 'handle']);
  if (!idCol && !slugCol) {
    throw new Error('Products table has no id/slug column');
  }

  const clauses = [];
  const params = [];
  let i = 1;

  const idSlugParts = [];
  if (idCol) {
    idSlugParts.push(`${quoteIdent(idCol)}::text = $${i}`);
  }
  if (slugCol) {
    idSlugParts.push(`${quoteIdent(slugCol)} = $${i}`);
  }
  params.push(String(idOrSlug));
  i += 1;
  clauses.push(`(${idSlugParts.join(' OR ')})`);

  const shopCol = firstCol(productCols, ['shop_id', 'shopId', 'tenant_id', 'store_id']);
  if (shopId && shopCol) {
    clauses.push(`${quoteIdent(shopCol)} = $${i++}`);
    params.push(shopId);
  }

  const deletedCol = firstCol(productCols, ['deleted_at', 'deletedAt']);
  if (deletedCol) {
    clauses.push(`${quoteIdent(deletedCol)} IS NULL`);
  }

  const sql = `
    SELECT *
    FROM ${quoteIdent(products)}
    WHERE ${clauses.join(' AND ')}
    LIMIT 1
  `;
  const { rows } = await query(sql, params);
  if (!rows[0]) return null;
  return mapProductRow(rows[0], productCols);
}

/**
 * @param {object} opts
 * @param {string} [opts.shopId]
 * @param {string|null} [opts.parentId]
 */
export async function listCategoriesFromDb(opts = {}) {
  const schema = await resolveSchema();
  if (!schema.categories) {
    return { categories: [] };
  }
  const { categories, categoryCols } = schema;
  const clauses = [];
  const params = [];
  let i = 1;

  const shopCol = firstCol(categoryCols, ['shop_id', 'shopId', 'tenant_id']);
  if (opts.shopId && shopCol) {
    clauses.push(`${quoteIdent(shopCol)} = $${i++}`);
    params.push(opts.shopId);
  }

  const parentCol = firstCol(categoryCols, ['parent_id', 'parentId', 'parent_category_id']);
  if (parentCol) {
    if (opts.parentId == null || opts.parentId === '') {
      clauses.push(`${quoteIdent(parentCol)} IS NULL`);
    } else {
      clauses.push(`${quoteIdent(parentCol)} = $${i++}`);
      params.push(opts.parentId);
    }
  }

  const deletedCol = firstCol(categoryCols, ['deleted_at', 'deletedAt']);
  if (deletedCol) {
    clauses.push(`${quoteIdent(deletedCol)} IS NULL`);
  }

  const sortCol = firstCol(categoryCols, ['sort_order', 'sortOrder', 'position', 'order']);
  const nameCol = firstCol(categoryCols, ['name', 'title']);
  const orderBy = sortCol
    ? `${quoteIdent(sortCol)} ASC`
    : nameCol
      ? `${quoteIdent(nameCol)} ASC`
      : '1';

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT *
    FROM ${quoteIdent(categories)}
    ${where}
    ORDER BY ${orderBy}
  `;
  const { rows } = await query(sql, params);
  return {
    categories: rows.map((r) => mapCategoryRow(r, categoryCols)),
  };
}

/** Clear cached table discovery (tests / hot reload). */
export function resetStorefrontDbSchemaCache() {
  schemaCache = null;
}
