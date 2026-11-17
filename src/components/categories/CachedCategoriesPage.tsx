"use client";

import { useSearchParams } from "next/navigation";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
import { CachedSlot } from "@/components/navigation/CachedSlot";
import { StorefrontPageSkeleton } from "@/components/ui/skeletons";
import { loadCategoriesPageData } from "@/lib/api/page-data";

export function CachedCategoriesPage() {
  const search = useSearchParams();
  const cat = search.get("cat");
  const cacheKey = cat ? `categories:${cat}` : "categories:default";

  return (
    <CachedSlot
      cacheKey={cacheKey}
      load={() => loadCategoriesPageData(cat ?? undefined)}
      persist={(data) => data.ok}
      fallback={<StorefrontPageSkeleton />}
    >
      {(data) => (
        <CategoriesPageContent
          branches={data.branches}
          products={data.products}
          error={data.error}
          selection={data.selectedKey}
          focusSearch={search.get("focus") === "search"}
          initialChipsOpen={search.get("chips") === "1"}
        />
      )}
    </CachedSlot>
  );
}
