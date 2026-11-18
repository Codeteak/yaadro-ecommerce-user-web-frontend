import { PRODUCT_IMAGE_FALLBACK } from "@/lib/product-image";
import type { SampleProduct, WeightCustomization } from "@/lib/sample-products";

const FALLBACK_WEIGHT_STEP_KG = 0.5;
const DEFAULT_WEIGHT_MAX_KG = 10;

const FALLBACK_IMAGE = PRODUCT_IMAGE_FALLBACK;

/**
 * Backend `unit_size` (with `base_unit` kg) is the sell step / minimum.
 * Orange is 0.1 kg; carrot is 0.25 kg. Catalog price is per that unit
 * (`price_minor_per_unit`), same figure shown on the product card.
 */
export function weightCustomizationFromUnitSize(
  unitSize: unknown,
): WeightCustomization {
  const size = minorUnits(unitSize);
  const stepKg =
    size != null && size > 0 ? size : FALLBACK_WEIGHT_STEP_KG;
  return {
    type: "weight",
    stepKg,
    minKg: stepKg,
    maxKg: DEFAULT_WEIGHT_MAX_KG,
  };
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

/**
 * Catalog fields sometimes dump several absolute URLs in one comma-joined
 * string (common with Google Shopping thumbs). Split those into separate URLs.
 */
function splitImageUrls(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (/,https?:\/\//i.test(trimmed)) {
    return trimmed
      .split(/,(?=https?:\/\/)/i)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [trimmed];
}

function imageUrls(value: unknown): string[] {
  if (typeof value === "string") return splitImageUrls(value);
  const record = asRecord(value);
  if (!record) return [];
  const single = pickString(record.url, record.imageUrl, record.src);
  return single ? splitImageUrls(single) : [];
}

function imageList(value: unknown): string[] {
  if (typeof value === "string") return splitImageUrls(value);
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const item of value) {
    for (const url of imageUrls(item)) {
      if (!urls.includes(url)) urls.push(url);
    }
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
    ...imageUrls(row.thumbnail),
    ...imageUrls(row.image),
    ...imageUrls(row.imageUrl),
  ].filter((url, index, all) => all.indexOf(url) === index);

  const soldByWeight = row.sold_by_weight === true || row.soldByWeight === true;
  const description = pickString(row.description) ?? undefined;
  const unitSize = row.unit_size ?? row.unitSize;

  return {
    id,
    name,
    category: categoryName || pickString(row.category_name, row.categoryName) || "Grocery",
    categoryId: categoryId || pickString(row.category_id, row.categoryId) || undefined,
    categorySlug: categorySlug || undefined,
    unit: formatUnit(pickString(row.unit), unitSize),
    price,
    mrp: Math.max(mrp, price),
    image: images[0] ?? FALLBACK_IMAGE,
    images: images.length > 0 ? images : undefined,
    description,
    customization: soldByWeight
      ? weightCustomizationFromUnitSize(unitSize)
      : undefined,
  };
}
