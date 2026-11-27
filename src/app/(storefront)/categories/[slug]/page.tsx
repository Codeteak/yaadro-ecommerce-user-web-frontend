import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/categories/CategoryListing";
import { CategoryPlpSkeleton } from "@/components/ui/skeletons";
import { loadCategoryListing } from "@/lib/api/storefront";
import { isProducePlpSlug, produceInitialSub } from "@/lib/produce-plp";
import { getRequestShopId } from "@/lib/request-shop";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aisle?: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const shopId = await getRequestShopId();
    const category = await loadCategoryListing(shopId, slug);
    if (!category) return { title: "Category" };
    return {
      title: category.name,
      description: `Shop ${category.name} on Yaadro.`,
    };
  } catch {
    return { title: "Category" };
  }
}

async function CategoryListingContent({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  let listing: Awaited<ReturnType<typeof loadCategoryListing>> = null;
  try {
    const shopId = await getRequestShopId();
    listing = await loadCategoryListing(shopId, slug);
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper">
        <CategoryListing
          slug={slug}
          error="We couldn't load this category."
          railLayout="horizontal"
          className="min-h-0 flex-1"
        />
      </main>
    );
  }
  if (!listing) notFound();

  const produce = listing.produce || isProducePlpSlug(slug);
  const initialSub = produce
    ? produceInitialSub(slug, query.aisle)
    : "All";

  return (
    <main
      data-storefront-fill
      className="mx-auto flex h-dvh min-h-0 w-full max-w-lg flex-col overflow-hidden bg-paper"
    >
      <CategoryListing
        key={`${slug}-${initialSub}`}
        slug={slug}
        live={listing}
        initialSub={initialSub}
        backHref={produce ? "/home" : "/categories"}
        railLayout="horizontal"
        className="min-h-0 flex-1"
      />
    </main>
  );
}

export default function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-paper">
          <CategoryPlpSkeleton className="min-h-dvh" />
        </main>
      }
    >
      <CategoryListingContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
