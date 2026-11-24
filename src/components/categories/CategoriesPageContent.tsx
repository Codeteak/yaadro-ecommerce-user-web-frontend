"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { CategoryBrowser } from "@/components/categories/CategoryBrowser";
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
    // Prefer live `?q=` (debounced history sync) over the first server value.
    const liveQ =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("q")?.trim()
        : "";
    const q = liveQ || initialQuery;
    if (q) params.set("q", q);
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
      pageTitle="Categories"
      backHref="/home"
    />
  );
}

/**
 * Live `/categories`: one scrollport. Header + search scroll away; category
 * rail sticks; scrolling back brings header/search back.
 */
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
    <main
      data-storefront-fill
      className="mx-auto flex h-[calc(100dvh-var(--storefront-nav-clearance,5.5rem)-env(safe-area-inset-bottom,0px))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
    </main>
  );
}
