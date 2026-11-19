"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { CategoryBrowser } from "@/components/categories/CategoryBrowser";
import { StorefrontPageFrame } from "@/components/storefront/StorefrontPageFrame";
import type { CategoryBranch } from "@/lib/api/storefront";
import type { SampleProduct } from "@/lib/sample-products";

function CategoriesBody({
  branches,
  products,
  error,
  selection,
  focusSearch,
  initialChipsOpen,
  initialQuery,
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  selection: string;
  focusSearch: boolean;
  initialChipsOpen: boolean;
  initialQuery: string;
}) {
  const router = useRouter();

  const onSelect = (key: string) => {
    const params = new URLSearchParams();
    if (focusSearch) params.set("focus", "search");
    if (initialChipsOpen) params.set("chips", "1");
    if (initialQuery) params.set("q", initialQuery);
    // All → bare /categories (same payload as cat=all).
    if (key !== "all") params.set("cat", key.slice(4));
    const query = params.toString();
    router.replace(query ? `/categories?${query}` : "/categories", {
      scroll: false,
    });
  };

  return (
    <CategoryBrowser
      branches={branches}
      products={products}
      error={error}
      focusSearch={focusSearch}
      initialChipsOpen={initialChipsOpen}
      initialQuery={initialQuery}
      selection={selection}
      onSelect={onSelect}
      railLayout="horizontal"
    />
  );
}

export function CategoriesPageContent({
  branches,
  products,
  error,
  selection,
  focusSearch,
  initialChipsOpen,
  initialQuery = "",
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  selection: string;
  focusSearch: boolean;
  initialChipsOpen: boolean;
  initialQuery?: string;
}) {
  return (
    <StorefrontPageFrame
      title="Categories"
      backHref="/home"
      height="fill"
    >
      <Suspense fallback={null}>
        <CategoriesBody
          branches={branches}
          products={products}
          error={error}
          selection={selection}
          focusSearch={focusSearch}
          initialChipsOpen={initialChipsOpen}
          initialQuery={initialQuery}
        />
      </Suspense>
    </StorefrontPageFrame>
  );
}
