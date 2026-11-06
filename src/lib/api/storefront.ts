import { cacheLife } from "next/cache";
import { mapCatalogProduct } from "@/lib/catalog-map";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import type { SampleProduct } from "@/lib/sample-products";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: string;
  sortOrder: number;
};

export type StoreShelf = {
  id: string;
  title: string;
  products: SampleProduct[];
};

export type ShopBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

export type ResolvedShop = {
  id: string;
  name: string;
  image: string;
  description: string;
  banners: ShopBanner[];
};

function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

function shopHeader(): string {
  return process.env.NEXT_PUBLIC_SHOP_ID?.trim() ?? "";
}

async function apiGet(path: string, shopId = shopHeader()): Promise<unknown> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (shopId) headers["x-shop-id"] = shopId;
  const response = await fetch(`${apiOrigin()}${path}`, { headers });
  if (!response.ok) {
    const error = new Error(`${path} failed (${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function imageUrl(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return pickString(record?.url, record?.imageUrl) ?? "";
}

function mapCategory(value: unknown): StoreCategory | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = pickString(row.id);
  const name = pickString(row.name);
  const slug = pickString(row.slug);
  if (!id || !name || !slug) return null;
  const parent = row.parent_id ?? row.parentId;
  return {
    id,
    name,
    slug,
    parentId: typeof parent === "string" && parent ? parent : null,
    image: imageUrl(row.image) || CATEGORY_IMAGE_FALLBACK,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

function mapBanners(value: unknown): ShopBanner[] {
  if (!Array.isArray(value)) return [];
  const banners: ShopBanner[] = [];
  value.forEach((item, index) => {
    if (typeof item === "string" && /^https?:\/\//.test(item)) {
      banners.push({
        id: `banner-${index}`,
        title: "Offer",
        subtitle: "",
        image: item,
        href: "/categories",
      });
      return;
    }
    const row = asRecord(item);
    if (!row) return;
    const image = pickString(row.url, row.image, row.imageUrl, row.src, imageUrl(row.image));
    if (!image || !/^https?:\/\//.test(image)) return;
    banners.push({
      id: pickString(row.id) ?? `banner-${index}`,
      title: pickString(row.title, row.name) ?? "Offer",
      subtitle: pickString(row.subtitle, row.description) ?? "",
      image,
      href: pickString(row.href, row.link) ?? "/categories",
    });
  });
  return banners;
}

export function isProductUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function listStoreCategories(): Promise<StoreCategory[]> {
  "use cache";
  cacheLife("minutes");
  const json = asRecord(await apiGet("/api/storefront/categories?all=true"));
  const rows = Array.isArray(json?.categories) ? json.categories : [];
  return rows
    .map(mapCategory)
    .filter((row): row is StoreCategory => Boolean(row))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

type ProductGroup = {
  category: StoreCategory | null;
  products: SampleProduct[];
};

async function fetchProductGroups(query: URLSearchParams): Promise<{
  groups: ProductGroup[];
  nextCursor: string | null;
}> {
  const json = asRecord(await apiGet(`/api/storefront/products?${query.toString()}`));
  const rows = Array.isArray(json?.categories) ? json.categories : [];
  const groups = rows.map((row) => {
    const record = asRecord(row);
    const category = mapCategory(record);
    const products = Array.isArray(record?.products) ? record.products : [];
    return {
      category,
      products: products
        .map((product) =>
          mapCatalogProduct({
            raw: product,
            categoryName: category?.name,
            categoryId: category?.id,
            categorySlug: category?.slug,
          }),
        )
        .filter((product): product is SampleProduct => Boolean(product)),
    };
  });
  const nextCursor = pickString(json?.nextCursor);
  return { groups, nextCursor };
}

/** Up to three pages (50 each) of products, optionally scoped to a category. */
export async function listStoreProducts(options?: {
  categoryId?: string;
  search?: string;
}): Promise<ProductGroup[]> {
  "use cache";
  cacheLife("minutes");
  const groups: ProductGroup[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 3; page += 1) {
    const query = new URLSearchParams({ limit: "50" });
    if (options?.categoryId) {
      query.set("category_id", options.categoryId);
      query.set("include_descendants", "1");
    }
    if (options?.search) query.set("search", options.search);
    if (cursor) query.set("cursor", cursor);
    const batch = await fetchProductGroups(query);
    groups.push(...batch.groups);
    cursor = batch.nextCursor;
    if (!cursor) break;
  }
  return groups;
}

export async function getStoreProduct(idOrSlug: string): Promise<{
  product: SampleProduct;
  seoTitle?: string;
  seoDescription?: string;
} | null> {
  "use cache";
  cacheLife("minutes");
  const path = isProductUuid(idOrSlug)
    ? `/api/storefront/products/id/${idOrSlug}`
    : `/api/storefront/products/${encodeURIComponent(idOrSlug)}`;
  let json: unknown;
  try {
    json = await apiGet(path);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
  const record = asRecord(json);
  const source = asRecord(record?.product) ?? record;
  const product = mapCatalogProduct({ raw: source });
  if (!product || !source) return null;
  const seo = asRecord(source.seo);
  return {
    product,
    seoTitle: pickString(seo?.title) ?? undefined,
    seoDescription: pickString(seo?.description) ?? undefined,
  };
}

export async function listHomeShelves(): Promise<StoreShelf[]> {
  "use cache";
  cacheLife("minutes");
  const json = asRecord(await apiGet("/api/storefront/home-sections"));
  const data = asRecord(json?.data) ?? json;
  const rows = Array.isArray(data?.sections) ? data.sections : [];
  const shelves: StoreShelf[] = [];
  for (const row of rows) {
    const section = asRecord(row);
    if (!section) continue;
    const id = pickString(section.id);
    const title = pickString(section.title);
    if (!id || !title) continue;
    const products = (Array.isArray(section.products) ? section.products : [])
      .map((product) => mapCatalogProduct({ raw: product }))
      .filter((product): product is SampleProduct => Boolean(product));
    if (products.length === 0) continue;
    shelves.push({ id, title, products });
  }
  return shelves;
}

export async function fetchShopSeo(shopId = shopHeader()): Promise<ResolvedShop | null> {
  "use cache";
  cacheLife("minutes");
  if (!shopId) return null;
  const json = asRecord(await apiGet("/api/seo/metadata?pageType=shop", shopId));
  const seo = asRecord(json?.seo);
  const og = asRecord(seo?.og);
  const name = pickString(json?.shopName, seo?.title);
  if (!name || !seo) return null;
  return {
    id: pickString(json?.shopId) ?? shopId,
    name,
    image: pickString(og?.image) ?? "/icons/og-image.png",
    description: pickString(seo.description) ?? "Fresh groceries, right at your door.",
    banners: [],
  };
}

export async function resolveShopByDomain(domain: string): Promise<ResolvedShop | null> {
  "use cache";
  cacheLife("minutes");
  let json: unknown;
  try {
    json = await apiGet(
      `/api/shops/resolve-by-domain?domain=${encodeURIComponent(domain)}`,
    );
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
  const row = asRecord(json);
  if (!row) return null;
  const seo = asRecord(row.seo);
  const og = asRecord(seo?.og);
  const name = pickString(row.shop_name, seo?.title);
  const id = pickString(row.shop_id);
  if (!name || !id) return null;
  return {
    id,
    name,
    image:
      pickString(row.shop_image, og?.image) ?? "/icons/og-image.png",
    description:
      pickString(seo?.description) ?? "Fresh groceries, right at your door.",
    banners: row.banner_enabled === false ? [] : mapBanners(row.banner_images),
  };
}

export type HomeCatalog = {
  ok: boolean;
  error: string | null;
  categories: StoreCategory[];
  productsBySlug: Record<string, SampleProduct[]>;
  shelves: StoreShelf[];
  fruits: SampleProduct[];
  vegetables: SampleProduct[];
  products: SampleProduct[];
};

const EMPTY_HOME: HomeCatalog = {
  ok: false,
  error: null,
  categories: [],
  productsBySlug: {},
  shelves: [],
  fruits: [],
  vegetables: [],
  products: [],
};

function rootOf(
  category: StoreCategory,
  byId: Map<string, StoreCategory>,
): StoreCategory | null {
  let current: StoreCategory | undefined = category;
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    current = byId.get(current.parentId);
  }
  if (!current || current.slug === "all") return null;
  return current;
}

export async function loadHomeCatalog(): Promise<HomeCatalog> {
  try {
    const [categories, groups, shelves] = await Promise.all([
      listStoreCategories(),
      listStoreProducts(),
      listHomeShelves(),
    ]);
    const byId = new Map(categories.map((category) => [category.id, category]));
    const roots = categories.filter(
      (category) => !category.parentId && category.slug !== "all",
    );
    const productsBySlug: Record<string, SampleProduct[]> = {};
    for (const root of roots) productsBySlug[root.slug] = [];
    const products: SampleProduct[] = [];
    const seen = new Set<string>();

    for (const group of groups) {
      if (!group.category) continue;
      const root = rootOf(group.category, byId) ?? (
        group.category.slug !== "all" ? group.category : null
      );
      if (!root) continue;
      const bucket = productsBySlug[root.slug] ?? [];
      for (const product of group.products) {
        const tagged: SampleProduct = {
          ...product,
          category: group.category.name,
          categoryId: group.category.id,
          categorySlug: group.category.slug,
        };
        bucket.push(tagged);
        if (!seen.has(tagged.id)) {
          seen.add(tagged.id);
          products.push(tagged);
        }
      }
      productsBySlug[root.slug] = bucket;
    }

    return {
      ok: true,
      error: null,
      categories: roots,
      productsBySlug,
      shelves,
      fruits: productsBySlug.fruits ?? [],
      vegetables: productsBySlug.vegetables ?? [],
      products,
    };
  } catch {
    return {
      ...EMPTY_HOME,
      error: "We couldn't load the shop catalog. Pull to try again.",
    };
  }
}

export type CategoryListingData = {
  name: string;
  slug: string;
  image: string;
  subcategories: { id: string; name: string; image: string }[];
  products: SampleProduct[];
};

export async function loadCategoryListing(
  slug: string,
): Promise<CategoryListingData | null> {
  const categories = await listStoreCategories();
  const category = categories.find((row) => row.slug === slug);
  if (!category || category.slug === "all") return null;
  const children = categories.filter((row) => row.parentId === category.id);
  const groups = await listStoreProducts({ categoryId: category.id });
  const products = groups.flatMap((group) =>
    group.products.map((product) => ({
      ...product,
      category: group.category?.name ?? category.name,
      categoryId: group.category?.id ?? category.id,
      categorySlug: group.category?.slug ?? category.slug,
    })),
  );
  return {
    name: category.name,
    slug: category.slug,
    image: category.image,
    subcategories: children.map((child) => ({
      id: child.id,
      name: child.name,
      image: child.image || category.image,
    })),
    products,
  };
}

export function isLocalShopHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  );
}
