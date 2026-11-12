"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryBrowser } from "@/components/categories/CategoryBrowser";
import { PageHeader } from "@/components/navigation/PageHeader";
import type { CategoryBranch } from "@/lib/api/storefront";
import type { SampleProduct } from "@/lib/sample-products";

function CategoriesBody({
  branches,
  products,
  error,
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
}) {
  const searchParams = useSearchParams();

  return (
    <CategoryBrowser
      branches={branches}
      products={products}
      error={error}
      focusSearch={searchParams.get("focus") === "search"}
      initialChipsOpen={searchParams.get("chips") === "1"}
    />
  );
}

export function CategoriesPageContent({
  branches,
  products,
  error,
}: {
  branches: CategoryBranch[];
  products: SampleProduct[];
  error?: string | null;
}) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-paper">
      <div className="px-5">
        <PageHeader backHref="/home" title="Categories" />
      </div>
      <Suspense fallback={null}>
        <CategoriesBody branches={branches} products={products} error={error} />
      </Suspense>
    </main>
  );
}
