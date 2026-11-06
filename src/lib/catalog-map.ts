import { PRODUCT_IMAGE_FALLBACK } from "@/lib/product-image";
import type { SampleProduct, WeightCustomization } from "@/lib/sample-products";

const BY_WEIGHT: WeightCustomization = {
  type: "weight",
  stepKg: 0.5,
  minKg: 0.5,
  maxKg: 10,
};

const FALLBACK_IMAGE = PRODUCT_IMAGE_FALLBACK;

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

function minorUnits(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/** Paise → rupees. Catalog money fields are minor units. */
export function rupeesFromMinor(minor: number): number {
  return Math.round(minor) / 100;
}

function imageUrl(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  if (!record) return null;
  return pickString(record.url, record.imageUrl, record.src);
}

function imageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const item of value) {
    const url = imageUrl(item);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function formatUnit(unit: string | null, unitSize: unknown): string {
  const size = minorUnits(unitSize);
  if (unit && size != null && size > 0 && size !== 1) {
    const label = Number.isInteger(size) ? String(size) : String(size);
    return `${label} ${unit}`;
  }
  return unit || "1 pc";
}

export type MappedProductInput = {
  raw: unknown;
  categoryName?: string;
  categoryId?: string;
  categorySlug?: string;
};

/**
 * Map a storefront product (list/detail snake_case, or home-section camelCase)
 * onto the card shape the UI already renders.
 */
export function mapCatalogProduct({
  raw,
  categoryName,
  categoryId,
  categorySlug,
}: MappedProductInput): SampleProduct | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const name = pickString(row.name);
  if (!id || !name) return null;

  const sellingMinor = minorUnits(
    row.final_price_minor,
    row.finalPriceMinorPerUnit,
    row.finalPriceMinor,
    row.offer_price_minor,
    row.offerPriceMinorPerUnit,
    row.priceMinorPerUnit,
    row.total_price_minor,
  );
  const mrpMinor = minorUnits(
    row.actual_price_minor,
    row.actualPriceMinor,
    row.actualPriceMinorPerUnit,
  );
  const price = rupeesFromMinor(sellingMinor ?? mrpMinor ?? 0);
  const mrp = rupeesFromMinor(mrpMinor ?? sellingMinor ?? 0);

  const images = [
    ...imageList(row.images),
    ...[imageUrl(row.thumbnail), imageUrl(row.image), pickString(row.imageUrl)].filter(
      (url): url is string => Boolean(url),
    ),
  ].filter((url, index, all) => all.indexOf(url) === index);

  const soldByWeight = row.sold_by_weight === true || row.soldByWeight === true;
  const description = pickString(row.description) ?? undefined;

  return {
    id,
    name,
    category: categoryName || pickString(row.category_name, row.categoryName) || "Grocery",
    categoryId: categoryId || pickString(row.category_id, row.categoryId) || undefined,
    categorySlug: categorySlug || undefined,
    unit: formatUnit(pickString(row.unit), row.unit_size ?? row.unitSize),
    price,
    mrp: Math.max(mrp, price),
    image: images[0] ?? FALLBACK_IMAGE,
    images: images.length > 0 ? images : undefined,
    description,
    customization: soldByWeight ? BY_WEIGHT : undefined,
  };
}
