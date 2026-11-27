import type { SampleProduct } from "@/lib/sample-products";

const STORAGE_KEY = "yaadro-home-essentials-v1";
const MAX_PEEK = 8;

export type HomeEssentialsPeek = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  image: string;
  category: string;
  categorySlug?: string;
};

function toPeek(product: SampleProduct): HomeEssentialsPeek {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    price: product.price,
    mrp: product.mrp,
    image: product.image,
    category: product.category,
    categorySlug: product.categorySlug,
  };
}

function fromPeek(peek: HomeEssentialsPeek): SampleProduct {
  return {
    id: peek.id,
    name: peek.name,
    unit: peek.unit,
    price: peek.price,
    mrp: peek.mrp,
    image: peek.image,
    category: peek.category,
    categorySlug: peek.categorySlug,
  };
}

/** Persist a small home essentials strip while online (best-effort). */
export function saveHomeEssentialsSnapshot(products: SampleProduct[]) {
  if (typeof window === "undefined") return;
  const peek = products.slice(0, MAX_PEEK).map(toPeek);
  if (peek.length === 0) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), products: peek }),
    );
  } catch {
    // quota / private mode — ignore
  }
}

export function readHomeEssentialsSnapshot(): SampleProduct[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      products?: HomeEssentialsPeek[];
    };
    if (!Array.isArray(parsed.products) || parsed.products.length === 0) {
      return null;
    }
    return parsed.products
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
      .map(fromPeek);
  } catch {
    return null;
  }
}
