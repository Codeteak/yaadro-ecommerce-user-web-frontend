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
import { WISHLIST_STORAGE_KEY } from "@/lib/api/wishlist";
import {
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

/**
 * Wishlist mutations live here (localStorage) until a wishlist API exists.
 * See `src/lib/api/wishlist.ts` for the read façade + future sync notes.
 */
const STORAGE_KEY = WISHLIST_STORAGE_KEY;
const WISHLIST_EVENT = "yaadro-wishlist";

type WishlistContextValue = {
  /** True when hearts can save. Storefront sets this until a real session API. */
  signedIn: boolean;
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  products: SampleProduct[];
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // best-effort
  }
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(WISHLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WISHLIST_EVENT, onChange);
  };
}

type WishlistProviderProps = {
  children: ReactNode;
  /**
   * Treat as signed in so hearts can save (localStorage).
   * Storefront enables this as a scaffold; playground list demos too.
   * Default false — guest hearts send the user to login.
   */
  previewSignedIn?: boolean;
  /**
   * Playground seed. When set, list is in-memory (does not touch
   * localStorage) so demos stay isolated from the storefront.
   */
  initialIds?: string[];
};

export function WishlistProvider({
  children,
  previewSignedIn = false,
  initialIds,
}: WishlistProviderProps) {
  const ephemeral = initialIds !== undefined;
  const [ephemeralIds, setEphemeralIds] = useState<string[]>(
    () => initialIds ?? [],
  );

  const storedRaw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  );

  const storedIds = useMemo(() => {
    if (storedRaw == null) return [] as string[];
    try {
      const parsed = JSON.parse(storedRaw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id): id is string => typeof id === "string");
    } catch {
      return [];
    }
  }, [storedRaw]);

  const ids = ephemeral ? ephemeralIds : storedIds;

  const toggle = useCallback(
    (productId: string) => {
      if (!previewSignedIn) return;
      const next = ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [...ids, productId];
      if (ephemeral) setEphemeralIds(next);
      else writeIds(next);
    },
    [ephemeral, ids, previewSignedIn],
  );

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const products = useMemo(
    () =>
      ids
        .map((id) => SAMPLE_PRODUCTS.find((p) => p.id === id))
        .filter((p): p is SampleProduct => Boolean(p)),
    [ids],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      signedIn: previewSignedIn,
      ids,
      has,
      toggle,
      products,
    }),
    [previewSignedIn, ids, has, toggle, products],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

/** Null when no WishlistProvider ancestor. */
export function useWishlistOptional(): WishlistContextValue | null {
  return useContext(WishlistContext);
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

/** Exposed for tests / rare direct reads. */
export function peekWishlistIds(): string[] {
  return readIds();
}
