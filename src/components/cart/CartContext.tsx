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
import {
  applySamplePromo,
  type SampleCoupon,
} from "@/lib/sample-coupons";

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
const PROMO_STORAGE_KEY = "yaadro-cart-promo-v1";

type CartContextValue = {
  items: CartItem[];
  getItem: (productId: string) => CartItem | undefined;
  setQty: (productId: string, qty: number) => void;
  setWeight: (productId: string, weightKg: number | null) => void;
  clear: () => void;
  /** Total number of purchasable units (packs + weight lines). */
  count: number;
  /** Selling-price sum before promo. */
  subtotal: number;
  mrpTotal: number;
  /** MRP − selling (item savings only). */
  savings: number;
  appliedPromo: SampleCoupon | null;
  promoDiscount: number;
  /** savings + promoDiscount */
  totalSaved: number;
  /** subtotal − promoDiscount */
  totalDue: number;
  applyPromo: (
    code: string,
  ) =>
    | { ok: true; message: string; code: string }
    | { ok: false; message: string };
  clearPromo: () => void;
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

function readPromoCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) return null;
    const code = JSON.parse(raw) as unknown;
    return typeof code === "string" && code.length > 0 ? code : null;
  } catch {
    return null;
  }
}

function writePromoCode(code: string | null) {
  try {
    if (!code) window.localStorage.removeItem(PROMO_STORAGE_KEY);
    else window.localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(code));
  } catch {
    // best-effort
  }
  window.dispatchEvent(new Event("yaadro-cart-promo"));
}

function subscribePromo(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROMO_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("yaadro-cart-promo", onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("yaadro-cart-promo", onChange);
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<CartItem[] | null>(null);
  const [promoOverride, setPromoOverride] = useState<string | null | undefined>(
    undefined,
  );
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

  const storedPromoRaw = useSyncExternalStore(
    subscribePromo,
    () => window.localStorage.getItem(PROMO_STORAGE_KEY),
    () => null,
  );
  const storedPromoCode = useMemo(() => {
    if (storedPromoRaw == null) return null;
    try {
      const code = JSON.parse(storedPromoRaw) as unknown;
      return typeof code === "string" && code.length > 0 ? code : null;
    } catch {
      return null;
    }
  }, [storedPromoRaw]);
  const promoCode =
    promoOverride !== undefined ? promoOverride : storedPromoCode;

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

  const clearPromo = useCallback(() => {
    setPromoOverride(null);
    writePromoCode(null);
  }, []);

  const clear = useCallback(() => {
    update([]);
    clearPromo();
  }, [update, clearPromo]);

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

  const savings = Math.max(0, mrpTotal - subtotal);

  const { appliedPromo, promoDiscount } = useMemo(() => {
    if (!promoCode) return { appliedPromo: null, promoDiscount: 0 };
    const result = applySamplePromo(promoCode, subtotal);
    if (!result.ok) return { appliedPromo: null, promoDiscount: 0 };
    return { appliedPromo: result.coupon, promoDiscount: result.discount };
  }, [promoCode, subtotal]);

  const applyPromo = useCallback(
    (code: string) => {
      const result = applySamplePromo(code, subtotal);
      if (!result.ok) {
        return { ok: false as const, message: result.message };
      }
      setPromoOverride(result.coupon.code);
      writePromoCode(result.coupon.code);
      return {
        ok: true as const,
        code: result.coupon.code,
        message: `Applied ${result.coupon.code} — you save ₹${result.discount}`,
      };
    },
    [subtotal],
  );

  const totalSaved = savings + promoDiscount;
  const totalDue = Math.max(0, subtotal - promoDiscount);

  const value: CartContextValue = {
    items,
    getItem,
    setQty,
    setWeight,
    clear,
    count,
    subtotal,
    mrpTotal,
    savings,
    appliedPromo,
    promoDiscount,
    totalSaved,
    totalDue,
    applyPromo,
    clearPromo,
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

/** Exposed for rare reads / tests. */
export function peekCartPromoCode(): string | null {
  return readPromoCode();
}
