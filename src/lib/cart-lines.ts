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

export function lineTotal(item: CartItem): number {
  const product = resolveCartProduct(item);
  if (item.weightKg) return Math.round(item.weightKg * product.price);
  return item.qty * product.price;
}

export function lineMrp(item: CartItem): number {
  const product = resolveCartProduct(item);
  if (item.weightKg) return Math.round(item.weightKg * product.mrp);
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
