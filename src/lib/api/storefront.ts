import { cacheLife, cacheTag } from "next/cache";
import {
  CATALOG_BROWSE_MAX_PAGES,
  CATALOG_BROWSE_PAGE_SIZE,
  CATALOG_SEARCH_MAX_PAGES,
} from "@/lib/catalog-browse";
import { publicGet } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  readAllCategories,
  readHomeSection,
  readHomeSections,
  readProduct,
  readProductPage,
  type DbProduct,
} from "@/lib/db/catalog";
import { catalogCacheTag, defaultShopId, requireShopId } from "@/lib/db/shop-id";
import { mapCatalogProduct } from "@/lib/catalog-map";
import { CATEGORY_IMAGE_FALLBACK } from "@/lib/category-image";
import { SHOP_IMAGE_FALLBACK } from "@/lib/shop-fallback-avatars";
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
  return defaultShopId();
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

export async function listStoreCategories(shopId: string): Promise<StoreCategory[]> {
  "use cache";
  const id = requireShopId(shopId);
  cacheTag(catalogCacheTag(id));
  cacheLife("minutes");
  try {
    const rows = await readAllCategories(id);
    return rows
      .map(mapCategory)
      .filter((row): row is StoreCategory => Boolean(row))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  } catch {
    // Build/CI may lack DATABASE_URL or network — empty shell, refill at runtime.
    return [];
  }
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

async function fetchProductGroups(
  shopId: string,
  options: {
    categoryId?: string;
    search?: string;
    cursor?: string | null;
    pageSize?: number;
  },
): Promise<{
  groups: ProductGroup[];
  nextCursor: string | null;
}> {
  const page = await readProductPage(shopId, {
    categoryId: options.categoryId,
    search: options.search,
    cursor: options.cursor,
    limit: options.pageSize ?? 50,
  });
  return { groups: groupDbProducts(page.products), nextCursor: page.nextCursor };
}

/**
 * Product pages (default 50 each), optionally scoped to a category.
 * Browse defaults match `CATALOG_BROWSE_*` so warm + home + hub share cache.
 */
export async function listStoreProducts(
  shopId: string,
  options?: {
    categoryId?: string;
    search?: string;
    maxPages?: number;
    /** Rows per page (default = browse size; keep warm aligned). */
    pageSize?: number;
  },
): Promise<ProductGroup[]> {
  "use cache";
  const id = requireShopId(shopId);
  cacheTag(catalogCacheTag(id));
  cacheLife("minutes");
  try {
    const maxPages = Math.min(
      Math.max(options?.maxPages ?? CATALOG_SEARCH_MAX_PAGES, 1),
      CATALOG_SEARCH_MAX_PAGES,
    );
    const pageSize = Math.min(
      Math.max(options?.pageSize ?? CATALOG_BROWSE_PAGE_SIZE, 1),
      100,
    );
    const groups: ProductGroup[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < maxPages; page += 1) {
      const batch = await fetchProductGroups(id, {
        categoryId: options?.categoryId,
        search: options?.search,
        cursor,
        pageSize,
      });
      groups.push(...batch.groups);
      cursor = batch.nextCursor;
      if (!cursor) break;
    }
    return groups;
  } catch {
    return [];
  }
}

export async function getStoreProduct(
  shopId: string,
  idOrSlug: string,
): Promise<{
  product: SampleProduct;
  seoTitle?: string;
  seoDescription?: string;
} | null> {
  "use cache";
  const id = requireShopId(shopId);
  cacheTag(catalogCacheTag(id));
  cacheLife("minutes");
  try {
    const row = await readProduct(id, idOrSlug);
    if (!row) return null;
    const product = fromDbProduct(row);
    if (!product) return null;
    return {
      product,
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function listHomeShelves(shopId: string): Promise<StoreShelf[]> {
  "use cache";
  const id = requireShopId(shopId);
  cacheTag(catalogCacheTag(id));
  cacheLife("minutes");
  try {
    const rows = await readHomeSections(id);
    const shelves: StoreShelf[] = [];
    for (const row of rows) {
      const products = row.products
        .map((product) => fromDbProduct(product))
        .filter((product): product is SampleProduct => Boolean(product));
      if (products.length === 0) continue;
      shelves.push({ id: row.id, title: row.title, products });
    }
    return shelves;
  } catch {
    return [];
  }
}

export async function getHomeSection(
  shopId: string,
  sectionId: string,
): Promise<{
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  products: SampleProduct[];
} | null> {
  "use cache";
  const id = requireShopId(shopId);
  cacheTag(catalogCacheTag(id));
  cacheLife("minutes");
  try {
    const row = await readHomeSection(sectionId, id);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      products: row.products
        .map((product) => fromDbProduct(product))
        .filter((product): product is SampleProduct => Boolean(product)),
    };
  } catch {
    return null;
  }
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
    image: pickString(og?.image) ?? SHOP_IMAGE_FALLBACK,
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
      pickString(row.shop_image, og?.image) ?? SHOP_IMAGE_FALLBACK,
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

/**
 * Products for one root aisle — same `categoryId` (+ descendants) query as
 * `loadCategoryListing` / `/categories/[slug]`, so home rails match Show all.
 */
async function productsForRootCategory(
  shopId: string,
  root: StoreCategory,
): Promise<SampleProduct[]> {
  const groups = await listStoreProducts(shopId, {
    categoryId: root.id,
    maxPages: CATALOG_BROWSE_MAX_PAGES,
    pageSize: CATALOG_BROWSE_PAGE_SIZE,
  });
  return groups.flatMap((group) =>
    group.products.map((product) => ({
      ...product,
      category: group.category?.name ?? root.name,
      categoryId: group.category?.id ?? root.id,
      categorySlug: group.category?.slug ?? root.slug,
    })),
  );
}

export async function loadHomeCatalog(shopId: string): Promise<HomeCatalog> {
  try {
    const id = requireShopId(shopId);
    // Categories are already sellable-only (in-stock products in tree).
    const [categories, shelves] = await Promise.all([
      listStoreCategories(id),
      listHomeShelves(id),
    ]);
    const roots = categories.filter(
      (category) => !category.parentId && category.slug !== "all",
    );

    // Per-root fetches (parallel, cached) — not one global browse page bucketed
    // by parent walk (that mismatched `/categories/[slug]` order/set).
    const perRoot = await Promise.all(
      roots.map(async (root) => ({
        root,
        products: await productsForRootCategory(id, root),
      })),
    );

    const productsBySlug: Record<string, SampleProduct[]> = {};
    const products: SampleProduct[] = [];
    const seen = new Set<string>();
    for (const { root, products: bucket } of perRoot) {
      productsBySlug[root.slug] = bucket;
      for (const product of bucket) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        products.push(product);
      }
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
  shopId: string,
  slug: string,
): Promise<CategoryListingData | null> {
  const id = requireShopId(shopId);
  const categories = await listStoreCategories(id);
  const category = categories.find((row) => row.slug === slug);
  if (!category || category.slug === "all") return null;
  const children = categories.filter((row) => row.parentId === category.id);
  const groups = await listStoreProducts(id, { categoryId: category.id });
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
 * selected aisle. `all` uses one product page (same cap as home).
 */
function buildCategoryBranches(
  categories: Awaited<ReturnType<typeof listStoreCategories>>,
): CategoryBranch[] {
  const roots = categories.filter(
    (category) => !category.parentId && category.slug !== "all",
  );
  return roots.map((root) => ({
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
}

export async function loadCategoryBrowser(
  shopId: string,
  cat: string | undefined,
  search?: string,
): Promise<CategoryBrowserData> {
  const id = requireShopId(shopId);
  const q = search?.trim().slice(0, 200) || undefined;
  try {
    // Search from home (`?q=`) hits the same DB search path as main's
    // `GET /storefront/products?search=` (name/slug match), not only client filter.
    if (q) {
      const [categories, groups] = await Promise.all([
        listStoreCategories(id),
        listStoreProducts(id, {
          search: q,
          maxPages: CATALOG_SEARCH_MAX_PAGES,
          pageSize: CATALOG_BROWSE_PAGE_SIZE,
        }),
      ]);
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
        branches: buildCategoryBranches(categories),
        products,
        selectedKey: "all",
      };
    }

    // No `cat` / `cat=all`: tree + capped catalog in parallel (was sequential).
    if (!cat || cat === "all") {
      const [categories, groups] = await Promise.all([
        listStoreCategories(id),
        listStoreProducts(id, {
          maxPages: CATALOG_BROWSE_MAX_PAGES,
          pageSize: CATALOG_BROWSE_PAGE_SIZE,
        }),
      ]);
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
        branches: buildCategoryBranches(categories),
        products,
        selectedKey: "all",
      };
    }

    // Resolve the aisle from the tree first, then load only that aisle's
    // products (scoped query). Categories stay cached for the hub tree.
    const categories = await listStoreCategories(id);
    const branches = buildCategoryBranches(categories);
    const category = categories.find(
      (row) => row.slug !== "all" && (row.slug === cat || row.id === cat),
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

    const groups = await listStoreProducts(id, { categoryId: category.id });
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
