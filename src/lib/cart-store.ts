/**
 * One basket for the storefront. localStorage is the only copy —
 * same-tab writes dispatch `yaadro-cart`, and other tabs arrive
 * through the storage event. Line snapshots keep the same object
 * when that line did not change, so a card can subscribe to one id.
 */
import {
  applyKnownCoupon,
  applySamplePromo,
  findCouponByCode,
  type SampleCoupon,
} from "@/lib/sample-coupons";
import {
  type SampleProduct,
  type WeightCustomization,
} from "@/lib/sample-products";
import {
  recallProduct,
  type ProductSnapshot,
} from "@/lib/product-snapshots";
import {
  lineMrp,
  lineTotal,
  type CartItem,
} from "@/lib/cart-lines";

const CART_KEY = "yaadro-cart-v1";
const PROMO_KEY = "yaadro-cart-promo-v1";
const CART_EVENT = "yaadro-cart";

const EMPTY_ITEMS: CartItem[] = [];

export type CartTotals = {
  count: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  appliedPromo: SampleCoupon | null;
  promoDiscount: number;
  totalSaved: number;
  totalDue: number;
};

const EMPTY_TOTALS: CartTotals = {
  count: 0,
  subtotal: 0,
  mrpTotal: 0,
  savings: 0,
  appliedPromo: null,
  promoDiscount: 0,
  totalSaved: 0,
  totalDue: 0,
};

let items: CartItem[] = EMPTY_ITEMS;
let itemsRaw: string | null = null;
let promoCoupon: SampleCoupon | null = null;
let promoRaw: string | null = null;
let totals: CartTotals = EMPTY_TOTALS;
let totalsKey = "";

const lineCache = new Map<string, CartItem | null>();

function parseItems(raw: string | null): CartItem[] {
  if (!raw) return EMPTY_ITEMS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_ITEMS;
    return parsed.filter(
      (item): item is CartItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as CartItem).productId === "string" &&
        typeof (item as CartItem).qty === "number",
    );
  } catch {
    return EMPTY_ITEMS;
  }
}

function isStoredCoupon(value: unknown): value is SampleCoupon {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SampleCoupon>;
  if (typeof row.code !== "string" || row.code.length === 0) return false;
  if (typeof row.minOrder !== "number" || typeof row.status !== "string") return false;
  if (!row.discount || typeof row.discount !== "object") return false;
  if (row.discount.type === "percent") {
    return typeof row.discount.percent === "number" && typeof row.discount.maxOff === "number";
  }
  if (row.discount.type === "flat") return typeof row.discount.amount === "number";
  return false;
}

function parsePromo(raw: string | null): SampleCoupon | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return findCouponByCode(parsed) ?? null;
    return isStoredCoupon(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sameItem(a: CartItem, b: CartItem): boolean {
  return (
    a.qty === b.qty &&
    a.weightKg === b.weightKg &&
    JSON.stringify(a.snapshot) === JSON.stringify(b.snapshot)
  );
}

function rebuildLineCache() {
  const seen = new Set<string>();
  for (const item of items) {
    lineCache.set(item.productId, item);
    seen.add(item.productId);
  }
  for (const key of lineCache.keys()) {
    if (!seen.has(key)) lineCache.set(key, null);
  }
}

function readStorage() {
  if (typeof window === "undefined") return;
  const nextItemsRaw = window.localStorage.getItem(CART_KEY);
  if (nextItemsRaw !== itemsRaw) {
    const parsed = parseItems(nextItemsRaw);
    const previous = new Map(items.map((item) => [item.productId, item]));
    items =
      parsed.length === 0
        ? EMPTY_ITEMS
        : parsed.map((item) => {
            const old = previous.get(item.productId);
            return old && sameItem(old, item) ? old : item;
          });
    itemsRaw = nextItemsRaw;
    rebuildLineCache();
  }
  const nextPromoRaw = window.localStorage.getItem(PROMO_KEY);
  if (nextPromoRaw !== promoRaw) {
    promoRaw = nextPromoRaw;
    promoCoupon = parsePromo(nextPromoRaw);
  }
}

function emit() {
  window.dispatchEvent(new Event(CART_EVENT));
}

function writeItems(next: CartItem[]) {
  items = next.length === 0 ? EMPTY_ITEMS : next;
  itemsRaw = JSON.stringify(items);
  try {
    window.localStorage.setItem(CART_KEY, itemsRaw);
  } catch {
    // persistence is best-effort
  }
  rebuildLineCache();
  totalsKey = "";
  emit();
}

function writePromo(coupon: SampleCoupon | null) {
  promoCoupon = coupon;
  try {
    if (!coupon) {
      window.localStorage.removeItem(PROMO_KEY);
      promoRaw = null;
    } else {
      promoRaw = JSON.stringify(coupon);
      window.localStorage.setItem(PROMO_KEY, promoRaw);
    }
  } catch {
    // persistence is best-effort
  }
  totalsKey = "";
  emit();
}

export function subscribeCart(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === PROMO_KEY || event.key === null) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_EVENT, onChange);
  };
}

export function getItemsSnapshot(): CartItem[] {
  readStorage();
  return items;
}

export function getItemsServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

export function getLineSnapshot(productId: string): CartItem | null {
  if (typeof window === "undefined") return null;
  readStorage();
  const cached = lineCache.get(productId);
  if (cached !== undefined) return cached;
  lineCache.set(productId, null);
  return null;
}

export function getCartItem(productId: string): CartItem | undefined {
  return getLineSnapshot(productId) ?? undefined;
}

function snapshotFor(
  productId: string,
  previous?: ProductSnapshot,
): ProductSnapshot | undefined {
  if (previous) return previous;
  const recalled = recallProduct(productId);
  if (!recalled) return undefined;
  const customization: WeightCustomization | undefined = recalled.customization;
  return {
    name: recalled.name,
    unit: recalled.unit,
    price: recalled.price,
    mrp: recalled.mrp,
    image: recalled.image,
    category: recalled.category,
    categoryId: recalled.categoryId,
    categorySlug: recalled.categorySlug,
    description: recalled.description,
    customization,
  };
}

export function setCartQty(productId: string, qty: number) {
  const current = getItemsSnapshot();
  const index = current.findIndex((item) => item.productId === productId);
  if (qty <= 0) {
    writeItems(current.filter((item) => item.productId !== productId));
    return;
  }
  // Keep insertion order — do not move the line to the end (#36).
  if (index >= 0) {
    const previous = current[index];
    const next = current.slice();
    next[index] = {
      productId,
      qty,
      snapshot: snapshotFor(productId, previous?.snapshot),
    };
    writeItems(next);
    return;
  }
  writeItems([
    ...current,
    {
      productId,
      qty,
      snapshot: snapshotFor(productId),
    },
  ]);
}

export function setCartWeight(productId: string, weightKg: number | null) {
  const current = getItemsSnapshot();
  const index = current.findIndex((item) => item.productId === productId);
  if (!weightKg || weightKg <= 0) {
    writeItems(current.filter((item) => item.productId !== productId));
    return;
  }
  // Keep insertion order — do not move the line to the end (#36).
  if (index >= 0) {
    const previous = current[index];
    const next = current.slice();
    next[index] = {
      productId,
      qty: 0,
      weightKg,
      snapshot: snapshotFor(productId, previous?.snapshot),
    };
    writeItems(next);
    return;
  }
  writeItems([
    ...current,
    {
      productId,
      qty: 0,
      weightKg,
      snapshot: snapshotFor(productId),
    },
  ]);
}

export function clearCartPromo() {
  writePromo(null);
}

export function clearCart() {
  writeItems([]);
  writePromo(null);
}

export function getTotalsSnapshot(): CartTotals {
  readStorage();
  const key = `${itemsRaw ?? ""}|${promoRaw ?? ""}`;
  if (totalsKey === key) return totals;
  let count = 0;
  let subtotal = 0;
  let mrpTotal = 0;
  for (const item of items) {
    count += item.weightKg ? 1 : item.qty;
    subtotal += lineTotal(item);
    mrpTotal += lineMrp(item);
  }
  const savings = Math.max(0, mrpTotal - subtotal);
  let appliedPromo: SampleCoupon | null = null;
  let promoDiscount = 0;
  if (promoCoupon) {
    // Keep the selected code so live cart preview can re-price it.
    // Local discount is playground / optimistic only — production bill uses shop quote.
    appliedPromo = promoCoupon;
    const result = applyKnownCoupon(promoCoupon, subtotal);
    promoDiscount = result.ok ? result.discount : 0;
  }
  totals = {
    count,
    subtotal,
    mrpTotal,
    savings,
    appliedPromo,
    promoDiscount,
    totalSaved: savings + promoDiscount,
    totalDue: Math.max(0, subtotal - promoDiscount),
  };
  totalsKey = key;
  return totals;
}

export function getTotalsServerSnapshot(): CartTotals {
  return EMPTY_TOTALS;
}

export function applyCartPromo(code: string, known?: SampleCoupon) {
  const { subtotal } = getTotalsSnapshot();
  const typed = code.trim();
  const coupon =
    known && known.code.toUpperCase() === typed.toUpperCase()
      ? known
      : findCouponByCode(typed);
  const result = coupon
    ? applyKnownCoupon(coupon, subtotal)
    : applySamplePromo(typed, subtotal);
  if (!result.ok) return { ok: false as const, message: result.message };
  writePromo(result.coupon);
  return {
    ok: true as const,
    code: result.coupon.code,
    message: `Applied ${result.coupon.code} — you save ₹${result.discount}`,
  };
}

/** Persist a shop-confirmed coupon (no local min-order / discount math). */
export function storeShopPromo(coupon: SampleCoupon) {
  writePromo(coupon);
}

export function peekCartPromoCode(): string | null {
  readStorage();
  return promoCoupon?.code ?? null;
}

export type { CartItem, SampleProduct };
