"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";
import type { SampleProduct } from "@/lib/sample-products";
import {
  applyCartPromo,
  clearCart,
  clearCartPromo,
  getCartItem,
  getItemsServerSnapshot,
  getItemsSnapshot,
  getLineSnapshot,
  getTotalsServerSnapshot,
  getTotalsSnapshot,
  peekCartPromoCode,
  setCartQty,
  setCartWeight,
  storeShopPromo,
  subscribeCart,
} from "@/lib/cart-store";

export type { CartItem } from "@/lib/cart-lines";
export {
  getProduct,
  itemBadge,
  lineMrp,
  lineSave,
  lineTotal,
  resolveCartProduct,
} from "@/lib/cart-lines";

export { peekCartPromoCode };

const EMPTY_LINE = null;

const SetCustomizingContext = createContext<(product: SampleProduct | null) => void>(
  () => undefined,
);
const CustomizingContext = createContext<SampleProduct | null>(null);

/**
 * Basket data lives in `cart-store` (one localStorage copy).
 * This provider only holds the weight-sheet UI, so opening it
 * does not notify product cards.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [customizing, setCustomizing] = useState<SampleProduct | null>(null);
  return (
    <SetCustomizingContext.Provider value={setCustomizing}>
      <CustomizingContext.Provider value={customizing}>
        {children}
      </CustomizingContext.Provider>
    </SetCustomizingContext.Provider>
  );
}

export function useSetCustomizing() {
  return useContext(SetCustomizingContext);
}

export function useCustomizingProduct() {
  return useContext(CustomizingContext);
}

/** Re-renders only when this product's line object changes. */
export function useCartLine(productId: string | null): ReturnType<typeof getLineSnapshot> {
  return useSyncExternalStore(
    subscribeCart,
    () => (productId ? getLineSnapshot(productId) : EMPTY_LINE),
    () => EMPTY_LINE,
  );
}

export function useCart() {
  const items = useSyncExternalStore(
    subscribeCart,
    getItemsSnapshot,
    getItemsServerSnapshot,
  );
  const totals = useSyncExternalStore(
    subscribeCart,
    getTotalsSnapshot,
    getTotalsServerSnapshot,
  );
  const setCustomizing = useSetCustomizing();
  return {
    items,
    getItem: getCartItem,
    setQty: setCartQty,
    setWeight: setCartWeight,
    clear: clearCart,
    ...totals,
    applyPromo: applyCartPromo,
    storeShopPromo,
    clearPromo: clearCartPromo,
    setCustomizing,
  };
}
