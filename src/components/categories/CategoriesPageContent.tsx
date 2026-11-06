"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { CategoriesHub } from "@/components/categories/CategoriesHub";
import { CategoriesHubSkeleton } from "@/components/ui/skeletons";
import type { CatalogCategory } from "@/lib/catalog-taxonomy";
import type { SampleProduct } from "@/lib/sample-products";

function CategoriesHubBody({
  categories,
  products,
  error,
}: {
  categories?: CatalogCategory[];
  products?: SampleProduct[];
  error?: string | null;
}) {
  const searchParams = useSearchParams();
  const focusSearch = searchParams.get("focus") === "search";

  return (
    <CategoriesHub
      focusSearch={focusSearch}
      categoryHref={(cat) => `/categories/${cat.slug}`}
      categories={categories}
      products={products}
      error={error}
    />
  );
}

/**
 * Storefront `/categories` — hub browse + search (home search lands with
 * `?focus=search`). Tiles link to `/categories/[slug]`.
 */
export function CategoriesPageContent({
  categories,
  products,
  error,
}: {
  categories?: CatalogCategory[];
  products?: SampleProduct[];
  error?: string | null;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
      <div className="px-5">
        <PageHeader backHref="/home" title="Categories" />
      </div>
      <Suspense
        fallback={
          <div className="py-4" aria-busy aria-label="Loading categories">
            <CategoriesHubSkeleton />
          </div>
        }
      >
        <CategoriesHubBody
          categories={categories}
          products={products}
          error={error}
        />
      </Suspense>
    </main>
  );
}
