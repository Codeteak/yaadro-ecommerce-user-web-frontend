/**
 * Parameterized copies of the shop API catalog SELECTs.
 * Identifiers here are fixed. Shop id, search, category, and cursor
 * are bound as values and never concatenated into the statement.
 *
 * The uuid check and ILIKE escape match shop-id.ts and search.ts.
 * catalog-query.test.ts fails if those copies drift.
 */

const SHOP_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return SHOP_UUID.test(value);
}

function toIlikePattern(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const escaped = value.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}

const NAME_SQL = `COALESCE(sp.name, gp.name)`;
const SLUG_SQL = `COALESCE(sp.slug, gp.slug)`;
const UNIT_SQL = `COALESCE(sp.base_unit, gp.base_unit)`;
const UNIT_SIZE_SQL = `COALESCE(sp.unit_size, gp.unit_size)`;
const DESCRIPTION_SQL = `COALESCE(sp.description, gp.description)`;
const SEO_TITLE_SQL = `COALESCE(sp.seo_title, gp.seo_title)`;
const SEO_DESCRIPTION_SQL = `COALESCE(sp.seo_description, gp.seo_description)`;
const CATEGORY_ID_SQL = `COALESCE(sp.global_category_id, gp.global_category_id)`;
const IMAGE_URL_SQL = `COALESCE(NULLIF(BTRIM(sp.image_url), ''), gp.image_url)`;
const LEFT_JOIN_GLOBAL = `LEFT JOIN global_products gp ON gp.id = sp.global_product_id`;
const BASELINE_PRICE_SQL =
  "CASE WHEN sp.offer_price_minor_per_unit IS NOT NULL AND sp.offer_price_minor_per_unit > 0 AND sp.offer_price_minor_per_unit < sp.price_minor_per_unit THEN sp.offer_price_minor_per_unit ELSE sp.price_minor_per_unit END";

const CATEGORY_IMAGE_JOIN = `LEFT JOIN LATERAL (
             SELECT x.media_asset_id
               FROM (
                 SELECT gci.media_asset_id, gci.sort_order, gci.created_at, 0 AS pri
                   FROM global_category_images gci
                  WHERE gci.global_category_id = c.id
                 UNION ALL
                 SELECT sci.media_asset_id, sci.sort_order, sci.created_at, 1 AS pri
                   FROM shop_category_images sci
                  WHERE sci.global_category_id = c.id
                    AND sci.shop_id = $1::uuid
                    AND c.scope = 'private'
                    AND c.owner_shop_id = $1::uuid
               ) x
              ORDER BY x.pri ASC, x.sort_order ASC, x.created_at ASC
              LIMIT 1
           ) img ON true
           LEFT JOIN media_assets ma ON ma.id = img.media_asset_id`;

const CATEGORY_NOT_HIDDEN = `AND NOT EXISTS (
              SELECT 1 FROM shop_catalog_hides h
              WHERE h.shop_id = $1::uuid
                AND h.entity_type = 'category'
                AND h.entity_id = c.id
            )`;

const THUMB_JOIN = `LEFT JOIN LATERAL (
       WITH chosen_images AS (
         SELECT spi.media_asset_id, spi.sort_order
           FROM shop_product_images spi
          WHERE spi.shop_product_id = sp.id
         UNION ALL
         SELECT gpi.media_asset_id, gpi.sort_order
           FROM global_product_images gpi
          WHERE gpi.global_product_id = sp.global_product_id
            AND NOT EXISTS (
              SELECT 1 FROM shop_product_images spi2 WHERE spi2.shop_product_id = sp.id
            )
       )
       SELECT ci.media_asset_id, ma.storage_key, ma.content_type
         FROM chosen_images ci
         JOIN media_assets ma ON ma.id = ci.media_asset_id
        ORDER BY ci.sort_order ASC
        LIMIT 1
     ) thumb ON true`;

export const SELLABLE_CATEGORY_IDS_SQL = `WITH RECURSIVE category_ancestors AS (
           SELECT DISTINCT ${CATEGORY_ID_SQL} AS id
             FROM shop_products sp
             ${LEFT_JOIN_GLOBAL}
            WHERE sp.shop_id = $1::uuid
              AND sp.status = 'active'
              AND sp.availability = 'in_stock'
              AND ${CATEGORY_ID_SQL} IS NOT NULL
           UNION
           SELECT c.parent_id
             FROM global_categories c
             JOIN category_ancestors ca ON c.id = ca.id
            WHERE c.parent_id IS NOT NULL
         )
         SELECT DISTINCT id::text AS id
           FROM category_ancestors
          WHERE id IS NOT NULL`;

export function allCategoriesSql(filterSellable: boolean): string {
  const sellable = filterSellable ? `AND c.id = ANY($2::uuid[])` : "";
  return `SELECT c.id, c.parent_id, c.name, c.slug, c.sort_order,
                ma.id AS image_media_id,
                ma.storage_key AS image_storage_key,
                ma.content_type AS image_content_type
           FROM global_categories c
           ${CATEGORY_IMAGE_JOIN}
          WHERE c.is_active = true
            AND (
              c.scope = 'shared'
              OR (c.scope = 'private' AND c.owner_shop_id = $1::uuid)
            )
            ${CATEGORY_NOT_HIDDEN}
            ${sellable}
          ORDER BY c.sort_order ASC, c.name ASC
          LIMIT 5000`;
}

export type ProductListInput = {
  categoryId?: string | null;
  search?: string | null;
  includeDescendants?: boolean;
  limit: number;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
};

export function buildProductListQuery(input: ProductListInput): { text: string; values: unknown[] } {
  const categoryId = input.categoryId && isUuid(input.categoryId) ? input.categoryId : null;
  const limit = Math.min(Math.max(Math.floor(input.limit) || 24, 1), 100);
  const values: unknown[] = [
    null, // $1 shop, filled by the caller
    categoryId,
    null,
    toIlikePattern(input.search),
    "in_stock",
    null,
    null,
    limit,
  ];

  let cursorClause = "";
  if (
    input.cursorCreatedAt &&
    input.cursorId &&
    isUuid(input.cursorId) &&
    Number.isFinite(Date.parse(input.cursorCreatedAt))
  ) {
    values.push(input.cursorCreatedAt, input.cursorId);
    cursorClause = `AND (sp.created_at, sp.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`;
  }

  const hasCategory = categoryId != null;
  const categoryCtes = hasCategory
    ? `WITH RECURSIVE category_descendants AS (
      SELECT c.id, c.parent_id
        FROM global_categories c
       WHERE c.id = $2::uuid
      UNION ALL
      SELECT c.id, c.parent_id
        FROM global_categories c
        JOIN category_descendants cd ON c.parent_id = cd.id
    ),
    category_direct_products AS (
      SELECT EXISTS (
        SELECT 1
          FROM shop_products sp2
          LEFT JOIN global_products gp2 ON gp2.id = sp2.global_product_id
         WHERE sp2.shop_id = $1::uuid
           AND sp2.status = 'active'
           AND ($5::text IS NULL OR sp2.availability = $5)
           AND COALESCE(sp2.global_category_id, gp2.global_category_id) = $2::uuid
      ) AS has_direct
    ),
    effective_categories AS (
      ${
        input.includeDescendants
          ? `SELECT cd.id FROM category_descendants cd WHERE $2::uuid IS NOT NULL`
          : `SELECT $2::uuid AS id
       WHERE $2::uuid IS NOT NULL
         AND (SELECT has_direct FROM category_direct_products)
      UNION ALL
      SELECT cd.id
        FROM category_descendants cd
       WHERE $2::uuid IS NOT NULL
         AND NOT (SELECT has_direct FROM category_direct_products)
         AND cd.id <> $2::uuid`
      }
    )
    `
    : "";
  const categoryPredicate = `AND ($2::uuid IS NULL${
    hasCategory ? ` OR ${CATEGORY_ID_SQL} IN (SELECT id FROM effective_categories)` : ""
  })`;

  const text = `${categoryCtes}SELECT sp.id,
          ${CATEGORY_ID_SQL} AS category_id,
          ${NAME_SQL} AS name,
          ${SLUG_SQL} AS slug,
          ${UNIT_SQL} AS base_unit,
          ${UNIT_SIZE_SQL}::text AS unit_size,
          sp.stock_quantity::text AS stock_quantity,
          COALESCE(sp.sold_by_weight, false) AS sold_by_weight,
          ${DESCRIPTION_SQL} AS description,
          sp.status,
          sp.availability,
          sp.price_minor_per_unit::text AS price_minor_per_unit,
          sp.offer_price_minor_per_unit::text AS offer_price_minor_per_unit,
          sp.created_at,
          ${IMAGE_URL_SQL} AS global_image_url,
          thumb.media_asset_id AS thumb_media_id,
          thumb.storage_key AS thumb_storage_key,
          thumb.content_type AS thumb_content_type,
          c.parent_id AS category_parent_id,
          c.name AS category_name,
          c.slug AS category_slug
     FROM shop_products sp
     ${LEFT_JOIN_GLOBAL}
     ${THUMB_JOIN}
     LEFT JOIN global_categories c ON c.id = ${CATEGORY_ID_SQL}
    WHERE sp.shop_id = $1::uuid
      AND sp.status = 'active'
      ${categoryPredicate}
      AND ($3::uuid IS NULL OR COALESCE(sp.global_brand_id, gp.global_brand_id) = $3)
      AND ($4::text IS NULL OR ${NAME_SQL} ILIKE $4 ESCAPE '\\' OR ${SLUG_SQL} ILIKE $4 ESCAPE '\\')
      AND ($5::text IS NULL OR sp.availability = $5)
      AND ($6::bigint IS NULL OR (${BASELINE_PRICE_SQL}) >= $6)
      AND ($7::bigint IS NULL OR (${BASELINE_PRICE_SQL}) <= $7)
      ${cursorClause}
    ORDER BY sp.created_at DESC, sp.id DESC
    LIMIT $8`;

  return { text, values };
}

export const PRODUCT_DETAIL_COLUMNS = `sp.id, sp.shop_id, ${CATEGORY_ID_SQL} AS category_id,
                ${NAME_SQL} AS name, ${SLUG_SQL} AS slug, ${UNIT_SQL} AS base_unit,
                ${UNIT_SIZE_SQL}::text AS unit_size, sp.stock_quantity::text AS stock_quantity,
                COALESCE(sp.sold_by_weight, false) AS sold_by_weight,
                ${DESCRIPTION_SQL} AS description, ${SEO_TITLE_SQL} AS seo_title,
                ${SEO_DESCRIPTION_SQL} AS seo_description,
                sp.status, sp.availability,
                sp.price_minor_per_unit::text AS price_minor_per_unit,
                sp.offer_price_minor_per_unit::text AS offer_price_minor_per_unit,
                sp.created_at, sp.global_product_id, ${IMAGE_URL_SQL} AS global_image_url`;

export const HOME_SECTION_BY_ID_SQL = `SELECT id, title, type, sort_order, starts_at, ends_at,
                product_ids, category_ids, buy_product_ids, get_product_ids
           FROM shop_home_sections
          WHERE shop_id = $1::uuid
            AND id = $2::uuid
            AND deleted_at IS NULL
            AND is_enabled = true`;

export const HOME_SECTIONS_SQL = `SELECT id, title, type, sort_order, starts_at, ends_at,
                product_ids, category_ids, buy_product_ids, get_product_ids
           FROM shop_home_sections
          WHERE shop_id = $1::uuid
            AND deleted_at IS NULL
            AND is_enabled = true
            AND (starts_at IS NULL OR starts_at <= now())
            AND (ends_at IS NULL OR ends_at >= now())
          ORDER BY sort_order ASC, created_at ASC`;

export const PRODUCTS_BY_IDS_SQL = `SELECT sp.id, ${NAME_SQL} AS name, ${SLUG_SQL} AS slug,
                ${CATEGORY_ID_SQL} AS category_id,
                sp.stock_quantity::text AS stock_quantity,
                COALESCE(sp.sold_by_weight, false) AS sold_by_weight,
                ${DESCRIPTION_SQL} AS description,
                ${UNIT_SQL} AS base_unit,
                ${UNIT_SIZE_SQL}::text AS unit_size,
                sp.price_minor_per_unit::text AS price_minor_per_unit,
                sp.offer_price_minor_per_unit::text AS offer_price_minor_per_unit,
                ${IMAGE_URL_SQL} AS global_image_url,
                thumb.storage_key AS thumb_storage_key,
                c.name AS category_name,
                c.slug AS category_slug
           FROM shop_products sp
           ${LEFT_JOIN_GLOBAL}
           ${THUMB_JOIN}
           LEFT JOIN global_categories c ON c.id = ${CATEGORY_ID_SQL}
          WHERE sp.shop_id = $1::uuid
            AND sp.id = ANY($2::uuid[])
            AND sp.status = 'active'
            AND sp.availability = 'in_stock'`;

export const SHOP_HUB_SQL = `SELECT s.id,
                s.status,
                s.service_area_radius_meters,
                a.lat AS hub_lat,
                a.lng AS hub_lng
           FROM shops s
           LEFT JOIN addresses a ON a.id = s.address_id
          WHERE s.id = $1`;
