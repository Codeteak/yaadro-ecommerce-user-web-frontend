"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { CategoryBrowser } from "@/components/categories/CategoryBrowser";
import { PageHeader } from "@/components/navigation/PageHeader";
import type { CategoryBranch } from "@/lib/api/storefront";
import type { SampleProduct } from "@/lib/sample-products";

function CategoriesBody({
  branches,
  products,
  error,
  selection,
  focusSearch,
  initialChipsOpen,
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  selection: string;
  focusSearch: boolean;
  initialChipsOpen: boolean;
}) {
  const router = useRouter();

  const onSelect = (key: string) => {
    const params = new URLSearchParams();
    if (focusSearch) params.set("focus", "search");
    if (initialChipsOpen) params.set("chips", "1");
    params.set("cat", key === "all" ? "all" : key.slice(4));
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
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
  selection: string;
  focusSearch: boolean;
  initialChipsOpen: boolean;
}) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-paper">
      <div className="px-5">
        <PageHeader backHref="/home" title="Categories" />
      </div>
      <Suspense fallback={null}>
        <CategoriesBody
          branches={branches}
          products={products}
          error={error}
          selection={selection}
          focusSearch={focusSearch}
          initialChipsOpen={initialChipsOpen}
        />
      </Suspense>
    </main>
  );
}
