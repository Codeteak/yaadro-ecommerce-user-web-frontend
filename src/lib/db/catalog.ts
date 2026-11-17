import "server-only";

import type { PoolClient } from "pg";
import {
  HOME_SECTIONS_SQL,
  PRODUCT_DETAIL_COLUMNS,
  PRODUCTS_BY_IDS_SQL,
  SELLABLE_CATEGORY_IDS_SQL,
  allCategoriesSql,
  buildProductListQuery,
} from "@/lib/db/catalog-query";
import { toPublicMediaUrl } from "@/lib/db/media";
import { withShop } from "@/lib/db/pool";
import { isShopUuid, requireShopId } from "@/lib/db/shop-id";

const LEFT_JOIN_GLOBAL = `LEFT JOIN global_products gp ON gp.id = sp.global_product_id`;

export type DbCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  image: string | null;
};

export type DbProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  unit: string | null;
  unit_size: string | null;
  sold_by_weight: boolean;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_parent_id: string | null;
  actual_price_minor: number;
  final_price_minor: number;
  image: string | null;
  images?: string[];
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
};

type ProductRow = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function minor(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function prices(listRaw: unknown, offerRaw: unknown): {
  actual_price_minor: number;
  final_price_minor: number;
} {
  const list = minor(listRaw) ?? 0;
  const offer = minor(offerRaw);
  const selling = offer != null && offer > 0 && offer < list ? offer : list;
  return { actual_price_minor: list, final_price_minor: selling };
}

function imageFrom(row: ProductRow): string | null {
  const direct = text(row.global_image_url);
  if (direct && /^https?:\/\//i.test(direct)) return direct;
  return toPublicMediaUrl(row.thumb_storage_key) ?? (direct ? toPublicMediaUrl(direct) : null);
}

function mapProduct(row: ProductRow, images?: string[]): DbProduct {
  const priced = prices(row.price_minor_per_unit, row.offer_price_minor_per_unit);
  const created = row.created_at instanceof Date ? row.created_at.toISOString() : text(row.created_at);
  return {
    id: String(row.id),
    name: text(row.name) ?? "",
    slug: text(row.slug),
    description: text(row.description),
    unit: text(row.base_unit),
    unit_size: text(row.unit_size),
    sold_by_weight: row.sold_by_weight === true,
    category_id: text(row.category_id),
    category_name: text(row.category_name),
    category_slug: text(row.category_slug),
    category_parent_id: text(row.category_parent_id),
    ...priced,
    image: imageFrom(row),
    images,
    seo_title: text(row.seo_title),
    seo_description: text(row.seo_description),
    created_at: created,
  };
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt, id }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): { t: string; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      t?: unknown;
      id?: unknown;
    };
    if (typeof parsed.t !== "string" || typeof parsed.id !== "string") return null;
    if (!isShopUuid(parsed.id) || !Number.isFinite(Date.parse(parsed.t))) return null;
    return { t: parsed.t, id: parsed.id };
  } catch {
    return null;
  }
}

async function sellableCategoryIds(client: PoolClient, shopId: string): Promise<string[]> {
  const { rows } = await client.query<{ id: string }>(SELLABLE_CATEGORY_IDS_SQL, [shopId]);
  return rows.map((row) => row.id).filter((id) => isShopUuid(id));
}

export async function readAllCategories(shopId = requireShopId()): Promise<DbCategory[]> {
  return withShop(shopId, async (client) => {
    const sellable = await sellableCategoryIds(client, shopId);
    if (sellable.length === 0) return [];
    const { rows } = await client.query<ProductRow>(allCategoriesSql(true), [shopId, sellable]);
    return rows
      .map((row) => {
        const id = text(row.id);
        const name = text(row.name);
        const slug = text(row.slug);
        if (!id || !name || !slug) return null;
        return {
          id,
          name,
          slug,
          parent_id: text(row.parent_id),
          sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
          image: toPublicMediaUrl(row.image_storage_key),
        };
      })
      .filter((row): row is DbCategory => Boolean(row));
  });
}

export async function readProductPage(
  shopId: string,
  options: { categoryId?: string; search?: string; cursor?: string | null; limit?: number },
): Promise<{ products: DbProduct[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const cursor = decodeCursor(options.cursor);
  const built = buildProductListQuery({
    categoryId: options.categoryId,
    search: options.search,
    includeDescendants: Boolean(options.categoryId),
    limit: limit + 1,
    cursorCreatedAt: cursor?.t,
    cursorId: cursor?.id,
  });
  built.values[0] = shopId;
  const { rows } = await withShop(shopId, (client) => client.query<ProductRow>(built.text, built.values));
  const page = rows.slice(0, limit).map((row) => mapProduct(row)).filter((row) => row.name);
  const last = page[page.length - 1];
  const nextCursor =
    rows.length > limit && last?.created_at ? encodeCursor(last.created_at, last.id) : null;
  return { products: page, nextCursor };
}

async function galleryUrls(client: PoolClient, product: ProductRow): Promise<string[]> {
  const productId = String(product.id);
  const { rows } = await client.query<{ storage_key: string | null }>(
    `SELECT m.storage_key
       FROM shop_product_images spi
       JOIN media_assets m ON m.id = spi.media_asset_id
      WHERE spi.shop_product_id = $1::uuid
      ORDER BY spi.sort_order ASC
      LIMIT 6`,
    [productId],
  );
  let keys = rows.map((row) => row.storage_key);
  const globalId = text(product.global_product_id);
  if (keys.length === 0 && globalId && isShopUuid(globalId)) {
    const fallback = await client.query<{ storage_key: string | null }>(
      `SELECT m.storage_key
         FROM global_product_images gpi
         JOIN media_assets m ON m.id = gpi.media_asset_id
        WHERE gpi.global_product_id = $1::uuid
        ORDER BY gpi.sort_order ASC
        LIMIT 6`,
      [globalId],
    );
    keys = fallback.rows.map((row) => row.storage_key);
  }
  const urls = keys.map((key) => toPublicMediaUrl(key)).filter((url): url is string => Boolean(url));
  const direct = imageFrom(product);
  if (urls.length === 0 && direct) urls.push(direct);
  return urls;
}

async function readProductRow(
  client: PoolClient,
  shopId: string,
  idOrSlug: string,
): Promise<ProductRow | null> {
  const byId = isShopUuid(idOrSlug);
  const sql = `SELECT ${PRODUCT_DETAIL_COLUMNS}
     FROM shop_products sp
     ${LEFT_JOIN_GLOBAL}
    WHERE sp.shop_id = $1::uuid
      AND ${byId ? "sp.id = $2::uuid" : `lower(COALESCE(sp.slug, gp.slug)) = $2`}
      AND sp.status = 'active'
      AND sp.availability = 'in_stock'
    LIMIT 1`;
  const { rows } = await client.query<ProductRow>(sql, [
    shopId,
    byId ? idOrSlug : idOrSlug.trim().toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function readProduct(shopId: string, idOrSlug: string): Promise<DbProduct | null> {
  return withShop(shopId, async (client) => {
    const row = await readProductRow(client, shopId, idOrSlug);
    if (!row || !text(row.name)) return null;
    const images = await galleryUrls(client, row);
    const product = mapProduct(row, images);
    if (images[0]) product.image = images[0];
    return product;
  });
}

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter((id) => isShopUuid(id));
}

async function productsByIds(client: PoolClient, shopId: string, ids: string[]): Promise<DbProduct[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const { rows } = await client.query<ProductRow>(PRODUCTS_BY_IDS_SQL, [shopId, unique]);
  const byId = new Map(rows.map((row) => [String(row.id), mapProduct(row)]));
  return unique.map((id) => byId.get(id)).filter((row): row is DbProduct => Boolean(row?.name));
}

export async function readHomeSections(
  shopId = requireShopId(),
): Promise<{ id: string; title: string; products: DbProduct[] }[]> {
  return withShop(shopId, async (client) => {
    let sections: ProductRow[] = [];
    try {
      const result = await client.query<ProductRow>(HOME_SECTIONS_SQL, [shopId]);
      sections = result.rows;
    } catch (error) {
      if ((error as { code?: string }).code === "42P01") return [];
      throw error;
    }
    const shelves: { id: string; title: string; products: DbProduct[] }[] = [];
    for (const section of sections) {
      const id = text(section.id);
      const title = text(section.title);
      if (!id || !title) continue;
      const pinned = [
        ...idList(section.product_ids),
        ...idList(section.buy_product_ids),
        ...idList(section.get_product_ids),
      ];
      const products = await productsByIds(client, shopId, pinned);
      const seen = new Set(products.map((product) => product.id));
      for (const categoryId of idList(section.category_ids)) {
        if (products.length >= 50) break;
        const built = buildProductListQuery({
          categoryId,
          includeDescendants: true,
          limit: 50,
        });
        built.values[0] = shopId;
        const { rows } = await client.query<ProductRow>(built.text, built.values);
        for (const row of rows) {
          const product = mapProduct(row);
          if (!product.name || seen.has(product.id)) continue;
          seen.add(product.id);
          products.push(product);
          if (products.length >= 50) break;
        }
      }
      if (products.length === 0) continue;
      shelves.push({ id, title, products: products.slice(0, 50) });
    }
    return shelves;
  });
}
