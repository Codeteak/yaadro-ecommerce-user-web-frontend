import type { SampleProduct } from "@/lib/sample-products";

/** PLP chip filters — sample/local until catalog facets land. */
export type PlpSortId =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "discount-desc";

export type PlpFilterState = {
  onOffer: boolean;
  byWeight: boolean;
  bestSeller: boolean;
  brands: string[];
  types: string[];
  sort: PlpSortId;
};

export const DEFAULT_PLP_FILTERS: PlpFilterState = {
  onOffer: false,
  byWeight: false,
  bestSeller: false,
  brands: [],
  types: [],
  sort: "relevance",
};

export const PLP_SORT_OPTIONS: { id: PlpSortId; label: string }[] = [
  { id: "relevance", label: "Relevance" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name-asc", label: "Name: A to Z" },
  { id: "discount-desc", label: "Biggest discount" },
];

/** Derived brand for sample catalog (optional `brand` on product wins). */
export function plpBrand(product: SampleProduct): string {
  if (product.brand?.trim()) return product.brand.trim();
  switch (product.category) {
    case "Fruits":
    case "Vegetables":
      return product.customization ? "Farm Fresh" : "Yaadro Pack";
    case "Bakery":
      return "Daily Bake";
    case "Dairy & Eggs":
      return "Farm Dairy";
    case "Beverages":
      return "Cool Sips";
    case "Snacks":
      return "Crunch Co";
    default:
      return "Yaadro";
  }
}

/** Derived type facet (optional `productType` wins). */
export function plpType(product: SampleProduct): string {
  if (product.productType?.trim()) return product.productType.trim();
  if (product.customization?.type === "weight") return "Loose";
  return "Packaged";
}

export function discountPct(product: SampleProduct): number {
  if (product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

export function plpFiltersActive(state: PlpFilterState): boolean {
  return (
    state.onOffer ||
    state.byWeight ||
    state.bestSeller ||
    state.brands.length > 0 ||
    state.types.length > 0 ||
    state.sort !== "relevance"
  );
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function applyPlpFilters(
  products: SampleProduct[],
  state: PlpFilterState,
): SampleProduct[] {
  let list = products.filter((p) => {
    if (state.onOffer && discountPct(p) <= 0) return false;
    if (state.byWeight && !p.customization) return false;
    if (state.bestSeller && p.badge !== "Best Seller") return false;
    if (state.brands.length > 0 && !state.brands.includes(plpBrand(p))) {
      return false;
    }
    if (state.types.length > 0 && !state.types.includes(plpType(p))) {
      return false;
    }
    return true;
  });

  switch (state.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list = [...list].sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "discount-desc":
      list = [...list].sort((a, b) => discountPct(b) - discountPct(a));
      break;
    default:
      break;
  }

  return list;
}
