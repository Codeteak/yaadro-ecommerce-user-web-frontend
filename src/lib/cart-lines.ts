import {
  productFromSnapshot,
  recallProduct,
  type ProductSnapshot,
} from "@/lib/product-snapshots";
import { formatQtyBadge } from "@/lib/qty-label";
import { SAMPLE_PRODUCTS, type SampleProduct } from "@/lib/sample-products";

export type CartItem = {
  productId: string;
  /** Packaged goods: number of packs. */
  qty: number;
  /** Weight-customized goods: chosen kilograms (qty stays 0). */
  weightKg?: number;
  /** Display copy captured when the item was added, so live products survive refresh. */
  snapshot?: ProductSnapshot;
};

function missingProduct(productId: string): SampleProduct {
  return {
    id: productId,
    category: "Grocery",
    name: "Product",
    unit: "",
    price: 0,
    mrp: 0,
    image: "/products/no-image.jpg",
  };
}

export function getProduct(productId: string): SampleProduct {
  return (
    recallProduct(productId) ??
    SAMPLE_PRODUCTS.find((product) => product.id === productId) ??
    missingProduct(productId)
  );
}

export function resolveCartProduct(item: CartItem): SampleProduct {
  if (item.snapshot) return productFromSnapshot(item.productId, item.snapshot);
  return getProduct(item.productId);
}

/**
 * Catalog `price` / `mrp` are per sellable unit (`unit_size` = stepKg),
 * not per kg. Card shows ₹500 for 0.25 kg → 0.25 kg costs ₹500;
 * 0.5 kg costs ₹1000.
 */
export function weightAmount(
  weightKg: number,
  pricePerUnit: number,
  stepKg: number,
): number {
  const step = stepKg > 0 ? stepKg : 1;
  return Math.round((weightKg / step) * pricePerUnit);
}

export function lineTotal(item: CartItem): number {
  const product = resolveCartProduct(item);
  if (item.weightKg) {
    const step = product.customization?.stepKg ?? 1;
    return weightAmount(item.weightKg, product.price, step);
  }
  return item.qty * product.price;
}

export function lineMrp(item: CartItem): number {
  const product = resolveCartProduct(item);
  if (item.weightKg) {
    const step = product.customization?.stepKg ?? 1;
    return weightAmount(item.weightKg, product.mrp, step);
  }
  return item.qty * product.mrp;
}

/** Selling vs MRP gap for one cart line (0 if no discount). */
export function lineSave(item: CartItem): number {
  return Math.max(0, lineMrp(item) - lineTotal(item));
}

/** Badge text for cart rows: "3.5 kg", "500 g", "2 each", "2×750ml". */
export function itemBadge(item: CartItem): string {
  const product = resolveCartProduct(item);
  return formatQtyBadge({
    qty: item.weightKg ?? item.qty,
    isWeight: Boolean(item.weightKg),
    unit: product.unit,
  });
}
