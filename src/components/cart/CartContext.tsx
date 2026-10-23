"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

/**
 * Shared basket (sample phase).
 *
 * One cart for the whole storefront: product cards, the weight
 * customizer, the floating cart bar and the /cart page all read and
 * write here. Persisted to localStorage on this device only — when
 * the cart API lands, these mutations become server calls and the
 * totals come back from the backend (prices are never trusted from
 * the client for a real order). Nothing here fakes an order.
 */
export type CartItem = {
  productId: string;
  /** Packaged goods: number of packs. */
  qty: number;
  /** Weight-customized goods: chosen kilograms (qty stays 0). */
  weightKg?: number;
};

const STORAGE_KEY = "yaadro-cart-v1";

type CartContextValue = {
  items: CartItem[];
  getItem: (productId: string) => CartItem | undefined;
  setQty: (productId: string, qty: number) => void;
  setWeight: (productId: string, weightKg: number | null) => void;
  clear: () => void;
  /** Total number of purchasable units (packs + weight lines). */
  count: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  /** Product whose weight customizer sheet is open, if any. */
  customizing: SampleProduct | null;
  setCustomizing: (product: SampleProduct | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function getProduct(productId: string): SampleProduct {
  return SAMPLE_PRODUCTS.find((p) => p.id === productId) ?? SAMPLE_PRODUCTS[0];
}

export function lineTotal(item: CartItem): number {
  const product = getProduct(item.productId);
  if (item.weightKg) return Math.round(item.weightKg * product.price);
  return item.qty * product.price;
}

export function lineMrp(item: CartItem): number {
  const product = getProduct(item.productId);
  if (item.weightKg) return Math.round(item.weightKg * product.mrp);
  return item.qty * product.mrp;
}

/** Selling vs MRP gap for one cart line (0 if no discount). */
export function lineSave(item: CartItem): number {
  return Math.max(0, lineMrp(item) - lineTotal(item));
}

/** Badge text for cart rows: "3.5 kg" or "×2". */
export function itemBadge(item: CartItem): string {
  if (item.weightKg) {
    const kg = Number.isInteger(item.weightKg)
      ? String(item.weightKg)
      : item.weightKg.toFixed(1);
    return `${kg} kg`;
  }
  return `×${item.qty}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<CartItem[] | null>(null);
  const [customizing, setCustomizing] = useState<SampleProduct | null>(null);

  // Persisted basket, read hydration-safely (same pattern as address).
  const storedRaw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  const storedItems = useMemo<CartItem[]>(() => {
    if (!storedRaw) return [];
    try {
      const parsed = JSON.parse(storedRaw) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storedRaw]);
  const items = override ?? storedItems;

  const update = useCallback((next: CartItem[]) => {
    setOverride(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // persistence is best-effort
    }
  }, []);

  const getItem = useCallback(
    (productId: string) => items.find((i) => i.productId === productId),
    [items],
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      const rest = items.filter((i) => i.productId !== productId);
      update(qty > 0 ? [...rest, { productId, qty }] : rest);
    },
    [items, update],
  );

  const setWeight = useCallback(
    (productId: string, weightKg: number | null) => {
      const rest = items.filter((i) => i.productId !== productId);
      update(
        weightKg && weightKg > 0
          ? [...rest, { productId, qty: 0, weightKg }]
          : rest,
      );
    },
    [items, update],
  );

  const clear = useCallback(() => update([]), [update]);

  const { count, subtotal, mrpTotal } = useMemo(() => {
    let c = 0;
    let sub = 0;
    let mrp = 0;
    for (const item of items) {
      c += item.weightKg ? 1 : item.qty;
      sub += lineTotal(item);
      mrp += lineMrp(item);
    }
    return { count: c, subtotal: sub, mrpTotal: mrp };
  }, [items]);

  const value: CartContextValue = {
    items,
    getItem,
    setQty,
    setWeight,
    clear,
    count,
    subtotal,
    mrpTotal,
    savings: Math.max(0, mrpTotal - subtotal),
    customizing,
    setCustomizing,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
