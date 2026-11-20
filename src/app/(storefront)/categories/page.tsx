import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
import { CategoriesHubSkeleton } from "@/components/ui/skeletons";
import { loadCategoryBrowser } from "@/lib/api/storefront";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

type CategoriesPageProps = {
  searchParams: Promise<{
    cat?: string;
    focus?: string;
    chips?: string;
    q?: string;
  }>;
};

async function CategoriesPageBody({ searchParams }: CategoriesPageProps) {
  const query = await searchParams;
  const catalog = await loadCategoryBrowser(
    query.q?.trim() ? "all" : query.cat,
    query.q,
  );

  return (
    <CategoriesPageContent
      branches={catalog.branches}
      products={catalog.products}
      error={catalog.error}
      selection={catalog.selectedKey}
      focusSearch={query.focus === "search" || Boolean(query.q?.trim())}
      initialChipsOpen={query.chips === "1"}
      initialQuery={query.q?.trim() ?? ""}
    />
  );
}

/**
 * `searchParams` resolve behind Suspense so the Instant shell stays valid
 * (same pattern as /categories/[slug] and /product/[id]).
 */
export default function CategoriesPage({ searchParams }: CategoriesPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
          <CategoriesHubSkeleton className="min-h-dvh" />
        </main>
      }
    >
      <CategoriesPageBody searchParams={searchParams} />
    </Suspense>
  );
}
