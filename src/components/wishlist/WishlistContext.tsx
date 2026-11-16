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
  recallProduct,
  readSnapshotsRaw,
  subscribeSnapshots,
} from "@/lib/product-snapshots";
import { SAMPLE_PRODUCTS, type SampleProduct } from "@/lib/sample-products";

/**
 * Wishlist ids live in localStorage until a wishlist API exists.
 * Hearts subscribe per product id. The list page subscribes to the
 * stored string. Ephemeral playground lists stay in React state.
 */
const STORAGE_KEY = WISHLIST_STORAGE_KEY;
const WISHLIST_EVENT = "yaadro-wishlist";
const EMPTY_IDS: string[] = [];

type WishlistMeta = {
  signedIn: boolean;
  ephemeral: boolean;
  toggle: (productId: string) => void;
};

const WishlistMetaContext = createContext<WishlistMeta | null>(null);
const WishlistIdsContext = createContext<string[]>(EMPTY_IDS);

let storedRawCache: string | null | undefined;
let storedIdSet = new Set<string>();

function parseIds(raw: string | null): string[] {
  if (!raw) return EMPTY_IDS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_IDS;
    const ids = parsed.filter((id): id is string => typeof id === "string");
    return ids.length === 0 ? EMPTY_IDS : ids;
  } catch {
    return EMPTY_IDS;
  }
}

function currentIdSet(): Set<string> {
  if (typeof window === "undefined") return storedIdSet;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === storedRawCache) return storedIdSet;
  storedRawCache = raw;
  storedIdSet = new Set(parseIds(raw));
  return storedIdSet;
}

export function subscribeWishlist(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(WISHLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(WISHLIST_EVENT, onChange);
  };
}

export function readWishlistRaw(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function hasStoredWishlistId(productId: string): boolean {
  return currentIdSet().has(productId);
}

export function toggleStoredWishlistId(productId: string) {
  const ids = parseIds(readWishlistRaw());
  const next = ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  storedRawCache = JSON.stringify(next);
  storedIdSet = new Set(next);
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

type WishlistProviderProps = {
  children: ReactNode;
  /**
   * Treat as signed in so hearts can save.
   * Storefront passes the real OTP session. Default false.
   */
  previewSignedIn?: boolean;
  /**
   * Playground seed. When set, the list is in memory and does not
   * touch localStorage.
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
    () => initialIds ?? EMPTY_IDS,
  );

  const toggle = useCallback(
    (productId: string) => {
      if (!previewSignedIn) return;
      if (ephemeral) {
        setEphemeralIds((current) =>
          current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId],
        );
        return;
      }
      toggleStoredWishlistId(productId);
    },
    [ephemeral, previewSignedIn],
  );

  const meta = useMemo<WishlistMeta>(
    () => ({ signedIn: previewSignedIn, ephemeral, toggle }),
    [previewSignedIn, ephemeral, toggle],
  );

  return (
    <WishlistMetaContext.Provider value={meta}>
      <WishlistIdsContext.Provider value={ephemeral ? ephemeralIds : EMPTY_IDS}>
        {children}
      </WishlistIdsContext.Provider>
    </WishlistMetaContext.Provider>
  );
}

export function useWishlistMeta() {
  return useContext(WishlistMetaContext);
}

export function useWishlistIds() {
  return useContext(WishlistIdsContext);
}

type WishlistContextValue = {
  signedIn: boolean;
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  products: SampleProduct[];
};

export function useWishlistOptional(): WishlistContextValue | null {
  const meta = useWishlistMeta();
  const ephemeralIds = useWishlistIds();
  const storedRaw = useSyncExternalStore(
    subscribeWishlist,
    readWishlistRaw,
    () => null,
  );
  const snapshotsRaw = useSyncExternalStore(
    subscribeSnapshots,
    readSnapshotsRaw,
    () => null,
  );
  const ids = useMemo(
    () => (meta?.ephemeral ? ephemeralIds : parseIds(storedRaw)),
    [meta?.ephemeral, ephemeralIds, storedRaw],
  );
  const products = useMemo(() => {
    const snapshotStamp = snapshotsRaw ?? "";
    return ids
      .map((id) => {
        void snapshotStamp;
        return (
          recallProduct(id) ?? SAMPLE_PRODUCTS.find((product) => product.id === id)
        );
      })
      .filter((product): product is SampleProduct => Boolean(product));
  }, [ids, snapshotsRaw]);

  return useMemo(() => {
    if (!meta) return null;
    return {
      signedIn: meta.signedIn,
      ids,
      has: (productId: string) => ids.includes(productId),
      toggle: meta.toggle,
      products,
    };
  }, [meta, ids, products]);
}

export function useWishlist(): WishlistContextValue {
  const value = useWishlistOptional();
  if (!value) throw new Error("useWishlist must be used within WishlistProvider");
  return value;
}

/** Exposed for tests / rare direct reads. */
export function peekWishlistIds(): string[] {
  return parseIds(readWishlistRaw());
}
