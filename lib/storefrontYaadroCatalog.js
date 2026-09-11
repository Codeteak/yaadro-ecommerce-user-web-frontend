/**
 * Yaadro shop-api schema reads (shop_products, global_categories, promotion_coupons).
 * Used when those tables exist so we do not hit the generic `products` table
 * (wrong prices / missing shop overlay).
 */

import { query } from './db';

/** @type {boolean | null} */
let yaadroCatalog = null;

export async function hasYaadroShopCatalog() {
  if (yaadroCatalog != null) return yaadroCatalog;
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN ('shop_products', 'global_categories')`
  );
  yaadroCatalog = Number(rows[0]?.n) >= 2;
  return yaadroCatalog;
}

export function resetYaadroCatalogCache() {
  yaadroCatalog = null;
}

function mediaUrl(storageKey, imageUrl) {
  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    const u = imageUrl.trim();
    if (/^https?:\/\//i.test(u)) return u;
  }
  const key = String(storageKey || '').trim().replace(/^\/+/, '');
  if (!key) return typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
  if (/^https?:\/\//i.test(key)) return key;
  const base = (
    process.env.OBJECT_STORAGE_PUBLIC_BASE_URL ||
    'https://media.yaadro.online'
  )
    .trim()
    .replace(/\/+$/, '');
  return base ? `${base}/${key}` : null;
}

function toMinor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function mapYaadroProduct(row) {
  const listMinor = toMinor(row.price_minor_per_unit);
  const offerMinor = toMinor(row.offer_price_minor_per_unit);
  const finalMinor = offerMinor > 0 && offerMinor < listMinor ? offerMinor : offerMinor || listMinor;
  const imageUrl = mediaUrl(row.image_storage_key, row.image_url);
  return {
    id: row.id,
    name: row.name != null ? String(row.name) : '',
    slug: row.slug != null ? String(row.slug) : '',
    description: row.description != null ? String(row.description) : '',
    actual_price_minor: listMinor,
    final_price_minor: finalMinor,
    price_minor_per_unit: listMinor,
    offer_price_minor_per_unit: offerMinor || null,
    total_discount_minor: Math.max(0, listMinor - finalMinor),
    availability: row.availability || 'unknown',
    category_id: row.category_id || null,
    category:
      row.category_id || row.category_name
        ? { id: row.category_id, name: row.category_name || '', slug: row.category_slug || '' }
        : null,
    thumbnail: imageUrl ? { url: imageUrl } : null,
    imageUrl,
    images: [],
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    shop_id: row.shop_id || null,
  };
}

const PRODUCT_SELECT = `
  SELECT sp.id, sp.shop_id, sp.status, sp.availability,
         sp.price_minor_per_unit, sp.offer_price_minor_per_unit,
         sp.created_at, sp.updated_at,
         COALESCE(sp.name, gp.name) AS name,
         COALESCE(sp.slug, gp.slug) AS slug,
         COALESCE(sp.description, gp.description) AS description,
         COALESCE(sp.global_category_id, gp.global_category_id) AS category_id,
         COALESCE(NULLIF(BTRIM(sp.image_url), ''), gp.image_url) AS image_url,
         c.name AS category_name,
         c.slug AS category_slug
    FROM shop_products sp
    LEFT JOIN global_products gp ON gp.id = sp.global_product_id
    LEFT JOIN global_categories c
      ON c.id = COALESCE(sp.global_category_id, gp.global_category_id)
`;

/**
 * @param {object} opts
 */
export async function listYaadroProducts(opts = {}) {
  const shopId = opts.shopId;
  if (!shopId) return { products: [], nextCursor: null };

  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
  const offset = Math.min(50000, Math.max(0, Number(opts.offset) || 0));
  const clauses = [`sp.shop_id = $1::uuid`, `sp.status = 'active'`];
  const params = [shopId];
  let i = 2;

  if (opts.categoryId) {
    clauses.push(`COALESCE(sp.global_category_id, gp.global_category_id) = $${i++}::uuid`);
    params.push(opts.categoryId);
  }
  if (opts.availability) {
    clauses.push(`sp.availability = $${i++}`);
    params.push(opts.availability);
  }
  if (opts.search) {
    clauses.push(
      `(COALESCE(sp.name, gp.name) ILIKE $${i} OR COALESCE(sp.slug, gp.slug) ILIKE $${i})`
    );
    params.push(`%${opts.search}%`);
    i += 1;
  }

  const sortOrder = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';
  let orderBy = `sp.created_at ${sortOrder}`;
  if (opts.sortBy === 'name') orderBy = `COALESCE(sp.name, gp.name) ${sortOrder}`;
  else if (opts.sortBy === 'price') {
    orderBy = `COALESCE(NULLIF(sp.offer_price_minor_per_unit, 0), sp.price_minor_per_unit) ${sortOrder}`;
  } else if (opts.sortBy === 'created_at') {
    orderBy = `sp.created_at ${sortOrder}`;
  }

  const sql = `
    ${PRODUCT_SELECT}
     WHERE ${clauses.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT $${i++} OFFSET $${i}
  `;
  const { rows } = await query(sql, [...params, limit, offset]);
  return {
    products: rows.map(mapYaadroProduct),
    nextCursor: null,
  };
}

export async function getYaadroProduct(idOrSlug, shopId) {
  if (!shopId || !idOrSlug) return null;
  const { rows } = await query(
    `${PRODUCT_SELECT}
      WHERE sp.shop_id = $1::uuid
        AND sp.status = 'active'
        AND (sp.id::text = $2 OR COALESCE(sp.slug, gp.slug) = $2)
      LIMIT 1`,
    [shopId, String(idOrSlug)]
  );
  if (!rows[0]) return null;
  return mapYaadroProduct(rows[0]);
}

/**
 * @param {{ shopId: string, parentId?: string|null, all?: boolean }} opts
 */
export async function listYaadroCategories(opts = {}) {
  const shopId = opts.shopId;
  if (!shopId) return { categories: [] };

  const params = [shopId];
  const clauses = [
    `c.is_active = true`,
    `(c.scope = 'shared' OR (c.scope = 'private' AND c.owner_shop_id = $1::uuid))`,
    `NOT EXISTS (
       SELECT 1 FROM shop_catalog_hides h
        WHERE h.shop_id = $1::uuid
          AND h.entity_type = 'category'
          AND h.entity_id = c.id
     )`,
  ];
  let i = 2;

  if (!opts.all) {
    if (opts.parentId) {
      clauses.push(`c.parent_id = $${i++}::uuid`);
      params.push(opts.parentId);
    } else {
      clauses.push(`c.parent_id IS NULL`);
    }
  }

  const { rows } = await query(
    `SELECT c.id, c.parent_id, c.name, c.slug, c.sort_order, c.is_active,
            ma.storage_key AS image_storage_key
       FROM global_categories c
       LEFT JOIN LATERAL (
         SELECT gci.media_asset_id
           FROM global_category_images gci
          WHERE gci.global_category_id = c.id
          ORDER BY gci.sort_order ASC
          LIMIT 1
       ) img ON true
       LEFT JOIN media_assets ma ON ma.id = img.media_asset_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY c.sort_order ASC, c.name ASC
      LIMIT 5000`,
    params
  );

  return {
    categories: rows.map((row) => {
      const imageUrl = mediaUrl(row.image_storage_key, null);
      return {
        id: row.id,
        name: row.name != null ? String(row.name) : '',
        slug: row.slug != null ? String(row.slug) : '',
        parent_id: row.parent_id ?? null,
        parentId: row.parent_id ?? null,
        is_active: row.is_active !== false,
        isActive: row.is_active !== false,
        image: imageUrl ? { url: imageUrl } : null,
        imageUrl,
        sort_order: Number(row.sort_order) || 0,
      };
    }),
  };
}

export async function listYaadroCoupons(opts = {}) {
  const shopId = opts.shopId;
  if (!shopId) {
    return {
      promotionsPaused: false,
      settings: {
        maxCouponsPerOrder: 1,
        allowCombineAutoCampaigns: true,
        firstCouponEligibilityDays: 30,
      },
      coupons: [],
    };
  }

  const settingsRes = await query(
    `SELECT promotions_paused, first_coupon_eligibility_days,
            max_coupons_per_order, allow_combine_auto_campaigns
       FROM shop_promotion_settings
      WHERE shop_id = $1::uuid
      LIMIT 1`,
    [shopId]
  );
  const settingsRow = settingsRes.rows[0] || {};
  const promotionsPaused = settingsRow.promotions_paused === true;
  const settings = {
    maxCouponsPerOrder: Number(settingsRow.max_coupons_per_order ?? 1),
    allowCombineAutoCampaigns: settingsRow.allow_combine_auto_campaigns !== false,
    firstCouponEligibilityDays: Number(settingsRow.first_coupon_eligibility_days ?? 30),
  };

  if (promotionsPaused) {
    return { promotionsPaused: true, settings, coupons: [] };
  }

  const params = [shopId];
  let codeClause = '';
  if (opts.code && String(opts.code).trim()) {
    codeClause = `AND upper(c.code_normalized) = $2`;
    params.push(String(opts.code).trim().toUpperCase());
  }

  const { rows } = await query(
    `SELECT c.id, c.promotion_id, c.code_normalized, c.starts_at, c.ends_at,
            c.min_subtotal_minor, c.first_order_only, c.new_customer_only,
            p.name AS promotion_name,
            pub_rules.promotion_rules_public
       FROM promotion_coupons c
       JOIN promotions p ON p.id = c.promotion_id AND p.shop_id = c.shop_id
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'kind', pr.rule_kind,
                    'percentBps', pr.percent_bps,
                    'amountMinor', pr.amount_minor,
                    'minSubtotalMinor', pr.min_subtotal_minor
                  )
                  ORDER BY pr.created_at ASC
                ) AS promotion_rules_public
           FROM promotion_rules pr
          WHERE pr.shop_id = c.shop_id
            AND pr.promotion_id = c.promotion_id
            AND pr.is_deleted = false
       ) pub_rules ON true
      WHERE c.shop_id = $1::uuid
        AND c.is_deleted = false
        AND p.status = 'active'
        AND p.is_deleted = false
        AND c.starts_at <= now()
        AND c.ends_at >= now()
        AND p.starts_at <= now()
        AND p.ends_at >= now()
        ${codeClause}
      ORDER BY p.priority ASC, p.created_at DESC, c.code_normalized ASC
      LIMIT 50`,
    params
  );

  const cartSubtotal =
    opts.cartSubtotalMinor != null && Number.isFinite(Number(opts.cartSubtotalMinor))
      ? Math.max(0, Math.floor(Number(opts.cartSubtotalMinor)))
      : null;

  const allowedKinds = new Set([
    'cart_percent_off',
    'cart_fixed_off',
    'cart_fixed_off_if_subtotal_above',
    'cart_percent_off_if_subtotal_above',
    'category_percent_off',
  ]);

  const coupons = rows.map((row) => {
    const minSub =
      row.min_subtotal_minor != null ? Number(row.min_subtotal_minor) : 0;
    const ineligibilityCodes = [];
    if (cartSubtotal != null && minSub > 0 && cartSubtotal < minSub) {
      ineligibilityCodes.push('MIN_SUBTOTAL_NOT_MET');
    }
    const benefits = Array.isArray(row.promotion_rules_public)
      ? row.promotion_rules_public.filter((b) => b && allowedKinds.has(b.kind))
      : [];
    return {
      id: row.id,
      code: String(row.code_normalized || '').toUpperCase(),
      promotionId: row.promotion_id,
      promotionName: row.promotion_name || '',
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      minSubtotalMinor: minSub || 0,
      firstOrderOnly: row.first_order_only === true,
      newCustomerOnly: row.new_customer_only === true,
      benefits,
      eligibility: {
        applicable: ineligibilityCodes.length === 0,
        ineligibilityCodes,
      },
    };
  });

  const filtered =
    opts.onlyApplicable === true
      ? coupons.filter((c) => c.eligibility.applicable)
      : coupons;

  return { promotionsPaused: false, settings, coupons: filtered };
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter(Boolean);
}

export async function listYaadroHomeSections(shopId) {
  if (!shopId) return { data: { sections: [] } };

  const { rows } = await query(
    `SELECT id, title, type, sort_order, starts_at, ends_at,
            product_ids, category_ids, buy_product_ids, get_product_ids,
            buy_qty, get_qty, promotion_id
       FROM shop_home_sections
      WHERE shop_id = $1::uuid
        AND deleted_at IS NULL
        AND is_enabled = true
        AND (
          type <> 'event_shelf'
          OR (
            (starts_at IS NULL OR starts_at <= now())
            AND (ends_at IS NULL OR ends_at >= now())
          )
        )
      ORDER BY sort_order ASC, created_at ASC`,
    [shopId]
  );

  const productIds = [];
  for (const row of rows) {
    productIds.push(
      ...asIdList(row.product_ids),
      ...asIdList(row.buy_product_ids),
      ...asIdList(row.get_product_ids)
    );
  }
  const uniqueIds = [...new Set(productIds)];

  let productById = new Map();
  if (uniqueIds.length > 0) {
    const prod = await query(
      `SELECT sp.id,
              COALESCE(sp.name, gp.name) AS name,
              COALESCE(sp.slug, gp.slug) AS slug,
              sp.price_minor_per_unit,
              COALESCE(NULLIF(BTRIM(sp.image_url), ''), gp.image_url) AS image_url
         FROM shop_products sp
         LEFT JOIN global_products gp ON gp.id = sp.global_product_id
        WHERE sp.shop_id = $1::uuid
          AND sp.id = ANY($2::uuid[])
          AND sp.status = 'active'`,
      [shopId, uniqueIds]
    );
    productById = new Map(
      prod.rows.map((r) => [
        String(r.id),
        {
          id: r.id,
          name: r.name,
          slug: r.slug,
          imageUrl: mediaUrl(null, r.image_url),
          priceMinorPerUnit: toMinor(r.price_minor_per_unit),
        },
      ])
    );
  }

  const orderByIds = (ids) =>
    asIdList(ids)
      .map((id) => productById.get(String(id)))
      .filter(Boolean);

  const bxgyLabel = (buyQty, getQty) => {
    const buy = Number.isInteger(buyQty) ? buyQty : 1;
    const get = Number.isInteger(getQty) ? getQty : 1;
    if (buy === 1 && get === 1) return 'Buy 1 Get 1 Free';
    return `Buy ${buy} Get ${get}`;
  };

  const sections = rows.map((row) => {
    const type = row.type;
    const base = { id: row.id, type, title: row.title, sortOrder: row.sort_order };
    if (type === 'buy_x_get_y') {
      const buyQty = row.buy_qty == null ? null : Number(row.buy_qty);
      const getQty = row.get_qty == null ? null : Number(row.get_qty);
      return {
        ...base,
        buyQty: Number.isInteger(buyQty) ? buyQty : null,
        getQty: Number.isInteger(getQty) ? getQty : null,
        label: bxgyLabel(buyQty, getQty),
        promotionId: row.promotion_id ?? null,
        buyProducts: orderByIds(row.buy_product_ids),
        getProducts: orderByIds(row.get_product_ids),
      };
    }
    return {
      ...base,
      startsAt: row.starts_at || null,
      endsAt: row.ends_at || null,
      categories: [],
      products: orderByIds(row.product_ids),
    };
  });

  return { data: { sections } };
}

export async function getYaadroCatalogRevision(shopId) {
  if (!shopId) return { shopId: null, generation: 0 };
  const { rows } = await query(
    `SELECT EXTRACT(EPOCH FROM COALESCE(MAX(updated_at), TIMESTAMP '1970-01-01')) AS epoch
       FROM shop_products
      WHERE shop_id = $1::uuid`,
    [shopId]
  );
  const epoch = Number(rows[0]?.epoch) || 0;
  return { shopId, generation: Math.floor(epoch * 1000) };
}
