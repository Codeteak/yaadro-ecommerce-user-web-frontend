import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import {
  getCatalogCategory,
  listCatalogCategories,
} from "@/lib/catalog-taxonomy";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return listCatalogCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCatalogCategory(slug);
  if (!category) return { title: "Category" };
  return {
    title: category.name,
    description: `Shop ${category.name} on Yaadro.`,
  };
}

function CategoryListingFallback() {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper"
      aria-busy
      aria-label="Loading category"
    >
      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="h-11 w-11 animate-pulse rounded-[13px] bg-mint/70" />
        <div className="mx-auto mt-2 h-5 w-40 animate-pulse rounded bg-mint/50" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-full bg-mint/40" />
          <div className="h-9 w-20 animate-pulse rounded-full bg-mint/30" />
        </div>
      </div>
    </div>
  );
}

async function CategoryListingContent({ params }: CategoryPageProps) {
  const { slug } = await params;
  if (!getCatalogCategory(slug)) notFound();

  return (
    <main className="mx-auto flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper">
      <CategoryListing
        slug={slug}
        backHref="/categories"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense fallback={<CategoryListingFallback />}>
      <CategoryListingContent params={params} />
    </Suspense>
  );
}
