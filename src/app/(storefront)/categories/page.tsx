import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesPageContent } from "@/components/categories/CategoriesPageContent";
<<<<<<< HEAD
import { CategoriesHubSkeleton } from "@/components/ui/skeletons";
=======
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
>>>>>>> 0d2d7d2 (chore:added cacha invalidate api removed boiler plate coupon added fixes in the fix.md file)
import { loadCategoryBrowser } from "@/lib/api/storefront";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse grocery categories on Yaadro.",
};

type CategoriesPageProps = {
  searchParams: Promise<{ cat?: string; focus?: string; chips?: string }>;
};

<<<<<<< HEAD
async function CategoriesPageBody({ searchParams }: CategoriesPageProps) {
=======
export default function CategoriesPage({ searchParams }: CategoriesPageProps) {
  return (
    <Suspense fallback={<CategoryPlpSkeleton />}>
      <CategoriesCatalog searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoriesCatalog({ searchParams }: CategoriesPageProps) {
>>>>>>> 0d2d7d2 (chore:added cacha invalidate api removed boiler plate coupon added fixes in the fix.md file)
  const query = await searchParams;
  const catalog = await loadCategoryBrowser(query.cat);

  return (
    <CategoriesPageContent
      branches={catalog.branches}
      products={catalog.products}
      error={catalog.error}
      selection={catalog.selectedKey}
      focusSearch={query.focus === "search"}
      initialChipsOpen={query.chips === "1"}
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
