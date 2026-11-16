"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { PlpSheetKind } from "@/components/categories/PlpFilterSheets";
import {
  applyPlpFilters,
  DEFAULT_PLP_FILTERS,
  plpBrand,
  plpFiltersActive,
  plpType,
  uniqueSorted,
  type PlpFilterState,
} from "@/lib/plp-filters";
import type { SampleProduct } from "@/lib/sample-products";

/**
 * Shared Filter / Brands / Type / Sort state for the category browser
 * and a category listing. Pass the already-scoped product list.
 */
export function usePlpFilters(products: SampleProduct[]) {
  const [filters, setFilters] = useState<PlpFilterState>(DEFAULT_PLP_FILTERS);
  const [sheet, setSheet] = useState<PlpSheetKind>(null);

  const brandOptions = useMemo(
    () => uniqueSorted(products.map(plpBrand)),
    [products],
  );
  const typeOptions = useMemo(
    () => uniqueSorted(products.map(plpType)),
    [products],
  );
  const visible = useMemo(
    () => applyPlpFilters(products, filters),
    [products, filters],
  );

  return {
    filters,
    setFilters,
    sheet,
    setSheet,
    brandOptions,
    typeOptions,
    visible,
    active: plpFiltersActive(filters),
    clearFilters: () => setFilters(DEFAULT_PLP_FILTERS),
  };
}

export type PlpFiltersApi = ReturnType<typeof usePlpFilters>;
export type SetPlpFilters = Dispatch<SetStateAction<PlpFilterState>>;
