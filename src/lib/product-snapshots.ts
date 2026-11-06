import type { SampleProduct, WeightCustomization } from "@/lib/sample-products";

const STORAGE_KEY = "yaadro-product-snapshots-v1";
export const PRODUCT_SNAPSHOTS_EVENT = "yaadro-product-snapshots";

export type ProductSnapshot = {
  name: string;
  unit: string;
  price: number;
  mrp: number;
  image: string;
  category: string;
  categoryId?: string;
  categorySlug?: string;
  description?: string;
  customization?: WeightCustomization;
};

function readAll(): Record<string, ProductSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, ProductSnapshot>;
  } catch {
    return {};
  }
}

export function snapshotFromProduct(product: SampleProduct): ProductSnapshot {
  return {
    name: product.name,
    unit: product.unit,
    price: product.price,
    mrp: product.mrp,
    image: product.image,
    category: product.category,
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    description: product.description,
    customization: product.customization,
  };
}

export function productFromSnapshot(id: string, snapshot: ProductSnapshot): SampleProduct {
  return {
    id,
    name: snapshot.name,
    unit: snapshot.unit,
    price: snapshot.price,
    mrp: snapshot.mrp,
    image: snapshot.image,
    category: snapshot.category,
    categoryId: snapshot.categoryId,
    categorySlug: snapshot.categorySlug,
    description: snapshot.description,
    customization: snapshot.customization,
  };
}

/** Remember a live product so cart and wishlist can render it after navigation. */
export function rememberProduct(product: SampleProduct) {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[product.id] = snapshotFromProduct(product);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
  window.dispatchEvent(new Event(PRODUCT_SNAPSHOTS_EVENT));
}

export function recallProduct(id: string): SampleProduct | undefined {
  const snapshot = readAll()[id];
  if (!snapshot?.name) return undefined;
  return productFromSnapshot(id, snapshot);
}

export function readSnapshotsRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribeSnapshots(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PRODUCT_SNAPSHOTS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRODUCT_SNAPSHOTS_EVENT, onChange);
  };
}
