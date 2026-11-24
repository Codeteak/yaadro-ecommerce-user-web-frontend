import { formatQtyBadge } from "./qty-label.ts";
import type { SampleProduct } from "./sample-products.ts";

export type CatalogPriceDisplay = {
  /** Amount shown on cards / PDP (min weight for sold-by-weight). */
  price: number;
  /** Matching MRP for the same amount (strikethrough). */
  mrp: number;
  /** Unit under the name, e.g. `250 g` or `750 ml`. */
  unitLabel: string;
  /** Catalog rate still stored as per-kg for weight products. */
  pricePerKg: number;
  /** True when price/mrp were scaled to `customization.minKg`. */
  isMinWeight: boolean;
};

type PriceSource = Pick<
  SampleProduct,
  "price" | "mrp" | "unit" | "customization"
>;

/** Same rounding as `weightAmount` in cart-lines (kept local for node:test). */
function amountForKg(weightKg: number, pricePerKg: number): number {
  return Math.round(weightKg * pricePerKg);
}

/**
 * Shoppers see the starting buy amount on the card.
 * Weight products keep `price`/`mrp` as per-kg in data; display multiplies
 * by `minKg` (e.g. ₹100/kg + 0.25 kg → ₹25 / 250 g). Pack products pass through.
 */
export function catalogPriceDisplay(product: PriceSource): CatalogPriceDisplay {
  const weight = product.customization;
  if (weight?.type === "weight" && weight.minKg > 0) {
    return {
      price: amountForKg(weight.minKg, product.price),
      mrp: amountForKg(weight.minKg, product.mrp),
      unitLabel: formatQtyBadge({ qty: weight.minKg, isWeight: true }),
      pricePerKg: product.price,
      isMinWeight: true,
    };
  }

  return {
    price: product.price,
    mrp: product.mrp,
    unitLabel: product.unit,
    pricePerKg: product.price,
    isMinWeight: false,
  };
}
