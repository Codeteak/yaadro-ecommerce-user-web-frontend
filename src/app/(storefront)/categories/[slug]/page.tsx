import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { loadCategoryListing } from "@/lib/api/storefront";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await loadCategoryListing(slug);
    if (!category) return { title: "Category" };
    return {
      title: category.name,
      description: `Shop ${category.name} on Yaadro.`,
    };
  } catch {
    return { title: "Category" };
  }
}

async function CategoryListingContent({ params }: CategoryPageProps) {
  const { slug } = await params;
  let listing: Awaited<ReturnType<typeof loadCategoryListing>> = null;
  try {
    listing = await loadCategoryListing(slug);
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
        <CategoryListing
          slug={slug}
          error="We couldn't load this category."
          className="min-h-0 flex-1"
        />
      </main>
    );
  }
  if (!listing) notFound();

  return (
    <main className="mx-auto flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper">
      <CategoryListing
        slug={slug}
        live={listing}
        backHref="/categories"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-paper">
          <CategoryPlpSkeleton className="min-h-dvh" />
        </main>
      }
    >
      <CategoryListingContent params={params} />
    </Suspense>
  );
}
