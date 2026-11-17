import { cacheLife, cacheTag } from "next/cache";
import { publicGet } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  readAllCategories,
  readHomeSections,
  readProduct,
  readProductPage,
  type DbProduct,
} from "@/lib/db/catalog";
import { requireShopId } from "@/lib/db/shop-id";
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

function shopHeader(): string {
  return process.env.NEXT_PUBLIC_SHOP_ID?.trim() ?? "";
}

async function apiGet(path: string, shopId = shopHeader()): Promise<unknown> {
  const queryStart = path.indexOf("?");
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart);
  const query: Record<string, string> = {};
  if (queryStart !== -1) {
    const params = new URLSearchParams(path.slice(queryStart + 1));
    params.forEach((value, key) => {
      query[key] = value;
    });
  }
  try {
    return await publicGet(pathname, { query, shopId: shopId || null });
  } catch (error) {
    if (error instanceof ApiError) {
      const wrapped = new Error(error.message) as Error & { status?: number };
      wrapped.status = error.status;
      throw wrapped;
    }
    throw error;
  }
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
  const raw =
    typeof value === "string"
      ? value.trim()
      : (pickString(asRecord(value)?.url, asRecord(value)?.imageUrl) ?? "");
  if (!raw) return "";
  // Same comma-joined dump the product mapper already splits.
  if (/,https?:\/\//i.test(raw)) {
    return raw.split(/,(?=https?:\/\/)/i)[0]?.trim() ?? "";
  }
  return raw;
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

function fromDbProduct(row: DbProduct): SampleProduct | null {
  return mapCatalogProduct({
    raw: {
      id: row.id,
      name: row.name,
      description: row.description,
      unit: row.unit,
      unit_size: row.unit_size,
      sold_by_weight: row.sold_by_weight,
      category_id: row.category_id,
      category_name: row.category_name,
      actual_price_minor: row.actual_price_minor,
      final_price_minor: row.final_price_minor,
      image: row.image,
      images: row.images,
    },
    categoryName: row.category_name ?? undefined,
    categoryId: row.category_id ?? undefined,
    categorySlug: row.category_slug ?? undefined,
  });
}

export async function listStoreCategories(): Promise<StoreCategory[]> {
  "use cache";
  cacheTag("storefront-catalog");
  cacheLife("minutes");
  const rows = await readAllCategories();
  return rows
    .map(mapCategory)
    .filter((row): row is StoreCategory => Boolean(row))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

type ProductGroup = {
  category: StoreCategory | null;
  products: SampleProduct[];
};

function groupDbProducts(rows: DbProduct[]): ProductGroup[] {
  const groups: ProductGroup[] = [];
  const index = new Map<string, ProductGroup>();
  for (const row of rows) {
    const product = fromDbProduct(row);
    if (!product) continue;
    const key = row.category_id ?? "uncategorized";
    let group = index.get(key);
    if (!group) {
      group = {
        category:
          row.category_id && row.category_name && row.category_slug
            ? {
                id: row.category_id,
                name: row.category_name,
                slug: row.category_slug,
                parentId: row.category_parent_id,
                image: "",
                sortOrder: 0,
              }
            : null,
        products: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.products.push(product);
  }
  return groups;
}

async function fetchProductGroups(options: {
  categoryId?: string;
  search?: string;
  cursor?: string | null;
}): Promise<{
  groups: ProductGroup[];
  nextCursor: string | null;
}> {
  const page = await readProductPage(requireShopId(), {
    categoryId: options.categoryId,
    search: options.search,
    cursor: options.cursor,
    limit: 50,
  });
  return { groups: groupDbProducts(page.products), nextCursor: page.nextCursor };
}

/** Up to three pages (50 each) of products, optionally scoped to a category. */
export async function listStoreProducts(options?: {
  categoryId?: string;
  search?: string;
}): Promise<ProductGroup[]> {
  "use cache";
  cacheTag("storefront-catalog");
  cacheLife("minutes");
  const groups: ProductGroup[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 3; page += 1) {
    const batch = await fetchProductGroups({
      categoryId: options?.categoryId,
      search: options?.search,
      cursor,
    });
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
  cacheTag("storefront-catalog");
  cacheLife("minutes");
  const row = await readProduct(requireShopId(), idOrSlug);
  if (!row) return null;
  const product = fromDbProduct(row);
  if (!product) return null;
  return {
    product,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
  };
}

export async function listHomeShelves(): Promise<StoreShelf[]> {
  "use cache";
  cacheTag("storefront-catalog");
  cacheLife("minutes");
  const rows = await readHomeSections();
  const shelves: StoreShelf[] = [];
  for (const row of rows) {
    const products = row.products
      .map((product) => fromDbProduct(product))
      .filter((product): product is SampleProduct => Boolean(product));
    if (products.length === 0) continue;
    shelves.push({ id: row.id, title: row.title, products });
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

export type CategoryBranch = {
  id: string;
  name: string;
  slug: string;
  image: string;
  children: { id: string; name: string; slug: string; image: string }[];
};

export type HomeCatalog = {
  ok: boolean;
  error: string | null;
  categories: StoreCategory[];
  branches: CategoryBranch[];
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
  branches: [],
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

    const branches: CategoryBranch[] = roots.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      image: root.image,
      children: categories
        .filter((row) => row.parentId === root.id)
        .map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          image: row.image,
        })),
    }));

    return {
      ok: true,
      error: null,
      categories: roots,
      branches,
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

export type CategoryBrowserData = {
  ok: boolean;
  error: string | null;
  branches: CategoryBranch[];
  products: SampleProduct[];
  /** `all`, `cat:<slug>`, or `sub:<slug>`. */
  selectedKey: string;
};

/**
 * Categories screen payload: the aisle tree, plus products for the
 * selected aisle. `all` loads the same capped catalog as home shelves
 * (`listStoreProducts()` — up to three pages).
 */
export async function loadCategoryBrowser(
  cat: string | undefined,
): Promise<CategoryBrowserData> {
  try {
    const categories = await listStoreCategories();
    const roots = categories.filter(
      (category) => !category.parentId && category.slug !== "all",
    );
    const branches: CategoryBranch[] = roots.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      image: root.image,
      children: categories
        .filter((row) => row.parentId === root.id)
        .map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          image: row.image,
        })),
    }));

    // No `cat` (first visit) and `cat=all` both load the capped full catalog.
    if (!cat || cat === "all") {
      const groups = await listStoreProducts();
      const products = groups.flatMap((group) =>
        group.products.map((product) => ({
          ...product,
          category: group.category?.name ?? product.category,
          categoryId: group.category?.id ?? product.categoryId,
          categorySlug: group.category?.slug ?? product.categorySlug,
        })),
      );
      return {
        ok: true,
        error: null,
        branches,
        products,
        selectedKey: "all",
      };
    }

    const category = categories.find(
      (row) => row.slug === cat && row.slug !== "all",
    );
    if (!category) {
      return {
        ok: true,
        error: null,
        branches,
        products: [],
        selectedKey: "all",
      };
    }

    const groups = await listStoreProducts({ categoryId: category.id });
    const products = groups.flatMap((group) =>
      group.products.map((product) => ({
        ...product,
        category: group.category?.name ?? category.name,
        categoryId: group.category?.id ?? category.id,
        categorySlug: group.category?.slug ?? category.slug,
      })),
    );
    const selectedKey = category.parentId
      ? `sub:${category.slug}`
      : `cat:${category.slug}`;
    return { ok: true, error: null, branches, products, selectedKey };
  } catch {
    return {
      ok: false,
      error: "We couldn't load categories. Pull to try again.",
      branches: [],
      products: [],
      selectedKey: "all",
    };
  }
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
